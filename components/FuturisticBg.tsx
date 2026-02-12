'use client';

export default function FuturisticBg() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none bg-slate-50/50">
      {/* Subtle Light Gradients */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-blue-100/40 blur-[120px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-100/40 blur-[150px]" />
      
      {/* Subtle Grid */}
      <div 
        className="absolute inset-0 opacity-[0.4]" 
        style={{
          backgroundImage: `radial-gradient(#e2e8f0 1px, transparent 1px)`,
          backgroundSize: '40px 40px'
        }}
      />
    </div>
  );
}