import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { SHIP_COMPLICATION_CARDS, COMPLICATION_SCENARIOS } from "../src/content/ship-complications.js";
import { validateComplicationCatalog } from "../src/combat/ship-complications.js";

validateComplicationCatalog();
const header = `# Ship Complications — 24 cards, 144 outcomes

Updated 24 October 2026. The six-entry format and critical-failure-only trigger are approved. All 144 entries are now authored as original Arkflight draft content in \`src/content/ship-complications.js\`. Individual numerical effects are playtest values, not a balanced release.

## First programmed increment

The catalog, deterministic shuffled deck, six-context selection, final-degree gate, resource choices, one-use effect records, expiry, idempotent draws and a Foundry Complication Lab are implemented. The Lab uses its own client-local setting and two sample ships. It does not change campaign Actors, native tokens, the saved paper encounter or the existing AP/RP combat prototype.

Temporary restrictions and paid enemy opportunities are machine-readable descriptors. The Lab records them and can simulate their consumption and AP claims; the future phased combat controller must enforce them during actual card play, attacks, reload and maneuvers. The old combat path is not automatically connected to this deck. No live Foundry/PF2e acceptance has been established by local tests or browser mocks.

## Open the Lab

After updating to the feature branch, restart/reload Foundry so the new manifest entries load. In a world with Arkflight enabled, open **Configure Settings → Module Settings → Arkflight Game → Open Complication Lab**, or run this as a GM Script macro:

\`\`\`js
await game.arkflight.complications.open();
\`\`\`

Choose Impact or a station, then choose the final check result. **Resolve test check** draws only for critical failure. Failure, success and critical success leave the deck and resources unchanged. A revealed card shows only its relevant entry; expand it to inspect all six. Browsing the catalog does not draw. Resolve crew choices, inspect sample resources/effects, test an opponent spending AP, advance rounds and verify expiry. Reset affects only the Lab's samples. The window is movable, resizable, minimizable and restores through the same macro.

## Resolution contract

- Exactly 24 cards, one copy each, one shared deck. Shuffle at encounter start and reshuffle eligible discards when empty. No AP, hand capacity or normal combat draw is consumed by a complication draw.
- Only a final **critical failure** can draw. Ordinary failure never draws, including by card-specific exception. A natural 1 uses the normal degree adjustment; it is not an independent draw trigger.
- Read **one** entry: Impact for a collision Structure critical failure; otherwise the station whose contribution critically failed. A basic weapon attack uses Battle Watch. Character checks, unrelated resource saves and events do not implicitly use this deck.
- At most one draw per ship per source event/activation. Coordinated contributions use the same source ID and resolve in the card's printed order; the first critical failure supplies the entry. Each ship in a collision can draw once. Repeated commands do not redraw or reapply resource losses.
- The complication replaces the source result's fixed negative kicker. The original support base effect remains, while an attack can still miss and spend its ordinary ammunition/reload. Apply the new complication after the original action resolves; it cannot retroactively alter that action. Complications cannot recursively draw more complications.
- Resource losses/Strain gains apply immediately, clamped to the sample track limits. Resource options in a choice must actually be affordable; an empty track or full Strain cannot buy a free escape, and a Hull-cost option cannot destroy the ship. Percentage losses use the track maximum. Normal resource recovery, not shuffling or cleanup, replenishes losses.
- Unless an entry says otherwise, a temporary effect applies to the next matching action and expires at the end of the following round if unused. Normal-maneuver restrictions and initiative penalties begin next round. Restrictions spanning a round, such as different battery targets, retain their full meaning until completed or expired; consumers must not remove them after the first partial use.
- For a reduced normal maneuver, execute the selected route's legal prefix and omit instructions after reaching the reduced travel limit. Restrictions always leave Hold legal. Revalidate footprint/obstacles before any movement; no forced overlap or arbitrary replacement route is granted.
- Battery-specific outcomes use the action's selected battery, or the collision's struck-side battery when provided by the controller. Ties must be resolved by stable mount ID. The current standalone engine falls back to the first mounted battery by stable ID when none is provided. A ship with no batteries receives a one-use -1 check penalty for the relevant station (Structure for Impact) instead.
- Contact-only results have an explicit Structure-check fallback when no opposing ship is alongside. Boarding opportunities still require legal contact and a normal boarding attempt; neither boarding nor a free attack happens automatically.
- A paid opportunity costs its exploiting opponent **1 additional AP**, for one specified benefit on an otherwise legal action. It does not replace the action's own AP cost. The Lab's AP claim reserves the permission; the action controller must validate the target, mitigation and timing before consuming it.
- Identical temporary effects refresh rather than add. Numerical complication penalties to one check use only the greatest applicable penalty. Distinct resource losses from distinct triggers still apply. Existing AC/DR/resistance card play limits remain unchanged.
- Every temporary entry has automatic expiry; recovery never requires drawing a particular random card. Encounter end clears unscheduled temporary complications, not resource losses. Once an extra reload has been scheduled on a weapon, that weapon's reload timer must persist until ready. The standalone engine stores the scheduling descriptor; the future weapon controller owns the actual timer.

## Design reference

Paizo's official PF2e Critical Fumble Deck description confirms drawing one card and applying one of four alternative effects: https://store.paizo.com/pathfinder-critical-fumble-deck-download/. Arkflight uses the multi-scenario presentation idea with six original ship outcomes per card. This is not a reproduction of Paizo's deck.

## Full draft catalog

The common duration/choice rules above apply to each entry. Resource changes are immediate; their losses persist until normal recovery. Most entries create a short-lived constraint, choice or paid enemy opportunity rather than extra damage.

`;
const escape = text => text.replaceAll("|", "\\|").replaceAll("\n", " ");
let text = header;
for (const [index, card] of SHIP_COMPLICATION_CARDS.entries()) {
  text += `## ${String(index + 1).padStart(2, "0")} — ${card.name}\n\n| Scenario | Outcome | Effect |\n| --- | --- | --- |\n`;
  for (const [scenario, outcome] of Object.entries(card.entries)) {
    const choices = outcome.effect.kind === "choice" ? ` **Choose one:** ${outcome.effect.options.map(o => escape(o.label)).join(" OR ")}.` : "";
    text += `| ${COMPLICATION_SCENARIOS[scenario]} | **${escape(outcome.title)}** | ${escape(outcome.text)}${choices}${outcome.fallback ? ` **Fallback:** ${escape(outcome.fallback.text)}` : ""} |\n`;
  }
  text += "\n";
}
await writeFile(fileURLToPath(new URL("../docs/ARKFLIGHT-1.1.0-SHIP-COMPLICATIONS.md", import.meta.url)), text.trimEnd() + "\n");
console.log("Wrote 24 cards / 144 contextual outcomes from the validated catalog.");
