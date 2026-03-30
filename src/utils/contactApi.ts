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
  const trimmed = url.trim().replace(/\/+$/, '');
  return trimmed.replace(/\/api(?:\/.*)?$/i, '');
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
  const trimmed = url.trim().replace(/\/+$/, '');
  return /^(?:https?:\/\/)?(localhost|127\.0\.0\.1)(:\d+)?(?:\/.*)?$/i.test(trimmed);
}

export function getContactApiEndpoint(settingsMysqlApiUrl?: string): string {
  const endpoints = getContactApiEndpoints(settingsMysqlApiUrl);
  return endpoints[0];
}

export function getContactApiEndpoints(settingsMysqlApiUrl?: string): string[] {
  if (!settingsMysqlApiUrl?.trim()) {
    return ['/api/contact.php', '/api/contact'];
  }

  const normalizedUrl = normalizeContactApiUrl(settingsMysqlApiUrl);

  if (typeof window !== 'undefined') {
    const currentHost = window.location.hostname;
    if (!LOCALHOST_HOSTNAMES.includes(currentHost) && isLocalhostUrl(normalizedUrl)) {
      return ['/api/contact.php', '/api/contact'];
    }
  }

  return [`${normalizedUrl}/api/contact`, `${normalizedUrl}/api/contact.php`];
}
