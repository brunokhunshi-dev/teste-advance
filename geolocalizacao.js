const GEO_STYLE = `
.geo-location-button { margin: 0 0 20px; display:flex; align-items:center; justify-content:center; gap:8px; }
.geo-modal { position:fixed; inset:0; z-index:3000; display:none; align-items:flex-end; justify-content:center; background:rgba(10,10,25,.48); padding:16px; }
.geo-modal.is-open { display:flex; }
.geo-card { width:min(100%, 430px); background:#fff; border-radius:24px; padding:24px 20px calc(20px + env(safe-area-inset-bottom)); box-shadow:0 10px 40px rgba(0,0,0,.2); animation:geo-slide-up .2s ease-out; }
.geo-card h2 { margin:0 0 8px; font-size:1.25rem; }
.geo-card p { color:#70717c; line-height:1.45; margin:8px 0; }
.geo-coordinates { background:#f1f2f5; border-radius:12px; padding:12px; font-weight:700; color:#10101d !important; word-break:break-word; }
.geo-address { min-height:24px; }
.geo-actions { display:flex; gap:10px; margin-top:18px; }
.geo-actions .btn { flex:1; text-align:center; text-decoration:none; }
.geo-loading { color:#70717c; }
@keyframes geo-slide-up { from { transform:translateY(18px); opacity:0; } to { transform:translateY(0); opacity:1; } }
`;

document.head.appendChild(Object.assign(document.createElement('style'), { textContent: GEO_STYLE }));

function createLocationUI() {
    const content = document.querySelector('#aba-inicio .content');
    if (!content || document.getElementById('btn-testar-localizacao')) return;

    const button = document.createElement('button');
    button.id = 'btn-testar-localizacao';
    button.className = 'btn btn-secundario geo-location-button';
    button.type = 'button';
    button.innerHTML = '📍 Testar minha localização';
    button.addEventListener('click', obterLocalizacao);
    content.insertBefore(button, document.getElementById('lista-visitas-pendentes'));

    const modal = document.createElement('div');
    modal.id = 'geo-modal';
    modal.className = 'geo-modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.innerHTML = `
        <section class="geo-card" aria-labelledby="geo-title">
            <h2 id="geo-title">Sua localização</h2>
            <p id="geo-status" class="geo-loading">Obtendo coordenadas...</p>
            <p id="geo-coordinates" class="geo-coordinates" hidden></p>
            <p id="geo-address" class="geo-address">Buscando endereço aproximado...</p>
            <div class="geo-actions">
                <a id="geo-maps-link" class="btn btn-primario" href="#" target="_blank" rel="noopener" hidden>Ver no Google Maps</a>
                <button id="geo-close" class="btn btn-secundario" type="button">Fechar</button>
            </div>
        </section>`;
    document.body.appendChild(modal);
    document.getElementById('geo-close').addEventListener('click', fecharLocalizacao);
    modal.addEventListener('click', event => { if (event.target === modal) fecharLocalizacao(); });
}

function abrirLocalizacao() { document.getElementById('geo-modal').classList.add('is-open'); }
function fecharLocalizacao() { document.getElementById('geo-modal').classList.remove('is-open'); }
function setGeoMessage(id, message) { document.getElementById(id).textContent = message; }

async function obterEndereco(latitude, longitude) {
    try {
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`, {
            headers: { Accept: 'application/json' }
        });
        if (!response.ok) throw new Error('Falha no endereço');
        const data = await response.json();
        return data.display_name || 'Endereço não encontrado para estas coordenadas.';
    } catch (error) {
        return 'Não foi possível obter o endereço. As coordenadas continuam disponíveis.';
    }
}

function obterLocalizacao() {
    abrirLocalizacao();
    const status = document.getElementById('geo-status');
    const coordinates = document.getElementById('geo-coordinates');
    const address = document.getElementById('geo-address');
    const mapsLink = document.getElementById('geo-maps-link');
    status.textContent = 'Solicitando acesso à localização...';
    coordinates.hidden = true;
    mapsLink.hidden = true;
    address.textContent = 'Buscando endereço aproximado...';

    if (!window.isSecureContext || !navigator.geolocation) {
        status.textContent = 'A localização exige HTTPS (ou localhost) e um navegador compatível.';
        address.textContent = '';
        return;
    }

    navigator.geolocation.getCurrentPosition(async position => {
        const { latitude, longitude, accuracy } = position.coords;
        const lat = latitude.toFixed(6);
        const lon = longitude.toFixed(6);
        status.textContent = `Precisão estimada: ${Math.round(accuracy)} metros.`;
        coordinates.textContent = `Latitude: ${lat} | Longitude: ${lon}`;
        coordinates.hidden = false;
        mapsLink.href = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
        mapsLink.hidden = false;
        address.textContent = 'Buscando endereço aproximado...';
        address.textContent = await obterEndereco(latitude, longitude);
    }, error => {
        const messages = {
            1: 'Permissão de localização negada. Autorize o acesso nas configurações do navegador.',
            2: 'Não foi possível determinar sua localização.',
            3: 'A solicitação demorou demais. Tente novamente.'
        };
        status.textContent = messages[error.code] || 'Não foi possível obter sua localização.';
        address.textContent = '';
    }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 });
}

document.addEventListener('DOMContentLoaded', createLocationUI);
