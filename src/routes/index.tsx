import { Link, createFileRoute } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MarketingLayout } from "@/components/marketing-layout";
import { ArrowRight, BarChart3, Building2, Calculator, CheckCircle2, ClipboardList, HardHat, House, LineChart, Play, Search, ShieldCheck, Sparkles, Users, Workflow } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [
    { title: "Boliviq | Real Estate & Construction Intelligence" },
    { name: "description", content: "Find better deals, analyze investments, estimate construction, and manage projects with Boliviq AI." },
  ]}),
  component: Landing,
});

const pillars = [
  { icon: Search, title: "Find", subtitle: "Off-market properties" },
  { icon: LineChart, title: "Analyze", subtitle: "Deals instantly" },
  { icon: HardHat, title: "Plan", subtitle: "Construction and costs" },
  { icon: ClipboardList, title: "Manage", subtitle: "Your entire pipeline" },
];

const capabilities = [
  { icon: Search, title: "Deal Finder", text: "Organize property opportunities, motivated sellers, contacts, and acquisition criteria in one place." },
  { icon: Sparkles, title: "AI Deal Analysis", text: "Evaluate flip, wholesale, rental, and BRRRR strategies with transparent assumptions and calculations." },
  { icon: HardHat, title: "Construction Planner", text: "Estimate repairs, materials, labor, scopes of work, and project costs with greater consistency." },
  { icon: Workflow, title: "Project Management", text: "Move every opportunity from lead to close, renovation, and completion with clear ownership and tasks." },
];

const platformFeatures = ["Property and lead CRM", "Offer and investment calculators", "Material and labor estimating", "AI reports and call preparation", "Team pipeline and permissions", "Automations and integrations"];

