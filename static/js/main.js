// main.js - Controle Central e SPA da Interface ND Hub

let allTools = [];
let currentActiveTool = null;

const homeView = document.getElementById('home-view');
const toolView = document.getElementById('tool-view');
const toolsGrid = document.getElementById('tools-grid');

// Custom UI Areas
const cliActionArea = document.getElementById('cli-action-area');
const cliConsoleArea = document.getElementById('cli-console-area');
const audioUiArea = document.getElementById('audio-ui-area');
const audioDevicesGrid = document.getElementById('audio-devices-grid');
const systemUiArea = document.getElementById('system-ui-area');
const projectUiArea = document.getElementById('project-ui-area');
const convertUiArea = document.getElementById('convert-ui-area');
const duckingUiArea = document.getElementById('ducking-ui-area');

// Tool View Elements
const sidebarIcon = document.getElementById('sidebar-tool-icon');
const sidebarName = document.getElementById('sidebar-tool-name');
const sidebarCmd = document.getElementById('sidebar-tool-cmd');
const contentName = document.getElementById('content-tool-name');
const contentDesc = document.getElementById('content-tool-desc');
const runBtn = document.getElementById('run-btn');
const outputConsole = document.getElementById('output-console');
const clearTermBtn = document.getElementById('clear-term-btn');

function getIconClass(iconName) {
    return `ph ph-${iconName}`;
}

async function fetchTools() {
    try {
        const response = await fetch('/api/tools');
        const data = await response.json();
        allTools = data;
        renderTools(data);
    } catch (error) {
        toolsGrid.innerHTML = `
            <div class="col-span-full py-10 px-6 bg-red-50 border border-red-100 rounded-2xl text-red-600 flex items-center">
                <i class="ph ph-warning-circle text-2xl mr-3"></i>
                <p>Erro ao carregar ferramentas do servidor. Certifique-se de que o backend está rodando.</p>
            </div>
        `;
        console.error("Erro no fetch tools:", error);
    }
}

function renderTools(tools) {
    toolsGrid.innerHTML = ''; 
    
    if(tools.length === 0) {
        toolsGrid.innerHTML = `<p class="col-span-full text-center text-slate-500 py-10">Nenhuma ferramenta encontrada em tools.json.</p>`;
        return;
    }

    tools.forEach((tool, idx) => {
        const shortcutNum = idx < 9 ? (idx + 1) : '';
        const card = document.createElement('div');
        card.className = "tool-card relative bg-white rounded-[20px] p-6 border border-slate-100 cursor-pointer shadow-card flex flex-col h-full hover:border-brand-300 transition-colors";
        card.onclick = () => openTool(tool.id);
        
        let shortcutHtml = shortcutNum ? `<div class="absolute top-5 right-5"><kbd class="px-2 py-1 bg-slate-100 text-slate-400 rounded text-xs font-mono border border-slate-200 shadow-sm">${shortcutNum}</kbd></div>` : '';

        card.innerHTML = `
            ${shortcutHtml}
            <div class="w-12 h-12 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center text-2xl mb-5">
                <i class="${getIconClass(tool.icon)}"></i>
            </div>
            <h3 class="text-lg font-bold text-slate-800 mb-2 leading-snug">${tool.name}</h3>
            <p class="text-slate-500 text-sm leading-relaxed flex-1">${tool.description}</p>
        `;
        toolsGrid.appendChild(card);
    });
}

