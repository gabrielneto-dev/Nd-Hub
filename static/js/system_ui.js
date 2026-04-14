// system_ui.js - Funções ligadas a manipulação de Host, DBus e Energia

window.requestSystemAction = async function(action, humanName) {
    // Alerta de segurança nativo pro navegador interceptar toques falsos
    if (!confirm(`TEM CERTEZA que deseja invocar: ${humanName}?`)) {
        return;
    }

    try {
        const response = await fetch('/api/system/action', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ action: action })
        });
        
        const payload = await response.json();
        if (payload.success) {
            alert(payload.message || `Sinal enviado: ${humanName} em andamento...`);
        } else {
            alert(`Falha: ${payload.error}`);
        }
    } catch(err) {
        alert(`Erro de conexão com o painel: ${err.message}`);
    }
}
