const card=(id,name,station,ap,role,text,extra={})=>({id,name,stations:[station],ap,role,timing:"standard",text,...extra});
/** A complete small alpha set; mandatory General/Flux/Signature cooldown classes are retired here. */
export const ALPHA_CARDS=Object.freeze(Object.fromEntries([
  card("acquire","Acquire Target","battlewatch",1,"Command","One battery attack this round gains +1 accuracy; critical success +2."),
  card("patch","Patch Hull","engineer",1,"Repair","Spend 1 Supply; restore 1d10+4 Hull, or 2d10+4 on critical success."),
  card("brace","Brace for Combat","captain",1,"Defense","Prepare DR 3 for the whole next round; critical success DR 4. Only one DR card may be played per ship per round.",{delayed:true,dr:true}),
  card("prepare","Prepare the Crew","captain",1,"Command","Gain +1 AP after next round's refresh; critical success +2. Prepared AP is capped at +2 per round.",{delayed:true}),
  card("shield","Shield Pulse","veilwarden",1,"Defense","Before an incoming attack: spend 5% Lifeveil for resistance 5 to that attack, or 7 on critical success.",{timing:"instant"}),
  card("helm","Emergency Helm","navigator",1,"Maneuver","Before an incoming attack: move 1 hex forward OR rotate 60°. Critical success can do both. Legal geometry and bonus movement limits apply.",{timing:"instant"}),
  card("volley","Coordinated Volley","engineer",2,"Attack","Engineering prepares a ready battery shot with +2d8 damage at level 5; Battle Watch rolls the attack in the Damage phase. Critical Engineer success also grants +1 accuracy.",{stations:["engineer","battlewatch"]}),
  card("harmonic","Harmonic Volley","veilwarden",2,"Attack","Spend 5% Lifeveil and prepare a battery shot with +2d8 damage at level 5, bypassing 2 DR (3 on critical Veil success). Battle Watch rolls the attack later.",{stations:["veilwarden","battlewatch"]}),
  card("all-hands","All Hands Broadside","captain",3,"Attack","Prepare one broadside shot with +4d10 damage at level 5 and +1 accuracy; critical Captain success gives +2 accuracy. Burn for this encounter.",{stations:["captain","battlewatch"],burn:true,unique:true}),
  card("evasive","Evasive Course","navigator",1,"Defense","Gain +1 AC through this round; critical success +2. Same-type AC bonuses use the strongest."),
  card("read","Read the Battle","captain",1,"Utility","Draw 1 card. Critical success: draw 2, then discard 1. Enforce hand capacity after drawing."),
  card("chainshot","Chainshot Volley","battlewatch",2,"Attack","Fire one compatible battery with 2d10+8 damage at level 5; a hit reduces the target's next maneuver by 1 hex, or 2 on critical hit. Consume one real chainshot charge when fired.",{ammo:"chainshot"}),
  card("breakaway","Breakaway Volley","navigator",3,"Attack","Move 1 hex or rotate 60°, then prepare one ready battery attack with +2d8 damage at level 5. Critical Navigator success permits both adjustments. Burn for this encounter.",{stations:["navigator","battlewatch"],burn:true,unique:true}),
  card("ahead","Full Ahead","navigator",1,"Maneuver","Move 2 additional hexes forward; critical success 3. Total bonus travel per round cannot exceed normal hull speed."),
  card("overcharge","Overcharge Weapons","engineer",1,"Command","Gain 1 Strain. Your next two battery attacks this round gain +1d8 damage; critical success +1d10 instead."),
  card("mend","Mend Lifeveil","veilwarden",1,"Repair","Restore 1d10+5 percentage points of Lifeveil; critical success 2d10+5, capped at 100%."),
  card("rally","Rally Crew","captain",1,"Repair","Restore 1d10+5 percentage points of Morale; critical success 2d10+5, capped at 100%."),
  card("vent","Vent Strain","engineer",1,"Repair","Remove 1d4 plus ship bonus Strain; critical success removes 2d4 plus ship bonus. Ship bonus is 1 + one per four ship levels."),
  card("work-guns","Work the Guns","battlewatch",1,"Utility","Reduce one battery's reload by 1 round; critical success 2. A battery still fires at most once per round."),
  card("boarding","Secure Boarding Lines","battlewatch",1,"Utility","Attempt to secure a boarding link to an adjacent enemy ship. Success secures lines; failure does not. Critical failure draws a Battle Watch complication."),
  card("ram","Ramming Stations","battlewatch",1,"Command","Prepare +2 impact damage against the other ship in next round's first collision; critical success +4. Your own impact save still matters.",{delayed:true})
].map(c=>[c.id,Object.freeze(c)])));
export const ALPHA_STARTER_DECK=Object.freeze(["acquire","vent","patch","patch","brace","brace","prepare","shield","shield","helm","volley","volley","evasive","read","all-hands"]);
export const ALPHA_SKILLS=Object.freeze({captain:["diplomacy","intimidation","society"],engineer:["crafting","arcana","thievery"],navigator:["survival","nature","arcana"],veilwarden:["arcana","occultism","medicine"],battlewatch:["crafting","athletics","warfare-lore"]});
