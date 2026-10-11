import {publicDb,publicConfig} from './supabase';
import {siteConfig,type SiteVariant} from './site-config';
import {readAllRegionRows,summarizeRegions,type RegionRow} from './map-regions';

export async function mapRegionCatalog(variant:SiteVariant){
 if(!publicConfig().ready)throw new Error('지도 데이터 연결이 필요합니다.');
 const client=publicDb();
 // Public catalogue only: no unpublished reports, user IDs, phones or private photos.
 const rows=await readAllRegionRows(async(offset,size)=>{
  const {data,error}=await client.from(siteConfig(variant).tables.menus)
   .select('id,shop,address').order('id',{ascending:true}).range(offset,offset+size-1);
  if(error)throw error;
  return (data||[]) as RegionRow[];
 });
 return summarizeRegions(rows);
}

