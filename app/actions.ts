'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function subscribeToNewsletter(formData: FormData) {
  const email = formData.get('email') as string;
  const source = (formData.get('source') as string) || 'unknown';

  if (!email || !email.includes('@')) {
    return { success: false, message: 'Please enter a valid email address.' };
  }

  try {
    await prisma.subscriber.upsert({
      where: { email },
      update: { active: true, source }, // Reactivate if they re-sub
      create: { email, source },
    });
    
    revalidatePath('/');
    return { success: true, message: 'Welcome to the inner circle.' };
  } catch (error) {
    console.error('Subscription error:', error);
    return { success: false, message: 'Something went wrong. Please try again.' };
  }
}
