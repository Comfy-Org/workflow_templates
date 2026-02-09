# EmptyHunyuanLatentVideo

**Category**: latent/video

**Display Name**: Empty HunyuanVideo 1.0 Latent

## Description

The `EmptyHunyuanLatentVideo` node is similar to the `EmptyLatentImage` node. You can consider it as a blank canvas for video generation, where width, height, and length define the properties of the canvas, and the batch size determines the number of canvases to create. This node creates empty canvases ready for subsequent video generation tasks.

## Inputs

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| width | Int | 848 |  |
| height | Int | 480 |  |
| length | Int | 25 |  |
| batch_size | Int | 1 |  |

## Outputs

| Output | Type |
|--------|------|
| ),
            ],
        )

    @classmethod
    def execute(cls, width, height, length, batch_size=1) -> io.NodeOutput:
        latent = torch.zeros([batch_size, 16, ((length - 1) // 4) + 1, height // 8, width // 8], device=comfy.model_management.intermediate_device() | Latent |

**Source**: `comfy_extras/nodes_hunyuan.py`

**Used in 4 template(s)**
