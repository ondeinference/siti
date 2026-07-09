import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-5xl flex-col gap-4 px-6 py-10 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
        <p>© {new Date().getFullYear()} Siti AI. All rights reserved.</p>
        <ul className="flex gap-6">
          <li>
            <Link href="/privacy" className="hover:text-ink">
              Privacy
            </Link>
          </li>
          <li>
            <Link href="/terms" className="hover:text-ink">
              Terms
            </Link>
          </li>
          <li>
            <Link href="/contact" className="hover:text-ink">
              Contact
            </Link>
          </li>
        </ul>
      </div>
    </footer>
  );
}
