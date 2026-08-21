import { Link, createFileRoute } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MarketingLayout } from "@/components/marketing-layout";
import { ArrowRight, BarChart3, Building2, Calculator, CheckCircle2, ClipboardList, HardHat, House, LineChart, Play, Search, ShieldCheck, Sparkles, Users, Workflow } from "lucide-react";
import { LIFECYCLE_STEPS, PROFILE_ROLES } from "@/lib/canons";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [
    { title: "Boliviq | Real Estate & Construction Operating System" },
    { name: "description", content: "One connected platform for homeowners, contractors, realtors, investors, lenders, and the professionals who close, build, and manage property." },
  ]}),
  component: Landing,
});

const pillars = LIFECYCLE_STEPS.map((s, i) => {
  const icons = [Search, Users, LineChart, Calculator, HardHat, ClipboardList];
  return { icon: icons[i] ?? Search, title: s.label, subtitle: s.detail };
});

const capabilities = [
  { icon: Search, title: "Marketplace", text: "Craigslist-simple listings for homes, off-market deals, repairs, trades, lending, and materials — with in-platform messaging." },
  { icon: Sparkles, title: "Connected CRM", text: "A homeowner repair post becomes a contractor lead. An estimate becomes a project. An accepted offer becomes a transaction." },
  { icon: ShieldCheck, title: "Trust & verification", text: "Identity, license, insurance, and Boliviq certified are distinct badges. None of them guarantee a person's services." },
  { icon: Workflow, title: "AI agents with credits", text: "Role-aware assistants that cannot send messages, sign, move money, or publish listings without authorization." },
];

const platformFeatures = [
  "Role-based profiles for 17 account types",
  "Marketplace and professional directory",
  "CRM pipeline from new lead to close",
  "Projects, documents, and messages on one record",
  "Deal analysis and construction estimating",
  "Subscriptions, AI credits, and admin controls",
];

