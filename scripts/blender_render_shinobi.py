"""Render an original anime chibi shinobi sprite set (32x32) using Blender headless mode."""
import math
import os
import bpy

def setup_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene

    # Orthographic Camera for crisp pixel projection
    cam_data = bpy.data.cameras.new("OrthoCam")
    cam_data.type = 'ORTHO'
    cam_data.ortho_scale = 2.7
    cam_obj = bpy.data.objects.new("OrthoCam", cam_data)
    bpy.context.collection.objects.link(cam_obj)
    # Front-facing orthographic camera centered on character
    cam_obj.location = (0, -4.0, 0.75)
    cam_obj.rotation_euler = (math.radians(90), 0, 0)
    scene.camera = cam_obj

    # Sun Light
    sun_data = bpy.data.lights.new("Sun", type='SUN')
    sun_data.energy = 4.0
    sun_obj = bpy.data.objects.new("Sun", object_data=sun_data)
    bpy.context.collection.objects.link(sun_obj)
    sun_obj.rotation_euler = (math.radians(50), math.radians(-25), math.radians(20))

    # Fill Light
    fill_data = bpy.data.lights.new("Fill", type='SUN')
    fill_data.energy = 1.5
    fill_obj = bpy.data.objects.new("Fill", object_data=fill_data)
    bpy.context.collection.objects.link(fill_obj)
    fill_obj.rotation_euler = (math.radians(30), math.radians(60), 0)

    # Render settings: 32x32 RGBA Transparent with zero filter blur for pixel art
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
    bsdf.inputs['Roughness'].default_value = 0.8
    mat.node_tree.links.new(bsdf.outputs['BSDF'], out.inputs['Surface'])
    return mat

def build_shinobi():
    # Colors
    c_skin = (1.0, 0.82, 0.70, 1.0)
    c_hair = (0.98, 0.76, 0.16, 1.0)      # Bright anime golden blonde
    c_orange = (0.96, 0.42, 0.08, 1.0)    # Shinobi orange suit
    c_navy = (0.12, 0.15, 0.24, 1.0)      # Navy blue headband / collar / shoes
    c_metal = (0.88, 0.90, 0.94, 1.0)     # Headband metal plate
    c_eye = (0.12, 0.55, 0.95, 1.0)       # Blue anime eyes
    c_white = (0.95, 0.95, 0.98, 1.0)     # White leg wraps

    m_skin = create_mat("Skin", c_skin)
    m_hair = create_mat("Hair", c_hair)
    m_orange = create_mat("Orange", c_orange)
    m_navy = create_mat("Navy", c_navy)
    m_metal = create_mat("Metal", c_metal)
    m_eye = create_mat("Eye", c_eye)
    m_white = create_mat("White", c_white)

    # Root
    root = bpy.data.objects.new("ShinobiRoot", None)
    bpy.context.collection.objects.link(root)
    root.location = (0, 0, 0)

    # Torso
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, 0, 0.65))
    torso = bpy.context.active_object
    torso.name = "Torso"
    torso.scale = (0.46, 0.32, 0.42)
    torso.parent = root
    torso.data.materials.append(m_orange)

    # Collar / Navy Shoulder Accents
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, 0, 0.84))
    collar = bpy.context.active_object
    collar.scale = (0.48, 0.34, 0.12)
    collar.parent = torso
    collar.data.materials.append(m_navy)

    # Head
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, 0, 1.15))
    head = bpy.context.active_object
    head.name = "Head"
    head.scale = (0.58, 0.48, 0.48)
    head.parent = root
    head.data.materials.append(m_skin)

    # Headband
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, 0, 1.26))
    headband = bpy.context.active_object
    headband.scale = (0.60, 0.50, 0.16)
    headband.parent = head
    headband.data.materials.append(m_navy)

    # Headband Metal Plate
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, -0.26, 1.26))
    plate = bpy.context.active_object
    plate.scale = (0.34, 0.04, 0.12)
    plate.parent = head
    plate.data.materials.append(m_metal)

    # Eyes (Left & Right)
    for side in (-0.15, 0.15):
        bpy.ops.mesh.primitive_cube_add(size=1.0, location=(side, -0.25, 1.14))
        eye = bpy.context.active_object
        eye.scale = (0.08, 0.03, 0.10)
        eye.parent = head
        eye.data.materials.append(m_eye)

    # Spiky Anime Hair Spikes (top, sides, back)
    hair_spikes = [
        # (x, y, z, rot_x, rot_y, rot_z, scale)
        (0.0, 0.05, 1.50, 0, 0, 0, 0.28),          # Center top spike
        (-0.20, 0.05, 1.48, 0, -0.3, 0, 0.25),      # Left top spike
        (0.20, 0.05, 1.48, 0, 0.3, 0, 0.25),       # Right top spike
        (-0.32, 0.05, 1.35, 0, -0.6, 0, 0.23),      # Left side spike
        (0.32, 0.05, 1.35, 0, 0.6, 0, 0.23),       # Right side spike
        (0.0, 0.26, 1.35, 0.5, 0, 0, 0.24),        # Back spike
    ]
    for (x, y, z, rx, ry, rz, s) in hair_spikes:
        bpy.ops.mesh.primitive_cone_add(vertices=4, radius1=s, depth=s*1.8, location=(x, y, z))
        spike = bpy.context.active_object
        spike.rotation_euler = (rx, ry, rz)
        spike.parent = head
        spike.data.materials.append(m_hair)

    # Limbs creation
    # Left Leg (Orange thigh + white shin wrap + navy shoe)
    left_leg = create_leg("Leg_L", -0.15, root, m_orange, m_white, m_navy)
    right_leg = create_leg("Leg_R", 0.15, root, m_orange, m_white, m_navy)

    # Left & Right Arms
    left_arm = create_arm("Arm_L", -0.32, root, m_orange, m_skin)
    right_arm = create_arm("Arm_R", 0.32, root, m_orange, m_skin)

    return {
        "root": root, "torso": torso, "head": head,
        "leg_l": left_leg, "leg_r": right_leg,
        "arm_l": left_arm, "arm_r": right_arm
    }

