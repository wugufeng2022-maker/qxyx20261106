"""Rebuild the original, game-ready Meadow bicycle with Blender 5.x."""
import bpy
import math
import json
from pathlib import Path
from mathutils import Vector, Matrix

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'assets' / 'bicycle'
PREVIEW = ROOT / 'previews'
OUT.mkdir(parents=True, exist_ok=True)
PREVIEW.mkdir(parents=True, exist_ok=True)

# Work in a new background process; never alter an open user scene.
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
scene = bpy.context.scene
scene.unit_settings.system = 'METRIC'
scene.unit_settings.scale_length = 1

def material(name, color, metallic=0, roughness=.45):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    node = next(n for n in mat.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    node.inputs['Base Color'].default_value = (*color, 1)
    node.inputs['Metallic'].default_value = metallic
    node.inputs['Roughness'].default_value = roughness
    mat.diffuse_color = (*color, 1)
    return mat

sage = material('Enamel · sage green', (.25,.43,.34), .25, .3)
cream = material('Warm ivory · sidewalls', (.76,.66,.46), 0, .7)
rubber = material('Charcoal · rolling surface', (.037,.048,.044), 0, .82)
alloy = material('Brushed aluminium', (.57,.64,.61), .8, .28)
brass = material('Champagne brass', (.54,.37,.17), .72, .32)
leather = material('Cognac leather', (.24,.095,.039), 0, .62)
seam = material('Leather stitching', (.65,.43,.22), 0, .7)
wicker = material('Honey wicker', (.52,.32,.135), 0, .85)
dark = material('Mechanicals', (.065,.085,.077), .5, .4)
glass = material('Headlamp · warm lens', (.96,.86,.58), .2, .2)
red = material('Rear reflector', (.48,.034,.021), .25, .25)

def empty(name, loc=(0,0,0), parent=None):
    obj = bpy.data.objects.new(name, None)
    scene.collection.objects.link(obj)
    obj.parent = parent
    bpy.context.view_layer.update()
    obj.matrix_world = Matrix.Translation(Vector(loc))
    bpy.context.view_layer.update()
    return obj

bike = empty('Bicycle')
bike['forward_axis'] = '+X (Blender), +X (glTF)'
bike['units'] = 'metres'
bike['wheel_radius_m'] = .365

def finish(obj, name, mat, parent=bike):
    obj.name = name
    if mat: obj.data.materials.append(mat)
    if parent:
        bpy.context.view_layer.update()
        matrix = obj.matrix_world.copy()
        obj.parent = parent
        obj.matrix_world = matrix
    if obj.type == 'MESH':
        for poly in obj.data.polygons: poly.use_smooth = True
    return obj

def rod(name, a, b, radius, mat, parent=bike, vertices=10):
    a,b = Vector(a), Vector(b)
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=(b-a).length, location=(a+b)/2)
    obj=bpy.context.object
    obj.rotation_euler=(b-a).to_track_quat('Z','Y').to_euler()
    return finish(obj,name,mat,parent)

def path(name, points, radius, mat, parent=bike, cyclic=False):
    cu=bpy.data.curves.new(name,'CURVE')
    cu.dimensions='3D'
    cu.resolution_u=12
    cu.bevel_depth=radius
    cu.bevel_resolution=2
    s=cu.splines.new('POLY')
    s.points.add(len(points)-1)
    for p,co in zip(s.points,points): p.co=(*co,1)
    s.use_cyclic_u=cyclic
    obj=bpy.data.objects.new(name,cu)
    scene.collection.objects.link(obj)
    return finish(obj,name,mat,parent)

def bezier(name, points, radius, mat, parent=bike):
    cu=bpy.data.curves.new(name,'CURVE'); cu.dimensions='3D'
    cu.resolution_u=10; cu.bevel_depth=radius; cu.bevel_resolution=2
    s=cu.splines.new('BEZIER'); s.bezier_points.add(len(points)-1)
    for p,co in zip(s.bezier_points,points):
        p.co=co; p.handle_left_type='AUTO'; p.handle_right_type='AUTO'
    obj=bpy.data.objects.new(name,cu); scene.collection.objects.link(obj)
    return finish(obj,name,mat,parent)

