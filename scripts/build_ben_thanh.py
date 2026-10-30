"""Build a stylized Ben Thanh Market from the supplied angle references."""
import bpy
import math
import random
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'assets/chobenthanh/model'
OUT.mkdir(parents=True, exist_ok=True)
random.seed(17)
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
for c in list(bpy.data.collections):
    if c.name != 'Collection':
        bpy.data.collections.remove(c)
model = bpy.data.collections.get('Collection')
model.name = 'Ben Thanh Market'

def mat(name, color):
    m = bpy.data.materials.new(name)
    m.diffuse_color = (*color, 1)
    m.use_nodes = True
    p = m.node_tree.nodes.get('Principled BSDF')
    p.inputs['Base Color'].default_value = (*color, 1)
    p.inputs['Roughness'].default_value = .78
    return m

cream = mat('Warm ochre plaster', (.79, .62, .29))
trim = mat('Ivory architectural trim', (.96, .86, .61))
roof = mat('Terracotta tiles', (.64, .19, .095))
ridge = mat('Terracotta raised seams', (.79, .28, .13))
dark = mat('Deep entrance shadow', (.055, .065, .075))
window = mat('Slate blue shutters', (.23, .29, .36))
stone = mat('Warm grey plinth', (.43, .45, .46))
red = mat('Awning vermilion', (.8, .13, .10))
white = mat('Awning linen', (.98, .94, .81))
wood = mat('Fruit crates', (.32, .18, .075))
fruit = [mat('Produce '+str(i), c) for i,c in enumerate([(.9,.57,.06),(.45,.65,.13),(.72,.09,.06)])]

def mesh(name, verts, faces, material):
    data = bpy.data.meshes.new(name)
    data.from_pydata(verts, [], faces)
    data.update()
    o = bpy.data.objects.new(name, data)
    model.objects.link(o)
    o.data.materials.append(material)
    return o

def box(name, loc, size, material, bevel=0):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
    o = bpy.context.object
    o.name = name
    o.dimensions = size
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    o.data.materials.append(material)
    if bevel:
        mod = o.modifiers.new('Soft edges', 'BEVEL')
        mod.width = bevel
        mod.segments = 2
        o.modifiers.new('Weighted normals', 'WEIGHTED_NORMAL')
    return o

def rod(name, a, b, radius, material, vertices=10):
    d = Vector(b)-Vector(a)
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=d.length, location=(Vector(a)+Vector(b))/2)
    o=bpy.context.object
    o.name=name
    o.rotation_euler=d.to_track_quat('Z','Y').to_euler()
    o.data.materials.append(material)
    return o

def sphere(name, loc, scale, material):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=10, ring_count=6, radius=1, location=loc)
    o=bpy.context.object
    o.name=name
    o.scale=scale
    o.data.materials.append(material)
    return o

font = bpy.data.fonts.load('/System/Library/Fonts/Supplemental/Arial Bold.ttf')
def text(name, body, loc, size, material, rotation=(math.pi/2,0,0)):
    data=bpy.data.curves.new(name,'FONT')
    data.body=body
    data.font=font
    data.align_x='CENTER'
    data.size=size
    data.extrude=.012
    o=bpy.data.objects.new(name,data)
    model.objects.link(o)
    o.location=loc
    o.rotation_euler=rotation
    data.materials.append(material)
    return o

# All facade modules are authored facing south, then rotated around the building.
def transform(o, origin, angle):
    x,y,z=o.location
    o.location=(origin[0]+x*math.cos(angle)-y*math.sin(angle),origin[1]+x*math.sin(angle)+y*math.cos(angle),z)
    o.rotation_euler.z += angle
    return o

def arch(name, x, y, spring, radius, width, depth, material):
    verts=[]
    n=24
    for yy in [y-depth/2,y+depth/2]:
        for r in [radius,radius+width]:
            for i in range(n+1):
                t=math.pi*i/n
                verts.append((x+r*math.cos(t),yy,spring+r*math.sin(t)))
    faces=[]
    k=n+1
    for i in range(n):
        faces.extend([(i,i+1,k+i+1,k+i),(2*k+i,3*k+i,3*k+i+1,2*k+i+1),(i,2*k+i,2*k+i+1,i+1),(k+i,k+i+1,3*k+i+1,3*k+i)])
    faces.extend([(0,k,3*k,2*k),(n,2*k-1,4*k-1,3*k-1)])
    return mesh(name,verts,faces,material)

