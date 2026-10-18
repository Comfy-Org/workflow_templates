#!/usr/bin/env python3
"""Fail when a saved widget value has the wrong JSON type for its node input.

Catches values that *look* right on the canvas but are stored as the wrong JSON
type, e.g. ``"1536"`` (string) or ``true`` for an ``INT`` widget, ``1024`` for a
``STRING``, ``"false"``/``0`` for a ``BOOLEAN``, or ``8`` (number) for a COMBO
whose options are the strings ``"8"``/``"10"``. The frontend restores
``widgets_values`` verbatim, so such a value survives load and save unchanged
and only fails later: the ComfyUI server coerces INT/FLOAT/STRING/BOOLEAN but
rejects a COMBO type mismatch (``value_not_in_list``), and the Comfy agent's
``validate`` (comfy-cli) rejects most of them as ``shape_mismatch`` (PM-2173).

Covered: regular nodes (positional and named values), subgraph instances
(promoted widgets), and frontend ``PrimitiveNode``s (checked against the
widget they drive).

The check only reports a value that would be valid after a type coercion. Wrong
values of other kinds are left to the node-compat report, which keeps this check
precise enough to block merges. Node types missing from the baseline (custom
nodes) are skipped.

Needs a node baseline from a running ComfyUI (``/object_info``):

    python scripts/validate/check_widget_types.py \\
        --object-info http://127.0.0.1:8188/object_info templates blueprints
"""

from __future__ import annotations

import argparse
import json
import math
import re
import sys
import urllib.request
from dataclasses import dataclass
from pathlib import Path
from typing import Any

_lib_dir = Path(__file__).resolve().parent.parent / "lib"
if str(_lib_dir) not in sys.path:
    sys.path.insert(0, str(_lib_dir))

from locale_index_files import TEMPLATES_NON_WORKFLOW_FILES  # noqa: E402

NUMERIC_STRING_RE = re.compile(r"^\s*[-+]?(\d+(\.\d*)?|\.\d+)([eE][-+]?\d+)?\s*$")
INTEGER_STRING_RE = re.compile(r"^\s*[-+]?\d+\s*$")

# Input types the frontend renders as a widget, i.e. that own a slot in a
# positional ``widgets_values``: ComfyWidgets in src/scripts/widgets.ts plus the
# types core extensions register through getCustomWidgets. Any other type is a
# socket and owns no slot.
WIDGET_TYPES = frozenset(
    {
        "INT",
        "FLOAT",
        "BOOLEAN",
        "STRING",
        "MARKDOWN",
        "COMBO",
        "COLOR",
        "IMAGECOMPARE",
        "BOUNDING_BOX",
        "CHART",
        "GALLERIA",
        "PAINTER",
        "COMPOSITOR",
        "TEXTAREA",
        "CURVE",
        "RANGE",
        "VIDEO_EDIT",
        "RESOLUTION_PREVIEW",
        "BOUNDING_BOXES",
        "LIGHT_INFO_PREVIEW",
        "COLORS",
        "CAMERA_ANGLE_VIEW",
        "CAMERA_INFO_STATE",
        "COMFY_BRANCH_INPUT_NAMES",
        "COMFY_BRANCH_SELECTOR",
        "LOAD_3D",
        "LOAD_3D_ADVANCED",
        "PREVIEW_3D",
        "AUDIO_UI",
        "AUDIOUPLOAD",
        "AUDIO_RECORD",
        "WEBCAM",
    }
)
DYNAMIC_COMBO = "COMFY_DYNAMICCOMBO_V3"
CONTROL_VALUES = frozenset({"fixed", "increment", "increment-wrap", "decrement", "randomize"})
UPLOAD_FLAGS = ("image_upload", "video_upload", "audio_upload")
UPLOAD_VALUES = frozenset({"image", "video", "audio"})
# Buttons load3d.ts adds right before a LOAD_3D widget; their values are saved.
LOAD_3D_BUTTON_VALUES = frozenset({"upload3dmodel", "uploadExtraResources", "clear"})
PRIMITIVE_NODE = "PrimitiveNode"


