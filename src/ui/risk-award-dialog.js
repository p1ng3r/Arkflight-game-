import { RISK_CHOICE_IDS } from "../event/risk-choices.js";

export async function resolveRiskAwardDialog(controller, awardId) {
  const state = controller.state;
  const award = state?.encounter?.pendingRiskAwards?.find(row => row.id === awardId);
  if (!award) throw new Error("That Risk reward is no longer pending.");
  const escape = value => foundry.utils.escapeHTML(String(value ?? ""));
  const remaining = state.order.filter(id => !state.results?.[id]);
  const select = (name, rows) => `<select name="${name}"><option value="">Choose…</option>${rows.map(id => `<option value="${escape(id)}">${escape(id)}</option>`).join("")}</select>`;
  const automated = RISK_CHOICE_IDS.has(award.benefitId);
  let fields = "";
  const id = award.benefitId;
  if (["order-followup", "hazard-turn-1", "hazard-opportunity", "lifeveil-ward", "weapons-opening", "station-link-strong", "station-link-legend"].includes(id)) fields += `<label>Eligible unresolved station${select("targetStationId", remaining)}</label>`;
  if (["hazard-remove-1", "hazard-suppress-1", "hazard-suppress-2", "hazard-delay", "hazard-turn-1", "hazard-opportunity", "lifeveil-ward", "rigging-clear", "weapons-opening"].includes(id)) fields += `<label>Eligible Hazard${select("hazardId", state.encounter.hazards ?? [])}</label><p>Choose a Hazard/action matching the reward's stated type and eligibility.</p>`;
  if (["order-swap", "order-shift-self"].includes(id)) fields += `<label>Unresolved stations in the new order (comma separated)<input name="order" value="${escape(remaining.join(", "))}"></label>`;
  if (id === "crew-shield") fields += `<label>Two unresolved station IDs (comma separated; ignored on Critical Success)<input name="targets" value="${escape(remaining.slice(0,2).join(", "))}"></label>`;
  if (id === "arkengine-master") fields += `<label>Reward${select("engineChoice", ["refresh", "strain"])}</label>`;
  if (id === "helm-line") fields += `<label>Success benefit${select("helmChoice", ["bonus", "dc"])}</label>`;
  const fd = await foundry.applications.api.DialogV2.input({
    window: { title: `Resolve Risk — ${award.name}` }, modal: true, rejectClose: false,
    content: `<p>${escape(award.effect)}</p>${automated ? "<p>The selected mechanical effect will be applied when submitted.</p>" : "<p>This reward requires a GM ruling. Apply its remaining effect in Foundry, then record what happened below. Recording alone does not apply the effect.</p>"}${fields}<label>Resolution / eligibility note<textarea name="note" required></textarea></label><label><input type="checkbox" name="ineligible">No eligible target or authored effect (explain above; no effect applied)</label>`,
    ok: { label: automated ? "Apply Chosen Reward" : "Record GM Resolution", icon: "fa-solid fa-check" }
  });
  if (!fd) return;
  await controller.command({ type: "record-risk-award", awardId, note: fd.note,
    ineligible: Boolean(fd.ineligible), options: {
      targetStationId: fd.targetStationId, hazardId: fd.hazardId, engineChoice: fd.engineChoice, helmChoice: fd.helmChoice,
      order: String(fd.order ?? "").split(",").map(s => s.trim()).filter(Boolean),
      targetStationIds: String(fd.targets ?? "").split(",").map(s => s.trim()).filter(Boolean), note: fd.note
    } });
}
