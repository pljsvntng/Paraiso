import { bookingSchema } from '@/lib/validation';
import { sameOrigin,rateLimit,readJson,errorResponse } from '@/lib/security';
import { createReservation } from '@/lib/reservations';
import { flushNotifications } from '@/lib/email';
import { after } from 'next/server';
export async function POST(request:Request){try{
  sameOrigin(request);await rateLimit(request,'booking');
  const input=bookingSchema.parse(await readJson(request));
  const booking=await createReservation(input);
  after(async()=>{try{await flushNotifications();}catch{console.error('Notification delivery deferred');}});
  return Response.json(booking,{status:201});
}catch(error){return errorResponse(error);}}