@dataclass(frozen=True)
class Finding:
    path: str
    scope: str
    node_id: Any
    node_type: str
    input_name: str
    value: Any
    expected: Any
    reason: str
    fields: tuple[str, ...]

    def format(self) -> str:
        where = f"node {self.node_id}" + (f" ({self.scope})" if self.scope else "")
        return (
            f"{self.path}: {where} `{self.node_type}`.{self.input_name} = {self.value!r} "
            f"in {' and '.join(self.fields)} — {self.reason}; store it as {self.expected!r}"
        )


def load_object_info(source: str) -> dict[str, Any]:
    if source.startswith(("http://", "https://")):
        with urllib.request.urlopen(source, timeout=120) as response:
            return json.loads(response.read().decode("utf-8"))
    return json.loads(Path(source).read_text(encoding="utf-8"))


def _meta(spec: Any) -> dict[str, Any]:
    if isinstance(spec, list) and len(spec) > 1 and isinstance(spec[1], dict):
        return spec[1]
    return {}


def _widget_type(spec: Any) -> Any:
    head = spec[0] if isinstance(spec, list) and spec else spec
    if isinstance(head, list):
        return "COMBO"
    return _meta(spec).get("widgetType") or head


def _ordered_inputs(inputs_def: Any, order: Any = None) -> list[tuple[str, Any]]:
    """``(name, spec)`` for the required then optional inputs, in ``input_order``
    when given. ``hidden`` inputs never render, so they are left out."""
    items: list[tuple[str, Any]] = []
    if not isinstance(inputs_def, dict):
        return items
    for group in ("required", "optional"):
        section = inputs_def.get(group)
        if not isinstance(section, dict):
            continue
        names = (order or {}).get(group) if isinstance(order, dict) else None
        items.extend((n, section[n]) for n in (names or section) if n in section)
    return items


def _selected_branch(spec: Any, key: Any) -> Any:
    for option in _meta(spec).get("options") or []:
        if isinstance(option, dict) and str(option.get("key")) == str(key):
            return option.get("inputs")
    return None


def _is_widget(spec: Any) -> bool:
    widget_type = _widget_type(spec)
    return (widget_type in WIDGET_TYPES or widget_type == DYNAMIC_COMBO) and not _meta(spec).get(
        "forceInput"
    )


def _walk_positional(
    items: list[tuple[str, Any]],
    values: list[Any],
    index: int,
    prefix: str,
    out: dict[str, tuple[Any, Any]],
) -> int:
    for name, spec in items:
        if index >= len(values):
            break
        full = prefix + name
        widget_type = _widget_type(spec)
        meta = _meta(spec)
        if widget_type == DYNAMIC_COMBO:
            out[full] = (values[index], spec)
            branch = _selected_branch(spec, values[index])
            index = _walk_positional(_ordered_inputs(branch), values, index + 1, full + ".", out)
            continue
        if not _is_widget(spec):
            continue
        if widget_type in ("LOAD_3D", "LOAD_3D_ADVANCED"):
            while (
                index < len(values)
                and isinstance(values[index], str)
                and values[index] in LOAD_3D_BUTTON_VALUES
            ):
                index += 1
            if index >= len(values):
                break
        out[full] = (values[index], spec)
        index += 1
        if widget_type == "INT" and "control_after_generate" not in meta:
            has_control = name in ("seed", "noise_seed")
        else:
            has_control = bool(meta.get("control_after_generate"))
        following = values[index] if index < len(values) else None
        if isinstance(following, str) and following in CONTROL_VALUES:
            if has_control:
                index += 1
                # A COMBO's value control also gets a control_filter_list widget.
                if widget_type == "COMBO" and index < len(values):
                    index += 1
        following = values[index] if index < len(values) else None
        if isinstance(following, str) and following in UPLOAD_VALUES:
            if any(meta.get(flag) for flag in UPLOAD_FLAGS):
                index += 1
    return index


def positional_widgets(node: dict[str, Any], node_def: dict[str, Any]) -> dict[str, Any]:
    """``{input_name: (value, spec)}`` for a list ``widgets_values``, assigned the
    way the frontend creates widgets: one slot per widget-backed input in
    ``input_order`` (linked ones included), the selected dynamic-combo branch
    inlined after its combo at any depth, plus the frontend-only seed control
    and upload slots. Branch children are parent-qualified (``model.fps``)."""
    values = node.get("widgets_values")
    out: dict[str, tuple[Any, Any]] = {}
    if isinstance(values, list):
        items = _ordered_inputs(node_def.get("input"), node_def.get("input_order"))
        _walk_positional(items, values, 0, "", out)
    return out


