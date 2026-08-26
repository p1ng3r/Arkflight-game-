import { SHIP_CATALOGS } from "../content/index.js";

const MODULE_ID = "arkflight-game";
const SIZE_RANK = Object.freeze({ small: 1, medium: 2, large: 3 });
const ARC_LABELS = Object.freeze({ fore: "Fore", port: "Port", starboard: "Starboard", aft: "Aft" });
const drafts = new Map();

function clone(value) {
  return foundry.utils?.deepClone ? foundry.utils.deepClone(value) : structuredClone(value);
}

function shipFlag(actor) {
  return actor?.flags?.[MODULE_ID]?.ship ?? null;
}

function weaponFits(weapon, arc, maxSize) {
  const arcs = weapon?.data?.arcs ?? [];
  const size = weapon?.data?.size ?? "small";
  return arcs.includes(arc) && (SIZE_RANK[size] ?? 99) <= (SIZE_RANK[maxSize] ?? 0);
}

function mountKey(arc, index) {
  return `${arc}:${index}`;
}

function normalizeWeapons(ship, hull) {
  const mounts = hull?.data?.baseStats?.weaponMounts ?? {};
  const normalized = [];
  const occupied = new Set();
  for (const install of ship?.weapons ?? []) {
    if (install && typeof install === "object" && install.id && install.arc && Number.isInteger(Number(install.mountIndex))) {
      const key = mountKey(install.arc, Number(install.mountIndex));
      if (!occupied.has(key)) {
        occupied.add(key);
        normalized.push({ id: install.id, arc: install.arc, mountIndex: Number(install.mountIndex) });
      }
      continue;
    }
    const id = typeof install === "string" ? install : install?.id;
    const weapon = SHIP_CATALOGS.weapons?.[id];
    if (!weapon) continue;
    let placed = false;
    for (const arc of ["fore", "port", "starboard", "aft"]) {
      const mount = mounts[arc];
      for (let index = 0; index < Number(mount?.count ?? 0); index += 1) {
        const key = mountKey(arc, index);
        if (!occupied.has(key) && weaponFits(weapon, arc, mount.maxSize)) {
          occupied.add(key);
          normalized.push({ id, arc, mountIndex: index });
          placed = true;
          break;
        }
      }
      if (placed) break;
    }
  }
  return normalized;
}

function ensureDraft(actor) {
  const ship = shipFlag(actor);
  const hull = SHIP_CATALOGS.hulls?.[ship?.hull?.chassisId] ?? null;
  const existing = drafts.get(actor.uuid);
  if (existing) return existing;
  const draft = { weapons: normalizeWeapons(ship, hull), selected: null, dirty: false };
  drafts.set(actor.uuid, draft);
  return draft;
}

function findApplicationFor(root) {
  return Object.values(ui.windows ?? {}).find((app) => {
    const element = app.element?.[0] ?? app.element;
    return element && (element === root || element.contains?.(root));
  }) ?? null;
}

function weaponCard(weapon, selectedMount) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "arkflight-armory-weapon";
  button.dataset.weaponId = weapon.id;
  const damage = weapon.data?.damageProfile;
  const reload = weapon.data?.reload;
  const crew = weapon.data?.crewRequired ?? reload?.crewRequired ?? "—";
  button.innerHTML = `
    <span class="arkflight-armory-install">INSTALL</span>
    <strong>${weapon.name}</strong>
    <small>${String(weapon.data?.size ?? "small").toUpperCase()} · ${weapon.data?.family ?? "weapon"}</small>
    <p>${weapon.description ?? ""}</p>
    <div class="arkflight-armory-tags">
      <span>${damage?.dice ?? "—"} ${damage?.type ?? ""}</span>
      <span>Crew ${crew}</span>
      <span>Reload ${reload?.actions ?? "—"}</span>
    </div>`;
  return button;
}

