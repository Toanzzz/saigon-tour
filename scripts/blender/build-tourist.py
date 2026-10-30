"""Build the tourist player from a Kenney mini-character plus authored props.

Usage: Blender -b --python scripts/blender/build-tourist.py -- <repo-root>
Writes assets/player-tourist/player-tourist.{blend,glb} and preview renders.
"""
import math
import sys

import bpy
from mathutils import Matrix, Vector

repo = sys.argv[sys.argv.index("--") + 1]
pack = f"{repo}/assets/mini-characters/GLB format"
out = f"{repo}/assets/player-tourist"
BASE = "character-male-e"

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=f"{pack}/{BASE}.glb")
for obj in [o for o in bpy.data.objects if o.name.startswith("Icosphere")]:
    bpy.data.objects.remove(obj, do_unlink=True)
arm = next(o for o in bpy.data.objects if o.type == "ARMATURE")
arm.name = "player-tourist"
arm.animation_data.action = None


def material(name, hex_color, rough=0.8):
    mat = bpy.data.materials.new(name)
    color = tuple(int(hex_color[i : i + 2], 16) / 255 for i in (1, 3, 5))
    mat.diffuse_color = (*[c**2.2 for c in color], 1)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes["Principled BSDF"]
    bsdf.inputs["Base Color"].default_value = mat.diffuse_color
    bsdf.inputs["Roughness"].default_value = rough
    return mat


HAT = material("tourist-hat", "#f6e5aa")
BAND = material("tourist-band", "#ee7448")
PACK = material("tourist-pack", "#47b08c")
PACK_DARK = material("tourist-pack-dark", "#2e8a6a")
INK = material("tourist-ink", "#262835", 0.5)
LENS = material("tourist-lens", "#9dc3e7", 0.2)


def attach(obj, bone_name):
    bone = arm.data.bones[bone_name]
    world = obj.matrix_world.copy()
    obj.parent = arm
    obj.parent_type = "BONE"
    obj.parent_bone = bone_name
    rest = arm.matrix_world @ bone.matrix_local @ Matrix.Translation((0, bone.length, 0))
    obj.matrix_parent_inverse = rest.inverted()
    obj.matrix_world = world


def finish(obj, mat, bevel=0.0):
    obj.data.materials.append(mat)
    if bevel:
        mod = obj.modifiers.new("bevel", "BEVEL")
        mod.width = bevel
        mod.segments = 2
        bpy.context.view_layer.objects.active = obj
        bpy.ops.object.modifier_apply(modifier="bevel")
    for poly in obj.data.polygons:
        poly.use_smooth = False
    return obj


def cylinder(name, r1, r2, depth, loc, mat, verts=16):
    bpy.ops.mesh.primitive_cone_add(
        vertices=verts, radius1=r1, radius2=r2, depth=depth, location=loc
    )
    obj = bpy.context.object
    obj.name = name
    return finish(obj, mat)


def box(name, size, loc, mat, bevel=0.012):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
    obj = bpy.context.object
    obj.name = name
    obj.scale = size
    bpy.ops.object.transform_apply(scale=True)
    return finish(obj, mat, bevel)


# Head top sits near z=0.676; the face looks toward -Y in Blender space.
HEAD_TOP = 0.676
crown = cylinder("hat-crown", 0.205, 0.17, 0.09, (0, 0.0, HEAD_TOP - 0.01), HAT)
brim = cylinder("hat-brim", 0.3, 0.22, 0.035, (0, 0.0, HEAD_TOP - 0.06), HAT, 20)
band = cylinder("hat-band", 0.209, 0.199, 0.03, (0, 0.0, HEAD_TOP - 0.03), BAND)
for part in (crown, brim, band):
    attach(part, "head")

before = set(bpy.data.objects)
bpy.ops.import_scene.gltf(filepath=f"{pack}/aid-sunglasses.glb")
glasses = next(o for o in set(bpy.data.objects) - before if o.type == "MESH")
for extra in set(bpy.data.objects) - before - {glasses}:
    bpy.data.objects.remove(extra, do_unlink=True)
glasses.name = "sunglasses"
glasses.parent = None
glasses.rotation_euler = (math.radians(90), 0, 0)
glasses.scale = (1.15, 1.15, 1.15)
glasses.location = (0, -0.175, 0.47)
bpy.context.view_layer.update()
attach(glasses, "head")

pack_body = box("backpack", (0.2, 0.09, 0.16), (0, 0.1, 0.275), PACK)
pack_pocket = box("backpack-pocket", (0.14, 0.03, 0.07), (0, 0.155, 0.245), PACK_DARK, 0.008)
pack_flap = box("backpack-flap", (0.205, 0.095, 0.035), (0, 0.1, 0.355), PACK_DARK, 0.008)
for part in (pack_body, pack_pocket, pack_flap):
    attach(part, "torso")
for side in (-1, 1):
    strap = box(f"strap-{side}", (0.025, 0.012, 0.12), (side * 0.06, -0.072, 0.27), PACK_DARK, 0.004)
    attach(strap, "torso")
cam_body = box("camera", (0.1, 0.045, 0.065), (0, -0.095, 0.245), INK, 0.008)
cam_lens = cylinder("camera-lens", 0.026, 0.024, 0.03, (0, -0.125, 0.245), LENS, 12)
cam_lens.rotation_euler = (math.radians(90), 0, 0)
for part in (cam_body, cam_lens):
    attach(part, "torso")

bpy.ops.wm.save_as_mainfile(filepath=f"{out}/player-tourist.blend")
bpy.ops.export_scene.gltf(
    filepath=f"{out}/player-tourist.glb",
    export_format="GLB",
    export_animations=True,
    export_animation_mode="ACTIONS",
    export_yup=True,
)

scene = bpy.context.scene
scene.render.engine = "BLENDER_WORKBENCH"
scene.display.shading.color_type = "MATERIAL"
scene.render.resolution_x = scene.render.resolution_y = 520
cam = bpy.data.objects.new("preview", bpy.data.cameras.new("preview"))
scene.collection.objects.link(cam)
scene.camera = cam
cam.data.type = "ORTHO"
cam.data.ortho_scale = 0.95
idle = bpy.data.actions.get("idle")
if idle:
    arm.animation_data.action = idle
for label, yaw in (("front", 25), ("back", 205)):
    a = math.radians(yaw)
    cam.location = (math.sin(a) * 2.2, -math.cos(a) * 2.2, 0.62)
    cam.rotation_euler = (math.radians(84), 0, a)
    scene.render.filepath = f"{out}/preview-{label}.png"
    bpy.ops.render.render(write_still=True)
print("BUILT", [o.name for o in bpy.data.objects if o.parent == arm])
