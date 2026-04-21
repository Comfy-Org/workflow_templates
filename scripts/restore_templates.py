#!/usr/bin/env python3
"""
Restore archived templates back into the active templates set.

This script:
1. Finds all templates with "status": "active" in archived/index.json
2. Moves template JSON files and media files back to templates/ folder
3. Moves i18n translations from archived/archived_i18n.json back to scripts/i18n.json
4. Moves localized index entries from archived/index.[locale].json back to templates/index.[locale].json
5. Moves main index entries from archived/index.json back to templates/index.json

Notes:
- This script does NOT modify bundles.json because bundle membership is not encoded in the index metadata.
- The restore trigger is purely metadata-driven: set a template's status to "active" in archived/index.json.
"""

import argparse
import json
import shutil
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple


def load_json(file_path: Path) -> Any:
  with open(file_path, 'r', encoding='utf-8') as f:
    return json.load(f)


def save_json(file_path: Path, data: Any, indent: int = 2) -> None:
  json_str = json.dumps(
    data, ensure_ascii=False, indent=indent, separators=(',', ': ')
  )

  import re

  def compact_array(match):
    content = match.group(1)
    try:
      array_content = json.loads(f'[{content}]')
      if all(
        isinstance(item, (str, int, float, bool)) or item is None
        for item in array_content
      ):
        compacted = ', '.join(
          json.dumps(item, ensure_ascii=False) for item in array_content
        )
        if len(compacted) < 150:
          return f'[{compacted}]'
    except Exception:
      pass
    return match.group(0)

  json_str = re.sub(
    r'\[\s*\n\s*([^[\]]*?)\s*\n\s*\]',
    compact_array,
    json_str,
    flags=re.DOTALL,
  )

  with open(file_path, 'w', encoding='utf-8') as f:
    f.write(json_str)
    if not json_str.endswith('\n'):
      f.write('\n')


def merge_i18n_data(existing: Dict, new: Dict) -> Dict:
  merged = existing.copy()
  for key, value in new.items():
    if key not in merged:
      merged[key] = value
    elif isinstance(merged[key], dict) and isinstance(value, dict):
      merged[key] = merge_i18n_data(merged[key], value)
  return merged


def find_template_in_category(template_name: str, category: Dict) -> Optional[Dict]:
  if 'templates' not in category:
    return None
  for template in category['templates']:
    if template.get('name') == template_name:
      return template
  return None


def prune_empty_categories(index_data: List[Dict]) -> List[Dict]:
  return [c for c in index_data if c.get('templates')]


def find_templates_by_status(
  index_data: List[Dict], status: str
) -> List[Tuple[str, Dict]]:
  result: List[Tuple[str, Dict]] = []
  for category in index_data:
    for template in category.get('templates', []):
      if template.get('status') == status:
        name = template.get('name')
        if name:
          result.append((name, template))
  return result


def move_media_files(
  template_name: str,
  src_dir: Path,
  dst_dir: Path,
  dry_run: bool,
) -> bool:
  ok = True

  json_src = src_dir / f'{template_name}.json'
  json_dst = dst_dir / f'{template_name}.json'
  if json_src.exists():
    if json_dst.exists():
      print(f'  Skip: destination exists {json_dst.name}')
      ok = False
    else:
      if dry_run:
        print(f'  Would move {json_src.name} -> {dst_dir.name}/')
      else:
        shutil.move(str(json_src), str(json_dst))
        print(f'  Moved {json_src.name} -> {dst_dir.name}/')
  else:
    print(f'  Missing: {json_src.name}')
    ok = False

  for ext in ['.webp', '.mp3', '.mp4']:
    i = 1
    while True:
      media_src = src_dir / f'{template_name}-{i}{ext}'
      if not media_src.exists():
        break
      media_dst = dst_dir / media_src.name
      if media_dst.exists():
        print(f'  Skip: destination exists {media_dst.name}')
        ok = False
      else:
        if dry_run:
          print(f'  Would move {media_src.name} -> {dst_dir.name}/')
        else:
          shutil.move(str(media_src), str(media_dst))
          print(f'  Moved {media_src.name} -> {dst_dir.name}/')
      i += 1

  return ok


def restore_i18n(
  template_name: str,
  i18n_file: Path,
  archived_i18n_file: Path,
  dry_run: bool,
) -> None:
  if not archived_i18n_file.exists():
    return

  i18n_data = load_json(i18n_file) if i18n_file.exists() else {'templates': {}}
  archived_i18n = load_json(archived_i18n_file)

  archived_templates = archived_i18n.get('templates', {})
  if template_name not in archived_templates:
    return

  if 'templates' not in i18n_data:
    i18n_data['templates'] = {}

  template_i18n = {template_name: archived_templates[template_name]}
  i18n_data['templates'] = merge_i18n_data(i18n_data['templates'], template_i18n)

  if dry_run:
    print('  Would move i18n entry archived -> scripts/i18n.json')
    return

  save_json(i18n_file, i18n_data)
  del archived_templates[template_name]
  archived_i18n['templates'] = archived_templates
  save_json(archived_i18n_file, archived_i18n)
  print('  Restored i18n to scripts/i18n.json')