function renderArmory(root, actor) {
  const ship = shipFlag(actor);
  const hull = SHIP_CATALOGS.hulls?.[ship?.hull?.chassisId] ?? null;
  if (!ship || !hull) {
    ui.notifications?.warn("Commission a Hull before opening the Armory.");
    return;
  }
  const draft = ensureDraft(actor);
  const mounts = hull.data?.baseStats?.weaponMounts ?? {};
  root.querySelectorAll(".arkflight-resource-strip,.arkflight-stat-strip,.arkflight-command-grid,.arkflight-commissioning-shell").forEach((el) => el.hidden = true);
  root.querySelector(".arkflight-armory-shell")?.remove();

  const shell = document.createElement("main");
  shell.className = "arkflight-armory-shell";
  shell.innerHTML = `
    <section class="arkflight-armory-main">
      <div class="arkflight-panel-heading"><div><span class="arkflight-ship-kicker">ARMORY</span><h2>Weapon Mounts</h2></div><small>Choose a mount, then install a compatible weapon.</small></div>
      <div class="arkflight-mount-layout"></div>
    </section>
    <aside class="arkflight-armory-catalog">
      <span class="arkflight-ship-kicker">SELECTED MOUNT</span>
      <h2 class="arkflight-armory-selected-title">Choose a mount</h2>
      <div class="arkflight-armory-selected-meta">Compatible weapons appear here.</div>
      <div class="arkflight-armory-weapon-list"></div>
      <div class="arkflight-armory-actions">
        <button type="button" data-armory-reset>RESET DRAFT</button>
        <button type="button" class="arkflight-armory-apply" data-armory-apply ${draft.dirty ? "" : "disabled"}>APPLY ARMORY REFIT</button>
      </div>
    </aside>`;
  root.querySelector(".arkflight-ship-footer")?.before(shell);

  const layout = shell.querySelector(".arkflight-mount-layout");
  const weaponList = shell.querySelector(".arkflight-armory-weapon-list");
  const selectedTitle = shell.querySelector(".arkflight-armory-selected-title");
  const selectedMeta = shell.querySelector(".arkflight-armory-selected-meta");

  const selectMount = (arc, index, maxSize) => {
    draft.selected = { arc, index, maxSize };
    selectedTitle.textContent = `${ARC_LABELS[arc] ?? arc} Mount ${index + 1}`;
    selectedMeta.textContent = `Maximum size: ${String(maxSize).toUpperCase()}`;
    weaponList.innerHTML = "";
    const compatible = Object.values(SHIP_CATALOGS.weapons ?? {}).filter((weapon) => weaponFits(weapon, arc, maxSize));
    if (!compatible.length) {
      weaponList.innerHTML = '<p class="arkflight-armory-empty">No compatible weapons in the catalog.</p>';
      return;
    }
    for (const weapon of compatible) {
      const card = weaponCard(weapon, draft.selected);
      card.addEventListener("click", () => {
        const existing = draft.weapons.findIndex((entry) => entry.arc === arc && entry.mountIndex === index);
        const install = { id: weapon.id, arc, mountIndex: index };
        if (existing >= 0) draft.weapons.splice(existing, 1, install); else draft.weapons.push(install);
        draft.dirty = true;
        renderArmory(root, actor);
      });
      weaponList.append(card);
    }
  };

  for (const arc of ["fore", "port", "starboard", "aft"]) {
    const mount = mounts[arc];
    const count = Number(mount?.count ?? 0);
    const group = document.createElement("section");
    group.className = `arkflight-mount-group is-${arc}`;
    group.innerHTML = `<h3>${ARC_LABELS[arc]}</h3><small>${count} mount${count === 1 ? "" : "s"} · max ${String(mount?.maxSize ?? "small").toUpperCase()}</small><div class="arkflight-mount-slots"></div>`;
    const slots = group.querySelector(".arkflight-mount-slots");
    if (!count) slots.innerHTML = '<span class="arkflight-no-mounts">No mounts</span>';
    for (let index = 0; index < count; index += 1) {
      const installed = draft.weapons.find((entry) => entry.arc === arc && entry.mountIndex === index);
      const weapon = installed ? SHIP_CATALOGS.weapons?.[installed.id] : null;
      const button = document.createElement("button");
      button.type = "button";
      button.className = `arkflight-mount-slot ${weapon ? "is-occupied" : "is-empty"}`;
      button.innerHTML = weapon
        ? `<strong>${weapon.name}</strong><span>${String(weapon.data?.size ?? "small").toUpperCase()} · ${weapon.data?.damageProfile?.dice ?? "—"} ${weapon.data?.damageProfile?.type ?? ""}</span><em>CHANGE</em>`
        : `<strong>EMPTY MOUNT</strong><span>${String(mount.maxSize).toUpperCase()} maximum</span><em>FIT WEAPON</em>`;
      button.addEventListener("click", () => selectMount(arc, index, mount.maxSize));
      slots.append(button);
      if (weapon) {
        const remove = document.createElement("button");
        remove.type = "button";
        remove.className = "arkflight-mount-remove";
        remove.textContent = "REMOVE";
        remove.addEventListener("click", () => {
          draft.weapons = draft.weapons.filter((entry) => !(entry.arc === arc && entry.mountIndex === index));
          draft.dirty = true;
          renderArmory(root, actor);
        });
        slots.append(remove);
      }
    }
    layout.append(group);
  }

  shell.querySelector("[data-armory-reset]")?.addEventListener("click", () => {
    drafts.delete(actor.uuid);
    renderArmory(root, actor);
  });
  shell.querySelector("[data-armory-apply]")?.addEventListener("click", async () => {
    if (!game.user.isGM || !draft.dirty) return;
    await actor.update({ [`flags.${MODULE_ID}.ship.weapons`]: clone(draft.weapons) });
    draft.dirty = false;
    ui.notifications?.info(`${actor.name} armory refit applied.`);
    renderArmory(root, actor);
  });
}

function restoreSheet(root) {
  root.querySelector(".arkflight-armory-shell")?.remove();
  root.querySelectorAll(".arkflight-resource-strip,.arkflight-stat-strip,.arkflight-command-grid,.arkflight-commissioning-shell").forEach((el) => el.hidden = false);
}

function attachArmory(app, html) {
  const actor = app?.actor;
  if (!actor?.flags?.[MODULE_ID]?.isArkflightShip) return;
  const root = html?.[0]?.matches?.(".arkflight-ship-shell") ? html[0] : html?.[0]?.querySelector?.(".arkflight-ship-shell") ?? html?.querySelector?.(".arkflight-ship-shell");
  if (!root || root.dataset.armoryUxAttached === "true") return;
  root.dataset.armoryUxAttached = "true";
  const footer = root.querySelector(".arkflight-ship-footer");
  if (!footer) return;
  const armoryLabel = [...footer.children].find((el) => el.textContent?.trim() === "ARMORY");
  if (!armoryLabel) return;
  const button = document.createElement("button");
  button.type = "button";
  button.className = "arkflight-armory-tab-button";
  button.textContent = "ARMORY";
  armoryLabel.replaceWith(button);
  button.addEventListener("click", (event) => {
    event.preventDefault();
    footer.querySelectorAll("button").forEach((entry) => entry.classList.remove("is-active"));
    button.classList.add("is-active");
    renderArmory(root, actor);
  });
  for (const existing of footer.querySelectorAll("button[data-tab]")) {
    existing.addEventListener("click", () => restoreSheet(root), { capture: true });
  }
}

Hooks.on("renderActorSheet", (app, html) => attachArmory(app, html));
