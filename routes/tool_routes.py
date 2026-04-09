from flask import Blueprint, jsonify
from services.tool_service import load_tools, execute_tool

tool_bp = Blueprint('tools', __name__, url_prefix='/api')

@tool_bp.route('/tools')
def api_tools():
    return jsonify(load_tools())

@tool_bp.route('/run/<tool_id>', methods=['POST'])
def api_run(tool_id):
    tools = load_tools()
    tool = next((t for t in tools if t['id'] == tool_id), None)
    
    if not tool:
        return jsonify({'error': 'Ferramenta não encontrada', 'success': False}), 404
        
    try:
        resultado = execute_tool(tool['command'])
        return jsonify(resultado)
    except Exception as e:
        return jsonify({'error': str(e), 'success': False}), 500
