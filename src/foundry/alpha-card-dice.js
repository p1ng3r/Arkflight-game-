/** Animate evaluated dice only. Optional presentation must never reroll or undo a saved action. */
export async function showAlphaCardRolls(rolls,{user,actorId,shipName}={}) {
  const dice=game.dice3d;
  if(!dice?.animateRoll&&!dice?.showForRoll)return;
  let timer,expired=false;
  try {
    await Promise.race([
      (async()=>{for(const entry of rolls){if(expired)break;
        const roll=entry.roll??entry,speaker={actor:entry.actorId??actorId,alias:entry.shipName??shipName};
        if(typeof dice.animateRoll==="function")await dice.animateRoll(roll,{author:user?.id,speaker},{messageMode:"public"});
        else await dice.showForRoll(roll,user,true,null,false,null,speaker);
      }})(),
      new Promise(resolve=>{timer=setTimeout(()=>{expired=true;resolve();},8000);})
    ]);
  } catch(error) { console.warn("Arkflight | Card resolved; optional 3D dice unavailable",error); }
  finally {clearTimeout(timer);}
}
