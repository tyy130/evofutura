'use client';

import Script from 'next/script';
import { useEffect, useMemo, useRef, useState } from 'react';

interface PublicComment {
  id: string;
  name: string;
  content: string;
  createdAt: string;
}

interface CommentsSectionProps {
  slug: string;
}

interface TurnstileApi {
  render: (
    container: HTMLElement,
    options: {
      sitekey: string;
      size: 'invisible';
      action: string;
      callback: (token: string) => void;
      'expired-callback': () => void;
      'error-callback': () => void;
    }
  ) => string;
  execute: (widgetId: string) => void;
  reset: (widgetId: string) => void;
  remove: (widgetId: string) => void;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

const initialForm = {
  name: '',
  email: '',
  content: '',
  company: '',
};

const TURNSTILE_SITE_KEY = (process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || '').trim();
const TURNSTILE_SITE_KEY_VALID = /^0x[0-9A-Za-z_-]{20,}$/.test(TURNSTILE_SITE_KEY);

export default function CommentsSection({ slug }: CommentsSectionProps) {
  const [comments, setComments] = useState<PublicComment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
  const [form, setForm] = useState(initialForm);
  const [captchaReady, setCaptchaReady] = useState(!TURNSTILE_SITE_KEY_VALID);
  const [captchaToken, setCaptchaToken] = useState('');
  const captchaContainerRef = useRef<HTMLDivElement | null>(null);
  const widgetIdRef = useRef<string | null>(null);
  const tokenResolverRef = useRef<((token: string) => void) | null>(null);
  const tokenRejectorRef = useRef<((reason?: unknown) => void) | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadComments = async () => {
      setIsLoading(true);
      setMessage(null);

      try {
        const response = await fetch(`/api/comments?slug=${encodeURIComponent(slug)}`, {
          cache: 'no-store',
        });
        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.message || 'Could not load comments.');
        }

        if (isMounted) {
          setComments(Array.isArray(data.comments) ? data.comments : []);
        }
      } catch (error) {
        console.error('[CommentsSection] Load failed:', error);
        if (isMounted) {
          setMessage({ type: 'error', text: 'Comments are temporarily unavailable.' });
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void loadComments();
    return () => {
      isMounted = false;
    };
  }, [slug]);

