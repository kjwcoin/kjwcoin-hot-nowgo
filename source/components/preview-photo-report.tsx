'use client';

import {useId, useRef, useState, type FormEvent} from 'react';
import styles from './preview-photo-report.module.css';

type Menu = {id: string; name: string};
export type PreviewPhotoReportProps = {
  store: {menus: readonly Menu[]};
  selectedMenuId?: string | null;
  onPreviewPhoto?: (menuId: string, file: File, nickname: string) => void;
  onReset?: () => void;
};
type ValidationError = {field: 'menu' | 'file' | 'nickname' | 'form'; message: string};
type PhotoInput = {menuId: string; file: File | null; nickname: string};
type ValidationResult =
  | {ok: true; menuId: string; file: File; nickname: string}
  | {ok: false; error: ValidationError};

export const PREVIEW_PHOTO_MAX_BYTES = 5 * 1024 * 1024;
const PHOTO_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

/** Browser-only input validation; no publication, identity verification, or persistence. */
export function validatePreviewPhoto(menus: readonly Menu[], input: PhotoInput): ValidationResult {
  if (!menus.some(menu => menu.id === input.menuId)) {
    return {ok: false, error: {field: 'menu', message: '이 매장에 등록된 메뉴를 선택해 주세요.'}};
  }
  if (!input.file) {
    return {ok: false, error: {field: 'file', message: '미리 볼 사진을 선택해 주세요.'}};
  }
  if (!PHOTO_TYPES.has(input.file.type)) {
    return {ok: false, error: {field: 'file', message: 'JPEG, PNG, WebP 사진만 선택할 수 있어요.'}};
  }
  if (input.file.size <= 0 || input.file.size > PREVIEW_PHOTO_MAX_BYTES) {
    return {ok: false, error: {field: 'file', message: '내용이 있는 5 MiB 이하의 사진을 선택해 주세요.'}};
  }
  const nickname = input.nickname.trim();
  if (!nickname || Array.from(nickname).length > 20) {
    return {ok: false, error: {field: 'nickname', message: '공개 닉네임을 1~20자로 입력해 주세요.'}};
  }
  const isEmail = /^[^\s@]+@[^\s@]+$/.test(nickname);
  const phone = nickname.replace(/^tel:\s*/i, '');
  const isPhone = /^[+\d(][\d\s().+-]*$/.test(phone) && phone.replace(/\D/g, '').length >= 7;
  if (isEmail || isPhone) {
    return {ok: false, error: {field: 'nickname', message: '이메일이나 전화번호 대신 공개할 닉네임을 입력해 주세요.'}};
  }
  return {ok: true, menuId: input.menuId, file: input.file, nickname};
}

/** Parent owns object URLs and must revoke them on replacement, reset, and unmount. */
export default function PreviewPhotoReport({store, selectedMenuId, onPreviewPhoto, onReset}: PreviewPhotoReportProps) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [menuId, setMenuId] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [nickname, setNickname] = useState('');
  const [error, setError] = useState<ValidationError | null>(null);
  const [status, setStatus] = useState('');
  const submitted = useRef(false);

  function closeForm() {
    submitted.current = true;
    setOpen(false);
    setFile(null);
    setNickname('');
    setError(null);
  }

  function openForm() {
    if (!onPreviewPhoto || !store.menus.length) return;
    setMenuId(store.menus.some(menu => menu.id === selectedMenuId) ? selectedMenuId! : '');
    setFile(null);
    setNickname('');
    setError(null);
    setStatus('');
    submitted.current = false;
    setOpen(true);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitted.current || !open || !onPreviewPhoto) return;
    const result = validatePreviewPhoto(store.menus, {menuId, file, nickname});
    if (!result.ok) {
      setError(result.error);
      return;
    }
    // A synchronous guard also blocks two submissions before React re-renders.
    submitted.current = true;
    try {
      onPreviewPhoto(result.menuId, result.file, result.nickname);
      closeForm();
      setStatus('이 브라우저의 사진 미리보기에만 반영했어요. 저장하거나 게시하지 않았어요.');
    } catch {
      submitted.current = false;
      setError({field: 'form', message: '사진 미리보기를 만들지 못했어요. 다른 사진으로 다시 시도해 주세요.'});
    }
  }

  function reset() {
    onReset?.();
    closeForm();
    setStatus('사진 미리보기를 초기화했어요.');
  }

  return <section className={`preview-photo-report ${styles.root}`} aria-label="사진 제보 로컬 미리보기" data-local-photo-preview>
    <div className="preview-photo-report__actions">
      <button type="button" className="preview-photo-report__trigger" aria-expanded={open} aria-controls={`${id}-form`} onClick={open ? closeForm : openForm} disabled={!store.menus.length || !onPreviewPhoto}>
        {open ? '사진 제보 닫기' : '사진 제보'}
      </button>
      {onReset && <button type="button" className="preview-photo-report__reset" onClick={reset}>사진 미리보기 초기화</button>}
    </div>
    <p className="preview-photo-report__note" id={`${id}-privacy`}>로컬 미리보기 · 사진은 이 브라우저에서만 보여요. 저장·게시되지 않으며 초기화하거나 새로고침하면 사라져요.</p>
    {!store.menus.length && <p className="preview-photo-report__note">사진을 연결할 메뉴가 없어요.</p>}
    {!onPreviewPhoto && <p className="preview-photo-report__note">사진 미리보기는 준비 중이에요.</p>}
    {open && <form id={`${id}-form`} className="preview-photo-report__form" onSubmit={submit} aria-describedby={`${id}-privacy`} noValidate>
      <div className="preview-photo-report__field">
        <label htmlFor={`${id}-menu`}>사진을 연결할 메뉴</label>
        <select id={`${id}-menu`} name="previewMenuId" value={menuId} required aria-invalid={error?.field === 'menu'} aria-describedby={error?.field === 'menu' ? `${id}-error` : undefined} onChange={event => {setMenuId(event.target.value); setError(null);}}>
          <option value="">메뉴를 선택해 주세요</option>
          {store.menus.map(menu => <option key={menu.id} value={menu.id}>{menu.name}</option>)}
        </select>
      </div>
      <div className="preview-photo-report__field">
        <label htmlFor={`${id}-file`}>사진 선택</label>
        <input id={`${id}-file`} name="previewPhoto" type="file" accept="image/jpeg,image/png,image/webp" required aria-invalid={error?.field === 'file'} aria-describedby={`${id}-file-hint${error?.field === 'file' ? ` ${id}-error` : ''}`} onChange={event => {setFile(event.target.files?.[0] ?? null); setError(null);}}/>
        <small id={`${id}-file-hint`}>JPEG, PNG, WebP · 5 MiB 이하</small>
      </div>
      <div className="preview-photo-report__field">
        <label htmlFor={`${id}-nickname`}>공개 닉네임</label>
        <input id={`${id}-nickname`} name="previewPublicNickname" type="text" autoComplete="off" value={nickname} required aria-invalid={error?.field === 'nickname'} aria-describedby={`${id}-nickname-hint${error?.field === 'nickname' ? ` ${id}-error` : ''}`} onChange={event => {setNickname(event.target.value); setError(null);}}/>
        <small id={`${id}-nickname-hint`}>사진에 표시할 이름 1~20자 · 이메일과 전화번호는 넣지 마세요. 이 입력은 계정 인증이 아니에요.</small>
      </div>
      {error && <p id={`${id}-error`} role="alert" className="preview-photo-report__error">{error.message}</p>}
      <div className="preview-photo-report__actions">
        <button type="submit" className="preview-photo-report__submit" disabled={!onPreviewPhoto}>이 브라우저에서 사진 미리보기</button>
        <button type="button" className="preview-photo-report__cancel" onClick={closeForm}>취소</button>
      </div>
    </form>}
    {status && <p role="status" className="preview-photo-report__status">{status}</p>}
  </section>;
}
