const LOCALHOST_HOSTNAMES = ['localhost', '127.0.0.1'];

export function getDefaultContactApiBase(): string {
  if (typeof window === 'undefined') return '';
  if (import.meta.env.DEV) {
    return 'http://127.0.0.1:3002';
  }
  return '';
}

export function normalizeContactApiUrl(url?: string): string {
  if (!url) return getDefaultContactApiBase();
  const trimmed = url.trim().replace(/\/$/, '');
  if (!trimmed) return getDefaultContactApiBase();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (/^\/\//.test(trimmed)) return `${window.location.protocol}${trimmed}`;
  if (/^:\d+$/.test(trimmed)) return `${window.location.protocol}//${window.location.hostname}${trimmed}`;
  return `${window.location.protocol}//${trimmed}`;
}

function isLocalhostUrl(url: string): boolean {
  return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(url.trim());
}

export function getContactApiEndpoint(settingsMysqlApiUrl?: string): string {
  if (!settingsMysqlApiUrl?.trim()) {
    return '/api/contact';
  }

  if (typeof window !== 'undefined') {
    const currentHost = window.location.hostname;
    if (!LOCALHOST_HOSTNAMES.includes(currentHost) && isLocalhostUrl(settingsMysqlApiUrl)) {
      return '/api/contact';
    }
  }

  const baseUrl = normalizeContactApiUrl(settingsMysqlApiUrl);
  return `${baseUrl}/api/contact`;
}
