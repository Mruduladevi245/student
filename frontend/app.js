let state = {
  token: localStorage.getItem('stm_token') || null,
  user: JSON.parse(localStorage.getItem('stm_user') || 'null'),
  statusFilter: '',   // '', 'Pending', 'Completed'
  page: 1,
  limit: 6,
  totalPages: 1,
};
 
// ---------- Element refs ----------
const $ = (id) => document.getElementById(id);
 
const authView = $('authView');
const dashView = $('dashView');
 
const tabLogin = $('tabLogin');
const tabRegister = $('tabRegister');
const loginForm = $('loginForm');
const registerForm = $('registerForm');
 
// =============================================================
// Small fetch wrapper — attaches the JWT and centralizes errors
// =============================================================
async function api(path, { method = 'GET', body, auth = true } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth && state.token) {
    headers['Authorization'] = `Bearer ${state.token}`;
  }
 
  let res;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (networkErr) {
    throw new Error('Could not reach the server. Is the backend running on ' + API_BASE_URL + '?');
  }
 
  let data;
  try {
    data = await res.json();
  } catch {
    data = {};
  }
 
  if (!res.ok) {
    // Session expired / invalid token -> force re-login
    if (res.status === 401 && auth) {
      logout(true);
    }
    throw new Error(data.message || `Request failed (${res.status})`);
  }
  return data;
}
 
// =============================================================
// Toasts
// =============================================================
function toast(message, type = 'default') {
  const host = $('toastHost');
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = message;
  host.appendChild(el);
  setTimeout(() => el.remove(), 3500);
}
 
// =============================================================
// Auth view — tab switching
// =============================================================
tabLogin.addEventListener('click', () => switchAuthTab('login'));
tabRegister.addEventListener('click', () => switchAuthTab('register'));
$('goRegister').addEventListener('click', (e) => { e.preventDefault(); switchAuthTab('register'); });
$('goLogin').addEventListener('click', (e) => { e.preventDefault(); switchAuthTab('login'); });
 
function switchAuthTab(which) {
  const isLogin = which === 'login';
  tabLogin.classList.toggle('is-active', isLogin);
  tabRegister.classList.toggle('is-active', !isLogin);
  loginForm.classList.toggle('is-hidden', !isLogin);
  registerForm.classList.toggle('is-hidden', isLogin);
}
 
// =============================================================
// Register
// =============================================================
registerForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = $('regName').value.trim();
  const email = $('regEmail').value.trim();
  const password = $('regPassword').value;
 
  try {
    const res = await api('/auth/register', {
      method: 'POST',
      auth: false,
      body: { name, email, password },
    });
    onAuthSuccess(res.data);
    toast(`Welcome, ${res.data.user.name}!`, 'success');
  } catch (err) {
    toast(err.message, 'error');
  }
});
 
// =============================================================
// Login
// =============================================================
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = $('loginEmail').value.trim();
  const password = $('loginPassword').value;
 
  try {
    const res = await api('/auth/login', {
      method: 'POST',
      auth: false,
      body: { email, password },
    });
    onAuthSuccess(res.data);
    toast(`Welcome back, ${res.data.user.name}!`, 'success');
  } catch (err) {
    toast(err.message, 'error');
  }
});
 
function onAuthSuccess({ user, token }) {
  state.token = token;
  state.user = user;
  localStorage.setItem('stm_token', token);
  localStorage.setItem('stm_user', JSON.stringify(user));
  loginForm.reset();
  registerForm.reset();
  showDashboard();
}
 
// =============================================================
// Logout
// =============================================================
$('logoutBtn').addEventListener('click', () => logout());
 
function logout(silent = false) {
  state.token = null;
  state.user = null;
  localStorage.removeItem('stm_token');
  localStorage.removeItem('stm_user');
  authView.classList.remove('is-hidden');
  dashView.classList.add('is-hidden');
  switchAuthTab('login');
  if (!silent) toast('Logged out', 'default');
}
 
// =============================================================
// Show dashboard + initial load
// =============================================================
function showDashboard() {
  authView.classList.add('is-hidden');
  dashView.classList.remove('is-hidden');
  $('userName').textContent = state.user?.name || '';
  state.page = 1;
  loadTasks();
}
 
// =============================================================
// Filter chips
// =============================================================
$('filterRow').addEventListener('click', (e) => {
  const btn = e.target.closest('.chip');
  if (!btn) return;
  document.querySelectorAll('.chip').forEach((c) => c.classList.remove('is-active'));
  btn.classList.add('is-active');
  state.statusFilter = btn.dataset.status;
  state.page = 1;
  loadTasks();
});
 
// =============================================================
// Pagination
// =============================================================
$('prevPage').addEventListener('click', () => {
  if (state.page > 1) { state.page -= 1; loadTasks(); }
});
$('nextPage').addEventListener('click', () => {
  if (state.page < state.totalPages) { state.page += 1; loadTasks(); }
});
 
// =============================================================
// Create task
// =============================================================
$('taskForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const taskTitle = $('taskTitle').value.trim();
  const description = $('taskDescription').value.trim();
  const dueDate = $('taskDueDate').value;
 
  try {
    await api('/tasks', { method: 'POST', body: { taskTitle, description, dueDate } });
    $('taskForm').reset();
    toast('Task added', 'success');
    state.page = 1;
    loadTasks();
  } catch (err) {
    toast(err.message, 'error');
  }
});
 
