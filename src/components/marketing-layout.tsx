import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { BrandLogo } from "@/components/brand-logo";
import { Menu, ArrowRight } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import type { ReactNode } from "react";

const navLinks = [
  { to: "/features", label: "Features" },
  { to: "/pricing", label: "Pricing" },
  { to: "/demo", label: "Demo" },
  { to: "/about", label: "About" },
  { to: "/contact", label: "Contact" },
] as const;

export function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#f5f7fa] text-[#0b1d33]">
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#071729]/95 text-white shadow-lg backdrop-blur-xl">
        <div className="mx-auto flex h-[76px] max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link to="/" className="transition-opacity hover:opacity-90"><BrandLogo inverse showTagline /></Link>
          <nav className="hidden items-center gap-8 lg:flex">
            {navLinks.map((l) => (
              <Link key={l.to} to={l.to} className="text-sm font-medium text-white/75 transition-colors hover:text-white [&.active]:text-[#86d43c]">
                {l.label}
              </Link>
            ))}
          </nav>
          <div className="hidden items-center gap-3 sm:flex">
            <Link to="/auth"><Button variant="ghost" className="text-white hover:bg-white/10 hover:text-white">Log in</Button></Link>
            <Link to="/auth"><Button className="bg-[#70bf2b] text-white shadow-lg shadow-lime-950/20 hover:bg-[#80ce38]">Get Started <ArrowRight className="ml-1 h-4 w-4" /></Button></Link>
          </div>
          <Sheet>
            <SheetTrigger asChild><Button variant="ghost" size="icon" className="text-white sm:hidden"><Menu /></Button></SheetTrigger>
            <SheetContent side="right" className="border-white/10 bg-[#071729] text-white">
              <BrandLogo inverse showTagline />
              <div className="mt-10 grid gap-2">
                {navLinks.map((l) => <Link key={l.to} to={l.to} className="rounded-lg px-3 py-3 text-lg font-semibold hover:bg-white/10">{l.label}</Link>)}
                <Link to="/auth" className="mt-4"><Button className="w-full bg-[#70bf2b] hover:bg-[#80ce38]">Get Started</Button></Link>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </header>
      <main>{children}</main>
      <footer className="border-t border-white/10 bg-[#071729] text-white">
        <div className="mx-auto grid max-w-7xl gap-10 px-6 py-14 md:grid-cols-[1.5fr_1fr_1fr_1fr]">
          <div><BrandLogo inverse showTagline /><p className="mt-5 max-w-sm text-sm leading-6 text-white/60">One professional platform for finding real estate opportunities, analyzing investments, estimating construction, and managing every deal from lead to completion.</p></div>
          <FooterCol title="Platform" links={[["/features","Features"],["/pricing","Pricing"],["/demo","Product Demo"],["/faq","FAQ"]]} />
          <FooterCol title="Company" links={[["/about","About"],["/contact","Contact"],["/help","Help Center"]]} />
          <FooterCol title="Legal" links={[["/terms","Terms"],["/privacy","Privacy"],["/acceptable-use","Acceptable Use"],["/disclaimer","Disclaimer"],["/cookies","Cookies"]]} />
        </div>
        <div className="border-t border-white/10 px-6 py-6 text-center text-xs text-white/45">© 2026 Boliviq. All rights reserved. Investment and construction estimates should be independently verified.</div>
      </footer>
    </div>
  );
}

function FooterCol({ title, links }: { title: string; links: [string, string][] }) {
  return <div><div className="font-display text-sm font-bold uppercase tracking-[.14em] text-[#86d43c]">{title}</div><ul className="mt-4 space-y-3 text-sm">{links.map(([to,label]) => <li key={to}><Link to={to} className="text-white/60 transition-colors hover:text-white">{label}</Link></li>)}</ul></div>;
}
