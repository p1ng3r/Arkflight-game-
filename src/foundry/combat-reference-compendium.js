import { COMBAT_ACTIONS } from "../content/combat-actions.js";
import {
  STATION_BONUS_DEFINITION,
  STRAIN_THRESHOLD_DEFINITION,
  stationActionEconomy,
  stationActionRulesText,
  stationResourceIdentity
} from "../combat/station-action-economy.js";

const PACK_NAME = "arkflight-combat-reference";
const PACK_LABEL = "Arkflight — Combat Reference";
const PACK_ID = `world.${PACK_NAME}`;
const FOLDER_NAME = "Arkflight";
const FLAG_SCOPE = "arkflight";
const FLAG_KEY = "combatReference";
const STATIONS = Object.freeze(["captain", "battlewatch", "navigator", "engineer", "veilwarden"]);
const FUNDAMENTALS_KEY = "fundamentals";

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function labelize(value) {
  return String(value ?? "")
    .replaceAll("-", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function stableHash(value) {
  const text = JSON.stringify(value);
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function costLabel(action) {
  if (action.rules?.costSource === "weapon.fireAP") return "Installed weapon Fire AP";
  const cost = stationActionEconomy(action, 1);
  const parts = [];
  if (action.id === "captain-drive-the-crew") parts.push("Gain +1 AP");
  else {
    if (cost.ap > 0) parts.push(`${cost.ap} AP`);
    if (cost.rp > 0) parts.push(`${cost.rp} RP`);
  }
  if (cost.morale > 0) parts.push(`${cost.morale} Morale`);
  if (cost.supplies > 0) parts.push(`${cost.supplies} ${cost.supplies === 1 ? "Supply" : "Supplies"}`);
  if (cost.lifeveil > 0) parts.push(`${cost.lifeveil} Lifeveil`);
  if (cost.strain > 0) parts.push(`+${cost.strain} Strain`);
  return parts.length ? parts.join(" + ") : "No fixed cost";
}

function actionPageHtml(action) {
  const rules = action.rules ?? {};
  const trigger = rules.trigger ? labelize(rules.trigger) : "—";
  const expires = rules.expires ? labelize(rules.expires) : "—";
  const tags = Array.isArray(action.tags) ? action.tags.map(labelize).join(", ") : "";
  return `<article class="arkflight-combat-reference">
    <p><strong>${escapeHtml(labelize(action.station))} Station Action</strong></p>
    <h1>${escapeHtml(action.name)}</h1>
    <p><strong>Cost / Pressure:</strong> ${escapeHtml(costLabel(action))}</p>
    <dl>
      <dt><strong>Timing</strong></dt><dd>${escapeHtml(labelize(action.timing))}</dd>
      <dt><strong>Category</strong></dt><dd>${escapeHtml(labelize(action.category))}</dd>
      <dt><strong>Trigger</strong></dt><dd>${escapeHtml(trigger)}</dd>
      <dt><strong>Duration / Expiry</strong></dt><dd>${escapeHtml(expires)}</dd>
    </dl>
    <h2>Full Rules</h2>
    <p>${escapeHtml(stationActionRulesText(action))}</p>
    ${tags ? `<h3>Rules Tags</h3><p>${escapeHtml(tags)}</p>` : ""}
    <hr>
    <p><small>Arkflight Action ID: <code>${escapeHtml(action.id)}</code></small></p>
  </article>`;
}

function fundamentalsJournal() {
  const identities = stationResourceIdentity();
  const format = globalThis.CONST?.JOURNAL_ENTRY_PAGE_FORMATS?.HTML ?? 1;
  const source = { stationBonus: STATION_BONUS_DEFINITION, strain: STRAIN_THRESHOLD_DEFINITION, resources: identities };
  return {
    name: "Arkflight Combat — Fundamentals",
    pages: [
      {
        name: "Station Bonus",
        type: "text",
        text: { format, content: `<article class="arkflight-combat-reference"><p><strong>ARKFLIGHT COMBAT FUNDAMENTALS</strong></p><h1>Station Bonus</h1><p>${escapeHtml(STATION_BONUS_DEFINITION)}</p><h2>Progression</h2><ul><li><strong>Ship levels 1–9:</strong> +1</li><li><strong>Ship levels 10–19:</strong> +2</li><li><strong>Ship level 20:</strong> +3</li></ul><p>When an action says “Station Bonus,” substitute the current ship's value. If an action does not mention Station Bonus, do not add it.</p></article>` },
        flags: { [FLAG_SCOPE]: { combatFundamental: "station-bonus" } }
      },
      {
        name: "Combat Resources",
        type: "text",
        text: { format, content: `<article class="arkflight-combat-reference"><p><strong>ARKFLIGHT COMBAT FUNDAMENTALS</strong></p><h1>Combat Resources</h1><dl>${Object.entries(identities).map(([key, text]) => `<dt><strong>${escapeHtml(key.toUpperCase())}</strong></dt><dd>${escapeHtml(text)}</dd>`).join("")}</dl><h2>Design Rule</h2><p>Routine actions usually cost AP or RP only. Extraordinary speed, repairs, rushed gunnery, crew-pushing, and stronger wards can also spend Morale, Supplies, Lifeveil, or add Strain.</p></article>` },
        flags: { [FLAG_SCOPE]: { combatFundamental: "resources" } }
      },
      {
        name: "Strain Limit",
        type: "text",
        text: { format, content: `<article class="arkflight-combat-reference"><p><strong>ARKFLIGHT COMBAT FUNDAMENTALS</strong></p><h1>Strain Limit</h1><p>${escapeHtml(STRAIN_THRESHOLD_DEFINITION)}</p><h2>Threatened Areas</h2><ul><li><strong>Drive the Crew:</strong> Morale</li><li><strong>Overcharge Arkengine:</strong> Arkengine</li><li><strong>Redistribute Power:</strong> Arkengine</li><li><strong>Hard Turn:</strong> Rigging</li><li><strong>Evasive Maneuver:</strong> Rigging</li></ul><p>If the threatened area is already Disabled, it cannot degrade further, but the Strain threshold is still consumed and overflow remains.</p></article>` },
        flags: { [FLAG_SCOPE]: { combatFundamental: "strain-limit" } }
      }
    ],
    flags: { [FLAG_SCOPE]: { [FLAG_KEY]: { managed: true, station: FUNDAMENTALS_KEY, sourceHash: stableHash(source) } } }
  };
}

function stationOverviewHtml(station, actions) {
  return `<article class="arkflight-combat-reference">
    <p><strong>ARKFLIGHT COMBAT REFERENCE</strong></p>
    <h1>${escapeHtml(labelize(station))} Station</h1>
    <p>This journal is the full rules reference for the ${escapeHtml(labelize(station))} station. During combat, the Command HUD resolves level-scaled values for the current ship.</p>
    <h2>Station Bonus</h2>
    <p>${escapeHtml(STATION_BONUS_DEFINITION)}</p>
    <h2>Station Actions</h2>
    <ul>${actions.map((action) => `<li><strong>${escapeHtml(action.name)}</strong> — ${escapeHtml(costLabel(action))}. ${escapeHtml(stationActionRulesText(action))}</li>`).join("")}</ul>
  </article>`;
}

function stationJournal(station) {
  const actions = Object.values(COMBAT_ACTIONS).filter((action) => action.station === station);
  const format = globalThis.CONST?.JOURNAL_ENTRY_PAGE_FORMATS?.HTML ?? 1;
  const source = { station, actions: clone(actions), economy: actions.map((action) => stationActionEconomy(action, 1)), rules: actions.map(stationActionRulesText) };
  const sourceHash = stableHash(source);
  return {
    name: `Arkflight Combat — ${labelize(station)}`,
    pages: [
      {
        name: "Overview",
        type: "text",
        text: { format, content: stationOverviewHtml(station, actions) },
        flags: { [FLAG_SCOPE]: { combatStation: station } }
      },
      ...actions.map((action) => ({
        name: action.name,
        type: "text",
        text: { format, content: actionPageHtml(action) },
        flags: { [FLAG_SCOPE]: { combatActionId: action.id, combatStation: station } }
      }))
    ],
    flags: {
      [FLAG_SCOPE]: {
        [FLAG_KEY]: {
          managed: true,
          station,
          sourceHash
        }
      }
    }
  };
}

async function ensureFolder() {
  const existing = game.folders?.find?.((folder) => folder.type === "Compendium" && folder.name === FOLDER_NAME && !folder.folder);
  if (existing) return existing;
  const FolderClass = CONFIG?.Folder?.documentClass ?? globalThis.Folder;
  return FolderClass?.create?.({ name: FOLDER_NAME, type: "Compendium", sorting: "a", color: "#6b5635" });
}

async function ensurePack(folder) {
  let pack = game.packs.get(PACK_ID);
  if (pack && pack.documentName !== "JournalEntry") {
    throw new Error(`${PACK_LABEL} exists but is not a JournalEntry compendium.`);
  }
  if (!pack) {
    const CompendiumClass = foundry?.documents?.collections?.CompendiumCollection ?? globalThis.CompendiumCollection;
    if (!CompendiumClass?.createCompendium) throw new Error("Foundry CompendiumCollection API is unavailable.");
    pack = await CompendiumClass.createCompendium({ name: PACK_NAME, label: PACK_LABEL, type: "JournalEntry", package: "world" });
  }
  if (folder && typeof pack.setFolder === "function") {
    const currentFolderId = typeof pack.folder === "string" ? pack.folder : pack.folder?.id;
    if (currentFolderId !== folder.id) await pack.setFolder(folder);
  }
  return pack;
}

function managedReference(document) {
  return document?.flags?.[FLAG_SCOPE]?.[FLAG_KEY] ?? null;
}

async function syncCombatReference({ force = false } = {}) {
  if (!game.user?.isGM) return null;
  const folder = await ensureFolder();
  const pack = await ensurePack(folder);
  const collection = pack.collection ?? PACK_ID;
  const existing = await pack.getDocuments();
  const byStation = new Map(existing
    .map((document) => [managedReference(document)?.station, document])
    .filter(([station]) => station));

  const JournalEntryClass = CONFIG?.JournalEntry?.documentClass ?? globalThis.JournalEntry;
  if (!JournalEntryClass?.createDocuments || !JournalEntryClass?.deleteDocuments) {
    throw new Error("Foundry JournalEntry document API is unavailable.");
  }

  const desired = new Map([[FUNDAMENTALS_KEY, fundamentalsJournal()], ...STATIONS.map((station) => [station, stationJournal(station)])]);
  const created = [];
  const rebuilt = [];
  for (const [key, documentData] of desired) {
    const old = byStation.get(key);
    const oldHash = managedReference(old)?.sourceHash;
    const newHash = documentData.flags[FLAG_SCOPE][FLAG_KEY].sourceHash;
    if (old && !force && oldHash === newHash) continue;
    if (old) {
      await JournalEntryClass.deleteDocuments([old.id], { pack: collection });
      rebuilt.push(key);
    }
    await JournalEntryClass.createDocuments([documentData], { pack: collection });
    created.push(key);
  }

  for (const document of existing) {
    const flag = managedReference(document);
    if (flag?.managed && flag.station && !desired.has(flag.station)) {
      await JournalEntryClass.deleteDocuments([document.id], { pack: collection });
    }
  }

  console.info("Arkflight | Combat Reference journals synced", { pack: collection, created, rebuilt });
  return { pack: collection, created, rebuilt };
}

async function findActionPage(actionId) {
  const pack = game.packs.get(PACK_ID);
  if (!pack) return null;
  const documents = await pack.getDocuments();
  for (const journal of documents) {
    const page = journal.pages?.find?.((entry) => entry.flags?.[FLAG_SCOPE]?.combatActionId === actionId);
    if (page) return { journal, page };
  }
  return null;
}

async function openAction(actionId) {
  const found = await findActionPage(actionId);
  if (!found) throw new Error(`No Combat Reference page exists for ${actionId}.`);
  const { journal, page } = found;
  if (page.sheet?.render) return page.sheet.render(true);
  if (journal.sheet?.render) return journal.sheet.render(true, { pageId: page.id });
  throw new Error("Foundry Journal sheet API is unavailable.");
}

Hooks.once("ready", async () => {
  game.arkflight ??= {};
  game.arkflight.combatReference = {
    packId: PACK_ID,
    sync: (options = {}) => syncCombatReference(options),
    rebuild: () => syncCombatReference({ force: true }),
    openAction,
    findActionPage
  };
  if (!game.user?.isGM) return;
  try {
    await syncCombatReference();
  } catch (error) {
    console.error("Arkflight | Combat Reference sync failed", error);
    ui.notifications?.error?.(`Arkflight Combat Reference could not be synchronized: ${error.message}`);
  }
});
