// convert_ui.js - UX Completa da Ferramenta de Conversão Universal

let convertMap = null;

// ============ ESTADO GLOBAL DO FILE EXPLORER ============
let fsEntriesFull = []; 
let globalFsSelection = new Map(); // path -> object
let lastBrowserPath = '';           // Último diretório navegado no File Browser (usado como hint no drag)

window.initConvertApp = async function() {
    if(!convertMap) {
        try {
            const res = await fetch('/api/convert/map');
            const data = await res.json();
            convertMap = data.map;
            populateAllTargetExts();
        } catch(e) {
            console.error(e);
        }
    }
    setTimeout(() => {
        window.loadFs(document.getElementById('fs-current-path').value);
    }, 100);
}

function populateAllTargetExts() {
    // Somente pro action painel base, o novo checkout usara dinamico
    const sel = document.getElementById('fs-target-ext');
    if(!sel) return;
    sel.innerHTML = '';
    const allOuts = new Set();
    Object.keys(convertMap).forEach(cat => {
        convertMap[cat].output.forEach(o => allOuts.add(o));
    });
    Array.from(allOuts).sort().forEach(ext => {
        const opt = document.createElement('option');
        opt.value = ext;
        opt.textContent = "➔ " + ext.toUpperCase();
        sel.appendChild(opt);
    });
}

// ============== TABS ==============
window.switchConvertTab = function(tabName) {
    const tabLocal = document.getElementById('convert-tab-local');
    const tabWeb = document.getElementById('convert-tab-web');
    const btnLocal = document.getElementById('tab-local');
    const btnWeb = document.getElementById('tab-web');

    if(tabName === 'local') {
        tabLocal.classList.remove('hidden');
        tabWeb.classList.add('hidden');
        btnLocal.className = "px-4 py-1.5 text-sm font-medium rounded-md bg-white shadow-sm text-slate-800 transition-all";
        btnWeb.className = "px-4 py-1.5 text-sm font-medium rounded-md text-slate-500 hover:bg-slate-300 transition-all";
    } else {
        tabLocal.classList.add('hidden');
        tabWeb.classList.remove('hidden');
        btnLocal.className = "px-4 py-1.5 text-sm font-medium rounded-md text-slate-500 hover:bg-slate-300 transition-all";
        btnWeb.className = "px-4 py-1.5 text-sm font-medium rounded-md bg-white shadow-sm text-slate-800 transition-all";
        setupWebDropzone();
    }
}


// ============== FILE SYSTEM (LOCAL IN-PLACE) ==============
window.handlePathEnter = function(e) { if(e.key === 'Enter') window.loadFs(e.target.value); }
window.navigateFsUp = function() {
    const p = document.getElementById('fs-current-path').value;
    const parts = p.replace(/\/$/, '').split('/');
    parts.pop();
    window.loadFs(parts.join('/') || '/');
}
window.filterFs = function() {
    const query = document.getElementById('fs-search-input').value.toLowerCase();
    const filtered = fsEntriesFull.filter(item => item.name.toLowerCase().includes(query));
    document.getElementById('fs-item-count').textContent = filtered.length;
    renderFsEntries(filtered);
}
window.loadFs = async function(path) {
    const container = document.getElementById('fs-container');
    container.innerHTML = `<div class="flex items-center justify-center h-full text-slate-400"><i class="ph ph-spinner-gap animate-spin text-2xl mr-2"></i> Lendo disco (${path})...</div>`;
    try {
        const res = await fetch('/api/fs/list', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({path: path})
        });
        const data = await res.json();
        if(!data.success) {
            container.innerHTML = `<div class="text-red-500 text-center mt-10 p-4 bg-red-50 border border-red-200 inline-block rounded-xl mx-auto"><i class="ph ph-warning-circle text-2xl mr-2"></i> ${data.error}</div>`;
            return;
        }
        document.getElementById('fs-current-path').value = data.current_path;
        lastBrowserPath = data.current_path;  // hint para busca no drag-and-drop web
        document.getElementById('fs-search-input').value = "";
        fsEntriesFull = data.entries;
        document.getElementById('fs-item-count').textContent = fsEntriesFull.length;
        renderFsEntries(fsEntriesFull);
    } catch(e) {
        container.innerHTML = `<div class="text-red-500 text-center mt-10">Erro rede.</div>`;
    }
}

