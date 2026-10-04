// script.js - Lógica minimalista usando localStorage

const STORAGE_KEY = 'epd-projects-v0'

// Helpers
const el = id => document.getElementById(id)
const fmtDate = d => new Date(d).toLocaleDateString()
const uid = ()=> Date.now().toString(36) + Math.random().toString(36).slice(2,6)

// State
let projects = []
let selectedProjectId = null

// Load / Save
function load(){
  try{projects = JSON.parse(localStorage.getItem(STORAGE_KEY)) || []}catch(e){projects = []}
}
function save(){localStorage.setItem(STORAGE_KEY, JSON.stringify(projects))}

// Project operations
function createProject(name){
  const p = {id:uid(), name: name||'Proyecto sin nombre', activities: []}
  projects.push(p); save(); selectProject(p.id); render()
}
function deleteProject(id){
  projects = projects.filter(p=>p.id!==id); if(selectedProjectId===id) selectedProjectId = projects.length?projects[0].id:null; save(); render()
}
function renameProject(id,newName){
  const p = projects.find(x=>x.id===id); if(p){p.name=newName; save(); render()}
}
function selectProject(id){ selectedProjectId = id; saveSelection(); render() }
function saveSelection(){ localStorage.setItem(STORAGE_KEY+'-sel', selectedProjectId || '') }
function loadSelection(){ const s = localStorage.getItem(STORAGE_KEY+'-sel'); if(s){ selectedProjectId = s } }

// Activities
function addActivity(projectId, data){
  const p = projects.find(x=>x.id===projectId); if(!p) return
  const act = Object.assign({id:uid(), order: p.activities.length}, data)
  p.activities.push(act); save(); render()
}
function updateActivity(projectId, actId, data){
  const p = projects.find(x=>x.id===projectId); if(!p) return
  const a = p.activities.find(x=>x.id===actId); if(!a) return
  Object.assign(a,data); save(); render()
}
function deleteActivity(projectId, actId){
  const p = projects.find(x=>x.id===projectId); if(!p) return
  p.activities = p.activities.filter(a=>a.id!==actId)
  // reindex order
  p.activities.forEach((a,i)=>a.order=i)
  save(); render()
}
function moveActivity(projectId, actId, dir){
  const p = projects.find(x=>x.id===projectId); if(!p) return
  const idx = p.activities.findIndex(a=>a.id===actId); if(idx<0) return
  const to = dir==='up'?idx-1:idx+1
  if(to<0||to>=p.activities.length) return
  const tmp = p.activities[to]; p.activities[to]=p.activities[idx]; p.activities[idx]=tmp
  p.activities.forEach((a,i)=>a.order=i); save(); render()
}

// Rendering
function render(){
  renderProjectsList()
  renderMain()
}

function renderProjectsList(){
  const list = el('projectsList'); list.innerHTML=''
  projects.forEach(p=>{
    const li = document.createElement('li')
    li.className = (p.id===selectedProjectId)?'active':''
    li.innerHTML = `<div class="project-name">${escapeHtml(p.name)}</div>
      <div class="project-actions">
        <button title="Seleccionar" class="btn" data-act="select" data-id="${p.id}">Abrir</button>
        <button title="Eliminar" class="btn" data-act="delete" data-id="${p.id}">Eliminar</button>
      </div>`
    list.appendChild(li)
  })
}

