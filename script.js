const rfItems = [
  { id: 'calibragem-pneus', name: 'Calibragem dos pneus', description: 'Registrar a pressão de cada pneu e verificar os limites', category: 'manutencao' },
  { id: 'cortes-rasgos-bolhas', name: 'Cortes, rasgos e bolhas', description: 'Registrar a condição de cada pneu', category: 'manutencao' },
  { id: 'desgaste-pneus', name: 'Desgaste dos pneus', description: 'Registrar e avaliar a condição', category: 'manutencao' },
  { id: 'freios', name: 'Freios', description: 'Registrar o resultado da verificação', category: 'seguranca' },
  { id: 'direcao', name: 'Direção', description: 'Registrar o resultado da verificação', category: 'operacao' },
  { id: 'nivel-oleo', name: 'Nível de óleo', description: 'Registrar a medição e verificar o limite', category: 'manutencao' },
  { id: 'liquido-arrefecimento', name: 'Líquido de arrefecimento', description: 'Registrar e verificar a condição', category: 'manutencao' },
  { id: 'vazamentos', name: 'Vazamentos', description: 'Registrar a ocorrência', category: 'manutencao' },
  { id: 'iluminacao', name: 'Iluminação', description: 'Registrar cada item como conforme ou não conforme', category: 'seguranca' },
  { id: 'buzina', name: 'Buzina', description: 'Registrar o resultado do teste', category: 'seguranca' },
  { id: 'giroflex', name: 'Giroflex', description: 'Registrar o resultado do teste', category: 'seguranca' },
  { id: 'estrutura-chassi', name: 'Estrutura/chassi', description: 'Registrar danos ou anormalidades', category: 'manutencao' },
  { id: 'cacamba-implemento', name: 'Caçamba/implemento', description: 'Registrar a condição', category: 'manutencao' },
  { id: 'cinto-seguranca', name: 'Cinto de segurança', description: 'Registrar a verificação', category: 'seguranca' },
  { id: 'extintor', name: 'Extintor', description: 'Registrar validade e condição', category: 'seguranca' },
  { id: 'camera-re', name: 'Câmera de ré', description: 'Registrar o funcionamento', category: 'seguranca' },
  { id: 'alarme-re', name: 'Alarme de ré', description: 'Registrar o funcionamento', category: 'seguranca' },
  { id: 'horimetro-odometro', name: 'Horímetro/odômetro', description: 'Registrar a leitura', category: 'operacao' },
  { id: 'combustivel', name: 'Combustível', description: 'Registrar o nível', category: 'operacao' },
  { id: 'fotos', name: 'Fotos', description: 'Permitir anexar fotos às não conformidades', category: 'seguranca' },
  { id: 'nao-conformidade', name: 'Não conformidade', description: 'Registrar o problema encontrado', category: 'seguranca' },
  { id: 'ordem-servico', name: 'Ordem de serviço', description: 'Abrir uma OS quando houver necessidade de manutenção', category: 'manutencao' }
];

const STORAGE_KEYS = {
  users: 'checklist-users-v1',
  currentUser: 'checklist-current-user-v1',
  customItems: 'checklist-custom-items-v1',
  history: 'checklist-historico',
  audit: 'checklist-audit-v1'
};

const rnfItems = [
  { id: 'usabilidade', name: 'Usabilidade', description: 'O sistema deve ser simples de utilizar pelo operador em campo' },
  { id: 'desempenho', name: 'Desempenho', description: 'O sistema deve registrar uma resposta em até X segundos' },
  { id: 'disponibilidade', name: 'Disponibilidade', description: 'O sistema deve estar disponível X% do tempo' },
  { id: 'seguranca', name: 'Segurança', description: 'Somente usuários autorizados podem alterar uma inspeção concluída' },
  { id: 'rastreabilidade', name: 'Rastreabilidade', description: 'O sistema deve registrar usuário, data e hora das alterações' },
  { id: 'offline', name: 'Operação offline', description: 'O sistema deve permitir inspeções sem conexão e sincronizar posteriormente' },
  { id: 'integridade', name: 'Integridade', description: 'O sistema deve impedir alterações não rastreadas em inspeções encerradas' },
  { id: 'compatibilidade', name: 'Compatibilidade', description: 'O sistema deve funcionar nos dispositivos definidos para a operação' }
];

const appState = {
  photos: {},
  answers: {},
  currentFilter: 'todos',
  vehicles: getStoredVehicles(),
  editingVehicle: null,
  editingUsername: null
};

let supabaseClient = null;
let vehicleRecords = [];
let checklistRecords = [];
let supabaseReady = false;
let vehicleDetailsColumnsAvailable = true;

function logSupabaseError(stage, error) {
  const summary = `[Supabase][${stage}] ${error?.message || String(error)}${error?.code ? ` (código ${error.code})` : ''}${error?.status ? ` (HTTP ${error.status})` : ''}`;
  console.error(summary, {
    name: error?.name,
    code: error?.code,
    status: error?.status,
    details: error?.details,
    hint: error?.hint
  });
}

async function initializeSupabase() {
  const config = window.APP_CONFIG;
  console.log('[Supabase][config] verificando configuração', {
    configLoaded: Boolean(config),
    urlLoaded: Boolean(config?.supabaseUrl),
    publishableKeyLoaded: Boolean(config?.supabasePublishableKey),
    libraryLoaded: Boolean(window.supabase?.createClient)
  });
  if (!config?.supabaseUrl || !config?.supabasePublishableKey || !window.supabase?.createClient) {
    throw new Error('Não foi possível carregar config.js ou a biblioteca do Supabase.');
  }
  supabaseClient = window.supabase.createClient(config.supabaseUrl, config.supabasePublishableKey);
  supabaseReady = true;
  console.log('[Supabase][config] cliente inicializado');
  const { data: { session }, error } = await supabaseClient.auth.getSession();
  if (error) {
    logSupabaseError('getSession', error);
    throw error;
  }
  console.log('[Supabase][sessão] sessão encontrada:', Boolean(session));
  if (session) await applySession(session);
}

async function applySession(session) {
  if (!session?.user) return;
  const { data: profile, error } = await supabaseClient.from('perfis')
    .select('id,nome_usuario,perfil,telefone').eq('id', session.user.id).single();
  if (error) {
    logSupabaseError('perfil', error);
    throw error;
  }
  console.log('[Supabase][perfil] carregado', { id: profile.id, perfil: profile.perfil });
  localStorage.setItem(STORAGE_KEYS.currentUser, JSON.stringify({
    id: profile.id, username: profile.nome_usuario, perfil: profile.perfil,
    email: session.user.email, phone: profile.telefone
  }));
  await loadSupabaseData();
  ensureSession();
}

