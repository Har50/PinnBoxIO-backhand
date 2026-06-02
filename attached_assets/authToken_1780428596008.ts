let _tokenGetter: (() => Promise<string | null>) | null = null;

export function setTokenGetter(fn: () => Promise<string | null>): void {
  _tokenGetter = fn;
}

export async function getAuthToken(): Promise<string | null> {
  if (_tokenGetter) {
    return _tokenGetter();
  }
  return null;
}
