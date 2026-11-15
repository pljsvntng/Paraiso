import { createHash } from 'node:crypto';
import { db, databaseConfigured } from './db';
export class AppError extends Error { constructor(message:string, public status=400) { super(message); } }
export function sameOrigin(request:Request) {
  const expected = process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin;
  if(request.headers.get('origin') !== new URL(expected).origin) throw new AppError('Please submit this form from the resort website.',403);
}
export async function rateLimit(request:Request, scope:string, limit=5) {
  if(!databaseConfigured()) throw new AppError('Online forms are not connected yet. Please contact the resort through its official Facebook page.',503);
  // On Vercel this header is set by the trusted platform. Do not trust client proxy headers on another host.
  const ip = process.env.VERCEL ? request.headers.get('x-vercel-forwarded-for')?.split(',')[0] || 'unknown' : 'local';
  const window = Math.floor(Date.now()/600000);
  const key=createHash('sha256').update(`${scope}:${ip}:${window}`).digest('hex');
  const row=await db.rateLimit.upsert({where:{key},create:{key,expiresAt:new Date(Date.now()+600000)},update:{count:{increment:1}}});
  if(row.count>limit) throw new AppError('Too many requests. Please try again in ten minutes.',429);
}
export async function readJson(request:Request) {
  if(Number(request.headers.get('content-length')||0)>16384) throw new AppError('Request is too large.',413);
  const text=await request.text();
  if(Buffer.byteLength(text)>16384) throw new AppError('Request is too large.',413);
  try{return JSON.parse(text);}catch{throw new AppError('Invalid request body.');}
}
export function errorResponse(error:unknown) {
  if(error instanceof AppError) return Response.json({error:error.message},{status:error.status});
  if(error && typeof error === 'object' && 'issues' in error) return Response.json({error:'Please check the information you entered.',issues:error.issues},{status:400});
  console.error('Request failed',error instanceof Error ? error.name : 'Unknown error');
  return Response.json({error:'We could not complete your request. Please try again later.'},{status:503});
}
