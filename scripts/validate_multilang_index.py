#!/usr/bin/env python3
"""
Validate and auto-fix ComfyUI workflow template multi-language index files.

For official templates, we need to ensure consistency across all language versions:
1. All language index files should have the same templates
2. Template names should be identical across all languages (only titles/descriptions differ)
3. Template structure (mediaType, thumbnailVariant, etc.) should match exactly
4. Each language should have the same number of templates and categories

This script will automatically fix missing templates by copying them from the English
reference file (index.json) and commit the changes for manual translation later.
"""

import json
import os
import sys
import subprocess
from typing import Dict, List, Set, Tuple

def load_index_file(file_path: str) -> Dict:
    """Load and parse an index file"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            return {'data': json.load(f), 'error': None}
    except (json.JSONDecodeError, FileNotFoundError, UnicodeDecodeError) as e:
        return {'data': None, 'error': str(e)}

def extract_template_info(index_data: List[Dict]) -> Dict:
    """Extract template information from index data"""
    templates = {}
    categories = []
    
    for category in index_data:
        category_info = {
            'moduleName': category.get('moduleName', ''),
            'category': category.get('category', ''),
            'title': category.get('title', ''),
            'type': category.get('type', ''),
            'template_count': len(category.get('templates', []))
        }
        categories.append(category_info)
        
        for template in category.get('templates', []):
            template_name = template.get('name', '')
            if template_name:
                # Extract only the structural properties (not translated content)
                # Fields that can be different: title, description, tutorialUrl, tags
                # Fields that must be identical: name, mediaType, mediaSubtype, thumbnailVariant, models, date
                structural_props = {
                    'name': template_name,
                    'mediaType': template.get('mediaType', ''),
                    'mediaSubtype': template.get('mediaSubtype', ''),
                    'thumbnailVariant': template.get('thumbnailVariant', ''),
                    'models': template.get('models', []),
                    'date': template.get('date', '')
                }
                templates[template_name] = structural_props
    
    return {
        'templates': templates,
        'categories': categories,
        'total_templates': len(templates),
        'total_categories': len(categories)
    }

def find_language_index_files(templates_dir: str) -> Dict[str, str]:
    """Find all language index files in the templates directory"""
    index_files = {}
    
    for filename in os.listdir(templates_dir):
        if filename.startswith('index.') and filename.endswith('.json'):
            if filename == 'index.json':
                lang_code = 'en'  # Main English file
            elif filename == 'index.schema.json':
                continue  # Skip schema file
            else:
                # Extract language code (e.g., index.zh.json -> zh)
                lang_code = filename[6:-5]  # Remove 'index.' prefix and '.json' suffix
            
            file_path = os.path.join(templates_dir, filename)
            index_files[lang_code] = file_path
    
    return index_files

def save_index_file(file_path: str, data: List[Dict]) -> bool:
    """Save index data to file"""
    try:
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        return True
    except Exception as e:
        print(f"Error saving {file_path}: {e}")
        return False

def fix_structure_mismatches(reference_data: List[Dict], lang_data: List[Dict], template_name: str, mismatches: List[Dict]) -> List[Dict]:
    """Fix structure mismatches by copying structural properties from reference"""
    if not mismatches:
        return lang_data
    
    # Create mapping of template names to reference templates
    ref_templates = {}
    for category in reference_data:
        for template in category.get('templates', []):
            name = template.get('name', '')
            if name:
                ref_templates[name] = template
    
    if template_name not in ref_templates:
        return lang_data
    
    ref_template = ref_templates[template_name]
    
    # Fix the language data
    fixed_data = []
    for category in lang_data:
        fixed_category = category.copy()
        fixed_templates = []
        
        for template in category.get('templates', []):
            if template.get('name') == template_name:
                # Fix this template by copying structural properties from reference
                fixed_template = template.copy()
                for mismatch in mismatches:
                    if mismatch['template'] == template_name:
                        prop = mismatch['property']
                        ref_value = mismatch['reference_value']
                        fixed_template[prop] = ref_value
                fixed_templates.append(fixed_template)
            else:
                fixed_templates.append(template)
        
        fixed_category['templates'] = fixed_templates
        fixed_data.append(fixed_category)
    
    return fixed_data

def fix_missing_templates(reference_data: List[Dict], lang_data: List[Dict], missing_templates: Set[str]) -> List[Dict]:
    """Fix missing templates by copying from reference data with English content"""
    if not missing_templates:
        return lang_data
    
    # Create a mapping of template names to template data from reference
    ref_templates = {}
    ref_template_order = {}  # Track the order of templates in reference
    for category in reference_data:
        for idx, template in enumerate(category.get('templates', [])):
            template_name = template.get('name', '')
            if template_name:
                ref_templates[template_name] = (template, category)
                ref_template_order[template_name] = idx
    
    # Add missing templates to the appropriate categories in the correct order
    fixed_data = []
    for category in lang_data:
        fixed_category = category.copy()
        current_templates = list(category.get('templates', []))
        
        # Find the matching reference category
        ref_category = None
        for ref_cat in reference_data:
            if (ref_cat.get('type', '') == category.get('type', '') and 
                ref_cat.get('category', '') == category.get('category', '')):
                ref_category = ref_cat
                break
        
        if ref_category:
            # Create a new template list in the same order as reference
            ref_template_names = [t.get('name', '') for t in ref_category.get('templates', [])]
            existing_template_names = {t.get('name', '') for t in current_templates}
            
            new_templates = []
            for ref_name in ref_template_names:
                if ref_name in existing_template_names:
                    # Find existing template and add it
                    for template in current_templates:
                        if template.get('name', '') == ref_name:
                            new_templates.append(template)
                            break
                elif ref_name in missing_templates:
                    # Add missing template from reference
                    ref_template, _ = ref_templates[ref_name]
                    new_templates.append(ref_template.copy())
            
            fixed_category['templates'] = new_templates
        else:
            # Keep original templates if no matching category found
            fixed_category['templates'] = current_templates
        
        fixed_data.append(fixed_category)
    
    # If we still have missing templates, we need to add missing categories
    added_templates = set()
    for category in fixed_data:
        for template in category.get('templates', []):
            added_templates.add(template.get('name', ''))
    
    still_missing = missing_templates - added_templates
    if still_missing:
        # Add missing categories
        existing_category_titles = {cat.get('title', '') for cat in fixed_data}
        
        for template_name in still_missing:
            if template_name in ref_templates:
                ref_template, ref_category = ref_templates[template_name]
                ref_title = ref_category.get('title', '')
                
                if ref_title not in existing_category_titles:
                    # Add the entire missing category
                    new_category = ref_category.copy()
                    fixed_data.append(new_category)
                    existing_category_titles.add(ref_title)
    
    return fixed_data

def auto_commit_changes(changed_files: List[str], fix_summary: Dict[str, List[str]]) -> bool:
    """Auto-commit the fixed language files"""
    if not changed_files:
        return True
    
    try:
        # Add files to git
        subprocess.run(['git', 'add'] + changed_files, check=True)
        
        # Create commit message
        total_fixes = sum(len(fixes) for fixes in fix_summary.values())
        affected_langs = ', '.join(fix_summary.keys())
        
        # Separate missing templates from structure fixes
        missing_fixes = {}
        structure_fixes = {}
        
        for lang, fixes in fix_summary.items():
            missing_fixes[lang] = [f for f in fixes if not f.startswith('Fixed structure:')]
            structure_fixes[lang] = [f for f in fixes if f.startswith('Fixed structure:')]
        
        commit_message = f"""Auto-fix multi-language index inconsistencies in {len(fix_summary)} language files

