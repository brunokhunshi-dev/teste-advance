import { initializeApp } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-app.js";
import { getFirestore, collection, getDocs, doc, setDoc, updateDoc } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-firestore.js";

const firebaseConfig = {

};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

let visitaSelecionadaId = null;
let abaAtiva = 'inicio';
let cacheVisitas = [];
let cacheRelatorios = [];

window.mudarAba = function(aba) {
    abaAtiva = aba;
    document.getElementById('aba-inicio').style.display = 'none';
    document.getElementById('aba-historico').style.display = 'none';
    document.getElementById('nav-btn-inicio').classList.remove('active');
    document.getElementById('nav-btn-historico').classList.remove('active');
    document.getElementById('aba-' + aba).style.display = 'flex';
    document.getElementById('nav-btn-' + aba).classList.add('active');
    document.querySelector('#aba-' + aba + ' .content').scrollTo(0, 0);
};

window.abrirTelaInterna = function(idTela) {
    document.getElementById(idTela).style.display = 'block';
    document.getElementById(idTela).scrollTo(0, 0);
};

window.fecharTelaInterna = function() {
    document.querySelectorAll('.tela-interna').forEach(el => el.style.display = 'none');
    visitaSelecionadaId = null;
    mudarAba(abaAtiva);
    carregarDadosDoFirebase();
};

window.voltarDoRelatorio = function() {
    document.getElementById('tela-relatorio').style.display = 'none';
    const visita = cacheVisitas.find(v => v.id === visitaSelecionadaId);
    if (visita && visita.status === 'concluida') fecharTelaInterna();
};

window.iniciarCheckin = function(visitaId) {
    visitaSelecionadaId = visitaId;
    const visita = cacheVisitas.find(v => v.id === visitaId);
    if (!visita) return;

    document.getElementById('conf-cliente').textContent = visita.cliente;
    document.getElementById('conf-gestor').textContent = 'Eric Maxwell Lima';
    document.getElementById('conf-tecnico').textContent = 'Jean Felipe Moraes';
    document.getElementById('img-cliente').src = `https://ui-avatars.com/api/?name=${encodeURIComponent(visita.cliente)}&background=random&color=fff`;
    document.getElementById('img-gestor').src = 'https://ui-avatars.com/api/?name=Eric+Maxwell&background=e2e8f0&color=333';
    document.getElementById('img-tecnico').src = 'https://ui-avatars.com/api/?name=Jean+Felipe&background=e2e8f0&color=333';

    const agora = new Date();
    document.getElementById('conf-data').textContent = `${agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} | ${agora.toLocaleDateString('pt-BR')}`;
    abrirTelaInterna('tela-confirmacao');
};

window.confirmarCheckin = async function() {
    await updateDoc(doc(db, 'visitas', visitaSelecionadaId), {
        status: 'em_andamento',
        dataCheckin: new Date().toISOString()
    });
    document.getElementById('tela-confirmacao').style.display = 'none';
    await carregarDadosDoFirebase();
    abrirTelaVisitaAtual(visitaSelecionadaId);
};

