"""Build fitted, rigged reward garments on both original player bodies.

Blender -b --python scripts/blender/build-outfits.py -- <repo-root>
Full avatar variants retain the base skeleton and animation clips. Garment
weights transfer from nearby body vertices, with split tunic panels following
each leg. Sources remain editable under assets/outfits.
"""
import math
import os
import sys

import bpy
from mathutils import Vector, kdtree

repo = sys.argv[sys.argv.index("--") + 1]
output = f"{repo}/assets/outfits"
os.makedirs(output, exist_ok=True)
COLORS = {
    "apron": ("#f4d9a0", "#5b5944", "#da6350"),
    "barista": ("#eee1ca", "#343642", "#71503b"),
    "photo-vest": ("#e5d8af", "#4b5a39", "#70805a"),
    "ao-ba-ba": ("#78628e", "#40344f", "#9575a8"),
    "evening": ("#344c7b", "#202d4a", "#e4bc71"),
    "ao-dai": ("#e86a9b", "#f3ead6", "#ffd6b4"),
    "festival-ao-dai": ("#192b51", "#24283b", "#e8bd5e"),
}
only = next((arg.split("=", 1)[1].split(",") for arg in sys.argv
             if arg.startswith("--only=")), [])


def material(name, color):
    rgb = [int(color[i:i + 2], 16) / 255 for i in (1, 3, 5)]
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = (*(v ** 2.2 for v in rgb), 1)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes["Principled BSDF"]
    bsdf.inputs["Base Color"].default_value = mat.diffuse_color
    bsdf.inputs["Roughness"].default_value = 0.85
    return mat


def mesh(name, vertices, faces, mat):
    data = bpy.data.meshes.new(name)
    data.from_pydata(vertices, [], faces)
    data.materials.append(mat)
    obj = bpy.data.objects.new(name, data)
    bpy.context.collection.objects.link(obj)
    return obj


def panel(name, left, right, bottom, top, y, mat, thickness=0):
    if thickness:
        vertices = [(x, y + offset, z) for offset in (-thickness / 2, thickness / 2)
                    for x, z in ((left, bottom), (right, bottom), (right, top), (left, top))]
        return mesh(name, vertices, [(0, 1, 2, 3), (7, 6, 5, 4),
                    (0, 4, 5, 1), (1, 5, 6, 2), (2, 6, 7, 3), (3, 7, 4, 0)], mat)
    return mesh(
        name,
        [(left, y, bottom), (right, y, bottom),
         (right, y, top), (left, y, top)],
        [(0, 1, 2, 3)],
        mat,
    )


def box(name, size, position, mat):
    bpy.ops.mesh.primitive_cube_add(size=1, location=position)
    obj = bpy.context.object
    obj.name = name
    obj.scale = size
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.data.materials.append(mat)
    return obj


def band(name, a, b, width, mat):
    a, b = Vector(a), Vector(b)
    obj = box(name, (width, 0.008, (b - a).length), (a + b) / 2, mat)
    obj.rotation_euler = (b - a).to_track_quat("Z", "Y").to_euler()
    return obj


def shell(name, bottom, top, width_bottom, width_top, depth, mat):
    vertices = []
    for z, width in [(bottom, width_bottom), (top, width_top)]:
        for i in range(12):
            angle = i * math.tau / 12
            vertices.append((math.cos(angle) * width,
                             math.sin(angle) * depth, z))
    return mesh(name, vertices,
                [(i, (i + 1) % 12, (i + 1) % 12 + 12, i + 12)
                 for i in range(12)], mat)