Fixed {total_fixes} issues in language files: {affected_langs}

"""
        
        # Add missing template details
        if any(missing_fixes.values()):
            commit_message += "Missing templates added (need manual translation):\n"
            for lang, templates in missing_fixes.items():
                if templates:
                    commit_message += f"- {lang}: {', '.join(templates[:3])}"
                    if len(templates) > 3:
                        commit_message += f" (and {len(templates) - 3} more)"
                    commit_message += "\n"
        
        # Add structure fix details
        if any(structure_fixes.values()):
            commit_message += "\nStructural properties synchronized:\n"
            for lang, fixes in structure_fixes.items():
                if fixes:
                    commit_message += f"- {lang}: {len(fixes)} properties fixed\n"
        
        commit_message += """

🤖 Auto-generated fix - Manual translation required

Co-Authored-By: Claude <noreply@anthropic.com>"""
        
        # Commit changes
        subprocess.run(['git', 'commit', '-m', commit_message], check=True)
        print(f"✅ Auto-committed fixes for {len(changed_files)} files")
        return True
        
    except subprocess.CalledProcessError as e:
        print(f"❌ Failed to commit changes: {e}")
        return False

def validate_multilang_consistency(templates_dir: str, auto_fix: bool = False) -> Dict:
    """Validate consistency across all language index files"""
    results = {
        'language_files': {},
        'reference_lang': 'en',
        'missing_templates': {},
        'extra_templates': {},
        'structure_mismatches': {},
        'category_mismatches': {},
        'load_errors': [],
        'summary': {}
    }
    
    # Find all language index files
    lang_files = find_language_index_files(templates_dir)
    results['language_files'] = lang_files
    
    if 'en' not in lang_files:
        results['load_errors'].append("English index.json not found - cannot use as reference")
        return results
    
    # Load and extract info from all language files
    lang_data = {}
    for lang, file_path in lang_files.items():
        loaded = load_index_file(file_path)
        if loaded['error']:
            results['load_errors'].append(f"{lang}: {loaded['error']}")
        else:
            lang_data[lang] = extract_template_info(loaded['data'])
    
    if 'en' not in lang_data:
        results['load_errors'].append("Failed to load English reference file")
        return results
    
    # Use English as reference
    reference_data = lang_data['en']
    reference_templates = set(reference_data['templates'].keys())
    
    # Auto-fix tracking
    fixed_files = []
    auto_fix_summary = {}
    
    # Compare each language against English reference
    for lang, data in lang_data.items():
        if lang == 'en':
            continue
            
        current_templates = set(data['templates'].keys())
        
        # Check for missing templates
        missing = reference_templates - current_templates
        if missing:
            if auto_fix:
                # Load original data and fix it
                lang_file_path = lang_files[lang]
                loaded = load_index_file(lang_file_path)
                if loaded['error']:
                    results['missing_templates'][lang] = list(missing)
                else:
                    # Load reference file data
                    ref_loaded = load_index_file(lang_files['en'])
                    if not ref_loaded['error']:
                        # Fix missing templates
                        fixed_data = fix_missing_templates(ref_loaded['data'], loaded['data'], missing)
                        if save_index_file(lang_file_path, fixed_data):
                            fixed_files.append(lang_file_path)
                            auto_fix_summary[lang] = list(missing)
                            print(f"✅ Auto-fixed {len(missing)} missing templates in {lang}")
                        else:
                            results['missing_templates'][lang] = list(missing)
                    else:
                        results['missing_templates'][lang] = list(missing)
            else:
                results['missing_templates'][lang] = list(missing)
        
        # Check for extra templates
        extra = current_templates - reference_templates
        if extra:
            results['extra_templates'][lang] = list(extra)
        
        # Check for structure mismatches in common templates
        common_templates = reference_templates & current_templates
        mismatches = []
        
        for template_name in common_templates:
            ref_template = reference_data['templates'][template_name]
            cur_template = data['templates'][template_name]
            
            # Compare structural properties (exclude translatable fields: title, description, tutorialUrl, tags)
            for prop in ['mediaType', 'mediaSubtype', 'thumbnailVariant', 'models', 'date']:
                if ref_template.get(prop) != cur_template.get(prop):
                    mismatches.append({
                        'template': template_name,
                        'property': prop,
                        'reference_value': ref_template.get(prop),
                        'current_value': cur_template.get(prop)
                    })
        
        if mismatches:
            if auto_fix:
                # Try to fix structure mismatches
                lang_file_path = lang_files[lang]
                loaded = load_index_file(lang_file_path)
                ref_loaded = load_index_file(lang_files['en'])
                
                if not loaded['error'] and not ref_loaded['error']:
                    current_data = loaded['data']
                    
                    # Group mismatches by template
                    template_mismatches = {}
                    for mismatch in mismatches:
                        template_name = mismatch['template']
                        if template_name not in template_mismatches:
                            template_mismatches[template_name] = []
                        template_mismatches[template_name].append(mismatch)
                    
                    # Fix each template's mismatches
                    fixed_data = current_data
                    for template_name, template_mismatches_list in template_mismatches.items():
                        fixed_data = fix_structure_mismatches(ref_loaded['data'], fixed_data, template_name, template_mismatches_list)
                    
                    if save_index_file(lang_file_path, fixed_data):
                        if lang not in auto_fix_summary:
                            auto_fix_summary[lang] = []
                        if lang not in fixed_files:
                            fixed_files.append(lang_file_path)
                        
                        # Track structure fixes separately
                        if lang not in auto_fix_summary:
                            auto_fix_summary[lang] = []
                        auto_fix_summary[lang].extend([f"Fixed structure: {m['template']}.{m['property']}" for m in mismatches])
                        print(f"✅ Auto-fixed {len(mismatches)} structure mismatches in {lang}")
                    else:
                        results['structure_mismatches'][lang] = mismatches
                else:
                    results['structure_mismatches'][lang] = mismatches
            else:
                results['structure_mismatches'][lang] = mismatches
        
        # Check category count mismatch
        if len(data['categories']) != len(reference_data['categories']):
            results['category_mismatches'][lang] = {
                'reference_count': len(reference_data['categories']),
                'current_count': len(data['categories'])
            }
    
    # Auto-commit fixes if any were made
    if fixed_files and auto_fix_summary:
        commit_success = auto_commit_changes(fixed_files, auto_fix_summary)
        results['auto_fix_committed'] = commit_success
        results['auto_fix_summary'] = auto_fix_summary
    else:
        results['auto_fix_committed'] = False
        results['auto_fix_summary'] = {}
    
    # Generate summary
    results['summary'] = {
        'total_languages': len(lang_files),
        'successfully_loaded': len(lang_data),
        'reference_template_count': len(reference_templates),
        'languages_with_missing_templates': len(results['missing_templates']),
        'languages_with_extra_templates': len(results['extra_templates']),
        'languages_with_structure_mismatches': len(results['structure_mismatches']),
        'languages_with_category_mismatches': len(results['category_mismatches']),
        'auto_fixed_files': len(fixed_files) if fixed_files else 0
    }
    
    return results

def generate_report(results: Dict) -> str:
    """Generate multi-language validation report"""
    report = []
    report.append("# ComfyUI Template Multi-Language Index Validation Report\n")
    
    summary = results['summary']
    
    # Summary section
    report.append("## Summary")
    report.append(f"- Total language files: {summary['total_languages']}")
    report.append(f"- Successfully loaded: {summary['successfully_loaded']}")
    report.append(f"- Reference template count (English): {summary['reference_template_count']}")
    report.append(f"- Languages with missing templates: {summary['languages_with_missing_templates']}")
    report.append(f"- Languages with extra templates: {summary['languages_with_extra_templates']}")
    report.append(f"- Languages with structure mismatches: {summary['languages_with_structure_mismatches']}")
    report.append(f"- Languages with category mismatches: {summary['languages_with_category_mismatches']}")
    if 'auto_fixed_files' in summary and summary['auto_fixed_files'] > 0:
        report.append(f"- Auto-fixed files: {summary['auto_fixed_files']}")
    
    # Auto-fix summary
    if results.get('auto_fix_summary'):
        report.append("\n## ✅ Auto-Fixed Missing Templates")
        report.append("The following missing templates were automatically copied from index.json:")
        for lang, templates in results['auto_fix_summary'].items():
            report.append(f"- **{lang}**: Added {len(templates)} templates - {', '.join(templates[:3])}")
            if len(templates) > 3:
                report.append(f"  (and {len(templates) - 3} more)")
        
        if results.get('auto_fix_committed'):
            report.append("\n**Changes have been automatically committed.** Please translate the English content in these templates.")
        else:
            report.append("\n**⚠️ Auto-fix applied but commit failed.** Please manually commit the changes.")
    
    # Language files
    report.append("\n## Language Files")
    for lang, file_path in sorted(results['language_files'].items()):
        report.append(f"- **{lang}**: `{os.path.basename(file_path)}`")
    
    # Detailed issues
    has_issues = False
    
    if results['load_errors']:
        has_issues = True
        report.append("\n## ❌ Load Errors")
        for error in results['load_errors']:
            report.append(f"- {error}")
    
    if results['missing_templates']:
        has_issues = True
        report.append("\n## ❌ Missing Templates")
        for lang, missing in results['missing_templates'].items():
            report.append(f"- **{lang}**: Missing {len(missing)} templates")
            for template in missing[:5]:  # Show first 5
                report.append(f"  - `{template}`")
            if len(missing) > 5:
                report.append(f"  - ... and {len(missing) - 5} more")
    
    if results['extra_templates']:
        has_issues = True
        report.append("\n## ❌ Extra Templates")
        for lang, extra in results['extra_templates'].items():
            report.append(f"- **{lang}**: Has {len(extra)} extra templates")
            for template in extra[:5]:  # Show first 5
                report.append(f"  - `{template}`")
            if len(extra) > 5:
                report.append(f"  - ... and {len(extra) - 5} more")
    
    if results['structure_mismatches']:
        has_issues = True
        report.append("\n## ❌ Structure Mismatches")
        for lang, mismatches in results['structure_mismatches'].items():
            report.append(f"- **{lang}**: {len(mismatches)} structure mismatches")
            for mismatch in mismatches[:3]:  # Show first 3
                report.append(f"  - `{mismatch['template']}`.{mismatch['property']}: `{mismatch['current_value']}` (should be `{mismatch['reference_value']}`)")
            if len(mismatches) > 3:
                report.append(f"  - ... and {len(mismatches) - 3} more mismatches")
    
    if results['category_mismatches']:
        has_issues = True
        report.append("\n## ❌ Category Count Mismatches")
        for lang, mismatch in results['category_mismatches'].items():
            report.append(f"- **{lang}**: Has {mismatch['current_count']} categories (should be {mismatch['reference_count']})")
    
    if not has_issues:
        report.append("\n## ✅ All Multi-Language Validations Passed")
        report.append("All language versions are consistent with the English reference.")
    
    return '\n'.join(report)

def main():
    import argparse
    
    parser = argparse.ArgumentParser(description='Validate and auto-fix multi-language index files')
    parser.add_argument('--auto-fix', action='store_true', 
                       help='Automatically fix missing templates by copying from index.json')
    args = parser.parse_args()
    
    templates_dir = './templates'
    
    if not os.path.exists(templates_dir):
        print(f"Error: Templates directory {templates_dir} not found")
        return 1
    
    # Validate multi-language consistency
    results = validate_multilang_consistency(templates_dir, auto_fix=args.auto_fix)
    
    # Generate and print report
    report = generate_report(results)
    print(report)
    
    # Return error code if issues found (excluding auto-fixed issues)
    has_errors = (
        len(results['load_errors']) > 0 or
        len(results['missing_templates']) > 0 or  # These are remaining after auto-fix
        len(results['extra_templates']) > 0 or
        len(results['structure_mismatches']) > 0 or
        len(results['category_mismatches']) > 0
    )
    
    if has_errors:
        print("\n❌ Multi-language validation failed")
        return 1
    else:
        if results.get('auto_fix_summary'):
            print(f"\n✅ Multi-language validation passed (auto-fixed {results['summary']['auto_fixed_files']} files)")
        else:
            print("\n✅ All multi-language validations passed")
        return 0

if __name__ == "__main__":
    sys.exit(main())