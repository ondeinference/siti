import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "The terms that govern your use of Siti AI.",
};

const LAST_UPDATED = "June 13, 2026";

export default function TermsPage() {
  return (
    <article className="mx-auto max-w-3xl px-6 py-20">
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
        Terms of Service
      </h1>
      <p className="mt-2 text-sm text-muted">Last updated: {LAST_UPDATED}</p>
      <div className="prose-legal mt-8">
        <p>
          These Terms of Service (&quot;Terms&quot;) govern your use of the Siti
          AI applications and this website. By using Siti, you agree to these
          Terms.
        </p>

        <h2>License</h2>
        <p>
          We grant you a personal, non-exclusive, non-transferable license to use
          Siti on devices you own or control, subject to these Terms and the
          applicable app store terms.
        </p>

        <h2>Acceptable use</h2>
        <ul>
          <li>Do not use Siti for any unlawful purpose.</li>
          <li>
            Do not attempt to reverse engineer, resell, or redistribute the app
            except as permitted by law.
          </li>
          <li>
            Do not use Siti to generate content that infringes the rights of
            others.
          </li>
        </ul>

        <h2>AI-generated content</h2>
        <p>
          Siti can generate text and other content. Generated output may be
          inaccurate or incomplete. You are responsible for reviewing output
          before relying on it, and you should not treat it as professional,
          legal, medical, or financial advice.
        </p>

        <h2>Disclaimer of warranties</h2>
        <p>
          Siti is provided &quot;as is&quot; without warranties of any kind, to
          the fullest extent permitted by law. We do not warrant that the app
          will be uninterrupted or error-free.
        </p>

        <h2>Limitation of liability</h2>
        <p>
          To the maximum extent permitted by law, Siti AI shall not be liable for
          any indirect, incidental, or consequential damages arising out of your
          use of the app.
        </p>

        <h2>Changes to these Terms</h2>
        <p>
          We may update these Terms from time to time. Continued use of Siti
          after changes take effect constitutes acceptance of the revised Terms.
        </p>

        <h2>Contact</h2>
        <p>
          Questions about these Terms? Email{" "}
          <a href="mailto:legal@getsiti.5mb.app" className="text-brand">
            legal@getsiti.5mb.app
          </a>
          .
        </p>
      </div>
    </article>
  );
}