window.abrirTelaVisitaAtual = function(visitaId) {
    visitaSelecionadaId = visitaId;
    const visita = cacheVisitas.find(v => v.id === visitaId);
    if (!visita) return;
    const relatorioExistente = cacheRelatorios.find(r => r.visitaId === visita.id);
    document.getElementById('va-cliente-nome').textContent = visita.cliente;
    const dataObj = new Date(visita.dataCheckin || visita.data);
    const dataStr = dataObj.toLocaleDateString('pt-BR');
    const horaStr = dataObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    document.getElementById('va-data').value = dataStr;
    document.getElementById('va-hora').value = horaStr;

    let htmlTimeline = `<div class="timeline-container"><div class="log-item"><div class="log-dot-gray"></div><div><div class="log-header"><span class="log-title">Check-in</span><span class="log-time">${horaStr}</span></div><p class="log-desc">Jean Felipe Moraes chegou a ${visita.cliente} às ${horaStr} do dia ${dataStr}.</p></div></div>`;
    const areaBotao = document.getElementById('va-area-botao');
    if (relatorioExistente) {
        const horaRel = new Date(relatorioExistente.dataCriacao).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        htmlTimeline += `<div class="log-item"><div class="log-dot"></div><div><div class="log-header"><span class="log-title">Relatório adicionado</span><span class="log-time">${horaRel}</span></div><p class="log-desc">Jean Felipe escreveu o relatório ${relatorioExistente.codigo}.</p><button class="btn btn-secundario btn-pequeno" onclick="abrirTelaRelatorio()">Ver ou editar relatório</button></div></div>`;
        areaBotao.innerHTML = '<button class="btn btn-primario" onclick="encerrarVisita()">Encerrar visita</button>';
    } else {
        areaBotao.innerHTML = '<button class="btn btn-primario" onclick="abrirTelaRelatorio()">Escrever relatório</button>';
    }
    document.getElementById('va-area-timeline').innerHTML = htmlTimeline + '</div>';
    abrirTelaInterna('tela-visita-atual');
};

window.abrirTelaRelatorio = function() {
    const visita = cacheVisitas.find(v => v.id === visitaSelecionadaId);
    if (!visita) return;
    const relatorioExistente = cacheRelatorios.find(r => r.visitaId === visita.id);
    const dataObj = new Date(visita.dataCheckin || visita.data);
    const ano = dataObj.getFullYear();
    const mes = String(dataObj.getMonth() + 1).padStart(2, '0');
    const dia = String(dataObj.getDate()).padStart(2, '0');
    document.getElementById('rel-titulo').textContent = `Relatório - ${visita.cliente}`;
    document.getElementById('rel-codigo').textContent = relatorioExistente ? relatorioExistente.codigo : `#${ano}${mes}${dia}JFM`;
    document.getElementById('rel-chegada-data').value = dataObj.toLocaleDateString('pt-BR');
    document.getElementById('rel-chegada-hora').value = dataObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    document.getElementById('rel-select-cliente').innerHTML = `<option>${visita.cliente}</option>`;
    const textarea = document.getElementById('rel-texto');
    textarea.value = relatorioExistente ? relatorioExistente.texto : '';
    textarea.readOnly = visita.status === 'concluida';
    document.getElementById('rel-area-acoes').style.display = visita.status === 'concluida' ? 'none' : 'flex';
    abrirTelaInterna('tela-relatorio');
};

window.salvarRelatorio = async function() {
    const texto = document.getElementById('rel-texto').value.trim();
    if (!texto) return alert('Escreva algo no relatório.');
    const visita = cacheVisitas.find(v => v.id === visitaSelecionadaId);
    const relatorioExistente = cacheRelatorios.find(r => r.visitaId === visitaSelecionadaId);
    if (relatorioExistente) {
        await updateDoc(doc(db, 'relatorios', relatorioExistente.id), { texto, dataCriacao: new Date().toISOString() });
    } else {
        const novoId = 'rel_' + Date.now();
        await setDoc(doc(db, 'relatorios', novoId), { id: novoId, codigo: document.getElementById('rel-codigo').textContent, visitaId: visita.id, tecnicoId: 't1', cliente: visita.cliente, texto, dataCriacao: new Date().toISOString() });
    }
    await carregarDadosDoFirebase();
    document.getElementById('tela-relatorio').style.display = 'none';
    abrirTelaVisitaAtual(visitaSelecionadaId);
};

window.encerrarVisita = async function() {
    await updateDoc(doc(db, 'visitas', visitaSelecionadaId), { status: 'concluida' });
    await carregarDadosDoFirebase();
    fecharTelaInterna();
};

