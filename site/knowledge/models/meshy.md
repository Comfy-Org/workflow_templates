# Meshy

Meshy is a popular AI 3D model generator enabling text-to-3D and image-to-3D creation with PBR textures and production-ready exports.

## Model Variants

### Meshy-7.1

- Newest generation, and the only one that reaches the 4k ultra pass
- Ultra mode and 4k ultra resolution both require Meshy-7.1 (or `latest`)

### Meshy-7

- Runs the ultra pass at 2k ultra resolution
- Highest geometry detail below the 4k pass

### Meshy-6

- Oldest generation these nodes still offer
- Previous generation with stable geometry and texturing

## Key Features

- Text-to-3D with two-stage workflow (preview mesh, then refine textures)
- Image-to-3D from photos, sketches, or illustrations
- Multi-image input for multi-view reconstruction
- AI texturing with PBR maps (diffuse, roughness, metallic, normal)
- Automatic rigging and 500+ animation motion library
- Smart remesh with quad or triangle topology control
- Export in FBX, GLB, OBJ, STL, 3MF, USDZ, BLEND formats

## Hardware Requirements

- Cloud API-based (no local GPU required)
- All generation runs on Meshy servers
- API available on Pro tier and above

## Common Use Cases

- Game development asset creation
- 3D printing and prototyping
- Film and VFX previsualization
- VR/AR content development
- Product design and e-commerce

## Key Parameters

- **prompt**: Text description up to 600 characters
- **model**: Model version (meshy-7.1, meshy-7, meshy-6, latest)
- **style**: Art style for text-to-3D (realistic)
- **topology**: Mesh type (quad or triangle), available when remeshing is on
- **target_polycount**: 100 to 300,000 polygons
- **should_texture**: Generate textures on the image-to-3D path, with an optional texture prompt, reference image, and PBR maps
- **ultra_mode**: Finer surface detail from the ultra pass, on Meshy-7.1, Meshy-7 or latest
- **ultra_resolution**: Resolution of the ultra pass (2k, or 4k on Meshy-7.1 and latest)
- **pose_mode**: Character pose (a-pose, t-pose, or none)
- **symmetry_mode**: Symmetry control (auto, on, or off)
- **seed**: Seed for the run; results stay non-deterministic regardless
