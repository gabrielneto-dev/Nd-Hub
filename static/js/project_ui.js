// project_ui.js - Controle de JS do Gerenciador de Projetos

const addProjModal = document.getElementById('add-proj-modal');

window.toggleAddProjectModal = function(show) {
    if (show) {
        addProjModal.classList.remove('hidden');
    } else {
        addProjModal.classList.add('hidden');
        document.getElementById('add-proj-name').value = '';
        document.getElementById('add-proj-path').value = '';
        document.getElementById('add-proj-pre').value = '';
    }
}

window.loadProjectsGrid = async function() {
    const tbody = document.getElementById('projects-table-body');
    if (!tbody) return;
    
    tbody.innerHTML = `
        <tr>
            <td colspan="4" class="px-6 py-8 text-center text-slate-400">
                <i class="ph ph-spinner-gap animate-spin text-2xl mb-2 text-brand-500"></i>
                <p>Sincronizando SQLite...</p>
            </td>
        </tr>
    `;
    
    try {
        const res = await fetch('/api/projects/list');
        const payload = await res.json();
        
        if (payload.success) {
            renderProjects(payload.data);
        } else {
            tbody.innerHTML = `<tr><td colspan="4" class="px-6 py-4 text-center text-red-500">Erro: ${payload.error}</td></tr>`;
        }
    } catch(err) {
        tbody.innerHTML = `<tr><td colspan="4" class="px-6 py-4 text-center text-red-500">Erro de rede: ${err.message}</td></tr>`;
    }
}

function renderProjects(projects) {
    const tbody = document.getElementById('projects-table-body');
    tbody.innerHTML = '';
    
    if(projects.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" class="px-6 py-8 text-center text-slate-500">Nenhum projeto cadastrado no banco local.</td></tr>`;
        return;
    }
    
    projects.forEach(p => {
        const tr = document.createElement('tr');
        tr.className = "hover:bg-slate-50 transition-colors group";
        
        const isVal = p.is_valid;
        
        tr.innerHTML = `
            <td class="px-6 py-4 font-semibold text-slate-800">${p.name}</td>
            <td class="px-6 py-4 max-w-sm overflow-hidden text-ellipsis">
                <div class="text-xs text-slate-500 font-mono truncate" title="${p.path}">${p.path}</div>
                ${p.pre_command ? `<div class="text-[10px] text-brand-600 font-mono mt-1 px-1.5 py-0.5 bg-brand-50 inline-block rounded border border-brand-100 truncate max-w-full">hook: ${p.pre_command}</div>` : ''}
            </td>
            <td class="px-6 py-4 text-center">
                ${isVal 
                    ? '<span class="inline-flex items-center bg-green-50 text-green-700 border border-green-200 text-[10px] font-bold px-2 py-0.5 rounded-full"><i class="ph ph-check-circle mr-1"></i> OK</span>' 
                    : '<span class="inline-flex items-center bg-red-50 text-red-700 border border-red-200 text-[10px] font-bold px-2 py-0.5 rounded-full"><i class="ph ph-warning-circle mr-1"></i> Inválido</span>'}
            </td>
            <td class="px-6 py-4 text-right space-x-2">
                <button onclick="deleteProject(${p.id}, '${p.name}')" class="text-slate-400 hover:text-red-500 p-2 rounded-full hover:bg-red-50 transition opacity-0 group-hover:opacity-100" title="Esquecer Projeto"><i class="ph ph-trash"></i></button>
                <button onclick="openProject(${p.id})" class="inline-flex items-center text-sm font-medium bg-slate-800 text-white hover:bg-brand-600 px-4 py-2 rounded-lg transition-colors active:scale-95 shadow-sm" ${!isVal ? 'disabled style="opacity: 0.5; cursor: not-allowed;"' : ''}>
                    <i class="ph ph-terminal-window mr-2"></i> NVIM
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

window.saveNewProject = async function() {
    const name = document.getElementById('add-proj-name').value;
    const path = document.getElementById('add-proj-path').value;
    const pre = document.getElementById('add-proj-pre').value;
    
    if(!name || !path) {
        alert("Preencha o Nome e o Path!");
        return;
    }
    
    try {
        const res = await fetch('/api/projects/add', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({name: name, path: path, pre_command: pre})
        });
        const p = await res.json();
        
        if(p.success) {
            window.toggleAddProjectModal(false);
            window.loadProjectsGrid();
        } else {
            alert(`Erro ao salvar: ${p.error}`);
        }
    } catch(err) {
        alert(`Erro de rede: ${err.message}`);
    }
}

window.deleteProject = async function(id, name) {
    if(!confirm(`Deseja esquecer o projeto "${name}"? Fique tranquilo, isso apaga apenas o atalho do SQLite, seus arquivos continuarão intactos.`)) return;
    
    try {
        const res = await fetch(`/api/projects/delete/${id}`, { method: 'DELETE' });
        const p = await res.json();
        if(p.success) window.loadProjectsGrid();
        else alert(p.error);
    } catch(err) {
        alert(err.message);
    }
}

window.openProject = async function(id) {
    try {
        const res = await fetch(`/api/projects/open/${id}`, { method: 'POST' });
        const p = await res.json();
        if(!p.success) alert(p.error);
    } catch(err) {
        alert(err.message);
    }
}
