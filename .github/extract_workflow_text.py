#!/usr/bin/env python3
"""
Custom filter for PySpelling to extract text content from workflow JSON files.
Only extracts widgets_values from MarkdownNote and Note type nodes.
"""
import json
import sys
import io

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
                    if isinstance(value, str):
                        extracted_text.append(value)
                    elif isinstance(value, (list, dict)):
                        # Convert complex values to string
                        extracted_text.append(str(value))
        
        return '\n\n'.join(extracted_text) if extracted_text else ''
    
    except json.JSONDecodeError:
        return ''
    except Exception as e:
        print(f"Error processing workflow: {e}", file=sys.stderr)
        return ''


def main():
    """Read from stdin and output extracted text to stdout."""
    content = sys.stdin.read()
    result = extract_text_from_workflow(content)
    sys.stdout.write(result)


if __name__ == '__main__':
    main()