async function loadSupabaseData() {
  const savedInspection = JSON.parse(localStorage.getItem('checklist-inspecao-v2') || 'null');
  const preferredVehicle = veiculoSelect.value || savedInspection?.veiculo || '';
  let [vehiclesResult, itemsResult, inspectionsResult, auditResult] = await Promise.all([
    supabaseClient.from('equipamentos').select('id,nome,descricao,placa,data_entrada_empresa,ativo').eq('ativo', true).order('nome'),
    supabaseClient.from('itens_checklist').select('id,codigo,nome,descricao,categoria,personalizado').eq('ativo', true).order('nome'),
    supabaseClient.from('inspecoes').select('*,respostas_inspecao(*),fotos_inspecao(*)').order('criado_em', { ascending: false }),
    supabaseClient.from('registros_auditoria').select('*').order('criado_em', { ascending: false }).limit(50)
  ]);
  if (vehiclesResult.error && ['42703', 'PGRST204'].includes(vehiclesResult.error.code)) {
    vehicleDetailsColumnsAvailable = false;
    console.warn('[Supabase][equipamentos] as colunas de cadastro completo ainda não existem; carregando veículos sem os novos dados. Execute supabase/schema.sql para habilitar o cadastro completo.');
    vehiclesResult = await supabaseClient.from('equipamentos')
      .select('id,nome,placa,ativo').eq('ativo', true).order('nome');
  }
  for (const [resource, result] of [
    ['equipamentos', vehiclesResult], ['itens_checklist', itemsResult],
    ['inspecoes', inspectionsResult], ['registros_auditoria', auditResult]
  ]) {
    console.log(`[Supabase][tabela:${resource}] resposta`, {
      ok: !result.error,
      error: result.error?.message,
      code: result.error?.code,
      status: result.status
    });
    if (result.error) {
      logSupabaseError(`tabela:${resource}`, result.error);
      throw result.error;
    }
  }
  vehicleRecords = (vehiclesResult.data || []).map(item => ({ descricao: '', data_entrada_empresa: '', ...item }));
  appState.vehicles = vehicleRecords.map(item => item.nome);
  checklistRecords = itemsResult.data || [];
  const customItems = checklistRecords.filter(item => item.personalizado).map(item => ({
    id: item.codigo, name: item.nome, description: item.descricao, category: item.categoria
  }));
  localStorage.setItem(STORAGE_KEYS.customItems, JSON.stringify(customItems));
  const history = (inspectionsResult.data || []).map(row => ({
    id: row.id, veiculo: row.nome_veiculo_snapshot, equipamento: row.nome_equipamento,
    placa: row.placa, dataInspecao: row.data_inspecao, responsavel: row.responsavel,
    dataEntradaEmpresa: row.data_entrada_empresa_snapshot,
    horimetro: row.horimetro, horimetroDesabilitado: row.horimetro_desabilitado,
    quilometragem: row.quilometragem_km, quilometragemDesabilitada: row.quilometragem_desabilitada,
    naoConformidade: row.observacoes_nao_conformidade, ordemServico: row.ordem_servico_necessaria ? 'sim' : 'nao',
    aptidaoSistema: row.aptidao, respostas: Object.fromEntries((row.respostas_inspecao || []).map(a => [a.codigo_item_snapshot, a.situacao])),
    itens: (row.respostas_inspecao || []).map(a => ({ id: a.codigo_item_snapshot, name: a.nome_item_snapshot })),
    createdAt: row.criado_em
  }));
  localStorage.setItem(STORAGE_KEYS.history, JSON.stringify(history));
  const audit = (auditResult.data || []).map(row => ({
    id: row.id, action: row.acao, user: row.nome_usuario_snapshot,
    timestamp: row.criado_em, details: row.detalhes
  }));
  localStorage.setItem(STORAGE_KEYS.audit, JSON.stringify(audit));
  populateVehicleOptions();
  renderChecklist(rfList, getAllRfItems(), 'RF');
  renderHistory();
  renderAuditLog();
  if (preferredVehicle && appState.vehicles.includes(preferredVehicle)) {
    veiculoSelect.value = preferredVehicle;
    updateSelectedVehicleDetails();
  }
}

function getStoredVehicles() {
  const raw = localStorage.getItem('checklist-vehicles-v1');
  if (raw) {
    try {
      return JSON.parse(raw);
    } catch (error) {
      return ['Caminhão 01', 'Caminhão 02', 'Trator 03'];
    }
  }
  return ['Caminhão 01', 'Caminhão 02', 'Trator 03'];
}

function getUsers() {
  const raw = localStorage.getItem(STORAGE_KEYS.users);
  if (!raw) {
    const defaultUsers = [
      { username: 'admin', password: 'admin123', perfil: 'admin' },
      { username: 'operador', password: 'operador123', perfil: 'operador' }
    ];
    localStorage.setItem(STORAGE_KEYS.users, JSON.stringify(defaultUsers));
    return defaultUsers;
  }
  return JSON.parse(raw);
}

function getCustomItems() {
  const raw = localStorage.getItem(STORAGE_KEYS.customItems);
  return raw ? JSON.parse(raw) : [];
}

function getAllRfItems() {
  return [...rfItems, ...getCustomItems()];
}

const rfList = document.getElementById('rfList');
const rnfList = document.getElementById('rnfList');
const meterFields = [
  { input: document.getElementById('horimetro'), disabled: document.getElementById('horimetroDesabilitado') },
  { input: document.getElementById('quilometragem'), disabled: document.getElementById('quilometragemDesabilitada') }
];
meterFields.forEach(({ input, disabled }) => {
  disabled.addEventListener('change', () => {
    input.disabled = disabled.checked;
    if (disabled.checked) input.value = '';
  });
});
const totalItens = document.getElementById('totalItens');
const itensConformes = document.getElementById('itensConformes');
const itensNaoConformes = document.getElementById('itensNaoConformes');
const statusRodar = document.getElementById('statusRodar');
const aptidaoSistema = document.getElementById('aptidaoSistema');
const observacoesSistema = document.getElementById('observacoesSistema');
const itensAtencao = document.getElementById('itensAtencao');
const resultBadge = document.getElementById('resultBadge');
const salvarChecklistBtn = document.getElementById('salvarChecklist');
const exportPdfBtn = document.getElementById('exportPdfBtn');
const exportCsvBtn = document.getElementById('exportCsvBtn');
const veiculoSelect = document.getElementById('veiculoSelect');
const novoVeiculoInput = document.getElementById('novoVeiculo');
const adicionarVeiculoBtn = document.getElementById('adicionarVeiculo');
const vehicleList = document.getElementById('vehicleList');
const userList = document.getElementById('userList');
const historyList = document.getElementById('historyList');
const auditList = document.getElementById('auditList');
let reportPdfObjectUrl = null;

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[character]);
}

function getStatusLabel(value) {
  switch (value) {
    case 'conforme':
      return 'Conforme';
    case 'nao-conforme':
      return 'Não conforme';
    case 'apto-ressalvas':
      return 'Apto com ressalvas';
    case 'n-a':
      return 'N/A';
    default:
      return 'Conforme';
  }
}

function getStatusClass(value) {
  switch (value) {
    case 'conforme':
      return 'conforme';
    case 'nao-conforme':
      return 'nao-conforme';
    case 'apto-ressalvas':
      return 'apto-ressalvas';
    case 'n-a':
      return 'n-a';
    default:
      return 'conforme';
  }
}

function getVisibleRfItems() {
  const allItems = getAllRfItems();
  if (appState.currentFilter === 'todos') return allItems;
  return allItems.filter(item => item.category === appState.currentFilter);
}

