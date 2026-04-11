import json
import os
import subprocess
import sys

# Adiciona o diretório tools ao path para facilitar imports se necessário
TOOLS_DIR = "/home/neto/gns/tools"
if TOOLS_DIR not in sys.path:
    sys.path.append(TOOLS_DIR)

# Importa o backend diretamente
try:
    import ducking_backend
except ImportError:
    ducking_backend = None

CAMINHO_CONFIG = os.path.join(TOOLS_DIR, "ducking.json")

def get_ducking_config():
    """Lê as configurações de ducking."""
    if ducking_backend:
        return ducking_backend.ler_config()
    
    # Fallback se o import falhar
    try:
        with open(CAMINHO_CONFIG, "r") as f:
            return json.load(f)
    except:
        return {"volume_baixo": "0.2", "volume_alto": "1.0", "tempo_verificacao": 1}

def update_ducking_volume(porcentagem):
    """Atualiza o volume de ducking usando o backend."""
    if ducking_backend:
        ducking_backend.atualizar_volume_ducking(porcentagem)
        return True
    
    # Fallback manual se o import falhar
    volume_float = float(porcentagem) / 100.0
    volume_str = f"{volume_float:.2f}"
    
    config = get_ducking_config()
    config["volume_baixo"] = volume_str
    
    with open(CAMINHO_CONFIG, "w") as f:
        json.dump(config, f, indent=4)
        
    return True
