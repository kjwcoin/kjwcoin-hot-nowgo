export default function Brand({className=''}:{className?:string}) {
 return <a className={`brand brand-logo rich-brand ${className}`} href="/" aria-label="RICH by NOWGO 홈"><img className="rich-brand-mark" src="/images/nowgo-red.png" alt="NOWGO" width={2173} height={724} style={{filter:'brightness(0) saturate(100%) invert(50%) sepia(19%) saturate(744%) hue-rotate(352deg) brightness(91%) contrast(85%)'}}/></a>;
}
