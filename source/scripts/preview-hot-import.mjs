import {readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {previewHotImport} from '../lib/hot-import-preview.ts';
const [input,output]=process.argv.slice(2);
if(!input||!output){console.error('Usage: node --experimental-strip-types scripts/preview-hot-import.mjs INPUT.json OUTPUT.json');process.exitCode=1}
else if(resolve(input)===resolve(output)){console.error('Input and review output must be different files.');process.exitCode=1}
else{
 const result=previewHotImport(JSON.parse(await readFile(input,'utf8')));
 await writeFile(output,JSON.stringify(result,null,2)+'\n',{flag:'wx'});
 console.log(JSON.stringify({mode:result.mode,inputRecords:result.inputRecords,uniqueVenues:result.uniqueVenues,evidenceRecords:result.evidenceRecords,readyForReview:result.readyForReview,needsCoordinates:result.needsCoordinates,rejected:result.rejected.length,imported:0,published:0}));
}
