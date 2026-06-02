import { setAuthTokenGetter } from "@workspace/api-client-react";

type TokenGetter = () => Promise<string | null>;

let _tokenGetter: TokenGetter | null = null;

export function registerTokenGetter(getter: TokenGetter | null) {
  _tokenGetter = getter;
  setAuthTokenGetter(getter);
}

export async function getAuthHeaders(): Promise<HeadersInit> {
  if (!_tokenGetter) return {};
  try {
    const token = await _tokenGetter();
    if (token) return { Authorization: `Bearer ${token}` };
  } catch {}
  return {};
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const base = (import.meta.env.BASE_URL ?? "/").replace(/\/$/, "");
  const authHeaders = await getAuthHeaders();
  const res = await fetch(`${base}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...authHeaders,
      ...(options.headers ?? {}),
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw Object.assign(
      new Error(body?.error ?? body?.code ?? `HTTP ${res.status}`),
      { status: res.status, code: body?.code ?? body?.error, ...body },
    );
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}
