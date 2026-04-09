import os
from pathlib import Path
from flask import Blueprint, jsonify, request, send_file
from werkzeug.utils import secure_filename
import tempfile
import zipfile

# Usa as constantes do Convertor do proprio usuário
from services.convert_service import CONVERSION_MAP, EXT_TO_CAT, do_convert

fs_bp = Blueprint('fs', __name__, url_prefix='/api/fs')
convert_bp = Blueprint('convert', __name__, url_prefix='/api/convert')

# ==========================================
# FILE BROWSER (Acesso nativo local In-Place)
# ==========================================

@fs_bp.route('/list', methods=['POST'])
def list_directory():
    try:
        data = request.get_json()
        target_path = data.get('path', os.path.expanduser('~'))
        
        # Resolve e verifica segurança básica
        target_dir = Path(target_path).resolve()
        
        if not target_dir.exists() or not target_dir.is_dir():
            return jsonify({'success': False, 'error': 'Diretório não encontrado.'})
            
        entries = []
        for p in target_dir.iterdir():
            if p.name.startswith('.'):
                continue # ignora dotfiles
                
            is_dir = p.is_dir()
            ext = p.suffix.lower()
            cat = EXT_TO_CAT.get(ext) if not is_dir else None
            
            # Só lista se for diretório ou se for arquivo suportado por conversão
            if is_dir or cat is not None:
                entries.append({
                    'name': p.name,
                    'path': str(p),
                    'is_dir': is_dir,
                    'ext': ext,
                    'category': cat,
                    'size': p.stat().st_size if not is_dir else 0
                })
                
        # Ordena: Dirs primeiro, alfabetico
        entries.sort(key=lambda x: (not x['is_dir'], x['name'].lower()))
        
        return jsonify({
            'success': True, 
            'current_path': str(target_dir),
            'parent_path': str(target_dir.parent) if target_dir != target_dir.parent else None,
            'entries': entries
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

@fs_bp.route('/preview', methods=['GET'])
def preview_file():
    target_path = request.args.get('path')
    if target_path and Path(target_path).exists() and Path(target_path).is_file():
        return send_file(target_path)
    return "Not Found", 404

@fs_bp.route('/find_by_names', methods=['POST'])
def find_by_names():
    """
    Recebe nomes e tamanhos de arquivos (vindos do drag no Chrome) e busca
    os caminhos reais no disco. Começa pela pasta sugerida (hint_dir), 
    depois verifica locais comuns como Desktop, Downloads, etc.
    """
    data = request.get_json() or {}
    files_info = data.get('files', [])   # [{ name, size }]
    hint_dir = data.get('hint_dir', '')  # Último diretório navegado no File Browser

    if not files_info:
        return jsonify({'success': False, 'error': 'Nenhum arquivo informado'})

    # Diretórios de busca: hint_dir primeiro, depois os comuns
    search_dirs = []
    if hint_dir and os.path.isdir(hint_dir):
        search_dirs.append(hint_dir)
        # Também busca no pai do hint_dir
        parent = str(Path(hint_dir).parent)
        if parent != hint_dir:
            search_dirs.append(parent)

    search_dirs += [
        os.path.join(os.path.expanduser('~'), 'Desktop'),
        os.path.join(os.path.expanduser('~'), 'Downloads'),
        os.path.join(os.path.expanduser('~'), 'Documentos'),
        os.path.join(os.path.expanduser('~'), 'Documents'),
        os.path.join(os.path.expanduser('~'), 'Imagens'),
        os.path.join(os.path.expanduser('~'), 'Pictures'),
        os.path.expanduser('~'),
    ]
    # Remove duplicatas preservando ordem
    seen = set()
    search_dirs = [d for d in search_dirs if d not in seen and not seen.add(d) and os.path.isdir(d)]

    found = {}     # name → full path
    missing = []

    for file_info in files_info:
        name = file_info.get('name', '')
        size = file_info.get('size', -1)   # -1 = ignorar tamanho
        if not name:
            continue

        matched = None
        for search_dir in search_dirs:
            # Walk com profundidade máxima de 4 para não demorar
            for root, dirs, filenames in os.walk(search_dir):
                # Calcula profundidade relativa
                depth = root.replace(search_dir, '').count(os.sep)
                if depth >= 4:
                    dirs[:] = []
                    continue
                dirs[:] = [d for d in dirs if not d.startswith('.')]  # ignora ocultos

                if name in filenames:
                    candidate = os.path.join(root, name)
                    if size < 0 or abs(os.path.getsize(candidate) - size) < 1024:
                        matched = candidate
                        break

            if matched:
                break

        if matched:
            found[name] = matched
        else:
            missing.append(name)

    entries = []
    for name, path in found.items():
        p = Path(path)
        entries.append({
            'path': path,
            'name': p.name,
            'size': p.stat().st_size,
            'ext': p.suffix.lower()
        })

    return jsonify({
        'success': True,
        'entries': entries,
        'missing': missing
    })

@fs_bp.route('/pick_files', methods=['POST'])
def pick_files():
    """
    Abre um diálogo de seleção de arquivo nativo (zenity) no servidor Linux.
    Retorna os caminhos selecionados pelo usuário.
    Funciona sem nenhum upload — apenas coleta de caminhos.
    """
    import subprocess
    data = request.get_json() or {}
    multiple = data.get('multiple', True)
    title = data.get('title', 'Selecionar Arquivos para Converter')
    start_dir = data.get('start_dir', os.path.expanduser('~'))

    cmd = ['zenity', '--file-selection', '--title', title]
    if multiple:
        cmd.append('--multiple')
        cmd.extend(['--separator', '\n'])
    
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
        if result.returncode == 0:
            raw = result.stdout.strip()
            paths = [p.strip() for p in raw.split('\n') if p.strip()]
            # Enriquecer com metadados
            entries = []
            for p in paths:
                pobj = Path(p)
                if pobj.exists():
                    entries.append({
                        'path': str(pobj),
                        'name': pobj.name,
                        'size': pobj.stat().st_size if pobj.is_file() else 0,
                        'is_dir': pobj.is_dir(),
                        'ext': pobj.suffix.lower()
                    })
            return jsonify({'success': True, 'entries': entries})
        else:
            # Usuário cancelou o diálogo
            return jsonify({'success': False, 'cancelled': True, 'entries': []})
    except FileNotFoundError:
        return jsonify({'success': False, 'error': 'zenity não encontrado. Instale com: sudo apt install zenity'})
    except subprocess.TimeoutExpired:
        return jsonify({'success': False, 'error': 'Tempo limite do diálogo esgotado.'})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

@fs_bp.route('/convert_inplace', methods=['POST'])
def convert_inplace():
    try:
        data = request.get_json()
        targets = data.get('targets') # Ex: ['/abc.png', '/def/pasta']
        dst_ext = data.get('dst_ext')
        prefix = data.get('prefix', '')
        subfolder = data.get('subfolder', '')
        
        if not targets or not isinstance(targets, list) or not dst_ext:
            return jsonify({'success': False, 'error': 'Parâmetros de alvos insuficientes'})
            
        if not dst_ext.startswith('.'):
            dst_ext = '.' + dst_ext
            
        # Determinar qual é a categoria do Target, para podermos usar recursividade com segurança.
        dst_cat = None
        for cat, map_data in CONVERSION_MAP.items():
            if dst_ext.lower() in map_data['output']:
                dst_cat = cat
                break
                
        results = []
        
        def process_file(p: Path):
            ext = p.suffix.lower()
            cat = EXT_TO_CAT.get(ext)
            if cat and cat == dst_cat and ext != dst_ext.lower():
                out_dir = p.parent
                if subfolder:
                    out_dir = out_dir / subfolder
                    out_dir.mkdir(parents=True, exist_ok=True)
                success, dst_file = do_convert(p, dst_ext, out_dir, prefix=prefix)
                if success:
                    results.append(str(dst_file))
        
        for tp in targets:
            src = Path(tp)
            if not src.exists(): continue
            
            if src.is_dir():
                for root, _, files in os.walk(str(src)):
                    for f in files:
                        process_file(Path(root) / f)
            else:
                process_file(src)
        
        if not results:
            return jsonify({'success': False, 'error': 'Nenhum formato compatível encontrado na seleção para esse destino de conversão.'})
            
        return jsonify({'success': True, 'dst_paths': results})
            
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

# ==========================================
# UPLOAD E DRAG & DROP (Isolated tmp pipeline)
# ==========================================

@convert_bp.route('/map', methods=['GET'])
def get_map():
    return jsonify({'success': True, 'map': CONVERSION_MAP})

@convert_bp.route('/from_paths', methods=['POST'])
def convert_from_paths():
    """
    Converte arquivos a partir de caminhos locais (sem upload).
    Mesmo mecanismo que o Local File Browser usa - Python lê direto do disco.
    Retorna um ZIP para download ou arquivo único.
    """
    try:
        data = request.get_json()
        paths = data.get('paths', [])   # Lista de caminhos absolutos no disco
        dst_ext = data.get('dst_ext', '')
        prefix = data.get('prefix', '')
        subfolder = data.get('subfolder', '')

        if not paths or not dst_ext:
            return jsonify({'success': False, 'error': 'paths e dst_ext são obrigatórios'})

        if not dst_ext.startswith('.'):
            dst_ext = '.' + dst_ext

        temp_dir = tempfile.mkdtemp(prefix="ndhub_frompath_")
        converted_paths = []

        for p_str in paths:
            src = Path(p_str)
            if not src.exists() or not src.is_file():
                continue
            out_dir = Path(temp_dir)
            if subfolder:
                out_dir = out_dir / subfolder
                out_dir.mkdir(parents=True, exist_ok=True)
            success, dst_file = do_convert(src, dst_ext, out_dir, prefix=prefix)
            if success:
                converted_paths.append(dst_file)

        if not converted_paths:
            return jsonify({'success': False, 'error': 'Nenhum arquivo convertido. Verifique se o formato de destino é compatível.'})

        if len(converted_paths) == 1:
            dst_file = converted_paths[0]
            download_url = f"/api/convert/download?path={str(dst_file)}&name={dst_file.name}"
            return jsonify({'success': True, 'download_url': download_url})
        else:
            zip_filename = "ndhub_convertidos.zip"
            zip_path = Path(temp_dir) / zip_filename
            with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
                for cp in converted_paths:
                    arcname = cp.relative_to(Path(temp_dir)) if subfolder else cp.name
                    zipf.write(cp, arcname=str(arcname))
            download_url = f"/api/convert/download?path={str(zip_path)}&name={zip_filename}"
            return jsonify({'success': True, 'download_url': download_url})

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

@convert_bp.route('/upload_convert', methods=['POST'])
def upload_and_convert():
    try:
        files = request.files.getlist('file')
        if not files or files[0].filename == '':
            return jsonify({'success': False, 'error': 'Nenhum arquivo enviado.'}), 400
            
        target_ext = request.form.get('target_ext')
        prefix = request.form.get('prefix', '')
        subfolder = request.form.get('subfolder', '')
        if not target_ext:
            return jsonify({'success': False, 'error': 'Destino de conversão (target_ext) ausente.'}), 400
            
        if not target_ext.startswith('.'):
            target_ext = '.' + target_ext
            
        temp_dir = tempfile.mkdtemp(prefix="ndhub_uploads_")
        
        converted_paths = []
        for file in files:
            filename = secure_filename(file.filename)
            src_path = Path(temp_dir) / filename
            file.save(str(src_path))
            
            out_dir = Path(temp_dir)
            if subfolder:
                out_dir = out_dir / subfolder
                out_dir.mkdir(parents=True, exist_ok=True)
                
            success, dst_file = do_convert(src_path, target_ext, out_dir, prefix=prefix)
            if success:
                converted_paths.append(dst_file)
                
        if not converted_paths:
            return jsonify({'success': False, 'error': 'Falha generalizada. Nenhum arquivo convertido com sucesso.'})
            
        # Retornamos sucesso simples se 1 arquivo. Se > 1, agrupamos em ZIP.
        if len(converted_paths) == 1:
            dst_file = converted_paths[0]
            download_url = f"/api/convert/download?path={str(dst_file)}&name={dst_file.name}"
            return jsonify({'success': True, 'download_url': download_url})
        else:
            zip_filename = f"conversao_em_lote_ndhub.zip"
            zip_path = Path(temp_dir) / zip_filename
            with zipfile.ZipFile(zip_path, 'w') as zipf:
                for cp in converted_paths:
                    # Se tiver subpasta, garante que a estrutura no zip reflita a subpasta
                    arcname = cp.relative_to(Path(temp_dir)) if subfolder else cp.name
                    zipf.write(cp, arcname=str(arcname))
            
            download_url = f"/api/convert/download?path={str(zip_path)}&name={zip_filename}"
            return jsonify({'success': True, 'download_url': download_url})
            
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

@convert_bp.route('/download', methods=['GET'])
def download_file():
    target_path = request.args.get('path')
    name = request.args.get('name')
    if target_path and Path(target_path).exists():
        return send_file(target_path, as_attachment=True, download_name=name)
    return "Not Found", 404
