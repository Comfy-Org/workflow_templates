"""
This script is for local development use only.
Not intended for cloud environments or GitHub Actions.
Used to sync template translations to frontend.
"""

import json

INDEX_JSON = '/Users/linmoumou/Documents/comfy/workflow_templates/templates/index.json'
MAIN_JSON = '/Users/linmoumou/Documents/comfy/ComfyUI_frontend/src/locales/en/main.json'

def load_json(path):
    with open(path, 'r', encoding='utf-8') as f:
        return json.load(f)

def save_json(path, data):
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

def main():
    # 1. 读取 index.json
    index_data = load_json(INDEX_JSON)
    # 2. 读取 main.json
    main_data = load_json(MAIN_JSON)

    # 3. 构建新的 templateDescription 和 template
    new_template_desc = {}
    new_template_title = {}

    for module in index_data:
        group = module.get('title')
        templates = module.get('templates', [])
        if not group or not templates:
            continue
        desc_dict = {}
        title_dict = {}
        for tpl in templates:
            name = tpl.get('name')
            title = tpl.get('title')
            desc = tpl.get('description')
            if name and title and desc:
                desc_dict[name] = desc
                title_dict[name] = title
        if desc_dict:
            new_template_desc[group] = desc_dict
        if title_dict:
            new_template_title[group] = title_dict

    # 4. 覆盖 main.json 里的 templateWorkflows 字段
    if 'templateWorkflows' not in main_data:
        print('main.json 缺少 templateWorkflows 字段！')
        return
    main_data['templateWorkflows']['templateDescription'] = new_template_desc
    main_data['templateWorkflows']['template'] = new_template_title

    # 5. 保存 main.json
    save_json(MAIN_JSON, main_data)
    print('模板描述和标题已同步到 main.json（完全以 index.json 为准）')

if __name__ == '__main__':
    main()