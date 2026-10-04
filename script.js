const STORAGE_KEY = 'epd-v1-sequences';

const defaultSequence = {
  id: 'seq-1',
  name: 'Secuencia demo',
  nodes: [
    {
      id: 'n-start',
      type: 'activity',
      title: 'Inicio',
      description: 'Presentación del tema y objetivo general.',
      date: '',
      duration: 20,
      resources: '',
      x: 100,
      y: 180,
      children: []
    },
    {
      id: 'n-1',
      type: 'resource',
      title: 'Video introductorio',
      resourceType: 'video',
      url: 'https://www.youtube.com/watch?v=ysz5S6PUM-U',
      description: 'Video breve de introducción.',
      x: 420,
      y: 120,
      children: []
    },
    {
      id: 'n-2',
      type: 'activity',
      title: 'Actividad 1',
      description: 'Reflexión guiada en parejas.',
      date: '',
      duration: 35,
      resources: 'Artículo base',
      x: 420,
      y: 330,
      children: []
    }
  ],
  connections: [
    { from: 'n-start', to: 'n-1' },
    { from: 'n-1', to: 'n-2' }
  ]
};

let sequences = [];
let selectedSequenceId = null;
let modalTarget = null;
let editingNodeId = null;
let isConnectionMode = false;
let connectSourceId = null;

const els = {
  sequenceList: document.getElementById('sequenceList'),
  selectedSequenceName: document.getElementById('selectedSequenceName'),
  addActivityBtn: document.getElementById('addActivityBtn'),
  addResourceBtn: document.getElementById('addResourceBtn'),
  newSequenceBtn: document.getElementById('newSequenceBtn'),
  copilotPanel: document.getElementById('copilotPanel'),
  copilotSectionBtn: document.getElementById('copilotSectionBtn'),
  closeCopilotBtn: document.getElementById('closeCopilotBtn'),
  sequenceCanvas: document.getElementById('sequenceCanvas'),
  nodeLayer: document.getElementById('nodeLayer'),
  connectionsLayer: document.getElementById('connectionsLayer'),
  activityModal: document.getElementById('activityModal'),
  resourceModal: document.getElementById('resourceModal'),
  activityTitleInput: document.getElementById('activityTitleInput'),
  activityDescriptionInput: document.getElementById('activityDescriptionInput'),
  activityDateInput: document.getElementById('activityDateInput'),
  activityDurationInput: document.getElementById('activityDurationInput'),
  activityResourcesInput: document.getElementById('activityResourcesInput'),
  resourceTypeInput: document.getElementById('resourceTypeInput'),
  resourceTitleInput: document.getElementById('resourceTitleInput'),
  resourceUrlInput: document.getElementById('resourceUrlInput'),
  resourceDescriptionInput: document.getElementById('resourceDescriptionInput')
};

function uid(prefix='node') {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

function loadSequences() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      sequences = JSON.parse(raw);
    } else {
      sequences = [structuredClone(defaultSequence)];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sequences));
    }
  } catch (error) {
    sequences = [structuredClone(defaultSequence)];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sequences));
  }

  selectedSequenceId = sequences[0]?.id || null;
}

function saveSequences() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sequences));
}

function getSelectedSequence() {
  return sequences.find((s) => s.id === selectedSequenceId) || null;
}

function renderSequenceList() {
  els.sequenceList.innerHTML = '';

  sequences.forEach((sequence) => {
    const item = document.createElement('div');
    item.className = `sequence-item ${sequence.id === selectedSequenceId ? 'active' : ''}`;

    const info = document.createElement('button');
    info.className = 'name';
    info.type = 'button';
    info.textContent = sequence.name;
    info.addEventListener('click', () => selectSequence(sequence.id));

    const actions = document.createElement('div');
    actions.className = 'row-actions';

    const del = document.createElement('button');
    del.type = 'button';
    del.textContent = '✕';
    del.title = 'Eliminar secuencia';
    del.addEventListener('click', (e) => {
      e.stopPropagation();
      if (sequences.length > 1 && confirm('¿Eliminar esta secuencia?')) {
        sequences = sequences.filter(s => s.id !== sequence.id);
        selectedSequenceId = sequences[0].id;
        saveSequences();
        render();
      }
    });

    actions.appendChild(del);
    item.append(info, actions);
    els.sequenceList.appendChild(item);
  });
}

