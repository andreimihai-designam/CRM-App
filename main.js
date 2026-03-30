// ============================================================
// DATA STORE
// ============================================================
let state = {
    clients: [],
    reminders: [],
    activity: [],
    settings: { name: 'Ion Popescu', email: 'ion@afacere.ro', business: 'Afacerea Mea' },
    currentFilter: 'all',
    sortOrder: 'recent',
    searchQuery: ''
};

const AVATAR_COLORS = ['#7C8C5E', '#4A5C35', '#8B7355', '#5C7A6E', '#7A6E5C', '#6E7A5C', '#5C6E7A', '#3D5A4C'];

function getAvatarColor(name) {
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function getInitials(name) {
    return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

function getId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

function saveState() { localStorage.setItem('clientbook_v2', JSON.stringify(state)); }

function loadState() {
    const raw = localStorage.getItem('clientbook_v2');
    if (raw) { try { state = { ...state, ...JSON.parse(raw) }; } catch (e) { } }
}

function formatDate(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toLocaleDateString('ro-RO', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function timeAgo(iso) {
    const diff = Date.now() - new Date(iso).getTime();
    const min = Math.floor(diff / 60000);
    const hr = Math.floor(diff / 3600000);
    const day = Math.floor(diff / 86400000);
    if (min < 2) return 'acum';
    if (min < 60) return `${min} min`;
    if (hr < 24) return `${hr}h`;
    return `${day}z`;
}

// ============================================================
// NAVIGATION
// ============================================================
function showView(viewId, el) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.getElementById('view-' + viewId).classList.add('active');
    if (el) el.classList.add('active');
    const titles = { dashboard: 'Dashboard', clients: 'Clienți', detail: 'Detalii Client', reminders: 'Remindere', settings: 'Setări' };
    document.getElementById('page-title').textContent = titles[viewId] || viewId;
    if (viewId === 'dashboard') renderDashboard();
    if (viewId === 'clients') renderClients();
    if (viewId === 'reminders') renderReminders();
    closeSidebar();
}

function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('open');
    document.getElementById('overlay-bg').classList.toggle('open');
}

function closeSidebar() {
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('overlay-bg').classList.remove('open');
}

// ============================================================
// MODALS
// ============================================================
function openModal(id) { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }

// ============================================================
// CLIENTS CRUD
// ============================================================
function openAddClient() {
    document.getElementById('modal-client-title').textContent = 'Client Nou';
    document.getElementById('edit-client-id').value = '';
    document.getElementById('f-name').value = '';
    document.getElementById('f-phone').value = '';
    document.getElementById('f-email').value = '';
    document.getElementById('f-address').value = '';
    document.getElementById('f-notes').value = '';
    document.getElementById('f-tag').value = 'nou';
    document.querySelectorAll('.tag-option').forEach(t => t.classList.remove('selected'));
    document.querySelector('.tag-option-nou').classList.add('selected');
    openModal('modal-client');
}

function openEditClient(id) {
    const c = state.clients.find(x => x.id === id);
    if (!c) return;
    document.getElementById('modal-client-title').textContent = 'Editează Client';
    document.getElementById('edit-client-id').value = c.id;
    document.getElementById('f-name').value = c.name;
    document.getElementById('f-phone').value = c.phone || '';
    document.getElementById('f-email').value = c.email || '';
    document.getElementById('f-address').value = c.address || '';
    document.getElementById('f-notes').value = c.notes || '';
    document.getElementById('f-tag').value = c.tag;
    document.querySelectorAll('.tag-option').forEach(t => t.classList.remove('selected'));
    const tagEl = document.querySelector(`.tag-option-${c.tag}`);
    if (tagEl) tagEl.classList.add('selected');
    openModal('modal-client');
}

function selectTag(el, tag) {
    document.querySelectorAll('.tag-option').forEach(t => t.classList.remove('selected'));
    el.classList.add('selected');
    document.getElementById('f-tag').value = tag;
}

function saveClient() {
    const name = document.getElementById('f-name').value.trim();
    if (!name) { toast('Introduceți numele clientului!', 'error'); return; }
    const id = document.getElementById('edit-client-id').value;
    const data = {
        name,
        phone: document.getElementById('f-phone').value.trim(),
        email: document.getElementById('f-email').value.trim(),
        address: document.getElementById('f-address').value.trim(),
        notes: document.getElementById('f-notes').value.trim(),
        tag: document.getElementById('f-tag').value,
        interactions: []
    };
    if (id) {
        const idx = state.clients.findIndex(c => c.id === id);
        if (idx !== -1) { data.id = id; data.createdAt = state.clients[idx].createdAt; data.interactions = state.clients[idx].interactions; state.clients[idx] = data; }
        addActivity('✏️', `${name}`, 'Client actualizat', 'note');
        toast('Client actualizat cu succes!');
    } else {
        data.id = getId();
        data.createdAt = new Date().toISOString();
        state.clients.unshift(data);
        addActivity('✨', name, 'Client nou adăugat', 'new');
        toast('Client adăugat cu succes!');
    }
    saveState();
    closeModal('modal-client');
    renderClients();
    renderDashboard();
    updateBadges();
}

function confirmDeleteClient(id) {
    document.getElementById('confirm-delete-btn').onclick = () => deleteClient(id);
    openModal('modal-confirm');
}

function deleteClient(id) {
    const c = state.clients.find(x => x.id === id);
    if (c) addActivity('🗑️', c.name, 'Client șters', 'note');
    state.clients = state.clients.filter(x => x.id !== id);
    saveState();
    closeModal('modal-confirm');
    toast('Client șters.', 'error');
    showView('clients', document.querySelector('[onclick*="clients"]'));
    renderDashboard();
    updateBadges();
}

// ============================================================
// RENDER CLIENTS
// ============================================================
function getFilteredClients() {
    let list = [...state.clients];
    if (state.searchQuery) {
        const q = state.searchQuery.toLowerCase();
        list = list.filter(c => c.name.toLowerCase().includes(q) || (c.phone || '').includes(q) || (c.email || '').toLowerCase().includes(q));
    }
    if (state.currentFilter !== 'all') {
        list = list.filter(c => c.tag === state.currentFilter);
    }
    if (state.sortOrder === 'alpha') list.sort((a, b) => a.name.localeCompare(b.name));
    else if (state.sortOrder === 'oldest') list.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    return list;
}

function renderClients() {
    const list = getFilteredClients();
    const container = document.getElementById('client-table');
    if (list.length === 0) {
        container.innerHTML = `<div class="no-results">
      <div style="font-size:40px;margin-bottom:12px">🔍</div>
      <div style="font-family:'Playfair Display',serif;font-size:18px;color:var(--text-mid);margin-bottom:6px">${state.searchQuery ? 'Niciun rezultat' : 'Niciun client'}</div>
      <div style="font-size:13px;color:var(--text-light)">${state.searchQuery ? 'Încearcă alt termen de căutare' : 'Adaugă primul client cu butonul ＋'}</div>
    </div>`;
        return;
    }
    const tagMap = { nou: '<span class="tag tag-nou">🟢 Nou</span>', fidel: '<span class="tag tag-fidel">⭐ Fidel</span>', important: '<span class="tag tag-important">🔴 Important</span>', inactiv: '<span class="tag tag-inactiv">⬜ Inactiv</span>' };
    container.innerHTML = `
    <div class="table-header">
      <div>Client</div>
      <div>Telefon</div>
      <div class="col-email">Email</div>
      <div class="col-tag">Etichetă</div>
      <div>Adăugat</div>
      <div>Acțiuni</div>
    </div>
    ${list.map(c => `
    <div class="client-row" onclick="viewClient('${c.id}')">
      <div class="client-name-cell">
        <div class="client-avatar" style="background:${getAvatarColor(c.name)}">${getInitials(c.name)}</div>
        <div class="client-name-info">
          <div class="client-fullname">${c.name}</div>
          <div class="client-added">${c.interactions ? c.interactions.length : 0} interacțiuni</div>
        </div>
      </div>
      <div class="cell-text">${c.phone || '—'}</div>
      <div class="cell-text col-email">${c.email || '—'}</div>
      <div class="col-tag">${tagMap[c.tag] || ''}</div>
      <div class="cell-muted">${formatDate(c.createdAt)}</div>
      <div class="row-actions" onclick="event.stopPropagation()">
        <button class="action-btn view" title="Vezi" onclick="viewClient('${c.id}')">👁</button>
        <button class="action-btn edit" title="Editează" onclick="openEditClient('${c.id}')">✏️</button>
        <button class="action-btn delete" title="Șterge" onclick="confirmDeleteClient('${c.id}')">🗑</button>
      </div>
    </div>
    `).join('')}
  `;
}

function setFilter(f, el) {
    state.currentFilter = f;
    document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
    el.classList.add('active');
    renderClients();
}

function setSortOrder(v) { state.sortOrder = v; renderClients(); }

function handleSearch(q) {
    state.searchQuery = q;
    if (document.getElementById('view-clients').classList.contains('active')) {
        renderClients();
    } else if (q.length > 0) {
        showView('clients', document.querySelector('[onclick*="clients"]'));
    }
}

// ============================================================
// CLIENT DETAIL
// ============================================================
function viewClient(id) {
    const c = state.clients.find(x => x.id === id);
    if (!c) return;
    const tagMap = { nou: '<span class="tag tag-nou">🟢 Nou</span>', fidel: '<span class="tag tag-fidel">⭐ Fidel</span>', important: '<span class="tag tag-important">🔴 Important</span>', inactiv: '<span class="tag tag-inactiv">⬜ Inactiv</span>' };
    const interactions = (c.interactions || []).slice().reverse();
    const intTypeColors = { '📞 Apel': { bg: 'rgba(124,140,94,0.15)', color: 'var(--olive-dark)' }, '🤝 Întâlnire': { bg: 'rgba(184,134,11,0.12)', color: 'var(--gold)' }, '💬 Mesaj': { bg: 'rgba(74,92,53,0.1)', color: 'var(--olive-deep)' }, '📧 Email': { bg: 'rgba(92,122,110,0.15)', color: '#5C7A6E' }, '📝 Notă': { bg: 'rgba(0,0,0,0.06)', color: 'var(--text-light)' } };

    document.getElementById('detail-content').innerHTML = `
    <div style="margin-bottom:16px">
      <button class="btn btn-ghost" onclick="showView('clients', document.querySelector('[onclick*=clients]'))">← Înapoi la clienți</button>
    </div>
    <div class="detail-hero">
      <div class="detail-avatar" style="background:${getAvatarColor(c.name)}">${getInitials(c.name)}</div>
      <div>
        <div class="detail-name">${c.name}</div>
        <div class="detail-meta">${tagMap[c.tag] || ''} &nbsp;·&nbsp; Adăugat: ${formatDate(c.createdAt)}</div>
      </div>
      <div class="detail-actions">
        <button class="btn btn-outline" style="border-color:rgba(255,255,255,0.4);color:var(--cream)" onclick="openEditClient('${c.id}')">✏️ Editează</button>
        ${c.phone ? `<a href="tel:${c.phone}" class="btn btn-primary" style="text-decoration:none">📞 Sună</a>` : ''}
        ${c.phone ? `<a href="https://wa.me/${c.phone.replace(/\s/g, '').replace(/^\+?0/, '+40')}" target="_blank" class="btn btn-primary" style="background:#25D366;text-decoration:none">💬 WhatsApp</a>` : ''}
      </div>
    </div>

    <div class="detail-grid">
      <div>
        <div class="card">
          <div class="card-header">
            <div class="card-title">Informații Contact</div>
          </div>
          <div class="card-body">
            <div class="info-grid">
              <div class="info-item"><div class="info-item-label">Telefon</div><div class="info-item-value">${c.phone || '—'}</div></div>
              <div class="info-item"><div class="info-item-label">Email</div><div class="info-item-value" style="word-break:break-all;font-size:13px">${c.email || '—'}</div></div>
              <div class="info-item" style="grid-column:1/-1"><div class="info-item-label">Adresă</div><div class="info-item-value">${c.address || '—'}</div></div>
              ${c.notes ? `<div class="info-item" style="grid-column:1/-1"><div class="info-item-label">Notițe</div><div class="info-item-value" style="font-size:13px;line-height:1.6;font-weight:400">${c.notes}</div></div>` : ''}
            </div>
          </div>
        </div>

        <div class="card" style="margin-top:20px">
          <div class="card-header">
            <div class="card-title">Istoric Interacțiuni (${interactions.length})</div>
            <button class="btn btn-primary btn-sm" onclick="openAddInteraction('${c.id}')">＋ Adaugă</button>
          </div>
          <div class="card-body">
            ${interactions.length === 0 ? `<div class="empty-state" style="padding:30px 0"><div class="empty-icon" style="font-size:32px">💬</div><div class="empty-title" style="font-size:16px">Nicio interacțiune</div><div class="empty-desc">Înregistrează apeluri, întâlniri sau mesaje</div></div>` :
            interactions.map(i => {
                const style = intTypeColors[i.type] || { bg: 'rgba(0,0,0,0.06)', color: 'var(--text-light)' };
                return `<div class="interaction-item">
                  <div class="interaction-icon" style="background:${style.bg};color:${style.color}">${i.type.split(' ')[0]}</div>
                  <div class="interaction-body">
                    <div class="interaction-header">
                      <div class="interaction-type">${i.type}</div>
                      <div class="interaction-date">${formatDate(i.date)}</div>
                    </div>
                    ${i.desc ? `<div class="interaction-desc">${i.desc}</div>` : ''}
                  </div>
                </div>`;
            }).join('')
        }
          </div>
        </div>
      </div>

      <div>
        <div class="card">
          <div class="card-header">
            <div class="card-title">Remindere</div>
            <button class="btn btn-ghost btn-sm" onclick="openAddReminderForClient('${c.id}')">＋</button>
          </div>
          <div class="card-body">
            ${state.reminders.filter(r => r.clientId === c.id).length === 0 ?
            `<div style="text-align:center;padding:20px 0;color:var(--text-light);font-size:13px">Niciun reminder pentru acest client</div>` :
            state.reminders.filter(r => r.clientId === c.id).map(r => `
                <div class="reminder-item">
                  <div class="reminder-check ${r.done ? 'done' : ''}" onclick="toggleReminder('${r.id}')">✓</div>
                  <div class="reminder-info">
                    <div class="reminder-title" style="${r.done ? 'text-decoration:line-through;opacity:0.5' : ''}">${r.title}</div>
                    <div class="reminder-sub">${formatDate(r.date)}</div>
                  </div>
                  <span class="reminder-urgency urgency-${r.urgency}">${r.urgency === 'high' ? '🔴' : r.urgency === 'mid' ? '🟡' : '🟢'}</span>
                </div>
              `).join('')
        }
          </div>
        </div>

        <div class="card" style="margin-top:16px">
          <div class="card-header">
            <div class="card-title">Acțiuni Rapide</div>
          </div>
          <div class="card-body" style="display:flex;flex-direction:column;gap:8px">
            <button class="btn btn-outline" onclick="openAddInteraction('${c.id}')">📞 Înregistrează apel</button>
            <button class="btn btn-outline" onclick="openAddReminderForClient('${c.id}')">🔔 Setează reminder</button>
            <button class="btn btn-outline" onclick="openEditClient('${c.id}')">✏️ Editează client</button>
            <button class="btn btn-danger btn-sm" style="margin-top:8px" onclick="confirmDeleteClient('${c.id}')">🗑️ Șterge client</button>
          </div>
        </div>
      </div>
    </div>
  `;
    showView('detail', null);
}

// ============================================================
// INTERACTIONS
// ============================================================
function openAddInteraction(clientId) {
    document.getElementById('interaction-client-id').value = clientId;
    document.getElementById('i-type').value = '📞 Apel';
    document.getElementById('i-desc').value = '';
    openModal('modal-interaction');
}

function saveInteraction() {
    const clientId = document.getElementById('interaction-client-id').value;
    const c = state.clients.find(x => x.id === clientId);
    if (!c) return;
    if (!c.interactions) c.interactions = [];
    const type = document.getElementById('i-type').value;
    const desc = document.getElementById('i-desc').value.trim();
    c.interactions.push({ id: getId(), type, desc, date: new Date().toISOString() });
    addActivity(type.split(' ')[0], c.name, `${type}${desc ? ': ' + desc.slice(0, 40) : ''}`, 'call');
    saveState();
    closeModal('modal-interaction');
    toast('Interacțiune salvată!');
    viewClient(clientId);
}

// ============================================================
// REMINDERS
// ============================================================
function populateReminderClientSelect() {
    const sel = document.getElementById('r-client');
    sel.innerHTML = '<option value="">— Niciun client —</option>' +
        state.clients.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
}

function openAddReminder() {
    populateReminderClientSelect();
    document.getElementById('r-title').value = '';
    document.getElementById('r-date').value = new Date().toISOString().split('T')[0];
    document.getElementById('r-urgency').value = 'mid';
    document.getElementById('r-client').value = '';
    openModal('modal-reminder');
}

function openAddReminderForClient(clientId) {
    populateReminderClientSelect();
    const c = state.clients.find(x => x.id === clientId);
    document.getElementById('r-title').value = c ? `Follow-up ${c.name}` : '';
    document.getElementById('r-date').value = new Date().toISOString().split('T')[0];
    document.getElementById('r-urgency').value = 'mid';
    document.getElementById('r-client').value = clientId;
    openModal('modal-reminder');
}

function saveReminder() {
    const title = document.getElementById('r-title').value.trim();
    if (!title) { toast('Introduceți titlul reminderului!', 'error'); return; }
    const r = {
        id: getId(),
        title,
        date: document.getElementById('r-date').value,
        urgency: document.getElementById('r-urgency').value,
        clientId: document.getElementById('r-client').value,
        done: false,
        createdAt: new Date().toISOString()
    };
    state.reminders.unshift(r);
    saveState();
    closeModal('modal-reminder');
    toast('Reminder setat!');
    renderReminders();
    renderDashboard();
    updateBadges();
}

function toggleReminder(id) {
    const r = state.reminders.find(x => x.id === id);
    if (r) { r.done = !r.done; saveState(); renderReminders(); renderDashboard(); updateBadges(); }
}

function deleteReminder(id) {
    state.reminders = state.reminders.filter(x => x.id !== id);
    saveState();
    renderReminders();
    renderDashboard();
    updateBadges();
    toast('Reminder șters.');
}

function renderReminders() {
    const container = document.getElementById('reminders-list');
    const today = new Date().toISOString().split('T')[0];
    const sorted = [...state.reminders].sort((a, b) => (a.done - b.done) || (a.date > b.date ? 1 : -1));

    if (sorted.length === 0) {
        container.innerHTML = `<div class="empty-state"><div class="empty-icon">📅</div><div class="empty-title">Niciun reminder setat</div><div class="empty-desc">Adaugă remindere pentru a nu uita niciun client important</div></div>`;
        return;
    }

    const urgencyLabel = { high: '<span class="reminder-urgency urgency-high">🔴 Urgentă</span>', mid: '<span class="reminder-urgency urgency-mid">🟡 Medie</span>', low: '<span class="reminder-urgency urgency-low">🟢 Scăzută</span>' };

    container.innerHTML = sorted.map(r => {
        const cls = r.done ? '' : r.date < today ? 'overdue' : r.date === today ? 'today' : 'upcoming';
        const clientName = r.clientId ? (state.clients.find(c => c.id === r.clientId) || {}).name : null;
        return `
      <div class="reminder-full-item ${cls}">
        <div class="reminder-check ${r.done ? 'done' : ''}" onclick="toggleReminder('${r.id}')">✓</div>
        <div style="flex:1">
          <div style="font-size:14px;font-weight:500;${r.done ? 'text-decoration:line-through;opacity:0.5' : ''}">${r.title}</div>
          <div style="font-size:12px;color:var(--text-light);margin-top:3px">
            📅 ${formatDate(r.date)}
            ${clientName ? ` &nbsp;·&nbsp; 👤 ${clientName}` : ''}
            ${r.date < today && !r.done ? ' &nbsp;·&nbsp; <span style="color:var(--red)">Întârziat</span>' : ''}
          </div>
        </div>
        ${urgencyLabel[r.urgency] || ''}
        <button class="action-btn delete" onclick="deleteReminder('${r.id}')" title="Șterge">🗑</button>
      </div>
    `;
    }).join('');
}

// ============================================================
// ACTIVITY
// ============================================================
function addActivity(icon, name, desc, type) {
    state.activity.unshift({ id: getId(), icon, name, desc, type, ts: new Date().toISOString() });
    if (state.activity.length > 20) state.activity = state.activity.slice(0, 20);
    saveState();
}

// ============================================================
// DASHBOARD
// ============================================================
function renderDashboard() {
    const total = state.clients.length;
    const thisMonth = state.clients.filter(c => new Date(c.createdAt).getMonth() === new Date().getMonth()).length;
    const important = state.clients.filter(c => c.tag === 'important').length;
    const activeReminders = state.reminders.filter(r => !r.done).length;

    document.getElementById('stat-total').textContent = total;
    document.getElementById('stat-new').textContent = thisMonth;
    document.getElementById('stat-important').textContent = important;
    document.getElementById('stat-reminders').textContent = activeReminders;

    // Activity
    const actEl = document.getElementById('dashboard-activity');
    if (state.activity.length === 0) {
        actEl.innerHTML = `<div class="empty-state"><div class="empty-icon">📭</div><div class="empty-title">Nicio activitate</div><div class="empty-desc">Adaugă clienți pentru a vedea activitatea</div></div>`;
    } else {
        actEl.innerHTML = state.activity.slice(0, 8).map(a => `
      <div class="activity-item">
        <div class="activity-dot ${a.type}">${a.icon}</div>
        <div class="activity-info">
          <div class="activity-name">${a.name}</div>
          <div class="activity-desc">${a.desc}</div>
        </div>
        <div class="activity-time">${timeAgo(a.ts)}</div>
      </div>
    `).join('');
    }

    // Reminders
    const remEl = document.getElementById('dashboard-reminders');
    const pending = state.reminders.filter(r => !r.done).slice(0, 5);
    if (pending.length === 0) {
        remEl.innerHTML = `<div class="empty-state"><div class="empty-icon">📅</div><div class="empty-title">Niciun reminder activ</div><div class="empty-desc">Setează remindere pentru follow-up</div></div>`;
    } else {
        const today = new Date().toISOString().split('T')[0];
        remEl.innerHTML = pending.map(r => {
            const urgClass = { high: 'urgency-high', mid: 'urgency-mid', low: 'urgency-low' };
            return `
        <div class="reminder-item">
          <div class="reminder-check ${r.done ? 'done' : ''}" onclick="toggleReminder('${r.id}')">✓</div>
          <div class="reminder-info">
            <div class="reminder-title">${r.title}</div>
            <div class="reminder-sub">${formatDate(r.date)}${r.date < today ? ' · <span style="color:var(--red)">Întârziat</span>' : ''}</div>
          </div>
          <span class="reminder-urgency ${urgClass[r.urgency]}">${r.urgency === 'high' ? '🔴' : r.urgency === 'mid' ? '🟡' : '🟢'}</span>
        </div>
      `;
        }).join('');
    }
}

// ============================================================
// BADGES
// ============================================================
function updateBadges() {
    const clientCount = state.clients.length;
    const reminderCount = state.reminders.filter(r => !r.done).length;
    document.getElementById('nav-client-count').textContent = clientCount;
    document.getElementById('nav-reminder-count').textContent = reminderCount;
    const badge = document.getElementById('notif-badge');
    if (reminderCount > 0) { badge.style.display = 'flex'; badge.textContent = reminderCount > 9 ? '9+' : reminderCount; }
    else badge.style.display = 'none';
}

// ============================================================
// EXPORT
// ============================================================
function exportCSV() {
    if (state.clients.length === 0) { toast('Nu există clienți de exportat.', 'error'); return; }
    const header = ['Nume', 'Telefon', 'Email', 'Adresă', 'Etichetă', 'Data adăugării', 'Notițe'];
    const rows = state.clients.map(c => [c.name, c.phone, c.email, c.address, c.tag, formatDate(c.createdAt), c.notes].map(v => `"${(v || '').replace(/"/g, '""')}"`));
    const csv = [header, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'clienti_export.csv'; a.click();
    toast('Export CSV realizat!');
}

function exportPDF() {
    if (state.clients.length === 0) { toast('Nu există clienți de exportat.', 'error'); return; }
    const win = window.open('', '_blank');
    const tagMap = { nou: '🟢 Nou', fidel: '⭐ Fidel', important: '🔴 Important', inactiv: '⬜ Inactiv' };
    win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Export Clienți</title>
  <style>body{font-family:Arial,sans-serif;padding:20px;color:#1C2010}h1{color:#2E3A1F;margin-bottom:20px}
  table{width:100%;border-collapse:collapse;font-size:13px}
  th{background:#4A5C35;color:white;padding:10px;text-align:left}
  td{padding:9px 10px;border-bottom:1px solid #EDE7DA}
  tr:hover td{background:#F7F3EC}
  .footer{margin-top:20px;font-size:12px;color:#7A8470}
  @media print{button{display:none}}
  </style></head><body>
  <h1>📋 Lista Clienți — ${state.settings.business}</h1>
  <p style="margin-bottom:16px;color:#7A8470">Export realizat: ${new Date().toLocaleDateString('ro-RO')} · Total: ${state.clients.length} clienți</p>
  <table><thead><tr><th>#</th><th>Nume</th><th>Telefon</th><th>Email</th><th>Adresă</th><th>Etichetă</th><th>Data</th></tr></thead>
  <tbody>${state.clients.map((c, i) => `<tr><td>${i + 1}</td><td><strong>${c.name}</strong></td><td>${c.phone || '—'}</td><td>${c.email || '—'}</td><td>${c.address || '—'}</td><td>${tagMap[c.tag] || c.tag}</td><td>${formatDate(c.createdAt)}</td></tr>`).join('')}
  </tbody></table>
  <div class="footer">ClientBook CRM · ${state.settings.business}</div>
  <br><button onclick="window.print()" style="padding:10px 20px;background:#4A5C35;color:white;border:none;border-radius:6px;cursor:pointer;font-size:14px">🖨️ Printează / Salvează PDF</button>
  </body></html>`);
    win.document.close();
    toast('Export PDF deschis într-o filă nouă!');
}

function backupData() {
    const backup = JSON.stringify(state, null, 2);
    const blob = new Blob([backup], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `clientbook_backup_${new Date().toISOString().split('T')[0]}.json`; a.click();
    toast('Backup descărcat!');
}

// ============================================================
// SETTINGS
// ============================================================
function saveSettings() {
    state.settings.name = document.getElementById('settings-name').value;
    state.settings.email = document.getElementById('settings-email').value;
    state.settings.business = document.getElementById('settings-business').value;
    document.getElementById('user-display-name').textContent = state.settings.name;
    document.getElementById('user-avatar-sidebar').textContent = getInitials(state.settings.name);
    saveState();
    toast('Setări salvate!');
}

function clearAllData() {
    if (!confirm('Ești sigur? Toate datele vor fi șterse definitiv și nu pot fi recuperate!')) return;
    state.clients = []; state.reminders = []; state.activity = [];
    saveState();
    renderDashboard();
    renderClients();
    renderReminders();
    updateBadges();
    toast('Toate datele au fost șterse.', 'error');
}

// ============================================================
// TOAST
// ============================================================
function toast(msg, type = 'success') {
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.innerHTML = `${type === 'error' ? '❌' : '✅'} ${msg}`;
    document.getElementById('toast-container').appendChild(el);
    setTimeout(() => el.remove(), 3200);
}

// ============================================================
// SEED DATA
// ============================================================
function seedData() {
    if (state.clients.length > 0) return;
    const seed = [
        { name: 'Maria Ionescu', phone: '0740 123 456', email: 'maria@email.ro', address: 'Str. Florilor 12, București', tag: 'fidel', notes: 'Client vechi, plătește la timp. Preferă contactul telefonic.' },
        { name: 'Alexandru Popa', phone: '0721 987 654', email: 'alex.popa@gmail.com', address: 'Bd. Unirii 5, Cluj-Napoca', tag: 'important', notes: 'Contract mare în desfășurare. Necesită atenție specială.' },
        { name: 'Elena Dumitrescu', phone: '0755 321 987', email: 'elena.d@yahoo.com', address: 'Str. Victoriei 33, Timișoara', tag: 'nou', notes: '' },
        { name: 'Gheorghe Stancu', phone: '0769 456 123', email: '', address: 'Str. Mihai Viteazu 8, Brașov', tag: 'inactiv', notes: 'Nu a răspuns la ultimele 3 apeluri.' },
        { name: 'Andreea Moldovan', phone: '0733 789 012', email: 'andreea.m@business.ro', address: 'Calea Dorobanților 47, București', tag: 'fidel', notes: 'Referă constant alți clienți.' },
    ];
    const dates = [
        new Date(Date.now() - 3 * 24 * 3600000).toISOString(),
        new Date(Date.now() - 7 * 24 * 3600000).toISOString(),
        new Date(Date.now() - 15 * 24 * 3600000).toISOString(),
        new Date(Date.now() - 30 * 24 * 3600000).toISOString(),
        new Date(Date.now() - 2 * 24 * 3600000).toISOString(),
    ];
    seed.forEach((s, i) => {
        s.id = getId(); s.createdAt = dates[i]; s.interactions = [];
    });
    seed[0].interactions.push({ id: getId(), type: '📞 Apel', desc: 'Discuție despre reînnoirea contractului.', date: new Date(Date.now() - 2 * 24 * 3600000).toISOString() });
    seed[1].interactions.push({ id: getId(), type: '🤝 Întâlnire', desc: 'Prezentare ofertă personalizată. Urmează semnarea contractului.', date: new Date(Date.now() - 1 * 24 * 3600000).toISOString() });
    state.clients = seed;
    state.reminders = [
        { id: getId(), title: 'Follow-up Alexandru Popa', date: new Date().toISOString().split('T')[0], urgency: 'high', clientId: seed[1].id, done: false, createdAt: new Date().toISOString() },
        { id: getId(), title: 'Contactare Gheorghe Stancu', date: new Date(Date.now() + 2 * 24 * 3600000).toISOString().split('T')[0], urgency: 'mid', clientId: seed[3].id, done: false, createdAt: new Date().toISOString() },
        { id: getId(), title: 'Trimitere factură Maria Ionescu', date: new Date(Date.now() - 1 * 24 * 3600000).toISOString().split('T')[0], urgency: 'high', clientId: seed[0].id, done: false, createdAt: new Date().toISOString() },
    ];
    state.activity = [
        { id: getId(), icon: '✨', name: 'Andreea Moldovan', desc: 'Client nou adăugat', type: 'new', ts: new Date(Date.now() - 2 * 3600000).toISOString() },
        { id: getId(), icon: '🤝', name: 'Alexandru Popa', desc: '🤝 Întâlnire: Prezentare ofertă personalizată', type: 'meet', ts: new Date(Date.now() - 5 * 3600000).toISOString() },
        { id: getId(), icon: '📞', name: 'Maria Ionescu', desc: '📞 Apel: Discuție despre reînnoire', type: 'call', ts: new Date(Date.now() - 26 * 3600000).toISOString() },
    ];
    saveState();
}

// ============================================================
// INIT
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
    loadState();
    seedData();
    document.getElementById('settings-name').value = state.settings.name;
    document.getElementById('settings-email').value = state.settings.email;
    document.getElementById('settings-business').value = state.settings.business;
    document.getElementById('user-display-name').textContent = state.settings.name;
    document.getElementById('user-avatar-sidebar').textContent = getInitials(state.settings.name);
    renderDashboard();
    renderClients();
    renderReminders();
    updateBadges();
    // Set today's date in reminder form
    document.getElementById('r-date').value = new Date().toISOString().split('T')[0];
});

// Close modals on overlay click
document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.classList.remove('open'); });
});