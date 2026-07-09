import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How Siti AI handles your data: on-device by design.",
};

const LAST_UPDATED = "June 13, 2026";

export default function PrivacyPage() {
  return (
    <article className="mx-auto max-w-3xl px-6 py-20">
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
        Privacy Policy
      </h1>
      <p className="mt-2 text-sm text-muted">Last updated: {LAST_UPDATED}</p>
      <div className="prose-legal mt-8">
        <p>
          Siti AI (&quot;Siti&quot;, &quot;we&quot;, &quot;us&quot;) is built so
          that your data stays on your device. This policy explains what we do
          with your information, and, just as important, what we don&apos;t do.
        </p>

        <h2>Data processed on your device</h2>
        <p>
          Your prompts, conversations, and any content you provide to the
          assistant are processed locally on your Mac or iPhone. By default, this
          content is not transmitted to us or to any third party.
        </p>

        <h2>Information we do not collect</h2>
        <ul>
          <li>We do not require an account to use the app.</li>
          <li>We do not sell your personal information.</li>
          <li>
            We do not build advertising profiles from your conversations.
          </li>
        </ul>

        <h2>Optional network features</h2>
        <p>
          Some features may let you connect to external services at your
          request. When you explicitly enable such a feature, the relevant
          content is sent only to perform that action, and the third
          party&apos;s own privacy policy applies. These features are off unless
          you turn them on.
        </p>

        <h2>Diagnostics</h2>
        <p>
          If you opt in to share diagnostics, we may receive crash reports and
          anonymous usage metrics through Apple to help us improve the app. This
          data does not include the contents of your conversations. You can
          disable diagnostics at any time in your device settings.
        </p>

        <h2>Children&apos;s privacy</h2>
        <p>
          Siti is not directed to children under 13, and we do not knowingly
          collect personal information from them.
        </p>

        <h2>Changes to this policy</h2>
        <p>
          We may update this policy from time to time. Material changes will be
          reflected on this page with a new &quot;last updated&quot; date.
        </p>

        <h2>Contact</h2>
        <p>
          Questions about privacy? Email{" "}
          <a href="mailto:privacy@getsiti.5mb.app" className="text-brand">
            privacy@getsiti.5mb.app
          </a>
          .
        </p>
      </div>
    </article>
  );
}
