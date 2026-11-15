import NextAuth from 'next-auth';
import Resend from 'next-auth/providers/resend';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { db, databaseConfigured } from './db';
import { AppError } from './security';
import type { Role } from '@prisma/client';
export const authConfigured = () => databaseConfigured() && Boolean(process.env.AUTH_SECRET && process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(db),
  providers:[Resend({apiKey:process.env.RESEND_API_KEY || 'not-configured',from:process.env.EMAIL_FROM || 'setup@example.invalid'})],
  session:{strategy:'database',maxAge:8*60*60,updateAge:60*30},
  pages:{signIn:'/admin/login',verifyRequest:'/admin/login?sent=1',error:'/admin/login'},
  callbacks:{
    async signIn({user}) { if(!user.email || !databaseConfigured()) return false; return Boolean(await db.user.findFirst({where:{email:user.email.toLowerCase(),active:true}})); },
    async session({session,user}) { session.user.id=user.id; return session; },
  },
});
export async function currentStaff() {
  if(!authConfigured()) return null;
  const session=await auth();
  if(!session?.user?.id) return null;
  return db.user.findFirst({where:{id:session.user.id,active:true},select:{id:true,name:true,email:true,role:true}});
}
export async function requireStaff(roles:Role[]=['ADMINISTRATOR','MANAGER','CONTENT_EDITOR']) {
  const user=await currentStaff();
  if(!user) throw new AppError('Please sign in.',401);
  if(!roles.includes(user.role)) throw new AppError('Your role cannot perform this action.',403);
  return user;
}
