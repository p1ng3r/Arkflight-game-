const EQUIPMENT_PACK = "pf2e.equipment-srd";

function slug(value) {
  if (globalThis.foundry?.utils?.slugify) return foundry.utils.slugify(String(value ?? ""));
  return String(value ?? "").trim().toLowerCase().replace(/['’]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function gpFromCoins(value) {
  if (typeof value === "number") return value;
  if (!value || typeof value !== "object") return 0;
  return Number(value.pp ?? 0) * 10 + Number(value.gp ?? 0) + Number(value.sp ?? 0) / 10 + Number(value.cp ?? 0) / 100;
}

function getField(entry, path) {
  if (globalThis.foundry?.utils?.getProperty) return foundry.utils.getProperty(entry, path);
  return path.split(".").reduce((value, key) => value?.[key], entry);
}

function itemLevel(entry) {
  const level = Number(getField(entry, "system.level.value") ?? 0);
  return Number.isFinite(level) ? Math.max(0, level) : 0;
}

function fundamentalRunes(level, allowance) {
  if (allowance === "mundane-or-downgraded") return { potency:0, striking:0 };
  const shift = allowance === "budget-capped" ? 2 : 0;
  const effective = Math.max(0, Number(level) - shift);
  const potency = effective >= 16 ? 3 : effective >= 10 ? 2 : effective >= 2 ? 1 : 0;
  const striking = effective >= 19 ? 3 : effective >= 12 ? 2 : effective >= 4 ? 1 : 0;
  return { potency, striking };
}

const POTENCY_VALUE = Object.freeze({ 0:0, 1:35, 2:935, 3:8935 });
const STRIKING_VALUE = Object.freeze({ 0:0, 1:65, 2:1065, 3:31065 });

function weaponValue(source) {
  const base = gpFromCoins(source?.system?.price?.value);
  const potency = Number(source?.system?.runes?.potency ?? 0);
  const striking = Number(source?.system?.runes?.striking ?? 0);
  return Math.max(base, base + (POTENCY_VALUE[potency] ?? 0) + (STRIKING_VALUE[striking] ?? 0));
}

async function equipmentIndex() {
  const pack = game.packs?.get(EQUIPMENT_PACK);
  if (!pack) throw new Error(`PF2e equipment compendium ${EQUIPMENT_PACK} is unavailable.`);
  const index = await pack.getIndex({ fields:["type","system.baseItem","system.level.value","system.price.value","system.traits.rarity"] });
  return { pack, index:[...index] };
}

export function selectOfficerWeaponCandidate(index, candidateSlugs, { maxLevel = 20 } = {}) {
  const levelCap = Math.max(0, Number(maxLevel) || 0);
  for (const requested of candidateSlugs.map(slug)) {
    const matches = index
      .filter((entry) => entry.type === "weapon")
      .filter((entry) => slug(getField(entry, "system.baseItem")) === requested || slug(entry.name) === requested)
      .filter((entry) => itemLevel(entry) <= levelCap)
      .sort((a, b) => {
        const aExactName = slug(a.name) === requested ? 0 : 1;
        const bExactName = slug(b.name) === requested ? 0 : 1;
        if (aExactName !== bExactName) return aExactName - bExactName;
        const aCommon = (getField(a, "system.traits.rarity") ?? "common") === "common" ? 0 : 1;
        const bCommon = (getField(b, "system.traits.rarity") ?? "common") === "common" ? 0 : 1;
        if (aCommon !== bCommon) return aCommon - bCommon;
        const levelDelta = itemLevel(a) - itemLevel(b);
        if (levelDelta) return levelDelta;
        return gpFromCoins(getField(a, "system.price.value")) - gpFromCoins(getField(b, "system.price.value"));
      });
    if (matches.length) return matches[0];
  }
  return null;
}

export async function resolveOfficerWeapon(intent, { maxGp = Infinity } = {}) {
  const { pack, index } = await equipmentIndex();
  const actorLevel = Math.max(1, Number(intent?.actorLevel) || 1);
  const entry = selectOfficerWeaponCandidate(index, intent?.candidateSlugs ?? [], { maxLevel:actorLevel });
  if (!entry) {
    throw new Error(`No PF2e weapon at or below level ${actorLevel} matched generated ${intent?.station ?? "officer"} pool: ${(intent?.candidateSlugs ?? []).join(", ")}`);
  }
  const document = await pack.getDocument(entry._id);
  if (!document) throw new Error(`PF2e equipment document ${entry._id} could not be loaded.`);
  const source = document.toObject();
  const sourceLevel = Math.max(0, Number(source?.system?.level?.value ?? itemLevel(entry)) || 0);
  if (sourceLevel > actorLevel) {
    throw new Error(`Resolved PF2e weapon ${source.name} is level ${sourceLevel}, above generated officer level ${actorLevel}.`);
  }
  const desired = fundamentalRunes(actorLevel, intent?.upgradeAllowance ?? "budget-capped");
  source.system.runes ??= { potency:0, striking:0, property:[] };
  source.system.runes.potency = desired.potency;
  source.system.runes.striking = desired.striking;
  source.system.runes.property ??= [];
  let estimatedGp = weaponValue(source);
  while (estimatedGp > maxGp && (source.system.runes.striking > 0 || source.system.runes.potency > 0)) {
    if (source.system.runes.striking >= source.system.runes.potency && source.system.runes.striking > 0) source.system.runes.striking -= 1;
    else if (source.system.runes.potency > 0) source.system.runes.potency -= 1;
    estimatedGp = weaponValue(source);
  }
  source.flags ??= {};
  source.flags["arkflight-game"] = {
    ...(source.flags["arkflight-game"] ?? {}),
    generatedSignatureGear:true,
    station:intent?.station ?? null,
    generatedForActorLevel:actorLevel,
    sourceItemLevel:sourceLevel,
    combatMathMode:"npc-benchmark-independent",
    recoverable:true,
    autoAward:false
  };
  return Object.freeze({
    name:source.name,
    uuid:`Compendium.${EQUIPMENT_PACK}.Item.${entry._id}`,
    itemData:Object.freeze(source),
    itemLevel:sourceLevel,
    actorLevel,
    estimatedGp,
    potency:Number(source.system.runes.potency ?? 0),
    striking:Number(source.system.runes.striking ?? 0),
    state:"resolved"
  });
}

export async function pf2eTreasureCandidates({ maxLevel=20, maxGp=Infinity }={}) {
  const { pack, index } = await equipmentIndex();
  const allowedTypes = new Set(["weapon","armor","equipment","consumable","backpack","treasure"]);
  return index
    .filter((entry) => allowedTypes.has(entry.type))
    .map((entry) => ({
      _id:entry._id,
      name:entry.name,
      type:entry.type,
      level:Number(getField(entry,"system.level.value") ?? 0),
      gp:gpFromCoins(getField(entry,"system.price.value")),
      rarity:getField(entry,"system.traits.rarity") ?? "common",
      pack
    }))
    .filter((entry) => entry.rarity === "common" && entry.level <= maxLevel && entry.gp > 0 && entry.gp <= maxGp);
}

export async function materializeTreasureCandidate(candidate) {
  const document = await candidate.pack.getDocument(candidate._id);
  if (!document) throw new Error(`PF2e treasure item ${candidate.name} could not be loaded.`);
  return Object.freeze({ name:candidate.name, type:candidate.type, level:candidate.level, gp:candidate.gp, uuid:`Compendium.${EQUIPMENT_PACK}.Item.${candidate._id}`, itemData:Object.freeze(document.toObject()) });
}
