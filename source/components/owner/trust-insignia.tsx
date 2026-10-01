import { useId } from "react";

const COLOR_RANKS = [
  { light: "#ffe4e6", metal: "#fb7185", dark: "#881337" },
  { light: "#ffedd5", metal: "#fb923c", dark: "#9a3412" },
  { light: "#ede9fe", metal: "#a78bfa", dark: "#5b21b6" },
  { light: "#ccfbf1", metal: "#2dd4bf", dark: "#115e59" },
  { light: "#fff7d6", metal: "#eebd55", dark: "#163e8c" },
];

export function TrustInsignia({ level, className, tone = "silver" }: { level: number; className?: string; tone?: "silver" | "color" }) {
  const id = useId().replace(/:/g, "");
  const palette = tone === "color" ? COLOR_RANKS[Math.max(0, Math.min(4, level - 1))] : null;
  return <svg viewBox="0 0 64 80" className={className} aria-hidden="true" focusable="false">
    <defs><linearGradient id={id} x1="0" y1="0" x2="1" y2="1"><stop stopColor={palette?.light ?? "#fff"}/><stop offset=".5" stopColor={palette?.metal ?? "#8d8d8d"}/><stop offset="1" stopColor={palette?.light ?? "#eee"}/></linearGradient></defs>
    <path d="M32 2 61 14v44L32 78 3 58V14Z" fill={`url(#${id})`} stroke={palette?.dark ?? "#171717"} strokeWidth="2"/>
    <path d="M32 8 55 18v37L32 71 9 55V18Z" fill={palette?.dark ?? "#151515"} stroke={palette?.light ?? "#f2f2f2"}/>
    {Array.from({ length: level }, (_, i) => <path key={i} d={`M17 ${18 + i * 8} 32 ${25 + i * 8} 47 ${18 + i * 8}v5L32 ${30 + i * 8} 17 ${23 + i * 8}Z`} fill={`url(#${id})`}/>)}
  </svg>;
}

