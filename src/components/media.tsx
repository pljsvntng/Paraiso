import Image from 'next/image';
import { ArrowUpRight } from 'lucide-react';
export function Media({src,alt,label='Resort photography',className='',priority=false}:{src?:string|null;alt:string;label?:string;className?:string;priority?:boolean}){
  return <div className={`media ${className}`}>{src?<Image src={src} alt={alt} fill sizes="(max-width: 700px) 100vw, 65vw" priority={priority}/>:<><div className="media-landscape" aria-hidden="true"><span/><span/><span/></div><div className="media-caption"><span>{label}</span><ArrowUpRight size={17}/></div><span className="media-note">Approved photograph to follow</span></>}</div>;
}
