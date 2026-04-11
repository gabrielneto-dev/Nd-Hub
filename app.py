import os
import subprocess
import signal
from flask import Flask
from dotenv import load_dotenv

load_dotenv()

from routes.pages import pages_bp
from routes.tool_routes import tool_bp
from routes.audio_routes import audio_bp
from routes.system_routes import system_bp
from routes.project_routes import project_bp
from routes.convert_routes import fs_bp, convert_bp
from services.project_service import init_db

app = Flask(__name__)

def init_auxiliary_files():
    # Inicializa banco de dados de projetos
    init_db()
    
    # Inicializa arquivo de preferências de áudio se não existir
    audio_prefs = 'audio_prefs.json'
    if not os.path.exists(audio_prefs):
        with open(audio_prefs, 'w', encoding='utf-8') as f:
            f.write('{}')
    
    print("✅ Arquivos auxiliares verificados/inicializados.")
    
def start_ducking_monitor():
    # Caminho do monitor de ducking
    monitor_path = "/home/neto/gns/tools/ducking.py"
    
    # Verifica se o processo ja esta rodando para evitar duplicatas (especialmente em debug mode)
    # Se WERKZEUG_RUN_MAIN nao estiver presente, estamos no processo pai do Flask (reloader)
    # Queremos rodar apenas no processo principal de execucao.
    if os.environ.get('WERKZEUG_RUN_MAIN') == 'true' or not app.debug:
        try:
            # Tenta matar instâncias anteriores do mesmo script se houver
            subprocess.run(["pkill", "-f", monitor_path], stderr=subprocess.DEVNULL)
            
            print(f"🚀 Iniciando monitor de ducking: {monitor_path}")
            subprocess.Popen(["python3", monitor_path], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        except Exception as e:
            print(f"❌ Erro ao iniciar monitor de ducking: {e}")

# Permite uploads de até 2GB (necessário para vídeos e lotes grandes)
app.config['MAX_CONTENT_LENGTH'] = 2 * 1024 * 1024 * 1024

# Registrar Blueprints (Rotas modulares)
app.register_blueprint(pages_bp)
app.register_blueprint(tool_bp)
app.register_blueprint(audio_bp)
app.register_blueprint(system_bp)
app.register_blueprint(project_bp)
app.register_blueprint(fs_bp)
app.register_blueprint(convert_bp)

# Inicialização de arquivos e pastas base
init_auxiliary_files()
os.makedirs('templates', exist_ok=True)
os.makedirs('static/css', exist_ok=True)
os.makedirs('static/js', exist_ok=True)
start_ducking_monitor()

if __name__ == '__main__':
    os.system('clear')
    port = int(os.getenv('PORT', 5000))
    app.run(debug=True, host='0.0.0.0', port=port)
