'use client';
import {useEffect,useState} from 'react';
import {Download,Share2} from 'lucide-react';
import {Dialog,DialogContent,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import {WORLDS,growth,type ActivitySnapshot} from '@/lib/activity/model';

async function profileImage(d:ActivitySnapshot){
 const w=WORLDS[d.planet],g=growth(d.xp),canvas=document.createElement('canvas');
 canvas.width=1080;canvas.height=1350;
 const c=canvas.getContext('2d');if(!c)throw new Error('이미지 카드를 만들 수 없어요.');
 const load=async(name:string)=>{const img=new Image();img.src='/activity/'+name;await img.decode();return img};
 const badge=d.awards.find(a=>a.badge_id===d.profile.equipped_badge)||d.awards[0];
 const artFlavor=document.body.dataset.theme==='rich'?'rich':d.planet;
 const growthArt=artFlavor==='hot'||artFlavor==='sweet'||artFlavor==='rich';
 const [character,logo,planet,crest]=await Promise.all([load(growthArt?'characters-growth.webp':`characters-${d.planet}.webp`),load('nowgo-white.png'),load(`planet-${d.planet}.webp`),badge?load(badge.image+'.svg'):Promise.resolve(null),document.fonts.ready]);
 const box=(x:number,y:number,width:number,height:number,radius:number,color:string)=>{c.fillStyle=color;c.beginPath();c.roundRect(x,y,width,height,radius);c.fill()};
 const text=(value:string,x:number,y:number,size:number,color='#fff0d4',width=920)=>{c.fillStyle=color;let s=size;do{c.font=`700 ${s}px Pretendard, sans-serif`;if(c.measureText(value).width<=width)break;s--}while(s>14);c.fillText(value,x,y)};
 c.fillStyle='#0c142f';c.fillRect(0,0,1080,1350);
 c.strokeStyle=w.accent;c.lineWidth=2;c.strokeRect(28,28,1024,1294);
 c.globalAlpha=.27;c.drawImage(planet,580,115,440,440);c.globalAlpha=1;
 c.drawImage(logo,65,55,190,66);text('나의 취향, 나의 전적',702,99,22,w.accent,312);
 text('나는, '+w.name+'.',65,208,72);text(d.profile.nickname,68,267,35,w.accent,700);
 box(65,296,340,60,14,'#24304d');text(`레벨 ${g.level} · ${g.rank.name}`,86,335,29,'#fff0d4',302);
 const index=Math.max(0,Math.min(5,g.character));
 const columns=growthArt?5:3,rows=growthArt?3:2,cw=character.naturalWidth/columns,ch=character.naturalHeight/rows;
 const column=growthArt?[0,1,2,3,3,4][index]:index%3,row=growthArt?(artFlavor==='sweet'?1:artFlavor==='rich'?2:0):Math.floor(index/3);
 c.drawImage(character,column*cw,row*ch,cw,ch,47,363,665,665);
 box(743,501,267,349,20,'#192640');text('나의 대표 휘장',776,546,24,w.accent,200);
 if(crest&&badge){c.drawImage(crest,788,565,177,207);text(badge.title,766,804,24,'#fff0d4',219);if(badge.limited)text('LIMITED EDITION',777,832,17,'#ff655d',204)}
 else {text('첫 훈장을 향해',777,673,26,'#fff0d4',200);text('나의 모험은 지금부터',766,716,18,'#bbc6dc',222)}
 box(65,965,950,172,20,'#fff0d4');
 [[String(d.counts.places)+'곳','정복한 매장'],[String(d.counts.countries)+'개국','나의 영토'],[String(d.awards.length)+'개','보유 훈장']].forEach(([value,label],i)=>{const x=99+i*311;text(value,x,1037,43,'#14213f',270);text(label,x,1090,23,'#576078',270)});
 text(d.xp.toLocaleString()+' EXP',67,1202,41,w.accent,910);
 text(`탐험 ${d.stats.explore}  ·  기록 ${d.stats.record}  ·  발견 ${d.stats.discover}  ·  꾸준함 ${d.stats.steady}`,68,1252,24,'#bbc6dc',940);
 text(w.motto+'  #NOWGO',68,1293,22,'#fff0d4',940);
 const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(value=>value?resolve(value):reject(new Error('카드 이미지 저장에 실패했어요.')),'image/png'));
 return new File([blob],`NOWGO_${w.name}_나의카드.png`,{type:'image/png'});
}

export default function ShareCard({data,open,onClose,onLink}:{data:ActivitySnapshot;open:boolean;onClose:()=>void;onLink:()=>Promise<void>}){
 const [card,setCard]=useState<{file:File;url:string}|null>(null),[error,setError]=useState(''),[message,setMessage]=useState(''),[sharing,setSharing]=useState(false);
 useEffect(()=>{if(!open)return;let alive=true,url='';setCard(null);setError('');setMessage('');void profileImage(data).then(file=>{if(!alive)return;url=URL.createObjectURL(file);setCard({file,url})}).catch(e=>{if(alive)setError((e as Error).message)});return()=>{alive=false;if(url)URL.revokeObjectURL(url)}},[open,data]);
 function download(){if(!card)return;const a=document.createElement('a');a.href=card.url;a.download=card.file.name;a.click();setMessage('PNG 카드를 저장했어요. 원하는 곳에 이미지로 첨부해 주세요.')}
 async function share(){if(!card)return;setSharing(true);try{if(navigator.canShare?.({files:[card.file]})){await navigator.share({files:[card.file],title:WORLDS[data.planet].name+' · 나의 전적'});setMessage('이미지 카드를 공유했어요.')}else download()}catch(e){if((e as Error).name!=='AbortError')setMessage('이 환경에서는 직접 공유할 수 없어요. PNG 저장을 눌러 첨부해 주세요.')}finally{setSharing(false)}}
 return <Dialog open={open} onOpenChange={value=>!value&&onClose()}><DialogContent className="aw-share-dialog activity-world"><DialogTitle>나를 말하는 한 장</DialogTitle><DialogDescription>캐릭터와 지금의 전적을 이미지로 공유해요.</DialogDescription>{error?<p role="alert">{error}</p>:card?<img className="aw-card-preview" src={card.url} alt="캐릭터, 레벨, 경험치, 영토와 훈장을 담은 나의 공유 카드"/>:<p role="status">나의 카드 이미지를 만들고 있어요.</p>}<div className="aw-actions"><button className="aw-button" disabled={!card||sharing} onClick={()=>void share()}><Share2 size={17}/>이미지로 공유</button><button className="aw-button" disabled={!card} onClick={download}><Download size={17}/>PNG 저장</button><button disabled={sharing} onClick={()=>void onLink().catch(e=>setMessage((e as Error).message))}>프로필 링크 복사</button></div><p className="aw-help">이미지 공유를 지원하지 않는 브라우저에서는 PNG로 저장해요.</p>{message&&<p role="status">{message}</p>}</DialogContent></Dialog>;
}