def bay(origin, angle, index):
    before=set(bpy.data.objects)
    box('Recessed shop shutter',(0,-.16,1.24),(1.55,.12,2.12),window)
    for x in [-1.02,1.02]:
        box('Arcade pier',(x,-.07,1.37),(.28,.48,2.74),cream,.025)
        box('Pier foot',(x,-.09,.18),(.38,.55,.30),stone,.025)
        box('Pier capital',(x,-.09,2.7),(.42,.56,.17),trim,.015)
    arch('Ivory arcade arch',0,-.11,2.38,.89,.19,.46,trim)
    if index%3==0:
        for j in range(8):
            o=box('Striped canvas canopy',(-.79+j*.225,-.60,2.02),(.225,1.0,.065),red if j%2==0 else white,.015)
            o.rotation_euler.x=.22
            sphere('Scalloped canvas valance',(-.79+j*.225,-1.08,1.91),(.112,.045,.13),red if j%2==0 else white)
        box('Produce stall',(0,-.72,.42),(1.8,.75,.75),stone,.04)
        for k in range(3):
            box('Wood produce bin',(-.58+k*.58,-.75,.84),(.54,.65,.13),wood,.02)
            for a in range(4):
                for b in range(4):
                    sphere('Market fruit',(-.77+k*.58+a*.125,-.98+b*.14,.94+random.uniform(0,.055)),(.071,.071,.072),fruit[k])
    for o in set(bpy.data.objects)-before:
        transform(o,origin,angle)

box('Foundation',(0,1,.12),(32.6,26.6,.24),stone,.12)
box('Market hall walls',(0,1,1.85),(32,26,3.45),cream,.08)
# Repeated arcades on all four sides.
for side,y,angle in [('South',-12,0),('North',14,math.pi)]:
    for i,x in enumerate([-14,-11.7,-9.4,-7.1,-4.8,4.8,7.1,9.4,11.7,14]):
        bay((x,y),angle,i)
    box(side+' cornice',(0,y,3.45),(32.5,.65,.25),trim,.04)
    box(side+' parapet',(0,y+.12*math.cos(angle),3.78),(32.3,.3,.4),cream,.03)
    box(side+' parapet cap',(0,y,4.0),(32.6,.48,.13),trim,.025)
for x,angle in [(16,math.pi/2),(-16,-math.pi/2)]:
    for i in range(11):
        bay((x,-10.5+i*2.3),angle,i)
    box('Side cornice',(x,1,3.45),(.65,26.4,.25),trim,.04)
    box('Side parapet',(x,1,3.8),(.3,26.3,.4),cream,.02)
    box('Side coping',(x,1,4.02),(.48,26.5,.13),trim,.02)

def gable(cx, half, eave, peak, start=-11.4, end=13.4):
    verts=[(cx-half,start,eave),(cx,start,peak),(cx+half,start,eave),(cx-half,end,eave),(cx,end,peak),(cx+half,end,eave)]
    mesh('Gabled hall roof',verts,[(0,3,4,1),(1,4,5,2),(0,1,2),(3,5,4)],roof)
    for y in [start,end]:
        rod('Gable edge',(cx-half,y,eave),(cx,y,peak),.085,ridge)
        rod('Gable edge',(cx,y,peak),(cx+half,y,eave),.085,ridge)
    rod('Ridge cap',(cx,start,peak+.035),(cx,end,peak+.035),.10,ridge)
    for j in range(48):
        y=start+j*(end-start)/47
        for sign in [-1,1]:
            rod('Roof tile seam',(cx,y,peak+.025),(cx+sign*half,y,eave+.025),.028,ridge,6)
    for t in [.25,.5,.75,1]:
        for sign in [-1,1]:
            rod('Horizontal tile course',(cx+sign*half*t,start,peak+(eave-peak)*t+.02),(cx+sign*half*t,end,peak+(eave-peak)*t+.02),.018,ridge,6)

for cx in [-12,-7.4,7.4,12]:
    gable(cx,2.25,3.9,5.05)
gable(0,5.15,4.0,6.65)
box('Raised roof monitor',(0,2,6.49),(2.8,20,.7),window)
for y in range(-8,13,2):
    box('Monitor mullion',(0,y,6.55),(2.9,.09,.65),trim)
