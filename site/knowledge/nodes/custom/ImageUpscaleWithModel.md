# ImageUpscaleWithModel

**Category**: image/upscaling

**Display Name**: Upscale Image (using Model)

**Also known as**: upscale, upscaler, upsc, enlarge image, super resolution, hires, superres, increase resolution

## Description

This node is designed for upscaling images using a specified upscale model. It efficiently manages the upscaling process by adjusting the image to the appropriate device, optimizing memory usage, and applying the upscale model in a tiled manner to prevent potential out-of-memory errors.

## Inputs

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| upscale_model | UpscaleModel | — |  |
| image | Image | — |  |

## Outputs

| Output | Type |
|--------|------|
| ),
            ],
        )

    @classmethod
    def execute(cls, upscale_model, image) -> io.NodeOutput:
        device = model_management.get_torch_device()

        memory_required = model_management.module_size(upscale_model.model)
        memory_required += (512 * 512 * 3) * image.element_size() * max(upscale_model.scale, 1.0) * 384.0 #The 384.0 is an estimate of how much some of these models take, TODO: make it more accurate
        memory_required += image.nelement() * image.element_size()
        model_management.free_memory(memory_required, device)

        upscale_model.to(device)
        in_img = image.movedim(-1,-3).to(device)

        tile = 512
        overlap = 32

        oom = True
        try:
            while oom:
                try:
                    steps = in_img.shape[0] * comfy.utils.get_tiled_scale_steps(in_img.shape[3], in_img.shape[2], tile_x=tile, tile_y=tile, overlap=overlap)
                    pbar = comfy.utils.ProgressBar(steps)
                    s = comfy.utils.tiled_scale(in_img, lambda a: upscale_model(a), tile_x=tile, tile_y=tile, overlap=overlap, upscale_amount=upscale_model.scale, pbar=pbar | Image |

**Source**: `comfy_extras/nodes_upscale_model.py`

**Used in 1 template(s)**
