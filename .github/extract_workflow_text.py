#!/usr/bin/env python3
"""
Custom filter for PySpelling to extract text content from workflow JSON files.
Only extracts widgets_values from MarkdownNote and Note type nodes.
"""
import json
import sys

def extract_text_from_workflow(content):
    """Extract text from widgets_values in MarkdownNote and Note nodes."""
    try:
        data = json.loads(content)
        
        # Handle different JSON structures
        nodes = []
        if isinstance(data, dict):
            # Check if it's a workflow with nodes
            if 'nodes' in data:
                nodes = data['nodes']
            elif 'workflow' in data and 'nodes' in data['workflow']:
                nodes = data['workflow']['nodes']
        elif isinstance(data, list):
            nodes = data
        
        extracted_text = []
        
        for node in nodes:
            if not isinstance(node, dict):
                continue
                
            node_type = node.get('type', '')
            
            # Only process MarkdownNote and Note nodes
            if node_type in ['MarkdownNote', 'Note']:
                widgets_values = node.get('widgets_values', [])
                
                # Extract text from widgets_values
                for value in widgets_values:
                    if isinstance(value, str) and value.strip():
                        extracted_text.append(value)
        
        return '\n\n---SPELLCHECK_SEPARATOR---\n\n'.join(extracted_text) if extracted_text else ''
    
    except json.JSONDecodeError:
        return ''
    except Exception as e:
        # Silent error - return empty string
        return ''


if __name__ == '__main__':
    content = sys.stdin.read()
    result = extract_text_from_workflow(content)
    sys.stdout.write(result)

