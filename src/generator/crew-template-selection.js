const ALL_TYPES = Object.freeze(["deckhand", "gunner", "marine", "shipwright"]);

function hasAny(values = [], wanted = []) {
  return wanted.some((value) => values.includes(value));
}

export function defaultCrewTemplateTypes(preview) {
  const archetypeId = preview?.config?.archetypeId ?? "";
  const tags = [...(preview?.ship?.traits ?? []), ...(preview?.doctrine?.shipTags ?? [])];
  const weaponCount = preview?.ship?.weapons?.length ?? 0;
  const selected = new Set(["deckhand"]);

  if (weaponCount > 0) selected.add("gunner");
  if (["raider", "pirate", "patrol", "naval", "bountyHunter", "occult"].includes(archetypeId) || hasAny(tags, ["boarding", "military", "security", "warship", "raider", "privateer"])) selected.add("marine");
  if (["merchant", "salvager", "explorer"].includes(archetypeId) || hasAny(tags, ["industrial", "repair", "engineering", "salvage", "shipyard", "heavy-cargo"])) selected.add("shipwright");

  return Object.freeze(ALL_TYPES.filter((type) => selected.has(type)));
}

export function selectedCrewTemplateTypes(preview, requested) {
  if (!Array.isArray(requested)) return defaultCrewTemplateTypes(preview);
  const legal = new Set(ALL_TYPES);
  return Object.freeze([...new Set(requested.filter((type) => legal.has(type)))]);
}

export function selectCrewTemplates(templates = [], { archetypeId = "", ship = null, doctrine = null, selectedTypes } = {}) {
  const preview = { config: { archetypeId }, ship, doctrine };
  const selected = new Set(selectedCrewTemplateTypes(preview, selectedTypes));
  return Object.freeze(templates.map((template) => Object.freeze({
    ...template,
    selected: selected.has(template.type)
  })));
}

export const CREW_TEMPLATE_TYPE_IDS = ALL_TYPES;
