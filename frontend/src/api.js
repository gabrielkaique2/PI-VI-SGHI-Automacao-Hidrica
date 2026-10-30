const API_BASE_URL = `${window.location.protocol}//${window.location.hostname || 'localhost'}:3000`;

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export async function apiRequest(route, options = {}) {
  let response;
  try {
    response = await fetch(`${API_BASE_URL}${route}`, {
      ...options,
      credentials: 'include',
      headers: {
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...options.headers
      }
    });
  } catch {
    throw new ApiError('Não foi possível conectar ao servidor. Verifique se o backend está em execução.', 0);
  }

  const text = response.status === 204 ? '' : await response.text();
  let body = {};
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      throw new ApiError('O servidor retornou uma resposta inválida.', response.status);
    }
  }

  if (!response.ok) {
    throw new ApiError(body.erro || 'Não foi possível concluir a solicitação.', response.status);
  }
  return body;
}

export function websocketUrl() {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.hostname || 'localhost'}:3000/ws`;
}
