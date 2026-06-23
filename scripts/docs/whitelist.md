# Whitelist configuration

`scripts/data/whitelist.json` is shared by several validation and sync scripts:

- **`validate/analyze_models.py`** — model link checks and model reference analysis (CI: `model-analysis.yml`)
- **`validate/check_links.py`** — URL extraction skip list (CI: `link-checker.yml`)
- **`sync/sync_custom_nodes.py`** — templates to skip when syncing `requiresCustomNodes`

## Overview

Using the whitelist, you can maintain lists of allowed custom nodes, skipped URLs, and ignored node types so they are not reported as errors.

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

### Model analysis (CI)

```bash
python scripts/validate/analyze_models.py --templates-dir ./templates
python scripts/validate/analyze_models.py --whitelist ./my_whitelist.json
```

### Custom nodes sync

```bash
python scripts/sync/sync_custom_nodes.py --templates-dir ./templates
python scripts/sync/sync_custom_nodes.py --whitelist-file ./my_whitelist.json
```

### Link checker

```bash
python3 scripts/validate/check_links.py extract
python3 scripts/validate/check_links.py report
```

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