function Landing() {
  return (
    <MarketingLayout>
      <section className="relative isolate overflow-hidden bg-[#071729] text-white">
        <div className="absolute inset-0 bg-[linear-gradient(90deg,#071729_0%,rgba(7,23,41,.97)_38%,rgba(7,23,41,.55)_72%,rgba(7,23,41,.35)_100%),url('/boliviq-hero-house.webp')] bg-cover bg-[center_right]" />
        <div className="absolute inset-0 brand-grid opacity-40" />
        <div className="relative mx-auto grid min-h-[660px] max-w-7xl items-center gap-12 px-6 py-20 lg:grid-cols-[1.08fr_.92fr] lg:px-8">
          <div className="max-w-3xl">
            <div className="brand-eyebrow mb-5 flex items-center gap-2"><Sparkles className="h-4 w-4" /> Real estate and construction intelligence</div>
            <h1 className="font-display text-5xl font-extrabold leading-[1.03] tracking-tight sm:text-6xl lg:text-7xl">Find Better Deals.<br/><span className="text-[#7ccc35]">Build Bigger Profits.</span></h1>
            <p className="mt-7 max-w-xl text-lg leading-8 text-white/72">Boliviq brings property acquisition, deal analysis, construction planning, and project management into one professional AI-powered platform.</p>
            <div className="mt-9 flex flex-wrap gap-4">
              <Link to="/auth"><Button size="lg" className="h-13 bg-[#70bf2b] px-7 text-base font-bold hover:bg-[#80ce38]">Start Your Free Plan <ArrowRight className="ml-2 h-5 w-5" /></Button></Link>
              <Link to="/demo"><Button size="lg" variant="outline" className="h-13 border-white/45 bg-white/5 px-7 text-base text-white hover:bg-white/10 hover:text-white"><Play className="mr-2 h-4 w-4 fill-current" /> See How It Works</Button></Link>
            </div>
            <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {pillars.map((p) => <div key={p.title} className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-lg border border-[#70bf2b]/35 bg-[#70bf2b]/10"><p.icon className="h-5 w-5 text-[#80ce38]" /></div><div><div className="font-bold">{p.title}</div><div className="text-xs text-white/55">{p.subtitle}</div></div></div>)}
            </div>
          </div>
          <div className="hidden justify-self-end lg:block">
            <div className="brand-panel-dark w-[360px] p-6">
              <div className="flex items-center justify-between border-b border-white/10 pb-4"><div className="font-display text-lg font-bold">AI Deal Analyzer</div><BarChart3 className="h-5 w-5 text-[#7ccc35]" /></div>
              <div className="mt-6 text-sm text-white/55">Estimated Project Profit</div><div className="mt-1 text-4xl font-extrabold text-[#7ccc35]">$68,500</div>
              <div className="mt-8 grid grid-cols-2 gap-3"><Metric label="ROI" value="28.4%"/><Metric label="Deal Score" value="91/100"/></div>
              <div className="mt-6 rounded-xl border border-white/10 bg-white/[.035] p-4"><div className="flex h-24 items-end gap-2">{[25,34,42,38,55,62,76,88].map((h,i)=><div key={i} className="flex-1 rounded-t bg-gradient-to-t from-[#4b8f18] to-[#88dc39]" style={{height:`${h}%`}} />)}</div></div>
            </div>
          </div>
        </div>
        <div className="relative mx-auto max-w-7xl px-6 pb-8 lg:px-8"><div className="grid overflow-hidden rounded-2xl border border-white/15 bg-[#0b1d33]/85 sm:grid-cols-2 lg:grid-cols-4">{[[Users,"10K+","Active investors"],[Building2,"5M+","Properties analyzed"],[Calculator,"$2B+","Deals evaluated"],[ShieldCheck,"98%","Customer satisfaction"]].map(([I,v,l]:any)=><div key={l} className="flex items-center gap-4 border-white/10 p-5 not-last:border-r"><I className="h-9 w-9 text-[#70bf2b]"/><div><div className="text-2xl font-extrabold">{v}</div><div className="text-sm text-white/55">{l}</div></div></div>)}</div></div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-24 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-[.75fr_1.25fr] lg:items-start">
          <div><div className="brand-eyebrow">All-in-one platform</div><h2 className="mt-3 text-4xl font-extrabold tracking-tight">Everything you need to win in real estate.</h2><p className="mt-5 text-base leading-7 text-slate-600">Built for investors, acquisition teams, contractors, and operators who need reliable numbers and repeatable systems—not more disconnected spreadsheets.</p><Link to="/features"><Button className="mt-7 bg-[#70bf2b] hover:bg-[#80ce38]">Explore All Features <ArrowRight className="ml-2 h-4 w-4"/></Button></Link></div>
          <div className="grid gap-5 sm:grid-cols-2">{capabilities.map(c=><Card key={c.title} className="brand-panel border-0"><CardContent className="p-7"><div className="grid h-12 w-12 place-items-center rounded-xl bg-[#071729]"><c.icon className="h-6 w-6 text-[#7ccc35]"/></div><h3 className="mt-5 text-xl font-bold">{c.title}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{c.text}</p></CardContent></Card>)}</div>
        </div>
      </section>

      <section className="bg-[#0b1d33] py-24 text-white"><div className="mx-auto grid max-w-7xl gap-14 px-6 lg:grid-cols-2 lg:items-center lg:px-8"><div><div className="brand-eyebrow">Built for serious operators</div><h2 className="mt-3 text-4xl font-extrabold">From opportunity to completed project.</h2><p className="mt-5 max-w-xl leading-7 text-white/65">Boliviq connects the real estate and construction sides of your business, giving your team a consistent system for evaluating, planning, and executing profitable work.</p><div className="mt-8 grid gap-4 sm:grid-cols-2">{platformFeatures.map(f=><div key={f} className="flex items-center gap-3 text-sm font-medium"><CheckCircle2 className="h-5 w-5 text-[#7ccc35]"/>{f}</div>)}</div></div><div className="brand-panel-dark p-8"><div className="grid gap-5 sm:grid-cols-2"><DarkStat icon={House} title="Real Estate" text="Find, evaluate, and organize deals."/><DarkStat icon={HardHat} title="Construction" text="Plan costs, labor, and materials."/><DarkStat icon={Calculator} title="Financial Analysis" text="Make offers with clearer numbers."/><DarkStat icon={Users} title="Team Operations" text="Keep every project accountable."/></div></div></div></section>

      <section className="px-6 py-24"><div className="mx-auto max-w-5xl overflow-hidden rounded-3xl bg-gradient-to-br from-[#071729] to-[#12345a] p-10 text-center text-white shadow-2xl sm:p-16"><div className="brand-eyebrow">Start building smarter</div><h2 className="mt-3 text-4xl font-extrabold">Your next deal deserves better tools.</h2><p className="mx-auto mt-4 max-w-2xl text-white/65">Create your Boliviq workspace and bring your property, analysis, construction, and project workflows together.</p><div className="mt-8 flex flex-wrap justify-center gap-3"><Link to="/auth"><Button size="lg" className="bg-[#70bf2b] hover:bg-[#80ce38]">Start Free <ArrowRight className="ml-2 h-4 w-4"/></Button></Link><Link to="/pricing"><Button size="lg" variant="outline" className="border-white/35 bg-transparent text-white hover:bg-white/10 hover:text-white">View Pricing</Button></Link></div></div></section>
    </MarketingLayout>
  );
}

function Metric({label,value}:{label:string;value:string}) { return <div className="rounded-xl bg-white/5 p-4"><div className="text-xs text-white/50">{label}</div><div className="mt-1 text-xl font-bold text-[#7ccc35]">{value}</div></div> }
function DarkStat({icon:Icon,title,text}:{icon:any;title:string;text:string}) { return <div className="rounded-xl border border-white/10 bg-white/[.035] p-5"><Icon className="h-6 w-6 text-[#7ccc35]"/><div className="mt-3 font-bold">{title}</div><div className="mt-1 text-sm text-white/55">{text}</div></div> }
