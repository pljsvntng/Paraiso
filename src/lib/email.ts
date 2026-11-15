import { Resend } from 'resend';
import { db } from './db';
export async function flushNotifications(limit=10){
  if(!process.env.RESEND_API_KEY||!process.env.EMAIL_FROM)return;
  const resend=new Resend(process.env.RESEND_API_KEY);
  const pending=await db.notification.findMany({where:{sentAt:null,attempts:{lt:5}},take:limit,orderBy:{createdAt:'asc'}});
  for(const item of pending){
    await db.notification.update({where:{id:item.id},data:{attempts:{increment:1}}});
    const result=await resend.emails.send({from:process.env.EMAIL_FROM,to:item.recipient,subject:item.subject,text:item.body},{idempotencyKey:item.id});
    if(!result.error)await db.notification.update({where:{id:item.id},data:{sentAt:new Date()}});
  }
}
