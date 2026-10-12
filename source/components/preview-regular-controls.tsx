'use client';

import {useId, useRef, useState} from 'react';
import CharacterArt from './activity/character-art';
import {RANKS} from '@/lib/activity/model';
import favoriteStyles from './regular-favorite.module.css';
import styles from './preview-regular-controls.module.css';

export type PreviewRegularControlsProps = {
 store: {id: string; name: string};
 saved: boolean;
 onToggle?: () => void;
};

/** Preview only: the parent owns the current fixture's ephemeral saved flag. */
export default function PreviewRegularControls({store, saved, onToggle}: PreviewRegularControlsProps) {
 const [listOpen, setListOpen] = useState(false);
 const panelId = useId();
 const managerButton = useRef<HTMLButtonElement>(null);
 const characterLabel = `${RANKS[0].name} · 캐릭터 미리보기`;

 function closeList() {
  setListOpen(false);
  managerButton.current?.focus();
 }

 return <section
  className={favoriteStyles.section}
  aria-label="단골 · 계정 미리보기"
  data-preview-regular-controls
  onKeyDown={event => {
   if (listOpen && event.key === 'Escape') {
    event.preventDefault();
    event.stopPropagation();
    closeList();
   }
  }}
 >
  <div className={favoriteStyles.actions}>
   <button type="button" className={favoriteStyles.save} aria-pressed={saved} disabled={!onToggle} onClick={onToggle}>
    {saved ? '♥ 단골등록됨 · 해제' : '♡ 단골등록'}
   </button>
   <button
    type="button"
    className={favoriteStyles.save}
    ref={managerButton}
    aria-expanded={listOpen}
    aria-controls={panelId}
    onClick={() => setListOpen(open => !open)}
   >내 단골리스트 관리</button>
  </div>
  <p className={styles.notice}>이 화면에서만 바뀌는 미리보기입니다. 실제 내 단골 목록에는 저장되지 않으며 새로고침하면 초기화됩니다.</p>
  {!onToggle && <p className={styles.notice}>이 화면에서는 단골등록 변경을 사용할 수 없어요.</p>}

  {listOpen && <section
   id={panelId}
   className={styles.listPanel}
   aria-label="내 단골리스트 미리보기"
  >
   <div className={styles.panelHeading}>
    <h3>내 단골리스트 · 미리보기</h3>
    <button type="button" className={styles.textButton} onClick={closeList}>닫기</button>
   </div>
   <p className={styles.notice}>현재 보고 있는 예시 매장만 관리할 수 있어요.</p>
   {saved ? <ul className={styles.list}>
    <li data-preview-store-id={store.id}>
     <strong>{store.name}</strong>
     <button type="button" className={favoriteStyles.save} disabled={!onToggle} onClick={onToggle} aria-label={`${store.name} 단골 해제`}>단골 해제</button>
    </li>
   </ul> : <p className={styles.empty} role="status">이 미리보기에서 등록한 단골 매장이 없어요.</p>}
  </section>}

  <section className={styles.account} aria-label="내 계정 미리보기">
   <figure className={styles.character}>
    <CharacterArt planet="hot" index={0} label={characterLabel} className={styles.avatar}/>
    <figcaption>{characterLabel}</figcaption>
   </figure>
   <div className={styles.accountCopy}>
    <h3>내 계정 · 미리보기</h3>
    <p>레벨·EXP는 로그인한 내 ID 기준으로 표시됩니다.</p>
    <dl className={styles.values}>
     <div><dt>레벨</dt><dd>로그인 후 확인</dd></div>
     <div><dt>EXP</dt><dd>로그인 후 확인</dd></div>
    </dl>
    <small>캐릭터는 예시 이미지이며 내 계정의 캐릭터·보유 등급을 나타내지 않습니다.</small>
   </div>
  </section>
 </section>;
}
