import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import React from 'react';
import * as runtime from 'react/jsx-runtime';
import * as icons from 'lucide-react';
import * as sourced from '../../lib/sourced-store.ts';
import * as groups from '../../lib/map-sourced-stores.ts';
import * as nearby from '../../lib/nearby-demo.ts';
import * as catalog from '../../lib/map-menu-catalog.ts';
import * as heat from '../../lib/hot-menu-heat.ts';
import * as heatClient from '../../lib/menu-heat-client.ts';
import * as reportingPhase from '../../lib/hot-reporting-phase.ts';
import * as previewHeat from '../../lib/preview-menu-heat.ts';

export function moduleAt(path,dependencies,globals={}){
 const exports={};
 vm.runInNewContext(ts.transpileModule(fs.readFileSync(new URL('../../'+path,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText,{exports,URLSearchParams,require:name=>{assert.ok(name in dependencies,name);return dependencies[name]},...globals});
 return exports;
}
const wrapped=defaultExport=>({default:defaultExport});
export function sourceUi({react=React,stores,menus=[],sourceState,globals={}}={}){
 const live=name=>function LiveFixture(){return React.createElement('span',{'data-live-component':name},name)};
 const Button=properties=>{const props={...properties};delete props.variant;delete props.size;return React.createElement('button',props)};
 const css=new Proxy({},{get:(_,name)=>'legacy-'+String(name)});
 const base={'react/jsx-runtime':runtime,react,'lucide-react':icons,'@/lib/sourced-store':sourced,'@/components/ui/button':{Button},'./sourced-store-minihome.css':{},'./regular-favorite.module.css':{default:css},'./owner-join-request.module.css':{default:css}};
 const Photo=moduleAt('components/sourced-store-photo.tsx',base).default;
 const Actions=moduleAt('components/source-preview-actions.tsx',base).default;
 const Heat=moduleAt('components/consumer-menu-heat.tsx',{...base,'@/lib/hot-menu-heat':heat,'@/lib/menu-heat-client':heatClient,'@/lib/hot-reporting-phase':reportingPhase});
 const PreviewHeat=moduleAt('components/preview-menu-heat.tsx',{...base,'@/components/consumer-menu-heat':Heat}).default;
 const PreviewInformation=moduleAt('components/preview-store-information.tsx',base).default;
 const PreviewPhotoModule=moduleAt('components/preview-photo-report.tsx',{...base,'./preview-photo-report.module.css':{default:css}});
 const PreviewPhoto=PreviewPhotoModule.default;
 const CharacterArt=moduleAt('components/activity/character-art.tsx',base).default;
 const activityModel=moduleAt('lib/activity/model.ts',{});
 const PreviewRegular=moduleAt('components/preview-regular-controls.tsx',{...base,'./activity/character-art':wrapped(CharacterArt),'@/lib/activity/model':activityModel,'./preview-regular-controls.module.css':{default:css}}).default;
 const deps={...base,'@/lib/preview-menu-heat':previewHeat,'@/components/sourced-store-photo':wrapped(Photo),'@/components/source-preview-actions':wrapped(Actions),'@/components/preview-menu-heat':wrapped(PreviewHeat),'@/components/preview-store-information':wrapped(PreviewInformation),'@/components/preview-photo-report':PreviewPhotoModule,'@/components/preview-regular-controls':wrapped(PreviewRegular),'@/components/consumer-menu-heat':Heat,'@/components/regular-favorite':wrapped(live('favorite')),'@/components/store-owner-join-request':wrapped(live('owner-request')),'@/lib/store-discovery':{sourceFactsNotice:store=>`${store.source.asOf?'자료 기준일 '+store.source.asOf:'자료 기준일 미제공'} · 출처 확인일 ${store.source.checkedAt.slice(0,10)}. 가격·맵기·사진·현재 영업 및 메뉴 판매 여부는 확인되지 않았습니다.`}};
 const Card=moduleAt('components/sourced-store-card.tsx',deps).default;
 const Detail=moduleAt('components/sourced-store-detail.tsx',deps).default;
 const Notice=moduleAt('components/sourced-store-notice.tsx',deps).default;
 const Map=()=>React.createElement('div',{'data-map-shell':true});
 const mapDeps={...deps,'@/lib/menu-heat-attribution':{menuHeatAttribution:()=> '개별 제보 맵기 · 메뉴별 중앙값 미집계'},'@/lib/map-sourced-stores':groups,'@/components/owner-join-request':wrapped(live('legacy-owner-request')),'@/components/store-status':wrapped(live('status')),'@/hooks/use-sourced-stores':{useSourcedStores:(_variant,previewFeed,initialFeed)=>sourceState?{...sourceState,refresh:()=>{}}:({status:previewFeed||stores||initialFeed?'ready':'loading',feed:previewFeed||(stores?{stores,complete:true,asOf:'2026-10-12T00:00:00Z'}:initialFeed||null),refresh:()=>{}})},'@/components/sourced-store-card':wrapped(Card),'@/components/sourced-store-detail':wrapped(Detail),'@/components/sourced-store-notice':wrapped(Notice),'@/components/booking-actions':wrapped(live('booking')),'@/components/brand':wrapped(()=>React.createElement('span',{},'NOWGO')),'@/components/ui/input':{Input:props=>React.createElement('input',props)},'@/components/ui/native-select':{NativeSelect:props=>React.createElement('select',props)},'./customer-panel':wrapped(live('customer')),'./reporter-leaderboard':wrapped(live('leaderboard')),'./map-chat':wrapped(live('chat')),'./activity/visit-actions':wrapped(live('visit')),'./kakao-map':wrapped(Map),'@/lib/request-current-location':{locationStatusText:{}},'./first-login-tour':wrapped(live('tour')),'@/lib/map-menu-catalog':catalog,'@/lib/nearby-demo':nearby,'@/lib/menus':{money:value=>value+'원'},'@/lib/site-config':{siteConfig:()=>({name:'HOT',menus,heat:['1','2','3','4','5'],flavors:['전체'],categories:[],search:'메뉴 검색'})},'@/lib/client':{api:()=>{throw Error('Unexpected live API')},track:()=>{}}};
 const Explorer=moduleAt('components/map-explorer.tsx',mapDeps,globals).default;
 const Mini=moduleAt('components/sourced-store-minihome.tsx',{...base,'@/components/map-explorer':wrapped(Explorer)}).default;
 return {Card,Detail,Notice,Actions,Photo,PreviewHeat,PreviewInformation,PreviewPhoto,PreviewRegular,Explorer,Mini,Map};
}
export function elements(node){if(!node||typeof node!=='object')return [];if(Array.isArray(node))return node.flatMap(elements);return [node,...elements(node.props?.children)];}
export function textOf(node){if(node==null||typeof node==='boolean')return '';if(typeof node==='string'||typeof node==='number')return String(node);if(Array.isArray(node))return node.map(textOf).join('');return textOf(node.props?.children);}
export function hookHarness(){
 const cells=[];let cursor=0;const effects=[];
 return {react:{...React,useState(initial){const index=cursor++;if(!(index in cells))cells[index]=typeof initial==='function'?initial():initial;return [cells[index],value=>{cells[index]=typeof value==='function'?value(cells[index]):value}]},useRef(initial){const index=cursor++;if(!(index in cells))cells[index]={current:initial};return cells[index]},useMemo:fn=>fn(),useCallback:fn=>fn,useEffect:fn=>{effects.push(fn)}},render(fn){cursor=0;effects.length=0;return fn()},flushEffects(){for(const effect of effects)effect()}};
}
