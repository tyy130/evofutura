import NewsletterForm from '@/components/NewsletterForm';

export default function SubscribePage() {
  return (
    <div className="max-w-2xl mx-auto text-center space-y-10 py-20">
      <div className="space-y-6">
        <h1 className="text-5xl md:text-7xl font-heading font-extrabold text-slate-950 tracking-tighter">
          Join the Inner Circle.
        </h1>
        <p className="text-xl text-slate-600 leading-relaxed">
          EvoFutura provides high-signal intelligence for software architects and engineering leaders. No fluff, just patterns.
        </p>
      </div>

      <div className="bg-slate-50 p-8 rounded-3xl border border-slate-100 shadow-xl space-y-6">
        <NewsletterForm location="subscribe-page" variant="light" placeholder="name@company.com" />
        <p className="text-xs text-slate-400">
          We respect your inbox. Unsubscribe at any time.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4 text-center border-t border-slate-100 pt-10">
        <div>
          <p className="text-2xl font-bold text-slate-950">50k+</p>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Readers</p>
        </div>
        <div>
          <p className="text-2xl font-bold text-slate-950">Weekly</p>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Updates</p>
        </div>
        <div>
          <p className="text-2xl font-bold text-slate-950">100%</p>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Signal</p>
        </div>
      </div>
    </div>
  );
}