def box(name, loc, scale, mat, bevel=.01, parent=bike):
    bpy.ops.mesh.primitive_cube_add(size=1,location=loc)
    obj=bpy.context.object; obj.scale=scale
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    if bevel:
        mod=obj.modifiers.new('Soft edges','BEVEL'); mod.width=bevel; mod.segments=3
        bpy.context.view_layer.objects.active=obj
        bpy.ops.object.modifier_apply(modifier=mod.name)
    return finish(obj,name,mat,parent)

def torus(name, center, major, minor, mat, parent=bike, segments=64):
    bpy.ops.mesh.primitive_torus_add(major_segments=segments,minor_segments=8,location=center,major_radius=major,minor_radius=minor,rotation=(math.pi/2,0,0))
    return finish(bpy.context.object,name,mat,parent)

rear=(-.58,0,.365); front=(.61,0,.365)
steer=empty('Steering',(.405,0,.91),bike)
wheel_r=empty('Wheel_Rear',rear,bike)
wheel_f=empty('Wheel_Front',front,steer)
# Parenting empties preserves world transforms.
wheel_f.matrix_world.translation=Vector(front)

for label,center,pivot in [('Rear',rear,wheel_r),('Front',front,wheel_f)]:
    x,_,z=center
    torus(label+' · tyre',center,.335,.030,rubber,pivot)
    for side in (-1,1):
        torus(label+' · cream sidewall',(x,side*.022,z),.335,.017,cream,pivot)
        torus(label+' · rim',(x,side*.014,z),.306,.010,alloy,pivot)
    rod(label+' · hub',(x,-.055,z),(x,.055,z),.023,alloy,pivot,16)
    for i in range(24):
        t=math.tau*i/24
        # Alternating flange and tangential lacing.
        side=.033 if i%2 else -.033
        rod(label+' · spoke %02d'%i,(x+.023*math.cos(t+.7),side,z+.023*math.sin(t+.7)),
            (x+.302*math.cos(t),0,z+.302*math.sin(t)),.0018,alloy,pivot,6)
    rod(label+' · valve',(x,0,z+.285),(x,0,z+.309),.004,brass,pivot,8)

bb=(-.10,0,.385); seat=(-.275,0,.87); head_top=(.37,0,.96); head_low=(.43,0,.77)
rod('Frame · seat tube',bb,seat,.023,sage)
bezier('Frame · curved step-through', [seat,(-.11,0,.70),(.18,0,.70),head_top],.024,sage)
bezier('Frame · down tube',[bb,(.11,0,.43),(.31,0,.61),head_low],.028,sage)
rod('Frame · head tube',head_low,head_top,.030,sage)
for s in (-1,1):
    rod('Chain stay',(-.10,s*.035,.385),(-.58,s*.052,.365),.013,sage)
    rod('Seat stay',(-.275,s*.017,.85),(-.58,s*.052,.365),.010,sage)
    bezier('Fork',[(.42,s*.034,.80),(.48,s*.048,.56),(.61,s*.052,.365)],.016,sage,steer)
    rod('Axle cap',(.61,s*.05,.365),(.61,s*.066,.365),.018,brass,wheel_f)
rod('Seat post',(-.275,0,.85),(-.30,0,1.015),.015,alloy)
rod('Saddle rails',(-.39,0,.99),(-.18,0,.99),.008,dark)