function renderFsEntries(entries) {
    const container = document.getElementById('fs-container');
    container.innerHTML = '';
    if(entries.length === 0) {
        container.innerHTML = `<div class="flex flex-col items-center justify-center h-full text-slate-400"><i class="ph ph-folder-open text-4xl mb-2"></i>Nenhum item.</div>`;
        return;
    }
    const list = document.createElement('div');
    list.className = 'space-y-1';
    entries.forEach(item => {
        const isSelected = globalFsSelection.has(item.path);
        const div = document.createElement('div');
        div.className = `flex items-center px-3 py-2 rounded transition font-medium group ${isSelected ? 'bg-brand-50 border-brand-200 border' : 'bg-white hover:bg-slate-100 border border-transparent hover:border-slate-200'}`;
        
        const chkClickFn = `event.stopPropagation(); window.toggleFsSelect('${item.path.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}')`;
        const clickActionFn = item.is_dir ? `window.loadFs('${item.path.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}')` : `window.openFsPreview('${item.path.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}')`;
        
        let labelHtml = '';
        if(item.is_dir) {
            labelHtml = `<i class="ph ph-folder-fill text-brand-400 text-xl mr-3"></i> <span class="truncate">${item.name}</span>`;
        } else {
            const badges = {'image': 'text-purple-500', 'video': 'text-red-500', 'audio': 'text-green-500', 'document': 'text-yellow-500', 'data': 'text-cyan-500'};
            const col = badges[item.category] || 'text-slate-400';
            labelHtml = `<i class="ph ph-file-text ${col} text-xl sm:mr-3"></i> <span class="flex-1 truncate">${item.name}</span>
                         <span class="text-[10px] text-slate-400 font-bold bg-slate-100 px-2 py-0.5 rounded border border-slate-200 shrink-0 uppercase tracking-widest">${item.category}</span>
                         <span class="text-xs text-slate-400 w-16 text-right sm:ml-4 shrink-0 font-mono">${(item.size/1024/1024).toFixed(1)}MB</span>`;
        }
        
        div.innerHTML = `
            <div class="flex items-center justify-center w-8 h-8 rounded-full hover:bg-slate-200 cursor-pointer text-slate-400" onclick="${chkClickFn}">
                <i class="${isSelected ? 'ph-fill ph-check-circle text-brand-500 text-xl' : 'ph ph-circle text-xl'}"></i>
            </div>
            <div class="flex items-center flex-1 ml-2 cursor-pointer text-slate-700 sm:text-sm" onclick="${clickActionFn}" title="Clique para gerar Preview/Abrir">
                ${labelHtml}
            </div>`;
        list.appendChild(div);
    });
    container.appendChild(list);
}

// ============== SELECTIONS E CARRINHO (LOCAL) ==============
window.toggleFsSelect = function(pathStr) {
    if(globalFsSelection.has(pathStr)) globalFsSelection.delete(pathStr);
    else {
        const item = fsEntriesFull.find(i => i.path === pathStr);
        if(item) globalFsSelection.set(pathStr, item);
    }
    updateFsActionPanel();
    filterFs();
}
window.clearFsSelection = function() {
    globalFsSelection.clear();
    updateFsActionPanel();
    filterFs();
}
function updateFsActionPanel() {
    const pnl = document.getElementById('fs-action-panel');
    const cnt = document.getElementById('fs-selected-count');
    if(globalFsSelection.size > 0) {
        pnl.classList.remove('hidden');
        cnt.textContent = `${globalFsSelection.size} item(s) selecionado(s)`;
    } else {
        pnl.classList.add('hidden');
    }
}