gable(0,1.75,6.7,7.45,-8.5,12.8)

# Entrance portals, with modeled arch openings rather than a painted rectangle.
def portal(y,angle,label,tower=False):
    before=set(bpy.data.objects)
    for x in [-1.95,1.95]:
        box('Entrance stone pier',(x,0,2.45),(1.0,.7,4.9),cream,.025)
        box('Entrance outer white pilaster',(x+(.45 if x>0 else -.45),-.43,2.5),(.16,.16,5),trim,.015)
    box('Portal lintel',(0,0,4.65),(4.9,.7,.9),cream,.025)
    arch('Entrance arch voussoir',0,-.16,2.22,1.47,.45,.7,cream)
    box('Entrance interior shadow',(0,.38,1.9),(2.94,.07,3.8),dark)
    box('Portal upper coping',(0,-.1,5.12),(5.15,.95,.17),trim,.02)
    text('Market name',label,(0,-.5,4.56),.43,dark)
    for x in [-3.25,3.25]:
        box('Entrance side wing',(x,.05,1.98),(1.45,.65,3.95),cream)
        box('Wing door',(x,-.3,1.0),(1,.08,1.85),window)
        for xx in [x-.58,x+.58]:
            box('Wing trim',(xx,-.4,1.92),(.12,.14,3.84),trim)
        for z in [2.1,2.25,2.4]:
            box('Vent horizontal bar',(x,-.4,z),(1.1,.1,.06),trim)
        box('Wing coping',(x,-.05,3.96),(1.6,.85,.15),trim)
    for o in set(bpy.data.objects)-before:
        transform(o,(0,y),angle)
portal(-12.4,0,'CHỢ BẾN THÀNH',True)
portal(14.4,math.pi,'CỬA BẮC • CHỢ BẾN THÀNH')

box('Clock tower shaft',(0,-10.82,7.3),(3.8,3.28,6.0),cream,.035)
for z,sz in [(9.8,(4.2,3.8,.24)),(11,(4.35,3.95,.24))]:
    box('Tower cornice',(0,-10.9,z),sz,trim,.035)
box('Tower upper lantern',(0,-10.9,10.45),(3.7,3.3,1.0),cream)
for angle in [0,math.pi/2,math.pi,3*math.pi/2]:
    before=set(bpy.data.objects)
    box('Clock inset panel',(0,-1.73,8.0),(2.25,.06,2.55),trim,.02)
    for x in [-1.53,1.53]:
        box('Tower pilaster',(x,-1.78,7.45),(.18,.15,3.7),trim,.015)
        box('Tower pilaster capital',(x,-1.81,9.2),(.33,.22,.22),trim)
    box('Lantern louver',(0,-1.69,10.45),(2.1,.06,.29),window)
    for z in [10.38,10.48,10.58]:
        box('Lantern slat',(0,-1.75,z),(2.15,.06,.035),stone)
    rod('Clock ivory surround',(0,-1.79,8.05),(0,-1.91,8.05),1.04,cream,64)
    rod('Clock bezel',(0,-1.92,8.05),(0,-2.0,8.05),.85,stone,64)
    rod('Clock face',(0,-2.01,8.05),(0,-2.025,8.05),.76,white,64)
    for i in range(12):
        t=2*math.pi*i/12
        o=box('Clock hour marker',(.64*math.sin(t),-2.05,8.05+.64*math.cos(t)),(.045,.035,.12),dark,.005)
        o.rotation_euler.y=t
    rod('Minute hand',(0,-2.09,8.05),(-.16,-2.09,8.57),.038,dark)
    rod('Hour hand',(0,-2.10,8.05),(.39,-2.10,8.05),.045,dark)
    sphere('Clock central pin',(0,-2.13,8.05),(.075,.035,.075),dark)
    for o in set(bpy.data.objects)-before:
        transform(o,(0,-10.9),angle)
