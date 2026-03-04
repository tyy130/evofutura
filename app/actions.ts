'use server';

import { subscribeEmail } from '@/lib/subscriptions';

export interface SubscribeActionState {
  success: boolean;
  message: string;
}

export async function subscribeToNewsletter(
  _previousState: SubscribeActionState | null,
  formData: FormData
): Promise<SubscribeActionState> {
  const email = (formData.get('email') as string) || '';
  const source = (formData.get('source') as string) || 'unknown';
  const result = await subscribeEmail(email, source);
  return {
    success: result.success,
    message: result.message,
  };
}
