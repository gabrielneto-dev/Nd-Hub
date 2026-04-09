import json
import subprocess

def load_tools():
    try:
        with open('tools.json', 'r', encoding='utf-8') as f:
            return json.load(f)
    except FileNotFoundError:
        return []

def execute_tool(tool_command):
    result = subprocess.run(
        tool_command, 
        shell=True, 
        capture_output=True, 
        text=True
    )
    return {
        'success': result.returncode == 0,
        'output': result.stdout,
        'error': result.stderr
    }
