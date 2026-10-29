export type Page = (root: HTMLElement, params: URLSearchParams) => void | Promise<void>;

/** Roteador por hash (#/rota?x=y), compatível com hospedagem estática. */
export function startRouter(root: HTMLElement, routes: Record<string, Page>, fallback: string): void {
  const render = async () => {
    const [path, query = ''] = location.hash.replace(/^#/, '').split('?');
    const page = routes[path || fallback] ?? routes[fallback];
    root.replaceChildren();
    window.scrollTo(0, 0);
    await page(root, new URLSearchParams(query));
  };
  window.addEventListener('hashchange', render);
  void render();
}

export function go(path: string): void {
  if (location.hash === `#${path}`) {
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  } else {
    location.hash = path;
  }
}