function renderMain(){
  const title = el('projectTitle')
  const addBtn = el('addActivityBtn')
  const empty = el('emptyState')
  const listView = el('listView')
  const weekView = el('weekView')
  const view = el('viewSelect').value

  if(!selectedProjectId){ title.textContent='Selecciona o crea un proyecto'; addBtn.disabled=true; empty.style.display='block'; listView.classList.add('hidden'); weekView.classList.add('hidden'); return }

  const project = projects.find(p=>p.id===selectedProjectId)
  if(!project){ title.textContent='Proyecto no encontrado'; addBtn.disabled=true; return }
  title.textContent = project.name
  addBtn.disabled=false
  empty.style.display = project.activities.length? 'none':'block'

  // Sort activities by date then order
  const acts = project.activities.slice().sort((a,b)=>{
    if(a.date && b.date){ if(a.date!==b.date) return a.date<b.date?-1:1 }
    return (a.order||0)-(b.order||0)
  })

  // LIST VIEW
  listView.innerHTML = ''
  const groups = groupByDate(acts)
  Object.keys(groups).forEach(date=>{
    const dg = document.createElement('div'); dg.className='date-group card'
    const hd = document.createElement('div'); hd.className='date-heading'; hd.textContent = date==='': 'Sin fecha'
    hd.textContent = date? `${date}` : 'Sin fecha'
    dg.appendChild(hd)
    groups[date].forEach(a=>{
      const node = renderActivityNode(a)
      dg.appendChild(node)
    })
    listView.appendChild(dg)
  })

  // WEEK VIEW
  weekView.innerHTML=''
  const weekDays = getWeekDays(new Date())
  weekDays.forEach(day=>{
    const col = document.createElement('div'); col.className='day-column card'
    const lbl = document.createElement('div'); lbl.className='day-label'; lbl.textContent = `${day.toLocaleDateString(undefined,{weekday:'short',day:'numeric'})}`
    col.appendChild(lbl)
    const dayStr = toISODate(day)
    groups[dayStr] && groups[dayStr].forEach(a=>{
      const box = document.createElement('div'); box.className='activity-box'
      box.innerHTML = `<div class="title">${escapeHtml(a.title)}</div><div class="small">${a.duration?a.duration+' min':''} ${a.resources?'<br/>'+escapeHtml(a.resources):''}</div>
        <div style="margin-top:6px"><button class="btn" data-act="edit" data-id="${a.id}" data-pid="${project.id}">Editar</button>
        <button class="btn" data-act="del" data-id="${a.id}" data-pid="${project.id}">Eliminar</button></div>`
      col.appendChild(box)
    })
    weekView.appendChild(col)
  })

  // Show proper view
  if(view==='list'){ listView.classList.remove('hidden'); weekView.classList.add('hidden') } else { weekView.classList.remove('hidden'); listView.classList.add('hidden') }
}

function renderActivityNode(a){
  const node = document.createElement('div'); node.className='card activity'
  const left = document.createElement('div'); left.style.flex='1'
  left.innerHTML = `<div class="title">${escapeHtml(a.title)}</div>
    <div class="meta">${a.date?a.date:''} ${a.duration? ' • ' + a.duration+' min':''}</div>
    <div class="small">${escapeHtml(a.description||'')}</div>`
  const right = document.createElement('div'); right.className='activity-actions'
  right.innerHTML = `<div class="controls">
    <button class="btn" data-act="up" data-id="${a.id}">↑</button>
    <button class="btn" data-act="down" data-id="${a.id}">↓</button>
    <button class="btn" data-act="edit" data-id="${a.id}">Editar</button>
    <button class="btn" data-act="del" data-id="${a.id}">Eliminar</button>
  </div>`
  node.appendChild(left); node.appendChild(right)
  // attach dataset
  node.querySelectorAll('button').forEach(b=>{
    b.addEventListener('click', e=>{
      const act = b.dataset.act
      const id = b.dataset.id
      if(act==='up') moveActivity(selectedProjectId,id,'up')
      if(act==='down') moveActivity(selectedProjectId,id,'down')
      if(act==='edit') openActivityModalForEdit(id)
      if(act==='del') if(confirm('Eliminar actividad?')) deleteActivity(selectedProjectId,id)
    })
  })
  return node
}