def named_input_spec(node_def: dict[str, Any], input_name: str, values: dict[str, Any]) -> Any:
    """The spec a ``widgets_values_named`` key addresses, following the selected
    dynamic-combo branch for a dotted key (``model.duration``)."""
    items = dict(_ordered_inputs(node_def.get("input")))
    parts = input_name.split(".")
    for depth, part in enumerate(parts):
        spec = items.get(part)
        if spec is None or depth == len(parts) - 1:
            return spec
        branch = _selected_branch(spec, values.get(".".join(parts[: depth + 1])))
        items = dict(_ordered_inputs(branch))
    return None


def coerced_value(value: Any, spec: Any) -> tuple[Any, str] | None:
    """``(fixed_value, reason)`` when ``value`` is the wrong JSON type for
    ``spec`` but a type coercion makes it valid, else ``None``."""
    if not isinstance(spec, list) or not spec:
        return None
    widget_type = _widget_type(spec)
    meta = _meta(spec)

    if isinstance(value, bool):
        if widget_type == "INT":
            return int(value), "boolean in an INT widget"
        if widget_type == "FLOAT":
            return float(value), "boolean in a FLOAT widget"
        return None

    if widget_type in ("INT", "FLOAT") and isinstance(value, str):
        if INTEGER_STRING_RE.match(value):
            article = "an" if widget_type == "INT" else "a"
            return int(value), f"numeric string in {article} {widget_type} widget"
        if not NUMERIC_STRING_RE.match(value):
            return None
        number = float(value)
        if not math.isfinite(number):
            return None
        if widget_type == "INT":
            if number != int(number):
                return None
            return int(number), "numeric string in an INT widget"
        return number, "numeric string in a FLOAT widget"

    if widget_type == "BOOLEAN":
        if isinstance(value, str) and value.strip().lower() in ("true", "false"):
            return value.strip().lower() == "true", "string in a BOOLEAN widget"
        if type(value) is int and value in (0, 1):
            return bool(value), "number in a BOOLEAN widget"
        return None

    if widget_type == "STRING":
        if type(value) in (int, float):
            return str(value), "number in a STRING widget"
        return None

    if widget_type == DYNAMIC_COMBO:
        options = [o.get("key") for o in meta.get("options") or [] if isinstance(o, dict)]
    elif widget_type == "COMBO" and not meta.get("multiselect"):
        head = spec[0]
        options = head if isinstance(head, list) else meta.get("options")
    else:
        return None
    if not isinstance(options, list) or not options:
        return None
    if not isinstance(value, (str, int, float)) or value in options:
        return None
    for option in options:
        if isinstance(option, bool) or not isinstance(option, (str, int, float)):
            continue
        if type(option) is type(value):
            continue
        integral = isinstance(value, float) and value.is_integer()
        if str(option) == str(value) or (integral and str(option) == str(int(value))):
            return option, (
                f"{type(value).__name__} in a COMBO whose options are {type(option).__name__}s"
            )
    return None


def _subgraph_links(subgraph: dict[str, Any]) -> dict[Any, tuple[Any, Any]]:
    """``{link_id: (target_node_id, target_slot)}`` for both link encodings."""
    links: dict[Any, tuple[Any, Any]] = {}
    for link in subgraph.get("links") or []:
        if isinstance(link, dict):
            links[link.get("id")] = (link.get("target_id"), link.get("target_slot"))
        elif isinstance(link, list) and len(link) >= 5:
            links[link[0]] = (link[3], link[4])
    return links


def _inner_widget_spec(inner: dict[str, Any], widget_name: Any, object_info: dict[str, Any]) -> Any:
    node_def = object_info.get(inner.get("type"))
    if not isinstance(node_def, dict) or not isinstance(widget_name, str):
        return None
    mapped = positional_widgets(inner, node_def)
    if widget_name in mapped:
        return mapped[widget_name][1]
    return named_input_spec(node_def, widget_name, {k: v for k, (v, _) in mapped.items()})