function renderSequenceCanvas() {
  const sequence = getSelectedSequence();
  if (!sequence) {
    els.selectedSequenceName.textContent = 'Sin secuencia';
    els.nodeLayer.innerHTML = '';
    els.connectionsLayer.innerHTML = '';
    return;
  }

  els.selectedSequenceName.textContent = sequence.name;
  els.nodeLayer.innerHTML = '';
  els.connectionsLayer.innerHTML = '';

  const connections = sequence.connections || [];

  connections.forEach((c) => {
    const fromNode = sequence.nodes.find((n) => n.id === c.from);
    const toNode = sequence.nodes.find((n) => n.id === c.to);
    if (!fromNode || !toNode) return;

    const svgLine = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    const x1 = fromNode.x + 110;
    const y1 = fromNode.y + 60;
    const x2 = toNode.x + 110;
    const y2 = toNode.y + 60;
    const cx1 = x1 + 40;
    const cy1 = y1;
    const cx2 = x2 - 40;
    const cy2 = y2;
    svgLine.setAttribute('d', `M ${x1} ${y1} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${x2} ${y2}`);
    svgLine.setAttribute('stroke', '#66d4ff');
    svgLine.setAttribute('stroke-width', '3');
    svgLine.setAttribute('fill', 'none');
    svgLine.setAttribute('opacity', '0.9');
    svgLine.setAttribute('stroke-linecap', 'round');
    els.connectionsLayer.appendChild(svgLine);
  });

  sequence.nodes.forEach((node) => {
    const el = document.createElement('div');
    el.className = `node ${node.type}`;
    el.dataset.id = node.id;
    el.style.left = `${node.x}px`;
    el.style.top = `${node.y}px`;

    const iconMap = {
      activity: '✍',
      resource: {
        article: '📖',
        video: '▶',
        image: '📷'
      }
    };

    const head = document.createElement('div');
    head.className = 'node-head';

    const label = document.createElement('div');
    label.className = 'node-icon';
    label.textContent = node.type === 'resource'
      ? iconMap.resource[node.resourceType || 'article']
      : iconMap.activity;

    const actions = document.createElement('div');
    actions.className = 'node-actions';

    const connectBtn = document.createElement('button');
    connectBtn.type = 'button';
    connectBtn.textContent = '↗';
    connectBtn.title = 'Conectar';
    connectBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      isConnectionMode = true;
      connectSourceId = node.id;
      connectBtn.style.background = 'rgba(0,0,0,0.12)';
    });

    const del = document.createElement('button');
    del.type = 'button';
    del.textContent = '×';
    del.title = 'Eliminar';
    del.addEventListener('click', (e) => {
      e.stopPropagation();
      deleteNode(node.id);
    });

    actions.append(connectBtn, del);
    head.append(label, actions);

    const title = document.createElement('div');
    title.className = 'node-title';
    title.textContent = node.type === 'activity' ? (node.title || 'Nueva actividad') : (node.title || 'Nuevo recurso');

    const content = document.createElement('div');
    content.className = 'node-content';

    if (node.type === 'activity') {
      content.innerHTML = `
        <div>${node.description || 'Sin descripción'}</div>
      `;
    } else {
      const kind = node.resourceType || 'article';
      content.innerHTML = `
        <div>${kind === 'video' ? 'Video' : kind === 'image' ? 'Imagen' : 'Artículo'}</div>
        <div>${node.url || 'Sin enlace'}</div>
      `;
    }

    const footer = document.createElement('div');
    footer.className = 'node-footer';
    footer.innerHTML = node.type === 'activity'
      ? `<span>${node.date || 'Sin fecha'}</span><span>${node.duration || 0} min</span>`
      : `<span>${(node.resourceType || 'article').toUpperCase()}</span><span>${node.url ? 'Enlace' : 'Sin enlace'}</span>`;

    el.appendChild(head);
    el.appendChild(title);
    el.appendChild(content);
    el.appendChild(footer);

    el.addEventListener('click', (event) => {
      if (isConnectionMode && connectSourceId && connectSourceId !== node.id) {
        addConnection(connectSourceId, node.id);
        isConnectionMode = false;
        connectSourceId = null;
        render();
        return;
      }

      if (node.type === 'activity') {
        openActivityModal(node.id);
      } else {
        openResourceModal(node.id);
      }
    });

    let drag = null;
    const startDrag = (event) => {
      if (event.target.closest('button')) return;
      drag = {
        nodeId: node.id,
        offsetX: event.clientX - node.x,
        offsetY: event.clientY - node.y
      };
    };

    el.addEventListener('pointerdown', startDrag);
    el.addEventListener('pointermove', (event) => {
      if (!drag || drag.nodeId !== node.id) return;
      const sequence = getSelectedSequence();
      const targetNode = sequence.nodes.find((n) => n.id === node.id);
      if (!targetNode) return;
      const rect = els.sequenceCanvas.getBoundingClientRect();
      targetNode.x = Math.max(20, event.clientX - rect.left - drag.offsetX);
      targetNode.y = Math.max(20, event.clientY - rect.top - drag.offsetY);
      renderSequenceCanvas();
      saveSequences();
    });
    el.addEventListener('pointerup', () => { drag = null; });
    el.addEventListener('pointerleave', () => { drag = null; });

    els.nodeLayer.appendChild(el);
  });
}

