# Consumer-significant catalog changes

`scripts/ci/check_consumer_catalog_changes.py` compares a pull request's
`templates/index.json` with its base revision and posts an informational warning when:

- a previously non-empty `isEssential` category disappears, is renamed, becomes empty, or loses
  `isEssential`; or
- the `openSource: false` population falls to zero, removing the Partner Nodes population.

These are repository-owned fields that the ComfyUI frontend currently uses to build navigation.
The check deliberately does not maintain frontend category IDs or fetch another repository.

## Limitations

This check catches a risky producer-side diff; it cannot distinguish an accidental removal from a
coordinated one. It cannot prove consumer compatibility, inspect released frontend versions,
account for persisted user selections, validate rollout order, or discover arbitrary filters in
consumer code. It is therefore warning-only.

If blocking enforcement becomes necessary, the missing contract is a versioned, consumer-authored
list of catalog selectors/populations that must remain non-empty, plus an explicit compatibility
version or coordinated-removal acknowledgement. That contract should be supplied to this repository
as release input rather than inferred from frontend source or represented as a new catalog ID system.

Run locally against a branch or commit:

```bash
python scripts/ci/check_consumer_catalog_changes.py --base-ref origin/main
```
