/** LOCAL candidate preparation only. Does not access a database, Git, or deployment API.
 * The parent must review the frozen packet and output before publishing this release.
 */
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
export const freezeSha='95abab3d1f40f9810e70137fadcc6468e65e5ea6ec5005d0832ac40bb2209c77';
const duplicateReviewSha='ef1ab91e611c85b146cf0e543f53a883bd316eee38351e594d6788cc5544924b';
const csvUrl='https://www.data.go.kr/data/15083033/fileData.do';
const uuidNamespace=Buffer.from('6ba7b8119dad11d180b400c04fd430c8','hex');
export function sourceUuid(sourceRef){
 const bytes=createHash('sha1').update(uuidNamespace).update('https://www.nowgo.space/source/'+sourceRef).digest().subarray(0,16);
 bytes[6]=(bytes[6]&15)|80;bytes[8]=(bytes[8]&63)|128;
 const hex=bytes.toString('hex');return [hex.slice(0,8),hex.slice(8,12),hex.slice(12,16),hex.slice(16,20),hex.slice(20)].join('-');
}
const fail=message=>{throw Error(message)};
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const date=value=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&new Date(value).toISOString().slice(0,10)===value;
const timestamp=value=>typeof value==='string'&&Number.isFinite(Date.parse(value));
const attribution=source=>({url:source.url,asOf:source.sourceAsOf,checkedAt:source.checkedAt,nativeRecordId:source.nativeRecordId});
export function prepareSeoulRelease(packet,base,baseRegistry,duplicateReview){
 if(packet.count!==25||packet.records?.length!==25||base.length!==105||Object.keys(baseRegistry.records).length!==98)fail('unexpected_release_size');
 const original=base,existing=new Map(original.map(row=>[row.source_ref,row]));
 const catalog=structuredClone(baseRegistry);const additions=[];const identities=new Set(original.flatMap(row=>[row.source_ref,...(row.source_metadata.aliasBindings||[]).map(alias=>alias.sourceRef)]));
 for(const source of packet.records){
  const nativeId=source.nativeRecordIds.sbiz,ref=source.source_ref;
  if(!/^MA[0-9A-Z]{18}$/.test(nativeId)||ref!=='data-go-kr-15083033-'+nativeId)fail('invalid_native_identity');
  const old=existing.get(ref);
  if(old)fail('batch_overlaps_existing_record');
  if(identities.has(ref))fail('duplicate_source_identity');identities.add(ref);
  const identity=source.identitySource,coordinate=source.coordinateSource,menu=source.menus[0];
  if(!source.address.startsWith('서울특별시 강남구 ')||source.district!=='강남구'||source.districtCode!=='11680')fail('wrong_reviewed_district');
  const raw=identity?.rawRecord;if(!raw||raw['상가업소번호']!==nativeId||raw['도로명주소']!==source.address||raw['상호명']!==source.nativeBusinessName||raw['시군구코드']!=='11680'||Number(raw['위도'])!==source.lat||Number(raw['경도'])!==source.lon)fail('raw_identity_mismatch');
  if(!Number.isFinite(source.lat)||!Number.isFinite(source.lon)||source.lat<33||source.lat>39.6||source.lon<124||source.lon>132)fail('invalid_coordinate');
  if(new URL(menu.sourceUrl).protocol!=='https:')fail('invalid_menu_source_url');
  if(source.registrationSource!==null||!identity||source.menus.length!==1||identity.url!==csvUrl||coordinate.url!==csvUrl||identity.nativeRecordId!==nativeId||coordinate.nativeRecordId!==nativeId)fail('invalid_identity_source');
  if(!date(identity.sourceAsOf)||!date(coordinate.sourceAsOf)||!timestamp(identity.checkedAt)||!timestamp(coordinate.checkedAt)||!timestamp(menu.checkedAt)||!(menu.sourceAsOf===null||date(menu.sourceAsOf)))fail('invalid_source_dates');
  if(source.lat!==Number(coordinate.rawLatitude)||source.lon!==Number(coordinate.rawLongitude)||coordinate.coordinateSystem?.epsg!==4326||typeof coordinate.rawLatitude!=='string'||typeof coordinate.rawLongitude!=='string')fail('coordinate_provenance_mismatch');
  if(!/^[a-f0-9]{64}$/.test(identity.sha256)||!same(identity.sha256,coordinate.sha256)||!Number.isSafeInteger(identity.dataRowNumber)||!Number.isSafeInteger(coordinate.dataRowNumber))fail('missing_source_locator');
  for(const field of ['nameAddress','coordinates']){const rights=source.fieldRights[field];if(rights.factsStorage!==true||rights.publicDisplay!==true||rights.commercialUse!==true||rights.sourceUrl!==csvUrl)fail('unlicensed_identity_field');}
  if(source.currentOperation!==null||source.currentMenuAvailability!==null||source.currentPrice!==null||source.photo!==null||source.sourceDescription!==null||source.photoPolicy!=='fallback_only'||source.ownerVerified===true)fail('unsupported_current_claim');
  for(const field of ['currentAvailability','price','priceAsOf','verifiedHeatLevel','scoville','customerMedianHeat'])if(menu[field]!==null)fail('unsupported_menu_claim');
  const brandCommon=menu.sourceScope==='brand_common';
  if(!brandCommon&&menu.sourceScope!=='specific_restaurant_official_tourism_record')fail('unsupported_menu_scope');
  if(brandCommon&&(menu.branchMenuApplicability!==null||!source.requiredPublicNotices.includes('브랜드 공통 메뉴 · 지점 판매 여부 미확인')))fail('brand_scope_notice_missing');
  if(/신전|sinjeon|shinjeon/i.test((source.brand||'')+' '+menu.sourceUrl)||source.fieldRights.oneMenuFact.explicitOpenLicense!==false)fail('unreviewed_menu_rights');
  const provenance={kind:brandCommon?'official-brand-menu':'official-tourism-place-menu',sourceScope:menu.sourceScope,branchMenuApplicability:brandCommon?null:'source_record_specific_restaurant_not_current_sale',...(brandCommon?{brandName:source.brand}:{}),sourceUrl:menu.sourceUrl,sourceRecordIds:menu.sourceRecordIds,sourceAsOf:menu.sourceAsOf,checkedAt:menu.checkedAt,licenseName:null,explicitOpenLicense:false,reuseBasis:'limited-individual-fact-review',originalName:menu.originalSourceMenuName,nameRepresentation:'original',currentAvailability:null,priceAsOf:null};
  if(brandCommon&&(!source.brand||!source.nativeBusinessName.includes(source.brand)&&source.brand!=='동대문엽기떡볶이'))fail('missing_brand_identity');
  const publicMenu={name:menu.name,provenance};const menuKey=createHash('sha256').update(JSON.stringify(publicMenu)).digest('hex').slice(0,16);if(catalog.menus[menuKey]&&!same(catalog.menus[menuKey],publicMenu))fail('menu_key_conflict');catalog.menus[menuKey]=publicMenu;
  const fieldProvenance={licenseScope:'identity-location-only',registration:null,identity:attribution(identity),coordinates:attribution(coordinate)};
  const id=sourceUuid(ref),slug='hot-seoul-'+nativeId.toLowerCase();
  const aliases=[...new Set([...(source.nativeRecordIds.sbizAliases||[]),...(source.nativeRecordIds.sbizAdditionalIds||[])])];
  const deduplication=source.deduplication??null;
  let duplicateSourceRows=null;
  if(aliases.length){
   const proof=duplicateReview.find(row=>row.retainedId===nativeId);
   if(!proof||!same([...proof.aliasIds].sort(),[...aliases].sort())||proof.allRawRecords.length!==aliases.length+1)fail('missing_alias_proof');
   const expected=new Set([nativeId,...aliases]);
   for(const [rowNumber,rawAlias] of proof.allRawRecords){
    if(!expected.delete(rawAlias['상가업소번호'])||!Number.isSafeInteger(rowNumber))fail('invalid_alias_proof');
    for(const key of ['도로명주소','건물관리번호','층정보','호정보','동정보','위도','경도'])if(rawAlias[key]!==raw[key])fail('alias_premises_conflict');
   }
   if(expected.size)fail('incomplete_alias_proof');
   duplicateSourceRows={sourceIds:[nativeId,...aliases],sourceRows:proof.allRawRecords.map(([dataRowNumber,rawRecord])=>({dataRowNumber,rawRecord})),assessment:proof.reason};
  }
  const aliasBindings=aliases.map(alias=>{if(!/^MA[0-9A-Z]{18}$/.test(alias))fail('invalid_alias_identity');const sourceRef='data-go-kr-15083033-'+alias;if(identities.has(sourceRef))fail('duplicate_alias_identity');identities.add(sourceRef);return{sourceRef,id:sourceUuid(sourceRef),menuId:sourceRef+':menu:1'};});
  catalog.records[ref]={id,slug,name:source.displayName,address:source.address,lat:source.lat,lon:source.lon,fieldProvenance,menuKey};
  additions.push({id,slug,name:source.displayName,address:source.address,lat:source.lat,lon:source.lon,source_ref:ref,source_metadata:{planet:'hot',sourceUrl:csvUrl,licenseName:'이용허락범위 제한 없음',sourceAsOf:identity.sourceAsOf,checkedAt:identity.checkedAt,nativeBusinessName:source.nativeBusinessName,nativeBranchName:source.nativeBranchName??null,displayNameBasis:source.displayNameBasis,sourceRecordId:nativeId,fieldProvenance,registrationLocator:null,identityLocator:identity,coordinateLocator:coordinate,aliasBindings,deduplication,duplicateSourceRows,sourcePremises:source.sourcePremises??null,rights:{factsStorage:true,publicDisplay:true,commercialUse:true,mediaCleared:false,scope:'identity-location-only'},factualUseReview:{batchId:packet.batchId,frozenFileSha256:freezeSha,oneMenuFact:source.fieldRights.oneMenuFact,releaseDecision:source.releaseDecision},menus:[{id:ref+':menu:1',name:menu.name,provenance}],reporting:{state:'pending'}}});
 }
 if(additions.length!==25||additions.filter(row=>row.source_metadata.menus[0].provenance.sourceScope==='brand_common').length!==24)fail('incorrect_candidate_composition');
 return{records:[...original,...additions],catalog};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const [path,sha,duplicatePath]=process.argv.slice(2);if(!path||sha!==freezeSha||!duplicatePath)fail('exact_reviewed_freeze_sha_required');
 const bytes=readFileSync(path),duplicateBytes=readFileSync(duplicatePath);
 if(createHash('sha256').update(bytes).digest('hex')!==freezeSha||createHash('sha256').update(duplicateBytes).digest('hex')!==duplicateReviewSha)fail('freeze_sha_mismatch');
 const dataDir=new URL('../data/',import.meta.url),baseBytes=readFileSync(new URL('hot-source-listings.json',dataDir)),registryBytes=readFileSync(new URL('hot-reviewed-source-registry.json',dataDir));
 if(createHash('sha256').update(baseBytes).digest('hex')!=='ed814172dd029971ad2a12e0f9d631895585051dc3112efd957b2e65f86747e3')fail('exact_105_source_baseline_required');
 const result=prepareSeoulRelease(JSON.parse(bytes),JSON.parse(baseBytes),JSON.parse(registryBytes),JSON.parse(duplicateBytes));
 writeFileSync(new URL('hot-source-listings.json',dataDir),JSON.stringify(result.records,null,2)+'\n');
 writeFileSync(new URL('hot-reviewed-source-registry.json',dataDir),JSON.stringify(result.catalog,null,2)+'\n');
 console.log(JSON.stringify({candidateOnly:true,records:result.records.length,added:25,reviewedMenuFacts:Object.keys(result.catalog.menus).length,freezeSha}));
}
