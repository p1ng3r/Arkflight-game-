import { batteryOptions, planBatteryFire } from "../cards/card-playtest-session.js";

/** UI choices are hints only; the authority revalidates every assignment. */
export function fireControlModel(session, shipId, batteryId, targetId) {
  const ship = session.ships[shipId];
  const targets = Object.entries(session.ships).filter(([id, other]) => id !== shipId && other.cardPlay.team !== ship.cardPlay.team && other.resources.hull.value > 0).map(([id, other]) => ({ id, name: other.cardPlay.name }));
  const weapons = ship.cardPlay.weapons.filter(w => w.mount === batteryId).map(weapon => ({
    ...weapon, ready: weapon.readyRound <= session.round,
    legalTargets: targets.filter(target => batteryOptions(session, shipId, target.id, batteryId).some(w => w.key === weapon.key)),
    canConcentrate: batteryOptions(session, shipId, targetId, batteryId).some(w => w.key === weapon.key)
  }));
  return { weapons, canSplit: ["port", "starboard"].includes(batteryId) && weapons.some(w => w.arcTemplate === "broadside") };
}

export function readFireSelection(row) {
  const batteryId = row.querySelector("[data-battery]").value;
  if (row.querySelector("[data-fire-mode]").value === "split") return { batteryId, assignments: [...row.querySelectorAll("[data-gun-target]")].filter(select => select.value).map(select => ({ weaponKey: select.dataset.gunTarget, targetId: select.value })) };
  return { batteryId, targetId: row.querySelector("[data-target]").value, weaponKeys: [...row.querySelectorAll("[data-fire-gun]:checked")].map(input => input.dataset.fireGun) };
}

export function bindFireControls(row, session, shipId, saved, { preview, changed } = {}) {
  const mode = row.querySelector("[data-fire-mode]"), host = row.querySelector("[data-fire-weapons]"), battery = row.querySelector("[data-battery]"), target = row.querySelector("[data-target]");
  if (!mode || !host) return;
  mode.value = saved.fireMode ?? "concentrate";
  const rebuild = () => {
    const model = fireControlModel(session, shipId, battery.value, target.value);
    mode.querySelector('[value="split"]').disabled = !model.canSplit;
    if (!model.canSplit) mode.value = "concentrate";
    saved.fireMode = mode.value;
    const split = mode.value === "split";
    target.disabled = split;
    host.replaceChildren();
    const summary = document.createElement("p"); summary.className = "cc-fire-summary";
    const updateSummary = () => {
      const selection = readFireSelection(row);
      const count = split ? selection.assignments.length : selection.weaponKeys.length;
      const targets = split ? new Set(selection.assignments.map(a => a.targetId)).size : count ? 1 : 0;
      summary.textContent = `${count} weapon${count === 1 ? "" : "s"} → ${targets} target${targets === 1 ? "" : "s"}. One attack roll; damage is divided when splitting.`;
    };
    for (const weapon of model.weapons.filter(w => !split || w.arcTemplate === "broadside")) {
      const label = document.createElement("label"); label.className = "cc-fire-weapon";
      const name = document.createElement("span"); name.textContent = `${weapon.name} · ${weapon.dice}${weapon.ready ? "" : ` · Ready R${weapon.readyRound}`}`;
      label.append(name);
      if (split) {
        const select = document.createElement("select"); select.dataset.gunTarget = weapon.key;
        select.setAttribute("aria-label", `Target for ${weapon.name} (${weapon.key})`);
        select.append(new Option("Hold fire", ""), ...weapon.legalTargets.map(t => new Option(t.name, t.id)));
        select.value = (saved.weaponTargets ?? {})[weapon.key] ?? "";
        // A previous target may now be out of range, disabled or behind the ship.
        if (!select.value) select.value = "";
        select.disabled = !weapon.ready || !weapon.legalTargets.length;
        select.addEventListener("change", () => { (saved.weaponTargets ??= {})[weapon.key] = select.value; changed?.(); updateSummary(); });
        label.append(select);
      } else {
        const input = document.createElement("input"); input.type = "checkbox"; input.dataset.fireGun = weapon.key;
        input.checked = weapon.canConcentrate && (saved.weaponKeys?.includes(weapon.key) ?? true);
        input.disabled = !weapon.canConcentrate;
        input.setAttribute("aria-label", `Fire ${weapon.name} (${weapon.key})`);
        input.addEventListener("change", () => { saved.weaponKeys = [...host.querySelectorAll("[data-fire-gun]:checked")].map(i => i.dataset.fireGun); changed?.(); updateSummary(); });
        label.prepend(input);
        if (!weapon.canConcentrate && weapon.ready) name.textContent += " · Target outside range/arc";
      }
      host.append(label);
    }
    if (!host.childElementCount) { const hint = document.createElement("p"); hint.textContent = "No eligible weapons on this mounting side."; host.append(hint); }
    host.append(summary);
    const button = document.createElement("button"); button.type = "button"; button.textContent = "Preview selected fire";
    button.addEventListener("click", () => {
      try { preview?.(planBatteryFire(session, shipId, readFireSelection(row))); }
      catch (error) { ui.notifications.error(error.message); }
    });
    host.append(button); updateSummary();
  };
  for (const select of [mode, battery, target]) select.addEventListener("change", () => { changed?.(); rebuild(); });
  rebuild();
}