function renderChecklist(listEl, items, type) {
  const visibleItems = getVisibleRfItems();
  listEl.innerHTML = visibleItems.map((item, index) => {
    const defaultValue = appState.answers[item.id] || 'conforme';

    return `
      <div class="item-card ${getStatusClass(defaultValue)}" data-id="${item.id}">
        <div class="item-header">
          <div>
            <h3>${index + 1}. ${item.name}</h3>
            <p>${item.description}</p>
          </div>
          <span class="status-badge status-conforme">${getStatusLabel(defaultValue)}</span>
        </div>

        <div class="status-group">
          <label class="option conforme ${defaultValue === 'conforme' ? 'selected' : ''}" data-status="conforme">
            <input type="radio" name="${item.id}" value="conforme" ${defaultValue === 'conforme' ? 'checked' : ''} />
            Conforme
          </label>
          <label class="option nao-conforme ${defaultValue === 'nao-conforme' ? 'selected' : ''}" data-status="nao-conforme">
            <input type="radio" name="${item.id}" value="nao-conforme" ${defaultValue === 'nao-conforme' ? 'checked' : ''} />
            Não conforme
          </label>
          <label class="option apto-ressalvas ${defaultValue === 'apto-ressalvas' ? 'selected' : ''}" data-status="apto-ressalvas">
            <input type="radio" name="${item.id}" value="apto-ressalvas" ${defaultValue === 'apto-ressalvas' ? 'checked' : ''} />
            Apto com ressalvas
          </label>
          <label class="option n-a ${defaultValue === 'n-a' ? 'selected' : ''}" data-status="n-a">
            <input type="radio" name="${item.id}" value="n-a" ${defaultValue === 'n-a' ? 'checked' : ''} />
            N/A
          </label>
        </div>

        <div class="attachment-box">
          <input class="hidden-input" id="file-${item.id}" type="file" accept="image/jpeg,image/png,image/webp" multiple />
          <a href="#" class="attach-link" data-trigger="file-${item.id}">Anexar foto do problema</a>
          <div class="preview-grid" id="preview-${item.id}"></div>
        </div>
      </div>
    `;
  }).join('');
}

function renderRnfChecklist() {
  rnfList.innerHTML = rnfItems.map((item, index) => {
    const defaultValue = appState.answers[item.id] || 'conforme';
    return `
      <div class="item-card ${getStatusClass(defaultValue)}" data-id="${item.id}">
        <div class="item-header">
          <div>
            <h3>${index + 1}. ${item.name}</h3>
            <p>${item.description}</p>
          </div>
          <span class="status-badge status-${defaultValue === 'nao-conforme' ? 'nao-conforme' : defaultValue === 'apto-ressalvas' ? 'apto-ressalvas' : defaultValue === 'n-a' ? 'n-a' : 'conforme'}">${getStatusLabel(defaultValue)}</span>
        </div>
        <div class="status-group">
          <label class="option conforme ${defaultValue === 'conforme' ? 'selected' : ''}" data-status="conforme">
            <input type="radio" name="${item.id}" value="conforme" ${defaultValue === 'conforme' ? 'checked' : ''} />
            Conforme
          </label>
          <label class="option nao-conforme ${defaultValue === 'nao-conforme' ? 'selected' : ''}" data-status="nao-conforme">
            <input type="radio" name="${item.id}" value="nao-conforme" ${defaultValue === 'nao-conforme' ? 'checked' : ''} />
            Não conforme
          </label>
          <label class="option apto-ressalvas ${defaultValue === 'apto-ressalvas' ? 'selected' : ''}" data-status="apto-ressalvas">
            <input type="radio" name="${item.id}" value="apto-ressalvas" ${defaultValue === 'apto-ressalvas' ? 'checked' : ''} />
            Apto com ressalvas
          </label>
          <label class="option n-a ${defaultValue === 'n-a' ? 'selected' : ''}" data-status="n-a">
            <input type="radio" name="${item.id}" value="n-a" ${defaultValue === 'n-a' ? 'checked' : ''} />
            N/A
          </label>
        </div>
      </div>
    `;
  }).join('');
}

function updateItemVisual(itemCard, value) {
  const statusClass = getStatusClass(value);
  itemCard.classList.remove('conforme', 'nao-conforme', 'n-a', 'apto-ressalvas');
  itemCard.classList.add(statusClass);

  const badge = itemCard.querySelector('.status-badge');
  badge.textContent = getStatusLabel(value);
  badge.classList.remove('status-conforme', 'status-nao-conforme', 'status-n-a', 'status-apto-ressalvas');
  badge.classList.add(value === 'nao-conforme' ? 'status-nao-conforme' : value === 'n-a' ? 'status-n-a' : value === 'apto-ressalvas' ? 'status-apto-ressalvas' : 'status-conforme');

  itemCard.querySelectorAll('.option').forEach(option => {
    option.classList.toggle('selected', option.dataset.status === value);
  });
}

function updateSummary() {
  const items = getAllRfItems().map(item => ({
    ...item,
    situacao: appState.answers[item.id] || 'conforme'
  }));
  const countConforme = items.filter(item => item.situacao === 'conforme').length;
  const naoAptos = items.filter(item => item.situacao === 'nao-conforme');
  const atencao = items.filter(item => item.situacao === 'apto-ressalvas');
  const countNaoConforme = naoAptos.length;
  const countRessalvas = atencao.length;

  totalItens.textContent = items.length;
  itensConformes.textContent = countConforme;
  itensNaoConformes.textContent = countNaoConforme;

  const apto = countNaoConforme > 0 ? 'Não apto' : countRessalvas > 0 ? 'Apto com ressalvas' : 'Apto';
  statusRodar.textContent = apto;
  aptidaoSistema.textContent = apto;
  document.getElementById('ordemServico').value = countNaoConforme > 0 ? 'sim' : 'nao';

  const badgeClass = countNaoConforme > 0 ? 'status-nao-apto' : countRessalvas > 0 ? 'status-apto-ressalvas' : 'status-apto';
  resultBadge.classList.remove('status-apto', 'status-nao-apto', 'status-apto-ressalvas');
  resultBadge.classList.add(badgeClass);
  resultBadge.textContent = countNaoConforme > 0 ? 'Não apto para rodar' : countRessalvas > 0 ? 'Apto com ressalvas' : 'Apto para rodar';

  observacoesSistema.textContent = countNaoConforme > 0 ? 'Há itens fora do padrão' : countRessalvas > 0 ? 'Há itens com ressalvas' : 'Sem pendências';

  const renderResultItems = (list, cards, emptyMessage, statusText) => {
    list.innerHTML = cards.length
      ? cards.map(item => `<li><strong>${escapeHtml(item.name)}</strong> — ${statusText}</li>`).join('')
      : `<li>${emptyMessage}</li>`;
  };
  renderResultItems(document.getElementById('aptidaoItens'), naoAptos, 'Nenhum item não conforme', 'marcado como não conforme');
  renderResultItems(itensAtencao, atencao, 'Nenhum item com ressalvas', 'marcado como apto com ressalvas');
  document.getElementById('aptidaoItemCount').textContent = countNaoConforme;
  document.getElementById('countAtencao').textContent = countRessalvas;
}

function getNonconformitySummary() {
  const names = getAllRfItems()
    .filter(item => appState.answers[item.id] === 'nao-conforme')
    .map(item => item.name);
  return names.length ? names.join('; ') : 'Nenhuma não conformidade identificada.';
}

function collectAnswers() {
  return Object.fromEntries([...getAllRfItems(), ...rnfItems].map(item => {
    const selected = document.querySelector(`input[name="${CSS.escape(item.id)}"]:checked`);
    return [item.id, appState.answers[item.id] || selected?.value || 'conforme'];
  }));
}