def _subgraph_input_targets(subgraph: dict[str, Any], input_name: str) -> list[tuple[Any, Any]]:
    """``(inner_node, inner_input)`` pairs a subgraph input is linked to."""
    entry = next(
        (
            i
            for i in subgraph.get("inputs") or []
            if isinstance(i, dict) and i.get("name") == input_name
        ),
        None,
    )
    links = _subgraph_links(subgraph)
    nodes = {n.get("id"): n for n in subgraph.get("nodes") or [] if isinstance(n, dict)}
    targets = []
    for link_id in (entry or {}).get("linkIds") or []:
        target_id, target_slot = links.get(link_id, (None, None))
        inner = nodes.get(target_id)
        inner_inputs = (inner or {}).get("inputs") or []
        if isinstance(target_slot, int) and 0 <= target_slot < len(inner_inputs):
            if isinstance(inner_inputs[target_slot], dict):
                targets.append((inner, inner_inputs[target_slot]))
    return targets


def subgraph_input_spec(
    subgraph: dict[str, Any],
    input_name: str,
    subgraphs: dict[str, dict[str, Any]],
    object_info: dict[str, Any],
    seen: frozenset[str] = frozenset(),
) -> Any:
    """The widget spec a subgraph input is promoted from: follow its links to an
    inner node's widget input, recursing into nested subgraphs. ``None`` when it
    cannot be resolved (socket-only, or an inner node missing from the baseline)."""
    for inner, target in _subgraph_input_targets(subgraph, input_name):
        inner_type = inner.get("type")
        if inner_type in subgraphs:
            if inner_type in seen:
                continue
            spec = subgraph_input_spec(
                subgraphs[inner_type],
                target.get("name"),
                subgraphs,
                object_info,
                seen | {inner_type},
            )
        else:
            widget_name = (target.get("widget") or {}).get("name") or target.get("name")
            spec = _inner_widget_spec(inner, widget_name, object_info)
        if spec is not None and _is_widget(spec):
            return spec
    return None


def _instance_slots(
    subgraph: dict[str, Any],
    subgraphs: dict[str, dict[str, Any]],
    object_info: dict[str, Any],
    proxy_widgets: Any,
) -> list[tuple[str, Any]]:
    """``(name, spec)`` per slot of an instance's positional ``widgets_values``.

    ``properties.proxyWidgets`` lists the promoted widgets in order when present:
    ``["-1", name]`` is a subgraph input, ``[node_id, widget]`` an interior widget.
    Otherwise there is one slot per subgraph input that is linked to an inner
    widget input (the frontend marks those with ``widget``). ``spec`` is ``None``
    for a slot the baseline cannot resolve; the slot is kept so later values stay
    aligned."""
    seen = frozenset({str(subgraph.get("id"))})
    if isinstance(proxy_widgets, list) and proxy_widgets:
        nodes = {str(n.get("id")): n for n in subgraph.get("nodes") or [] if isinstance(n, dict)}
        slots = []
        for entry in proxy_widgets:
            # [source_node_id, widget_name] or, since the promotion migration,
            # [source_node_id, widget_name, disambiguating_source_node_id].
            if not (isinstance(entry, list) and len(entry) in (2, 3)):
                slots.append(("", None))
            elif str(entry[0]) == "-1":
                name = str(entry[1])
                slots.append(
                    (name, subgraph_input_spec(subgraph, name, subgraphs, object_info, seen))
                )
            else:
                inner = nodes.get(str(entry[0]))
                inner_type = (inner or {}).get("type")
                if inner_type in subgraphs and inner_type not in seen:
                    spec = subgraph_input_spec(
                        subgraphs[inner_type],
                        str(entry[1]),
                        subgraphs,
                        object_info,
                        seen | {inner_type},
                    )
                else:
                    spec = _inner_widget_spec(inner, entry[1], object_info) if inner else None
                slots.append((f"{entry[0]}/{entry[1]}", spec))
        return slots
    slots = []
    for entry in subgraph.get("inputs") or []:
        name = entry.get("name") if isinstance(entry, dict) else None
        if not isinstance(name, str):
            continue
        if any(t.get("widget") for _, t in _subgraph_input_targets(subgraph, name)):
            slots.append((name, subgraph_input_spec(subgraph, name, subgraphs, object_info, seen)))
    return slots


