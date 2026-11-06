"""Sculpt a continuous grip/forearm in Blender; export an editable asset and game mesh.

Reference studies live in assets/rider/references. Coordinates in modelling helpers
match the game's hand frame: X toward knuckles, Y up, Z along the grip.
"""
import bpy
import bmesh
import json
import math
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'assets/rider'
OUT.mkdir(parents=True, exist_ok=True)
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)

def coord(p):
    return Vector((p[0], -p[2], p[1]))

def sphere(name, p, size):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=24, ring_count=16, location=coord(p))
    obj = bpy.context.object
    obj.name = name
    obj.scale = (size[0], size[2], size[1])
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    return obj

def loft(name, sections):
    # Elliptical transverse sections, with closed ends for voxel fusion.
    verts, faces, n = [], [], 24
    for x, y, z, width, depth in sections:
        for j in range(n):
            t = j / n * math.tau
            verts.append(coord((x, y + math.sin(t)*depth, z + math.cos(t)*width)))
    for i in range(len(sections)-1):
        for j in range(n):
            a, b = i*n+j, i*n+(j+1)%n
            faces.append((a, a+n, b+n, b))
    faces.extend([tuple(reversed(range(n))), tuple((len(sections)-1)*n+j for j in range(n))])
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(verts, [], faces)
    mesh.update()
    ob = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(ob)
    return ob

def tube(name, points, radius):
    curve = bpy.data.curves.new(name, 'CURVE')
    curve.dimensions = '3D'
    curve.resolution_u = 10
    curve.bevel_depth = radius
    curve.bevel_resolution = 4
    curve.use_fill_caps = True
    spl = curve.splines.new('BEZIER')
    spl.bezier_points.add(len(points)-1)
    for b, p in zip(spl.bezier_points, points):
        b.co = coord(p)
        b.handle_left_type = b.handle_right_type = 'AUTO'
    ob = bpy.data.objects.new(name, curve)
    bpy.context.collection.objects.link(ob)
    bpy.context.view_layer.objects.active = ob
    ob.select_set(True)
    bpy.ops.object.convert(target='MESH')
    ob.select_set(False)
    sphere(name+' tip', points[-1], (radius, radius, radius))

# The entire dorsal surface runs into the forearm, with no separate wrist ball.
loft('Forearm wrist and palm', [
    (-.335,-.025,.361,.022,.020),
    (-.29,-.017,.303,.025,.022),
    (-.235,-.006,.232,.026,.022),
    (-.18,.004,.164,.024,.020),
    (-.125,.013,.105,.021,.016),
    (-.095,.017,.076,.0195,.015),
    (-.075,.020,.044,.021,.015),
    (-.055,.023,.020,.025,.015),
    (-.034,.025,.006,.030,.014),
    (-.014,.026,.000,.032,.014),
    (.001,.022,.000,.029,.011),
])
# Four distinct fingers share their roots with the dorsal surface. Their length,
# knuckle height and curl are subtly staggered rather than identical hoops.
for i, (z, radius, height, tipx) in enumerate([
    (-.024,.0074,.034,.000),(-.008,.0078,.037,-.003),
    (.008,.0074,.035,-.002),(.024,.0064,.030,.004)
]):
    tube('Finger %d' % i, [(-.027,height-.004,z),(-.009,height,z),
         (.010,height-.003,z),(.026,.017,z),(.028,-.002,z),
         (.016,-.020,z),(tipx,-.022,z)],radius)
# Thenar mound, thumb root and web meet the palm before the opposing thumb bends
# under the grip. Fusion removes the intersections, keeping a soft web contour.
sphere('Thenar volume',(-.042,.007,-.012),(.021,.013,.013))
sphere('Thumb web',(-.025,.010,-.020),(.014,.009,.009))
tube('Opposing thumb',[(-.045,.006,-.015),(-.032,-.004,-.024),
     (-.013,-.017,-.029),(.006,-.022,-.026),(.016,-.019,-.020)],.0075)

bpy.ops.object.select_all(action='SELECT')
bpy.context.view_layer.objects.active = next(o for o in bpy.context.scene.objects if o.type == 'MESH')
bpy.ops.object.join()
hand = bpy.context.object
hand.name = 'Continuous hand and forearm'
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
# Voxel fusion is applied, not left as an overlapping collection of primitives.
remesh = hand.modifiers.new('Fuse skin surface', 'REMESH')
remesh.mode = 'VOXEL'
remesh.voxel_size = .00085
remesh.use_smooth_shade = True
bpy.ops.object.modifier_apply(modifier=remesh.name)
smooth = hand.modifiers.new('Soften skin transitions', 'SMOOTH')
smooth.factor = .65
smooth.iterations = 7
bpy.ops.object.modifier_apply(modifier=smooth.name)
decimate = hand.modifiers.new('Game surface density', 'DECIMATE')
decimate.ratio = .045
bpy.ops.object.modifier_apply(modifier=decimate.name)
for p in hand.data.polygons:
    p.use_smooth = True

mat = bpy.data.materials.new('Warm soft skin')
mat.diffuse_color = (.72,.47,.29,1)
mat.use_nodes = True
bsdf = mat.node_tree.nodes.get('Principled BSDF')
bsdf.inputs['Base Color'].default_value = (.72,.47,.29,1)
bsdf.inputs['Roughness'].default_value = .9
hand.data.materials.append(mat)

bm = bmesh.new()
bm.from_mesh(hand.data)
unvisited = set(bm.verts)
components = []
while unvisited:
    stack = [unvisited.pop()]
    count = 0
    while stack:
        vertex = stack.pop(); count += 1
        for edge in vertex.link_edges:
            other = edge.other_vert(vertex)
            if other in unvisited:
                unvisited.remove(other); stack.append(other)
    components.append(count)
nonmanifold = sum(not e.is_manifold for e in bm.edges)
bm.free()
assert len(components) == 1, f'Disconnected skin: {components}'
assert nonmanifold == 0, f'Open skin edges: {nonmanifold}'

hand.data.calc_loop_triangles()
positions = [round(c,7) for v in hand.data.vertices for c in (v.co.x,v.co.z,-v.co.y)]
normals = [round(c,7) for v in hand.data.vertices for c in (v.normal.x,v.normal.z,-v.normal.y)]
indices = [i for t in hand.data.loop_triangles for i in t.vertices]
data = dict(positions=positions,normals=normals,indices=indices,
            wrist=[-.095,.017,.076],elbow=[-.335,-.025,.361],
            report=dict(vertices=len(hand.data.vertices),triangles=len(indices)//3,
                        connected_components=len(components),nonmanifold_edges=nonmanifold))
(OUT/'hand-mesh.js').write_text('// Generated by Blender: scripts/build_rider_hands.py\nexport default '+json.dumps(data,separators=(',',':'))+';\n')
(OUT/'mesh-report.json').write_text(json.dumps(data['report'],indent=2))
hand['notes'] = 'One closed connected skin mesh. References: grip-first-person.png and grip-thumb-side.png. Browser deforms the forearm while preserving grip contact.'
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'meadow-hands.blend'))
bpy.ops.export_scene.gltf(filepath=str(OUT/'meadow-hands.glb'),export_format='GLB',use_selection=True)
print('HAND_ASSET_REPORT '+json.dumps(data['report']))