function selectSequence(sequenceId) {
  selectedSequenceId = sequenceId;
  render();
}

function createSequence() {
  const name = `Secuencia ${sequences.length + 1}`;
  const seq = {
    id: uid('seq'),
    name,
    nodes: [
      {
        id: uid('start'),
        type: 'activity',
        title: 'Inicio',
        description: 'Objetivo de la secuencia didáctica.',
        date: '',
        duration: 20,
        resources: '',
        x: 90,
        y: 190,
        children: []
      }
    ],
    connections: []
  };
  sequences.push(seq);
  selectedSequenceId = seq.id;
  saveSequences();
  render();
}

function addNode(type) {
  const sequence = getSelectedSequence();
  if (!sequence) return;

  const node = {
    id: uid(type === 'activity' ? 'activity' : 'resource'),
    type,
    x: 180 + (sequence.nodes.length * 40) % 200,
    y: 120 + (sequence.nodes.length * 35) % 180,
    children: [],
    title: type === 'activity' ? 'Nueva actividad' : 'Nuevo recurso',
    description: type === 'activity' ? 'Describa la actividad...' : 'Describa el recurso...',
    date: '',
    duration: 30,
    resources: '',
    resourceType: 'article',
    url: ''
  };

  sequence.nodes.push(node);
  saveSequences();
  render();
}

function addConnection(fromId, toId) {
  const sequence = getSelectedSequence();
  if (!sequence) return;

  const exists = sequence.connections.some((c) => c.from === fromId && c.to === toId);
  if (exists) return;

  sequence.connections.push({ from: fromId, to: toId });
  saveSequences();
}

function deleteNode(nodeId) {
  const sequence = getSelectedSequence();
  if (!sequence) return;

  sequence.nodes = sequence.nodes.filter((n) => n.id !== nodeId);
  sequence.connections = sequence.connections.filter(
    (c) => c.from !== nodeId && c.to !== nodeId
  );
  saveSequences();
  render();
}

