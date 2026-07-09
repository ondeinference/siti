import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact",
  description: "Get in touch with the Siti AI team for support or press.",
};

const SUPPORT_EMAIL = "support@getsiti.5mb.app";

export default function ContactPage() {
  return (
    <article className="mx-auto max-w-3xl px-6 py-20">
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
        Contact
      </h1>
      <div className="prose-legal mt-8">
        <p>
          We&apos;d love to hear from you. Whether you have a question, found a
          bug, or want to share feedback, reach out and a real person will get
          back to you.
        </p>
        <h2>Support</h2>
        <p>
          For help with the app, email{" "}
          <a href={`mailto:${SUPPORT_EMAIL}`} className="text-brand">
            {SUPPORT_EMAIL}
          </a>
          .
        </p>
        <h2>Press &amp; partnerships</h2>
        <p>
          For press or partnership inquiries, use the same address and we&apos;ll
          route your message to the right place.
        </p>
      </div>
    </article>
  );
}
