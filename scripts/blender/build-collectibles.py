"""Build collectible pickup GLBs in world space (spin-pickup coins, tokens).

Usage: Blender -b --python scripts/blender/build-collectibles.py -- <repo-root>
Each collectible is exported as its own GLB to assets/collectibles/<id>.glb,
plus a preview PNG. Pickups are authored upright (facing +Y, flat on the X/Y
disc) so the runtime can spin them about the world up axis. Budget: <=1.5k
triangles each.
"""
import math
import sys

import bpy

repo = sys.argv[sys.argv.index("--") + 1]
out = f"{repo}/assets/collectibles"


def material(name, hex_color, rough=0.4, metal=0.0, emit=0.0):
    mat = bpy.data.materials.new(name)
    color = tuple(int(hex_color[i : i + 2], 16) / 255 for i in (1, 3, 5))
    linear = tuple(c**2.2 for c in color)
    mat.diffuse_color = (*linear, 1)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes["Principled BSDF"]
    bsdf.inputs["Base Color"].default_value = (*linear, 1)
    bsdf.inputs["Roughness"].default_value = rough
    bsdf.inputs["Metallic"].default_value = metal
    if emit and "Emission Color" in bsdf.inputs:
        bsdf.inputs["Emission Color"].default_value = (*linear, 1)
        bsdf.inputs["Emission Strength"].default_value = emit
    return mat


def finish(obj, mat, bevel=0.0, shade_smooth=False):
    obj.data.materials.append(mat)
    if bevel:
        mod = obj.modifiers.new("bevel", "BEVEL")
        mod.width = bevel
        mod.segments = 2
        bpy.context.view_layer.objects.active = obj
        bpy.ops.object.modifier_apply(modifier="bevel")
    for poly in obj.data.polygons:
        poly.use_smooth = shade_smooth
    return obj


def cylinder(name, radius, depth, loc, mat, verts=24, bevel=0.0, smooth=True):
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=verts, radius=radius, depth=depth, location=loc
    )
    obj = bpy.context.object
    obj.name = name
    # Author the disc upright: faces point along +/-Y, flat side toward camera.
    obj.rotation_euler = (math.radians(90), 0, 0)
    bpy.ops.object.transform_apply(rotation=True)
    return finish(obj, mat, bevel, smooth)


def star(name, surface_y, facing, mat, points=5, outer=0.12, inner=0.052, depth=0.015):
    """Raised star emblem on one coin face.

    The base rim sits on the disc surface (y = surface_y) and extrudes outward
    along `facing` (+1 front, -1 back) so each face reads independently.
    """
    import bmesh

    mesh = bpy.data.meshes.new(name)
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    bm = bmesh.new()
    rim = []
    for i in range(points * 2):
        r = outer if i % 2 == 0 else inner
        a = math.pi / 2 + i * math.pi / points
        rim.append(bm.verts.new((math.cos(a) * r, surface_y, math.sin(a) * r)))
    face = bm.faces.new(rim)
    bmesh.ops.extrude_face_region(bm, geom=[face])
    bmesh.ops.translate(
        bm, vec=(0, facing * depth, 0),
        verts=[v for v in bm.verts if abs(v.co.y - surface_y) < 1e-6],
    )
    bm.normal_update()
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(mesh)
    bm.free()
    bpy.context.view_layer.objects.active = obj
    return finish(obj, mat, 0.0, False)


def coin():
    # Vietnam flag palette: a red coin body with a yellow star emblem.
    gold = material("coin-red", "#da251d", rough=0.3, metal=0.7)
    rim = material("coin-rim", "#a81813", rough=0.35, metal=0.7)
    emblem = material("coin-emblem", "#ffff00", rough=0.3, metal=0.6, emit=0.6)
    # Thin disc body with a slightly wider, darker rim ring for readability.
    body = cylinder("coin", 0.2, 0.05, (0, 0, 0), gold, verts=32, bevel=0.012)
    ring = cylinder("coin-ring", 0.21, 0.035, (0, 0, 0), rim, verts=32)
    stars = [
        star(f"coin-star-{'front' if facing > 0 else 'back'}",
             facing * 0.025, facing, emblem)
        for facing in (1, -1)
    ]
    return [body, ring, *stars]


COLLECTIBLES = {
    "coin": coin,
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
    cam.data.ortho_scale = 0.52
    # Look at the coin face from +/-Y with a small 3/4 tilt so the emblem and
    # the rim thickness both read.
    tilt = math.radians(18)
    cam.location = (0.5, -1.9, 0.55)
    cam.rotation_euler = (math.radians(74), 0, math.radians(15))
    scene.render.filepath = f"{out}/preview-{name}.png"
    bpy.ops.render.render(write_still=True)


for cid, builder in COLLECTIBLES.items():
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