function Landing() {
  const roles = PROFILE_ROLES.filter((r) => r.id !== "administrator");
  return (
    <MarketingLayout>
      <section className="relative isolate overflow-hidden bg-[#071729] text-white">
        <div className="absolute inset-0 bg-[linear-gradient(90deg,#071729_0%,rgba(7,23,41,.97)_38%,rgba(7,23,41,.55)_72%,rgba(7,23,41,.35)_100%),url('/boliviq-hero-house.webp')] bg-cover bg-[center_right]" />
        <div className="absolute inset-0 brand-grid opacity-40" />
        <div className="relative mx-auto grid min-h-[660px] max-w-7xl items-center gap-12 px-6 py-20 lg:grid-cols-[1.08fr_.92fr] lg:px-8">
          <div className="max-w-3xl">
            <div className="brand-eyebrow mb-5 flex items-center gap-2"><Sparkles className="h-4 w-4" /> Real estate + construction community OS</div>
            <h1 className="font-display text-5xl font-extrabold leading-[1.03] tracking-tight sm:text-6xl lg:text-7xl">Find. Connect.<br/><span className="text-[#7ccc35]">Build. Close. Manage.</span></h1>
            <p className="mt-7 max-w-xl text-lg leading-8 text-white/72">Boliviq is one operating system for homeowners, contractors, realtors, investors, wholesalers, lenders, property managers, inspectors, title, insurance, attorneys, designers, and suppliers.</p>
            <div className="mt-9 flex flex-wrap gap-4">
              <Link to="/auth"><Button size="lg" className="h-13 bg-[#70bf2b] px-7 text-base font-bold hover:bg-[#80ce38]">Start Your Free Plan <ArrowRight className="ml-2 h-5 w-5" /></Button></Link>
              <Link to="/marketplace"><Button size="lg" variant="outline" className="h-13 border-white/45 bg-white/5 px-7 text-base text-white hover:bg-white/10 hover:text-white"><Play className="mr-2 h-4 w-4 fill-current" /> Open Marketplace</Button></Link>
            </div>
            <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {pillars.slice(0, 6).map((p) => <div key={p.title} className="flex items-start gap-3"><div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-[#70bf2b]/35 bg-[#70bf2b]/10"><p.icon className="h-5 w-5 text-[#80ce38]" /></div><div><div className="font-bold">{p.title}</div><div className="text-xs text-white/55">{p.subtitle}</div></div></div>)}
            </div>
          </div>
          <div className="hidden justify-self-end lg:block">
            <div className="brand-panel-dark w-[360px] p-6">
              <div className="flex items-center justify-between border-b border-white/10 pb-4"><div className="font-display text-lg font-bold">Connected lifecycle</div><BarChart3 className="h-5 w-5 text-[#7ccc35]" /></div>
              <div className="mt-6 text-sm text-white/55">Repair post → contractor lead</div><div className="mt-1 text-4xl font-extrabold text-[#7ccc35]">One record</div>
              <div className="mt-8 grid grid-cols-2 gap-3"><Metric label="Roles" value="17"/><Metric label="Categories" value="20"/></div>
              <div className="mt-6 rounded-xl border border-white/10 bg-white/[.035] p-4"><div className="flex h-24 items-end gap-2">{[25,34,42,38,55,62,76,88].map((h,i)=><div key={i} className="flex-1 rounded-t bg-gradient-to-t from-[#4b8f18] to-[#88dc39]" style={{height:`${h}%`}} />)}</div></div>
            </div>
          </div>
        </div>
        <div className="relative mx-auto max-w-7xl px-6 pb-8 lg:px-8"><div className="grid overflow-hidden rounded-2xl border border-white/15 bg-[#0b1d33]/85 sm:grid-cols-2 lg:grid-cols-4">{[[Users,"Every role","Owners to trades"],[Building2,"Marketplace","Homes, repairs, services"],[Calculator,"Analyze + finance","Estimates, not appraisals"],[ShieldCheck,"Verified","Badges ≠ guarantees"]].map(([I,v,l]:any)=><div key={l} className="flex items-center gap-4 border-white/10 p-5 not-last:border-r"><I className="h-9 w-9 text-[#70bf2b]"/><div><div className="text-2xl font-extrabold">{v}</div><div className="text-sm text-white/55">{l}</div></div></div>)}</div></div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-24 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-[.75fr_1.25fr] lg:items-start">
          <div><div className="brand-eyebrow">All-in-one platform</div><h2 className="mt-3 text-4xl font-extrabold tracking-tight">Not only a listing site. A connected business ecosystem.</h2><p className="mt-5 text-base leading-7 text-slate-600">Information entered once is reused across listings, leads, estimates, projects, financing, contracts, and AI workflows — without exposing it to anyone who should not see it.</p><Link to="/features"><Button className="mt-7 bg-[#70bf2b] hover:bg-[#80ce38]">Explore All Features <ArrowRight className="ml-2 h-4 w-4"/></Button></Link></div>
          <div className="grid gap-5 sm:grid-cols-2">{capabilities.map(c=><Card key={c.title} className="brand-panel border-0"><CardContent className="p-7"><div className="grid h-12 w-12 place-items-center rounded-xl bg-[#071729]"><c.icon className="h-6 w-6 text-[#7ccc35]"/></div><h3 className="mt-5 text-xl font-bold">{c.title}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{c.text}</p></CardContent></Card>)}</div>
        </div>
      </section>

      <section className="bg-[#0b1d33] py-24 text-white">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="brand-eyebrow">Built for the whole community</div>
          <h2 className="mt-3 text-4xl font-extrabold">Every major profile, one login.</h2>
          <p className="mt-5 max-w-2xl leading-7 text-white/65">Homeowners stay free for core marketplace participation. Professionals get workspaces, CRM, verification, and shared AI credits.</p>
          <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {roles.map((r) => (
              <div key={r.id} className="rounded-xl border border-white/10 bg-white/[.035] p-4">
                <div className="font-bold">{r.label}</div>
                <div className="mt-1 text-xs text-white/55">{r.description}</div>
              </div>
            ))}
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2">{platformFeatures.map(f=><div key={f} className="flex items-center gap-3 text-sm font-medium"><CheckCircle2 className="h-5 w-5 text-[#7ccc35]"/>{f}</div>)}</div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-24 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-4">
          <DarkLite icon={House} title="Real estate" text="List, buy, wholesale, and manage property." />
          <DarkLite icon={HardHat} title="Construction" text="Bid, estimate, schedule, and deliver the work." />
          <DarkLite icon={Calculator} title="Finance" text="Analyze deals and collect closing documents." />
          <DarkLite icon={Users} title="Professionals" text="Directory, verification, and in-platform messaging." />
        </div>
      </section>

      <section className="px-6 py-24"><div className="mx-auto max-w-5xl overflow-hidden rounded-3xl bg-gradient-to-br from-[#071729] to-[#12345a] p-10 text-center text-white shadow-2xl sm:p-16"><div className="brand-eyebrow">Start on one record</div><h2 className="mt-3 text-4xl font-extrabold">Your next property, person, and project belong together.</h2><p className="mx-auto mt-4 max-w-2xl text-white/65">Create a Boliviq account and join the marketplace, CRM, verification, and AI workspace used across the real estate and construction lifecycle.</p><div className="mt-8 flex flex-wrap justify-center gap-3"><Link to="/auth"><Button size="lg" className="bg-[#70bf2b] hover:bg-[#80ce38]">Start Free <ArrowRight className="ml-2 h-4 w-4"/></Button></Link><Link to="/pricing"><Button size="lg" variant="outline" className="border-white/35 bg-transparent text-white hover:bg-white/10 hover:text-white">View Pricing</Button></Link></div></div></section>
    </MarketingLayout>
  );
}

function Metric({label,value}:{label:string;value:string}) { return <div className="rounded-xl bg-white/5 p-4"><div className="text-xs text-white/50">{label}</div><div className="mt-1 text-xl font-bold text-[#7ccc35]">{value}</div></div> }
function DarkLite({icon:Icon,title,text}:{icon:any;title:string;text:string}) { return <div className="rounded-2xl border bg-white p-6 shadow-sm"><Icon className="h-6 w-6 text-[#70bf2b]"/><div className="mt-3 font-bold">{title}</div><div className="mt-1 text-sm text-slate-600">{text}</div></div> }
