import { SHIP_CATALOGS } from "../content/index.js";
import { activeModTalentSynergies, modTalentComplementNames } from "../ship/mod-talent-synergy.js";

const MODULE_ID = "arkflight-game";

function rootElement(app, html) {
  const element = html instanceof HTMLElement ? html : html?.[0] ?? app?.element?.[0] ?? app?.element;
  if (!(element instanceof HTMLElement)) return null;
  return element.querySelector?.('.arkflight-ship-shell') ?? (element.matches?.('.arkflight-ship-shell') ? element : null);
}

function normalize(text) {
  return String(text ?? '').replace(/\s+/g, ' ').trim();
}

function titleCase(value) {
  return String(value ?? '').replace(/[-_.]+/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function actorFrom(app) {
  const actor = app?.actor ?? app?.document ?? null;
  return actor?.documentName === "Actor" ? actor : null;
}

function shipFrom(app) {
  return actorFrom(app)?.flags?.[MODULE_ID]?.ship ?? null;
}

function catalogForKind(kind) {
  if (kind === "arkengineMod") return SHIP_CATALOGS.arkengineMods;
  if (kind === "shipMod") return SHIP_CATALOGS.shipMods;
  return null;
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

function appendLine(block, text, className = '') {
  const line = document.createElement('strong');
  if (className) line.className = className;
  line.textContent = text;
  block.append(line);
}

function rebuildTalentSynergyCards(root, app) {
  const ship = shipFrom(app);
  const talentIds = [...(ship?.progression?.talentIds ?? [])];

  for (const card of root.querySelectorAll('.arkflight-fitting-card[data-fitting-kind][data-id]')) {
    card.querySelector(':scope > .arkflight-talent-synergy-block')?.remove();
    const catalog = catalogForKind(card.dataset.fittingKind);
    const item = catalog?.[card.dataset.id];
    if (!item) continue;

    const complementNames = modTalentComplementNames(item);
    if (!complementNames.length) continue;
    const matched = activeModTalentSynergies(item, talentIds);
    const installed = card.classList.contains('is-installed');

    const block = document.createElement('div');
    block.className = 'arkflight-benefit-block has-benefit arkflight-talent-synergy-block';
    const label = document.createElement('span');
    label.className = 'arkflight-benefit-label';
    label.textContent = 'COMPLEMENTS SHIP TALENTS';
    block.append(label);
    appendLine(block, complementNames.join(' · '));

    const rarity = String(item.data?.rarity ?? 'standard').toLowerCase();
    if (rarity === 'standard') {
      const note = document.createElement('small');
      note.textContent = 'Standard hardware stays simple: useful on any vessel and never requires a Talent.';
      block.append(note);
    } else if (matched.length) {
      appendLine(block, `${installed ? 'ACTIVE SYNERGY' : 'TALENT MATCH'} — ${matched.map((synergy) => synergy.label).join(' · ')}`, 'is-active-synergy');
      for (const synergy of matched) {
        const note = document.createElement('small');
        const modifiers = (synergy.ruleModifiers ?? []).map((entry) => `${titleCase(entry.kind)} ${Number(entry.value ?? 0) >= 0 ? '+' : ''}${entry.value}`).join(' · ');
        const effects = (synergy.effects ?? []).map((entry) => `${titleCase(entry.target)} ${Number(entry.value ?? 0) >= 0 ? '+' : ''}${entry.value}`).join(' · ');
        note.textContent = [synergy.description, effects, modifiers].filter(Boolean).join(' — ');
        block.append(note);
      }
    } else {
      const note = document.createElement('small');
      note.textContent = 'No Talent is required to install this fitting. Matching ship Talents unlock its additional doctrine synergy.';
      block.append(note);
    }

    card.append(block);
  }
}

function enhance(app, html) {
  const root = rootElement(app, html);
  if (!root?.querySelector('.arkflight-commissioning-shell')) return;
  requestAnimationFrame(() => requestAnimationFrame(() => {
    rebuildIdentity(root);
    rebuildTalentSynergyCards(root, app);
  }));
}

Hooks.on('renderActorSheet', enhance);
