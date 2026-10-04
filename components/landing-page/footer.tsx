import Link from "next/link";

const groups = [
  {
    label: "Product",
    links: [
      { label: "Features", href: "/#features" },
      { label: "Pricing", href: "/#pricing" },
      { label: "Sign in", href: "/login" },
    ],
  },
  {
    label: "Company",
    links: [
      { label: "About", href: "/about" },
      { label: "Contact", href: "/contact" },
      { label: "Security", href: "/security" },
    ],
  },
  {
    label: "Legal",
    links: [
      { label: "Privacy", href: "/privacy" },
      { label: "Terms", href: "/terms" },
      { label: "Cookies", href: "/cookies" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="landing-footer">
      <div className="landing-wrap">
        <div className="landing-footer-main">
          <div>
            <Link href="/" className="landing-brand" aria-label="Handoff home">
              <span className="landing-brand-glyph" aria-hidden="true">h</span>
              <span>Handoff</span>
            </Link>
            <p className="landing-footer-description">
              Project and client management for freelancers who want the work
              and the handoff in one place.
            </p>
          </div>

          <div className="landing-footer-links">
            {groups.map((group) => (
              <nav className="landing-footer-group" key={group.label} aria-label={`${group.label} links`}>
                <strong>{group.label}</strong>
                {group.links.map((link) => (
                  <Link href={link.href} key={link.href}>{link.label}</Link>
                ))}
                {group.label === "Company" && (
                  <Link href="https://github.com/codewithnuh/handoff" target="_blank" rel="noopener noreferrer">GitHub</Link>
                )}
              </nav>
            ))}
          </div>
        </div>

        <div className="landing-footer-bottom">
          <span>© {new Date().getFullYear()} Handoff</span>
          <span>Open source · Built for independent work</span>
        </div>
      </div>
    </footer>
  );
}