function attachFileInput(triggerElement) {
  const inputId = triggerElement.dataset.trigger;
  const input = document.getElementById(inputId);
  if (input) input.click();
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Não foi possível converter a imagem'));
    reader.readAsDataURL(file);
  });
}

async function handlePhotoSelection(event) {
  const input = event.target;
  const itemId = input.id.replace('file-', '');
  const preview = document.getElementById(`preview-${itemId}`);
  const files = Array.from(input.files || []);

  if (!files.length) {
    preview.innerHTML = '';
    delete appState.photos[itemId];
    return;
  }

  const dataUrls = await Promise.all(files.map(fileToDataUrl));
  appState.photos[itemId] = dataUrls;

  preview.innerHTML = dataUrls.map(url => `
    <div class="preview-item">
      <img src="${url}" alt="Foto anexada" />
    </div>
  `).join('');
}

function bindRadioEvents() {
  document.querySelectorAll('input[type="radio"]').forEach(input => {
    input.addEventListener('change', event => {
      const itemCard = event.target.closest('.item-card');
      appState.answers[event.target.name] = event.target.value;
      if (itemCard) {
        updateItemVisual(itemCard, event.target.value);
      }
      updateSummary();
    });
  });

  document.querySelectorAll('.attach-link').forEach(link => {
    link.addEventListener('click', event => {
      event.preventDefault();
      attachFileInput(link);
    });
  });

  document.querySelectorAll('input[type="file"]').forEach(input => {
    input.addEventListener('change', handlePhotoSelection);
  });

  document.querySelectorAll('.filter-btn').forEach(button => {
    button.addEventListener('click', () => {
      appState.currentFilter = button.dataset.filter;
      document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.toggle('active', btn === button));
      renderChecklist(rfList, rfItems, 'RF');
      bindRadioEvents();
      updateSummary();
    });
  });
}

function bindChecklistTabs() {
  const tabs = [
    { button: document.getElementById('feedbackTab'), panel: document.getElementById('feedbackPanel') },
    { button: document.getElementById('rnfTab'), panel: document.getElementById('rnfPanel') }
  ];

  tabs.forEach(({ button }) => button.addEventListener('click', () => {
    tabs.forEach(({ button: tabButton, panel }) => {
      const active = tabButton === button;
      tabButton.classList.toggle('active', active);
      tabButton.setAttribute('aria-selected', String(active));
      panel.classList.toggle('hidden', !active);
    });
  }));
}

function addCustomItem() {
  const name = document.getElementById('customItemName').value.trim();
  const category = document.getElementById('customItemCategory').value;
  const description = document.getElementById('customItemDescription').value.trim();

  if (!name || !description) {
    alert('Preencha nome e descrição antes de adicionar o item.');
    return;
  }

  const customItems = getCustomItems();
  const item = {
    id: `custom-${Date.now()}`,
    name,
    description,
    category
  };

  if (supabaseReady) {
    const user = getCurrentUser();
    supabaseClient.from('itens_checklist').insert({
      codigo: item.id, nome: name, descricao: description, categoria: category,
      personalizado: true, criado_por: user.id
    }).then(async ({ error }) => {
      if (error) return alert(`Não foi possível salvar o item: ${error.message}`);
      await loadSupabaseData();
    });
  } else customItems.push(item);

  if (!supabaseReady) localStorage.setItem(STORAGE_KEYS.customItems, JSON.stringify(customItems));
  document.getElementById('customItemName').value = '';
  document.getElementById('customItemDescription').value = '';
  renderChecklist(rfList, getAllRfItems(), 'RF');
  bindRadioEvents();
  updateSummary();
  alert('Item adicionado com sucesso!');
}

function populateVehicleOptions() {
  veiculoSelect.innerHTML = '<option value="">Selecione um veículo</option>' +
    appState.vehicles.map(vehicle => `<option value="${escapeHtml(vehicle)}">${escapeHtml(vehicle)}</option>`).join('');
  renderVehicleList();
  updateSelectedVehicleDetails();
}

function updateSelectedVehicleDetails() {
  const vehicle = vehicleRecords.find(item => item.nome === veiculoSelect.value);
  document.getElementById('equipamento').value = vehicle?.descricao || '';
  document.getElementById('placa').value = vehicle?.placa || '';
  document.getElementById('dataEntradaEmpresa').value = vehicle?.data_entrada_empresa || '';
}

function renderVehicleList() {
  if (!appState.vehicles.length) {
    vehicleList.innerHTML = '<p class="empty-list">Nenhum veículo cadastrado.</p>';
    return;
  }

  vehicleList.innerHTML = appState.vehicles.map((vehicle, index) => `
    <div class="record-row">
      <span>${escapeHtml(vehicle)}<small>${escapeHtml(vehicleRecords.find(item => item.nome === vehicle)?.descricao || 'Sem descrição')} · ${escapeHtml(vehicleRecords.find(item => item.nome === vehicle)?.placa || 'Sem placa')} · Entrada: ${escapeHtml(vehicleRecords.find(item => item.nome === vehicle)?.data_entrada_empresa || 'Sem data')}</small></span>
      <div class="record-actions">
        <button type="button" class="small-btn" data-action="edit-vehicle" data-index="${index}">Editar dados</button>
        <button type="button" class="small-btn danger-btn" data-action="delete-vehicle" data-index="${index}">Apagar</button>
      </div>
    </div>
  `).join('');
}

function renderUserList() {
  const users = getUsers();
  userList.innerHTML = users.map(user => `
    <div class="record-row">
      <span>${escapeHtml(user.username)} <small>${user.perfil === 'admin' ? 'Administrador' : 'Operador'}</small>${user.perfil === 'admin' && (user.email || user.phone) ? `<small>${escapeHtml(user.email || 'Sem e-mail')} · ${escapeHtml(user.phone || 'Sem telefone')}</small>` : ''}</span>
      <div class="record-actions">
        <button type="button" class="small-btn" data-action="edit-user" data-username="${encodeURIComponent(user.username)}">Editar</button>
        <button type="button" class="small-btn danger-btn" data-action="delete-user" data-username="${encodeURIComponent(user.username)}">Apagar</button>
      </div>
    </div>
  `).join('');
}

function startUserEdit(username) {
  const user = getUsers().find(item => item.username === username);
  if (!user) return;

  appState.editingUsername = user.username;
  document.getElementById('editUsername').value = user.username;
  document.getElementById('editUserPassword').value = '';
  document.getElementById('editUserRole').value = user.perfil;
  document.getElementById('editAdminEmail').value = user.email || '';
  document.getElementById('editAdminPhone').value = user.phone || '';
  updateAdminContactFields('editUserRole', 'editAdminEmailField', 'editAdminPhoneField', 'editAdminEmail', 'editAdminPhone', true);
  document.getElementById('userEditForm').classList.remove('hidden');
  document.getElementById('editUsername').focus();
}

function resetUserEdit() {
  appState.editingUsername = null;
  document.getElementById('userEditForm').reset();
  document.getElementById('userEditForm').classList.add('hidden');
}

