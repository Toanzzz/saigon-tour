"""
Headless Blender builder for NPC world models.
Dresses a Kenney base GLB (preserving rig + all animation clips) with optional
hat/accessory props and an authored outfit panel, then exports a GLB + .blend.

Usage:
  Blender --background --python scripts/build-npc-model.py -- <config.json>

config.json fields:
  id            npc id (output basename)
  base          path to Kenney runtime base GLB
  out_glb       output GLB path
  out_blend     output .blend path (optional)
  hat           path to a hat GLB grafted to the head bone (optional)
  hat_drop      z-offset applied to the hat before parenting (default -0.14)
  hat_color     [r,g,b] straw/plastic material for the hat (optional)
  accessory     path to an accessory GLB grafted to the torso bone (optional)
  accessory_color [r,g,b] (optional)
  apron         [r,g,b] authored front torso panel colour (optional)
  skirt         bool: longer panel to the knees (default false)
"""
import bpy, sys, os, json, mathutils, bmesh

cfg = json.load(open(sys.argv[sys.argv.index("--")+1]))

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=cfg["base"])
for o in list(bpy.data.objects):
    if o.name.startswith("Icosphere"):
        bpy.data.objects.remove(o, do_unlink=True)
arm = next(o for o in bpy.data.objects if o.type == "ARMATURE")

def mat(name, rgb, rough=0.8):
    m = bpy.data.materials.new(name); m.use_nodes = True
    b = m.node_tree.nodes.get("Principled BSDF")
    b.inputs["Base Color"].default_value = (rgb[0], rgb[1], rgb[2], 1.0)
    b.inputs["Roughness"].default_value = rough
    return m

def graft(path, bone, name, drop=0.0, color=None):
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=path)
    objs = [o for o in bpy.data.objects if o not in before and o.type == "MESH"]
    if not objs:
        return None
    # join multiple pieces into one
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    if len(objs) > 1:
        bpy.ops.object.join()
    piece = bpy.context.view_layer.objects.active
    piece.name = name
    piece.location.z += drop
    world = piece.matrix_world.copy()
    piece.parent = arm; piece.parent_type = "BONE"; piece.parent_bone = bone
    piece.matrix_world = world
    if color:
        piece.data.materials.clear(); piece.data.materials.append(mat(name + "-mat", color, 0.85))
    return piece

if cfg.get("hat"):
    graft(cfg["hat"], "head", "hat", cfg.get("hat_drop", -0.14), cfg.get("hat_color"))
if cfg.get("accessory"):
    graft(cfg["accessory"], cfg.get("accessory_bone", "torso"), "accessory", cfg.get("accessory_drop", 0.0), cfg.get("accessory_color"))

if cfg.get("apron"):
    mesh = bpy.data.meshes.new("outfit")
    outfit = bpy.data.objects.new("outfit", mesh)
    bpy.context.scene.collection.objects.link(outfit)
    bm = bmesh.new()
    cols, rows = 5, 6
    x0, x1 = -0.16, 0.16
    z0 = 0.02 if cfg.get("skirt") else 0.055
    z1 = 0.30
    yfront = -0.125
    verts = []
    for r in range(rows + 1):
        tz = r / rows; z = z0 + (z1 - z0) * tz
        taper = 0.55 + 0.45 * tz
        for c in range(cols + 1):
            tx = c / cols
            x = (x0 + (x1 - x0) * tx) * taper
            y = yfront + 0.03 * (abs((tx - 0.5) * 2)) ** 2
            verts.append(bm.verts.new((x, y, z)))
    bm.verts.ensure_lookup_table()
    def vat(r, c): return verts[r * (cols + 1) + c]
    for r in range(rows):
        for c in range(cols):
            bm.faces.new((vat(r, c), vat(r, c + 1), vat(r + 1, c + 1), vat(r + 1, c)))
    bm.normal_update(); bm.to_mesh(mesh); bm.free()
    mesh.materials.append(mat("outfit-mat", cfg["apron"], 0.8))
    md = outfit.modifiers.new("arm", "ARMATURE"); md.object = arm
    vg = outfit.vertex_groups.new(name="torso")
    vg.add([v.index for v in mesh.vertices], 1.0, "REPLACE")
    outfit.parent = arm

print("ACTIONS:", len(bpy.data.actions))
print("OBJECTS:", [o.name for o in bpy.data.objects])

os.makedirs(os.path.dirname(cfg["out_glb"]), exist_ok=True)
bpy.ops.object.select_all(action="SELECT")
bpy.ops.export_scene.gltf(filepath=cfg["out_glb"], export_format="GLB",
    export_animations=True, export_animation_mode="ACTIONS",
    export_skins=True, export_yup=True, use_selection=False)
print("WROTE", cfg["out_glb"], os.path.getsize(cfg["out_glb"]))
if cfg.get("out_blend"):
    bpy.ops.wm.save_as_mainfile(filepath=cfg["out_blend"])
    print("SAVED BLEND", cfg["out_blend"])
