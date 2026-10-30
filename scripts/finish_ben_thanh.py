import bpy
import math
from pathlib import Path
out=Path(__file__).resolve().parents[1]/'assets/chobenthanh/model'
for o in bpy.data.objects:
    if o.name.startswith('Recessed shop shutter'):
        angle=o.rotation_euler.z
        o.location.x += .25*math.sin(angle)
        o.location.y -= .25*math.cos(angle)
shaft=bpy.data.objects['Clock tower shaft']
shaft.location.y += .08
shaft.dimensions.y -= .12
bpy.context.scene.view_settings.look='AgX - Medium High Contrast'
bpy.context.scene.view_settings.exposure=1.25
bpy.ops.file.pack_all()
bpy.context.preferences.filepaths.save_version=0
bpy.ops.wm.save_as_mainfile(filepath=str(out/'ben-thanh-market.blend'))
exec(compile((Path(__file__).parent/'export_ben_thanh.py').read_text(),str(Path(__file__).parent/'export_ben_thanh.py'),'exec'))
bpy.context.scene.render.filepath=str(out/'ben-thanh-market-preview.png')
bpy.ops.render.render(write_still=True)
