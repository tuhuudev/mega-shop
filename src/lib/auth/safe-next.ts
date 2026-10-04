import type { Route } from 'next';

const FALLBACK = '/account' as Route;
const BASE = 'http://internal.invalid';

// Chi cho phep redirect noi bo (tranh open-redirect tu ?next=).
// Parse bang URL nhu trinh duyet: '/\evil.com', '/\t/evil.com' deu thanh '//evil.com'
// nen kiem tra chuoi bang startsWith la chua du.
export function safeNext(next: FormDataEntryValue | null): Route {
  const value = typeof next === 'string' ? next : '';
  if (!value.startsWith('/')) return FALLBACK;
  let url: URL;
  try {
    url = new URL(value, BASE);
  } catch {
    return FALLBACK;
  }
  if (url.origin !== BASE) return FALLBACK;
  return `${url.pathname}${url.search}${url.hash}` as Route;
}
