import type {Planet} from '@/lib/activity/model';

export default function CharacterArt({planet,index,label,className=''}:{planet:Planet;index:number;label:string;className?:string}){
 const frame=Math.max(0,Math.min(5,Math.trunc(index)));
 return <div role="img" aria-label={label} className={`aw-avatar ${className}`} style={{backgroundImage:`url(/activity/characters-${planet}.webp)`,backgroundPosition:`${(frame%3)*50}% ${Math.floor(frame/3)*100}%`}}/>;
}
