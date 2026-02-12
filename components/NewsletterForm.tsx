'use client';

import { useTransition, useState } from 'react';
import { subscribeToNewsletter } from '@/app/actions';

interface NewsletterFormProps {
  location: string;
  variant?: 'light' | 'dark';
  placeholder?: string;
}

export default function NewsletterForm({ location, variant = 'dark', placeholder = 'Enter your email' }: NewsletterFormProps) {
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<{ success?: boolean; message?: string } | null>(null);

  const handleSubmit = (formData: FormData) => {
    formData.append('source', location);
    startTransition(async () => {
      const result = await subscribeToNewsletter(formData);
      setStatus(result);
    });
  };

  const isLight = variant === 'light';

  return (
    <div className="w-full">
      {status?.success ? (
        <div className={`p-4 rounded-xl text-center font-bold animate-fade-in ${isLight ? 'bg-green-100 text-green-800' : 'bg-green-500/20 text-green-300 border border-green-500/30'}`}>
          ✅ {status.message}
        </div>
      ) : (
        <form action={handleSubmit} className="flex flex-col sm:flex-row gap-3">
          <input 
            name="email"
            type="email" 
            required
            placeholder={placeholder}
            className={`flex-grow px-5 py-4 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all
              ${isLight 
                ? 'bg-white border-slate-200 text-slate-900 placeholder:text-slate-500' 
                : 'bg-slate-900 border-slate-800 text-white placeholder:text-slate-600'
              }`}
          />
          <button 
            type="submit"
            disabled={isPending}
            className={`px-8 py-4 rounded-xl font-bold transition-all shadow-lg active:scale-95 text-sm whitespace-nowrap
              ${isLight 
                ? 'bg-slate-950 text-white hover:bg-blue-600' 
                : 'bg-white text-slate-950 hover:bg-blue-50'
              } ${isPending ? 'opacity-70 cursor-wait' : ''}`}
          >
            {isPending ? 'Processing...' : 'Subscribe'}
          </button>
        </form>
      )}
      {status?.success === false && (
        <p className="text-red-500 text-xs mt-3 font-bold text-center">{status.message}</p>
      )}
    </div>
  );
}
