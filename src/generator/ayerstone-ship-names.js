const GENERIC_PREFIX = ["Far","Night","Storm","Ash","Glass","Iron","Star","Void","Black","Bright","Deep","Cinder"];
const GENERIC_SUFFIX = ["wake","runner","ward","song","spear","wing","lantern","tide","horizon","reaver","compass","crown"];

const FACTION_NAMES = Object.freeze({
  "Freespacers": ["Open Horizon","Wayfarer's Luck","Silver Compass","Far Harbor","Second Sunrise","No King's Wake"],
  "Freebooters": ["Harbor Oath","Answering Star","Dock Forty-Four","Silver Pennant","Refuge's Spear","Last Horizon"],
  "Brotherhood of the Cosmic Flame": ["Pillar Ascendant","Red Dominion","Chain of Cinders","Dragon's Due","Imperial Pyre","Radiant Conquest"],
  "Grelkin Cartel": ["Stolen Thunder","Keep What You Can","Rustfang","Prize-Taker","Broken Chain","Scrap King"],
  "Veilwardens": ["Bound Lantern","Pale Aegis","Quiet Seal","Warded Vigil","Containment Oath","Veil Bastion"],
  "Underwake Syndicates": ["Quiet Profit","False Horizon","Night Ledger","Smuggler's Grace","Hidden Wake","Third Route"],
  "Faith of the Churn": ["Returning Tide","Second Breath","Wheel Without End","Purpose Renewed","The Next Wake","Pilgrim's Turn"],
  "Council of the Void": ["The Unreturned Reflection","Black Interval","Folded Silence","Eye Beyond Charts","The Ship Already There","Starless Recursion"],
  "Starweaver Sky Lines": ["Celestial Passage","Open Horizon","Starweaver Meridian","Golden Route","Far Lantern","Horizon Belle"],
  "House Starweaver": ["Meridian Crown","Far Meridian","Celestial Ledger","Horizon Key","Starweaver Venture"],
  "House Aurelian": ["Stone Crown","Royal Endurance","Aurelian Resolve","Old Oath","Crownward"],
  "House Ironmantle": ["Deep Claim","Aetherite Fortune","Iron Below","Mantle Delver","Stone Venture"],
  "House Veyr": ["Final Ledger","Surety","Collected Due","Quiet Interest","Golden Covenant"],
  "House Blackwake": ["Blackwake Vow","Night Escort","Remembered Wake","Privateer's Due","Convoy Fang"],
  "House Stormglass": ["Unbroken Design","Stormglass Prototype","Voidwright","Brass Tempest","Maker's Trial"],
  "House Marruk": ["Standing Oath","Shield Contract","Marruk Vigil","Unbroken Line","Guard's Promise"],
  "House Valecross": ["Breath of Spring","Green Veil","Living Horizon","Harvest Star","Garden Wake"],
  "House Emberhall": ["Foundry Crown","Ember Hammer","Heat's Truth","Iron Furnace","Industrial Dawn"],
  "House Tidereach": ["Reservoir Star","Long Canal","Tidekeeper","Fallsward","Water's Due"]
});

function hashSeed(seed) { let h=2166136261; for (const c of String(seed)) { h^=c.charCodeAt(0); h=Math.imul(h,16777619); } return h>>>0; }
function pick(seed, rows, salt="") { return rows[hashSeed(`${seed}:${salt}`) % rows.length]; }

export function generateAyerstoneShipName({ faction="Independent", archetypeLabel="Vessel", seed=Date.now(), override="" }={}) {
  const edited = String(override ?? "").trim();
  if (edited) return edited;
  const table = FACTION_NAMES[faction];
  if (table?.length) return pick(seed, table, "faction-name");
  const first = pick(seed, GENERIC_PREFIX, "prefix");
  const second = pick(seed, GENERIC_SUFFIX, "suffix");
  return `${first}${second.charAt(0).toUpperCase()}${second.slice(1)}` || `${archetypeLabel} Vessel`;
}

export const AYERSTONE_SHIP_NAME_TABLES = FACTION_NAMES;
