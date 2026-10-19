let authToken: string | null = sessionStorage.getItem('timeplus_token');

const CHILD_DASHBOARD_CACHE_PREFIX = 'timeplus_child_dashboard_snapshot:';

type DashboardRequestSpec = {
  cacheKey: string;
  childId: string;
};

function getDashboardRequestSpec(path: string, options: RequestInit): DashboardRequestSpec | null {
  const method = (options.method || 'GET').toUpperCase();
  if (method !== 'GET' || !path.startsWith('/api/child/dashboard')) return null;

  try {
    const url = new URL(path, window.location.origin);
    const childId = url.searchParams.get('childId')?.trim();
    if (!childId) return null;
    return {
      childId,
      cacheKey: `${CHILD_DASHBOARD_CACHE_PREFIX}${childId}`,
    };
  } catch {
    return null;
  }
}

function isValidDashboardSnapshot(value: any, childId: string): boolean {
  const availableMinutes = Number(value?.wallet?.availableMinutes);
  return Boolean(
    value?.child?.id === childId &&
      value?.wallet &&
      Number.isFinite(availableMinutes)
  );
}

function readDashboardCache(spec: DashboardRequestSpec): any | null {
  try {
    const raw = sessionStorage.getItem(spec.cacheKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return isValidDashboardSnapshot(parsed, spec.childId) ? parsed : null;
  } catch {
    return null;
  }
}

function writeDashboardCache(spec: DashboardRequestSpec, value: any): void {
  try {
    sessionStorage.setItem(spec.cacheKey, JSON.stringify(value));
  } catch {
    // Cache is a resilience fallback only; a storage failure must not break the app.
  }
}

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

  const dashboardSpec = getDashboardRequestSpec(path, options);
  const attempts = dashboardSpec ? 3 : 1;
  let lastError: unknown = null;

  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const response = await performFetch(path, {
        ...options,
        headers,
        credentials: 'include', // sends and receives timeplus_session cookie
      });
      const parsed = await parseApiResponse<T>(response);

      if (dashboardSpec) {
        if (!isValidDashboardSnapshot(parsed, dashboardSpec.childId)) {
          throw new ApiError('תגובת יתרה לא תקינה מהשרת', 502);
        }
        writeDashboardCache(dashboardSpec, parsed);
      }

      return parsed;
    } catch (err) {
      lastError = err;
      if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
        throw err;
      }
      if (attempt < attempts) {
        await new Promise((resolve) => window.setTimeout(resolve, attempt * 250));
      }
    }
  }

  if (dashboardSpec) {
    const cached = readDashboardCache(dashboardSpec);
    if (cached) return cached as T;
  }

  if (lastError instanceof Error) throw lastError;
  throw new ApiError('שגיאה בטעינת הנתונים', 503);
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