# A shaped saddle, broad at the back and tapering towards the nose.
outline=[(-.445,-.073),(-.405,-.105),(-.31,-.096),(-.235,-.045),(-.145,-.027),(-.13,0),(-.145,.027),(-.235,.045),(-.31,.096),(-.405,.105),(-.445,.073)]
verts=[(x,y,z) for z in (1.005,1.045) for x,y in outline]
n=len(outline); faces=[tuple(range(n-1,-1,-1)),tuple(range(n,2*n))]
faces += [(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)]
mesh=bpy.data.meshes.new('Shaped saddle');mesh.from_pydata(verts,[],faces);mesh.update()
obj=bpy.data.objects.new('Saddle · cognac',mesh);scene.collection.objects.link(obj)
finish(obj,obj.name,leather)
mod=obj.modifiers.new('Soft leather edge','BEVEL');mod.width=.018;mod.segments=3
bpy.context.view_layer.objects.active=obj;bpy.ops.object.modifier_apply(modifier=mod.name)
path('Saddle piping',[(x,y,1.032) for x,y in outline],.002,seam,cyclic=True)

rod('Stem',(.37,0,.95),(.335,0,1.105),.014,alloy,steer)
bezier('Swept city handlebar',[(.285,-.285,1.10),(.39,-.19,1.14),(.40,0,1.13),(.39,.19,1.14),(.285,.285,1.10)],.012,alloy,steer)
for s in (-1,1):
    rod('Leather grip',(.285,s*.285,1.10),(.345,s*.23,1.124),.021,leather,steer,16)
    rod('Grip end',(.282,s*.289,1.099),(.291,s*.280,1.103),.022,brass,steer,16)
    rod('Brake lever',(.36,s*.21,1.12),(.30,s*.25,1.067),.005,alloy,steer)
    bezier('Brake cable',[(.36,s*.19,1.10),(.51,s*.16,.99),(.43,s*.07,.78)],.0024,dark,steer)
# Bell on the handlebar.
bpy.ops.mesh.primitive_uv_sphere_add(segments=16,ring_count=8,radius=1,location=(.405,-.13,1.155))
obj=bpy.context.object;obj.scale=(.026,.026,.014);finish(obj,'Brass bell',brass,steer)

# Fender arcs follow each wheel, with slender supporting stays.
for label,(x,_,z),parent in [('Rear',rear,bike),('Front',front,steer)]:
    arc=[(x+.385*math.cos(t),0,z+.385*math.sin(t)) for t in [math.radians(12+i*156/40) for i in range(41)]]
    # Mesh strip instead of a round tube keeps the fenders lightweight.
    vs=[(a,y,c) for a,_,c in arc for y in (-.035,.035)]
    fs=[(2*i,2*i+1,2*i+3,2*i+2) for i in range(40)]
    me=bpy.data.meshes.new(label+' fender');me.from_pydata(vs,[],fs);me.update()
    ob=bpy.data.objects.new(label+' · sage fender',me);scene.collection.objects.link(ob)
    finish(ob,ob.name,sage,parent)
    for side in (-1,1):
        for direction in (-1,1):
            t=math.radians(35 if direction==1 else 145)
            rod('Fender stay',(x,side*.055,z),(x+.38*math.cos(t),side*.03,z+.38*math.sin(t)),.0035,alloy,parent,6)

# Rear carrier.
for s in (-1,1):
    rod('Carrier support',(-.58,s*.055,.365),(-.76,s*.095,.83),.005,alloy)
    rod('Carrier front support',(-.27,s*.025,.85),(-.39,s*.095,.83),.005,alloy)
path('Rear carrier edge',[(-.86,-.10,.83),(-.86,.10,.83),(-.36,.10,.83),(-.36,-.10,.83)],.008,alloy,cyclic=True)
for i in range(5): rod('Carrier crossbar',(-.80+i*.09,-.10,.83),(-.80+i*.09,.10,.83),.005,alloy)
box('Rear reflector',(-.875,0,.82),(.016,.070,.038),red,.008)

# Drive assembly: independent crank and pedals for animation.
crank=empty('Crank',bb,bike)
rod('Bottom bracket',(-.1,-.065,.385),(-.1,.065,.385),.034,dark)
torus('Chainring',(-.10,-.074,.385),.086,.008,alloy,crank,40)
rod('Chainring axle',(-.10,-.083,.385),(-.10,-.065,.385),.028,brass,crank,16)
for i in range(5):
    t=math.tau*i/5
    rod('Chainring spider',(-.1,-.074,.385),(-.1+.079*math.cos(t),-.074,.385+.079*math.sin(t)),.005,alloy,crank,6)
