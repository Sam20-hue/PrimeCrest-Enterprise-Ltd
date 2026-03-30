const LOCALHOST_HOSTNAMES = ['localhost', '127.0.0.1'];

export function getDefaultContactApiBase(): string {
  if (typeof window === 'undefined') return '';
  if (import.meta.env.DEV) {
    return 'http://127.0.0.1:3002';
  }
  return '';
}

function normalizeBaseUrl(url?: string): string {
  if (!url) return '';
  const cleaned = url.trim().replace(/\/$/, '').replace(/\/api$/i, '');
  return cleaned;
}

export function normalizeContactApiUrl(url?: string): string {
  const normalized = normalizeBaseUrl(url);
  if (!normalized) return getDefaultContactApiBase();
  if (/^https?:\/\//i.test(normalized)) return normalized;
  if (/^\/\//.test(normalized)) return `${window.location.protocol}${normalized}`;
  if (/^:\d+$/.test(normalized)) return `${window.location.protocol}//${window.location.hostname}${normalized}`;
  return `${window.location.protocol}//${normalized}`;
}

function isLocalhostUrl(url: string): boolean {
  const trimmed = url.trim().replace(/\/$/, '');
  return /^(?:https?:\/\/)?(localhost|127\.0\.0\.1)(:\d+)?$/i.test(trimmed);
}

export function getContactApiEndpoint(settingsMysqlApiUrl?: string): string {
  if (!settingsMysqlApiUrl?.trim()) {
    return '/api/contact';
  }

  const normalizedUrl = normalizeContactApiUrl(settingsMysqlApiUrl);

  if (typeof window !== 'undefined') {
    const currentHost = window.location.hostname;
    if (!LOCALHOST_HOSTNAMES.includes(currentHost) && isLocalhostUrl(normalizedUrl)) {
      return '/api/contact';
    }
  }

  return `${normalizedUrl}/api/contact`;
}
