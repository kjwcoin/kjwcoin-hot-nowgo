import type {CSSProperties} from 'react';
import type {Planet} from '@/lib/activity/model';

export default function CharacterArt({planet,index,label,className=''}:{planet:Planet;index:number;label:string;className?:string}){
 const frame=Math.max(0,Math.min(5,Math.trunc(index)));
 // Six existing rank milestones use five visual outfits; the final outfit unlocks at king.
 const stage=[0,1,2,3,3,4][frame];
 const isGrowth=planet==='hot'||planet==='sweet';
 const style={
  backgroundImage:isGrowth?'url(/activity/characters-growth.webp)':`url(/activity/characters-${planet}.webp)`,
  backgroundPosition:isGrowth?`${stage*25}% ${planet==='sweet'?50:0}%`:`${(frame%3)*50}% ${Math.floor(frame/3)*100}%`,
  '--growth-x':`${stage*25}%`,
 } as CSSProperties;
 return <div role="img" aria-label={label} data-planet={planet} className={`aw-avatar ${className}`} style={style}/>;
}