torus('Rear sprocket',(-.58,-.074,.365),.040,.006,dark,wheel_r,24)
bezier('Chain upper',[(-.58,-.074,.405),(-.32,-.074,.443),(-.10,-.074,.471)],.004,dark)
bezier('Chain lower',[(-.58,-.074,.325),(-.32,-.074,.301),(-.10,-.074,.299)],.004,dark)
for s in (-1,1):
    end=(-.10+s*.055,s*.105,.385+s*.14)
    rod('Crank arm',(-.10,s*.095,.385),end,.011,alloy,crank)
    ped=empty('Pedal_Left' if s==-1 else 'Pedal_Right',end,crank)
    ped.matrix_world.translation=Vector(end)
    rod('Pedal spindle',end,(end[0],s*.19,end[2]),.008,dark,ped)
    box('Pedal platform',(end[0],s*.16,end[2]),(.085,.085,.025),dark,.007,ped)
    box('Amber pedal reflector',(end[0]+.044,s*.16,end[2]),(.005,.054,.013),brass,.002,ped)

# Front basket: tapered open wicker structure, no opaque box hiding the frame.
basket_bottom=.875; basket_top=1.12
def rect_ring(z,width,depth):
    cx=.72
    return [(cx-depth/2,-width/2,z),(cx+depth/2,-width/2,z),(cx+depth/2,width/2,z),(cx-depth/2,width/2,z)]
for i in range(10):
    f=i/9; z=basket_bottom+(basket_top-basket_bottom)*f
    path('Basket · horizontal weave',rect_ring(z,.235+.075*f,.22+.07*f),.0048,wicker,steer,True)
path('Basket · rolled rim',rect_ring(basket_top,.31,.29),.009,wicker,steer,True)
for edge in range(4):
    lo=rect_ring(basket_bottom,.235,.22); hi=rect_ring(basket_top,.31,.29)
    for j in range(9):
        f=j/8; a=Vector(lo[edge]).lerp(Vector(lo[(edge+1)%4]),f);b=Vector(hi[edge]).lerp(Vector(hi[(edge+1)%4]),f)
        rod('Basket · vertical weave',a,b,.0032,wicker,steer,6)
for i in range(9):
    y=-.115+i*.028
    rod('Basket base',(.61,y,basket_bottom),(.83,y,basket_bottom),.004,wicker,steer,6)
for s in (-1,1):
    rod('Basket bracket',(.61,s*.05,.365),(.73,s*.09,.875),.005,alloy,steer)
rod('Basket mount',(.40,0,.91),(.61,0,.89),.009,alloy,steer)
rod('Headlamp casing',(.755,0,.80),(.815,0,.80),.031,brass,steer,24)
rod('Headlamp lens',(.815,0,.80),(.82,0,.80),.026,glass,steer,24)

# Small cream enamel badge on each side of the head tube.
for s in (-1,1):
    box('Ivory frame badge',(.405,s*.030,.865),(.032,.004,.065),cream,.007)

# Convert curves and combine static parts by material, while retaining mechanical pivots.
bpy.ops.object.select_all(action='DESELECT')
for obj in list(bike.children_recursive):
    if obj.type=='CURVE':
        obj.select_set(True);bpy.context.view_layer.objects.active=obj
        bpy.ops.object.convert(target='MESH');obj.select_set(False)
parents=[bike,steer,wheel_r,wheel_f,crank]+[o for o in bike.children_recursive if o.name.startswith('Pedal_')]
for parent in parents:
    groups={}
    for obj in list(parent.children):
        if obj.type=='MESH': groups.setdefault(obj.data.materials[0].name,[]).append(obj)
    for mat_name,objects in groups.items():
        bpy.ops.object.select_all(action='DESELECT')
        for obj in objects: obj.select_set(True)
        bpy.context.view_layer.objects.active=objects[0]
        if len(objects)>1: bpy.ops.object.join()
        bpy.context.object.name=parent.name+'__'+mat_name.split(' · ')[0]