function saveUserChanges(event) {
  event.preventDefault();
  const users = getUsers();
  const originalUsername = appState.editingUsername;
  const username = document.getElementById('editUsername').value.trim();
  const password = document.getElementById('editUserPassword').value;
  const perfil = document.getElementById('editUserRole').value;
  const email = document.getElementById('editAdminEmail').value.trim();
  const phone = document.getElementById('editAdminPhone').value.trim();
  const userIndex = users.findIndex(user => user.username === originalUsername);

  if (userIndex < 0 || !username) return;
  if (users.some((user, index) => index !== userIndex && user.username.toLowerCase() === username.toLowerCase())) {
    alert('Esse nome de usuário já está em uso.');
    return;
  }

  users[userIndex] = { ...users[userIndex], username, perfil, email, phone };
  if (password) users[userIndex].password = password;
  localStorage.setItem(STORAGE_KEYS.users, JSON.stringify(users));

  const currentUser = getCurrentUser();
  if (currentUser && currentUser.username === originalUsername) {
    localStorage.setItem(STORAGE_KEYS.currentUser, JSON.stringify({
      ...currentUser,
      username,
      password: password || currentUser.password,
      perfil
    }));
    ensureSession();
  }

  saveAuditEntry('usuario_editado', { description: `Usuário ${originalUsername} editado` });
  resetUserEdit();
  renderUserList();
}

function deleteUser(username) {
  const currentUser = getCurrentUser();
  if (currentUser?.username === username) {
    alert('Não é possível apagar o usuário conectado.');
    return;
  }

  const users = getUsers();
  const user = users.find(item => item.username === username);
  if (!user) return;
  const adminCount = users.filter(item => item.perfil === 'admin').length;
  if (user.perfil === 'admin' && adminCount <= 1) {
    alert('Não é possível apagar o último administrador.');
    return;
  }
  if (!window.confirm(`Apagar o usuário "${username}"?`)) return;

  localStorage.setItem(STORAGE_KEYS.users, JSON.stringify(users.filter(item => item.username !== username)));
  saveAuditEntry('usuario_apagado', { description: `Usuário ${username} apagado` });
  renderUserList();
  if (appState.editingUsername === username) resetUserEdit();
}

async function updateVehicle(value, descricao, placa, dataEntradaEmpresa) {
  const editingVehicle = appState.editingVehicle;
  if (editingVehicle !== null) {
    const duplicate = appState.vehicles.some((vehicle, index) => index !== editingVehicle && vehicle.toLowerCase() === value.toLowerCase());
    if (duplicate) {
      alert('Esse veículo já está cadastrado.');
      return;
    }

    const oldName = appState.vehicles[editingVehicle];
    const wasSelected = veiculoSelect.value === oldName;
    if (supabaseReady) {
      const record = vehicleRecords.find(item => item.nome === oldName);
      const { data, error } = await supabaseClient.from('equipamentos')
        .update({ nome: value, descricao, placa, data_entrada_empresa: dataEntradaEmpresa })
        .eq('id', record.id).select('id,nome,descricao,placa,data_entrada_empresa,ativo').single();
      if (error) return alert(vehicleDetailsColumnsAvailable
        ? `Não foi possível atualizar o equipamento: ${error.message}`
        : 'Execute supabase/schema.sql no SQL Editor do Supabase para habilitar os campos completos do veículo.');
      vehicleRecords = vehicleRecords.map(item => item.id === data.id ? data : item);
      appState.vehicles[editingVehicle] = value;
      await loadSupabaseData();
    } else {
      appState.vehicles[editingVehicle] = value;
    }
    if (wasSelected) veiculoSelect.value = value;
    saveAuditEntry('veiculo_editado', { description: `Veículo ${oldName} alterado para ${value}` });
    finishVehicleEdit();
  } else if (appState.vehicles.some(vehicle => vehicle.toLowerCase() === value.toLowerCase())) {
    alert('Esse veículo já está cadastrado.');
    return;
  } else {
    if (supabaseReady) {
      const { data, error } = await supabaseClient.from('equipamentos').insert({
        nome: value, descricao, placa, data_entrada_empresa: dataEntradaEmpresa,
        criado_por: getCurrentUser().id
      }).select('id,nome,descricao,placa,data_entrada_empresa,ativo').single();
      if (error) return alert(vehicleDetailsColumnsAvailable
        ? `Não foi possível cadastrar o equipamento: ${error.message}`
        : 'Execute supabase/schema.sql no SQL Editor do Supabase para habilitar os campos completos do veículo.');
      vehicleRecords.push(data);
    }
    appState.vehicles.push(value);
    veiculoSelect.value = value;
  }

  if (!supabaseReady) localStorage.setItem('checklist-vehicles-v1', JSON.stringify(appState.vehicles));
  populateVehicleOptions();
  if (appState.vehicles.includes(value)) veiculoSelect.value = value;
  updateSelectedVehicleDetails();
}

function finishVehicleEdit() {
  appState.editingVehicle = null;
  novoVeiculoInput.value = '';
  document.getElementById('novoEquipamentoDescricao').value = '';
  document.getElementById('novaPlaca').value = '';
  document.getElementById('novaDataEntradaEmpresa').value = '';
  adicionarVeiculoBtn.textContent = 'Cadastrar veículo';
  document.getElementById('cancelarEdicaoVeiculo').classList.add('hidden');
}

async function deleteVehicle(index) {
  const vehicle = appState.vehicles[index];
  if (!vehicle || !window.confirm(`Apagar o veículo "${vehicle}"?`)) return;

  if (supabaseReady) {
    const record = vehicleRecords.find(item => item.nome === vehicle);
    const { error } = await supabaseClient.from('equipamentos').update({ ativo: false }).eq('id', record.id);
    if (error) return alert(`Não foi possível remover o equipamento: ${error.message}`);
    vehicleRecords = vehicleRecords.filter(item => item.id !== record.id);
  }
  appState.vehicles.splice(index, 1);
  if (veiculoSelect.value === vehicle) veiculoSelect.value = '';
  if (appState.editingVehicle === index) finishVehicleEdit();
  else if (appState.editingVehicle > index) appState.editingVehicle -= 1;
  if (!supabaseReady) localStorage.setItem('checklist-vehicles-v1', JSON.stringify(appState.vehicles));
  populateVehicleOptions();
  saveAuditEntry('veiculo_apagado', { description: `Veículo ${vehicle} apagado` });
}

async function addVehicle() {
  const value = novoVeiculoInput.value.trim();
  const descricao = document.getElementById('novoEquipamentoDescricao').value.trim();
  const placa = document.getElementById('novaPlaca').value.trim();
  const dataEntradaEmpresa = document.getElementById('novaDataEntradaEmpresa').value;
  if (!value || !descricao || !placa || !dataEntradaEmpresa) {
    alert('Preencha o nome do veículo, a descrição do equipamento, a placa e a data de entrada na empresa.');
    return;
  }

  const wasEditing = appState.editingVehicle !== null;
  await updateVehicle(value, descricao, placa, dataEntradaEmpresa);
  if (appState.editingVehicle === null && (wasEditing || appState.vehicles.includes(value))) finishVehicleEdit();
}

function getHistory() {
  const raw = localStorage.getItem(STORAGE_KEYS.history);
  return raw ? JSON.parse(raw) : [];
}

function saveHistory(entry) {
  const history = getHistory();
  const index = history.findIndex(item => item.id && item.id === entry.id);
  if (index >= 0) history[index] = entry;
  else history.unshift(entry);
  localStorage.setItem(STORAGE_KEYS.history, JSON.stringify(history));
}

