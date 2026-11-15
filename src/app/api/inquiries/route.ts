import { inquirySchema } from '@/lib/validation';
import { db } from '@/lib/db';
import { sameOrigin,rateLimit,readJson,errorResponse,AppError } from '@/lib/security';
import { flushNotifications } from '@/lib/email';
import { after } from 'next/server';
export async function POST(request:Request){try{
  sameOrigin(request);await rateLimit(request,'inquiry');
  const data=inquirySchema.parse(await readJson(request));
  const settings=await db.resortSettings.findUnique({where:{id:'resort'}});
  if(!settings?.policiesApproved)throw new AppError('Online inquiries are not open yet. Please use the official Facebook page.',503);
  await db.$transaction(async tx=>{
    await tx.inquiry.create({data:{name:data.name,email:data.email,phone:data.phone,type:data.type,message:data.message,consentAt:new Date()}});
    if(process.env.RESORT_NOTIFICATION_EMAIL)await tx.notification.create({data:{recipient:process.env.RESORT_NOTIFICATION_EMAIL,subject:'New resort inquiry',body:`A ${data.type.toLowerCase()} is awaiting review in the secure admin dashboard.`}});
  });
  after(async()=>{try{await flushNotifications();}catch{console.error('Inquiry notification deferred');}});
  return Response.json({saved:true,message:'Your inquiry has been received. The resort team will review your request.'},{status:201});
}catch(error){return errorResponse(error);}}
