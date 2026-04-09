import subprocess

def perform_system_action(action: str) -> dict:
    """Executa ações físicas de controle de energia com base na requisição."""
    commands = {
        "hibernate": ["sudo", "systemctl", "hibernate", "-i"],
        "poweroff": ["sudo", "systemctl", "poweroff", "-i"],
        "reboot": ["sudo", "systemctl", "reboot", "-i"],
        "restart_video": ["systemctl", "restart", "gdm3"],
        "suspend": ["systemctl", "suspend", "-i"]
    }
    
    if action not in commands:
        return {"success": False, "error": f"Ação desconhecida: {action}"}
        
    cmd = commands[action]
    try:
        # Utilizamos Popen em vez de run() para que a API responda imediatamente sem pendurar o processo web inteiro
        subprocess.Popen(cmd)
        return {"success": True, "message": f"Comando {action} invocado com sucesso."}
    except Exception as e:
        return {"success": False, "error": str(e)}
