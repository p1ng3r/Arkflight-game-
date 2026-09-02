export const SHIP_OPERATIONAL_STATUSES = Object.freeze({
  docked: Object.freeze({
    key: "docked",
    label: "Docked",
    icon: "fa-anchor",
    summary: "Secured at a normal dock with professional facilities available.",
    effects: Object.freeze([
      "Dock refit service available.",
      "Installation and repair service costs are reduced by 25%.",
      "Dock service may be paid in gp or Aether Scrap.",
      "Standard dock work is automatic; no normal crew Crafting check is required."
    ]),
    refitModes: Object.freeze(["crew", "dock"]),
    preferredRefitMode: "dock"
  }),
  shipyard: Object.freeze({
    key: "shipyard",
    label: "Shipyard",
    icon: "fa-hammer",
    summary: "Berthed in a full Arkflight construction and repair yard.",
    effects: Object.freeze([
      "Shipyard refit service available.",
      "Installation and repair service costs are reduced by 50%.",
      "Shipyard service may be paid in gp or Aether Scrap.",
      "Multiple shipyard work orders may run simultaneously."
    ]),
    refitModes: Object.freeze(["crew", "shipyard"]),
    preferredRefitMode: "shipyard"
  }),
  anchored: Object.freeze({
    key: "anchored",
    label: "Anchored",
    icon: "fa-anchor-circle-check",
    summary: "Stationary under the vessel's own control away from a dock.",
    effects: Object.freeze([
      "Crew field refit is available.",
      "No dock or shipyard discount applies.",
      "Professional gp service is unavailable.",
      "The vessel is intentionally stationary for local operations."
    ]),
    refitModes: Object.freeze(["crew"]),
    preferredRefitMode: "crew"
  }),
  underway: Object.freeze({
    key: "underway",
    label: "Underway",
    icon: "fa-compass",
    summary: "The vessel is traveling or maneuvering under normal control.",
    effects: Object.freeze([
      "Normal voyage and maneuver operations are available.",
      "Dock and shipyard services are unavailable.",
      "Major refit work should wait until the vessel is secured.",
      "Emergency field work may still be handled by authored systems."
    ]),
    refitModes: Object.freeze([]),
    preferredRefitMode: "crew"
  }),
  moored: Object.freeze({
    key: "moored",
    label: "Moored",
    icon: "fa-link",
    summary: "Secured to another vessel, station, platform, or temporary berth.",
    effects: Object.freeze([
      "Crew field refit is available.",
      "Cargo and crew transfer is permitted by the operational state.",
      "No dock or shipyard discount applies unless the location grants one separately.",
      "Professional gp service is unavailable by status alone."
    ]),
    refitModes: Object.freeze(["crew"]),
    preferredRefitMode: "crew"
  }),
  drifting: Object.freeze({
    key: "drifting",
    label: "Drifting",
    icon: "fa-wind",
    summary: "The vessel is not maintaining controlled propulsion or station keeping.",
    effects: Object.freeze([
      "Dock and shipyard services are unavailable.",
      "Normal controlled movement is not available by status.",
      "Engineer and Navigator recovery actions become operationally important.",
      "Only emergency field work should be attempted until control is restored."
    ]),
    refitModes: Object.freeze([]),
    preferredRefitMode: "crew"
  })
});

export const SHIP_OPERATIONAL_STATUS_KEYS = Object.freeze(Object.keys(SHIP_OPERATIONAL_STATUSES));
export const DEFAULT_SHIP_OPERATIONAL_STATUS = "underway";

export function normalizeShipOperationalStatus(value) {
  const key = String(value ?? "").trim().toLowerCase();
  return SHIP_OPERATIONAL_STATUSES[key] ? key : DEFAULT_SHIP_OPERATIONAL_STATUS;
}

export function shipOperationalStatus(ship = {}) {
  const key = normalizeShipOperationalStatus(ship?.operationalStatus);
  return SHIP_OPERATIONAL_STATUSES[key];
}

export function shipAllowsRefitMode(ship = {}, mode = "crew") {
  return shipOperationalStatus(ship).refitModes.includes(mode);
}
