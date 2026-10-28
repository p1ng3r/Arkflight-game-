/** Public readiness only: never put another ship's route or hidden cards in this view. */
export function fleetReadiness(s){
  if(!s)return {summary:"No encounter",rows:[],waiting:0};
  const active=s.turnOrder?.[s.turnIndex],attack=s.attacks?.[s.attackIndex];
  const rows=Object.values(s.ships).map(ship=>{
    let label="Standing by",ready=false;
    if(ship.resources.hull.value<=0){label="Disabled";ready=true;}
    else if(s.complete){label="Encounter ended";ready=true;}
    else if(s.phase==="planning"){ready=Boolean(s.locked[ship.id]);label=ready?"Course locked":"Awaiting course lock";}
    else if(s.phase==="cards"){
      const index=s.turnOrder.indexOf(ship.id);ready=index>=0&&index<s.turnIndex;label=ready?"Cards complete":ship.id===active?"Taking Card phase":"Waiting for turn";
    }else if(s.phase==="targeting"){
      const shots=s.attacks.filter(a=>a.shipId===ship.id&&!a.resolved);ready=shots.every(a=>Boolean(a.targetId));label=ready?"Targets ready":"Choose firing targets";
    }else if(["response","retarget"].includes(s.phase)){
      if(ship.id===attack?.targetId){ready=Boolean(attack.responses?.[ship.id]);label=ready?"Response complete":"Defender response needed";}
      else if(ship.id===attack?.shipId){ready=false;label=s.phase==="retarget"?"Choose replacement target":attack.responses?.[attack.targetId]?"Roll attack & damage":"Awaiting defender";}
      else ready=true;
    }else if(s.phase==="cleanup"){ready=true;label="Round resolved";}
    else if(s.phase==="boarding")label="Boarding pause";
    return {id:ship.id,name:ship.name,label,ready,active:ship.id===active&&s.phase==="cards"};
  });
  const waiting=rows.filter(r=>!r.ready).length;
  return {rows,waiting,summary:s.phase==="planning"?(waiting?`Waiting for ${waiting} ship${waiting===1?"":"s"} to lock` :"All courses locked · GM may reveal"):s.phase==="cards"?`${s.ships[active]?.name??"Ship"} · Card phase`:s.phase==="cleanup"?"Round complete · GM starts the next round":s.complete?"Encounter complete":`${waiting} ship${waiting===1?"":"s"} awaiting action`};
}
