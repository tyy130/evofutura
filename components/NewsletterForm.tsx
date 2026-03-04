'use client';

import { useActionState } from 'react';
import { subscribeToNewsletter, type SubscribeActionState } from '@/app/actions';

interface NewsletterFormProps {
  location: string;
  variant?: 'light' | 'dark';
  placeholder?: string;
}

export default function NewsletterForm({
  location,
  variant = 'dark',
  placeholder = 'Enter your email',
}: NewsletterFormProps) {
  const [status, formAction, isPending] = useActionState<SubscribeActionState | null, FormData>(
    subscribeToNewsletter,
    null
  );

  const isLight = variant === 'light';

  return (
    <div className="w-full">
      {status?.success ? (
        <div
          className={`animate-fade-in rounded-xl p-4 text-center font-bold ${
            isLight
              ? 'bg-green-100 text-green-800'
              : 'border border-green-500/30 bg-green-500/20 text-green-300'
          }`}
        >
          {status.message || 'You are subscribed.'}
        </div>
      ) : (
        <form action={formAction} className="flex flex-col gap-3 sm:flex-row">
          <input type="hidden" name="source" value={location} />
          <input
            name="email"
            type="email"
            required
            placeholder={placeholder}
            className={`flex-grow rounded-xl border px-5 py-4 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-blue-600 ${
              isLight
                ? 'border-slate-200 bg-white text-slate-900 placeholder:text-slate-500'
                : 'border-slate-800 bg-slate-900 text-white placeholder:text-slate-600'
            }`}
          />
          <button
            type="submit"
            disabled={isPending}
            className={`whitespace-nowrap rounded-xl px-8 py-4 text-sm font-bold shadow-lg transition-all active:scale-95 ${
              isLight ? 'bg-slate-950 text-white hover:bg-blue-600' : 'bg-white text-slate-950 hover:bg-blue-50'
            } ${isPending ? 'cursor-wait opacity-70' : ''}`}
          >
            {isPending ? 'Processing...' : 'Subscribe'}
          </button>
        </form>
      )}
      {status?.success === false && (
        <p className="mt-3 text-center text-xs font-bold text-red-500">{status.message || 'Subscription failed.'}</p>
      )}
    </div>
  );
}