  useEffect(() => {
    if (!TURNSTILE_SITE_KEY_VALID) return;
    let canceled = false;

    const handleSuccess = (token: string) => {
      if (canceled) return;
      setCaptchaToken(token);
      setCaptchaReady(true);
      tokenResolverRef.current?.(token);
      tokenResolverRef.current = null;
      tokenRejectorRef.current = null;
    };

    const handleExpired = () => {
      if (canceled) return;
      setCaptchaToken('');
      setCaptchaReady(true);
    };

    const handleError = () => {
      if (canceled) return;
      setCaptchaReady(false);
      tokenRejectorRef.current?.(new Error('Security verification failed. Please retry.'));
      tokenResolverRef.current = null;
      tokenRejectorRef.current = null;
    };

    const renderWidget = () => {
      if (canceled) return;
      if (!window.turnstile || !captchaContainerRef.current) {
        setTimeout(renderWidget, 120);
        return;
      }
      if (widgetIdRef.current) return;

      try {
        widgetIdRef.current = window.turnstile.render(captchaContainerRef.current, {
          sitekey: TURNSTILE_SITE_KEY,
          size: 'invisible',
          action: 'comment_submit',
          callback: handleSuccess,
          'expired-callback': handleExpired,
          'error-callback': handleError,
        });
        setCaptchaReady(true);
      } catch (error) {
        console.error('[CommentsSection] Turnstile render failed:', error);
        setCaptchaReady(false);
      }
    };

    renderWidget();

    return () => {
      canceled = true;
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
      }
      widgetIdRef.current = null;
      tokenResolverRef.current = null;
      tokenRejectorRef.current = null;
    };
  }, []);

  const commentCountLabel = useMemo(() => {
    if (comments.length === 1) return '1 Comment';
    return `${comments.length} Comments`;
  }, [comments.length]);

  const requestCaptchaToken = async () => {
    if (!TURNSTILE_SITE_KEY_VALID) return '';
    if (captchaToken) return captchaToken;

    if (!window.turnstile || !widgetIdRef.current) {
      throw new Error('Security check is still loading. Please try again.');
    }

    return await new Promise<string>((resolve, reject) => {
      tokenResolverRef.current = resolve;
      tokenRejectorRef.current = reject;
      window.turnstile?.execute(widgetIdRef.current!);

      setTimeout(() => {
        if (tokenRejectorRef.current === reject) {
          tokenResolverRef.current = null;
          tokenRejectorRef.current = null;
          reject(new Error('Security check timed out. Please retry.'));
        }
      }, 12000);
    });
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage(null);

    try {
      const token = await requestCaptchaToken();

      const response = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug,
          name: form.name,
          email: form.email,
          content: form.content,
          company: form.company,
          source: 'article',
          captchaToken: token,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setMessage({ type: 'error', text: data.message || 'Comment was not published.' });
        return;
      }

      const comment = data.comment as PublicComment | undefined;
      if (comment) {
        setComments(prev => [comment, ...prev]);
      }

      setForm(initialForm);
      setMessage({ type: 'success', text: data.message || 'Thanks. Your comment is live.' });
    } catch (error) {
      console.error('[CommentsSection] Submit failed:', error);
      const msg = error instanceof Error ? error.message : 'Network error. Please try again.';
      setMessage({ type: 'error', text: msg });
    } finally {
      if (TURNSTILE_SITE_KEY_VALID && widgetIdRef.current && window.turnstile) {
        window.turnstile.reset(widgetIdRef.current);
      }
      setCaptchaToken('');
      setIsSubmitting(false);
    }
  };

  return (
    <section className="reveal-up reveal-delay-3 rounded-[2rem] border border-[var(--line)] bg-white/92 p-6 sm:p-8">
      {TURNSTILE_SITE_KEY_VALID && (
        <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" strategy="afterInteractive" />
      )}

      <div className="mb-6 flex items-center justify-between border-b border-[var(--line)] pb-4">
        <h2 className="text-3xl font-bold">Discussion</h2>
        <span className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--muted)]">{commentCountLabel}</span>
      </div>

      <form onSubmit={handleSubmit} className="grid gap-3 rounded-2xl border border-[var(--line)] bg-[var(--surface-soft)] p-4 sm:grid-cols-2 sm:p-5">
        <input
          type="text"
          name="name"
          required
          maxLength={60}
          value={form.name}
          onChange={event => setForm(prev => ({ ...prev, name: event.target.value }))}
          placeholder="Name"
          className="rounded-xl border border-[var(--line)] bg-white px-4 py-3 text-sm text-[var(--c-ink)] outline-none focus:border-[var(--c-accent)]"
        />
        <input
          type="email"
          name="email"
          maxLength={120}
          value={form.email}
          onChange={event => setForm(prev => ({ ...prev, email: event.target.value }))}
          placeholder="Email (optional)"
          className="rounded-xl border border-[var(--line)] bg-white px-4 py-3 text-sm text-[var(--c-ink)] outline-none focus:border-[var(--c-accent)]"
        />
        <input
          type="text"
          name="company"
          value={form.company}
          onChange={event => setForm(prev => ({ ...prev, company: event.target.value }))}
          tabIndex={-1}
          autoComplete="off"
          className="hidden"
          aria-hidden="true"
        />
        <div ref={captchaContainerRef} className="hidden" aria-hidden="true" />
        <textarea
          name="content"
          required
          minLength={12}
          maxLength={2000}
          rows={5}
          value={form.content}
          onChange={event => setForm(prev => ({ ...prev, content: event.target.value }))}
          placeholder="Add your perspective..."
          className="sm:col-span-2 rounded-xl border border-[var(--line)] bg-white px-4 py-3 text-sm text-[var(--c-ink)] outline-none focus:border-[var(--c-accent)]"
        />
        <div className="sm:col-span-2 flex items-center justify-between gap-4">
          <p className="text-xs text-[var(--muted)]">Be specific and constructive. Comments are public.</p>
          <button
            type="submit"
            disabled={isSubmitting || !captchaReady}
            className="rounded-xl bg-[var(--c-ink)] px-5 py-3 text-xs font-bold uppercase tracking-[0.16em] text-white transition hover:bg-[#0a446a] disabled:cursor-wait disabled:opacity-65"
          >
            {isSubmitting ? 'Publishing...' : 'Post Comment'}
          </button>
        </div>
      </form>

      {message && (
        <p className={`mt-3 text-sm ${message.type === 'error' ? 'text-red-600' : 'text-emerald-700'}`}>
          {message.text}
        </p>
      )}

      <div className="mt-6 space-y-4">
        {isLoading && <p className="text-sm text-[var(--muted)]">Loading comments...</p>}
        {!isLoading && comments.length === 0 && (
          <p className="text-sm text-[var(--muted)]">No comments yet. Start the discussion.</p>
        )}
        {comments.map(comment => (
          <article key={comment.id} className="rounded-2xl border border-[var(--line)] bg-white p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-base font-bold text-[var(--c-ink)]">{comment.name}</h3>
              <time className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
                {new Date(comment.createdAt).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </time>
            </div>
            <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-[var(--muted)]">{comment.content}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
