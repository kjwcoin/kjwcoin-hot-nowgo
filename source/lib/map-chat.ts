import type {SiteVariant} from './site-config';

export const CHAT_LIMIT = 80;
export const CHAT_MAX_LENGTH = 500;
export const CHAT_DESKTOP_QUERY = '(min-width: 901px) and (hover: hover) and (pointer: fine)';
export const CHAT_COLUMNS = 'id,variant,user_id,display_name,content,created_at';

export type ChatMessage = {
  id: string;
  variant: SiteVariant;
  user_id: string;
  display_name: string;
  content: string;
  created_at: string;
};

export function mergeChatMessages(current: ChatMessage[], incoming: ChatMessage[], variant: SiteVariant) {
  const rows = new Map<string, ChatMessage>();
  for (const row of [...current, ...incoming]) {
    if (row.variant === variant) rows.set(row.id, row);
  }
  return [...rows.values()]
    .sort((a, b) => a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id))
    .slice(-CHAT_LIMIT);
}

export function chatSendError(code?: string) {
  if (code === 'P0001') return '메시지는 3초 간격으로 보낼 수 있어요. 잠시 후 다시 보내 주세요.';
  if (code === '42501' || code === '23503') return '로그인을 다시 확인해 주세요.';
  return '메시지를 보내지 못했어요. 입력한 내용은 유지됩니다. 다시 보내 주세요.';
}
