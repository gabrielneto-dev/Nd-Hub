from flask import Blueprint, jsonify, request
from services.audio_service import get_audio_devices, set_audio_device, update_device_prefs
from services.ducking_service import get_ducking_config, update_ducking_volume

audio_bp = Blueprint('audio', __name__, url_prefix='/api/audio')

@audio_bp.route('/list')
def api_audio_list():
    try:
        dados = get_audio_devices()
        return jsonify({'success': True, 'data': dados})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@audio_bp.route('/set', methods=['POST'])
def api_audio_set():
    try:
        payload = request.get_json()
        if not payload or not payload.get('id_sink'):
            return jsonify({'success': False, 'error': 'id_sink missing'}), 400
            
        output = set_audio_device(payload['id_sink'], payload.get('id_porta'))
        return jsonify({'success': True, 'output': output})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@audio_bp.route('/prefs', methods=['POST'])
def api_audio_prefs():
    try:
        payload = request.get_json()
        device_id = payload.get('id')
        if not device_id:
            return jsonify({'success': False, 'error': 'Missing id'}), 400
            
        update_device_prefs(
            device_id, 
            alias=payload.get('alias'), 
            archived=payload.get('archived')
        )
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@audio_bp.route('/ducking/config')
def api_ducking_config():
    try:
        config = get_ducking_config()
        return jsonify({'success': True, 'data': config})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@audio_bp.route('/ducking/volume', methods=['POST'])
def api_ducking_volume():
    try:
        payload = request.get_json()
        porcentagem = payload.get('volume')
        if porcentagem is None:
            return jsonify({'success': False, 'error': 'Volume missing'}), 400
            
        update_ducking_volume(porcentagem)
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
