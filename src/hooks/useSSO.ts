const SSO_COOKIE = 'zifek_sso';

interface SSOPayload {
  i: number;
  e: string;
  t: number;
}

function getCookieDomain(): string {
  const host = window.location.hostname;
  if (host === 'localhost' || host === '127.0.0.1') return '';
  const parts = host.split('.');
  if (parts.length <= 1) return '';
  return '.' + parts.slice(-2).join('.');
}

function parseSSOCookie(): SSOPayload | null {
  try {
    const cookies = document.cookie.split(';');
    for (const cookie of cookies) {
      const [name, value] = cookie.trim().split('=');
      if (name === SSO_COOKIE && value) {
        const json = atob(decodeURIComponent(value));
        const parsed = JSON.parse(json);
        if (parsed && typeof parsed.i === 'number' && typeof parsed.e === 'string' && typeof parsed.t === 'number') {
          const maxAge = 30 * 24 * 60 * 60 * 1000;
          if (Date.now() - parsed.t > maxAge) {
            clearSSOCookie();
            return null;
          }
          return parsed as SSOPayload;
        }
      }
    }
  } catch {
    // cookie malformed, clear it
    clearSSOCookie();
  }
  return null;
}

export function getSSOCookie(): SSOPayload | null {
  return parseSSOCookie();
}

export function setSSOCookie(userId: number, email: string): void {
  const payload: SSOPayload = { i: userId, e: email, t: Date.now() };
  const value = encodeURIComponent(btoa(JSON.stringify(payload)));
  const domain = getCookieDomain();
  const domainStr = domain ? `domain=${domain}; ` : '';
  document.cookie = `${SSO_COOKIE}=${value}; ${domainStr}path=/; max-age=2592000; SameSite=Lax`;
}

export function clearSSOCookie(): void {
  const domain = getCookieDomain();
  const domainStr = domain ? `domain=${domain}; ` : '';
  document.cookie = `${SSO_COOKIE}=; ${domainStr}path=/; max-age=0; SameSite=Lax`;
}