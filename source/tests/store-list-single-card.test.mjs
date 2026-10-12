import test from 'node:test';
import assert from 'node:assert/strict';
import {renderToStaticMarkup} from 'react-dom/server';
import {mapStoreGroups} from '../lib/map-sourced-stores.ts';
import {sourcePreviewStore} from '../lib/source-store-preview.ts';
import {sourceUi,elements,textOf,hookHarness} from './helpers/source-ui-components.mjs';

const report={id:'report-a',placeId:'reported-a',shop:'진짜 식당',area:'서울특별시 중구 길 12',name:'매운 닭발',price:12000,heat:2,flavor:'칼칼한',category:'닭발',image:'/report-a.jpg',lat:37.56,lng:126.97,isDemo:false,description:'첫 번째 회원 제보',verifiedOwner:false,ownerRegistered:false};
const second={...report,id:'report-b',placeId:'reported-b',name:'다른 회원의 닭발',heat:5,flavor:'얼얼한',description:'두 번째 회원 제보'};
const globals={process:{env:{}}};
function explorer({menus=[report,second],stores=[],variant='hot'}={}){
 const harness=hookHarness(),ui=sourceUi({react:harness.react,menus,stores,globals});
 const render=()=>harness.render(()=>ui.Explorer({variant}));
 return {ui,render};
}
const list=tree=>elements(tree).find(node=>node.props?.className==='explorer-menu-list');
const legacyRows=tree=>elements(list(tree)).filter(node=>node.type==='button'&&node.props['data-menu-id']);
const storeCards=tree=>elements(list(tree)).filter(node=>node.type==='article');
const mapNode=(tree,ui)=>elements(tree).find(node=>node.type===ui.Map);

test('repeated HOT reports produce one visible representative card and retain every original report',()=>{
 const menus=Object.freeze([Object.freeze({...report}),Object.freeze({...second}),Object.freeze({...second,id:'report-c',heat:4})]);
 const original=JSON.stringify(menus),{render,ui}=explorer({menus});
 const tree=render(),rows=legacyRows(tree),groups=mapStoreGroups(menus,[]);
 assert.equal(storeCards(tree).length,1);assert.equal(rows.length,1);assert.equal(rows[0].props['data-menu-id'],report.id);
 assert.equal(groups.length,1);assert.equal(groups[0].catalog.menus.length,3);assert.equal(groups[0].catalog.reportCount,3);
 assert.deepEqual(mapNode(tree,ui).props.menus.map(menu=>menu.id),menus.map(menu=>menu.id));
 for(let i=0;i<menus.length;i++){assert.strictEqual(groups[0].catalog.menus[i],menus[i]);assert.strictEqual(mapNode(tree,ui).props.menus[i],menus[i]);}
 assert.equal(JSON.stringify(menus),original);
 assert.match(textOf(tree),/불러온 매장 1/);
 const html=renderToStaticMarkup(rows[0]);assert.match(html,/width="84" height="84"/);assert.match(html,/explorer-item-copy/);
});

test('same-name branches at different addresses and unknown addresses remain separate',()=>{
 const menus=[report,{...second,area:'부산광역시 중구 길 12'},{...report,id:'unknown-a',placeId:'reported-unknown-a',area:''},{...report,id:'unknown-b',placeId:'reported-unknown-b',area:''}];
 const tree=explorer({menus}).render();
 assert.equal(storeCards(tree).length,4);assert.equal(legacyRows(tree).length,4);
 assert.deepEqual(legacyRows(tree).map(row=>row.props['data-menu-id']),menus.map(menu=>menu.id));
});

test('a primary public source and matching legacy reports have only the source card in the list',()=>{
 const source=sourcePreviewStore(),menus=[{...report,shop:source.name,area:source.address},{...second,shop:source.name,area:source.address}];
 const {render,ui}=explorer({menus,stores:[source]}),tree=render();
 const cards=elements(list(tree)).filter(node=>node.type===ui.Card);
 assert.equal(storeCards(tree).length,1);assert.equal(cards.length,1);assert.equal(legacyRows(tree).length,0);
 assert.strictEqual(cards[0].props.store,source);assert.equal(cards[0].props.showHeading,false);
 assert.equal(mapNode(tree,ui).props.menus.length,2);assert.strictEqual(mapNode(tree,ui).props.sourcedStores[0],source);
 const groups=mapStoreGroups(menus,[source]);assert.equal(groups.length,1);assert.equal(groups[0].catalog.menus.length,2);
 cards[0].props.onSelect(source,source.menus[0].id);
 let nodes=elements(render());assert.strictEqual(nodes.find(node=>node.type===ui.Detail).props.store,source);
 nodes.find(node=>node.type===ui.Detail).props.onBack();nodes=elements(render());
 assert.equal(nodes.filter(node=>node.type===ui.Card).length,1);
});

