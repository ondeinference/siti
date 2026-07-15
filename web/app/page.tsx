import Link from "next/link";
import { AppScreenshots } from "@/components/app-screenshots";
import { StoreBadges } from "@/components/store-badges";

const features = [
  {
    title: "On-device by default",
    body: "Siti runs its models on your Mac or iPhone. Your prompts and conversations don't leave the device unless you decide to send them somewhere.",
  },
  {
    title: "No account required",
    body: "Open the app and start typing. There's no sign-up to get through, and nothing about your questions is stored in the cloud.",
  },
  {
    title: "Built for macOS and iOS",
    body: "It's a native app on both, so it behaves the way the rest of your Apple devices already do.",
  },
];

export default function HomePage() {
  return (
    <>
      <section className="mx-auto max-w-5xl px-6 py-24 text-center">
        <p className="mb-4 text-xs font-semibold uppercase tracking-[0.15em] text-brand">
          Personal assistant
        </p>
        <h1 className="mx-auto max-w-3xl text-4xl font-semibold tracking-tight sm:text-6xl">
          An assistant that runs{" "}
          <span className="text-brand">entirely on your device.</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-muted">
          Siti runs on your iPhone, iPad, and Mac. Ask it anything, and your
          conversations stay with you instead of on someone else&apos;s servers.
        </p>
        <div className="mt-10 flex flex-col items-center justify-center gap-6">
          <StoreBadges />
          <Link
            href="/about"
            className="rounded-sm border border-border px-6 py-3 text-sm font-medium text-ink transition-colors hover:bg-surface"
          >
            Learn more
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 pb-4">
        <div className="grid gap-6 sm:grid-cols-3">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="rounded-card border border-border bg-surface p-6"
            >
              <h2 className="text-lg font-semibold tracking-tight text-ink">
                {feature.title}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                {feature.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      <AppScreenshots />
    </>
  );
}
