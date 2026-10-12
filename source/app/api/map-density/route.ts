import {publicDb,publicConfig} from '@/lib/supabase';
import {reply} from '@/lib/server';
import {groupDensity,type DensityRow,type DensityLevel} from '@/lib/map-density';
import {isKoreanCoordinate} from '@/lib/korean-region';

// Count the full published catalogue independently of the menu list's 100-item page.
// Never count drafts, fabricate NAVER heat data, or expose private owner records.
export async function GET(request:Request){
 try{
  if(!publicConfig().ready)return reply(request,{error:'매장 데이터 연결을 확인해 주세요.'},503);
  const p=new URL(request.url).searchParams,level=p.get('level') as DensityLevel;
  if(!['region','district','dong'].includes(level))return reply(request,{error:'지역 단위를 확인해 주세요.'},400);
  const lat=p.has('lat')?Number(p.get('lat')):null,lng=p.has('lng')?Number(p.get('lng')):null;
  if((lat!==null||lng!==null)&&!isKoreanCoordinate(lat,lng))return reply(request,{error:'위치를 확인해 주세요.'},400);
  const origin=lat!==null&&lng!==null?{lat,lng}:null,rows:DensityRow[]=[];
  const keyword=(p.get('q')||'').replace(/[^\p{L}\p{N}\s]/gu,'').trim().slice(0,60),heat=Number(p.get('heat')),budget=Number(p.get('budget'));
  let complete=false;
  for(let page=0;page<25;page++){
   let q=publicDb().from('ng_map_hot_menu_catalog').select('id,shop,address,lat,lng').not('lat','is',null).not('lng','is',null);
   if(keyword)q=q.or(`menu.ilike.%${keyword}%,shop.ilike.%${keyword}%,address.ilike.%${keyword}%`);
   if(Number.isInteger(heat)&&heat>=1&&heat<=8)q=q.eq('heat',heat);
   if(Number.isInteger(budget)&&budget>=100&&budget<=1000000)q=q.lte('price',budget);
   for(const field of ['flavor','category'] as const){const value=p.get(field);if(value&&value!=='전체')q=q.eq(field,value.slice(0,80))}
   if(origin){const dy=15/111,dx=15/(111*Math.cos(origin.lat*Math.PI/180));q=q.gte('lat',origin.lat-dy).lte('lat',origin.lat+dy).gte('lng',origin.lng-dx).lte('lng',origin.lng+dx)}
   const {data,error}=await q.order('id').range(page*1000,page*1000+999);if(error)throw error;
   rows.push(...(data||[]).filter(r=>!['나우고','나우고 카페'].includes(r.shop.trim())));
   if(!data||data.length<1000){complete=true;break}
  }
  // A truncated count must not appear as an authoritative total.
  if(!complete)return reply(request,{error:'전체 매장 집계를 완료하지 못했습니다. 검색 지역을 좁혀 주세요.'},503);
  const groups=groupDensity(rows,level,origin);
  return Response.json({groups,total:groups.reduce((n,g)=>n+g.count,0),scope:origin?'15km':'published',complete:true},{headers:{'Cache-Control':'public, max-age=0, s-maxage=30'}});
 }catch{return reply(request,{error:'지역별 매장 수를 확인하지 못했습니다.'},503)}
}
