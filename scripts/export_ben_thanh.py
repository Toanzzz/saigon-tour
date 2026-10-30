"""Export the market collection and validate its portable geometry."""
import bpy
from pathlib import Path
out=Path(__file__).resolve().parents[1]/'assets/chobenthanh/model'
model=bpy.data.collections['Ben Thanh Market']
for o in list(model.objects):
    if o.type=='FONT':
        bpy.ops.object.select_all(action='DESELECT')
        o.select_set(True)
        bpy.context.view_layer.objects.active=o
        bpy.ops.object.convert(target='MESH')
bpy.ops.object.select_all(action='DESELECT')
for o in model.objects:
    o.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(out/'ben-thanh-market.glb'),export_format='GLB',use_selection=True,export_apply=True)
print('EXPORTED',len(model.objects),'model objects',flush=True)
