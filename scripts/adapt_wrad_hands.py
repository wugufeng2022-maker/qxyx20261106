"""Pose the CC0 WRAD hand on the Meadow grip; retain source rig in the .blend."""
import bpy, bmesh, json
from pathlib import Path
from mathutils import Matrix, Vector

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'assets/rider'
bpy.ops.wm.open_mainfile(filepath=str(OUT/'vendor/wrad-arms/arms.blend'),use_scripts=False)
rig=bpy.data.objects['arms']; source=bpy.data.objects['arms_mesh']
rig.animation_data_clear();source.animation_data_clear()
for pb in rig.pose.bones:
    for c in list(pb.constraints): pb.constraints.remove(c)
    pb.matrix_basis=Matrix.Identity(4)
w=rig.data.bones['wrist.r'].head_local.copy()
x=(rig.data.bones['finger_middle1.r'].head_local-w).normalized()
z=rig.data.bones['finger_pinky1.r'].head_local-rig.data.bones['finger_index1.r'].head_local
z=(z-x*z.dot(x)).normalized();y=z.cross(x).normalized()
R=Matrix((x,y,z));scale=.060/(rig.data.bones['finger_pinky1.r'].head_local-rig.data.bones['finger_index1.r'].head_local).length
offset=Vector((-.085,.018,-.009))
def local(p): return R@(p-w)*scale+offset
def pose_bone(name,start,end):
    bone=rig.data.bones[name];pb=rig.pose.bones[name]
    rotation=R@bone.matrix_local.to_3x3()
    direction=(end-start).normalized()
    rotation=rotation.col[1].rotation_difference(direction).to_matrix()@rotation
    stretch=(end-start).length/(bone.length*scale)
    M=(R.transposed()@rotation@Matrix.Diagonal((1,stretch,1))).to_4x4()
    M.translation=w+R.transposed()@((start-offset)/scale)
    pb.matrix=M
    bpy.context.view_layer.update()

for finger in ['pinky','ring','middle','index']:
    name=f'finger_{finger}1.r';p=local(rig.data.bones[name].head_local)
    small=finger=='pinky'
    points=[p,Vector((.020 if small else .030,.017,p.z)),
            Vector((.018 if small else .020,-.015,p.z)),Vector((-.004,-.026,p.z))]
    for j in range(3): pose_bone(f'finger_{finger}{j+1}.r',points[j],points[j+1])
p=local(rig.data.bones['finger_thumb1.r'].head_local)
thumb=[p,Vector((-.036,-.011,-.037)),Vector((-.011,-.027,-.028)),Vector((.011,-.021,-.018))]
for j in range(3): pose_bone(f'finger_thumb{j+1}.r',thumb[j],thumb[j+1])

bpy.context.view_layer.update()
deps=bpy.context.evaluated_depsgraph_get();evaluated=source.evaluated_get(deps)
mesh=bpy.data.meshes.new_from_object(evaluated,depsgraph=deps)
ob=bpy.data.objects.new('Meadow grip - WRAD CC0',mesh);bpy.context.collection.objects.link(ob)
# Discard the left arm before converting to a canonical right-hand grip frame.
bm=bmesh.new();bm.from_mesh(mesh)
bmesh.ops.delete(bm,geom=[v for v in bm.verts if v.co.x<0],context='VERTS')
for v in bm.verts:v.co=local(v.co)
bmesh.ops.bisect_plane(bm,geom=list(bm.verts)+list(bm.edges)+list(bm.faces),dist=.000001,
    plane_co=Vector((-.345,0,0)),plane_no=Vector((1,0,0)),clear_inner=True)
boundary=[e for e in bm.edges if e.is_boundary]
if boundary:bmesh.ops.holes_fill(bm,edges=boundary,sides=0)
bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces))
bm.to_mesh(mesh);bm.free()
bpy.ops.object.select_all(action='DESELECT');ob.select_set(True);bpy.context.view_layer.objects.active=ob
# Subdivision rounds the donor's retro edges without replacing its anatomy.
sub=ob.modifiers.new('Soft game silhouette','SUBSURF');sub.levels=2
bpy.ops.object.modifier_apply(modifier=sub.name)
forearm_end=local(rig.data.bones['forearm.r'].head_local)
for v in ob.data.vertices:
    t=max(0,min(1,(-v.co.x-.10)/.09))
    slim=1-.32*t*t*(3-2*t)
    along=(v.co.x-offset.x)/(forearm_end.x-offset.x)
    center=offset.lerp(forearm_end,along)
    v.co.y=center.y+(v.co.y-center.y)*slim
    v.co.z=center.z+(v.co.z-center.z)*slim
    v.co.z+=max(0,-v.co.x-.025)*1.05
for p in ob.data.polygons:p.use_smooth=True
ob.data.materials.clear()
mat=bpy.data.materials.new('Meadow warm skin');mat.diffuse_color=(.72,.47,.29,1);ob.data.materials.append(mat)
ob.data.update();ob.data.calc_loop_triangles()
positions=[round(c,7) for v in ob.data.vertices for c in v.co]
normals=[round(c,7) for v in ob.data.vertices for c in v.normal]
indices=[i for t in ob.data.loop_triangles for i in t.vertices]
elbow=local(rig.data.bones['forearm.r'].head_local)
# Cut end's center on the original forearm axis, then apply the same sweep.
wrist=offset.copy();t=(-.345-wrist.x)/(elbow.x-wrist.x)
elbow=wrist.lerp(elbow,t);elbow.z+=(-elbow.x-.025)*1.05
wrist.z+=(-wrist.x-.025)*1.05
data=dict(positions=positions,normals=normals,indices=indices,wrist=list(wrist),elbow=list(elbow),
    report=dict(vertices=len(positions)//3,triangles=len(indices)//3,source='WRAD ARMS by wriks',license='CC0-1.0'))
(OUT/'hand-mesh.js').write_text('// Adapted from CC0 WRAD ARMS by wriks in Blender. See vendor/wrad-arms/LICENSE.\nexport default '+json.dumps(data,separators=(',',':'))+';\n')
(OUT/'mesh-report.json').write_text(json.dumps(data['report'],indent=2))
# Keep the posed donor rig for future finger edits, hidden from the game export.
rig.hide_render=True;source.hide_render=True;rig.hide_set(True);source.hide_set(True)
ob['source']='https://github.com/wwwriks/wrad-arms';ob['license']='CC0-1.0'
ob['adaptation']='Right hand posed on bicycle grip; cropped at forearm, subdivided and gently swept for neutral wrist alignment.'
# Blender Z-up for portable GLB and editing. The generated JS is already Y-up.
for v in ob.data.vertices:v.co=Vector((v.co.x,-v.co.z,v.co.y))
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'meadow-hands.blend'))
bpy.ops.export_scene.gltf(filepath=str(OUT/'meadow-hands.glb'),export_format='GLB',use_selection=True)
print('WRAD_ADAPTATION '+json.dumps(data['report']))