// ============== PREVIEW MODAL ==============
// Clicar no fundo escuro fecha | clicar na imagem/vídeo não fecha | Escape fecha
function _buildPreviewMedia(cat, url) {
    // onclick=stopPropagation garante que clicar na mídia não feche o modal
    if (cat === 'image')
        return `<img src="${url}" class="max-w-full max-h-full object-contain drop-shadow-2xl rounded-lg cursor-default" onclick="event.stopPropagation()">`;
    if (cat === 'video')
        return `<video controls autoplay class="max-w-full max-h-full drop-shadow-2xl rounded-lg" onclick="event.stopPropagation()"><source src="${url}"></video>`;
    if (cat === 'audio')
        return `<audio controls autoplay class="w-full max-w-md" onclick="event.stopPropagation()"><source src="${url}"></audio>`;
    return `<div class="bg-indigo-950/40 border border-indigo-900/50 text-indigo-300 p-8 rounded-2xl flex flex-col items-center justify-center shadow-inner" onclick="event.stopPropagation()"><i class="ph ph-file-text text-6xl mb-4 text-indigo-400"></i><p>Sem visualização para <strong class="text-white">${cat.toUpperCase()}</strong>.</p></div>`;
}

window.openFsPreview = function(pathStr) {
    const item = fsEntriesFull.find(i => i.path === pathStr);
    if(!item || item.is_dir) return;
    const m = document.getElementById('fs-preview-modal');
    m.classList.remove('hidden');
    requestAnimationFrame(() => m.classList.remove('opacity-0', 'pointer-events-none'));
    document.getElementById('fs-preview-title').textContent = item.path.split('/').pop();
    document.getElementById('fs-preview-content').innerHTML =
        _buildPreviewMedia(item.category, `/api/fs/preview?path=${encodeURIComponent(item.path)}`);
}

window.closeFsPreview = function() {
    const m = document.getElementById('fs-preview-modal');
    m.classList.add('opacity-0', 'pointer-events-none');
    document.getElementById('fs-preview-content').innerHTML = '';
    setTimeout(() => m.classList.add('hidden'), 300);
}

// Fecha o preview ao pressionar Escape
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        const m = document.getElementById('fs-preview-modal');
        if (m && !m.classList.contains('hidden')) window.closeFsPreview();
    }
});

// ==== CHECKOUT MASTER (LOCAL IN-PLACE) ====
window.openFsCheckoutModal = function() {
    if(globalFsSelection.size === 0) return;
    const m = document.getElementById('fs-checkout-modal');
    m.classList.remove('hidden');
    requestAnimationFrame(() => m.classList.remove('opacity-0', 'pointer-events-none'));
    renderLocalCheckoutBlocks();
}
window.closeFsCheckoutModal = function() {
    const m = document.getElementById('fs-checkout-modal');
    m.classList.add('opacity-0', 'pointer-events-none');
    setTimeout(() => { m.classList.add('hidden'); }, 300);
}

