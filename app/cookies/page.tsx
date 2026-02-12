export const metadata = {
  title: 'Cookie Policy | EvoFutura',
  description: 'Understanding how we use cookies and tracking technologies.',
};

export default function CookiePage() {
  return (
    <div className="max-w-3xl mx-auto pb-20">
      <header className="mb-16 border-b border-slate-100 pb-12">
        <h1 className="text-5xl font-heading font-extrabold text-slate-950 tracking-tight mb-6">
          Cookie Policy
        </h1>
        <p className="text-xl text-slate-500 font-medium">
          Transparent tracking for a better web.
        </p>
      </header>

      <div className="prose prose-slate prose-lg max-w-none 
        prose-headings:font-heading prose-headings:font-bold prose-headings:text-slate-950
        prose-p:text-slate-600 prose-p:leading-relaxed
        prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline
      ">
        <p>
          This Cookie Policy explains how EvoFutura uses cookies and similar technologies to recognize you when you visit our website.
        </p>

        <h3>1. What are Cookies?</h3>
        <p>
          Cookies are small data files that are placed on your computer or mobile device when you visit a website. They are widely used by website owners to make their websites work, or to work more efficiently, as well as to provide reporting information.
        </p>

        <h3>2. Why We Use Cookies</h3>
        <p>
          We use cookies for several reasons:
        </p>
        <ul>
          <li><strong>Essential Cookies:</strong> These are strictly necessary to provide you with services available through our website and to use some of its features, such as access to secure areas.</li>
          <li><strong>Performance & Analytics Cookies:</strong> These cookies collect information that is used either in aggregate form to help us understand how our website is being used (e.g., Google Analytics) or how effective our marketing campaigns are.</li>
          <li><strong>Functionality Cookies:</strong> These allow our site to remember choices you make (such as your user name, language or the region you are in) and provide enhanced, more personal features.</li>
        </ul>

        <h3>3. Controlling Cookies</h3>
        <p>
          You have the right to decide whether to accept or reject cookies. You can set or amend your web browser controls to accept or refuse cookies. If you choose to reject cookies, you may still use our website though your access to some functionality and areas of our website may be restricted.
        </p>

        <h3>4. Third-Party Cookies</h3>
        <p>
          In addition to our own cookies, we may also use various third-parties cookies to report usage statistics of the Service, deliver advertisements on and through the Service, and so on.
        </p>

        <h3>5. Updates to This Policy</h3>
        <p>
          We may update this Cookie Policy from time to time in order to reflect, for example, changes to the cookies we use or for other operational, legal, or regulatory reasons. Please therefore re-visit this Cookie Policy regularly to stay informed about our use of cookies and related technologies.
        </p>
      </div>
    </div>
  );
}