// =============================================================
// Load + render tasks
// =============================================================
async function loadTasks() {
  try {
    const qs = new URLSearchParams({
      page: state.page,
      limit: state.limit,
      ...(state.statusFilter ? { status: state.statusFilter } : {}),
    });
    const res = await api(`/tasks?${qs.toString()}`);
    renderTasks(res.data);
    state.totalPages = res.totalPages || 1;

    // Clamp the current page if the list shrank (e.g. after a delete)
    // and the page we were on no longer exists.
    if (state.page > state.totalPages) {
      state.page = state.totalPages;
    }
    $('pageInfo').textContent = `Page ${res.page} of ${state.totalPages}`;
 
    // Stats: fetch the two counts alongside the current list
    const [pendingRes, completedRes] = await Promise.all([
      api('/tasks?status=Pending&limit=1'),
      api('/tasks?status=Completed&limit=1'),
    ]);
    $('statPending').textContent = pendingRes.total ?? 0;
    $('statDone').textContent = completedRes.total ?? 0;
    $('statTotal').textContent = (pendingRes.total ?? 0) + (completedRes.total ?? 0);
  } catch (err) {
    toast(err.message, 'error');
  }
}

// Format a stored date-only value (saved as UTC midnight, since it comes
// straight from an <input type="date">) without letting the browser's
// local timezone shift it back a day for anyone west of UTC.
function formatDueDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
}
 
function renderTasks(tasks) {
  const list = $('taskList');
  const empty = $('emptyState');
  list.innerHTML = '';
 
  if (!tasks.length) {
    empty.classList.remove('is-hidden');
    return;
  }
  empty.classList.add('is-hidden');
 
  tasks.forEach((task) => {
    const card = document.createElement('div');
    card.className = 'task-card';
    const isDone = task.status === 'Completed';
    const due = formatDueDate(task.dueDate);
 
    card.innerHTML = `
      <div class="task-main">
        <p class="task-title ${isDone ? 'is-done' : ''}">${escapeHtml(task.taskTitle)}</p>
        ${task.description ? `<p class="task-desc">${escapeHtml(task.description)}</p>` : ''}
        <p class="task-meta">Due ${due}</p>
      </div>
      <span class="stamp ${isDone ? 'completed' : 'pending'}">${isDone ? 'Completed' : 'Pending'}</span>
      <div class="task-actions">
        <button class="icon-btn" title="Toggle status" data-action="toggle" data-id="${task._id}" data-status="${task.status}">⟳</button>
        <button class="icon-btn" title="Edit" data-action="edit" data-id="${task._id}">✎</button>
        <button class="icon-btn" title="Delete" data-action="delete" data-id="${task._id}">✕</button>
      </div>
    `;
    list.appendChild(card);
  });
}
 
// Escape user-entered text before injecting into innerHTML
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
 
// =============================================================
// Task list actions (toggle / edit / delete) — event delegation
// =============================================================
$('taskList').addEventListener('click', async (e) => {
  const btn = e.target.closest('button[data-action]');
  if (!btn) return;
  const { action, id, status } = btn.dataset;
 
  if (action === 'toggle') {
    const next = status === 'Completed' ? 'Pending' : 'Completed';
    try {
      await api(`/tasks/${id}/status`, { method: 'PATCH', body: { status: next } });
      loadTasks();
    } catch (err) {
      toast(err.message, 'error');
    }
  }
 
  if (action === 'delete') {
    if (!confirm('Delete this task? This cannot be undone.')) return;
    try {
      await api(`/tasks/${id}`, { method: 'DELETE' });
      toast('Task deleted', 'success');
      loadTasks();
    } catch (err) {
      toast(err.message, 'error');
    }
  }
 
  if (action === 'edit') {
    try {
      const res = await api(`/tasks/${id}`);
      openEditModal(res.data);
    } catch (err) {
      toast(err.message, 'error');
    }
  }
});
 
// =============================================================
// Edit modal
// =============================================================
const editModal = $('editModal');
 
function openEditModal(task) {
  $('editTaskId').value = task._id;
  $('editTitle').value = task.taskTitle;
  $('editDescription').value = task.description || '';
  $('editDueDate').value = new Date(task.dueDate).toISOString().slice(0, 10);
  editModal.classList.remove('is-hidden');
}
 
$('cancelEdit').addEventListener('click', () => editModal.classList.add('is-hidden'));
editModal.addEventListener('click', (e) => {
  if (e.target === editModal) editModal.classList.add('is-hidden');
});
 
$('editForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = $('editTaskId').value;
  const body = {
    taskTitle: $('editTitle').value.trim(),
    description: $('editDescription').value.trim(),
    dueDate: $('editDueDate').value,
  };
  try {
    await api(`/tasks/${id}`, { method: 'PUT', body });
    editModal.classList.add('is-hidden');
    toast('Task updated', 'success');
    loadTasks();
  } catch (err) {
    toast(err.message, 'error');
  }
});
 
// =============================================================
// Boot
// =============================================================
(function init() {
  if (state.token && state.user) {
    showDashboard();
  }
})();
