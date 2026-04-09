from flask import Blueprint, jsonify, request
from services.project_service import get_all_projects, add_project, delete_project, update_pre_command, open_project_in_terminal

project_bp = Blueprint('projects', __name__, url_prefix='/api/projects')

@project_bp.route('/list', methods=['GET'])
def list_projects():
    try:
        return jsonify({'success': True, 'data': get_all_projects()})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@project_bp.route('/add', methods=['POST'])
def add_new():
    try:
        payload = request.get_json()
        name = payload.get('name')
        path = payload.get('path')
        pre = payload.get('pre_command', '')
        if not name or not path:
            return jsonify({'success': False, 'error': 'Nome e Path são obrigatórios'}), 400
            
        add_project(name, path, pre)
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@project_bp.route('/delete/<int:project_id>', methods=['DELETE'])
def drop(project_id):
    try:
        delete_project(project_id)
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@project_bp.route('/update_pre_command', methods=['POST'])
def update_pre():
    try:
        payload = request.get_json()
        update_pre_command(payload.get('id'), payload.get('pre_command'))
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@project_bp.route('/open/<int:project_id>', methods=['POST'])
def open_proj(project_id):
    try:
        open_project_in_terminal(project_id)
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