window.handleHomeShortcuts = function(e) {
    if (homeView.classList.contains('hidden-view') || e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    const num = parseInt(e.key);
    if (!isNaN(num) && num > 0 && num <= 9) {
        const toolIndex = num - 1;
        if (allTools && allTools[toolIndex]) {
            openTool(allTools[toolIndex].id);
        }
    }
};

document.addEventListener('keydown', window.handleHomeShortcuts);

function hideAllSections() {
    const areas = [cliActionArea, cliConsoleArea, audioUiArea, systemUiArea, projectUiArea, convertUiArea, duckingUiArea];
    areas.forEach(area => {
        if (area) area.classList.add('hidden-view');
    });
}

function openTool(toolId) {
    const tool = allTools.find(t => t.id === toolId);
    if(!tool) return;
    currentActiveTool = tool;

    sidebarIcon.innerHTML = `<i class="${getIconClass(tool.icon)}"></i>`;
    sidebarName.textContent = tool.name;
    sidebarCmd.textContent = tool.command || 'N/A';
    
    contentName.textContent = tool.name;
    contentDesc.textContent = tool.description;

    // View Toggling & Setup
    if (typeof handleAudioShortcuts !== 'undefined') {
        document.removeEventListener('keydown', handleAudioShortcuts);
    }
    
    // Reset all views first to avoid overlaps
    hideAllSections();

    if (tool.type === 'audio') {
        if (audioUiArea) audioUiArea.classList.remove('hidden-view');
        if (typeof loadAudioDevices === 'function') {
            loadAudioDevices();
            document.addEventListener('keydown', handleAudioShortcuts);
        }
    } else if (tool.type === 'system') {
        if (systemUiArea) systemUiArea.classList.remove('hidden-view');
    } else if (tool.type === 'project') {
        if (projectUiArea) projectUiArea.classList.remove('hidden-view');
        if (typeof window.loadProjectsGrid === 'function') {
            window.loadProjectsGrid();
        }
    } else if (tool.type === 'convert') {
        if (convertUiArea) convertUiArea.classList.remove('hidden-view');
        if (typeof window.initConvertApp === 'function') {
            window.initConvertApp();
        }
    } else if (tool.type === 'ducking') {
        if (duckingUiArea) duckingUiArea.classList.remove('hidden-view');
        if (typeof window.initDuckingUI === 'function') {
            window.initDuckingUI();
        }
    } else {
        if (cliActionArea) cliActionArea.classList.remove('hidden-view');
        if (cliConsoleArea) cliConsoleArea.classList.remove('hidden-view');
        outputConsole.innerHTML = `<span class="text-slate-500">Pronto para rodar \`${tool.id}\`...</span>\n\nAguardando clique.`;
        runBtn.onclick = () => runActiveTool();
    }

    homeView.classList.add('fade-exit');
    setTimeout(() => {
        homeView.classList.add('hidden-view');
        homeView.classList.remove('fade-exit');
        
        toolView.classList.remove('hidden-view');
        void toolView.offsetWidth;
        toolView.classList.add('fade-enter-active');
    }, 200);
}

function goHome() {
    currentActiveTool = null;
    if (typeof handleAudioShortcuts !== 'undefined') {
        document.removeEventListener('keydown', handleAudioShortcuts);
    }
    
    toolView.classList.remove('fade-enter-active');
    toolView.classList.add('fade-exit-active');
    
    setTimeout(() => {
        toolView.classList.add('hidden-view');
        toolView.classList.remove('fade-exit-active');
        
        homeView.classList.remove('hidden-view');
        void homeView.offsetWidth;
        homeView.classList.add('fade-enter-active');
        
        setTimeout(() => {
            homeView.classList.remove('fade-enter-active');
        }, 300);
    }, 200);
}

async function runActiveTool() {
    if(!currentActiveTool) return;
    
    const btnText = runBtn.querySelector('.btn-text');
    const icon = runBtn.querySelector('i');
    const originalText = btnText.textContent;
    
    runBtn.disabled = true;
    btnText.textContent = "Executando...";
    icon.className = "ph ph-spinner-gap animate-spin ml-2";
    runBtn.classList.replace('bg-brand-600', 'bg-slate-400');
    
    appendOutput(`\n> Iniciando execução: ${currentActiveTool.id}\n> Comando: ${currentActiveTool.command}\n----------------------------------------\n\n`, 'text-blue-400');

    try {
        const response = await fetch(`/api/run/${currentActiveTool.id}`, {
            method: 'POST'
        });
        const result = await response.json();
        
        if (result.success) {
            appendOutput(result.output, 'text-green-400');
            if (result.error && result.error.trim().length > 0) {
                appendOutput(`\n[Aviso stderr]:\n${result.error}`, 'text-yellow-400');
            }
            appendOutput(`\n----------------------------------------\n[Concluído com sucesso]`, 'text-green-500 font-bold');
        } else {
            appendOutput(`ERRO na execução:\n${result.error}`, 'text-red-400');
        }
    } catch (err) {
        appendOutput(`ERRO de rede ou servidor:\n${err.message}`, 'text-red-500');
    } finally {
        runBtn.disabled = false;
        btnText.textContent = originalText;
        icon.className = "ph ph-play ml-2";
        runBtn.classList.replace('bg-slate-400', 'bg-brand-600');
    }
}

function appendOutput(text, className = 'text-slate-300') {
    const span = document.createElement('span');
    span.className = className;
    span.textContent = text;
    outputConsole.appendChild(span);
    
    const container = outputConsole.parentElement;
    container.scrollTop = container.scrollHeight;
}

if (clearTermBtn) {
    clearTermBtn.onclick = () => {
         outputConsole.innerHTML = '<span class="text-slate-500">Terminal limpo.</span>';
    };
}

document.addEventListener('DOMContentLoaded', fetchTools);
