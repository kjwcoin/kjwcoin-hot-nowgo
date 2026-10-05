export type ReporterRank = {rank:number;public_id:string;nickname:string;report_count:number};

/** Never display an email/phone used accidentally as a public nickname. */
export function publicReporterNickname(value: unknown) {
  if (typeof value !== 'string') return '제보자';
  const name=value.trim();
  if (!name || name.includes('@') || /\d(?:[\s()+.-]*\d){6,}/.test(name)) return '제보자';
  return Array.from(name).slice(0,24).join('');
}

export function reporterRanks(value: unknown): ReporterRank[] {
  if (!Array.isArray(value)) throw new Error('Invalid leaderboard');
  const seen=new Set<string>();
  const ranks=new Set<number>();
  return value.slice(0,10).map(row=>{
    if (!row || !Number.isInteger(row.rank) || row.rank<1 || row.rank>10 ||
        typeof row.public_id!=='string' || !/^NG-[A-F0-9]{8}$/.test(row.public_id) ||
        !Number.isSafeInteger(row.report_count) || row.report_count<1 || seen.has(row.public_id) || ranks.has(row.rank)) throw new Error('Invalid leaderboard');
    seen.add(row.public_id);ranks.add(row.rank);
    return {rank:row.rank,public_id:row.public_id,nickname:publicReporterNickname(row.nickname),report_count:row.report_count};
  }).sort((a,b)=>a.rank-b.rank);
}