def instance_widgets(
    node: dict[str, Any],
    subgraph: dict[str, Any],
    subgraphs: dict[str, dict[str, Any]],
    object_info: dict[str, Any],
) -> list[tuple[str, dict[str, tuple[Any, Any]]]]:
    """Both serialized forms of a subgraph instance's promoted widgets. On load
    the frontend writes them into the inner widgets, so a bad value on the
    instance overrides a correctly typed one in the definition."""
    forms: list[tuple[str, dict[str, tuple[Any, Any]]]] = []
    values = node.get("widgets_values")
    if isinstance(values, list) and values:
        proxy = (node.get("properties") or {}).get("proxyWidgets")
        slots = _instance_slots(subgraph, subgraphs, object_info, proxy)
        forms.append(
            (
                "widgets_values",
                {name: (v, spec) for (name, spec), v in zip(slots, values) if spec is not None},
            )
        )
    named = node.get("widgets_values_named")
    if isinstance(named, dict):
        seen = frozenset({str(subgraph.get("id"))})
        specs = {k: subgraph_input_spec(subgraph, k, subgraphs, object_info, seen) for k in named}
        forms.append(
            (
                "widgets_values_named",
                {k: (v, specs[k]) for k, v in named.items() if specs[k] is not None},
            )
        )
    return forms


def iter_graphs(data: Any) -> list[tuple[str, dict[str, Any]]]:
    """``(scope, graph)`` for the top-level graph and every subgraph definition."""
    if not isinstance(data, dict):
        return []
    graphs = [("", data)]
    definitions = data.get("definitions")
    subgraphs = definitions.get("subgraphs") if isinstance(definitions, dict) else None
    for subgraph in subgraphs or []:
        if isinstance(subgraph, dict):
            graphs.append((f"subgraph {subgraph.get('id', 'unknown')}", subgraph))
    return graphs


def primitive_widgets(
    node: dict[str, Any],
    graph: dict[str, Any],
    subgraphs: dict[str, dict[str, Any]],
    object_info: dict[str, Any],
) -> list[tuple[str, dict[str, tuple[Any, Any]]]]:
    """A frontend ``PrimitiveNode``'s value, keyed by the widget it drives.

    It is not in ``/object_info``: its value (``widgets_values[0]``, or
    ``widgets_values_named["value"]``) is copied into every widget input its
    output links to, so it is checked against the first linked target whose spec
    resolves (a node widget or a subgraph instance input)."""
    values = node.get("widgets_values")
    named = node.get("widgets_values_named")
    candidates = []
    if isinstance(values, list) and values:
        candidates.append(("widgets_values", values[0]))
    if isinstance(named, dict) and "value" in named:
        candidates.append(("widgets_values_named", named["value"]))
    if not candidates:
        return []
    links = _subgraph_links(graph)
    nodes = {n.get("id"): n for n in graph.get("nodes") or [] if isinstance(n, dict)}
    for output in node.get("outputs") or []:
        for link_id in (output or {}).get("links") or []:
            target_id, target_slot = links.get(link_id, (None, None))
            target = nodes.get(target_id)
            target_inputs = (target or {}).get("inputs") or []
            if not isinstance(target_slot, int) or not 0 <= target_slot < len(target_inputs):
                continue
            target_input = target_inputs[target_slot]
            if not isinstance(target_input, dict):
                continue
            widget_name = (target_input.get("widget") or {}).get("name") or target_input.get("name")
            if target.get("type") in subgraphs:
                spec = subgraph_input_spec(
                    subgraphs[target["type"]], target_input.get("name"), subgraphs, object_info
                )
            else:
                spec = _inner_widget_spec(target, widget_name, object_info)
            if spec is not None and _is_widget(spec):
                key = f"value (drives {target_id}.{widget_name})"
                return [(field, {key: (value, spec)}) for field, value in candidates]
    return []


