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
const STATIONS = Object.freeze(["common", "captain", "battlewatch", "navigator", "engineer", "veilwarden"]);
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

function chip(label, tone = "default") {
  return `<span class="afcr-chip is-${escapeHtml(tone)}">${escapeHtml(label)}</span>`;
}

function actionChips(action) {
  const cost = stationActionEconomy(action, 1);
  const chips = [];
  if (action.rules?.costSource === "weapon.fireAP") chips.push(chip("Weapon AP", "ap"));
  else {
    if (action.id === "captain-drive-the-crew") chips.push(chip("+1 AP", "gain"));
    else if (cost.ap > 0) chips.push(chip(`${cost.ap} AP`, "ap"));
    if (cost.rp > 0) chips.push(chip(`${cost.rp} RP`, "rp"));
  }
  if (cost.morale > 0) chips.push(chip(`-${cost.morale} Morale`, "morale"));
  if (cost.supplies > 0) chips.push(chip(`-${cost.supplies} ${cost.supplies === 1 ? "Supply" : "Supplies"}`, "supplies"));
  if (cost.lifeveil > 0) chips.push(chip(`-${cost.lifeveil} Lifeveil`, "lifeveil"));
  if (cost.strain > 0) chips.push(chip(`+${cost.strain} Strain`, "strain"));
  chips.push(chip(labelize(action.timing), action.timing === "reaction" ? "reaction" : "timing"));
  return chips.join("");
}

function section(title, body, kind = "") {
  return `<section class="afcr-section ${kind ? `is-${escapeHtml(kind)}` : ""}"><h2>${escapeHtml(title)}</h2><div class="afcr-section-body">${body}</div></section>`;
}

function codexPage({ kicker = "Arkflight Combat Reference", title, subtitle = "", station = "fundamentals", chips = "", body = "" }) {
  return `<article class="arkflight-combat-reference afcr-codex" data-station="${escapeHtml(station)}">
    <div class="afcr-art-frame" aria-hidden="true"></div>
    <header class="afcr-masthead">
      <p class="afcr-kicker">${escapeHtml(kicker)}</p>
      <h1>${escapeHtml(title)}</h1>
      ${subtitle ? `<p class="afcr-subtitle">${escapeHtml(subtitle)}</p>` : ""}
    </header>
    <div class="afcr-content">
      ${chips ? `<div class="afcr-chip-row">${chips}</div>` : ""}
      ${body}
    </div>
  </article>`;
}

function actionPageHtml(action) {
  const rules = action.rules ?? {};
  const trigger = rules.trigger ? labelize(rules.trigger) : "None";
  const expires = rules.expires ? labelize(rules.expires) : "Immediate";
  const tags = Array.isArray(action.tags) ? action.tags.map(labelize) : [];
  const quick = `<p class="afcr-quick-text">${escapeHtml(action.summary ?? stationActionRulesText(action))}</p>`;
  const meta = `<div class="afcr-meta-grid">
    <div><strong>Cost / Pressure</strong><span>${escapeHtml(costLabel(action))}</span></div>
    <div><strong>Timing</strong><span>${escapeHtml(labelize(action.timing))}</span></div>
    <div><strong>Trigger</strong><span>${escapeHtml(trigger)}</span></div>
    <div><strong>Duration / Expiry</strong><span>${escapeHtml(expires)}</span></div>
    <div><strong>Category</strong><span>${escapeHtml(labelize(action.category))}</span></div>
    <div><strong>Station Bonus</strong><span>Use only where the rule explicitly says Station Bonus.</span></div>
  </div>`;
  const tagBody = tags.length ? `<div class="afcr-tag-row">${tags.map((tag) => chip(tag, "tag")).join("")}</div>` : "";

  return codexPage({
    title: action.name,
    subtitle: action.station === "common" ? "Common Ship Action" : `${labelize(action.station)} Station Action`,
    station: action.station,
    chips: actionChips(action),
    body: [
      section("Quick Effect", quick, "callout"),
      section("At a Glance", meta, "meta"),
      section("Full Rules", `<p>${escapeHtml(stationActionRulesText(action))}</p>`, "rules"),
      tagBody ? section("Rules Tags", tagBody, "tags") : "",
      `<p class="afcr-source-id">Arkflight Action ID: <code>${escapeHtml(action.id)}</code></p>`
    ].join("")
  });
}

function fundamentalsStationBonusHtml() {
  return codexPage({
    kicker: "Arkflight Combat Fundamentals",
    title: "Station Bonus",
    subtitle: "Ship-level scaling for station actions",
    station: "fundamentals",
    chips: `${chip("Levels 1–9: +1", "station")}${chip("Levels 10–19: +2", "station")}${chip("Level 20: +3", "station")}`,
    body: [
      section("Definition", `<p class="afcr-quick-text">${escapeHtml(STATION_BONUS_DEFINITION)}</p>`, "callout"),
      section("Progression", `<div class="afcr-progression"><div><strong>1–9</strong><span>+1</span></div><div><strong>10–19</strong><span>+2</span></div><div><strong>20</strong><span>+3</span></div></div>`, "meta"),
      section("Using Station Bonus", `<p>When an action says <strong>Station Bonus</strong>, substitute the current ship's value. If an action does not mention Station Bonus, do not add it. It is not a universal modifier to every check, attack, recovery amount, or ship statistic.</p>`, "rules")
    ].join("")
  });
}

