import {distanceKm,MAP_RADIUS_KM,type GeoPoint} from './nearby-demo.ts';
import {isKoreanCoordinate} from './korean-region.ts';

export type DensityLevel='region'|'district'|'dong';
export type DensityRow={shop:string;address:string;lat:number|null;lng:number|null};
export type DensityGroup={label:string;lat:number;lng:number;count:number;level:DensityLevel};
const aliases:Record<string,string>={서울:'서울특별시',서울시:'서울특별시',부산:'부산광역시',대구:'대구광역시',인천:'인천광역시',광주:'광주광역시',대전:'대전광역시',울산:'울산광역시',세종:'세종특별자치시',경기:'경기도',강원:'강원특별자치도',충북:'충청북도',충남:'충청남도',전북:'전북특별자치도',전남:'전라남도',경북:'경상북도',경남:'경상남도',제주:'제주특별자치도'};
export function densityLevel(zoom:number):DensityLevel{return zoom<=9?'region':zoom<=12?'district':'dong'}
export function densityColor(count:number){const strength=Math.min(1,Math.log10(Math.max(1,count))/2);return {background:`rgb(${Math.round(252-72*strength)}, ${Math.round(221-193*strength)}, ${Math.round(217-193*strength)})`,color:strength>=.6?'#fff':'#68140c'}}
export function administrativeLabel(address:string,level:DensityLevel){
 const parts=address.replace(/^대한민국\s+/,'').trim().split(/\s+/),province=aliases[parts[0]]||parts[0]||'지역 미확인';
 if(level==='region')return province;
 const districts=parts.slice(1).filter(p=>/^[가-힣0-9]+(?:시|군|구)$/.test(p)).slice(0,2);
 const district=[province,...districts].join(' ');
 if(level==='district')return district;
 const dong=address.match(/(?:^|[\s(])([가-힣0-9·]+(?:동|읍|면|가))(?=$|[\s)])/u)?.[1];
 return district+(dong?' '+dong:' · 동 미확인');
}
export function groupDensity(rows:readonly DensityRow[],level:DensityLevel,origin:GeoPoint|null=null):DensityGroup[]{
 const groups=new Map<string,{lat:number;lng:number;count:number}>(),seen=new Set<string>();
 for(const row of rows){
  if(!isKoreanCoordinate(row.lat,row.lng))continue;
  const point={lat:row.lat!,lng:row.lng!};if(origin&&distanceKm(origin,point)>MAP_RADIUS_KM)continue;
  // The catalogue may contain multiple consumer reports and owner menus for one shop.
  const key=row.shop.trim().toLocaleLowerCase()+'\0'+row.address.replace(/\s/g,'').toLocaleLowerCase();if(seen.has(key))continue;seen.add(key);
  const label=administrativeLabel(row.address,level),group=groups.get(label)||{lat:0,lng:0,count:0};group.lat+=point.lat;group.lng+=point.lng;group.count++;groups.set(label,group);
 }
 return [...groups].map(([label,g])=>({label,lat:g.lat/g.count,lng:g.lng/g.count,count:g.count,level}));
}
