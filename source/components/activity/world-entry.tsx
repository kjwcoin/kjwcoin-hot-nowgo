'use client';
import type {CSSProperties} from 'react';
import {X,ArrowUpRight} from 'lucide-react';
import {Dialog,DialogContent,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import {WORLDS,RANKS,BADGES,growth,type Planet} from '@/lib/activity/model';
import CharacterArt from './character-art';
import SponsorEvent from './sponsor-event';
import type {ActivityState} from './activity-world';
import './world-entry.css';

export default function WorldEntry({planet,state,open,onClose,onActivity}:{planet:Planet;state:ActivityState;open:boolean;onClose:()=>void;onActivity:(tab?:string)=>void}){
 const w=WORLDS[planet],d=state.data,g=growth(d?.xp||0);
 return <Dialog open={open} onOpenChange={value=>{if(!value)onClose()}}><DialogContent className="we-dialog activity-world" showCloseButton={false} style={{'--planet':w.accent} as CSSProperties} onCloseAutoFocus={event=>event.preventDefault()}>
  <div className="we-top"><img src="/activity/nowgo-white.png" width="112" height="38" alt="나우고"/><span>{w.name}의 세계</span><button onClick={onClose} aria-label="세계관 팝업 닫고 지도 이용하기">닫고 지도 이용하기<X size={23}/></button></div>
  <div className="we-content">
   <section className="we-hero"><div><span className="aw-eyebrow">내 취향이 나의 전적이 되는 곳</span><DialogTitle className="we-title">{w.motto}</DialogTitle><DialogDescription className="we-description">{w.story}</DialogDescription><div className="aw-actions"><button className="aw-button" onClick={onClose}>탐험하기<ArrowUpRight size={17}/></button><a className="we-ghost" href="/suggestion#report">제안하기</a></div></div><img className="we-planet" src={`/activity/planet-${planet}.webp`} alt={`${w.name} 2D 행성`}/></section>
   <SponsorEvent planet={planet}/>
   <section className="aw-panel"><h2>맛에서 신뢰로</h2><p>{w.challenge}</p><div className="we-columns"><article><h3>내 한 입의 기준</h3><p>맛과 식감은 따로 기록해요. 같은 맛 점수라면 식감을 함께 살펴, 나에게 맞는 한 접시를 찾아요.</p></article><article><h3>지금 갈 수 있는 곳</h3><p>점주의 상태 확인과 현장의 제보를 모아요. 내가 남긴 정확한 정보가 다음 탐험가의 헛걸음을 줄여요.</p></article></div><p className="aw-help">쫀득함에서 바삭함, 딱딱함까지. 이용자와 상점의 아이디어로 새로운 느낌을 함께 발견해요.</p></section>
   <section className="aw-panel"><h2>내 활동이 나의 왕국</h2><p>캐릭터·스탯·레벨·EXP·훈장·내 영토·방문 로그와 사진첩을 오른쪽 위 내 활동에 모아요.</p><div className="we-player"><CharacterArt planet={planet} index={g.character} label={`${w.name}의 ${g.rank.name}`}/><div><span className="aw-eyebrow">{d?.profile.nickname||'새 탐험가의 첫 모험'}</span><h3>레벨 {g.level} · {g.rank.name}</h3><strong className="we-xp">{(d?.xp||0).toLocaleString()} EXP</strong><p>{d?'나의 실제 활동 기록이에요.':'로그인하면 레벨 1 · EXP 0 · 스탯 0부터 시작해요.'}</p><button className="aw-button" onClick={()=>onActivity('info')}>내 활동 펼쳐보기<ArrowUpRight size={17}/></button></div></div><div className="we-columns we-three"><article><h3>스탯</h3><p>탐험·기록·발견·꾸준함. 어떤 활동을 했는지 보여주는 기록이에요.</p></article><article><h3>경험치 · EXP</h3><p>공개 제보와 인증한 방문, 사진, 채택된 상태 제보로 쌓아요.</p></article><article><h3>레벨</h3><p>누적 경험치로 도달한 성장 단계예요. 한 접시씩 나의 왕좌로 올라요.</p></article></div></section>
   <section className="aw-panel"><h2>한 입씩, 나의 왕좌로</h2><p>행성의 대표 메뉴를 든 2등신 캐릭터. 탐험가의 옷차림이 활동과 함께 다섯 모습으로 풍성해져요.</p><div className="aw-ranks we-ranks">{RANKS.map((r,i)=><article key={r.name} className={g.level>=r.level?'unlocked':''}><CharacterArt planet={planet} index={i} label={`${w.name} ${r.name} 캐릭터`}/><h3>{r.name}</h3><p>레벨 {r.level}</p><small>{r.xp.toLocaleString()} EXP</small></article>)}</div><p className="aw-help">여섯 등급을 오르며 다섯 가지 옷차림을 만나고, 마지막 모습은 왕 등급에서 열려요.</p></section>
   <section className="aw-panel"><h2>오늘의 퀘스트</h2><p>확인된 활동마다 경험치가 쌓여요. 퀘스트의 오늘 첫 완료에는 각 +10 EXP를 더해요.</p><div className="we-columns we-three">{[['한 접시 제보','공개 제보 +30 EXP'],['오늘의 발자국','GPS·결제 인증 +40 EXP'],['상태 바로잡기','상태 제보 채택 +15 EXP']].map(([title,body])=><article key={title}><h3>{title}</h3><p>{body}</p></article>)}</div><p className="aw-help">인증 방문의 첫 사진 +20 EXP · 활동 종류별 하루 3회 · 같은 기록은 중복 보상하지 않아요.</p></section>
   <section className="aw-panel"><h2>내 영토를 펼쳐봐</h2><p>인증한 발걸음이 내가 정복한 장소가 돼요. 우리 동네에서 해외까지, 이 행성의 기록으로 넓혀가요.</p><div className="we-columns we-three">{['지역','국가','세계'].map((name,i)=><button className="we-territory" key={name} onClick={()=>onActivity('territory')}><span>0{i+1}</span><strong>{name}</strong><small>{['우리 동네의 한 접시','전국에 남긴 발자국','국경 밖으로 이어진 기록'][i]}</small></button>)}</div><p className="aw-help">방문 로그와 사진첩에는 이 행성의 기록만 남아요. 내 카드·방문 기록·사진을 직접 골라 공유해요.</p></section>
   <section className="aw-panel"><h2>나의 훈장</h2><p>조건을 채우면 자동으로 찾아와요. 획득한 휘장은 내 활동에 간직하고 대표 훈장으로 달 수 있어요.</p><div className="aw-badges">{BADGES.map(b=><article key={b.id} className={d?.awards.some(a=>a.badge_id===b.id)?'owned':''}><img src={`/activity/${b.image}.svg`} alt={b.name+' 휘장'} loading="lazy"/><h3>{b.name}</h3><p>{b.rule}</p></article>)}</div><p className="aw-help">새 훈장과 검토 안내는 내 활동의 소식에서 확인해요. 푸시는 기기에서 허용한 경우 받을 수 있어요.</p></section>
   <section className="aw-panel aw-limited"><span className="aw-limited-banner">LIMITED EDITION</span><strong className="aw-only">ONLY AT THAT MOMENT</strong><h2>그 순간의 휘장</h2><p>이벤트·프로모션·콜라보 때만 얻을 수 있는 휘장. 기간이 지나도 나의 소장함에 남아요.</p>{d?.campaigns.length?d.campaigns.map(c=><article key={c.id}><h3>{c.title}</h3><p>{c.brand}</p></article>):<p className="aw-help">현재 진행 중인 한정판 휘장 이벤트가 없어요.</p>}</section>
   <section className="we-final"><h2>오늘도, 내 취향대로</h2><p>세계관을 닫고 지도에서 다음 한 접시를 찾아요.</p><div className="aw-actions"><button className="aw-button" onClick={onClose}>탐험하기<ArrowUpRight size={17}/></button><a className="we-ghost" href="/suggestion#report">제안하기</a></div></section>
  </div>
 </DialogContent></Dialog>;
}
