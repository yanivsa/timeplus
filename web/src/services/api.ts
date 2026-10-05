let authToken: string | null = sessionStorage.getItem('timeplus_token');

export function setApiToken(token: string | null) {
  authToken = token;
  if (token) {
    sessionStorage.setItem('timeplus_token', token);
  } else {
    sessionStorage.removeItem('timeplus_token');
  }
}

export class ApiError extends Error {
  public status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function parseApiResponse<T>(response: Response): Promise<T> {
  let data: any = null;
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    data = await response.json().catch(() => null);
  }

  if (!response.ok) {
    const errorMsg = data?.error || `שגיאת שרת (${response.status})`;
    throw new ApiError(errorMsg, response.status);
  }

  return data as T;
}

async function performFetch(path: string, config: RequestInit): Promise<Response> {
  try {
    return await fetch(path, config);
  } catch (err: any) {
    if (!navigator.onLine) {
      throw new ApiError('אין חיבור לאינטרנט. נסה שוב כשיהיה חיבור.', 0);
    }
    throw new ApiError('שגיאת תקשורת עם השרת. אנא נסה שוב.', 503);
  }
}

export async function apiRequest<T = any>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const headers = new Headers(options.headers || {});
  headers.set('Content-Type', 'application/json');

  if (authToken) {
    headers.set('Authorization', `Bearer ${authToken}`);
  }

  const response = await performFetch(path, {
    ...options,
    headers,
    credentials: 'include', // sends and receives timeplus_session cookie
  });

  return parseApiResponse<T>(response);
}

export async function apiUpload<T = any>(
  path: string,
  body: Blob,
  options: { method?: 'PUT' | 'POST'; contentType?: string } = {}
): Promise<T> {
  const headers = new Headers();
  headers.set('Content-Type', options.contentType || body.type || 'application/octet-stream');
  if (authToken) headers.set('Authorization', `Bearer ${authToken}`);

  const response = await performFetch(path, {
    method: options.method || 'PUT',
    headers,
    credentials: 'include',
    body,
  });

  return parseApiResponse<T>(response);
}
