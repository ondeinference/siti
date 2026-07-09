import Link from "next/link";

const links = [{ href: "/about", label: "About" }];

export function SiteNav() {
  return (
    <header className="sticky top-0 z-10 border-b border-border bg-bg/80 backdrop-blur">
      <nav className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
        <Link
          href="/"
          className="text-[17px] font-semibold tracking-tight text-ink"
        >
          Siti<span className="text-brand"> AI</span>
        </Link>
        <ul className="flex items-center gap-6 text-sm text-muted">
          {links.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className="transition-colors hover:text-ink"
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}
