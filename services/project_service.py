import sqlite3
import os
import subprocess

DB_PATH = "projects.db"

def _get_connection():
    # Conecta ou cria o banco na raiz do hub (Nd Hub/projects.db)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    query = """
    CREATE TABLE IF NOT EXISTS projects (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        path TEXT NOT NULL UNIQUE,
        pre_command TEXT
    )
    """
    with _get_connection() as conn:
        conn.execute(query)

def get_all_projects():
    init_db()
    with _get_connection() as conn:
        rows = conn.execute("SELECT * FROM projects ORDER BY name ASC").fetchall()
        
        # Validar caminhos live
        projects = []
        for row in rows:
            p = dict(row)
            p['is_valid'] = os.path.exists(p['path']) and os.path.isdir(p['path'])
            projects.append(p)
            
        return projects

def add_project(name, path, pre_command=""):
    init_db()
    if not os.path.isdir(path):
        raise ValueError(f"O caminho '{path}' não existe ou não é um diretório válido.")
    
    with _get_connection() as conn:
        try:
            conn.execute(
                "INSERT INTO projects (name, path, pre_command) VALUES (?, ?, ?)",
                (name, path, pre_command)
            )
        except sqlite3.IntegrityError:
            raise ValueError("O nome ou caminho deste projeto já existe no banco.")
            
    return True

def delete_project(project_id):
    with _get_connection() as conn:
        conn.execute("DELETE FROM projects WHERE id = ?", (project_id,))
    return True

def update_pre_command(project_id, pre_command):
    with _get_connection() as conn:
        conn.execute("UPDATE projects SET pre_command = ? WHERE id = ?", (pre_command, project_id))
    return True

def open_project_in_terminal(project_id):
    with _get_connection() as conn:
        row = conn.execute("SELECT path, pre_command FROM projects WHERE id = ?", (project_id,)).fetchone()
        
    if not row:
        raise ValueError("Projeto não encontrado.")
        
    path = row['path']
    pre_command = row['pre_command'] or ""
    
    if not os.path.isdir(path):
        raise ValueError(f"O diretório raiz do projeto não foi mais encontrado no disco: {path}")
        
    # Preparo do payload ZSH
    # 1. cd para o diretório
    # 2. Roda a pre-action (ex: source .venv/bin/activate) se existir
    # 3. Executa o nvim
    # 4. Mantem o zsh aberto após sair do nvim (exec zsh)
    
    zsh_payload = f"cd '{path}'"
    if pre_command.strip():
        zsh_payload += f" && {pre_command.strip()}"
        
    zsh_payload += " && nvim"
    
    # Montagem do chamador shell
    # Utilizamos o GNOME Terminal que empacotará o ZSH
    # O Popen roda asincrono para ele voar pelo hub
    process_cmd = [
        "gnome-terminal", 
        "--", 
        "zsh", 
        "-c", 
        f"{zsh_payload}; exec zsh"
    ]
    
    try:
        subprocess.Popen(process_cmd)
        return True
    except FileNotFoundError:
        # Tentar fallback caso não haja gnome-terminal (ex: x-terminal-emulator)
        fallback = [
            "x-terminal-emulator",
            "-e",
            f"zsh -c \"{zsh_payload}; exec zsh\""
        ]
        subprocess.Popen(fallback)
        return True
