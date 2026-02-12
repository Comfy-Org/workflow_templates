# LoadVideo

**Category**: image/video

**Display Name**: Load Video

**Also known as**: import video, open video, video file

## Description

> This documentation was AI-generated. If you find any errors or have suggestions for improvement, please feel free to contribute! [Edit on GitHub](https://github.com/Comfy-Org/embedded-docs/blob/main/comfyui_embedded_docs/docs/LoadVideo/en.md)

The Load Video node loads video files from the input directory and makes them available for processing in the workflow. It reads video files from the designated input folder and outputs them as video data that can be connected to other video processing nodes.

## Inputs

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| file | Combo | — |  |

## Outputs

| Output | Type |
|--------|------|
| ),
            ],
        )

    @classmethod
    def execute(cls, file) -> io.NodeOutput:
        video_path = folder_paths.get_annotated_filepath(file)
        return io.NodeOutput(InputImpl.VideoFromFile(video_path))

    @classmethod
    def fingerprint_inputs(s, file):
        video_path = folder_paths.get_annotated_filepath(file)
        mod_time = os.path.getmtime(video_path)
        # Instead of hashing the file, we can just use the modification time to avoid
        # rehashing large files.
        return mod_time

    @classmethod
    def validate_inputs(s, file):
        if not folder_paths.exists_annotated_filepath(file | Video |

**Source**: `comfy_extras/nodes_video.py`

**Used in 24 template(s)**