function renderLocalCheckoutBlocks() {
    const container = document.getElementById('fs-checkout-blocks-container');
    container.innerHTML = '';
    
    // Group selected paths by category
    const blocksMap = {};
    globalFsSelection.forEach((item, path) => {
        const cat = item.is_dir ? 'folder_group' : item.category;
        if(!blocksMap[cat]) blocksMap[cat] = { category: cat, items: [] };
        blocksMap[cat].items.push(item);
    });
    
    // Build HTML blocks
    for(const cat in blocksMap) {
        const b = blocksMap[cat];
        let selectOpts = '<option value="" disabled selected>Escolha e processe lote inteiro...</option>';
        if(b.category === 'folder_group') {
            // Se for folder, permite todos os tipos porque o backend navega
            const allOuts = new Set();
            Object.keys(convertMap).forEach(c => convertMap[c].output.forEach(o => allOuts.add(o)));
            Array.from(allOuts).sort().forEach(ext => selectOpts += `<option value="${ext}">Transcodificar Compatíveis para ${ext.toUpperCase()}</option>`);
        } else if(convertMap[b.category]) {
            convertMap[b.category].output.forEach(ext => selectOpts += `<option value="${ext}">Converter Bloco para ${ext.toUpperCase()}</option>`);
        } else {
             selectOpts = '<option value="" disabled selected>Categoria sem Formatos Registrados no Motor</option>';
        }
        
        let blockHtml = `
            <div class="bg-white border border-slate-200 rounded-xl shadow-sm mb-6 overflow-hidden">
                <div class="bg-slate-800 p-4 flex flex-col sm:flex-row justify-between items-center text-white gap-3">
                    <h4 class="font-bold text-lg"><i class="ph ph-stack text-brand-400 mr-2 text-xl"></i> Bloco: ${b.category.toUpperCase()} <span class="bg-slate-700 text-xs px-2 py-0.5 rounded ml-2">${b.items.length} itens</span></h4>
                    <div class="flex items-center space-x-2 w-full sm:w-auto">
                        <select id="local-batch-ext-${cat}" class="bg-slate-700 border border-slate-600 text-white rounded text-sm px-3 py-1.5 focus:outline-none w-full sm:w-auto">
                            ${selectOpts}
                        </select>
                        <button onclick="window.triggerInplaceConvertList('${cat}')" class="bg-brand-500 hover:bg-brand-600 text-white px-4 py-1.5 rounded transition font-bold text-sm shrink-0 shadow-sm"><i class="ph ph-magic-wand mr-1"></i> Bloco</button>
                    </div>
                </div>
                <div class="divide-y divide-slate-100 max-h-60 overflow-y-auto">
        `;
        
        b.items.forEach(item => {
            const itemSelectOpts = b.category === 'folder_group' ? selectOpts : (convertMap[b.category] ? convertMap[b.category].output.map(ext => `<option value="${ext}">${ext}</option>`).join('') : '<option disabled>Sem Módulo</option>');
            blockHtml += `
                <div class="p-3 flex items-center justify-between hover:bg-slate-50 transition border-l-4 border-transparent hover:border-brand-500">
                    <div class="flex items-center flex-1 mr-4 overflow-hidden">
                        <button onclick="window.removeLocalFsItem('${item.path.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}')" class="text-slate-400 hover:text-red-500 mr-3 transition shrink-0"><i class="ph ph-x-circle text-lg"></i></button>
                        <i class="ph ${item.is_dir ? 'ph-folder text-brand-400' : 'ph-file text-slate-400'} text-lg mr-2 shrink-0"></i>
                        <span class="truncate text-sm font-medium text-slate-700">${item.name}</span>
                    </div>
                    <div class="flex items-center space-x-2 shrink-0">
                        <select id="local-item-ext-${btoa(encodeURIComponent(item.path)).replace(/=/g, '')}" class="bg-slate-100 border border-slate-300 text-slate-600 rounded text-xs px-2 py-1 outline-none">
                            <option value="">Destino...</option>
                            ${itemSelectOpts}
                        </select>
                        <button onclick="window.triggerInplaceConvertItem('${item.path.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}')" class="bg-slate-800 hover:bg-slate-700 text-white p-1 rounded transition text-xs shrink-0"><i class="ph ph-play"></i></button>
                    </div>
                </div>
            `;
        });
        
        blockHtml += `</div></div>`;
        container.innerHTML += blockHtml;
    }
    
    if(Object.keys(blocksMap).length === 0) {
        window.closeFsCheckoutModal();
    }
}

window.removeLocalFsItem = function(path) {
    globalFsSelection.delete(path);
    updateFsActionPanel();
    filterFs();
    renderLocalCheckoutBlocks();
}

window.triggerInplaceConvertList = async function(catId) {
    const batchExt = document.getElementById(`local-batch-ext-${catId}`).value;
    if(!batchExt) return alert('Selecione para qual formato converter o bloco.');
    const targets = [];
    globalFsSelection.forEach((item, path) => {
        if((item.is_dir && catId === 'folder_group') || item.category === catId) targets.push(path);
    });
    if(targets.length === 0) return;

    showConversionOverlay(
        `Convertendo ${targets.length} arquivo(s) in-place…`,
        `Bloco ${catId.toUpperCase()} → ${batchExt.toUpperCase()} — salvando na mesma pasta`
    );
    lockAllConvertButtons(true);
    try {
        await executeInplace(targets, batchExt);
    } finally {
        hideConversionOverlay();
        lockAllConvertButtons(false);
    }
}

window.triggerInplaceConvertItem = async function(path) {
    const selId = "local-item-ext-" + btoa(encodeURIComponent(path)).replace(/=/g, '');
    let el = document.getElementById(selId);
    if(!el || !el.value) return alert('Escolha um destino individual.');

    const name = path.split('/').pop();
    showConversionOverlay(
        `Convertendo: ${name}`,
        `Para ${el.value.toUpperCase()} — salvando na mesma pasta`
    );
    lockAllConvertButtons(true);
    try {
        await executeInplace([path], el.value);
    } finally {
        hideConversionOverlay();
        lockAllConvertButtons(false);
    }
}

