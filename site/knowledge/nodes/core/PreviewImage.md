# PreviewImage

The PreviewImage node is designed for creating temporary preview images. It automatically generates a unique temporary file name for each image, compresses the image to a specified level, and saves it to a temporary directory. This functionality is particularly useful for generating previews of images during processing without affecting the original files.

## Inputs

| Parameter | Data Type | Description |
|-----------|-------------|-------------|
| `images`  | `IMAGE`     | The 'images' input specifies the images to be processed and saved as temporary preview images. This is the primary input for the node, determining which images will undergo the preview generation process. |

## Outputs

The node doesn't have output types.

**Used in 32 template(s)**
