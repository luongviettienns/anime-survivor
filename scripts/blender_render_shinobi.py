"""Build & render the 3D Naruto Shippuden (Option 2) model & animations in Blender headless mode."""
import math
import os
import bpy


def setup_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene

    cam_data = bpy.data.cameras.new("OrthoCam")
    cam_data.type = 'ORTHO'
    cam_data.ortho_scale = 2.7
    cam_obj = bpy.data.objects.new("OrthoCam", cam_data)
    bpy.context.collection.objects.link(cam_obj)
    cam_obj.location = (0, -4.0, 0.75)
    cam_obj.rotation_euler = (math.radians(90), 0, 0)
    scene.camera = cam_obj

    sun_data = bpy.data.lights.new("Sun", type='SUN')
    sun_data.energy = 4.2
    sun_obj = bpy.data.objects.new("Sun", object_data=sun_data)
    bpy.context.collection.objects.link(sun_obj)
    sun_obj.rotation_euler = (math.radians(50), math.radians(-25), math.radians(20))

    fill_data = bpy.data.lights.new("Fill", type='SUN')
    fill_data.energy = 1.6
    fill_obj = bpy.data.objects.new("Fill", object_data=fill_data)
    bpy.context.collection.objects.link(fill_obj)
    fill_obj.rotation_euler = (math.radians(30), math.radians(60), 0)

    scene.render.resolution_x = 32
    scene.render.resolution_y = 32
    scene.render.filter_size = 0.0
    scene.render.film_transparent = True
    scene.render.image_settings.file_format = 'PNG'
    scene.render.image_settings.color_mode = 'RGBA'


def create_mat(name, color):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    nodes.clear()
    out = nodes.new('ShaderNodeOutputMaterial')
    bsdf = nodes.new('ShaderNodeBsdfPrincipled')
    bsdf.inputs['Base Color'].default_value = color
    bsdf.inputs['Roughness'].default_value = 0.85
    mat.node_tree.links.new(bsdf.outputs['BSDF'], out.inputs['Surface'])
    return mat


def build_naruto_shippuden():
    m_skin = create_mat("Skin", (1.0, 0.85, 0.71, 1.0))
    m_hair = create_mat("Hair", (1.0, 0.81, 0.0, 1.0))
    m_orange = create_mat("ShippudenOrange", (0.98, 0.39, 0.01, 1.0))
    m_black = create_mat("ShippudenBlack", (0.12, 0.14, 0.22, 1.0))
    m_metal = create_mat("SilverPlate", (0.82, 0.86, 0.91, 1.0))
    m_eye = create_mat("UzumakiBlue", (0.0, 0.60, 1.0, 1.0))
    m_white = create_mat("BandageWhite", (0.98, 0.98, 1.0, 1.0))
    m_red = create_mat("UzumakiCrestRed", (0.94, 0.27, 0.27, 1.0))

    root = bpy.data.objects.new("NarutoShippudenRoot", None)
    bpy.context.collection.objects.link(root)
    root.location = (0, 0, 0)

    # Torso (Orange lower jacket)
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, 0, 0.62))
    torso = bpy.context.active_object
    torso.name = "Torso"
    torso.scale = (0.46, 0.32, 0.40)
    torso.parent = root
    torso.data.materials.append(m_orange)

    # Shippuden Black Upper Chest & Shoulder Yoke + High Collar
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, 0, 0.42))
    yoke = bpy.context.active_object
    yoke.name = "BlackYoke"
    yoke.scale = (1.04, 1.04, 0.48)
    yoke.parent = torso
    yoke.data.materials.append(m_black)

    # Red Uzumaki Swirl Crest on Back
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, 0.52, 0.20))
    crest = bpy.context.active_object
    crest.scale = (0.36, 0.08, 0.36)
    crest.parent = torso
    crest.data.materials.append(m_red)

    # Head
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, 0, 1.15))
    head = bpy.context.active_object
    head.name = "Head"
    head.scale = (0.56, 0.48, 0.46)
    head.parent = root
    head.data.materials.append(m_skin)

    # Jet-Black Shippuden Headband + Flowing Cloth Tails
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, 0, 0.24))
    headband = bpy.context.active_object
    headband.scale = (1.05, 1.05, 0.32)
    headband.parent = head
    headband.data.materials.append(m_black)

    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(-0.72, 0.20, 0.16))
    tail = bpy.context.active_object
    tail.name = "HeadbandTail"
    tail.scale = (0.45, 0.16, 0.24)
    tail.parent = head
    tail.data.materials.append(m_black)

    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, -0.54, 0.24))
    plate = bpy.context.active_object
    plate.scale = (0.62, 0.08, 0.24)
    plate.parent = head
    plate.data.materials.append(m_metal)

    for side in (-0.26, 0.26):
        bpy.ops.mesh.primitive_cube_add(size=1.0, location=(side, -0.52, -0.02))
        eye = bpy.context.active_object
        eye.scale = (0.14, 0.06, 0.18)
        eye.parent = head
        eye.data.materials.append(m_eye)

    # Spiky Golden Blonde Hair Crown
    spikes = [
        (0.0, 0.05, 0.72, 0, 0, 0, 0.46),
        (-0.36, 0.05, 0.68, 0, -0.35, 0, 0.42),
        (0.36, 0.05, 0.68, 0, 0.35, 0, 0.42),
        (-0.56, 0.05, 0.42, 0, -0.65, 0, 0.36),
        (0.56, 0.05, 0.42, 0, 0.65, 0, 0.36),
    ]
    for (x, y, z, rx, ry, rz, s) in spikes:
        bpy.ops.mesh.primitive_cone_add(vertices=4, radius1=s, depth=s * 1.7, location=(x, y, z))
        spike = bpy.context.active_object
        spike.rotation_euler = (rx, ry, rz)
        spike.parent = head
        spike.data.materials.append(m_hair)

    left_leg = create_leg("Leg_L", -0.15, root, m_orange, m_white, m_black, has_holster=False)
    right_leg = create_leg("Leg_R", 0.15, root, m_orange, m_white, m_black, has_holster=True)
    left_arm = create_arm("Arm_L", -0.32, root, m_black, m_orange, m_skin)
    right_arm = create_arm("Arm_R", 0.32, root, m_black, m_orange, m_skin)

    return {
        "root": root, "torso": torso, "head": head, "tail": tail,
        "leg_l": left_leg, "leg_r": right_leg,
        "arm_l": left_arm, "arm_r": right_arm,
    }


