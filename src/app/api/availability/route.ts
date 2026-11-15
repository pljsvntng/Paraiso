import { visitSchema } from '@/lib/validation';
import { availability } from '@/lib/reservations';
import { sameOrigin,rateLimit,readJson,errorResponse } from '@/lib/security';
export async function POST(request:Request){try{sameOrigin(request);await rateLimit(request,'availability',30);return Response.json(await availability(visitSchema.parse(await readJson(request))));}catch(error){return errorResponse(error);}}
