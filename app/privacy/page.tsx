import Link from 'next/link';

export const metadata = {
  title: 'Privacy Policy | EvoFutura',
  description: 'How we collect, use, and protect your data.',
};

export default function PrivacyPage() {
  return (
    <div className="max-w-3xl mx-auto pb-20">
      <header className="mb-16 border-b border-slate-100 pb-12">
        <h1 className="text-5xl font-heading font-extrabold text-slate-950 tracking-tight mb-6">
          Privacy Policy
        </h1>
        <p className="text-xl text-slate-500 font-medium">
          Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
        </p>
      </header>

      <div className="prose prose-slate prose-lg max-w-none 
        prose-headings:font-heading prose-headings:font-bold prose-headings:text-slate-950
        prose-p:text-slate-600 prose-p:leading-relaxed
        prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline
      ">
        <p>
          At EvoFutura, we believe that privacy is fundamental to a healthy internet. This policy outlines exactly what we collect, why we collect it, and how we treat your data. We design our systems to minimize data collection by default.
        </p>

        <h3>1. Information We Collect</h3>
        <p>
          We collect only the information necessary to provide our services:
        </p>
        <ul>
          <li><strong>Newsletter Data:</strong> When you subscribe to &ldquo;The Insight Loop,&rdquo; we collect your email address. This is stored securely in our database and used solely for delivering weekly technical analysis.</li>
          <li><strong>Usage Data:</strong> We use privacy-preserving analytics (Google Analytics) to understand which articles resonate with our audience. This data is aggregated and anonymized.</li>
          <li><strong>Device Information:</strong> We may collect standard log data such as your browser type and IP address for security and abuse prevention.</li>
        </ul>

        <h3>2. How We Use Your Information</h3>
        <p>
          Your data is used for the following purposes:
        </p>
        <ul>
          <li><strong>Delivery:</strong> Sending you the content you requested.</li>
          <li><strong>Optimization:</strong> improving the performance and UX of the website based on aggregated traffic patterns.</li>
          <li><strong>Security:</strong> Protecting our infrastructure from bot attacks and unauthorized access.</li>
        </ul>

        <h3>3. Data Storage & Security</h3>
        <p>
          We utilize industry-standard encryption (TLS) for data in transit and robust access controls for data at rest. Your email address is stored in a secure database managed by our internal systems and is never sold to third-party brokers.
        </p>

        <h3>4. Cookies & Tracking</h3>
        <p>
          We use essential cookies to ensure the site functions correctly. For details on how to manage your preferences, please view our <Link href="/cookies">Cookie Policy</Link>.
        </p>

        <h3>5. Your Rights</h3>
        <p>
          You have the right to:
        </p>
        <ul>
          <li>Request a copy of the personal data we hold about you.</li>
          <li>Request correction of any incorrect data.</li>
          <li>Request deletion of your data (&ldquo;Right to be Forgotten&rdquo;).</li>
          <li>Unsubscribe from our communications at any time via the link in the footer of our emails.</li>
        </ul>

        <h3>6. Contact Us</h3>
        <p>
          If you have questions about this policy or our data practices, please contact our Data Protection Officer at <a href="mailto:privacy@evofutura.com">privacy@evofutura.com</a>.
        </p>
      </div>
    </div>
  );
}
