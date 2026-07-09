import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About",
  description:
    "Siti AI is a private, on-device AI assistant for Apple platforms, built by the team behind Rumi.",
};

export default function AboutPage() {
  return (
    <article className="mx-auto max-w-3xl px-6 py-20">
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
        About Siti AI
      </h1>
      <div className="prose-legal mt-8">
        <p>
          Siti AI is a private, on-device AI assistant for macOS and iOS. The
          idea behind it is simple: the device you keep closest to you should
          also be the one that keeps your data private. What you type into Siti
          stays yours, and using AI shouldn&apos;t be the price you pay to give
          that up.
        </p>
        <p>
          Most assistants send everything you type to a remote server. Siti is
          designed to keep your data on your device instead. The name is a wink
          at the assistant you already know, rebuilt around privacy.
        </p>
        <p>
          Siti is a sibling project to{" "}
          <a
            href="https://apps.apple.com/se/app/rumi-learn-persian/id6753832408?l=en-GB"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-brand underline decoration-brand/30 underline-offset-2 transition-colors hover:decoration-brand"
          >
            Rumi Learn Persian
          </a>{" "}
          and{" "}
          <a
            href="https://apps.apple.com/se/app/smbcloud-mailx/id6766108771?l=en-GB"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-brand underline decoration-brand/30 underline-offset-2 transition-colors hover:decoration-brand"
          >
            smbCloud MailX
          </a>
          , and they share the same focus: careful, on-device apps for Apple
          platforms. We are a small team, and we sweat the details.
        </p>
      </div>
    </article>
  );
}
