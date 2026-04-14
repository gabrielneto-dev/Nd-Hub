import subprocess

def perform_system_action(action: str) -> dict:
    """Executa ações físicas de controle de energia com base na requisição."""
    
    # Mapeamento para commands usando busctl (org.freedesktop.login1)
    # Isso permite ações de energia sem sudo para usuários em sessões locais.
    commands = {
        "hibernate": ["sudo", "systemctl", "hibernate"],
        "poweroff": ["sudo", "systemctl", "poweroff"],
        "reboot": ["sudo", "systemctl", "reboot"],
        "restart_video": ["sudo", "systemctl", "restart", "gdm3"],
        "suspend": ["sudo", "systemctl", "suspend"]
    }
    
    if action not in commands:
        return {"success": False, "error": f"Ação desconhecida: {action}"}
        
    cmd = commands[action]
    try:
        # Utilizamos run com timeout curto ou Popen com monitoramento para capturar erros imediatos
        # Para ações como reboot/poweroff, o comando pode não retornar antes da máquina desligar.
        process = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        
        try:
            # Esperamos um tempo mínimo para ver se o comando falha instantaneamente (ex: falta de permissão)
            stdout, stderr = process.communicate(timeout=0.5)
            if process.returncode != 0:
                return {"success": False, "error": f"Erro {process.returncode}: {stderr.strip()}"}
        except subprocess.TimeoutExpired:
            # Se demorar mais que 0.5s, assumimos que o comando foi aceito e está processando
            pass

        return {"success": True, "message": f"Sinal de {action} enviado com sucesso."}
    except FileNotFoundError:
        return {"success": False, "error": f"Comando '{cmd[0]}' não encontrado no sistema."}
    except Exception as e:
        return {"success": False, "error": f"Falha ao disparar comando: {str(e)}"}