# Pyramidal tiled cap.
xh,yh,z,top=2.5,2.25,11.15,13.05
mesh('Tower pyramid roof',[(-xh,-10.9-yh,z),(xh,-10.9-yh,z),(xh,-10.9+yh,z),(-xh,-10.9+yh,z),(0,-10.9,top)],[(0,1,4),(1,2,4),(2,3,4),(3,0,4)],roof)
for a,b in [((-xh,-yh),(xh,-yh)),((xh,-yh),(xh,yh)),((xh,yh),(-xh,yh)),((-xh,yh),(-xh,-yh))]:
    for j in range(1,10):
        t=j/10
        rod('Tower tile course',(a[0]*t,-10.9+a[1]*t,top+(z-top)*t+.025),(b[0]*t,-10.9+b[1]*t,top+(z-top)*t+.025),.045,ridge)
    for j in range(15):
        t=j/14
        end=(a[0]+(b[0]-a[0])*t,-10.9+a[1]+(b[1]-a[1])*t,z)
        rod('Tower tile channel',(0,-10.9,top+.03),end,.025,ridge,6)
    rod('Hip ridge',(a[0],-10.9+a[1],z),(0,-10.9,top),.075,ridge)
rod('Finial base',(0,-10.9,13.02),(0,-10.9,13.45),.12,ridge)
sphere('Finial ball',(0,-10.9,13.5),(.19,.19,.22),ridge)
bpy.ops.mesh.primitive_cone_add(vertices=16,radius1=.065,radius2=0,depth=1.1,location=(0,-10.9,14.12))
bpy.context.object.name='Finial spire'
bpy.context.object.data.materials.append(ridge)

# Named review cameras and a separate studio collection.
studio=bpy.data.collections.new('Studio - excluded from GLB')
bpy.context.scene.collection.children.link(studio)
def to_studio(o):
    for c in list(o.users_collection):
        c.objects.unlink(o)
    studio.objects.link(o)

def camera(name,loc,target,scale):
    bpy.ops.object.camera_add(location=loc)
    o=bpy.context.object
    o.name=name
    o.rotation_euler=(Vector(target)-o.location).to_track_quat('-Z','Y').to_euler()
    o.data.type='ORTHO'
    o.data.ortho_scale=scale
    to_studio(o)
    return o
hero=camera('Camera - three quarter',(41,-54,35),(0,0,4.2),49)
camera('Camera - front',(0,-65,18),(0,0,5.7),40)
camera('Camera - rear',(0,65,22),(0,0,5),43)
camera('Camera - right',(65,0,22),(0,0,5),40)
floor=box('Studio ground',(0,0,-.14),(200,200,.15),mat('Studio blue grey',(.32,.39,.48)))
to_studio(floor)
for name,loc,power,size in [('Key',(-18,-25,40),4500,22),('Fill',(25,-5,26),2500,20),('Rim',(0,28,35),3500,18)]:
    bpy.ops.object.light_add(type='AREA',location=loc)
    o=bpy.context.object
    o.name=name
    o.data.energy=power
    o.data.shape='DISK'
    o.data.size=size
    o.rotation_euler=(-o.location).to_track_quat('-Z','Y').to_euler()
    to_studio(o)
scene=bpy.context.scene
scene.camera=hero
scene.render.engine='CYCLES'
scene.cycles.samples=48
scene.cycles.use_denoising=True
scene.world.color=(.35,.35,.35)
scene.render.resolution_x=1600
scene.render.resolution_y=1200
scene.render.resolution_percentage=100
scene.view_settings.view_transform='AgX'
scene.view_settings.look='AgX - Medium High Contrast'
scene.view_settings.exposure=1.25
# Convert lettering for portable export; keep editable text in the .blend.
bpy.ops.object.select_all(action='DESELECT')
for o in model.objects:
    o.select_set(True)
bpy.context.view_layer.objects.active=next(iter(model.objects))
bpy.ops.file.pack_all()
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'ben-thanh-market.blend'))
for o in list(model.objects):
    if o.type == 'FONT':
        bpy.ops.object.select_all(action='DESELECT')
        o.select_set(True)
        bpy.context.view_layer.objects.active=o
        bpy.ops.object.convert(target='MESH')
bpy.ops.object.select_all(action='DESELECT')
for o in model.objects:
    o.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(OUT/'ben-thanh-market.glb'),export_format='GLB',use_selection=True,export_apply=True)
scene.render.filepath=str(OUT/'ben-thanh-market-preview.png')
bpy.ops.render.render(write_still=True)
print('MODEL_OUTPUT',str(OUT),flush=True)
