/**
 * Minimal event tracking using Vercel Analytics
 */

interface WindowWithVa extends Window {
  va?: (command: string, payload: Record<string, unknown>) => void;
}

export function trackEvent(name: string, properties?: Record<string, string>) {
  if (typeof window !== 'undefined') {
    const w = window as WindowWithVa;
    if (w.va) {
      w.va('event', { name, ...properties });
    }
  }
}
