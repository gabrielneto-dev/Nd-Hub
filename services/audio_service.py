import json
import os
import ast
import subprocess

AUDIO_PREFS_FILE = 'audio_prefs.json'
PYTHON_EXEC = '/home/neto/gns/tools/.venv/bin/python'
AUDIO_SCRIPT = '/home/neto/gns/tools/gerenciador_multimedia.py'

def load_audio_prefs():
    try:
        if os.path.exists(AUDIO_PREFS_FILE):
            with open(AUDIO_PREFS_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
    except:
        pass
    return {}

def save_audio_prefs(prefs):
    with open(AUDIO_PREFS_FILE, 'w', encoding='utf-8') as f:
        json.dump(prefs, f, ensure_ascii=False, indent=2)

def get_audio_devices():
    result = subprocess.run(
        [PYTHON_EXEC, AUDIO_SCRIPT, '--action', 'list'],
        capture_output=True, text=True, check=True
    )
    dados = ast.literal_eval(result.stdout.strip())
    
    prefs = load_audio_prefs()
    for d in dados:
        k = f"{d.get('id_sink', '')}::{d.get('id_porta', '')}"
        pref = prefs.get(k, {})
        d['alias'] = pref.get('alias', '')
        d['archived'] = pref.get('archived', False)
        
    return dados

def set_audio_device(id_sink, id_porta=None):
    cmd = [PYTHON_EXEC, AUDIO_SCRIPT, '--action', 'update', '--id_sink', id_sink]
    if id_porta:
        cmd.extend(['--id_porta', id_porta])
        
    result = subprocess.run(cmd, capture_output=True, text=True, check=True)
    return result.stdout.strip()

def update_device_prefs(device_id, alias=None, archived=None):
    prefs = load_audio_prefs()
    if device_id not in prefs:
        prefs[device_id] = {}
        
    if alias is not None:
        prefs[device_id]['alias'] = alias
    if archived is not None:
        prefs[device_id]['archived'] = bool(archived)
        
    save_audio_prefs(prefs)
