const SIZE_RANK = Object.freeze({ small: 1, medium: 2, large: 3 });

function weaponId(install) {
  return typeof install === "string" ? install : install?.id;
}

function weaponArc(install) {
  return typeof install === "object" && install ? install.arc ?? null : null;
}

function mountSlots(weaponMounts = {}) {
  const slots = [];
  for (const [arc, mount] of Object.entries(weaponMounts)) {
    const count = Math.max(0, Number(mount?.count ?? 0));
    for (let index = 0; index < count; index += 1) {
      slots.push({ arc, maxSize: mount?.maxSize ?? "small", used: false });
    }
  }
  return slots;
}

function fitsSize(weaponSize, maxSize) {
  return (SIZE_RANK[weaponSize] ?? 99) <= (SIZE_RANK[maxSize] ?? 0);
}

export function allocateWeaponMounts(ship, catalogs = {}) {
  const hull = catalogs.hulls?.[ship.hull?.chassisId] ?? null;
  const slots = mountSlots(hull?.data?.baseStats?.weaponMounts ?? {});
  const assignments = [];
  const errors = [];

  for (const install of ship.weapons ?? []) {
    const id = weaponId(install);
    const weapon = catalogs.weapons?.[id];
    if (!weapon) {
      errors.push(`Unknown ship weapon: ${id || "<empty>"}.`);
      continue;
    }
    const size = weapon.data?.size ?? "small";
    const allowedArcs = weapon.data?.arcs ?? [];
    const requestedArc = weaponArc(install);
    if (requestedArc && allowedArcs.length && !allowedArcs.includes(requestedArc)) {
      errors.push(`${weapon.name} cannot fire from a ${requestedArc} mount.`);
      continue;
    }
    const slot = slots.find((candidate) => !candidate.used
      && (!requestedArc || candidate.arc === requestedArc)
      && (!allowedArcs.length || allowedArcs.includes(candidate.arc))
      && fitsSize(size, candidate.maxSize));
    if (!slot) {
      errors.push(`No legal ${requestedArc ? `${requestedArc} ` : ""}mount remains for ${weapon.name} (${size}).`);
      continue;
    }
    slot.used = true;
    assignments.push({ id, arc: slot.arc, size, maxSize: slot.maxSize });
  }

  return Object.freeze({ ok: errors.length === 0, errors: Object.freeze(errors), assignments: Object.freeze(assignments) });
}
