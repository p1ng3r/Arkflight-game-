const MODULE_ID = "arkflight-game";
const ICON_BASE = `modules/${MODULE_ID}/assets/ui/stations`;

const STATION_THEME = Object.freeze({
  captain: { icon: "station_icon_captain.webp", accent: "#d6a84f", soft: "rgba(214,168,79,.15)" },
  engineer: { icon: "station_icon_engineer.webp", accent: "#5fb9b4", soft: "rgba(95,185,180,.14)" },
  navigator: { icon: "station_icon_navigator.webp", accent: "#6fa8dc", soft: "rgba(111,168,220,.14)" },
  battlewatch: { icon: "station_icon_watchmaster.webp", accent: "#c76d54", soft: "rgba(199,109,84,.14)" },
  veilwarden: { icon: "station_icon_veilwarden.webp", accent: "#9c82d6", soft: "rgba(156,130,214,.14)" }
});

function rootFor(app, element) {
  if (app?.id !== "arkflight-event-board") return null;
  if (element instanceof HTMLElement) return element;
  if (element?.[0] instanceof HTMLElement) return element[0];
  return app.element instanceof HTMLElement ? app.element : app.element?.[0] ?? null;
}

function stationId(root) {
  return root.querySelector(".arkflight-planning-station-row.is-focused [data-arkflight-focus-station]")?.dataset.arkflightFocusStation ?? null;
}

function stationIcon(station) {
  const theme = STATION_THEME[station];
  if (!theme) return null;
  const holder = document.createElement("div");
  holder.className = "arkflight-detail-station-logo";
  const img = document.createElement("img");
  img.src = `${ICON_BASE}/${theme.icon}`;
  img.alt = "";
  holder.append(img);
  return holder;
}

function titleFromHeader(card) {
  return card.querySelector(".arkflight-station-identity h3")?.textContent?.trim() ?? "Station";
}

function officerName(card) {
  return card.querySelector(".arkflight-assigned-name")?.textContent?.trim() ?? "Unassigned";
}

function sectionWithTitle(card, text) {
  return [...card.querySelectorAll(":scope > .arkflight-card-section")].find((section) => section.querySelector(":scope > .arkflight-section-title")?.textContent?.includes(text)) ?? null;
}

function buildRow(label, section, sideContent = null, extraClass = "") {
  if (!section) return null;
  const row = document.createElement("section");
  row.className = `arkflight-detail-row ${extraClass}`.trim();
  const main = document.createElement("div");
  main.className = "arkflight-detail-main";
  const heading = document.createElement("div");
  heading.className = "arkflight-detail-label";
  heading.textContent = label;
  main.append(heading);
  for (const child of [...section.children]) {
    if (child.classList.contains("arkflight-section-title")) continue;
    main.append(child);
  }
  row.append(main);
  if (sideContent) {
    const side = document.createElement("div");
    side.className = "arkflight-detail-side";
    side.append(sideContent);
    row.append(side);
  }
  section.remove();
  return row;
}

function rebuild(root) {
  const controller = game.arkflight?.controller;
  if (controller?.state?.phase !== "planning") return;
  const detail = root.querySelector(".arkflight-planning-detail");
  const card = detail?.querySelector(".arkflight-planning-detail-card");
  if (!detail || !card || detail.dataset.stationDetailV2 === "true") return;

  const station = stationId(root);
  const theme = STATION_THEME[station];
  if (!station || !theme) return;
  detail.dataset.stationDetailV2 = "true";
  detail.dataset.stationTheme = station;
  detail.style.setProperty("--station-accent", theme.accent);
  detail.style.setProperty("--station-soft", theme.soft);

  const oldHeader = card.querySelector(":scope > .arkflight-station-header");
  const assignment = card.querySelector(":scope > .arkflight-assignment-section");
  const actionSection = sectionWithTitle(card, "Choose Action");
  const skillSection = sectionWithTitle(card, "Choose PF2e Skill");
  const riskSection = card.querySelector(":scope > .arkflight-risk-section");
  const mastery = card.querySelector(":scope > .arkflight-planning-mastery-card");
  const footer = card.querySelector(":scope > .arkflight-station-footer");

  const actionVignette = actionSection?.querySelector(".arkflight-action-vignette-copy") ?? null;
  const actionVignetteLabel = actionSection?.querySelector(".arkflight-action-vignette-label") ?? null;
  if (actionVignette) actionVignette.remove();
  if (actionVignetteLabel) actionVignetteLabel.remove();

  const shell = document.createElement("div");
  shell.className = "arkflight-detail-v2";

  const identity = document.createElement("header");
  identity.className = "arkflight-detail-identity";
  const identityLogo = stationIcon(station);
  identity.innerHTML = `<div class="arkflight-detail-name"><strong>${officerName(card)}</strong><span>${titleFromHeader(card)}</span></div>`;
  identity.prepend(identityLogo);
  shell.append(identity);

  if (assignment) assignment.remove();
  oldHeader?.remove();

  let vignetteBox = null;
  if (actionVignette) {
    vignetteBox = document.createElement("div");
    vignetteBox.className = "arkflight-detail-vignette";
    vignetteBox.innerHTML = '<div class="arkflight-detail-label">ACTION VIGNETTE</div>';
    vignetteBox.append(actionVignette);
  }
  const actionRow = buildRow("CHOOSE ACTION", actionSection, vignetteBox, "arkflight-detail-action-row");
  if (actionRow) shell.append(actionRow);

  const skillRow = buildRow("CHOOSE PF2E SKILL", skillSection, null, "arkflight-detail-skill-row");
  if (skillRow) shell.append(skillRow);

  if (riskSection) {
    const hasRisk = Boolean(riskSection.querySelector(".arkflight-risk-select option[value='2'], .arkflight-risk-select option[value='5'], .arkflight-risk-select option[value='8']"));
    if (hasRisk) {
      const benefit = riskSection.querySelector(".arkflight-selected-risk-detail");
      if (benefit) benefit.remove();
      let benefitBox = null;
      if (benefit) {
        benefitBox = document.createElement("div");
        benefitBox.className = "arkflight-detail-risk-benefit";
        benefitBox.innerHTML = '<div class="arkflight-detail-label">RISK BID BENEFIT</div>';
        benefitBox.append(benefit);
      }
      const riskRow = buildRow("HEROIC / RISK BID", riskSection, benefitBox, "arkflight-detail-risk-row");
      if (riskRow) shell.append(riskRow);
    } else {
      riskSection.remove();
    }
  }

  if (mastery) {
    mastery.classList.add("arkflight-detail-mastery");
    shell.append(mastery);
  }
  footer?.remove();

  card.replaceChildren(shell);
}

Hooks.on("renderApplicationV2", (app, element) => {
  const root = rootFor(app, element);
  if (!root) return;
  requestAnimationFrame(() => requestAnimationFrame(() => rebuild(root)));
});
