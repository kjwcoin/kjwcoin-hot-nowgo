import Image from 'next/image';

export default function Brand({className=''}:{className?:string}) {
 return <a className={`brand brand-logo sweet-brand ${className}`} href="/" aria-label="SWEET by NOWGO 홈">
  <Image src="/images/nowgo-mint.png" alt="NOWGO SWEET" width={480} height={160} priority />
 </a>;
}