test('verified owner preference still supplies one existing card without losing consumer reports',()=>{
 const source=sourcePreviewStore(),owner={...report,id:'owner-menu',placeId:'nowgo-'+source.id,ownerStoreId:source.id,shop:source.name,area:source.address,verifiedOwner:true,ownerRegistered:true};
 const menus=[{...report,shop:source.name,area:source.address},owner,{...second,shop:source.name,area:source.address}];
 const {render,ui}=explorer({menus,stores:[source]}),tree=render();
 assert.equal(storeCards(tree).length,1);assert.equal(legacyRows(tree).length,1);assert.equal(legacyRows(tree)[0].props['data-menu-id'],owner.id);
 assert.equal(elements(list(tree)).filter(node=>node.type===ui.Card).length,0);assert.match(textOf(legacyRows(tree)[0]),/\[공식 점주\]/);
 assert.equal(mapNode(tree,ui).props.menus.length,3);
});

test('source-only entries remain one per stable source ID while different branches stay separate',()=>{
 const source=sourcePreviewStore(),branch={...source,id:'source-other-branch',slug:'source-other-branch',address:'서울특별시 중구 다른 길 99'};
 const {render,ui}=explorer({menus:[],stores:[source,source,branch]}),tree=render();
 const cards=elements(list(tree)).filter(node=>node.type===ui.Card);
 assert.equal(storeCards(tree).length,2);assert.equal(cards.length,2);assert.equal(legacyRows(tree).length,0);
 assert.deepEqual(cards.map(card=>card.props.store.id),[source.id,branch.id]);
 // Distinct source-menu rows and their selection contract are deliberately unchanged.
 const multiple={...source,menus:[source.menus[0],{...source.menus[0],id:'source-other-menu',name:'다른 공공자료 메뉴'}]};
 const multi=explorer({menus:[],stores:[multiple]}),multiTree=multi.render();
 assert.equal(storeCards(multiTree).length,1);
 assert.equal(elements(list(multiTree)).find(node=>node.type===multi.ui.Card).props.store.menus.length,2);
});

test('report quantity never changes the representative heat or flavor or claims an aggregate',()=>{
 for(const reportCount of [2,30,3000]){
  const menus=[{...report,reportCount},{...second,reportCount},{...second,id:'report-c',heat:5,reportCount}];
  const {render,ui}=explorer({menus}),tree=render(),row=legacyRows(tree)[0];
  assert.equal(legacyRows(tree).length,1);assert.equal(row.props['data-menu-id'],report.id);
  assert.match(textOf(row),/칼칼한 · 2/);assert.doesNotMatch(textOf(row),/얼얼한|중앙값 [0-9]|참여 고객 [0-9]+명|대표 맵기/);
  assert.match(textOf(row),/개별 제보 맵기 · 메뉴별 중앙값 미집계/);
  assert.match(textOf(row),/개별 제보 결 · 다수결 미집계/);
  assert.deepEqual(mapNode(tree,ui).props.menus.map(menu=>menu.heat),[2,5,5]);
 }
});

test('a hidden original report can still open through map selection and Back returns to one card',()=>{
 const {render,ui}=explorer();let tree=render();
 mapNode(tree,ui).props.onSelect(second);mapNode(tree,ui).props.onSelect(second);tree=render();
 assert.equal(list(tree),undefined);assert.equal(mapNode(tree,ui).props.selectedId,second.id);
 assert.equal(textOf(elements(tree).find(node=>node.type==='h1')),second.name);assert.match(textOf(tree),/두 번째 회원 제보/);
 elements(tree).find(node=>node.props?.className==='explorer-back').props.onClick();tree=render();
 assert.equal(mapNode(tree,ui).props.selectedId,undefined);assert.equal(legacyRows(tree).length,1);
 legacyRows(tree)[0].props.onClick();tree=render();assert.equal(mapNode(tree,ui).props.selectedId,report.id);
 assert.equal(textOf(elements(tree).find(node=>node.type==='h1')),report.name);
});

test('filtering still chooses a real matching report without deleting other catalog records',()=>{
 const {render,ui}=explorer();let tree=render();
 elements(tree).find(node=>node.props?.['aria-label']==='매운맛 단계').props.onChange({target:{value:'5'}});tree=render();
 assert.equal(legacyRows(tree).length,1);assert.equal(legacyRows(tree)[0].props['data-menu-id'],second.id);
 assert.equal(mapNode(tree,ui).props.menus.length,1);assert.strictEqual(mapNode(tree,ui).props.menus[0],second);
 elements(tree).find(node=>node.props?.['aria-label']==='매운맛 단계').props.onChange({target:{value:'0'}});tree=render();
 assert.equal(legacyRows(tree)[0].props['data-menu-id'],report.id);assert.equal(mapNode(tree,ui).props.menus.length,2);
});

test('SWEET and RICH retain their existing multiple-menu list behavior',()=>{
 for(const variant of ['sweet','rich']){
  const tree=explorer({variant}).render();assert.equal(storeCards(tree).length,1);assert.equal(legacyRows(tree).length,2);
 }
});
