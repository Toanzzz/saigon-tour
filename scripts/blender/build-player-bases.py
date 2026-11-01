"""Build plain player bodies (man, woman) with split clothing materials.

Usage: Blender -b --python scripts/blender/build-player-bases.py -- <repo-root>

Imports a Kenney mini-character base, drops the Icosphere helpers, keeps the
animations (idle, walk, sprint, sit), and splits the body-mesh shirt and
trouser faces into two flat `outfit-top` / `outfit-bottom` materials so the
wardrobe outfits can recolour clothing without touching skin, hair or shoes.

Writes assets/player-bases/player-{man,woman}.{blend,glb} plus front/back
previews. The man is character-male-e (the base build-tourist.py and
build-cosmetics.py fitted their offsets against); the woman is
character-female-e, the plainest t-shirt-and-trousers female base.
"""
import math
import sys

import bpy

repo = sys.argv[sys.argv.index("--") + 1]
pack = f"{repo}/assets/mini-characters/GLB format"
out = f"{repo}/assets/player-bases"

BASES = {"man": "character-male-e", "woman": "character-female-e"}

# colormap atlas, sampled to flatten each clothing region to one base colour.
_tex = bpy.data.images.load(f"{pack}/Textures/colormap.png")
_W, _H = _tex.size
_PX = _tex.pixels[:]


def sample_linear(u, v):
    x = min(_W - 1, max(0, int(u * _W)))
    y = min(_H - 1, max(0, int(v * _H)))
    i = (y * _W + x) * 4
    return _PX[i], _PX[i + 1], _PX[i + 2]


def linear_to_srgb(c):
    return 12.92 * c if c <= 0.0031308 else 1.055 * c ** (1 / 2.4) - 0.055


def is_skin(r, g, b):
    import colorsys

    R, G, B = (linear_to_srgb(c) for c in (r, g, b))
    h, s, val = colorsys.rgb_to_hsv(R, G, B)
    return 0.02 < h < 0.11 and s > 0.15 and val > 0.5


def flat_material(name, linear_rgb):
    mat = bpy.data.materials.new(name)
    srgb = tuple(linear_to_srgb(c) for c in linear_rgb)
    mat.diffuse_color = (*linear_rgb, 1)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes["Principled BSDF"]
    bsdf.inputs["Base Color"].default_value = (*linear_rgb, 1)
    bsdf.inputs["Roughness"].default_value = 0.85
    mat.diffuse_color = (*linear_rgb, 1)
    return mat, srgb


def split_clothing(body):
    """Assign shirt faces to outfit-top and trouser faces to outfit-bottom.

    Faces keep `colormap` unless they are non-skin clothing above the shoes.
    The shirt/trouser boundary is the body-local z midpoint of the clothing,
    and the lowest 10% of the body (shoes) stays on colormap.
    """
    uv = body.data.uv_layers.active
    zs = [v.co.z for v in body.data.vertices]
    zmin, zmax = min(zs), max(zs)
    span = zmax - zmin

    # First pass: gather non-skin, non-shoe clothing faces and their colours.
    cloth = []  # (poly_index, frac, linear_rgb)
    for poly in body.data.polygons:
        us = [uv.data[li].uv for li in poly.loop_indices]
        cu = sum(p[0] for p in us) / len(us)
        cv = sum(p[1] for p in us) / len(us)
        r, g, b = sample_linear(cu, cv)
        if is_skin(r, g, b):
            continue
        zc = sum(body.data.vertices[v].co.z for v in poly.vertices) / len(
            poly.vertices
        )
        frac = (zc - zmin) / span
        if frac < 0.10:  # shoes stay on colormap
            continue
        cloth.append((poly.index, frac, (r, g, b)))

    if not cloth:
        return
    fracs = sorted(f for _, f, _ in cloth)
    split = fracs[len(fracs) // 2]  # median: shirt above, trousers below

    top_cols = [c for _, f, c in cloth if f >= split]
    bot_cols = [c for _, f, c in cloth if f < split]

    def mean(colours):
        n = len(colours)
        return tuple(sum(c[i] for c in colours) / n for i in range(3))

    top_mat, top_srgb = flat_material("outfit-top", mean(top_cols))
    bot_mat, bot_srgb = flat_material("outfit-bottom", mean(bot_cols))
    top_slot = len(body.data.materials)
    body.data.materials.append(top_mat)
    bot_slot = len(body.data.materials)
    body.data.materials.append(bot_mat)

    for index, frac, _ in cloth:
        body.data.polygons[index].material_index = (
            top_slot if frac >= split else bot_slot
        )
    print(
        "SPLIT top=#%02x%02x%02x bottom=#%02x%02x%02x"
        % (
            *(int(c * 255) for c in top_srgb),
            *(int(c * 255) for c in bot_srgb),
        )
    )


def preview(body_name, arm):
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_WORKBENCH"
    scene.display.shading.color_type = "MATERIAL"
    scene.render.resolution_x = scene.render.resolution_y = 520
    scene.render.film_transparent = True
    cam = bpy.data.objects.get("preview")
    if cam is None:
        cam = bpy.data.objects.new("preview", bpy.data.cameras.new("preview"))
        scene.collection.objects.link(cam)
    scene.camera = cam
    cam.data.type = "ORTHO"
    cam.data.ortho_scale = 0.95
    idle = bpy.data.actions.get("idle")
    if idle and arm.animation_data:
        arm.animation_data.action = idle
    for label, yaw in (("front", 25), ("back", 205)):
        a = math.radians(yaw)
        cam.location = (math.sin(a) * 2.2, -math.cos(a) * 2.2, 0.62)
        cam.rotation_euler = (math.radians(84), 0, a)
        scene.render.filepath = f"{out}/preview-{body_name}-{label}.png"
        bpy.ops.render.render(write_still=True)


for body_name, base in BASES.items():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=f"{pack}/{base}.glb")
    for obj in [o for o in bpy.data.objects if o.name.startswith("Icosphere")]:
        bpy.data.objects.remove(obj, do_unlink=True)
    arm = next(o for o in bpy.data.objects if o.type == "ARMATURE")
    arm.name = f"player-{body_name}"
    body = next(o for o in bpy.data.objects if o.name == "body-mesh")
    split_clothing(body)

    bpy.ops.wm.save_as_mainfile(filepath=f"{out}/player-{body_name}.blend")
    bpy.ops.export_scene.gltf(
        filepath=f"{out}/player-{body_name}.glb",
        export_format="GLB",
        export_animations=True,
        export_animation_mode="ACTIONS",
        export_yup=True,
    )
    preview(body_name, arm)
    print("BUILT", body_name, "from", base)
