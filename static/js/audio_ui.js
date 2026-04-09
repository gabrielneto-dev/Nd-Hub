// audio_ui.js - Lógica específica para controle de áudio iterativo

let rawAudioDevices = [];
let currentAudioDevices = [];
let showArchived = false;
let editingDeviceId = null;

async function loadAudioDevices() {
    if (!audioDevicesGrid) return;
    audioDevicesGrid.innerHTML = `
        <div class="col-span-full py-12 text-center text-slate-400">
            <i class="ph ph-spinner-gap animate-spin text-3xl mb-3 text-brand-500"></i>
            <p>Mapeando dispositivos de áudio...</p>
        </div>
    `;
    try {
        const res = await fetch('/api/audio/list');
        const p = await res.json();
        if(p.success) {
            rawAudioDevices = p.data;
            filterAndRenderAudioDevices();
        } else {
            audioDevicesGrid.innerHTML = `<p class="col-span-full text-red-500">Erro: ${p.error}</p>`;
        }
    } catch(e) {
        audioDevicesGrid.innerHTML = `<p class="col-span-full text-red-500">Erro na requisição: ${e.message}</p>`;
    }
}

window.toggleArchived = function(checkbox) {
    showArchived = checkbox.checked;
    filterAndRenderAudioDevices();
}

function filterAndRenderAudioDevices() {
    if(!rawAudioDevices) return;
    currentAudioDevices = showArchived ? rawAudioDevices : rawAudioDevices.filter(d => !d.archived);
    renderAudioDevices();
}

// Global exposure for onclick handlers
window.renderAudioDevices = function() {
    if (!audioDevicesGrid) return;
    audioDevicesGrid.innerHTML = '';
    if(!currentAudioDevices || currentAudioDevices.length === 0) {
        audioDevicesGrid.innerHTML = `<p class="col-span-full text-slate-500 py-6 text-center">Nenhum dispositivo a exibir.</p>`;
        return;
    }

    currentAudioDevices.forEach((dev, idx) => {
        const uniqueId = dev.id_sink + "::" + dev.id_porta;
        const isEditing = editingDeviceId === uniqueId;
        const isActive = dev.ativo;
        const isArchived = dev.archived;
        const shortcutNum = idx + 1;
        
        const displayName = dev.alias || dev.modo;
        const displayDesc = dev.alias ? dev.modo + " • " + dev.dispositivo : dev.dispositivo;
        
        const card = document.createElement('div');
        card.className = `tool-card relative rounded-2xl p-5 border ${isActive ? 'border-brand-500 bg-brand-50 text-brand-900 shadow-sm' : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'} ${isArchived ? 'opacity-50 grayscale hover:grayscale-0' : ''} flex flex-col justify-center min-h-[100px] transition-all`;
        
        if (isEditing) {
            card.innerHTML = `
                <div class="flex flex-col space-y-3 w-full" onclick="event.stopPropagation()">
                    <div>
                        <label class="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Apelido (Alias)</label>
                        <input type="text" id="edit-alias-${idx}" value="${dev.alias || ''}" placeholder="${dev.modo}" class="w-full mt-1 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-brand-500 focus:border-brand-500 focus:outline-none transition-shadow shadow-sm">
                    </div>
                    <label class="flex items-center space-x-2 text-sm text-slate-600 cursor-pointer select-none">
                        <input type="checkbox" id="edit-archived-${idx}" ${isArchived ? 'checked' : ''} class="rounded border-slate-300 text-brand-500 focus:ring-brand-500">
                        <span>Arquivar/Ocultar Placa</span>
                    </label>
                    <div class="flex space-x-2 pt-2">
                        <button onclick="saveAudioPrefs('${uniqueId}', ${idx})" class="flex-1 bg-brand-600 text-white text-xs font-medium py-2 rounded-lg hover:bg-brand-700 transition active:scale-95">Salvar</button>
                        <button onclick="editingDeviceId=null; renderAudioDevices()" class="flex-1 bg-slate-200 text-slate-700 text-xs font-medium py-2 rounded-lg hover:bg-slate-300 transition active:scale-95">Cancelar</button>
                    </div>
                </div>
            `;
        } else {
            card.onclick = () => setAudioDevice(dev);
            card.innerHTML = `
                <div class="absolute top-2 right-2 flex items-center space-x-1">
                    ${isActive ? '<span class="flex h-2 w-2 relative mr-2"><span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-400 opacity-75"></span><span class="relative inline-flex rounded-full h-2 w-2 bg-brand-500"></span></span>' : ''}
                    <button onclick="event.stopPropagation(); window.setEditingDevice('${uniqueId}')" class="text-slate-400 hover:text-brand-600 focus:outline-none p-1.5 rounded-full hover:bg-brand-50 transition active:bg-brand-100"><i class="ph ph-gear"></i></button>
                    <kbd class="px-1.5 py-0.5 ${isActive ? 'bg-brand-200 text-brand-700' : 'bg-slate-100 text-slate-400'} rounded text-[10px] font-mono leading-none border ${isActive ? 'border-brand-300' : 'border-slate-200'} ${isArchived ? 'hidden' : ''}">${shortcutNum}</kbd>
                </div>
                
                <div class="flex items-center space-x-4 w-full">
                    <div class="${isActive ? 'text-brand-600' : 'text-slate-400'} text-3xl">
                        <i class="${dev.modo.toLowerCase().includes('headphone') ? 'ph ph-headphones' : 'ph ph-speaker-hifi'} ${isArchived ? 'opacity-50' : ''}"></i>
                    </div>
                    <div class="flex-1 overflow-hidden pr-6">
                        <p class="text-[11px] uppercase font-bold tracking-wider ${isActive ? 'text-brand-600' : 'text-slate-400'} mb-1 truncate">${displayName}</p>
                        <h4 class="font-medium text-sm leading-tight text-slate-500 truncate" title="${displayDesc}">${displayDesc}</h4>
                        <div class="w-full bg-slate-200 rounded-full h-1 mt-2.5">
                            <div class="${isActive ? 'bg-brand-500' : 'bg-slate-400'} h-1 rounded-full transition-all duration-500" style="width: ${Math.min(dev.volume, 100)}%"></div>
                        </div>
                    </div>
                </div>
            `;
        }
        audioDevicesGrid.appendChild(card);
    });
}

