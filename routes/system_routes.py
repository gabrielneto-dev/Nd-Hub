from flask import Blueprint, jsonify, request
from services.system_service import perform_system_action

system_bp = Blueprint('system', __name__, url_prefix='/api/system')

@system_bp.route('/action', methods=['POST'])
def api_system_action():
    try:
        payload = request.get_json()
        action = payload.get('action')
        
        if not action:
            return jsonify({'success': False, 'error': 'Action missing'}), 400
            
        result = perform_system_action(action)
        return jsonify(result)
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