async function executeInplace(targets, dstExt) {
    const prefix = document.getElementById('local-config-prefix').value.trim();
    const folder = document.getElementById('local-config-folder').value.trim();

    try {
        const res = await fetch('/api/fs/convert_inplace', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ targets: targets, dst_ext: dstExt, prefix: prefix, subfolder: folder })
        });
        const p = await res.json();

        if(p.success) {
            // Mostra sucesso brevemente no overlay antes de fechar
            document.getElementById('overlay-title').textContent = `✅ ${p.dst_paths.length} arquivo(s) convertido(s)!`;
            document.getElementById('overlay-subtitle').textContent = 'Salvos in-place — abrindo pasta...';
            await new Promise(r => setTimeout(r, 1500));

            targets.forEach(t => globalFsSelection.delete(t));
            updateFsActionPanel();
            filterFs();
            renderLocalCheckoutBlocks();
            window.loadFs(document.getElementById('fs-current-path').value);
        } else {
            alert(`Erro do Motor Backend:\n${p.error}`);
        }
    } catch(err) {
        alert("Erro de rede: " + err.message);
    }
}


// ============== WEB DROPZONE STAGING (INCREMENTAL BLOCKS) ==============

let webSelectionStaging = []; // Array of File objects
let dropZoneIdCounter = 0; // Para gerar IDs para DOM

function getExt(filename) {
    const lastDot = filename.lastIndexOf(".");
    return lastDot > -1 ? filename.substring(lastDot).toLowerCase() : "";
}

function getCatForExt(ext) {
    for(let cat in convertMap) {
        if(convertMap[cat].input.includes(ext)) return cat;
    }
    return 'invalido';
}

function setupWebDropzone() {
    const area = document.getElementById('web-dropzone-area');
    if (area.dataset.dropSetup) return;
    area.dataset.dropSetup = true;

    area.addEventListener('dragover', (e) => {
        e.preventDefault();
        area.classList.add('border-brand-500', 'bg-brand-50', 'scale-[1.01]');
        area.querySelector('h3').textContent = 'Solte para selecionar arquivos...';
        area.querySelector('.ph-folder-open').classList.replace('ph-folder-open', 'ph-upload-simple');
    });
    area.addEventListener('dragleave', (e) => {
        e.preventDefault();
        area.classList.remove('border-brand-500', 'bg-brand-50', 'scale-[1.01]');
        area.querySelector('h3').textContent = 'Arraste Arquivos Aqui ou Selecione';
        area.querySelector('.ph-upload-simple')?.classList.replace('ph-upload-simple', 'ph-folder-open');
    });

    area.addEventListener('drop', async (e) => {
        e.preventDefault();
        area.classList.remove('border-brand-500', 'bg-brand-50', 'scale-[1.01]');
        area.querySelector('h3').textContent = 'Arraste Arquivos Aqui ou Selecione';
        area.querySelector('.ph-upload-simple')?.classList.replace('ph-upload-simple', 'ph-folder-open');

        // 1) Tenta URI list (Firefox/Wayland com suporte)
        const raw = e.dataTransfer.getData('text/uri-list') || '';
        const uriPaths = raw.split('\n')
            .map(u => u.trim().replace(/\r$/, ''))
            .filter(u => u.length > 0 && u.startsWith('file://') && !u.startsWith('#'))
            .map(u => decodeURIComponent(u.slice(7)));

        if (uriPaths.length > 0) {
            uriPaths.forEach(p => registerWebPath(p));
            document.getElementById('web-staging-area').classList.remove('hidden');
            renderWebBlocks();
            return;
        }

        // 2) Chrome SÓ fornece File objects (sem caminho).
        // Buscamos no disco pelo nome + tamanho para recuperar o caminho real.
        const droppedFiles = Array.from(e.dataTransfer.files);
        if (droppedFiles.length === 0) { window.pickFilesNative(); return; }

        const filesInfo = droppedFiles.map(f => ({ name: f.name, size: f.size }));
        area.querySelector('h3').textContent = `Localizando ${droppedFiles.length} arquivo(s) no disco...`;

        try {
            const res = await fetch('/api/fs/find_by_names', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ files: filesInfo, hint_dir: lastBrowserPath })
            });
            const data = await res.json();
            area.querySelector('h3').textContent = 'Arraste Arquivos Aqui ou Selecione';

            if (data.success && data.entries.length > 0) {
                data.entries.forEach(entry => registerWebPath(entry.path));
                document.getElementById('web-staging-area').classList.remove('hidden');
                renderWebBlocks();
                if (data.missing.length > 0) {
                    alert(`⚠️ ${data.missing.length} arquivo(s) não localizado(s):\n${data.missing.join('\n')}\n\nVerifique se o arquivo está no Desktop, Downloads ou na pasta que você navegou no File Browser.`);
                }
            } else {
                // Não encontrou — abre zenity como fallback
                const open = confirm(`Não foi possível localizar automaticamente os arquivos.\nDeseja abrir o seletor de arquivos?`);
                if (open) window.pickFilesNative();
            }
        } catch(err) {
            area.querySelector('h3').textContent = 'Arraste Arquivos Aqui ou Selecione';
            window.pickFilesNative();
        }
    });
}