bpy.ops.object.select_all(action='DESELECT')
for obj in [bike]+list(bike.children_recursive): obj.select_set(True)
# Default exporter values are queried instead of assuming enum identifiers.
gltf=bpy.ops.export_scene.gltf.get_rna_type()
from io_scene_gltf2 import get_format_items
formats=[i[0] for i in get_format_items(scene,bpy.context)]
bpy.ops.export_scene.gltf(filepath=str(OUT/'meadow-bicycle.glb'),export_format=next(i for i in formats if i=='GLB'),use_selection=True,export_apply=True)

# A separate presentation set remains out of the exported GLB.
floor=material('Studio · warm limestone',(.72,.70,.62),0,.85)
bpy.ops.mesh.primitive_plane_add(size=200,location=(0,0,-.008))
finish(bpy.context.object,'Studio floor',floor,None)
world=scene.world or bpy.data.worlds.new('Soft daylight')
scene.world=world;world.use_nodes=True
bg=next(n for n in world.node_tree.nodes if n.type=='BACKGROUND')
bg.inputs['Color'].default_value=(.78,.83,.78,1);bg.inputs['Strength'].default_value=.45
def area(name,loc,power,size):
    bpy.ops.object.light_add(type='AREA',location=loc)
    ob=bpy.context.object;ob.name=name;ob.data.energy=power;ob.data.shape='DISK';ob.data.size=size
    ob.rotation_euler=(Vector((0,0,.6))-ob.location).to_track_quat('-Z','Y').to_euler()
area('Large window',(-2,-3,5),450,4)
area('Soft rim',(2,2,3),320,3)
area('Front fill',(3,-1,2),100,2)
bpy.ops.object.camera_add(location=(2.65,-4.9,2.25))
cam=bpy.context.object;cam.name='Bicycle · hero camera'
cam.rotation_euler=(Vector((0,0,.60))-cam.location).to_track_quat('-Z','Y').to_euler()
cam.data.type='ORTHO';cam.data.ortho_scale=2.75;scene.camera=cam
scene.render.engine='CYCLES'
scene.cycles.device='CPU';scene.cycles.samples=40;scene.cycles.use_denoising=True
scene.render.resolution_x=1440;scene.render.resolution_y=1080;scene.render.resolution_percentage=100
image_formats=[i.identifier for i in scene.render.image_settings.bl_rna.properties['file_format'].enum_items]
scene.render.image_settings.file_format=next(i for i in image_formats if i=='PNG')
scene.render.filepath=str(PREVIEW/'meadow-bicycle.png')
scene.view_settings.view_transform='AgX'
# Open the .blend at the composed material view.
for screen in bpy.data.screens:
    for a in screen.areas:
        if a.type=='VIEW_3D':
            a.spaces.active.region_3d.view_perspective='CAMERA'
            a.spaces.active.shading.type='MATERIAL'
bpy.ops.object.select_all(action='DESELECT')
bike.select_set(True);bpy.context.view_layer.objects.active=bike
scene['asset_notes']='Meadow city bicycle. +X forward; wheel local Y axes in Blender / Z in glTF. Steering local Z in Blender / Y in glTF. Presentation set is excluded from GLB.'
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'meadow-bicycle.blend'))
triangles=sum(sum(len(p.vertices)-2 for p in o.data.polygons) for o in bike.children_recursive if o.type=='MESH')
print('ASSET_REPORT '+json.dumps({'triangles':triangles,'mesh_objects':sum(o.type=='MESH' for o in bike.children_recursive),'glb_bytes':(OUT/'meadow-bicycle.glb').stat().st_size}))
bpy.ops.render.render(write_still=True)
print('BICYCLE_COMPLETE')
