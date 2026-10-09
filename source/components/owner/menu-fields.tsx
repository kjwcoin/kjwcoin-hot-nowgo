import {siteConfig,type SiteVariant} from '@/lib/site-config';
export default function MenuFields({variant,level=3,flavor,category}:{variant:SiteVariant;level?:number;flavor?:string;category?:string}){
 const theme=siteConfig(variant),taste=variant==='hot'?'매운맛':variant==='sweet'?'단맛':'느끼함';
 return <><label>맛<select name="taste" value={variant} disabled aria-label="맛"><option value={variant}>{theme.name} · {taste}</option></select></label>
 <label>단계<select name="level" defaultValue={level} required>{theme.heat.map((text,i)=><option value={i+1} key={text}>{i+1}단계 · {text}</option>)}</select></label>
 <label>결<select name="flavor" defaultValue={flavor||theme.flavors[1]} required>{theme.flavors.slice(1).map(text=><option key={text}>{text}</option>)}</select></label>
 <label>메뉴 종류<select name="category" defaultValue={category||theme.categories[0]} required>{theme.categories.map(text=><option key={text}>{text}</option>)}</select></label></>;
}
