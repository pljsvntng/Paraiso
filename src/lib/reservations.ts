import { randomBytes } from 'node:crypto';
import { Prisma, type BookingStatus } from '@prisma/client';
import { db } from './db';
import { AppError } from './security';
import type { VisitInput, BookingInput } from './validation';
export const activeStatuses:BookingStatus[]=['PENDING','CONFIRMED','CHECKED_IN'];
export const transitions:Record<BookingStatus,BookingStatus[]>={PENDING:['CONFIRMED','CANCELLED'],CONFIRMED:['CHECKED_IN','CANCELLED','NO_SHOW'],CHECKED_IN:['COMPLETED'],COMPLETED:[],CANCELLED:[],NO_SHOW:[]};
export function assertTransition(from:BookingStatus,to:BookingStatus){if(!transitions[from].includes(to))throw new AppError(`A ${from.toLowerCase().replaceAll('_',' ')} reservation cannot become ${to.toLowerCase().replaceAll('_',' ')}.`,409);}
export function overlaps(aStart:Date,aEnd:Date,bStart:Date,bEnd:Date){return aStart<bEnd && aEnd>bStart;}
export function quantityFor(exclusive:boolean,adults:number,children:number){return exclusive?1:adults+children;}
export function quoteRates(rates:{validFrom:Date;validUntil:Date;amountCentavos:number;verified:boolean}[],start:Date,end:Date,quantity:number) {
  let total=0;
  for(let day=start.getTime();day<end.getTime();day+=86400000){const matches=rates.filter(r=>r.verified&&r.validFrom.getTime()<=day&&r.validUntil.getTime()>day);if(matches.length!==1)return null;total+=matches[0].amountCentavos*quantity;}
  return total;
}
export async function inspectInventory(tx:Prisma.TransactionClient,input:VisitInput,lock=false){
  if(lock) await tx.$queryRaw`SELECT id FROM "Resource" WHERE id = ${input.resourceId} FOR UPDATE`;
  const resource=await tx.resource.findUnique({where:{id:input.resourceId},include:{offering:true,rates:true}});
  if(!resource?.active || !resource.offering.published || !resource.offering.verified || resource.offering.kind!==input.kind)throw new AppError('This experience is available by inquiry only.',409);
  const start=new Date(input.startDate),end=new Date(input.endDate);
  const offering=resource.offering;
  if((offering.validFrom && start<offering.validFrom)||(offering.validUntil && end>offering.validUntil))throw new AppError('These dates are outside the published offer period.',409);
  if(input.adults+input.children>resource.maxGuests)throw new AppError(`This option accommodates up to ${resource.maxGuests} guests.`,409);
  const range={startDate:{lt:end},endDate:{gt:start}};
  if(await tx.availabilityBlock.count({where:{resourceId:resource.id,...range}}))throw new AppError('This option is unavailable on those dates.',409);
  const items=await tx.reservationItem.findMany({where:{resourceId:resource.id,active:true,...range},select:{startDate:true,endDate:true,quantity:true}});
  const quantity=quantityFor(resource.exclusive,input.adults,input.children);
  // Compute each date separately. Summing the whole range would reject non-overlapping groups.
  for(let day=start.getTime();day<end.getTime();day+=86400000){const occupied=items.filter(i=>i.startDate.getTime()<=day&&i.endDate.getTime()>day).reduce((n,i)=>n+i.quantity,0);if(occupied+quantity>resource.inventoryCapacity)throw new AppError('Those dates have just filled up. Please choose another date or option.',409);}
  return {resource,start,end,quantity,totalCentavos:quoteRates(resource.rates,start,end,quantity)};
}
export async function availability(input:VisitInput){return db.$transaction(async tx=>{
  const settings=await tx.resortSettings.findUnique({where:{id:'resort'}});
  if(!settings?.bookingEnabled||!settings.policiesApproved)throw new AppError('Online reservations are not open yet. Please send an inquiry.',409);
  const result=await inspectInventory(tx,input);
  return {available:true,totalCentavos:result.totalCentavos,resourceName:result.resource.name};
});}
export async function createReservation(input:BookingInput){
  return db.$transaction(async tx=>{
    const previous=await tx.reservation.findUnique({where:{idempotencyKey:input.idempotencyKey}});
    if(previous) return {reference:previous.reference,status:previous.status,totalCentavos:previous.totalCentavos};
    const settings=await tx.resortSettings.findUnique({where:{id:'resort'}});
    if(!settings?.bookingEnabled||!settings.policiesApproved)throw new AppError('Online reservations are not open yet. Please send an inquiry.',409);
    const {resource,start,end,quantity,totalCentavos}=await inspectInventory(tx,input,true);
    const guest=await tx.guest.create({data:{name:input.name,email:input.email,phone:input.phone}});
    const reference=`PDJ-${randomBytes(6).toString('hex').toUpperCase()}`;
    const reservation=await tx.reservation.create({data:{reference,idempotencyKey:input.idempotencyKey,guestId:guest.id,kind:input.kind,startDate:start,endDate:end,adults:input.adults,children:input.children,requests:input.requests,totalCentavos,consentAt:new Date(),policyVersion:settings.policyVersion,items:{create:{resourceId:resource.id,startDate:start,endDate:end,quantity,amountCentavos:totalCentavos,exclusive:resource.exclusive}}}});
    await tx.auditLog.create({data:{actorId:'guest',action:'RESERVATION_REQUESTED',entity:'Reservation',entityId:reservation.id}});
    await tx.notification.create({data:{reservationId:reservation.id,recipient:input.email,subject:`Reservation request ${reference}`,body:`Hello ${input.name},\n\nYour reservation request ${reference} has been received. It is pending staff review, and is not confirmed. ${totalCentavos===null?'The resort will provide a verified quotation.':'Your quoted total is PHP '+(totalCentavos/100).toFixed(2)+'.'}\n\nParaiso de June Quixote Ecofarm Resort`}});
    return {reference,status:reservation.status,totalCentavos};
  },{isolationLevel:Prisma.TransactionIsolationLevel.Serializable,timeout:15000});
}
export async function changeReservation(id:string,status:BookingStatus,actorId:string){
  return db.$transaction(async tx=>{
    await tx.$queryRaw`SELECT id FROM "Reservation" WHERE id = ${id} FOR UPDATE`;
    const booking=await tx.reservation.findUnique({where:{id},include:{items:true}});
    if(!booking)throw new AppError('Reservation not found.',404);
    assertTransition(booking.status,status);
    // A quote must be agreed before staff can confirm. Missing rates are never treated as zero.
    if(status==='CONFIRMED'&&booking.totalCentavos===null)throw new AppError('Set verified rates and obtain an agreed quote before confirming this request.',409);
    await tx.reservationItem.updateMany({where:{reservationId:id},data:{active:activeStatuses.includes(status)}});
    const updated=await tx.reservation.update({where:{id},data:{status}});
    await tx.auditLog.create({data:{actorId,action:'STATUS_CHANGED',entity:'Reservation',entityId:id,detail:{from:booking.status,to:status}}});
    return updated;
  },{isolationLevel:Prisma.TransactionIsolationLevel.Serializable});
}