function openActivityModal(nodeId) {
  const sequence = getSelectedSequence();
  const node = sequence?.nodes.find((n) => n.id === nodeId);
  if (!node) return;

  editingNodeId = nodeId;
  modalTarget = 'activity';
  els.activityTitleInput.value = node.title || '';
  els.activityDescriptionInput.value = node.description || '';
  els.activityDateInput.value = node.date || '';
  els.activityDurationInput.value = node.duration || 30;
  els.activityResourcesInput.value = node.resources || '';
  els.activityModal.classList.remove('hidden');
}

function openResourceModal(nodeId) {
  const sequence = getSelectedSequence();
  const node = sequence?.nodes.find((n) => n.id === nodeId);
  if (!node) return;

  editingNodeId = nodeId;
  modalTarget = 'resource';
  els.resourceTypeInput.value = node.resourceType || 'article';
  els.resourceTitleInput.value = node.title || '';
  els.resourceUrlInput.value = node.url || '';
  els.resourceDescriptionInput.value = node.description || '';
  els.resourceModal.classList.remove('hidden');
}

function closeModal(name) {
  const modal = name === 'activity' ? els.activityModal : els.resourceModal;
  modal.classList.add('hidden');
  editingNodeId = null;
  modalTarget = null;
}

function saveActivityFromModal() {
  const sequence = getSelectedSequence();
  if (!sequence || !editingNodeId) return;

  const node = sequence.nodes.find((n) => n.id === editingNodeId);
  if (!node) return;

  node.title = els.activityTitleInput.value.trim() || 'Nueva actividad';
  node.description = els.activityDescriptionInput.value.trim();
  node.date = els.activityDateInput.value;
  node.duration = Number(els.activityDurationInput.value || 0);
  node.resources = els.activityResourcesInput.value.trim();

  saveSequences();
  closeModal('activity');
  render();
}

function saveResourceFromModal() {
  const sequence = getSelectedSequence();
  if (!sequence || !editingNodeId) return;

  const node = sequence.nodes.find((n) => n.id === editingNodeId);
  if (!node) return;

  node.type = 'resource';
  node.resourceType = els.resourceTypeInput.value;
  node.title = els.resourceTitleInput.value.trim() || 'Nuevo recurso';
  node.url = els.resourceUrlInput.value.trim();
  node.description = els.resourceDescriptionInput.value.trim();

  saveSequences();
  closeModal('resource');
  render();
}

function render() {
  renderSequenceList();
  renderSequenceCanvas();
}

function bindUi() {
  document.getElementById('newSequenceBtn').addEventListener('click', createSequence);
  document.getElementById('addActivityBtn').addEventListener('click', () => addNode('activity'));
  document.getElementById('addResourceBtn').addEventListener('click', () => addNode('resource'));
  document.getElementById('copilotSectionBtn').addEventListener('click', () => {
    els.copilotPanel.classList.remove('hidden');
  });
  document.getElementById('closeCopilotBtn').addEventListener('click', () => {
    els.copilotPanel.classList.add('hidden');
  });

  document.getElementById('saveActivityBtn').addEventListener('click', saveActivityFromModal);
  document.getElementById('saveResourceBtn').addEventListener('click', saveResourceFromModal);

  document.querySelectorAll('.modal-close').forEach((button) => {
    button.addEventListener('click', () => {
      const target = button.dataset.close;
      if (target === 'activityModal') closeModal('activity');
      if (target === 'resourceModal') closeModal('resource');
    });
  });

  document.getElementById('sendCopilotBtn').addEventListener('click', () => {
    const input = document.getElementById('copilotInput');
    const text = input.value.trim();
    if (!text) return;

    const thread = document.querySelector('.copilot-thread');
    const userMsg = document.createElement('div');
    userMsg.className = 'message user';
    userMsg.textContent = text;
    thread.appendChild(userMsg);

    const reply = document.createElement('div');
    reply.className = 'message welcome';
    reply.textContent = 'He recibido tu solicitud. En una próxima versión podré ayudarte a crear secuencias, actividades y recursos.';
    thread.appendChild(reply);

    input.value = '';
    thread.scrollTop = thread.scrollHeight;
  });
}

loadSequences();
bindUi();
render();