// Abre o seletor de arquivos nativo do Linux (zenity) via chamada ao servidor
window.pickFilesNative = async function(isDir = false) {
    const btn = document.getElementById('btn-pick-native');
    if (btn) { btn.disabled = true; btn.textContent = 'Abrindo...' ; }

    try {
        const title = isDir ? 'Selecionar Pasta' : 'Selecionar Arquivos';
        const res = await fetch('/api/fs/pick_files', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ multiple: true, title })
        });
        const data = await res.json();

        if (data.success && data.entries.length > 0) {
            for (const entry of data.entries) {
                if (entry.is_dir) {
                    // Para pastas, lista os arquivos via API
                    await addFolderToWebStaging(entry.path);
                } else {
                    registerWebPath(entry.path);
                }
            }
            document.getElementById('web-staging-area').classList.remove('hidden');
            renderWebBlocks();
        } else if (!data.cancelled) {
            if(data.error) alert('Erro: ' + data.error);
        }
    } catch(err) {
        alert('Erro ao abrir seletor: ' + err.message);
    } finally {
        if (btn) { btn.disabled = false; btn.textContent = '\uD83D\uDCC2 Selecionar Arquivos'; }
    }
}

async function addFolderToWebStaging(folderPath) {
    try {
        const res = await fetch('/api/fs/list', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ path: folderPath })
        });
        const data = await res.json();
        if (data.success) {
            for (const entry of data.entries) {
                if (!entry.is_dir) registerWebPath(entry.path);
            }
        }
    } catch(e) { /* ignora */ }
}

// Registra um caminho local no staging
function registerWebPath(localPath) {
    if (!convertMap) return;
    const name = localPath.split('/').pop();
    const ext = getExt(name);
    const cat = getCatForExt(ext);

    // Busca tamanho via API (assíncrono, opcional)
    const entry = {
        _webId: 'dropfile_' + (++dropZoneIdCounter),
        _webCat: cat,
        _webPath: localPath,   // caminho completo no disco
        name: name,
        size: null             // será preenchido via API se desejado
    };
    webSelectionStaging.push(entry);
}

window.clearWebSelection = function() {
    webSelectionStaging = [];
    document.getElementById('web-staging-area').classList.add('hidden');
    renderWebBlocks();
}

window.removeWebItem = function(id) {
    webSelectionStaging = webSelectionStaging.filter(f => f._webId !== id);
    if(webSelectionStaging.length === 0) document.getElementById('web-staging-area').classList.add('hidden');
    renderWebBlocks();
}