// Utilities
function groupByDate(acts){
  const g = {}
  acts.forEach(a=>{
    const d = a.date || ''
    if(!g[d]) g[d]=[]
    g[d].push(a)
  })
  return g
}
function escapeHtml(s){ if(!s) return ''; return s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;') }
function toISODate(d){ const dt = new Date(d); const yyyy=dt.getFullYear(); const m=(dt.getMonth()+1).toString().padStart(2,'0'); const day=dt.getDate().toString().padStart(2,'0'); return `${yyyy}-${m}-${day}` }
function getWeekDays(ref){ const day = new Date(ref); const iso = day.getDay(); const diff = (iso + 6)%7; const monday = new Date(day); monday.setDate(day.getDate()-diff)
  const days = []
  for(let i=0;i<7;i++){ const d = new Date(monday); d.setDate(monday.getDate()+i); days.push(d) }
  return days
}

// Modals & UI wiring
function initUI(){
  // Buttons
  el('newProjectBtn').addEventListener('click', ()=> openProjectModal())
  el('createProjectCancel').addEventListener('click', ()=> closeProjectModal())
  el('createProjectConfirm').addEventListener('click', ()=>{
    const name = el('projectNameInput').value.trim() || 'Proyecto nuevo'
    createProject(name); closeProjectModal(); el('projectNameInput').value=''
  })
  el('projectsList').addEventListener('click', e=>{
    const b = e.target.closest('button')
    if(!b) return
    const act = b.dataset.act; const id = b.dataset.id
    if(act==='select') selectProject(id)
    if(act==='delete') if(confirm('Eliminar proyecto? (se perderán las actividades)')) deleteProject(id)
  })

  el('addActivityBtn').addEventListener('click', ()=> openActivityModal())
  el('cancelActivityBtn').addEventListener('click', ()=> closeActivityModal())
  el('saveActivityBtn').addEventListener('click', ()=> saveActivityFromModal())
  el('viewSelect').addEventListener('change', ()=> render())

  // Delegated actions for edit/delete in list view
  el('listView').addEventListener('click', e=>{
    const b = e.target.closest('button'); if(!b) return
    const act = b.dataset.act; const id = b.dataset.id
    if(act==='edit') openActivityModalForEdit(id)
    if(act==='del') if(confirm('Eliminar actividad?')) deleteActivity(selectedProjectId,id)
    if(act==='up') moveActivity(selectedProjectId,id,'up')
    if(act==='down') moveActivity(selectedProjectId,id,'down')
  })
}

// Project modal
function openProjectModal(){ el('projectModal').classList.remove('hidden'); el('projectNameInput').focus() }
function closeProjectModal(){ el('projectModal').classList.add('hidden') }

// Activity modal
let editingActivityId = null
function openActivityModal(){ editingActivityId = null; el('activityModalTitle').textContent='Añadir actividad'; el('actTitle').value=''; el('actDesc').value=''; el('actDate').value=''; el('actDuration').value=''; el('actResources').value=''; el('activityModal').classList.remove('hidden') }
function openActivityModalForEdit(id){ const p = projects.find(x=>x.id===selectedProjectId); if(!p) return; const a = p.activities.find(x=>x.id===id); if(!a) return; editingActivityId = id; el('activityModalTitle').textContent='Editar actividad'; el('actTitle').value=a.title||''; el('actDesc').value=a.description||''; el('actDate').value=a.date||''; el('actDuration').value=a.duration||''; el('actResources').value=a.resources||''; el('activityModal').classList.remove('hidden') }
function closeActivityModal(){ el('activityModal').classList.add('hidden') }
function saveActivityFromModal(){ const title = el('actTitle').value.trim(); if(!title){alert('Título requerido'); return}
  const data = { title, description: el('actDesc').value.trim(), date: el('actDate').value || null, duration: el('actDuration').value?Number(el('actDuration').value):null, resources: el('actResources').value.trim() }
  if(!selectedProjectId){ alert('Selecciona un proyecto'); closeActivityModal(); return }
  if(editingActivityId) updateActivity(selectedProjectId, editingActivityId, data)
  else addActivity(selectedProjectId, data)
  closeActivityModal()
}

// Initial setup
function ensureSample(){ if(projects.length===0){ const pid = uid(); projects.push({id:pid,name:'Unidad: Semana de introducción', activities:[
  {id:uid(), title:'Presentación del proyecto', description:'Actividad inicial para conocer objetivos', date:toISODate(new Date()), duration:45, resources:'', order:0},
  {id:uid(), title:'Lectura guiada', description:'Texto de referencia y discusión', date:toISODate(new Date()), duration:60, resources:'', order:1},
  {id:uid(), title:'Actividad práctica', description:'Trabajo en parejas', date:toISODate(new Date(new Date().setDate(new Date().getDate()+2))), duration:50, resources:'', order:0}
]})
  save()
  selectedProjectId = pid
}}

// Boot
load(); loadSelection(); ensureSample(); initUI(); render()

// Expose for debugging
window.EPD = {projects, save}
