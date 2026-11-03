"""Build cosmetic unlock GLBs (hats and accessories) in head/torso-bone space.

Usage: Blender -b --python scripts/blender/build-cosmetics.py -- <repo-root>
Each cosmetic is exported as its own GLB to assets/cosmetics/<id>.glb, plus a
preview PNG. The runtime attaches them to the character's head/torso bones by
the same local offsets used by build-tourist.py. Budget: <=1.5k triangles each.
"""
import math
import sys

import bpy
from mathutils import Matrix, Vector

repo = sys.argv[sys.argv.index("--") + 1]
out = f"{repo}/assets/cosmetics"

# Head top in head-local space matches build-tourist.py.
HEAD_TOP = 0.676


def material(name, hex_color, rough=0.8):
    mat = bpy.data.materials.new(name)
    color = tuple(int(hex_color[i : i + 2], 16) / 255 for i in (1, 3, 5))
    mat.diffuse_color = (*[c**2.2 for c in color], 1)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes["Principled BSDF"]
    bsdf.inputs["Base Color"].default_value = mat.diffuse_color
    bsdf.inputs["Roughness"].default_value = rough
    return mat


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


def cone(name, r1, r2, depth, loc, mat, verts=16):
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
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    return finish(obj, mat, bevel)


def torus(name, major, minor, loc, mat, segs=20, rings=10):
    bpy.ops.mesh.primitive_torus_add(
        major_radius=major, minor_radius=minor, location=loc,
        major_segments=segs, minor_segments=rings,
    )
    obj = bpy.context.object
    obj.name = name
    return finish(obj, mat)


# Each builder returns the list of parts composing one cosmetic.
def non_la():
    straw = material("non-la-straw", "#e8cf86")
    return [
        cone("non-la", 0.33, 0.0, 0.26, (0, 0, HEAD_TOP + 0.05), straw, 24),
    ]


def helmet():
    shell = material("helmet-shell", "#c43b3b")
    peak = material("helmet-peak", "#2a2d3a", 0.4)
    bpy.ops.mesh.primitive_uv_sphere_add(radius=0.24, location=(0, 0, HEAD_TOP - 0.02), segments=16, ring_count=8)
    dome = bpy.context.object
    dome.name = "helmet"
    dome.scale = (1, 1, 0.85)
    bpy.ops.object.transform_apply(scale=True)
    finish(dome, shell)
    brim = box("helmet-peak", (0.26, 0.12, 0.03), (0, -0.2, HEAD_TOP - 0.08), peak, 0.01)
    return [dome, brim]


def volunteer_cap():
    cloth = material("cap-cloth", "#3d7d55")
    bpy.ops.mesh.primitive_uv_sphere_add(radius=0.22, location=(0, 0, HEAD_TOP), segments=16, ring_count=8)
    dome = bpy.context.object
    dome.name = "volunteer-cap"
    dome.scale = (1, 1, 0.6)
    bpy.ops.object.transform_apply(scale=True)
    finish(dome, cloth)
    peak = box("cap-peak", (0.24, 0.16, 0.02), (0, -0.22, HEAD_TOP - 0.03), cloth, 0.008)
    return [dome, peak]


def bucket_hat():
    cloth = material("bucket-cloth", "#8a9b6a")
    crown = cone("bucket-crown", 0.21, 0.19, 0.16, (0, 0, HEAD_TOP + 0.02), cloth, 20)
    brim = cone("bucket-brim", 0.31, 0.24, 0.03, (0, 0, HEAD_TOP - 0.06), cloth, 24)
    return [crown, brim]


def lantern_hat():
    frame = material("lantern-frame", "#b2472f")
    glow = material("lantern-glow", "#ffcf6b", 0.3)
    crown = cone("lantern-crown", 0.19, 0.16, 0.08, (0, 0, HEAD_TOP), frame, 18)
    lantern = torus("lantern-ring", 0.12, 0.05, (0, 0, HEAD_TOP + 0.16), glow)
    stem = cone("lantern-support", 0.025, 0.025, 0.1, (0, 0, HEAD_TOP + 0.08), frame, 8)
    return [crown, stem, lantern]


def beret():
    wool = material("beret-wool", "#2b3566")
    bpy.ops.mesh.primitive_uv_sphere_add(radius=0.23, location=(0, 0.02, HEAD_TOP + 0.01), segments=18, ring_count=8)
    cap = bpy.context.object
    cap.name = "beret"
    cap.scale = (1, 1, 0.45)
    bpy.ops.object.transform_apply(scale=True)
    finish(cap, wool)
    stub = cone("beret-stub", 0.02, 0.0, 0.04, (0, 0.02, HEAD_TOP + 0.09), wool, 8)
    return [cap, stub]


def sunglasses():
    frame = material("glasses-frame", "#262835", 0.5)
    lens = material("glasses-lens", "#2a2a2a", 0.2)
    bridge = box("glasses-bridge", (0.05, 0.02, 0.02), (0, -0.2, 0.47), frame, 0.004)
    parts = [bridge]
    for side in (-1, 1):
        parts.append(box(f"glasses-lens-{side}", (0.09, 0.015, 0.06), (side * 0.1, -0.2, 0.47), lens, 0.004))
    return parts


def scarf():
    cloth = material("scarf-cloth", "#c2452f")
    ring = torus("scarf", 0.17, 0.045, (0, 0, 0.345), cloth, 20, 8)
    ring.scale = (1, 0.7, 0.5)
    bpy.ops.object.transform_apply(scale=True)
    tail = box("scarf-tail", (0.055, 0.018, 0.115), (-0.06, -0.133, 0.285), cloth)
    return [ring, tail]


