/** Animate evaluated dice only. Optional presentation must never reroll or undo a saved action. */
export async function showAlphaCardRolls(rolls,{user,actorId,shipName}={}) {
  const dice=game.dice3d;
  if(!dice?.animateRoll&&!dice?.showForRoll)return;
  let timer;
  try {
    await Promise.race([
      (async()=>{for(const roll of rolls){
        const speaker={actor:actorId,alias:shipName};
        if(typeof dice.animateRoll==="function")await dice.animateRoll(roll,{author:user?.id,speaker},{messageMode:"public"});
        else await dice.showForRoll(roll,user,true,null,false,null,speaker);
      }})(),
      new Promise(resolve=>{timer=setTimeout(resolve,8000);})
    ]);
  } catch(error) { console.warn("Arkflight | Card resolved; optional 3D dice unavailable",error); }
  finally {clearTimeout(timer);}
}
