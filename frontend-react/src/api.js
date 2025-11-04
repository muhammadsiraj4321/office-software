const API_BASE = import.meta.env.VITE_API_BASE || window.API_BASE || 'http://localhost:3002/api';

async function api(path, { method = 'GET', body, token } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = 'Bearer ' + token;
  let res;
  try {
    res = await fetch(API_BASE + path, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (e) {
    throw new Error('Network error. Is the backend running?');
  }
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!res.ok) {
    const serverMsg = data && data.error ? data.error : (typeof data === 'string' ? data : 'Request failed');
    throw new Error(`${res.status} ${res.statusText}: ${serverMsg}`);
  }
  return data;
}

export const MaterialsAPI = {
  list(token, projectId){ return api(`/materials?projectId=${encodeURIComponent(projectId)}`, { token }); },
  create(token, projectId, payload){ return api(`/materials/${projectId}`, { method:'POST', body: payload, token }); },
  bulk(token, projectId, items){ return api(`/materials/${projectId}/bulk`, { method:'POST', body: { items }, token }); },
  update(token, projectId, id, payload){ return api(`/materials/${projectId}/${id}`, { method:'PATCH', body: payload, token }); },
  remove(token, projectId, id){ return api(`/materials/${projectId}/${id}`, { method:'DELETE', token }); },
  purge(token){ return api('/materials', { method:'DELETE', token }); }
}

export const AuthAPI = {
  async login(email, password) {
    return api('/auth/login', { method: 'POST', body: { email, password } });
  },
  async requestAccount(name, email, requestedRole, password){
    return api('/auth/request-account', { method: 'POST', body: { name, email, requestedRole, password } })
  }
};

export const UsersAPI = {
  list(token) {
    return api('/users', { token });
  },
  listPending(token){ return api('/users/requests/pending', { token }) },
  approve(token, id){ return api(`/users/requests/${id}/approve`, { method:'POST', token }) },
  reject(token, id){ return api(`/users/requests/${id}/reject`, { method:'POST', token }) },
  create(token, payload){ return api('/users', { method:'POST', body: payload, token }) },
  update(token, id, payload){ return api(`/users/${id}`, { method:'PATCH', body: payload, token }) },
  remove(token, id){ return api(`/users/${id}`, { method:'DELETE', token }) },
};

export const ProjectsAPI = {
  list(token) {
    return api('/projects', { token });
  },
  create(token, payload) {
    return api('/projects', { method: 'POST', body: payload, token });
  },
  update(token, id, payload) {
    return api(`/projects/${id}`, { method: 'PATCH', body: payload, token });
  },
  remove(token, id) {
    return api(`/projects/${id}`, { method: 'DELETE', token });
  },
};

export const ExpensesAPI = {
  list(token) {
    return api('/expenses', { token });
  },
  create(token, payload) {
    return api('/expenses', { method: 'POST', body: payload, token });
  },
  update(token, id, payload) {
    return api(`/expenses/${id}`, { method: 'PATCH', body: payload, token });
  },
  remove(token, id) {
    return api(`/expenses/${id}`, { method: 'DELETE', token });
  },
};

export const IncomeAPI = {
  list(token){ return api('/income', { token }); },
  create(token, payload){ return api('/income', { method: 'POST', body: payload, token }); },
  update(token, id, payload){ return api(`/income/${id}`, { method: 'PATCH', body: payload, token }); },
  remove(token, id){ return api(`/income/${id}`, { method: 'DELETE', token }); }
}

export const DocumentsAPI = {
  list(token){ return api('/documents', { token }); },
  meta(token, key){ return api(`/documents/${key}`, { token }); },
  downloadUrl(token, key){
    const q = token ? `?token=${encodeURIComponent(token)}` : '';
    return `${API_BASE}/documents/${key}/download${q}`;
  },
  async downloadBlob(token, key){
    const res = await fetch(`${API_BASE}/documents/${key}/download`, {
      method: 'GET',
      headers: token ? { 'Authorization': 'Bearer '+token } : {}
    })
    if (!res.ok) throw new Error('Download failed')
    return await res.blob()
  },
  async upload(token, key, { name, dataUrl }){
    return api(`/documents/${key}`, { method: 'POST', body: { name, dataUrl }, token });
  },
  remove(token, key){ return api(`/documents/${key}`, { method:'DELETE', token }) }
}
