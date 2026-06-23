import { onBeforeUnmount, onMounted, ref } from 'vue';

export function useCurrentPath() {
  const currentPath = ref('');

  function update() {
    currentPath.value = window.location.pathname;
  }

  onMounted(() => {
    update();
    document.addEventListener('astro:page-load', update);
    window.addEventListener('popstate', update);
  });

  onBeforeUnmount(() => {
    document.removeEventListener('astro:page-load', update);
    window.removeEventListener('popstate', update);
  });

  return currentPath;
}

/** True when a nav href points at the current page (ignores hash/query, skips externals). */
export function isHrefActive(href: string, currentPath: string): boolean {
  if (!href || !currentPath || href.startsWith('http')) return false;
  const path = href.split('#')[0].split('?')[0];
  if (!path) return false;
  const norm = (s: string) => (s.length > 1 ? s.replace(/\/$/, '') : s);
  return norm(path) === norm(currentPath);
}