def create_leg(name, x, parent, m_orange, m_white, m_navy):
    pivot = bpy.data.objects.new(name + "_Pivot", None)
    bpy.context.collection.objects.link(pivot)
    pivot.location = (x, 0, 0.45)
    pivot.parent = parent

    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, 0, -0.12))
    thigh = bpy.context.active_object
    thigh.scale = (0.16, 0.18, 0.22)
    thigh.parent = pivot
    thigh.data.materials.append(m_orange)

    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, 0, -0.28))
    shin = bpy.context.active_object
    shin.scale = (0.14, 0.16, 0.18)
    shin.parent = pivot
    shin.data.materials.append(m_white)

    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, -0.04, -0.40))
    shoe = bpy.context.active_object
    shoe.scale = (0.14, 0.22, 0.09)
    shoe.parent = pivot
    shoe.data.materials.append(m_navy)

    return pivot

def create_arm(name, x, parent, m_orange, m_skin):
    pivot = bpy.data.objects.new(name + "_Pivot", None)
    bpy.context.collection.objects.link(pivot)
    pivot.location = (x, 0, 0.80)
    pivot.parent = parent

    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, 0, -0.16))
    sleeve = bpy.context.active_object
    sleeve.scale = (0.13, 0.14, 0.24)
    sleeve.parent = pivot
    sleeve.data.materials.append(m_orange)

    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, 0, -0.32))
    hand = bpy.context.active_object
    hand.scale = (0.11, 0.11, 0.11)
    hand.parent = pivot
    hand.data.materials.append(m_skin)

    return pivot

def render_animation(rig, anim_name, frames_dir, is_walk=False):
    os.makedirs(frames_dir, exist_ok=True)
    scene = bpy.context.scene

    for f in range(4):
        if not is_walk:
            # Idle: gentle breathing
            bob = [0.0, 0.02, 0.03, 0.01][f]
            rig["torso"].location = (0, 0, 0.65 + bob)
            rig["head"].location = (0, 0, 1.15 + bob * 1.2)
            rig["arm_l"].rotation_euler = (0, math.radians([2, 5, 2, 0][f]), 0)
            rig["arm_r"].rotation_euler = (0, math.radians([-2, -5, -2, 0][f]), 0)
            rig["leg_l"].rotation_euler = (0, 0, 0)
            rig["leg_r"].rotation_euler = (0, 0, 0)
        else:
            # Walk: Ninja stride
            leg_angles = [25, 0, -25, 0]
            rig["leg_l"].rotation_euler = (math.radians(leg_angles[f]), 0, 0)
            rig["leg_r"].rotation_euler = (math.radians(-leg_angles[f]), 0, 0)
            rig["arm_l"].rotation_euler = (math.radians(-leg_angles[f] * 0.8), 0, 0)
            rig["arm_r"].rotation_euler = (math.radians(leg_angles[f] * 0.8), 0, 0)
            bob = [-0.01, 0.01, -0.01, 0.01][f]
            rig["torso"].location = (0, 0, 0.65 + bob)
            rig["head"].location = (0, 0, 1.15 + bob)

        out_path = os.path.join(frames_dir, f"{f:03d}.png")
        scene.render.filepath = os.path.abspath(out_path)
        bpy.ops.render.render(write_still=True)
        print(f"Rendered {out_path}")

def main():
    setup_scene()
    rig = build_shinobi()

    workspace = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    idle_dir = os.path.join(workspace, "art", "frames", "hero", "idle")
    walk_dir = os.path.join(workspace, "art", "frames", "hero", "walk")

    print("Rendering Shinobi Idle...")
    render_animation(rig, "idle", idle_dir, is_walk=False)
    print("Rendering Shinobi Walk...")
    render_animation(rig, "walk", walk_dir, is_walk=True)
    print("ALL SHINOBI FRAMES RENDERED SUCCESSFULLY!")

if __name__ == '__main__':
    main()
