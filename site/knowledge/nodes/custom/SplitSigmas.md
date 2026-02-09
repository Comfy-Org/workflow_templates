# SplitSigmas

**Category**: sampling/custom_sampling/sigmas

**Display Name**: high_sigmas

## Description

The SplitSigmas node is designed for dividing a sequence of sigma values into two parts based on a specified step. This functionality is crucial for operations that require different handling or processing of the initial and subsequent parts of the sigma sequence, enabling more flexible and targeted manipulation of these values.

## Inputs

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| sigmas | Sigmas | — |  |
| step | Int | 0 |  |

## Outputs

| Parameter | Data Type | Description |
|-----------|-------------|-------------|
| `sigmas`  | `SIGMAS`    | The node outputs two sequences of sigma values, each representing a part of the original sequence divided at the specified step. These outputs are crucial for subsequent operations that require differentiated handling of sigma values. |

**Source**: `comfy_extras/nodes_custom_sampler.py`

**Used in 2 template(s)**