def move_index_entry(
  template_name: str,
  src_index: List[Dict],
  dst_index: List[Dict],
) -> Tuple[List[Dict], List[Dict], bool]:
  moved_template = None
  src_category = None

  for category in src_index:
    template = find_template_in_category(template_name, category)
    if template:
      moved_template = template
      src_category = category
      category['templates'] = [
        t for t in category.get('templates', []) if t.get('name') != template_name
      ]
      break

  if not moved_template or not src_category:
    return src_index, dst_index, False

  # Ensure status is active when restoring
  moved_template['status'] = 'active'

  found_category = False
  for dst_category in dst_index:
    if (
      dst_category.get('moduleName') == src_category.get('moduleName')
      and dst_category.get('type') == src_category.get('type')
      and dst_category.get('category') == src_category.get('category')
    ):
      if not any(
        t.get('name') == template_name for t in dst_category.get('templates', [])
      ):
        dst_category.setdefault('templates', []).append(moved_template)
      found_category = True
      break

  if not found_category:
    dst_index.append(
      {
        'moduleName': src_category.get('moduleName'),
        'type': src_category.get('type'),
        'category': src_category.get('category'),
        'icon': src_category.get('icon'),
        'title': src_category.get('title'),
        'templates': [moved_template],
      }
    )

  return prune_empty_categories(src_index), dst_index, True


def restore_indices(
  template_name: str,
  templates_dir: Path,
  archived_dir: Path,
  dry_run: bool,
) -> None:
  # main index
  archived_index_file = archived_dir / 'index.json'
  templates_index_file = templates_dir / 'index.json'

  if not archived_index_file.exists():
    print('  Missing: archived/index.json')
    return

  archived_index = load_json(archived_index_file)
  templates_index = load_json(templates_index_file) if templates_index_file.exists() else []

  archived_index, templates_index, moved = move_index_entry(
    template_name, archived_index, templates_index
  )
  if moved:
    if dry_run:
      print('  Would move entry archived/index.json -> templates/index.json')
    else:
      save_json(archived_index_file, archived_index)
      save_json(templates_index_file, templates_index)
      print('  Restored entry to templates/index.json')

  # locale indices
  for locale_file in templates_dir.glob('index.*.json'):
    if locale_file.name in ['index.json', 'index.schema.json']:
      continue

    archived_locale_file = archived_dir / locale_file.name
    if not archived_locale_file.exists():
      continue

    src_locale = load_json(archived_locale_file)
    dst_locale = load_json(locale_file)
    src_locale, dst_locale, moved_locale = move_index_entry(
      template_name, src_locale, dst_locale
    )
    if not moved_locale:
      continue

    if dry_run:
      print(
        f'  Would move entry archived/{locale_file.name} -> templates/{locale_file.name}'
      )
    else:
      save_json(archived_locale_file, src_locale)
      save_json(locale_file, dst_locale)
      print(f'  Restored entry to templates/{locale_file.name}')


def restore_templates(base_dir: Path, restore_status: str, dry_run: bool) -> None:
  templates_dir = base_dir / 'templates'
  archived_dir = base_dir / 'archived'
  scripts_dir = base_dir / 'scripts'

  archived_index_file = archived_dir / 'index.json'
  i18n_file = scripts_dir / 'i18n.json'
  archived_i18n_file = archived_dir / 'archived_i18n.json'

  if not archived_index_file.exists():
    print(f'Archived index not found: {archived_index_file}')
    return

  archived_index = load_json(archived_index_file)
  candidates = find_templates_by_status(archived_index, restore_status)
  if not candidates:
    print(f'No templates with status: "{restore_status}" found in archived/index.json')
    return

  print(f'Found {len(candidates)} template(s) to restore (status={restore_status}):')
  for name, _ in candidates:
    print(f'  - {name}')
  print()

  for template_name, _ in candidates:
    print(f'Restoring: {template_name}')

    ok = move_media_files(
      template_name, archived_dir, templates_dir, dry_run=dry_run
    )
    if not ok:
      print('  Restore skipped for indices/i18n due to missing/conflicting files')
      print()
      continue

    restore_i18n(
      template_name,
      i18n_file=i18n_file,
      archived_i18n_file=archived_i18n_file,
      dry_run=dry_run,
    )

    restore_indices(
      template_name,
      templates_dir=templates_dir,
      archived_dir=archived_dir,
      dry_run=dry_run,
    )

    print()

  print('Restore complete.')


def main() -> None:
  parser = argparse.ArgumentParser(
    description='Restore archived templates back into templates/ when status matches.'
  )
  parser.add_argument(
    '--base-dir',
    default=str(Path(__file__).parent.parent),
    help='Project base dir (default: workflow_templates root)',
  )
  parser.add_argument(
    '--status',
    default='active',
    help='Status value in archived/index.json used as restore trigger (default: active)',
  )
  parser.add_argument(
    '--dry-run',
    action='store_true',
    help='Print actions without modifying files',
  )
  args = parser.parse_args()

  restore_templates(Path(args.base_dir), restore_status=args.status, dry_run=args.dry_run)


if __name__ == '__main__':
  main()


