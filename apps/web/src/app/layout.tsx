import Link from "next/link";
import "./globals.css";
export const metadata = {
  title: "Port Intelligence | InvestingPro",
  description: "Verified Vietnam port catalog and company asset evidence",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <a className="skip" href="#main">
          Skip to content
        </a>
        <header>
          <Link className="brand" href="/industries/ports">
            InvestingPro <span>PORT INTELLIGENCE</span>
          </Link>
          <nav aria-label="Main navigation">
            <Link href="/industries/ports">Catalog</Link>
            <Link href="/industries/ports/companies">Listed companies</Link>
            <Link href="/admin/mappings">Mapping review</Link>
          </nav>
        </header>
        <main id="main">{children}</main>
        <footer>
          Official evidence. Effective dates. Transparent coverage.
        </footer>
      </body>
    </html>
  );
}