def garments(kind, cloth, accent, trim):
    parts = []
    front = -0.118
    if kind in ("apron", "barista"):
        bottom = 0.085 if kind == "apron" else 0.13
        parts.append(mesh("apron-bib",
                          [(-0.072, front, 0.354), (0.072, front, 0.354),
                           (0.14, front - 0.003, 0.185),
                           (-0.14, front - 0.003, 0.185)],
                          [(0, 1, 2, 3)], accent))
        parts.append(panel("apron-skirt", -0.145, 0.145, bottom, 0.21,
                           front - 0.012, accent))
        parts.append(box("waist-tie", (0.31, 0.018, 0.022),
                         (0, front - 0.025, 0.215), trim))
        parts.append(box("apron-pocket", (0.11, 0.012, 0.065),
                         (0, front - 0.026, 0.16), trim))
        for side in (-1, 1):
            parts.append(band("neck-strap",
                              (side * 0.06, front, 0.345),
                              (side * 0.07, 0.01, 0.37), 0.018, accent))
            parts.append(band("back-tie",
                              (side * 0.135, front, 0.21),
                              (side * 0.03, 0.103, 0.21), 0.018, trim))
    elif kind == "photo-vest":
        for side in (-1, 1):
            x0, x1 = sorted((side * 0.026, side * 0.142))
            parts.append(panel("vest-front", x0, x1, 0.185, 0.345,
                               front, accent))
            for z in (0.22, 0.29):
                parts.append(box("vest-cargo-pocket", (0.077, 0.025, 0.045),
                                 (side * 0.086, front - 0.014, z), trim))
            parts.append(band("vest-shoulder",
                              (side * 0.09, front, 0.34),
                              (side * 0.09, 0.1, 0.34), 0.075, accent))
        parts.append(panel("vest-back", -0.145, 0.145, 0.185, 0.345,
                           0.115, accent))
    elif kind in ("ao-ba-ba", "ao-dai", "festival-ao-dai"):
        parts.append(shell("tunic-bodice", 0.175, 0.35, 0.153, 0.137,
                           0.123, cloth))
        parts.append(shell("standing-collar", 0.34, 0.369, 0.068, 0.068,
                           0.071, trim))
        hem = 0.105 if kind == "ao-ba-ba" else 0.025
        for side in (-1, 1):
            left, right = sorted((side * 0.012, side * 0.155))
            for y in (front - 0.013, 0.127):
                parts.append(panel("split-tunic-panel", left, right, hem,
                                   0.197, y, cloth, thickness=0.006))
            if kind == "ao-ba-ba":
                parts.append(box("tunic-pocket", (0.065, 0.01, 0.05),
                                 (side * 0.085, front - 0.019, 0.22), trim))
            else:
                for z in (0.10, 0.16, 0.24):
                    y0 = front - 0.017 if z < 0.2 else -0.123 * math.sqrt(1 - (0.095 / 0.146) ** 2) - 0.004
                    y1 = front - 0.017 if z < 0.2 else -0.123 * math.sqrt(1 - (0.12 / 0.146) ** 2) - 0.004
                    parts.append(band("embroidered-stem",
                                      (side * 0.095, y0, z),
                                      (side * 0.12, y1, z + 0.025),
                                      0.009, trim))
        for z in (0.23, 0.265, 0.30, 0.33):
            parts.append(box("tunic-button", (0.012, 0.01, 0.012),
                             (0.005, -0.127, z), trim))
        if kind == "festival-ao-dai":
            for side in (-1, 1):
                for z in (0.055, 0.085):
                    parts.append(panel("embroidered-stem-hem",
                                       side * 0.012, side * 0.155,
                                       z, z + 0.006, front - 0.019, trim))
                for dx, dz in ((0, 0.014), (-0.014, 0), (0.014, 0), (0, -0.014)):
                    parts.append(box("embroidered-stem-lotus",
                                     (0.013, 0.008, 0.013),
                                     (side * 0.075 + dx, front - 0.019,
                                      0.14 + dz), trim))
    else:
        parts.append(shell("evening-jacket", 0.17, 0.347, 0.153, 0.14,
                           0.124, cloth))
        for side in (-1, 1):
            parts.append(band("gold-lapel",
                              (side * 0.065, front - 0.016, 0.35),
                              (side * 0.017, front - 0.016, 0.25),
                              0.022, trim))
        parts.append(box("jacket-belt", (0.3, 0.025, 0.02),
                         (0, front - 0.017, 0.2), accent))
        parts.append(box("belt-clasp", (0.035, 0.01, 0.03),
                         (0, front - 0.035, 0.2), trim))
    return parts


