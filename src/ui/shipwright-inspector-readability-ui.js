function rootElement(app, html) {
  const element = html instanceof HTMLElement ? html : html?.[0] ?? app?.element?.[0] ?? app?.element;
  if (!(element instanceof HTMLElement)) return null;
  return element.querySelector?.('.arkflight-ship-shell') ?? (element.matches?.('.arkflight-ship-shell') ? element : null);
}

function normalize(text) {
  return String(text ?? '').replace(/\s+/g, ' ').trim();
}

function rebuildIdentity(root) {
  const target = root.querySelector('.arkflight-bay-vessel-summary');
  const source = root.querySelector('.arkflight-commissioning-summary');
  if (!target || !source) return;

  const lines = [...source.querySelectorAll('.arkflight-build-line')];
  const existing = [...target.querySelectorAll(':scope > p')];
  for (const node of existing) node.remove();

  for (const line of lines) {
    const label = normalize(line.querySelector(':scope > span')?.textContent);
    const name = normalize(line.querySelector(':scope > strong')?.textContent);
    const detail = normalize(line.querySelector(':scope > small')?.textContent);
    if (!label && !name && !detail) continue;

    const row = document.createElement('p');
    const value = [name, detail].filter(Boolean).join(' · ');
    row.innerHTML = `<strong>${label || 'System'}</strong><span>${value || '—'}</span>`;
    target.append(row);
  }
}

function enhance(app, html) {
  const root = rootElement(app, html);
  if (!root?.querySelector('.arkflight-commissioning-shell')) return;
  requestAnimationFrame(() => requestAnimationFrame(() => rebuildIdentity(root)));
}

Hooks.on('renderActorSheet', enhance);