def create_leg(name, x, parent, m_orange, m_white, m_black, has_holster=False):
    pivot = bpy.data.objects.new(name + "_Pivot", None)
    bpy.context.collection.objects.link(pivot)
    pivot.location = (x, 0, 0.44)
    pivot.parent = parent

    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, 0, -0.12))
    thigh = bpy.context.active_object
    thigh.scale = (0.16, 0.18, 0.22)
    thigh.parent = pivot
    thigh.data.materials.append(m_white if has_holster else m_orange)

    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, 0, -0.28))
    shin = bpy.context.active_object
    shin.scale = (0.14, 0.16, 0.16)
    shin.parent = pivot
    shin.data.materials.append(m_white)

    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, -0.04, -0.39))
    sandal = bpy.context.active_object
    sandal.scale = (0.15, 0.22, 0.09)
    sandal.parent = pivot
    sandal.data.materials.append(m_black)
    return pivot


def create_arm(name, x, parent, m_black, m_orange, m_skin):
    pivot = bpy.data.objects.new(name + "_Pivot", None)
    bpy.context.collection.objects.link(pivot)
    pivot.location = (x, 0, 0.78)
    pivot.parent = parent

    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, 0, -0.08))
    upper = bpy.context.active_object
    upper.scale = (0.14, 0.14, 0.12)
    upper.parent = pivot
    upper.data.materials.append(m_black)

    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, 0, -0.20))
    forearm = bpy.context.active_object
    forearm.scale = (0.13, 0.13, 0.14)
    forearm.parent = pivot
    forearm.data.materials.append(m_orange)

    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, 0, -0.32))
    hand = bpy.context.active_object
    hand.scale = (0.11, 0.11, 0.10)
    hand.parent = pivot
    hand.data.materials.append(m_skin)
    return pivot


def render_animation(rig, frames_dir, is_walk=False):
    os.makedirs(frames_dir, exist_ok=True)
    scene = bpy.context.scene
    for f in range(4):
        if not is_walk:
            bob = [0.0, 0.02, -0.02, 0.01][f]
            rig["root"].rotation_euler = (0, 0, 0)
            rig["torso"].location = (0, 0, 0.62 + bob)
            rig["head"].location = (0, 0, 1.15 + bob)
            rig["tail"].rotation_euler = (0, 0, math.radians([0, 12, -10, 6][f]))
            rig["arm_l"].rotation_euler = (0, math.radians([4, 8, 4, 2][f]), 0)
            rig["arm_r"].rotation_euler = (0, math.radians([-4, -8, -4, -2][f]), 0)
            rig["leg_l"].rotation_euler = (0, 0, 0)
            rig["leg_r"].rotation_euler = (0, 0, 0)
        else:
            # Iconic Naruto Run: forward lean + arms swept straight back + 4-step sprint stride
            bob = [0.0, -0.03, 0.01, 0.02][f]
            rig["torso"].location = (0.06, 0, 0.60 + bob)
            rig["torso"].rotation_euler = (0, math.radians(26), 0)
            rig["head"].location = (0.14, 0, 1.10 + bob)
            rig["arm_l"].rotation_euler = (0, math.radians(-68), 0)
            rig["arm_r"].rotation_euler = (0, math.radians(-68), 0)
            stride = [34, 0, -34, 0][f]
            rig["leg_l"].rotation_euler = (0, math.radians(-stride), 0)
            rig["leg_r"].rotation_euler = (0, math.radians(stride), 0)

        out_path = os.path.join(frames_dir, f"{f:03d}.png")
        scene.render.filepath = os.path.abspath(out_path)
        bpy.ops.render.render(write_still=True)


def main():
    setup_scene()
    rig = build_naruto_shippuden()
    workspace = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    source_dir = os.path.join(workspace, "art", "source")
    os.makedirs(source_dir, exist_ok=True)
    blend_path = os.path.join(source_dir, "naruto_shippuden.blend")
    bpy.ops.wm.save_as_mainfile(filepath=blend_path)

    renders_dir = os.path.join(source_dir, "renders", "hero")
    render_animation(rig, os.path.join(renders_dir, "idle"), is_walk=False)
    render_animation(rig, os.path.join(renders_dir, "walk"), is_walk=True)
    print(f"Saved 3D source {blend_path} and rendered 3D reference frames.")


if __name__ == '__main__':
    main()
