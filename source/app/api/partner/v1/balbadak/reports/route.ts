import { createHmac, timingSafeEqual } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { publicConfig } from '@/lib/auth-config';

export const runtime = 'nodejs';
const headers = { 'Cache-Control': 'no-store', 'Content-Type': 'application/json; charset=utf-8' };
const MAX_BODY_BYTES = 16 * 1024;
const MAX_CLOCK_SKEW_SECONDS = 300;

type PartnerReport = {
  event_id: string;
  source_store_id: string;
  store_name?: string;
  report_type: 'operating_status';
  status_signal?: 'open' | 'closed' | 'sold_out';
  reported_at: string;
};

function json(data: unknown, status = 200) {
  return Response.json(data, { status, headers });
}

function validSignature(secret: string, timestamp: string, raw: string, signature: string) {
  if (!/^\d{10}$/.test(timestamp) || !/^[a-f0-9]{64}$/i.test(signature)) return false;
  const seconds = Math.floor(Date.now() / 1000);
  if (Math.abs(seconds - Number(timestamp)) > MAX_CLOCK_SKEW_SECONDS) return false;
  const expected = createHmac('sha256', secret).update(`${timestamp}.${raw}`).digest();
  const actual = Buffer.from(signature, 'hex');
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

async function readBoundedBody(request: Request) {
  if (!request.body) return '';
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_BODY_BYTES) { await reader.cancel(); throw new Error('body_too_large'); }
    chunks.push(value);
  }
  return new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks.map(chunk => Buffer.from(chunk))));
}

function parseReport(value: unknown): PartnerReport | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const r = value as Record<string, unknown>;
  const text = (v: unknown, max: number) => { if (typeof v !== 'string' || v.length > max) return null; const trimmed = v.trim(); return trimmed.length > 0 ? trimmed : null; };
  const event_id = text(r.event_id, 120);
  const source_store_id = text(r.source_store_id, 120);
  const store_name = r.store_name === undefined ? undefined : text(r.store_name, 160);
  const signals = ['open', 'closed', 'sold_out'];
  if (!event_id || !source_store_id || (r.store_name !== undefined && !store_name) ||
      r.report_type !== 'operating_status' || !/^\d{4}-\d\d-\d\dT/.test(String(r.reported_at)) ||
      !Number.isFinite(Date.parse(String(r.reported_at)))) return null;
  if (r.status_signal === undefined || !signals.includes(String(r.status_signal))) return null;
  return { event_id, source_store_id, ...(store_name ? { store_name } : {}), report_type: 'operating_status',
    status_signal: r.status_signal as PartnerReport['status_signal'], reported_at: String(r.reported_at) };
}

export async function POST(request: Request) {
  const secret = process.env.BALBADAK_WEBHOOK_SECRET;
  if (!secret) return json({ error: '발바닥 제보 수신이 아직 활성화되지 않았습니다.' }, 503);
  const timestamp = request.headers.get('x-nowgo-timestamp') ?? '';
  const signature = request.headers.get('x-nowgo-signature') ?? '';
  let raw: string;
  try { raw = await readBoundedBody(request); }
  catch (error) { return json({ error: error instanceof Error && error.message === 'body_too_large' ? '요청 크기는 16KB를 넘을 수 없습니다.' : '요청 본문을 읽을 수 없습니다.' }, error instanceof Error && error.message === 'body_too_large' ? 413 : 400); }
  if (!validSignature(secret, timestamp, raw, signature)) return json({ error: '서명이 유효하지 않거나 만료되었습니다.' }, 401);

  let report: PartnerReport | null;
  try { report = parseReport(JSON.parse(raw)); } catch { report = null; }
  if (!report) return json({ error: '허용된 필드와 형식으로 제보를 보내 주세요.' }, 400);

  try {
    const config = publicConfig();
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!config.ready || !serviceKey) return json({ error: '파트너 수신 설정이 완료되지 않았습니다.' }, 503);
    const db = createClient(config.url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const row = {
      source: 'balbadak', source_event_id: report.event_id, source_store_id: report.source_store_id,
      hot_store_id: null, store_name: report.store_name ?? null,
      report_type: report.report_type, menu_name: null, spicy_level: null, status_signal: report.status_signal,
      reported_at: report.reported_at, report_count: 1, review_status: 'pending',
    };
    const { data, error } = await db.from('hot_partner_reports')
      .upsert(row, { onConflict: 'source,source_event_id', ignoreDuplicates: true })
      .select('id');
    if (error) throw error;
    const created = Boolean(data?.length);
    return json({ accepted: true, duplicate: !created, review_status: 'pending' }, created ? 201 : 200);
  } catch (error) {
    console.error('HOT partner report ingest failed', error);
    return json({ error: '제보를 HOT에 등록하지 못했습니다.' }, 503);
  }
}
