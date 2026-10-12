import {HEAT,RICH_HEAT,SWEET_HEAT} from './menus.ts';

type TastePlanet='hot'|'sweet'|'rich';
export function tasteLevels(planet:TastePlanet){
 return planet==='hot'?HEAT:planet==='sweet'?SWEET_HEAT:RICH_HEAT;
}
export function isTasteLevel(planet:TastePlanet,level:number){
 return Number.isInteger(level)&&level>=1&&level<=tasteLevels(planet).length;
}
export function displayTasteLevel(planet:TastePlanet,level:number){
 return Math.min(tasteLevels(planet).length,Math.max(1,Math.trunc(level)||1));
}
// The existing artwork has five columns. HOT 6–8 keep the hottest artwork
// with a separate exact numeric stage, without truncating the saved value.
export function tastePinPosition(planet:TastePlanet,level:number){
 const column=Math.min(5,displayTasteLevel(planet,level));
 return `${(column-1)*25}% ${planet==='sweet'?50:planet==='rich'?100:0}%`;
}