for body in ("man", "woman"):
    for kind, (top_color, bottom_color, detail_color) in COLORS.items():
        if only and kind not in only:
            continue
        bpy.ops.wm.read_factory_settings(use_empty=True)
        bpy.ops.import_scene.gltf(
            filepath=f"{repo}/assets/player-bases/player-{body}.glb")
        arm = next(o for o in bpy.data.objects if o.type == "ARMATURE")
        base = bpy.data.objects.get("body-mesh")
        # The plain base retains warm atlas patches on its torso. Garments cover
        # those patches with fabric while hands and shoes keep the original skin.
        top_slot = next(i for i, mat in enumerate(base.data.materials)
                        if mat.name == "outfit-top")
        bottom_slot = next(i for i, mat in enumerate(base.data.materials)
                           if mat.name == "outfit-bottom")
        for face in base.data.polygons:
            if base.data.materials[face.material_index].name != "colormap":
                continue
            points = [base.data.vertices[i].co for i in face.vertices]
            center = sum(points, Vector()) / len(points)
            if max(abs(point.x) for point in points) < 0.19 and center.z > 0.045:
                face.material_index = top_slot if center.z > 0.18 else bottom_slot
        kd = kdtree.KDTree(len(base.data.vertices))
        for i, vertex in enumerate(base.data.vertices):
            kd.insert(base.matrix_world @ vertex.co, i)
        kd.balance()
        top = material("garment-cloth", top_color)
        bottom = material("garment-accent", bottom_color)
        trim = material("garment-trim", detail_color)
        pieces = garments(kind, top, bottom, trim)
        for obj in pieces:
            world = obj.matrix_world.copy()
            obj.data.transform(world)
            obj.matrix_world.identity()
            obj.parent = arm
            groups = {g.name: obj.vertex_groups.new(name=g.name)
                      for g in base.vertex_groups}
            # Each skirt quarter follows one leg as a solid fabric panel.
            # Mixing waist and knee influences across a four-vertex sheet
            # shears it into diagonal ribbons in seated/running poses.
            if obj.name.startswith(("split-tunic-panel", "embroidered-stem", "tunic-button", "tunic-bodice", "standing-collar")):
                center = sum((v.co for v in obj.data.vertices), Vector()) / len(obj.data.vertices)
                anchor = ("leg-left" if center.x > 0 else "leg-right") if center.z < 0.2 else "torso"
                if obj.name.startswith(("tunic-bodice", "standing-collar")):
                    anchor = "torso"
                if obj.name.startswith("split-tunic-panel"):
                    anchor = "leg-left" if center.x > 0 else "leg-right"
                groups[anchor].add([v.index for v in obj.data.vertices], 1, "REPLACE")
                modifier = obj.modifiers.new("original-player-rig", "ARMATURE")
                modifier.object = arm
                continue
            for vertex in obj.data.vertices:
                weights = {}
                for _, index, distance in kd.find_n(vertex.co, 4):
                    factor = 1 / max(distance, 0.005) ** 2
                    for weight in base.data.vertices[index].groups:
                        name = base.vertex_groups[weight.group].name
                        weights[name] = weights.get(name, 0) + weight.weight * factor
                total = sum(weights.values())
                for name, value in weights.items():
                    if total:
                        groups[name].add([vertex.index], value / total, "REPLACE")
            modifier = obj.modifiers.new("original-player-rig", "ARMATURE")
            modifier.object = arm
            # Garment panels are fabric sheets; show their inner faces too.
            for mat in obj.data.materials:
                mat.use_backface_culling = False
        bpy.ops.wm.save_as_mainfile(filepath=f"{output}/{kind}-{body}.blend")
        bpy.ops.export_scene.gltf(
            filepath=f"{output}/{kind}-{body}.glb", export_format="GLB",
            export_animations=True, export_animation_mode="ACTIONS",
            export_yup=True)
        print("BUILT", kind, body, "garment-pieces", len(pieces))
