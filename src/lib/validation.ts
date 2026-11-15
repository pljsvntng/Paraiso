import { z } from 'zod';
export const kinds = ['ACCOMMODATION','COTTAGE','ACTIVITY','DAY_TOUR','PACKAGE'] as const;
export function manilaToday(now = new Date()) { return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Manila',year:'numeric',month:'2-digit',day:'2-digit'}).format(now); }
export const date = z.iso.date();
export const visitSchema = z.object({ kind:z.enum(kinds), startDate:date, endDate:date, adults:z.coerce.number().int().min(1).max(100), children:z.coerce.number().int().min(0).max(100), resourceId:z.string().min(1).max(100) }).superRefine((v,ctx)=>{
  if(v.startDate < manilaToday()) ctx.addIssue({code:'custom',path:['startDate'],message:'Choose today or a future date.'});
  if(v.endDate <= v.startDate) ctx.addIssue({code:'custom',path:['endDate'],message:'The end date must be after the start date.'});
  if((new Date(v.endDate).getTime()-new Date(v.startDate).getTime())/86400000 > 30) ctx.addIssue({code:'custom',path:['endDate'],message:'For visits over 30 days, please contact the resort.'});
  if(v.kind !== 'ACCOMMODATION' && new Date(v.endDate).getTime()-new Date(v.startDate).getTime() !== 86400000) ctx.addIssue({code:'custom',path:['endDate'],message:'Day experiences are reserved for one date.'});
});
export const guestFields = {name:z.string().trim().min(2).max(120),email:z.email().max(254).transform(s=>s.toLowerCase()),phone:z.string().trim().regex(/^[+\d ()-]{7,30}$/,'Enter a valid contact number.'),consent:z.literal(true),website:z.string().max(0).optional()};
export const bookingSchema = visitSchema.and(z.object({...guestFields,requests:z.string().trim().max(2000).optional(),idempotencyKey:z.uuid()}));
export const inquirySchema = z.object({...guestFields,type:z.enum(['General inquiry','Overnight stay','Adventure','Swimming & cottages','Dining','Group visit','Privacy request']),message:z.string().trim().min(10).max(4000)});
export type VisitInput = z.infer<typeof visitSchema>;
export type BookingInput = z.infer<typeof bookingSchema>;