function fundamentalsResourcesHtml(identities) {
  const resourceCards = Object.entries(identities).map(([key, text]) => `<article class="afcr-resource-card is-${escapeHtml(key)}"><strong>${escapeHtml(key.toUpperCase())}</strong><p>${escapeHtml(text)}</p></article>`).join("");
  return codexPage({
    kicker: "Arkflight Combat Fundamentals",
    title: "Combat Resources",
    subtitle: "What each ship resource means during battle",
    station: "fundamentals",
    body: [
      section("Resource Identities", `<div class="afcr-resource-grid">${resourceCards}</div>`, "resources"),
      section("Combat Economy", `<p>Routine actions usually cost AP or RP only. Extraordinary speed, repairs, rushed gunnery, crew-pushing, and stronger wards can also spend Morale, Supplies, Lifeveil, or add Strain. Secondary costs are part of the action and must be available when the action is used.</p>`, "callout")
    ].join("")
  });
}

function fundamentalsStrainHtml() {
  const areas = [
    ["Drive the Crew", "Morale"],
    ["Overcharge Arkengine", "Arkengine"],
    ["Redistribute Power", "Arkengine"],
    ["Hard Turn", "Rigging"],
    ["Evasive Maneuver", "Rigging"],
    ["Work the Guns", "Morale"]
  ];
  return codexPage({
    kicker: "Arkflight Combat Fundamentals",
    title: "Strain Limit",
    subtitle: "Push the ship hard enough and something gives",
    station: "fundamentals",
    chips: `${chip("Stable", "safe")}${chip("Stressed", "warning")}${chip("Damaged", "warning")}${chip("Critical", "danger")}${chip("Disabled", "danger")}`,
    body: [
      section("Threshold Rule", `<p class="afcr-quick-text">${escapeHtml(STRAIN_THRESHOLD_DEFINITION)}</p>`, "callout"),
      section("Threatened Areas", `<div class="afcr-threat-list">${areas.map(([action, area]) => `<div><strong>${escapeHtml(action)}</strong><span>${escapeHtml(area)}</span></div>`).join("")}</div>`, "meta"),
      section("When the Limit Is Crossed", `<p>The threatened Area degrades one step: <strong>Stable → Stressed → Damaged → Critical → Disabled</strong>. One Strain Limit is then subtracted from current Strain and overflow remains. A single station action can degrade at most one Area from its Strain crossing. If the threatened Area is already Disabled, it cannot degrade further, but the threshold is still consumed.</p>`, "rules")
    ].join("")
  });
}

function fundamentalsJournal() {
  const identities = stationResourceIdentity();
  const format = globalThis.CONST?.JOURNAL_ENTRY_PAGE_FORMATS?.HTML ?? 1;
  const source = { stationBonus: STATION_BONUS_DEFINITION, strain: STRAIN_THRESHOLD_DEFINITION, resources: identities, style: "arkflight-codex-v3" };
  return {
    name: "Arkflight Combat — Fundamentals",
    pages: [
      {
        name: "Station Bonus",
        type: "text",
        text: { format, content: fundamentalsStationBonusHtml() },
        flags: { [FLAG_SCOPE]: { combatFundamental: "station-bonus" } }
      },
      {
        name: "Combat Resources",
        type: "text",
        text: { format, content: fundamentalsResourcesHtml(identities) },
        flags: { [FLAG_SCOPE]: { combatFundamental: "resources" } }
      },
      {
        name: "Strain Limit",
        type: "text",
        text: { format, content: fundamentalsStrainHtml() },
        flags: { [FLAG_SCOPE]: { combatFundamental: "strain-limit" } }
      }
    ],
    flags: { [FLAG_SCOPE]: { [FLAG_KEY]: { managed: true, station: FUNDAMENTALS_KEY, sourceHash: stableHash(source) } } }
  };
}

function stationOverviewHtml(station, actions) {
  const cards = actions.map((action) => `<article class="afcr-action-card">
    <div class="afcr-action-card-head"><h3>${escapeHtml(action.name)}</h3><span>${escapeHtml(labelize(action.timing))}</span></div>
    <p>${escapeHtml(action.summary ?? stationActionRulesText(action))}</p>
    <div class="afcr-chip-row is-compact">${actionChips(action)}</div>
  </article>`).join("");

  const common = station === "common";
  return codexPage({
    title: common ? "Common Actions" : `${labelize(station)} Station`,
    subtitle: common ? "Baseline ship actions available to any ship Owner" : "Combat actions, duties, and tactical reference",
    station,
    body: [
      section(common ? "Common Action Role" : "Station Role", common
        ? "<p>Common actions may be used by any User with OWNER permission on this ship. They spend the ship's shared combat economy normally and do not require a specific station.</p>"
        : `<p>This journal is the full rules reference for the <strong>${escapeHtml(labelize(station))}</strong> station. During combat, the Command HUD resolves the ship's current level-scaled values; use these pages for the complete authored rules.</p>`, "callout"),
      ...(common ? [] : [section("Station Bonus", `<p>${escapeHtml(STATION_BONUS_DEFINITION)}</p>`, "rules")]),
      section(common ? "Common Actions" : "Station Actions", `<div class="afcr-action-list">${cards}</div>`, "actions")
    ].join("")
  });
}

function stationJournal(station) {
  const actions = Object.values(COMBAT_ACTIONS).filter((action) => action.station === station);
  const format = globalThis.CONST?.JOURNAL_ENTRY_PAGE_FORMATS?.HTML ?? 1;
  const source = { station, actions: clone(actions), economy: actions.map((action) => stationActionEconomy(action, 1)), rules: actions.map(stationActionRulesText), style: "arkflight-codex-v3" };
  const sourceHash = stableHash(source);
  return {
    name: station === "common" ? "Arkflight Combat — Common Actions" : `Arkflight Combat — ${labelize(station)}`,
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
