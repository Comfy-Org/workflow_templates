# CreateVideo

**Category**: image/video

**Display Name**: Create Video

**Also known as**: images to video

## Description

> This documentation was AI-generated. If you find any errors or have suggestions for improvement, please feel free to contribute! [Edit on GitHub](https://github.com/Comfy-Org/embedded-docs/blob/main/comfyui_embedded_docs/docs/CreateVideo/en.md)

The Create Video node generates a video file from a sequence of images. You can specify the playback speed using frames per second and optionally add audio to the video. The node combines your images into a video format that can be played back with the specified frame rate.

## Inputs

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| images | Image | — | The images to create a video from. |
| fps | Float | 30.0 |  |
| audio | Audio | — | The audio to add to the video. |

## Outputs

| Output | Type |
|--------|------|
| ),
            ],
        )

    @classmethod
    def execute(cls, images: Input.Image, fps: float, audio: Optional[Input.Audio] = None) -> io.NodeOutput:
        return io.NodeOutput(
            InputImpl.VideoFromComponents(Types.VideoComponents(images=images, audio=audio, frame_rate=Fraction(fps))) | Video |

**Source**: `comfy_extras/nodes_video.py`

**Used in 41 template(s)**
