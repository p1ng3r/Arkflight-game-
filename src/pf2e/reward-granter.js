const GOLD_PIECES_UUID = "Compendium.pf2e.equipment-srd.Item.B6B7tBWJSqOBz5zz";

function cloneSource(document) {
  if (!document?.toObject) throw new Error("PF2e reward source could not be converted to an Item source.");
  const source = document.toObject();
  delete source._id;
  return source;
}

async function goldPiecesSource(quantity) {
  const gold = await fromUuid(GOLD_PIECES_UUID);
  if (!gold || gold.documentName !== "Item" || gold.type !== "treasure") {
    throw new Error("PF2e Gold Pieces compendium item could not be resolved.");
  }
  const source = cloneSource(gold);
  source.system.quantity = Math.max(0, Math.floor(Number(quantity) || 0));
  return source;
}

async function treasureSource(entry, { category = "material" } = {}) {
  const template = await fromUuid(GOLD_PIECES_UUID);
  if (!template || template.documentName !== "Item") throw new Error("PF2e treasure template could not be resolved.");
  const source = cloneSource(template);
  source.name = entry.name ?? "Arkflight Salvage";
  source.img = entry.img ?? "systems/pf2e/icons/equipment/treasure/miscellaneous/merchant-scale.webp";
  source.type = "treasure";
  source.system.slug = null;
  source.system.category = entry.category ?? category;
  source.system.quantity = Math.max(1, Math.floor(Number(entry.quantity) || 1));
  source.system.bulk = { value: Number(entry.bulk ?? 0.1) };
  source.system.description = {
    ...(source.system.description ?? {}),
    value: entry.description ?? "Recovered during an Arkflight Event.",
    gm: source.system.description?.gm ?? ""
  };
  source.system.level = { value: Math.max(0, Math.floor(Number(entry.level) || 0)) };
  source.system.price = { value: { gp: Math.max(0, Number(entry.valueGp) || 0) } };
  source.system.material = { type: null, grade: null };
  source.system.traits = { value: [], rarity: entry.rarity ?? "common", otherTags: ["arkflight-reward"] };
  source.system.publication = {
    license: "ORC",
    remaster: true,
    title: "Arkflight Game"
  };
  return source;
}

async function compendiumItemSource(entry) {
  if (!entry?.uuid) throw new Error(`PF2e item reward ${entry?.name ?? "unknown"} requires a compendium UUID.`);
  const item = await fromUuid(entry.uuid);
  if (!item || item.documentName !== "Item") throw new Error(`PF2e reward item could not be resolved: ${entry.uuid}`);
  const source = cloneSource(item);
  if (entry.name) source.name = entry.name;
  if (entry.quantity) source.system.quantity = Math.max(1, Math.floor(Number(entry.quantity) || 1));
  return source;
}

function eligibleRecipient(actor) {
  return actor && ["character", "loot", "party"].includes(actor.type) && typeof actor.createEmbeddedDocuments === "function";
}

async function partyCharacterMembers(actor) {
  const direct = (() => {
    try { return [...(actor?.members ?? [])].filter((member) => member?.type === "character"); }
    catch (_error) { return []; }
  })();
  if (direct.length) return direct;

  const refs = actor?.system?.details?.members ?? actor?.system?.members ?? [];
  const members = [];
  for (const entry of Array.isArray(refs) ? refs : []) {
    const reference = typeof entry === "string" ? entry : (entry?.uuid ?? entry?.id ?? null);
    if (!reference) continue;
    let member = game.actors?.get?.(reference) ?? null;
    if (!member && typeof fromUuid === "function") {
      try { member = await fromUuid(reference); } catch (_error) { member = null; }
    }
    if (member?.type === "character") members.push(member);
  }
  return members;
}

async function experienceRecipients(actor) {
  if (actor?.type === "character") return [actor];
  if (actor?.type === "party") {
    const members = await partyCharacterMembers(actor);
    if (members.length) return members;
    throw new Error(`${actor.name} has no PF2e character members available for XP.`);
  }
  throw new Error("PF2e XP rewards require a character or party recipient.");
}

async function grantExperience(actor, amount) {
  const xp = Math.max(0, Math.trunc(Number(amount) || 0));
  if (!xp) return Object.freeze([]);
  const recipients = await experienceRecipients(actor);
  const results = [];
  for (const member of recipients) {
    const before = Math.max(0, Math.trunc(Number(member.system?.details?.xp?.value) || 0));
    const after = before + xp;
    await member.update({ "system.details.xp.value": after });
    results.push(Object.freeze({ actorId: member.id, actorName: member.name, before, after, amount: xp }));
  }
  return Object.freeze(results);
}

async function addGold(actor, quantity) {
  const amount = Math.max(0, Math.floor(Number(quantity) || 0));
  if (!amount) return [];

  const existing = actor.items?.find?.((item) => item.type === "treasure" && item.slug === "gold-pieces");
  if (existing) {
    const nextQuantity = Number(existing.system?.quantity ?? existing.quantity ?? 0) + amount;
    await existing.update({ "system.quantity": nextQuantity });
    return [existing];
  }

  return actor.createEmbeddedDocuments("Item", [await goldPiecesSource(amount)]);
}

export async function grantPf2eRewards({ actor, rewards }) {
  if (game.system.id !== "pf2e") throw new Error("Arkflight PF2e reward granting requires the PF2e system.");
  if (!eligibleRecipient(actor)) throw new Error("Choose a PF2e character, loot actor, or party actor to receive rewards.");
  if (!rewards) throw new Error("No Arkflight reward package is available.");

  const created = [];
  const xpAwards = await grantExperience(actor, rewards.pf2eXp);
  created.push(...await addGold(actor, rewards.gold));

  const sources = [];
  for (const entry of rewards.valuables ?? []) sources.push(await treasureSource(entry, { category: entry.category ?? "art-object" }));
  for (const entry of rewards.salvage ?? []) sources.push(await treasureSource(entry, { category: entry.category ?? "material" }));
  for (const entry of rewards.pf2eItems ?? []) sources.push(await compendiumItemSource(entry));

  if (sources.length) created.push(...await actor.createEmbeddedDocuments("Item", sources));

  return {
    actorId: actor.id,
    actorName: actor.name,
    createdItemIds: created.map((item) => item.id),
    createdItemNames: created.map((item) => item.name),
    gold: Math.max(0, Math.floor(Number(rewards.gold) || 0)),
    pf2eXp: Math.max(0, Math.trunc(Number(rewards.pf2eXp) || 0)),
    xpAwards
  };
}

export function pf2eRewardRecipients({ requireExperience = false } = {}) {
  return game.actors.contents
    .filter((actor) => eligibleRecipient(actor) && (!requireExperience || ["character", "party"].includes(actor.type)))
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((actor) => ({ id: actor.id, name: actor.name, type: actor.type }));
}
