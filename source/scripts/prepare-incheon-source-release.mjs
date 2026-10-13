/** LOCAL candidate preparation only. Does not access a database, Git, or deployment API.
 * The parent must review the frozen packet and output before publishing this release.
 */
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
const freezeSha='3d358a50b15bbeb2acf75da88b3ac7eda75cb4274a5e159c5151f847bc88dcf1';
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
export function prepareRelease(packet,base){
 if(packet.count!==100||packet.records?.length!==100||base.length<7)fail('unexpected_release_size');
 const original=base.slice(0,7),existing=new Map(original.map(row=>[row.source_ref,row]));
 const catalog={schemaVersion:1,records:{},menus:{}};const additions=[];const identities=new Set(original.map(row=>row.source_ref));
 for(const source of packet.records){
  const nativeId=source.nativeRecordIds.sbiz,ref=source.source_ref;
  if(!/^MA[0-9A-Z]{18}$/.test(nativeId)||ref!=='data-go-kr-15083033-'+nativeId)fail('invalid_native_identity');
  const old=existing.get(ref);
  if(old){if(old.name!==source.displayName||old.address!==source.address||old.lat!==source.lat||old.lon!==source.lon||old.source_metadata.menus[0].name!==source.menus[0].name)fail('existing_record_changed');continue;}
  if(identities.has(ref))fail('duplicate_source_identity');identities.add(ref);
  const identity=source.identitySource,coordinate=source.coordinateSource,menu=source.menus[0];
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
  const publicMenu={name:menu.name,provenance};const menuKey=createHash('sha256').update(JSON.stringify(publicMenu)).digest('hex').slice(0,16);catalog.menus[menuKey]=publicMenu;
  const fieldProvenance={licenseScope:'identity-location-only',registration:null,identity:attribution(identity),coordinates:attribution(coordinate)};
  const id=sourceUuid(ref),slug='hot-incheon-'+nativeId.toLowerCase();
  const aliases=[...new Set([...(source.nativeRecordIds.sbizAliases||[]),...(source.nativeRecordIds.sbizAdditionalIds||[])])];
  // The append-only review addendum rejects inherited singleton floor boilerplate.
  // Keep the frozen raw rows, but never ship the known-incorrect free-text assessment.
  const deduplication=source.deduplication?Object.fromEntries(Object.entries(source.deduplication).filter(([key])=>key!=='unitFloorAssessment')):null;
  const aliasBindings=aliases.map(alias=>{if(!/^MA[0-9A-Z]{18}$/.test(alias))fail('invalid_alias_identity');const sourceRef='data-go-kr-15083033-'+alias;if(identities.has(sourceRef))fail('duplicate_alias_identity');identities.add(sourceRef);return{sourceRef,id:sourceUuid(sourceRef),menuId:sourceRef+':menu:1'};});
  catalog.records[ref]={id,slug,name:source.displayName,address:source.address,lat:source.lat,lon:source.lon,fieldProvenance,menuKey};
  additions.push({id,slug,name:source.displayName,address:source.address,lat:source.lat,lon:source.lon,source_ref:ref,source_metadata:{planet:'hot',sourceUrl:csvUrl,licenseName:'이용허락범위 제한 없음',sourceAsOf:identity.sourceAsOf,checkedAt:identity.checkedAt,nativeBusinessName:source.nativeBusinessName,nativeBranchName:source.nativeBranchName??null,displayNameBasis:source.displayNameBasis,sourceRecordId:nativeId,fieldProvenance,registrationLocator:null,identityLocator:identity,coordinateLocator:coordinate,aliasBindings,deduplication,duplicateSourceRows:source.duplicateSourceRows??null,sourcePremises:source.sourcePremises??null,rights:{factsStorage:true,publicDisplay:true,commercialUse:true,mediaCleared:false,scope:'identity-location-only'},factualUseReview:{batchId:packet.batchId,frozenFileSha256:freezeSha,oneMenuFact:source.fieldRights.oneMenuFact,releaseDecision:source.releaseDecision},menus:[{id:ref+':menu:1',name:menu.name,provenance}],reporting:{state:'pending'}}});
 }
 if(additions.length!==98||additions.filter(row=>row.source_metadata.menus[0].provenance.sourceScope==='brand_common').length!==93)fail('incorrect_candidate_composition');
 return{records:[...original,...additions],catalog};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const [path,sha]=process.argv.slice(2);if(!path||sha!==freezeSha)fail('exact_reviewed_freeze_sha_required');
 const bytes=readFileSync(path);if(createHash('sha256').update(bytes).digest('hex')!==freezeSha)fail('freeze_sha_mismatch');
 const dataDir=new URL('../data/',import.meta.url);const base=JSON.parse(readFileSync(new URL('hot-source-listings.json',dataDir),'utf8'));
 const result=prepareRelease(JSON.parse(bytes),base);
 writeFileSync(new URL('hot-source-listings.json',dataDir),JSON.stringify(result.records,null,2)+'\n');
 writeFileSync(new URL('hot-reviewed-source-registry.json',dataDir),JSON.stringify(result.catalog,null,2)+'\n');
 console.log(JSON.stringify({candidateOnly:true,records:result.records.length,added:98,reviewedMenuFacts:Object.keys(result.catalog.menus).length,freezeSha}));
}
