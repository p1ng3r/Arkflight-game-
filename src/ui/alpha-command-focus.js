import { ALPHA_CARDS } from "../alpha/cards.js";

/** UI guidance only: legal actions and all costs remain server-authoritative. */
export function commandFocus(s, ship, {canOperate=()=>false}={}) {
  if(!s||!ship)return {title:"Take command",hint:"Choose a ship or build a test fleet.",tab:"plan",instantIds:[],shots:[]};
  const active=s.turnOrder?.[s.turnIndex],attack=s.attacks?.[s.attackIndex],request=s.pendingCrewAction;
  let title="Stand by",hint="Follow fleet progress above.",tab="plan";
  if(request){title=`${s.ships[request.shipId]?.name} · station check`;hint=`${request.name} — assigned crew chooses a skill, then rolls.`;tab="hand";}
  else if(s.pendingDiscard?.shipId===ship.id){title="Choose cards to discard";hint=`Select exactly ${s.pendingDiscard.count} card(s), then confirm.`;tab="hand";}
  else if(s.phase==="planning"){
    title=s.locked[ship.id]?"Course locked":"Choose your course";
    hint=s.locked[ship.id]?"Waiting for the fleet. Your maneuver is saved.":"Preview a template on the battlefield, stage it, then lock your maneuver.";
  }else if(s.phase==="cards"){
    title=active===ship.id?"Your ship · play cards":"Waiting for another ship";
    hint=active===ship.id?"Play cards or commit a battery. Keep AP for an Instant; finish when ready.":`${s.ships[active]?.name??"The active ship"} is taking its Card phase. You can inspect your hand.`;tab="hand";
  }else if(s.phase==="targeting"){title="Choose firing targets";hint="Assign legal targets to committed batteries. Arc / range previews remain available.";}
  else if(s.phase==="response"){
    title=attack?.targetId===ship.id&&!attack.responses?.[ship.id]?"Incoming fire · respond or pass":"Resolve the exchange";
    hint=attack?`${s.ships[attack.shipId]?.name} → ${s.ships[attack.targetId]?.name}. Eligible Instants are highlighted in the defender’s hand.`:"Waiting for the next attack.";tab="hand";
  }else if(s.phase==="retarget"){title="Firing solution changed";hint="Choose a legal replacement target or hold the shot.";}
  else if(s.phase==="cleanup"||s.complete){title=s.complete?"Encounter complete":"Round complete";hint="Review the recorded rolls and damage. The GM starts the next round.";tab="log";}
  else if(s.phase==="boarding"){title="Boarding encounter";hint="Ship combat is paused. Continue on the prepared deck scene.";tab="ship";}
  const responding=s.phase==="response"&&attack?.targetId===ship.id&&!attack.responses?.[ship.id]&&!request&&!s.pendingDiscard&&!s.complications?.choices?.some(c=>c.status==="pending");
  const instantIds=responding?ship.hand.filter(id=>{
    const c=ALPHA_CARDS[ship.instances[id]];
    return c?.timing==="instant"&&ship.ap>=c.ap&&(!(c.id==="shield")||ship.resources.lifeveil.value>=5)&&canOperate(ship.id,c.stations[0]);
  }):[];
  return {title,hint,tab,responding,instantIds,shots:(s.attacks??[]).filter(a=>a.shipId===ship.id&&!a.resolved).map(a=>({id:a.id,battery:ship.batteries.find(b=>b.id===a.batteryId)?.name??a.batteryId,target:s.ships[a.targetId]?.name??"Target next phase",formula:a.formula}))};
}