def camera_strap():
    strap = material("strap", "#2a2d3a", 0.5)
    body = material("strap-body", "#1d1f2a", 0.4)
    parts = []
    for side in (-1, 1):
        a, b = Vector((side * 0.08, -0.08, 0.36)), Vector((side * 0.045, -0.15, 0.245))
        strap_obj = box("camera-neck-strap", (0.018, 0.012, (a-b).length), (a+b)/2, strap)
        strap_obj.rotation_euler = (b-a).to_track_quat("Z", "Y").to_euler()
        parts.append(strap_obj)
    cam = box("camera-strap-body", (0.13, 0.065, 0.085), (0, -0.15, 0.23), body, 0.006)
    lens = cone("camera-lens", 0.03, 0.027, 0.025, (0, -0.195, 0.23), strap, 12)
    lens.rotation_euler.x = math.pi / 2
    return [*parts, cam, lens]


def lantern_backpack():
    frame = material("pack-frame", "#b2472f")
    glow = material("pack-glow", "#ffcf6b", 0.3)
    body = box("lantern-backpack", (0.22, 0.12, 0.22), (0, 0.16, 0.26), frame, 0.01)
    lantern = cone("lantern-backpack-light", 0.06, 0.04, 0.12, (0, 0.19, 0.41), glow, 12)
    return [body, lantern]


def satchel():
    leather = material("satchel-leather", "#7a5230")
    body = box("satchel", (0.14, 0.08, 0.13), (0.2, -0.07, 0.2), leather, 0.01)
    flap = box("satchel-flap", (0.145, 0.085, 0.04), (0.2, -0.075, 0.26), leather, 0.008)
    a, b = Vector((-0.08, -0.13, 0.35)), Vector((0.2, -0.13, 0.22))
    strap = box("satchel-strap", (0.019, 0.012, (a-b).length), (a+b)/2, leather)
    strap.rotation_euler = (b-a).to_track_quat("Z", "Y").to_euler()
    return [body, flap, strap]


def headphones():
    band_mat = material("headphone-band", "#262835", 0.5)
    cup_mat = material("headphone-cup", "#c2452f", 0.4)
    parts = []
    for index in range(12):
        angle = math.pi * index / 12
        next_angle = math.pi * (index + 1) / 12
        a = Vector((0.235 * math.cos(angle), 0.02, 0.48 + 0.23 * math.sin(angle)))
        b = Vector((0.235 * math.cos(next_angle), 0.02, 0.48 + 0.23 * math.sin(next_angle)))
        bpy.ops.mesh.primitive_cylinder_add(vertices=8, radius=0.018, depth=(b-a).length, location=(a+b)/2)
        segment = bpy.context.object
        segment.rotation_euler = (b-a).to_track_quat("Z", "Y").to_euler()
        finish(segment, band_mat)
        parts.append(segment)
    for side in (-1, 1):
        parts.append(box(f"headphone-cup-{side}", (0.055, 0.095, 0.12), (side * 0.235, 0.02, 0.48), cup_mat, 0.01))
    return parts


# id -> (builder, bone). Outfits are palette-only and skipped here.
COSMETICS = {
    "non-la": (non_la, "head"),
    "helmet": (helmet, "head"),
    "volunteer-cap": (volunteer_cap, "head"),
    "bucket-hat": (bucket_hat, "head"),
    "lantern-hat": (lantern_hat, "head"),
    "beret": (beret, "head"),
    "sunglasses": (sunglasses, "head"),
    "scarf": (scarf, "torso"),
    "camera-strap": (camera_strap, "torso"),
    "lantern-backpack": (lantern_backpack, "torso"),
    "satchel": (satchel, "torso"),
    "headphones": (headphones, "head"),
}


def preview(name):
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_WORKBENCH"
    scene.display.shading.color_type = "MATERIAL"
    scene.render.resolution_x = scene.render.resolution_y = 360
    scene.render.film_transparent = True
    cam = bpy.data.objects.get("preview")
    if cam is None:
        cam = bpy.data.objects.new("preview", bpy.data.cameras.new("preview"))
        scene.collection.objects.link(cam)
    scene.camera = cam
    cam.data.type = "ORTHO"
    cam.data.ortho_scale = 1.0
    a = math.radians(25)
    cam.location = (math.sin(a) * 2.0, -math.cos(a) * 2.0, 0.6)
    cam.rotation_euler = (math.radians(82), 0, a)
    scene.render.filepath = f"{out}/preview-{name}.png"
    bpy.ops.render.render(write_still=True)


def attachment_origins():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=f"{repo}/assets/player-bases/player-man.glb")
    arm = next(o for o in bpy.data.objects if o.type == "ARMATURE")
    return {
        name: Matrix.Translation(arm.matrix_world @ arm.data.bones[name].head_local)
        for name in ("head", "torso")
    }


origins = attachment_origins()
for cid, (builder, bone) in COSMETICS.items():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    parts = builder()
    preview(cid)
    # Builders use the avatar's model coordinates. Store each piece in its
    # attachment bone's bind coordinates, so animation adds that transform once.
    inverse = origins[bone].inverted()
    for obj in parts:
        obj.matrix_world = inverse @ obj.matrix_world
    for obj in parts:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = parts[0]
    bpy.ops.export_scene.gltf(
        filepath=f"{out}/{cid}.glb",
        use_selection=True,
        export_format="GLB",
        export_yup=True,
    )
    print("BUILT", cid, "parts", len(parts))
