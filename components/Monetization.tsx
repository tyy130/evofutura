export function AdSlot({ spot }: { spot: string }) {
  return (
    <div className="my-8 p-4 bg-gray-50 border border-dashed border-gray-300 rounded-lg text-center text-xs text-gray-400 uppercase tracking-widest">
      Advertisement Space: {spot}
    </div>
  );
}

export function AffiliateLink({ href, title, description }: { href: string; title: string; description: string }) {
  return (
    <a 
      href={href} 
      target="_blank" 
      rel="noopener noreferrer"
      className="block p-4 border border-blue-100 rounded-xl bg-white hover:border-blue-300 transition-colors my-6 no-underline"
    >
      <div className="flex items-start space-x-4">
        <div className="flex-shrink-0 bg-blue-100 p-2 rounded-lg text-blue-600">
          🛒
        </div>
        <div>
          <h4 className="text-sm font-bold text-gray-900 m-0">{title}</h4>
          <p className="text-xs text-gray-600 m-0">{description}</p>
        </div>
      </div>
    </a>
  );
}
