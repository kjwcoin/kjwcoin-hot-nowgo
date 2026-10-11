export const MAP_REGIONS = [
 {id:'seoul',name:'서울',prefixes:['서울'],lat:37.5665,lng:126.978},
 {id:'incheon',name:'인천',prefixes:['인천'],lat:37.4563,lng:126.7052},
 {id:'gyeonggi',name:'경기',prefixes:['경기'],lat:37.275,lng:127.4},
 {id:'gangwon',name:'강원',prefixes:['강원'],lat:37.8228,lng:128.1555},
 {id:'chungbuk',name:'충북',prefixes:['충북','충청북도'],lat:36.9,lng:127.75},
 {id:'chungnam',name:'충남',prefixes:['충남','충청남도'],lat:36.65,lng:126.8},
 {id:'daejeon',name:'대전',prefixes:['대전'],lat:36.3504,lng:127.3845},
 {id:'sejong',name:'세종',prefixes:['세종'],lat:36.55,lng:127.1},
 {id:'jeonbuk',name:'전북',prefixes:['전북','전라북도'],lat:35.82,lng:127.15},
 {id:'jeonnam',name:'전남',prefixes:['전남','전라남도'],lat:34.85,lng:126.98},
 {id:'gwangju',name:'광주',prefixes:['광주'],lat:35.1595,lng:126.8526},
 {id:'gyeongbuk',name:'경북',prefixes:['경북','경상북도'],lat:36.3,lng:128.75},
 {id:'gyeongnam',name:'경남',prefixes:['경남','경상남도'],lat:35.46,lng:128.2},
 {id:'daegu',name:'대구',prefixes:['대구'],lat:35.8714,lng:128.6014},
 {id:'ulsan',name:'울산',prefixes:['울산'],lat:35.5384,lng:129.3114},
 {id:'busan',name:'부산',prefixes:['부산'],lat:35.1796,lng:129.0756},
 {id:'jeju',name:'제주',prefixes:['제주'],lat:33.38,lng:126.53},
] as const;
export type MapRegion = (typeof MAP_REGIONS)[number];
export type RegionCount = {id:string;name:string;lat:number;lng:number;count:number};
export type RegionSummary = {regions:RegionCount[];total:number;unassigned:number};
export type RegionRow = {id:string;shop:string;address:string};
export function mapScopeParameters(scope:'national'|'regional'|'nearby',regionId:string,location:{lat:number;lng:number}|null,radiusKm:number):Record<string,string>{
 if(scope==='regional'&&MAP_REGIONS.some(region=>region.id===regionId))return {region:regionId};
 if(scope==='nearby'&&location)return {lat:String(location.lat),lng:String(location.lng),radiusKm:String(radiusKm)};
 return {};
}
export const regionForAddress = (address:string) => MAP_REGIONS.find(region => region.prefixes.some(prefix => address.trim().startsWith(prefix)));
export function summarizeRegions(rows:readonly RegionRow[]):RegionSummary {
 const regions:RegionCount[]=MAP_REGIONS.map(region=>({id:region.id,name:region.name,lat:region.lat,lng:region.lng,count:0}));
 const seen=new Set<string>();let unassigned=0;
 for(const row of rows){
  if(['나우고','나우고 카페'].includes(row.shop.trim()))continue;
  // Shared store identity for owner menus and repeated customer reports.
  const key=row.shop.trim().toLocaleLowerCase()+'\0'+row.address.replace(/\s/g,'').toLocaleLowerCase();
  if(seen.has(key))continue;seen.add(key);
  const region=regionForAddress(row.address),count=regions.find(item=>item.id===region?.id);
  if(count)count.count++;else unassigned++;
 }
 return {regions,total:seen.size,unassigned};
}
export async function readAllRegionRows(read:(offset:number,size:number)=>Promise<RegionRow[]>):Promise<RegionRow[]>{
 const rows:RegionRow[]=[];let offset=0;const size=100;
 while(true){
  const page=await read(offset,size);
  rows.push(...page);offset+=page.length;
  if(page.length<size)return rows;
  // Never turn a partial scan into a misleading nationwide total.
  if(offset>=100_000)throw new Error('지역 집계 범위를 초과했습니다.');
 }
}