function getAuditLog() {
  const raw = localStorage.getItem(STORAGE_KEYS.audit);
  return raw ? JSON.parse(raw) : [];
}

function saveAuditEntry(action, details = {}) {
  const currentUser = getCurrentUser();
  const auditEntry = {
    id: Date.now() + Math.random(),
    action,
    user: currentUser ? currentUser.username : 'Sistema',
    perfil: currentUser ? currentUser.perfil : 'sistema',
    timestamp: new Date().toISOString(),
    details
  };

  const log = getAuditLog();
  log.unshift(auditEntry);
  localStorage.setItem(STORAGE_KEYS.audit, JSON.stringify(log.slice(0, 50)));
  if (supabaseReady && currentUser?.id) {
    supabaseClient.from('registros_auditoria').insert({
      usuario_id: currentUser.id, nome_usuario_snapshot: currentUser.username,
      acao: action, tipo_entidade: details.entityType || null,
      entidade_id: details.entityId || null, detalhes: details
    }).then(({ error }) => {
      if (error) console.error('Falha ao gravar auditoria:', error.message);
    });
  }
  renderAuditLog();
}

function renderHistory() {
  const history = getHistory();

  if (!history.length) {
    historyList.innerHTML = '<div class="history-item"><div><strong>Sem registros</strong><div class="history-meta">Ainda não há inspeções salvas.</div></div></div>';
    return;
  }

  historyList.innerHTML = history.map(item => `
    <div class="history-item">
      <div>
        <strong>${item.veiculo || item.equipamento || 'Inspeção'}</strong>
        <div class="history-meta">${item.dataInspecao || 'Sem data'} • ${item.responsavel || 'Sem responsável'} • ${item.placa || 'Sem placa'}</div>
      </div>
      <span class="history-status ${item.aptidaoSistema === 'Apto' ? 'apto' : 'nao-apto'}">${item.aptidaoSistema || 'Apto'}</span>
    </div>
  `).join('');
}

function getAuditText(entry) {
  if (!entry.details) return 'Registro do sistema';

  if (entry.action === 'login') {
    return `Login em ${new Date(entry.details.loginAt).toLocaleString('pt-BR')}`;
  }

  if (entry.action === 'logout') {
    return `Logout em ${new Date(entry.details.logoutAt).toLocaleString('pt-BR')}`;
  }

  if (entry.action === 'relatorio_salvo') {
    return `Relatório ${entry.details.isNew ? 'criado' : 'alterado'} por ${entry.details.user} em ${new Date(entry.details.timestamp).toLocaleString('pt-BR')}`;
  }

  return entry.details.description || 'Registro do sistema';
}

function renderAuditLog() {
  const audit = getAuditLog();

  if (!audit.length) {
    auditList.innerHTML = '<div class="audit-item"><div><strong>Sem auditoria</strong><div class="audit-meta">Ainda não houve login, logout ou alteração.</div></div></div>';
    return;
  }

  auditList.innerHTML = audit.map(entry => `
    <div class="audit-item">
      <div>
        <strong>${entry.user}</strong>
        <div class="audit-meta">${new Date(entry.timestamp).toLocaleString('pt-BR')} • ${getAuditText(entry)}</div>
      </div>
      <span class="audit-tag">${entry.action}</span>
    </div>
  `).join('');
}

