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
  currentFilter: 'todos',
  vehicles: getStoredVehicles()
};

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
const totalItens = document.getElementById('totalItens');
const itensConformes = document.getElementById('itensConformes');
const itensNaoConformes = document.getElementById('itensNaoConformes');
const statusRodar = document.getElementById('statusRodar');
const aptidaoSistema = document.getElementById('aptidaoSistema');
const observacoesSistema = document.getElementById('observacoesSistema');
const resultBadge = document.getElementById('resultBadge');
const salvarChecklistBtn = document.getElementById('salvarChecklist');
const exportPdfBtn = document.getElementById('exportPdfBtn');
const exportCsvBtn = document.getElementById('exportCsvBtn');
const veiculoSelect = document.getElementById('veiculoSelect');
const novoVeiculoInput = document.getElementById('novoVeiculo');
const adicionarVeiculoBtn = document.getElementById('adicionarVeiculo');
const historyList = document.getElementById('historyList');
const auditList = document.getElementById('auditList');

function getStatusLabel(value) {
  switch (value) {
    case 'conforme':
      return 'Conforme';
    case 'nao-conforme':
      return 'Não conforme';
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
    const defaultValue = 'conforme';

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
          <label class="option conforme selected" data-status="conforme">
            <input type="radio" name="${item.id}" value="conforme" checked />
            Conforme
          </label>
          <label class="option nao-conforme" data-status="nao-conforme">
            <input type="radio" name="${item.id}" value="nao-conforme" />
            Não conforme
          </label>
          <label class="option n-a" data-status="n-a">
            <input type="radio" name="${item.id}" value="n-a" />
            N/A
          </label>
        </div>

        <div class="attachment-box">
          <input class="hidden-input" id="file-${item.id}" type="file" accept="image/*" />
          <a href="#" class="attach-link" data-trigger="file-${item.id}">Anexar foto do problema</a>
          <div class="preview-grid" id="preview-${item.id}"></div>
        </div>
      </div>
    `;
  }).join('');
}

function renderRnfChecklist() {
  rnfList.innerHTML = rnfItems.map((item, index) => {
    return `
      <div class="item-card conforme" data-id="${item.id}">
        <div class="item-header">
          <div>
            <h3>${index + 1}. ${item.name}</h3>
            <p>${item.description}</p>
          </div>
          <span class="status-badge status-conforme">Conforme</span>
        </div>
        <div class="status-group">
          <label class="option conforme selected" data-status="conforme">
            <input type="radio" name="${item.id}" value="conforme" checked />
            Conforme
          </label>
          <label class="option nao-conforme" data-status="nao-conforme">
            <input type="radio" name="${item.id}" value="nao-conforme" />
            Não conforme
          </label>
          <label class="option n-a" data-status="n-a">
            <input type="radio" name="${item.id}" value="n-a" />
            N/A
          </label>
        </div>
      </div>
    `;
  }).join('');
}

function updateItemVisual(itemCard, value) {
  const statusClass = getStatusClass(value);
  itemCard.classList.remove('conforme', 'nao-conforme', 'n-a');
  itemCard.classList.add(statusClass);

  const badge = itemCard.querySelector('.status-badge');
  badge.textContent = getStatusLabel(value);
  badge.classList.remove('status-conforme', 'status-nao-conforme', 'status-n-a');
  badge.classList.add(value === 'nao-conforme' ? 'status-nao-conforme' : value === 'n-a' ? 'status-n-a' : 'status-conforme');

  itemCard.querySelectorAll('.option').forEach(option => {
    option.classList.toggle('selected', option.dataset.status === value);
  });
}

function updateSummary() {
  const allInputs = document.querySelectorAll('input[type="radio"]');
  let countConforme = 0;
  let countNaoConforme = 0;

  allInputs.forEach(input => {
    if (input.checked) {
      if (input.value === 'conforme') countConforme += 1;
      if (input.value === 'nao-conforme') countNaoConforme += 1;
    }
  });

  totalItens.textContent = allInputs.length / 3;
  itensConformes.textContent = countConforme;
  itensNaoConformes.textContent = countNaoConforme;

  const apto = countNaoConforme === 0 ? 'Apto' : 'Não apto';
  statusRodar.textContent = apto;
  aptidaoSistema.textContent = apto;

  const badgeClass = countNaoConforme === 0 ? 'status-apto' : 'status-nao-apto';
  resultBadge.classList.remove('status-apto', 'status-nao-apto');
  resultBadge.classList.add(badgeClass);
  resultBadge.textContent = countNaoConforme === 0 ? 'Apto para rodar' : 'Não apto para rodar';

  observacoesSistema.textContent = countNaoConforme === 0 ? 'Sem pendências' : 'Há itens fora do padrão';
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

function addCustomItem() {
  const name = document.getElementById('customItemName').value.trim();
  const category = document.getElementById('customItemCategory').value;
  const description = document.getElementById('customItemDescription').value.trim();

  if (!name || !description) {
    alert('Preencha nome e descrição antes de adicionar o item.');
    return;
  }

  const customItems = getCustomItems();
  customItems.push({
    id: `custom-${Date.now()}`,
    name,
    description,
    category
  });

  localStorage.setItem(STORAGE_KEYS.customItems, JSON.stringify(customItems));
  document.getElementById('customItemName').value = '';
  document.getElementById('customItemDescription').value = '';
  renderChecklist(rfList, getAllRfItems(), 'RF');
  bindRadioEvents();
  updateSummary();
  alert('Item adicionado com sucesso!');
}

function populateVehicleOptions() {
  veiculoSelect.innerHTML = '<option value="">Selecione um veículo</option>' +
    appState.vehicles.map(vehicle => `<option value="${vehicle}">${vehicle}</option>`).join('');
}

function addVehicle() {
  const value = novoVeiculoInput.value.trim();
  if (!value) {
    alert('Digite o nome do veículo antes de adicionar.');
    return;
  }

  if (!appState.vehicles.includes(value)) {
    appState.vehicles.push(value);
    localStorage.setItem('checklist-vehicles-v1', JSON.stringify(appState.vehicles));
    populateVehicleOptions();
    veiculoSelect.value = value;
    alert('Veículo adicionado com sucesso!');
  } else {
    veiculoSelect.value = value;
    alert('Esse veículo já está cadastrado.');
  }

  novoVeiculoInput.value = '';
}

function getHistory() {
  const raw = localStorage.getItem(STORAGE_KEYS.history);
  return raw ? JSON.parse(raw) : [];
}

function saveHistory(entry) {
  const history = getHistory();
  history.unshift(entry);
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

  return 'Registro do sistema';
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
    ['Veículo', 'Equipamento', 'Placa', 'Data', 'Responsável', 'Resultado', 'Não conformidade'],
    ...history.map(item => [
      item.veiculo || '',
      item.equipamento || '',
      item.placa || '',
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

function saveInspection() {
  const currentUser = getCurrentUser();
  const now = new Date().toISOString();
  const existing = JSON.parse(localStorage.getItem('checklist-inspecao-v2') || 'null');

  const payload = {
    veiculo: veiculoSelect.value,
    equipamento: document.getElementById('equipamento').value,
    placa: document.getElementById('placa').value,
    dataInspecao: document.getElementById('dataInspecao').value,
    responsavel: document.getElementById('responsavel').value,
    naoConformidade: document.getElementById('naoConformidade').value,
    ordemServico: document.getElementById('ordemServico').value,
    aptidaoSistema: aptidaoSistema.textContent,
    respostas: {},
    createdBy: existing?.createdBy || (currentUser ? currentUser.username : 'Sistema'),
    createdAt: existing?.createdAt || now,
    updatedBy: currentUser ? currentUser.username : 'Sistema',
    updatedAt: now,
    loginAt: currentUser ? currentUser.loginAt || null : null,
    logoutAt: currentUser ? currentUser.logoutAt || null : null
  };

  document.querySelectorAll('input[type="radio"]').forEach(radio => {
    if (!payload.respostas[radio.name]) {
      payload.respostas[radio.name] = radio.checked ? radio.value : 'conforme';
    }
  });

  payload.fotos = appState.photos;
  saveHistory(payload);
  localStorage.setItem('checklist-inspecao-v2', JSON.stringify(payload));
  saveAuditEntry('relatorio_salvo', {
    user: payload.updatedBy,
    timestamp: now,
    isNew: !existing
  });
  renderHistory();
  alert('Inspeção salva com sucesso!');
}

function loadSavedInspection() {
  const saved = localStorage.getItem('checklist-inspecao-v2');
  if (!saved) return;

  try {
    const data = JSON.parse(saved);
    if (data.veiculo) {
      veiculoSelect.value = data.veiculo;
    }
    document.getElementById('equipamento').value = data.equipamento || '';
    document.getElementById('placa').value = data.placa || '';
    document.getElementById('dataInspecao').value = data.dataInspecao || '';
    document.getElementById('responsavel').value = data.responsavel || '';
    document.getElementById('naoConformidade').value = data.naoConformidade || '';
    document.getElementById('ordemServico').value = data.ordemServico || 'nao';

    if (data.respostas) {
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

function setAuthMode(mode) {
  const isRegister = mode === 'register';
  document.getElementById('roleField').classList.toggle('hidden', !isRegister);
  const submitBtn = document.querySelector('.auth-submit');
  submitBtn.textContent = isRegister ? 'Cadastrar' : 'Entrar';
  document.querySelectorAll('.auth-tab').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.mode === mode);
  });
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

function loginUser(username, password) {
  const users = getUsers();
  const user = users.find(item => item.username.toLowerCase() === username.toLowerCase() && item.password === password);
  if (!user) {
    return null;
  }

  const userSession = {
    ...user,
    loginAt: new Date().toISOString(),
    logoutAt: null
  };

  localStorage.setItem(STORAGE_KEYS.currentUser, JSON.stringify(userSession));
  saveAuditEntry('login', { loginAt: userSession.loginAt });
  return userSession;
}

function registerUser(username, password, perfil) {
  const users = getUsers();
  const existing = users.find(item => item.username.toLowerCase() === username.toLowerCase());
  if (existing) {
    return false;
  }
  users.push({ username, password, perfil });
  localStorage.setItem(STORAGE_KEYS.users, JSON.stringify(users));
  return true;
}

function updateUserBadge() {
  const currentUser = JSON.parse(localStorage.getItem(STORAGE_KEYS.currentUser) || 'null');
  const badge = document.getElementById('userBadge');
  if (badge) {
    badge.textContent = currentUser ? `Usuário: ${currentUser.username}` : 'Usuário';
  }
}

function logoutUser() {
  const currentUser = getCurrentUser();
  const logoutAt = new Date().toISOString();

  if (currentUser) {
    const updatedUser = {
      ...currentUser,
      logoutAt,
      lastSession: currentUser.loginAt || null
    };
    localStorage.setItem(STORAGE_KEYS.currentUser, JSON.stringify(updatedUser));
    saveAuditEntry('logout', { logoutAt, loginAt: currentUser.loginAt || null });
  }

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
    const username = document.getElementById('authUsuario').value.trim();
    const password = document.getElementById('authSenha').value.trim();
    const mode = document.querySelector('.auth-tab.active')?.dataset.mode || 'login';

    if (mode === 'register') {
      const perfil = document.getElementById('authPerfil').value;
      if (registerUser(username, password, perfil)) {
        authMessage('Usuário cadastrado com sucesso. Faça login.');
        setAuthMode('login');
        document.getElementById('authForm').reset();
      } else {
        authMessage('Usuário já existe. Tente outro nome.', true);
      }
      return;
    }

    const user = loginUser(username, password);
    if (!user) {
      authMessage('Credenciais inválidas.', true);
      return;
    }

    authMessage('Login realizado com sucesso!');
    ensureSession();
  });

  document.getElementById('logoutBtn').addEventListener('click', logoutUser);
}

adicionarVeiculoBtn.addEventListener('click', addVehicle);
novoVeiculoInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    event.preventDefault();
    addVehicle();
  }
});

populateVehicleOptions();
renderChecklist(rfList, rfItems, 'RF');
renderRnfChecklist();
renderHistory();
bindRadioEvents();
updateSummary();
loadSavedInspection();
updateSummary();
bindAuthEvents();
setAuthMode('login');
ensureSession();

salvarChecklistBtn.addEventListener('click', saveInspection);
exportPdfBtn.addEventListener('click', () => window.print());
exportCsvBtn.addEventListener('click', exportCsv);
document.getElementById('adicionarItemChecklist').addEventListener('click', addCustomItem);