function renderWebBlocks() {
    const container = document.getElementById('web-blocks-container');
    container.innerHTML = '';
    
    const blocksMap = {};
    webSelectionStaging.forEach(f => {
        if(!blocksMap[f._webCat]) blocksMap[f._webCat] = { category: f._webCat, files: [] };
        blocksMap[f._webCat].files.push(f);
    });
    
    for(const cat in blocksMap) {
        const b = blocksMap[cat];
        let selectOpts = '<option value="" disabled selected>Gerar Lote de Extensão...</option>';
        
        if (cat === 'invalido') {
            selectOpts = '<option value="" disabled selected>Arquivos não suportados</option>';
        } else if(convertMap[cat]) {
            convertMap[cat].output.forEach(ext => selectOpts += `<option value="${ext}">Converter Bloco para ${ext.toUpperCase()}</option>`);
        }
        
        let blockHtml = `
            <div class="bg-white border ${cat==='invalido' ? 'border-red-300' : 'border-slate-200'} rounded-xl shadow-sm overflow-hidden mb-6">
                <div class="${cat==='invalido' ? 'bg-red-50 text-red-800' : 'bg-slate-100 text-slate-800'} p-4 flex flex-col sm:flex-row justify-between items-center border-b border-slate-200 gap-3">
                    <h4 class="font-bold text-lg"><i class="ph ph-stack text-brand-500 mr-2 text-xl"></i> Bloco Lógico: ${cat.toUpperCase()} <span class="bg-slate-200 text-slate-600 text-xs px-2 py-0.5 rounded ml-2 font-mono">${b.files.length}</span></h4>
                    
                    ${cat !== 'invalido' ? `
                    <div class="flex items-center space-x-2 w-full sm:w-auto">
                        <select id="web-batch-ext-${cat}" class="bg-white border border-slate-300 text-slate-700 rounded text-sm px-3 py-2 outline-none w-full sm:w-auto">
                            ${selectOpts}
                        </select>
                        <button onclick="window.triggerWebConvertList('${cat}')" class="bg-brand-500 hover:bg-brand-600 text-white px-4 py-2 rounded transition font-bold text-sm shrink-0 flex items-center shadow-sm"><i class="ph ph-lightning mr-1"></i> Bloco Inteiro</button>
                    </div>` : `<span class="text-sm font-bold opacity-75">Nenhuma conversão de base mapeada no painel.</span>`}
                </div>
                <div class="divide-y divide-slate-100 max-h-[300px] overflow-y-auto w-full">
        `;
        
        b.files.forEach(f => {
            const shortName = f.name;
            const fullPath = f._webPath;
            const itemSelectOpts = cat === 'invalido' ? '<option disabled>Sem Módulo</option>' : convertMap[cat].output.map(ext => `<option value="${ext}">${getExt(f.name).toUpperCase()} ➡ ${ext.toUpperCase()}</option>`).join('');
            
            blockHtml += `
                <div class="p-3 px-4 flex flex-col sm:flex-row sm:items-center justify-between hover:bg-slate-50 transition border-l-4 border-transparent hover:border-brand-500 gap-3 sm:gap-0">
                    <div class="flex items-center flex-1 overflow-hidden">
                        <button onclick="window.removeWebItem('${f._webId}')" class="text-slate-400 hover:text-red-500 mr-3 transition shrink-0"><i class="ph ph-x-circle text-xl"></i></button>
                        <i class="ph ph-file-text text-brand-400 text-xl mr-2 shrink-0 cursor-pointer" onclick="window.openWebPreview('${f._webId}')"></i>
                        <span class="truncate text-sm font-medium text-slate-700 cursor-pointer hover:text-brand-600 hover:underline" title="${fullPath}" onclick="window.openWebPreview('${f._webId}')">${shortName}</span>
                        <span class="text-xs text-slate-400 ml-3 font-mono shrink-0 hidden sm:block">${fullPath.replace(shortName, '').slice(0, 40)}...</span>
                    </div>
                    ${cat !== 'invalido' ? `
                    <div class="flex items-center space-x-2 shrink-0 ml-7 sm:ml-0">
                        <select id="web-item-ext-${f._webId}" class="bg-white border border-slate-300 text-slate-600 rounded text-xs px-2 py-1.5 focus:border-brand-500 outline-none max-w-[140px] truncate">
                            <option value="">Para onde converter?</option>
                            ${itemSelectOpts}
                        </select>
                        <button onclick="window.triggerWebConvertItem('${f._webId}')" class="bg-slate-800 hover:bg-slate-700 text-white p-1.5 px-3 rounded transition text-xs font-bold shadow flex items-center shrink-0">Individual <i class="ph ph-caret-right ml-1"></i></button>
                    </div>` : ''}
                </div>
            `;
        });
        
        blockHtml += `</div></div>`;
        container.innerHTML += blockHtml;
    }
}

