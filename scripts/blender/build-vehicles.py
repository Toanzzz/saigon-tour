"""Build personal-vehicle unlock GLBs (Cub motorbike and Vespa scooter).

Usage: Blender -b --python scripts/blender/build-vehicles.py -- <repo-root>
Writes assets/vehicles/<id>.glb plus a preview PNG. Low-poly, colormap-style
materials. Budget: <=5k triangles each. Bicycles are drawn procedurally by the
runtime Bike component and need no GLB.
"""
import math
import sys

import bpy

repo = sys.argv[sys.argv.index("--") + 1]
out = f"{repo}/assets/vehicles"


def material(name, hex_color, rough=0.7):
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


def box(name, size, loc, mat, bevel=0.02):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
    obj = bpy.context.object
    obj.name = name
    obj.scale = size
    bpy.ops.object.transform_apply(scale=True)
    return finish(obj, mat, bevel)


def cyl(name, r, depth, loc, mat, rot=(math.radians(90), 0, 0), verts=18):
    bpy.ops.mesh.primitive_cylinder_add(vertices=verts, radius=r, depth=depth, location=loc)
    obj = bpy.context.object
    obj.name = name
    obj.rotation_euler = rot
    return finish(obj, mat)


def wheel(name, loc, tyre):
    return cyl(name, 0.26, 0.12, loc, tyre, (0, math.radians(90), 0), verts=20)


def cub():
    body = material("cub-body", "#d7483f")
    dark = material("cub-dark", "#262835", 0.4)
    seat = material("cub-seat", "#1d1f2a", 0.4)
    chrome = material("cub-chrome", "#b9bcc4", 0.3)
    parts = [
        wheel("cub-wheel-front", (0, -0.62, 0.26), dark),
        wheel("cub-wheel-rear", (0, 0.6, 0.26), dark),
        box("cub-frame", (0.3, 1.0, 0.22), (0, 0, 0.52), body, 0.04),
        box("cub-tank", (0.26, 0.4, 0.2), (0, 0.1, 0.72), body, 0.04),
        box("cub-seat", (0.28, 0.5, 0.1), (0, 0.42, 0.78), seat, 0.03),
        box("cub-leg-shield", (0.3, 0.1, 0.4), (0, -0.4, 0.62), body, 0.03),
        cyl("cub-handlebar", 0.025, 0.5, (0, -0.55, 0.95), chrome, (0, math.radians(90), 0), 10),
        box("cub-headlight", (0.12, 0.08, 0.12), (0, -0.58, 0.82), chrome, 0.02),
    ]
    return parts


def vespa():
    body = material("vespa-body", "#6fb7b0")
    cream = material("vespa-cream", "#f0e6cf", 0.5)
    dark = material("vespa-dark", "#262835", 0.4)
    chrome = material("vespa-chrome", "#b9bcc4", 0.3)
    bpy.ops.mesh.primitive_uv_sphere_add(radius=0.42, location=(0, 0.42, 0.55), segments=18, ring_count=10)
    rear = bpy.context.object
    rear.name = "vespa-rear"
    rear.scale = (0.72, 1.0, 1.0)
    bpy.ops.object.transform_apply(scale=True)
    finish(rear, body)
    parts = [
        rear,
        wheel("vespa-wheel-front", (0, -0.58, 0.26), dark),
        wheel("vespa-wheel-rear", (0, 0.56, 0.26), dark),
        box("vespa-floor", (0.3, 0.7, 0.1), (0, -0.1, 0.42), body, 0.03),
        box("vespa-shield", (0.32, 0.12, 0.5), (0, -0.52, 0.6), body, 0.04),
        box("vespa-seat", (0.26, 0.55, 0.1), (0, 0.3, 0.78), cream, 0.03),
        cyl("vespa-handlebar", 0.025, 0.46, (0, -0.56, 0.96), chrome, (0, math.radians(90), 0), 10),
        box("vespa-headlight", (0.1, 0.08, 0.1), (0, -0.6, 0.82), chrome, 0.02),
    ]
    return parts


VEHICLES = {"cub": cub, "vespa": vespa}


def preview(name):
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_WORKBENCH"
    scene.display.shading.color_type = "MATERIAL"
    scene.render.resolution_x = scene.render.resolution_y = 420
    scene.render.film_transparent = True
    cam = bpy.data.objects.get("preview")
    if cam is None:
        cam = bpy.data.objects.new("preview", bpy.data.cameras.new("preview"))
        scene.collection.objects.link(cam)
    scene.camera = cam
    cam.data.type = "ORTHO"
    cam.data.ortho_scale = 2.4
    a = math.radians(35)
    cam.location = (math.sin(a) * 4.0, -math.cos(a) * 4.0, 1.4)
    cam.rotation_euler = (math.radians(78), 0, a)
    scene.render.filepath = f"{out}/preview-{name}.png"
    bpy.ops.render.render(write_still=True)


for vid, builder in VEHICLES.items():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    parts = builder()
    preview(vid)
    for obj in parts:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = parts[0]
    bpy.ops.export_scene.gltf(
        filepath=f"{out}/{vid}.glb",
        use_selection=True,
        export_format="GLB",
        export_yup=True,
    )
    print("BUILT", vid, "parts", len(parts))
