from flask import Flask
import os
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

if __name__ == '__main__':
    # Inicializa arquivos base
    init_auxiliary_files()
    
    # Cria a pasta templates e static se não existirem
    os.makedirs('templates', exist_ok=True)
    os.makedirs('static/css', exist_ok=True)
    os.makedirs('static/js', exist_ok=True)
    port = int(os.getenv('PORT', 5000))
    app.run(debug=True, host='0.0.0.0', port=port)