def iter_workflow_files(paths: list[Path]) -> list[Path]:
    files: list[Path] = []
    for path in paths:
        if not path.exists():
            raise SystemExit(f"::error::workflow path not found: {path}")
        candidates = sorted(path.glob("*.json")) if path.is_dir() else [path]
        files.extend(p for p in candidates if p.name not in TEMPLATES_NON_WORKFLOW_FILES)
    return files


def check_workflow(path: Path, data: Any, object_info: dict[str, Any]) -> list[Finding]:
    """Check BOTH serialized forms of every node: the frontend restores the
    positional ``widgets_values`` by default and the named map when
    ``Comfy.Workflow.NamedValuesRestore`` is on, so either can be the one loaded."""
    findings: list[Finding] = []
    definitions = data.get("definitions") if isinstance(data, dict) else None
    subgraphs = {
        str(sg.get("id")): sg
        for sg in (definitions.get("subgraphs") if isinstance(definitions, dict) else None) or []
        if isinstance(sg, dict)
    }
    nodes = [
        (node, scope, graph)
        for scope, graph in iter_graphs(data)
        for node in graph.get("nodes") or []
        if isinstance(node, dict)
    ]
    for node, scope, graph in nodes:
        node_type = node.get("type")
        if not isinstance(node_type, str):
            continue
        node_def = object_info.get(node_type)
        if node_type == PRIMITIVE_NODE and not isinstance(node_def, dict):
            forms = primitive_widgets(node, graph, subgraphs, object_info)
        elif node_type in subgraphs:
            forms = instance_widgets(node, subgraphs[node_type], subgraphs, object_info)
        elif isinstance(node_def, dict):
            forms = [("widgets_values", positional_widgets(node, node_def))]
            named = node.get("widgets_values_named")
            if isinstance(named, dict):
                forms.append(
                    (
                        "widgets_values_named",
                        {k: (v, named_input_spec(node_def, k, named)) for k, v in named.items()},
                    )
                )
        else:
            continue
        by_key: dict[tuple[str, str], tuple[Any, tuple[Any, str], list[str]]] = {}
        for field, widgets in forms:
            for input_name, (value, spec) in widgets.items():
                result = coerced_value(value, spec)
                if result is not None:
                    entry = by_key.setdefault((input_name, repr(value)), (value, result, []))
                    entry[2].append(field)
        for (input_name, _), (value, (fixed, reason), fields) in by_key.items():
            findings.append(
                Finding(
                    path=str(path),
                    scope=scope,
                    node_id=node.get("id"),
                    node_type=node_type,
                    input_name=input_name,
                    value=value,
                    expected=fixed,
                    reason=reason,
                    fields=tuple(fields),
                )
            )
    return findings


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    parser.add_argument(
        "paths",
        nargs="*",
        type=Path,
        default=[Path("templates"), Path("blueprints")],
        help="Workflow JSON files or directories (default: templates blueprints).",
    )
    parser.add_argument(
        "--object-info",
        required=True,
        help="Path or URL of a ComfyUI /object_info JSON document.",
    )
    parser.add_argument(
        "--blocking-files",
        type=Path,
        help=(
            "File listing the workflow paths (one per line) whose findings fail the run; "
            "findings elsewhere are warnings. Default: every finding fails."
        ),
    )
    args = parser.parse_args(argv)
    blocking: set[str] | None = None
    if args.blocking_files is not None:
        lines = args.blocking_files.read_text(encoding="utf-8").splitlines()
        blocking = {Path(line.strip()).as_posix() for line in lines if line.strip()}

    object_info = load_object_info(args.object_info)
    findings: list[Finding] = []
    files = iter_workflow_files(args.paths)
    for path in files:
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError) as exc:
            print(f"::warning file={path}::could not read workflow: {exc}")
            continue
        findings.extend(check_workflow(path, data, object_info))

    errors = 0
    for finding in findings:
        is_error = blocking is None or Path(finding.path).as_posix() in blocking
        errors += is_error
        print(f"::{'error' if is_error else 'warning'} file={finding.path}::{finding.format()}")
    print(
        f"Checked {len(files)} workflow files against {len(object_info)} node types: "
        f"{len(findings)} widget value type mismatch(es), {errors} blocking."
    )
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main())