function exportCsv() {
  const history = getHistory();
  if (!history.length) {
    alert('Não há inspeções para exportar.');
    return;
  }

  const rows = [
    ['Veículo', 'Equipamento', 'Placa', 'Entrada na empresa', 'Data da inspeção', 'Responsável', 'Resultado', 'Não conformidade'],
    ...history.map(item => [
      item.veiculo || '',
      item.equipamento || '',
      item.placa || '',
      item.dataEntradaEmpresa || '',
      item.dataInspecao || '',
      item.responsavel || '',
      item.aptidaoSistema || '',
      item.naoConformidade || ''
    ])
  ];

  const csv = rows.map(row => row.map(value => `"${String(value).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'historico-inspecoes.csv';
  link.click();
  URL.revokeObjectURL(url);
}

async function saveInspection() {
  const currentUser = getCurrentUser();
  const now = new Date().toISOString();
  const existing = JSON.parse(localStorage.getItem('checklist-inspecao-v2') || 'null');

  const payload = {
    veiculo: veiculoSelect.value,
    equipamento: document.getElementById('equipamento').value,
    placa: document.getElementById('placa').value,
    dataInspecao: document.getElementById('dataInspecao').value,
    dataEntradaEmpresa: document.getElementById('dataEntradaEmpresa').value,
    responsavel: document.getElementById('responsavel').value,
    horimetro: document.getElementById('horimetro').value,
    horimetroDesabilitado: document.getElementById('horimetroDesabilitado').checked,
    quilometragem: document.getElementById('quilometragem').value,
    quilometragemDesabilitada: document.getElementById('quilometragemDesabilitada').checked,
    naoConformidade: getNonconformitySummary(),
    ordemServico: document.getElementById('ordemServico').value,
    aptidaoSistema: aptidaoSistema.textContent,
    respostas: collectAnswers(),
    createdBy: existing?.createdBy || (currentUser ? currentUser.username : 'Sistema'),
    createdAt: existing?.createdAt || now,
    updatedBy: currentUser ? currentUser.username : 'Sistema',
    updatedAt: now,
    loginAt: currentUser ? currentUser.loginAt || null : null,
    logoutAt: currentUser ? currentUser.logoutAt || null : null
  };

  payload.fotos = supabaseReady ? {} : appState.photos;
  payload.itens = [...getAllRfItems(), ...rnfItems].map(item => ({ id: item.id, name: item.name }));

  if (supabaseReady) {
    const selectedVehicle = vehicleRecords.find(item => item.nome === payload.veiculo);
    const record = {
      equipamento_id: selectedVehicle?.id || null,
      nome_veiculo_snapshot: payload.veiculo || '',
      nome_equipamento: payload.equipamento || '', placa: payload.placa || '',
      data_entrada_empresa_snapshot: payload.dataEntradaEmpresa || null,
      data_inspecao: payload.dataInspecao || null, responsavel: payload.responsavel || '',
      horimetro: payload.horimetroDesabilitado || payload.horimetro === '' ? null : Number(payload.horimetro),
      horimetro_desabilitado: payload.horimetroDesabilitado,
      quilometragem_km: payload.quilometragemDesabilitada || payload.quilometragem === '' ? null : Number(payload.quilometragem),
      quilometragem_desabilitada: payload.quilometragemDesabilitada,
      observacoes_nao_conformidade: payload.naoConformidade || '',
      ordem_servico_necessaria: payload.ordemServico === 'sim', aptidao: payload.aptidaoSistema,
      atualizado_por: currentUser.id
    };
    let inspectionId = existing?.id;
    let result;
    if (inspectionId) result = await supabaseClient.from('inspecoes').update(record).eq('id', inspectionId).select('id').single();
    else result = await supabaseClient.from('inspecoes').insert({ ...record, criado_por: currentUser.id }).select('id').single();
    if (result.error) return alert(`Não foi possível salvar a inspeção: ${result.error.message}`);
    inspectionId = result.data.id;
    const answers = Object.entries(payload.respostas).map(([codigo, situacao]) => {
      const item = [...rfItems, ...rnfItems, ...getCustomItems()].find(candidate => candidate.id === codigo);
      const catalogItem = checklistRecords.find(candidate => candidate.codigo === codigo);
      return {
        inspecao_id: inspectionId, item_checklist_id: catalogItem?.id || null,
        codigo_item_snapshot: codigo, nome_item_snapshot: item?.name || codigo,
        categoria_item_snapshot: item?.category || (rnfItems.some(candidate => candidate.id === codigo) ? 'rnf' : 'operacao'),
        situacao
      };
    });
    const { error: deleteError } = await supabaseClient.from('respostas_inspecao').delete().eq('inspecao_id', inspectionId);
    if (deleteError) return alert(`A inspeção foi salva, mas as respostas não: ${deleteError.message}`);
    if (answers.length) {
      const { error } = await supabaseClient.from('respostas_inspecao').insert(answers);
      if (error) return alert(`A inspeção foi salva, mas as respostas não: ${error.message}`);
    }
    const photoRows = [];
    for (const [codigo, dataUrls] of Object.entries(appState.photos)) {
      for (const [index, dataUrl] of dataUrls.entries()) {
        if (!String(dataUrl).startsWith('data:')) continue;
        const response = await fetch(dataUrl);
        const blob = await response.blob();
        const extension = blob.type.split('/')[1] || 'jpg';
        const filename = `${crypto.randomUUID()}.${extension}`;
        const caminho = `${inspectionId}/${filename}`;
        const { error: uploadError } = await supabaseClient.storage.from('inspection-photos').upload(caminho, blob, {
          contentType: blob.type, upsert: true
        });
        if (uploadError) return alert(`A inspeção foi salva, mas a foto ${index + 1} não: ${uploadError.message}`);
        photoRows.push({ inspecao_id: inspectionId, codigo_item: codigo,
          caminho_storage: caminho, nome_arquivo: filename, tipo_conteudo: blob.type,
          tamanho_bytes: blob.size, enviado_por: currentUser.id });
      }
      appState.photos[codigo] = [];
    }
    if (photoRows.length) {
      const { error } = await supabaseClient.from('fotos_inspecao').insert(photoRows);
      if (error) return alert(`A inspeção foi salva, mas os metadados das fotos não: ${error.message}`);
    }
    payload.id = inspectionId;
  }
  saveHistory(payload);
  localStorage.setItem('checklist-inspecao-v2', JSON.stringify(payload));
  saveAuditEntry('relatorio_salvo', {
    user: payload.updatedBy,
    timestamp: now,
    isNew: !existing
  });
  renderHistory();

  try {
    const response = await fetch('/api/inspections/pdf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!response.ok) {
      const result = await response.json().catch(() => ({}));
      throw new Error(result.error || 'Não foi possível gerar o PDF no servidor.');
    }

    const pdf = await response.blob();
    if (reportPdfObjectUrl) URL.revokeObjectURL(reportPdfObjectUrl);
    reportPdfObjectUrl = URL.createObjectURL(pdf);
    const pdfLink = document.getElementById('pdfDownloadFallback');
    pdfLink.href = reportPdfObjectUrl;
    pdfLink.download = `relatorio-${String(payload.placa || payload.veiculo || 'inspecao').replace(/[^a-z0-9_-]/gi, '-')}.pdf`;
    pdfLink.classList.remove('hidden');
    pdfLink.click();

    alert('Inspeção salva no Supabase e PDF gerado.');
  } catch (error) {
    alert(`Inspeção salva no navegador, mas não foi possível gerar o PDF pelo servidor.\n${error.message}`);
  }
}

function loadSavedInspection() {
  const saved = localStorage.getItem('checklist-inspecao-v2');
  if (!saved) return;

  try {
    const data = JSON.parse(saved);
    if (data.veiculo) {
      veiculoSelect.value = data.veiculo;
      updateSelectedVehicleDetails();
    }
    document.getElementById('dataInspecao').value = data.dataInspecao || '';
    document.getElementById('responsavel').value = data.responsavel || '';
    document.getElementById('horimetro').value = data.horimetro || '';
    document.getElementById('horimetroDesabilitado').checked = Boolean(data.horimetroDesabilitado);
    document.getElementById('horimetro').disabled = Boolean(data.horimetroDesabilitado);
    document.getElementById('quilometragem').value = data.quilometragem || '';
    document.getElementById('quilometragemDesabilitada').checked = Boolean(data.quilometragemDesabilitada);
    document.getElementById('quilometragem').disabled = Boolean(data.quilometragemDesabilitada);
    document.getElementById('ordemServico').value = data.ordemServico || 'nao';

    if (data.respostas) {
      appState.answers = { ...data.respostas };
      Object.entries(data.respostas).forEach(([name, value]) => {
        const selected = document.querySelector(`input[name="${name}"][value="${value}"]`);
        if (selected) {
          selected.checked = true;
          const itemCard = selected.closest('.item-card');
          if (itemCard) updateItemVisual(itemCard, value);
        }
      });
    }

    if (data.fotos) {
      appState.photos = data.fotos;
      Object.entries(data.fotos).forEach(([itemId, urls]) => {
        const preview = document.getElementById(`preview-${itemId}`);
        if (!preview) return;

        preview.innerHTML = urls.map(url => `
          <div class="preview-item">
            <img src="${url}" alt="Foto anexada" />
          </div>
        `).join('');
      });
    }
  } catch (error) {
    console.error('Erro ao carregar inspeção salva:', error);
  }
}

async function openInspectionPdf() {
  const payload = JSON.parse(localStorage.getItem('checklist-inspecao-v2') || '{}');
  Object.assign(payload, {
    veiculo: veiculoSelect.value,
    equipamento: document.getElementById('equipamento').value,
    placa: document.getElementById('placa').value,
    dataInspecao: document.getElementById('dataInspecao').value,
    dataEntradaEmpresa: document.getElementById('dataEntradaEmpresa').value,
    responsavel: document.getElementById('responsavel').value,
    horimetro: document.getElementById('horimetro').value,
    horimetroDesabilitado: document.getElementById('horimetroDesabilitado').checked,
    quilometragem: document.getElementById('quilometragem').value,
    quilometragemDesabilitada: document.getElementById('quilometragemDesabilitada').checked,
    naoConformidade: getNonconformitySummary(),
    ordemServico: document.getElementById('ordemServico').value,
    aptidaoSistema: aptidaoSistema.textContent,
    respostas: collectAnswers(),
    itens: [...getAllRfItems(), ...rnfItems].map(item => ({ id: item.id, name: item.name }))
  });
  try {
    const response = await fetch('/api/inspections/pdf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!response.ok) {
      const result = await response.json().catch(() => ({}));
      throw new Error(result.error || 'Não foi possível gerar o PDF.');
    }
    const pdfUrl = URL.createObjectURL(await response.blob());
    const link = document.createElement('a');
    const safeName = String(payload.placa || payload.veiculo || 'inspecao').replace(/[^a-z0-9_-]/gi, '-');
    link.href = pdfUrl;
    link.download = `relatorio-${safeName}.pdf`;
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(pdfUrl), 60000);
  } catch (error) {
    alert(`Não foi possível gerar o PDF.\n${error.message}`);
  }
}

function setAuthMode(mode) {
  const isRegister = mode === 'register';
  document.getElementById('roleField').classList.add('hidden');
  document.getElementById('authUsernameField').classList.toggle('hidden', !isRegister);
  document.getElementById('authNomeUsuario').required = isRegister;
  const submitBtn = document.querySelector('.auth-submit');
  submitBtn.textContent = isRegister ? 'Cadastrar' : 'Entrar';
  document.querySelectorAll('.auth-tab').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.mode === mode);
  });
}

function updateAdminContactFields(roleSelectId, emailFieldId, phoneFieldId, emailInputId, phoneInputId, enabled) {
  const isAdmin = enabled && document.getElementById(roleSelectId).value === 'admin';
  document.getElementById(emailFieldId).classList.toggle('hidden', !isAdmin);
  document.getElementById(phoneFieldId).classList.toggle('hidden', !isAdmin);
  document.getElementById(emailInputId).required = isAdmin;
  document.getElementById(phoneInputId).required = isAdmin;
}

function authMessage(text, isError = false) {
  const el = document.getElementById('authMessage');
  el.textContent = text;
  el.style.color = isError ? '#d92d4d' : '#1e9a5a';
}

function getCurrentUser() {
  const raw = localStorage.getItem(STORAGE_KEYS.currentUser);
  return raw ? JSON.parse(raw) : null;
}

function updateUserBadge() {
  const currentUser = JSON.parse(localStorage.getItem(STORAGE_KEYS.currentUser) || 'null');
  const badge = document.getElementById('userBadge');
  if (badge) {
    badge.textContent = currentUser ? `Usuário: ${currentUser.username}` : 'Usuário';
  }
}

async function logoutUser() {
  const currentUser = getCurrentUser();
  const logoutAt = new Date().toISOString();

  if (currentUser) saveAuditEntry('logout', { logoutAt });
  if (supabaseClient) await supabaseClient.auth.signOut();

  localStorage.removeItem(STORAGE_KEYS.currentUser);
  document.getElementById('appContent').classList.add('hidden');
  document.getElementById('authPanel').classList.remove('hidden');
  authMessage('');
  document.getElementById('authForm').reset();
  setAuthMode('login');
}

function ensureSession() {
  const currentUser = JSON.parse(localStorage.getItem(STORAGE_KEYS.currentUser) || 'null');
  const authPanel = document.getElementById('authPanel');
  const appContent = document.getElementById('appContent');

  if (currentUser) {
    authPanel.classList.add('hidden');
    appContent.classList.remove('hidden');
    updateUserBadge();
    document.getElementById('userManagement').classList.add('hidden');
    document.querySelector('.management-panel').classList.toggle('hidden', currentUser.perfil !== 'admin');
    document.querySelector('.vehicle-box').classList.toggle('hidden', currentUser.perfil !== 'admin');
  } else {
    authPanel.classList.remove('hidden');
    appContent.classList.add('hidden');
  }
}

function bindAuthEvents() {
  document.querySelectorAll('.auth-tab').forEach(btn => {
    btn.addEventListener('click', () => setAuthMode(btn.dataset.mode));
  });

  document.getElementById('authForm').addEventListener('submit', event => {
    event.preventDefault();
    const email = document.getElementById('authUsuario').value.trim();
    const password = document.getElementById('authSenha').value;
    const mode = document.querySelector('.auth-tab.active')?.dataset.mode || 'login';
    const submit = document.querySelector('.auth-submit');
    submit.disabled = true;
    (async () => {
      try {
        if (!supabaseReady) throw new Error('Supabase ainda não está conectado.');
        if (mode === 'register') {
          const username = document.getElementById('authNomeUsuario').value.trim();
          const phone = document.getElementById('authAdminPhone').value.trim();
          const { data, error } = await supabaseClient.auth.signUp({
            email, password, options: { data: { username, phone } }
          });
          if (error) throw error;
          if (data.session) await applySession(data.session);
          else {
            authMessage('Conta criada. Confirme o e-mail para entrar.');
            setAuthMode('login');
          }
        } else {
          console.log('[Supabase][login] iniciando autenticação');
          const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
          if (error) {
            logSupabaseError('login', error);
            throw error;
          }
          console.log('[Supabase][login] autenticação concluída', { userId: data.user?.id });
          await applySession(data.session);
          saveAuditEntry('login', { timestamp: new Date().toISOString() });
          authMessage('Login realizado com sucesso!');
        }
      } catch (error) {
        logSupabaseError('fluxo de login', error);
        authMessage(error.message || 'Não foi possível autenticar.', true);
      } finally { submit.disabled = false; }
    })();
  });

  document.getElementById('logoutBtn').addEventListener('click', logoutUser);
  document.getElementById('authPerfil').addEventListener('change', () => {});
  document.getElementById('editUserRole').addEventListener('change', () => {
    updateAdminContactFields('editUserRole', 'editAdminEmailField', 'editAdminPhoneField', 'editAdminEmail', 'editAdminPhone', true);
  });
}

adicionarVeiculoBtn.addEventListener('click', addVehicle);
veiculoSelect.addEventListener('change', updateSelectedVehicleDetails);
document.getElementById('cancelarEdicaoVeiculo').addEventListener('click', finishVehicleEdit);
novoVeiculoInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    event.preventDefault();
    addVehicle();
  }
});

vehicleList.addEventListener('click', event => {
  const button = event.target.closest('button[data-action]');
  if (!button) return;

  const index = Number(button.dataset.index);
  if (button.dataset.action === 'edit-vehicle') {
    appState.editingVehicle = index;
    const vehicleName = appState.vehicles[index];
    const vehicle = vehicleRecords.find(item => item.nome === vehicleName);
    novoVeiculoInput.value = vehicleName;
    document.getElementById('novoEquipamentoDescricao').value = vehicle?.descricao || '';
    document.getElementById('novaPlaca').value = vehicle?.placa || '';
    document.getElementById('novaDataEntradaEmpresa').value = vehicle?.data_entrada_empresa || '';
    adicionarVeiculoBtn.textContent = 'Salvar dados do veículo';
    document.getElementById('cancelarEdicaoVeiculo').classList.remove('hidden');
    novoVeiculoInput.focus();
  } else if (button.dataset.action === 'delete-vehicle') {
    deleteVehicle(index);
  }
});

userList.addEventListener('click', event => {
  const button = event.target.closest('button[data-action]');
  if (!button) return;

  const username = decodeURIComponent(button.dataset.username);
  if (button.dataset.action === 'edit-user') startUserEdit(username);
  else if (button.dataset.action === 'delete-user') deleteUser(username);
});

document.getElementById('userEditForm').addEventListener('submit', saveUserChanges);
document.getElementById('cancelarEdicaoUsuario').addEventListener('click', resetUserEdit);

populateVehicleOptions();
renderChecklist(rfList, rfItems, 'RF');
renderRnfChecklist();
renderHistory();
renderAuditLog();
bindRadioEvents();
bindChecklistTabs();
updateSummary();
loadSavedInspection();
updateSummary();
bindAuthEvents();
setAuthMode('login');
initializeSupabase().catch(error => {
  authMessage(error.message || 'Não foi possível conectar ao Supabase.', true);
});

salvarChecklistBtn.addEventListener('click', saveInspection);
exportPdfBtn.addEventListener('click', openInspectionPdf);
exportCsvBtn.addEventListener('click', exportCsv);
document.getElementById('adicionarItemChecklist').addEventListener('click', addCustomItem);