// Mantém a função de carga de dados disponível para uso administrativo, sem exibir o banco na interface.
window.popularBancoFirebase = async function() {
    try {
        await setDoc(doc(db, 'visitas', 'v1'), { id: 'v1', cliente: 'Sul Color Tintas', endereco: 'Rua Alfredo Tomás, 542 - Campinas', data: '2026-10-03T10:00:00', tecnicoId: 't1', status: 'pendente' });
        await setDoc(doc(db, 'visitas', 'v2'), { id: 'v2', cliente: 'Tintas do Luis', endereco: 'Av. Presidente Vargas, 100 - Indaiatuba', data: '2026-10-07T11:00:00', tecnicoId: 't1', status: 'pendente' });
        await setDoc(doc(db, 'visitas', 'v3'), { id: 'v3', cliente: 'Amaral Cores', endereco: 'Rua Treze de Maio, 45 - Centro', data: '2026-09-25T14:00:00', tecnicoId: 't1', status: 'concluida' });
        await setDoc(doc(db, 'relatorios', 'rel_1'), { id: 'rel_1', codigo: '#20260925JFM', visitaId: 'v3', tecnicoId: 't1', cliente: 'Amaral Cores', texto: 'Troca do filtro realizada com sucesso.', dataCriacao: '2026-09-25T16:00:00' });
        alert('Dados populados com sucesso no Firebase!');
        carregarDadosDoFirebase();
    } catch (e) { alert('Erro ao popular: ' + e.message); }
};

async function carregarDadosDoFirebase() {
    try {
        const queryVisitas = await getDocs(collection(db, 'visitas'));
        cacheVisitas = [];
        queryVisitas.forEach(snapshot => cacheVisitas.push(snapshot.data()));
        const queryRelatorios = await getDocs(collection(db, 'relatorios'));
        cacheRelatorios = [];
        queryRelatorios.forEach(snapshot => cacheRelatorios.push(snapshot.data()));
        // O Firestore continua sendo usado normalmente; apenas o painel visualizador foi removido.
        renderizarAbasApp();
    } catch (e) {
        console.error('Erro ao ler do Firebase:', e);
        document.getElementById('lista-visitas-pendentes').innerHTML = '<p>Não foi possível carregar as visitas.</p>';
    }
}

function renderizarAbasApp() {
    const divPendentes = document.getElementById('lista-visitas-pendentes');
    const divConcluidas = document.getElementById('lista-visitas-concluidas');
    divPendentes.innerHTML = '';
    divConcluidas.innerHTML = '';
    const minhasVisitas = cacheVisitas.filter(v => v.tecnicoId === 't1');
    const visitasAtivas = minhasVisitas.filter(v => v.status !== 'concluida');
    if (!visitasAtivas.length) divPendentes.innerHTML = '<p>Nenhuma visita pendente.</p>';
    visitasAtivas.forEach(visita => {
        const andamento = visita.status === 'em_andamento';
        const btn = andamento ? `<button class="btn btn-pequeno" style="background-color:#333;color:white" onclick="abrirTelaVisitaAtual('${visita.id}')">Continuar visita</button>` : `<button class="btn btn-primario btn-pequeno" onclick="iniciarCheckin('${visita.id}')">Fazer check-in</button>`;
        divPendentes.innerHTML += `<div class="card"><span class="badge ${andamento ? 'badge-andamento' : 'badge-pendente'}">${andamento ? 'Em andamento' : 'Pendente'}</span><h3>${visita.cliente}</h3><p>${visita.endereco}</p>${btn}</div>`;
    });
    const finalizadas = minhasVisitas.filter(v => v.status === 'concluida');
    if (!finalizadas.length) divConcluidas.innerHTML = '<p>Nenhum histórico encontrado.</p>';
    finalizadas.forEach(visita => {
        divConcluidas.innerHTML += `<div class="card"><span class="badge badge-concluida">Concluída</span><h3>${visita.cliente}</h3><p>Data: ${new Date(visita.data).toLocaleDateString('pt-BR')}</p><button class="btn btn-secundario btn-pequeno" onclick="visitaSelecionadaId='${visita.id}'; abrirTelaRelatorio()">Consultar relatório</button></div>`;
    });
}

carregarDadosDoFirebase();