// ============ OVERLAY DE PROGRESSO ============
function showConversionOverlay(title, subtitle) {
    const overlay = document.getElementById('conversion-overlay');
    document.getElementById('overlay-title').textContent = title || 'Convertendo...';
    document.getElementById('overlay-subtitle').textContent = subtitle || 'Aguarde enquanto o Python processa seus arquivos';
    overlay.classList.remove('hidden');
    overlay.classList.add('flex');
}
function hideConversionOverlay() {
    const overlay = document.getElementById('conversion-overlay');
    overlay.classList.add('hidden');
    overlay.classList.remove('flex');
}

// Bloqueia todos os botões de conversão (Web e Local) para evitar clique duplo
function lockAllConvertButtons(lock) {
    document.querySelectorAll('[onclick*="triggerWeb"], [onclick*="triggerLocal"], [onclick*="triggerConvert"], #btn-pick-native').forEach(btn => {
        btn.disabled = lock;
        if (lock) {
            btn.classList.add('opacity-50', 'cursor-not-allowed', 'pointer-events-none');
        } else {
            btn.classList.remove('opacity-50', 'cursor-not-allowed', 'pointer-events-none');
        }
    });
}

window.triggerWebConvertList = async function(catId) {
    const batchExt = document.getElementById(`web-batch-ext-${catId}`).value;
    if(!batchExt) return alert('Selecione para qual formato converter o bloco.');
    const filesToConvert = webSelectionStaging.filter(f => f._webCat === catId);
    if(filesToConvert.length === 0) return;

    showConversionOverlay(
        `Convertendo ${filesToConvert.length} arquivo(s)…`,
        `Bloco ${catId.toUpperCase()} → ${batchExt.toUpperCase()} — não feche esta aba`
    );
    lockAllConvertButtons(true);
    try {
        await executeWebUpload(filesToConvert, batchExt);
    } finally {
        hideConversionOverlay();
        lockAllConvertButtons(false);
    }
}

window.triggerWebConvertItem = async function(id) {
    const sel = document.getElementById(`web-item-ext-${id}`);
    if(!sel || !sel.value) return alert('Escolha um destino individual.');
    const fileToConvert = webSelectionStaging.find(f => f._webId === id);
    if(!fileToConvert) return;

    showConversionOverlay(
        `Convertendo: ${fileToConvert.name}`,
        `Para ${sel.value.toUpperCase()} — aguarde o Python processar`
    );
    lockAllConvertButtons(true);
    try {
        await executeWebUpload([fileToConvert], sel.value);
    } finally {
        hideConversionOverlay();
        lockAllConvertButtons(false);
    }
}

async function executeWebUpload(filesArr, dstExt) {
    const prefix = document.getElementById('web-config-prefix').value.trim();
    const folder = document.getElementById('web-config-folder').value.trim();

    // Todos os arquivos têm caminho local (vindos do drag do Nautilus)
    const paths = filesArr.map(f => f._webPath);

    try {
        const res = await fetch('/api/convert/from_paths', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ paths, dst_ext: dstExt, prefix, subfolder: folder })
        });
        const p = await res.json();
        if (p.success) {
            _onConvertSuccess(filesArr, p);
        } else {
            alert(`Conversão falhou:\n${p.error}`);
        }
    } catch(err) {
        alert('Erro ao chamar o servidor: ' + err.message);
    }
}

function _onConvertSuccess(filesArr, p) {
    const idsDone = filesArr.map(f => f._webId);
    webSelectionStaging = webSelectionStaging.filter(f => !idsDone.includes(f._webId));
    if(webSelectionStaging.length === 0) document.getElementById('web-staging-area').classList.add('hidden');
    renderWebBlocks();
    const a = document.createElement('a');
    a.href = p.download_url;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}


// ==== WEB PREVIEW MODAL ====
// Usa /api/fs/preview?path=... igual ao Local Browser (sem upload)
window.openWebPreview = function(id) {
    const entry = webSelectionStaging.find(f => f._webId === id);
    if (!entry) return;

    const m = document.getElementById('fs-preview-modal');
    m.classList.remove('hidden');
    requestAnimationFrame(() => m.classList.remove('opacity-0', 'pointer-events-none'));

    document.getElementById('fs-preview-title').textContent = entry.name;
    const c = document.getElementById('fs-preview-content');
    const url = `/api/fs/preview?path=${encodeURIComponent(entry._webPath)}`;
    c.innerHTML = _buildPreviewMedia(entry._webCat, url);
}


