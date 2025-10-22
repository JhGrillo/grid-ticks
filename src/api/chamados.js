// Camada de acesso à API de chamados
// Centraliza URLs e facilita futura inclusão de token JWT

const BASE = 'http://localhost:5000/api/chamados';

async function http(method, url, body) {
  const opts = { method, headers: { 'Content-Type': 'application/json' } };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(url, opts);
  let data = null;
  try { data = await res.json(); } catch (_) {}
  if (!res.ok) {
    throw new Error(data?.error || 'Erro de comunicação');
  }
  return data;
}

export async function criarChamado(payload) {
  return http('POST', `${BASE}/`, payload);
}

export async function listarChamados() {
  return http('GET', `${BASE}/`);
}

export async function obterChamado(idOuEmail) {
  return http('GET', `${BASE}/${idOuEmail}`);
}

export async function atualizarChamado(id, campos) {
  return http('PATCH', `${BASE}/${id}`, campos);
}

export async function atualizarStatus(id, status, mensagem) {
  return http('PATCH', `${BASE}/${id}/status`, { status, mensagem });
}

export async function adicionarAtualizacao(id, texto) {
  return http('POST', `${BASE}/${id}/atualizacoes`, { texto });
}

export async function atualizarOrdem(ordens) {
  return http('PATCH', `${BASE}/ordem`, { ordens });
}
