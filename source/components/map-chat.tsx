'use client';

import {useEffect, useId, useRef, useState, type CSSProperties, type FormEvent} from 'react';
import {MessageCircle, Send, X, Flag, RefreshCw} from 'lucide-react';
import type {User} from '@supabase/supabase-js';
import {browserDb, ensureUnifiedSession} from '@/lib/supabase-browser';
import {siteConfig, type SiteVariant} from '@/lib/site-config';
import {CHAT_COLUMNS, CHAT_DESKTOP_QUERY, CHAT_MAX_LENGTH, chatSendError, mergeChatMessages, type ChatMessage} from '@/lib/map-chat';
import styles from './map-chat.module.css';

export default function MapChat({variant}: {variant: SiteVariant}) {
  const [desktop, setDesktop] = useState(false);
  useEffect(() => {
    const media = window.matchMedia(CHAT_DESKTOP_QUERY);
    const update = () => setDesktop(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  return desktop ? <DesktopChat key={variant} variant={variant}/> : null;
}

function DesktopChat({variant}: {variant: SiteVariant}) {
  const theme = siteConfig(variant);
  const panelId = useId();
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(true);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [retry, setRetry] = useState(0);
  const [reported, setReported] = useState<Set<string>>(new Set());
  const [reporting, setReporting] = useState<string | null>(null);
  const list = useRef<HTMLDivElement>(null);
  const composer = useRef<HTMLTextAreaElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);
  const nearBottom = useRef(true);
  const pendingMessage = useRef<{id: string; content: string} | null>(null);
  const sendLock = useRef(false);

  useEffect(() => {
    if (!open) return;
    let active = true;
    let loadPending = false;
    const db = browserDb();
    const controller = new AbortController();

    const {data: authListener} = db.auth.onAuthStateChange((_event, session) => {
      if (active) {setUser(session?.user ?? null); setChecking(false);}
    });
    void ensureUnifiedSession().catch(() => {}).then(async () => {
      const {data} = await db.auth.getSession();
      if (active) {setUser(data.session?.user ?? null); setChecking(false);}
    });

    const load = async () => {
      if (!active || loadPending || document.hidden) return;
      loadPending = true;
      try {
        const {data, error: loadError} = await db.from('ng_map_chat_messages')
          .select(CHAT_COLUMNS).eq('variant', variant)
          .order('created_at', {ascending: false}).order('id', {ascending: false}).limit(80)
          .abortSignal(controller.signal);
        if (loadError) throw loadError;
        if (active) {setMessages(previous => mergeChatMessages(previous, (data ?? []) as ChatMessage[], variant)); setError('');}
      } catch {
        if (active) setError('대화를 불러오지 못했어요. 다시 연결해 주세요.');
      } finally {
        loadPending = false;
        if (active) setLoading(false);
      }
    };

    const channel = db.channel(`map-chat:${variant}:${panelId}`)
      .on('postgres_changes', {event: 'INSERT', schema: 'public', table: 'ng_map_chat_messages', filter: `variant=eq.${variant}`}, payload => {
        if (active) setMessages(previous => mergeChatMessages(previous, [payload.new as ChatMessage], variant));
      })
      .subscribe(status => {
        if (!active) return;
        setConnected(status === 'SUBSCRIBED');
        if (status === 'SUBSCRIBED') void load();
      });
    void load();
    // Reconcile after reconnects or a missed event, including while the socket is unavailable.
    const timer = window.setInterval(load, 15000);
    window.addEventListener('focus', load);
    document.addEventListener('visibilitychange', load);
    return () => {
      active = false;
      controller.abort();
      clearInterval(timer);
      authListener.subscription.unsubscribe();
      window.removeEventListener('focus', load);
      document.removeEventListener('visibilitychange', load);
      void db.removeChannel(channel);
    };
  }, [open, variant, panelId, retry]);

  useEffect(() => {
    if (nearBottom.current && list.current) list.current.scrollTop = list.current.scrollHeight;
  }, [messages, loading]);

  function close() {setOpen(false); setConnected(false); toggle.current?.focus();}
  function reconnect() {setChecking(true); setLoading(true); setError(''); setRetry(value => value + 1);}
  function toggleOpen() {
    if (open) {close(); return;}
    nearBottom.current = true;
    setChecking(true); setLoading(true); setError(''); setOpen(true);
  }

  async function send(event: FormEvent) {
    event.preventDefault();
    const content = draft.trim();
    if (!user || checking || sendLock.current || !content || [...content].length > CHAT_MAX_LENGTH) return;
    sendLock.current = true;
    setSending(true); setError(''); setNotice('');
    if (pendingMessage.current?.content !== content) pendingMessage.current = {id: crypto.randomUUID(), content};
    const pending = pendingMessage.current;
    try {
      const db = browserDb();
      const {data, error: sendError} = await db.from('ng_map_chat_messages')
        .insert({id: pending.id, variant, user_id: user.id, content}).select(CHAT_COLUMNS).single();
      // Retry the same ID after a lost response without publishing the message twice.
      let row = data as ChatMessage | null;
      if (sendError?.code === '23505') {
        const existing = await db.from('ng_map_chat_messages').select(CHAT_COLUMNS)
          .eq('id', pending.id).eq('user_id', user.id).eq('variant', variant).single();
        row = existing.data as ChatMessage | null;
        if (existing.error || !row || row.content !== content) throw sendError;
      } else if (sendError) throw sendError;
      if (!row) throw new Error('Empty chat response');
      nearBottom.current = true;
      setMessages(previous => mergeChatMessages(previous, [row], variant));
      setDraft(''); pendingMessage.current = null;
      composer.current?.focus();
    } catch (cause) {
      setError(chatSendError((cause as {code?: string})?.code));
    } finally {sendLock.current = false; setSending(false);}
  }

  async function report(message: ChatMessage) {
    if (!user || reporting || reported.has(message.id)) return;
    setReporting(message.id); setNotice('');
    try {
      const {error: reportError} = await browserDb().from('ng_map_chat_reports')
        .insert({message_id: message.id, reporter_id: user.id, reason: '부적절한 내용'});
      if (reportError && reportError.code !== '23505') throw reportError;
      setReported(previous => new Set(previous).add(message.id));
      setNotice('신고가 접수됐어요.');
    } catch {setNotice('신고를 접수하지 못했어요. 다시 시도해 주세요.');}
    finally {setReporting(null);}
  }

  return <div className={styles.wrap} style={{'--chat-accent': theme.accent} as CSSProperties}>
    {open && <section id={panelId} className={styles.panel} aria-label={`${theme.name} 이용자 채팅`} onKeyDown={event => {if (event.key === 'Escape') close();}}>
      <header className={styles.header}>
        <MessageCircle size={21} aria-hidden="true"/>
        <div><strong>{theme.name} 이용자 채팅</strong><small>{connected ? '실시간 대화' : '대화 자동 갱신 중'}</small></div>
        <button type="button" aria-label="채팅 닫기" onClick={close}><X size={20}/></button>
      </header>
      <p className={styles.intro}>맛집 이야기와 지금의 매장 소식을 나눠요.</p>
      <div ref={list} className={styles.messages} role="log" aria-label="대화 목록" aria-live="polite" aria-relevant="additions" aria-busy={loading}
        onScroll={() => {const node = list.current; if (node) nearBottom.current = node.scrollHeight - node.scrollTop - node.clientHeight < 60;}}>
        {loading && !messages.length ? <p className={styles.empty}>대화를 불러오는 중이에요.</p> : !messages.length && !error ? <div className={styles.empty}><MessageCircle size={28}/><strong>첫 이야기를 남겨 주세요</strong><span>오늘 발견한 한 접시, 함께 나눠요.</span></div> : null}
        {messages.map(message => <article key={message.id} className={`${styles.message} ${message.user_id === user?.id ? styles.mine : ''}`}>
          <div className={styles.meta}><strong>{message.display_name}{message.user_id === user?.id ? ' · 나' : ''}</strong><time dateTime={message.created_at} title={new Date(message.created_at).toLocaleString('ko-KR')}>{new Date(message.created_at).toLocaleTimeString('ko-KR', {hour: '2-digit', minute: '2-digit', timeZone:'Asia/Seoul'})}</time></div>
          <p>{message.content}</p>
          {user && message.user_id !== user.id && <button type="button" className={styles.report} disabled={Boolean(reporting) || reported.has(message.id)} aria-label={`${message.display_name} 메시지 신고`} onClick={() => void report(message)}><Flag size={11}/>{reported.has(message.id) ? '접수됨' : '신고'}</button>}
        </article>)}
      </div>
      {error && <div className={styles.error} role="alert"><span>{error}</span><button type="button" onClick={reconnect}><RefreshCw size={13}/>다시 연결</button></div>}
      {notice && <p className={styles.notice} role="status">{notice}</p>}
      {checking ? <p className={styles.login}>로그인을 확인하고 있어요.</p> : user ? <form className={styles.composer} onSubmit={send}>
        <label htmlFor={`${panelId}-draft`} className={styles.srOnly}>채팅 메시지</label>
        <textarea ref={composer} id={`${panelId}-draft`} rows={2} maxLength={CHAT_MAX_LENGTH} value={draft} disabled={sending} placeholder="메시지를 입력하세요"
          onChange={event => setDraft(event.target.value)} onKeyDown={event => {if(event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {event.preventDefault(); event.currentTarget.form?.requestSubmit();}}}/>
        <div><small>{draft.length}/{CHAT_MAX_LENGTH} · Shift+Enter 줄바꿈</small><button type="submit" disabled={sending || !draft.trim()} aria-label="메시지 보내기"><Send size={15}/>{sending ? '전송 중' : '보내기'}</button></div>
      </form> : <div className={styles.login}><span>로그인하면 대화에 참여할 수 있어요.</span><a href="/account/join?returnTo=%2F">로그인하고 참여하기</a></div>}
      <p className={styles.guideline}>공개 대화방 · 개인정보와 광고는 올리지 말아 주세요.</p>
    </section>}
    <button ref={toggle} type="button" className={styles.toggle} aria-controls={panelId} aria-expanded={open} onClick={toggleOpen}><MessageCircle size={19}/><span>{open ? '채팅 접기' : `${theme.name} 채팅`}</span></button>
  </div>;
}
