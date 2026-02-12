export const metadata = {
  title: 'Terms of Service | EvoFutura',
  description: 'Rules and regulations for using the EvoFutura platform.',
};

export default function TermsPage() {
  return (
    <div className="max-w-3xl mx-auto pb-20">
      <header className="mb-16 border-b border-slate-100 pb-12">
        <h1 className="text-5xl font-heading font-extrabold text-slate-950 tracking-tight mb-6">
          Terms of Service
        </h1>
        <p className="text-xl text-slate-500 font-medium">
          Effective Date: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
        </p>
      </header>

      <div className="prose prose-slate prose-lg max-w-none 
        prose-headings:font-heading prose-headings:font-bold prose-headings:text-slate-950
        prose-p:text-slate-600 prose-p:leading-relaxed
        prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline
      ">
        <p>
          Welcome to EvoFutura. By accessing our website, subscribing to our newsletter, or using our services, you agree to be bound by these Terms of Service.
        </p>

        <h3>1. Acceptance of Terms</h3>
        <p>
          These Terms constitute a legally binding agreement between you and EvoFutura. If you do not agree to these terms, please do not access or use our services.
        </p>

        <h3>2. Intellectual Property</h3>
        <p>
          All content published on EvoFutura, including but not limited to articles, code snippets, graphics, logos, and software, is the property of EvoFutura or its content creators and is protected by international copyright laws.
        </p>
        <p>
          You may access and read the content for personal, non-commercial use. You may not reproduce, distribute, or create derivative works from our content without explicit written permission.
        </p>

        <h3>3. User Conduct</h3>
        <p>
          When using our platform, you agree not to:
        </p>
        <ul>
          <li>Use the service for any illegal purpose.</li>
          <li>Attempt to gain unauthorized access to our systems (&ldquo;hacking&rdquo;).</li>
          <li>Use automated scripts to scrape or collect data without permission.</li>
          <li>Harass, abuse, or harm other users or our staff.</li>
        </ul>

        <h3>4. Disclaimer of Warranties</h3>
        <p>
          Our content is provided &ldquo;as is&rdquo; for informational purposes only. While we strive for accuracy, particularly in our technical analysis, technology evolves rapidly. EvoFutura makes no warranties regarding the completeness, reliability, or accuracy of the information presented. Code snippets should be tested in a safe environment before production use.
        </p>

        <h3>5. Limitation of Liability</h3>
        <p>
          To the fullest extent permitted by law, EvoFutura shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising out of or relating to your use of our services.
        </p>

        <h3>6. Changes to Terms</h3>
        <p>
          We reserve the right to modify these terms at any time. We will provide notice of significant changes by updating the date at the top of this page. Your continued use of the service signifies your acceptance of the updated terms.
        </p>

        <h3>7. Governing Law</h3>
        <p>
          These terms are governed by the laws of the State of California, without regard to its conflict of law principles.
        </p>
      </div>
    </div>
  );
}
