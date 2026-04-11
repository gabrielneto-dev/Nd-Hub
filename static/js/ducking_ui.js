// ducking_ui.js - Controle de volume de atenuação Spotify

const duckingVolumeSlider = document.getElementById('ducking-volume-slider');
const duckingVolumeBadge = document.getElementById('ducking-volume-badge');
const saveDuckingBtn = document.getElementById('save-ducking-btn');

async function initDuckingUI() {
    try {
        const response = await fetch('/api/audio/ducking/config');
        const result = await response.json();
        
        if (result.success && result.data) {
            const volBaixo = parseFloat(result.data.volume_baixo) * 100;
            duckingVolumeSlider.value = Math.round(volBaixo);
            updateDuckingBadge(duckingVolumeSlider.value);
        }
    } catch (err) {
        console.error("Erro ao carregar config de ducking:", err);
    }
}

function updateDuckingBadge(val) {
    duckingVolumeBadge.textContent = `${val}%`;
}

duckingVolumeSlider.addEventListener('input', (e) => {
    updateDuckingBadge(e.target.value);
});

saveDuckingBtn.addEventListener('click', async () => {
    const volume = parseInt(duckingVolumeSlider.value);
    
    // Feedback visual imediato
    const originalText = saveDuckingBtn.innerHTML;
    saveDuckingBtn.disabled = true;
    saveDuckingBtn.innerHTML = '<i class="ph ph-spinner-gap animate-spin text-xl"></i><span>Salvando...</span>';
    saveDuckingBtn.classList.replace('bg-brand-600', 'bg-slate-400');

    try {
        const response = await fetch('/api/audio/ducking/volume', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ volume })
        });
        
        const result = await response.json();
        if (result.success) {
            saveDuckingBtn.innerHTML = '<i class="ph ph-check text-xl"></i><span>Configuração Aplicada!</span>';
            saveDuckingBtn.classList.replace('bg-slate-400', 'bg-green-600');
            
            setTimeout(() => {
                saveDuckingBtn.innerHTML = originalText;
                saveDuckingBtn.classList.replace('bg-green-600', 'bg-brand-600');
                saveDuckingBtn.disabled = false;
            }, 2000);
        } else {
            throw new Error(result.error);
        }
    } catch (err) {
        console.error("Erro ao salvar volume de ducking:", err);
        saveDuckingBtn.innerHTML = '<i class="ph ph-warning-circle text-xl"></i><span>Erro ao Salvar</span>';
        saveDuckingBtn.classList.replace('bg-slate-400', 'bg-red-600');
        
        setTimeout(() => {
            saveDuckingBtn.innerHTML = originalText;
            saveDuckingBtn.classList.replace('bg-red-600', 'bg-brand-600');
            saveDuckingBtn.disabled = false;
        }, 3000);
    }
});

// Tornar global para acesso pelo main.js se necessário
window.initDuckingUI = initDuckingUI;