window.setEditingDevice = function(id) {
    editingDeviceId = id;
    renderAudioDevices();
}

window.saveAudioPrefs = async function(uniqueId, idx) {
    const aliasVal = document.getElementById('edit-alias-' + idx).value;
    const archivedVal = document.getElementById('edit-archived-' + idx).checked;
    
    try {
        const res = await fetch('/api/audio/prefs', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({id: uniqueId, alias: aliasVal, archived: archivedVal})
        });
        if(res.ok) {
            editingDeviceId = null;
            await loadAudioDevices();
        } else {
            alert('Falha ao salvar preferências');
        }
    } catch(e) {
        alert('Erro na rede: ' + e.message);
    }
}

async function setAudioDevice(dev) {
    audioDevicesGrid.innerHTML = `
        <div class="col-span-full py-12 text-center text-slate-400">
            <i class="ph ph-spinner-gap animate-spin text-3xl mb-3 text-brand-500"></i>
            <p>Ativando ${dev.modo}...</p>
        </div>
    `;
    try {
        const res = await fetch('/api/audio/set', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({id_sink: dev.id_sink, id_porta: dev.id_porta})
        });
        const payload = await res.json();
        if(payload.success) {
            await loadAudioDevices(); 
        } else {
            alert('Erro ao alterar áudio: ' + payload.error);
            await loadAudioDevices();
        }
    } catch(e) {
        alert('Erro de conexão: ' + e.message);
        await loadAudioDevices();
    }
}

window.handleAudioShortcuts = function(e) {
    if(e.target.tagName === 'INPUT') return;
    
    const num = parseInt(e.key);
    if(!isNaN(num) && num > 0 && num <= 9) {
        const devIndex = num - 1;
        if(currentAudioDevices && currentAudioDevices[devIndex]) {
            setAudioDevice(currentAudioDevices[devIndex]);
        }
    }
}
