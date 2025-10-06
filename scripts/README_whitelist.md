# ComfyUI Workflow Template Third-Party Node Check Tool - Whitelist Feature

## Overview

This script checks whether ComfyUI workflow templates use third-party nodes. Using the whitelist feature, you can maintain a list of allowed custom nodes that will be ignored and not reported as third-party nodes.

## Whitelist Configuration File

The whitelist configuration file `whitelist.json` supports the following configuration:

### Configuration Structure

```json
{
  "description": "ComfyUI workflow templates third-party node whitelist",
  "whitelist": {
    "cnr_ids": [
      "comfy-core"
    ],
    "node_types": [
      "KSampler",
      "CheckpointLoaderSimple",
      "CLIPTextEncode",
      "VAEDecode",
      "SaveImage"
    ],
    "custom_nodes": [
      {
        "cnr_id": "example-custom-node",
        "description": "Example custom node that is allowed"
      }
    ]
  }
}
```

### Configuration Description

- **cnr_ids**: List of allowed cnr_ids, defaults to "comfy-core"
- **node_types**: List of allowed node types, matched by node type name
- **custom_nodes**: List of custom nodes, each node includes cnr_id and description

## Usage

### Basic Usage

```bash
# Check templates with default configuration
python3 scripts/check_third_party_nodes.py

# Specify template directory
python3 scripts/check_third_party_nodes.py --templates-dir ./my_templates

# Specify whitelist configuration file
python3 scripts/check_third_party_nodes.py --whitelist ./my_whitelist.json
```

### Command Line Arguments

- `--templates-dir`: Template file directory (default: ./templates)
- `--whitelist`: Whitelist configuration file path (default: ./scripts/whitelist.json)
- `--verbose, -v`: Show detailed information about whitelisted nodes
- `--help, -h`: Show help information

## Adding Custom Nodes to Whitelist

### Method 1: Add via cnr_id

Add to the `cnr_ids` array in `whitelist.json`:

```json
{
  "whitelist": {
    "cnr_ids": [
      "comfy-core",
      "your-custom-node-id"
    ]
  }
}
```

### Method 2: Add via Node Type

Add to the `node_types` array in `whitelist.json`:

```json
{
  "whitelist": {
    "node_types": [
      "KSampler",
      "YourCustomNodeType"
    ]
  }
}
```

### Method 3: Add via Custom Node Configuration

Add to the `custom_nodes` array in `whitelist.json`:

```json
{
  "whitelist": {
    "custom_nodes": [
      {
        "cnr_id": "your-custom-node-id",
        "description": "Your custom node description"
      }
    ]
  }
}
```

## Report Description

The script generates a detailed inspection report, including:

- Whitelist configuration information
- Inspection statistics
- Third-party node details
- Whitelist node statistics

## Example Output

```
# ComfyUI Template Third-Party Node Check Report

## Whitelist Configuration
- Allowed cnr_ids: comfy-core, your-custom-node
- Allowed node_types: KSampler, CheckpointLoaderSimple
- Custom whitelisted nodes: 1

## Summary
- Total files checked: 168
- Files with third-party nodes: 0
- Total third-party nodes: 0
- Total whitelisted nodes: 1546

## ✅ All templates use official or whitelisted nodes
```

## Notes

1. The whitelist configuration file must be valid JSON format
2. If the whitelist file does not exist, the script will use the default configuration (only allows comfy-core)
3. Whitelist matching priority: cnr_id > node_type > custom_nodes
4. Empty string cnr_ids will be ignored