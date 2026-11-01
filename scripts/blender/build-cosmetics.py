"""Build cosmetic unlock GLBs (hats and accessories) in head/torso-bone space.

Usage: Blender -b --python scripts/blender/build-cosmetics.py -- <repo-root>
Each cosmetic is exported as its own GLB to assets/cosmetics/<id>.glb, plus a
preview PNG. The runtime attaches them to the character's head/torso bones by
the same local offsets used by build-tourist.py. Budget: <=1.5k triangles each.
"""
import math
import sys

import bpy

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
    bpy.ops.object.transform_apply(scale=True)
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
    return [crown, lantern]


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
    ring = torus("scarf", 0.17, 0.06, (0, 0, 0.42), cloth, 20, 8)
    ring.scale = (1, 0.7, 0.5)
    bpy.ops.object.transform_apply(scale=True)
    return [ring]


def camera_strap():
    strap = material("strap", "#2a2d3a", 0.5)
    body = material("strap-body", "#1d1f2a", 0.4)
    band = torus("camera-strap", 0.2, 0.02, (0, 0, 0.3), strap, 20, 6)
    band.scale = (1, 0.6, 1.1)
    bpy.ops.object.transform_apply(scale=True)
    cam = box("camera-strap-body", (0.09, 0.04, 0.06), (0, -0.1, 0.25), body, 0.006)
    return [band, cam]


def lantern_backpack():
    frame = material("pack-frame", "#b2472f")
    glow = material("pack-glow", "#ffcf6b", 0.3)
    body = box("lantern-backpack", (0.16, 0.08, 0.18), (0, 0.11, 0.28), frame, 0.01)
    lantern = cone("lantern-backpack-light", 0.06, 0.04, 0.12, (0, 0.17, 0.42), glow, 12)
    return [body, lantern]


def satchel():
    leather = material("satchel-leather", "#7a5230")
    body = box("satchel", (0.14, 0.06, 0.12), (0.14, 0.02, 0.2), leather, 0.01)
    flap = box("satchel-flap", (0.145, 0.065, 0.05), (0.14, 0.03, 0.26), leather, 0.008)
    return [body, flap]


def headphones():
    band_mat = material("headphone-band", "#262835", 0.5)
    cup_mat = material("headphone-cup", "#c2452f", 0.4)
    band = torus("headphones", 0.21, 0.02, (0, 0.03, HEAD_TOP - 0.02), band_mat, 20, 6)
    band.scale = (1, 1, 1)
    parts = [band]
    for side in (-1, 1):
        parts.append(box(f"headphone-cup-{side}", (0.04, 0.05, 0.08), (side * 0.2, 0.02, 0.44), cup_mat, 0.01))
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


for cid, (builder, _bone) in COSMETICS.items():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    parts = builder()
    preview(cid)
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
