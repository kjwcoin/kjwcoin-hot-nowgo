/** Server-only evidence assembly. Never import this module into client components.
 * The public DTO is separately validated; raw CSV and rights reviews stay here.
 * District partitions preserve every frozen record and the exact reviewed ordering.
 */
import base from '../data/hot-source-listings.json' with {type:'json'};
import index from '../data/hot-source-seoul-following/index.json' with {type:'json'};
import district11110 from '../data/hot-source-seoul-following/11110.json' with {type:'json'};
import district11140 from '../data/hot-source-seoul-following/11140.json' with {type:'json'};
import district11170 from '../data/hot-source-seoul-following/11170.json' with {type:'json'};
import district11200 from '../data/hot-source-seoul-following/11200.json' with {type:'json'};
import district11215 from '../data/hot-source-seoul-following/11215.json' with {type:'json'};
import district11230 from '../data/hot-source-seoul-following/11230.json' with {type:'json'};
import district11260 from '../data/hot-source-seoul-following/11260.json' with {type:'json'};
import district11290 from '../data/hot-source-seoul-following/11290.json' with {type:'json'};
import district11305 from '../data/hot-source-seoul-following/11305.json' with {type:'json'};
import district11320 from '../data/hot-source-seoul-following/11320.json' with {type:'json'};
import district11350 from '../data/hot-source-seoul-following/11350.json' with {type:'json'};
import district11380 from '../data/hot-source-seoul-following/11380.json' with {type:'json'};
import district11410 from '../data/hot-source-seoul-following/11410.json' with {type:'json'};
import district11440 from '../data/hot-source-seoul-following/11440.json' with {type:'json'};
import district11470 from '../data/hot-source-seoul-following/11470.json' with {type:'json'};
import district11500 from '../data/hot-source-seoul-following/11500.json' with {type:'json'};
import district11530 from '../data/hot-source-seoul-following/11530.json' with {type:'json'};
import district11545 from '../data/hot-source-seoul-following/11545.json' with {type:'json'};
import district11560 from '../data/hot-source-seoul-following/11560.json' with {type:'json'};
import district11590 from '../data/hot-source-seoul-following/11590.json' with {type:'json'};
import district11620 from '../data/hot-source-seoul-following/11620.json' with {type:'json'};
import district11650 from '../data/hot-source-seoul-following/11650.json' with {type:'json'};
import district11680 from '../data/hot-source-seoul-following/11680.json' with {type:'json'};
import district11710 from '../data/hot-source-seoul-following/11710.json' with {type:'json'};
import district11740 from '../data/hot-source-seoul-following/11740.json' with {type:'json'};
export type ReadonlySourceRecord={id:string;slug:string;name:string;address:string;lat:number;lon:number;source_ref:string;source_metadata:{menus:{id:string;name:string}[];aliasBindings?:{sourceRef:string;id:string;menuId:string}[];[key:string]:unknown}};
const additions=[...district11110,...district11140,...district11170,...district11200,...district11215,...district11230,...district11260,...district11290,...district11305,...district11320,...district11350,...district11380,...district11410,...district11440,...district11470,...district11500,...district11530,...district11545,...district11560,...district11590,...district11620,...district11650,...district11680,...district11710,...district11740] as ReadonlySourceRecord[];
const byRef=new Map(additions.map(row=>[row.source_ref,row]));
if(base.length!==130||additions.length!==458||byRef.size!==458||index.total!==458||index.orderedSourceRefs.length!==458||new Set(index.orderedSourceRefs).size!==458)throw Error('invalid_source_district_partition');
const ordered=index.orderedSourceRefs.map(ref=>{const row=byRef.get(ref);if(!row)throw Error('missing_source_partition_record');return row});
const records:ReadonlySourceRecord[]=[...base,...ordered];
if(new Set(records.map(row=>row.id)).size!==records.length||new Set(records.map(row=>row.source_ref)).size!==records.length)throw Error('duplicate_source_partition_identity');
export default records;
