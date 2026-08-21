// Boliviq plan catalog — mirrors Stripe products. Adjust prices here AND in Stripe.
export type PlanTier = "free" | "beginner" | "professional" | "professional_ai_max" | "team" | "team_ai_max";

export type Plan = {
  tier: PlanTier;
  name: string;
  tagline: string;
  monthly: number;
  annual: number;
  priceMonthly?: string;
  priceYearly?: string;
  features: string[];
  highlight?: boolean;
  aiMax?: boolean;
  badge?: string;
  seatNote?: string;
  extraSeatMonthly?: number;
  includedSeats?: number;
};

export const plans: Plan[] = [
  {
    tier: "free",
    name: "Free",
    tagline: "Kick the tires.",
    monthly: 0,
    annual: 0,
    features: [
      "10 active properties",
      "Basic CRM, pipeline & deal calculator",
      "100 Boliviq Credits / month",
      "Limited reports",
      "Community support",
    ],
  },
  {
    tier: "beginner",
    name: "Beginner",
    tagline: "Experience every module in Basic mode.",
    monthly: 49,
    annual: 470,
    priceMonthly: "beginner_monthly",
    priceYearly: "beginner_yearly",
    features: [
      "Up to 500 active properties",
      "Basic Deal Analysis, Construction Planner & Materials",
      "CRM, Pipeline, Reports & Basic Automations",
      "500 Boliviq Credits / month",
      "Email support",
    ],
  },
  {
    tier: "professional",
    name: "Professional",
    tagline: "For serious acquirers.",
    monthly: 149,
    annual: 1430,
    priceMonthly: "pro_v2_monthly",
    priceYearly: "pro_v2_yearly",
    highlight: true,
    badge: "Most popular",
    features: [
      "Up to 5,000 active properties",
      "Advanced CRM, Pipeline & Construction Planner",
      "Material Takeoffs, Labor Estimates, SOW Generator",
      "AI Reports, Call Scripts & Summaries",
      "Integrations & Automations",
      "2,500 Boliviq Credits / month",
      "Priority support",
    ],
  },
  {
    tier: "professional_ai_max",
    name: "Professional + AI Max",
    tagline: "Full AI access for power users.",
    monthly: 499,
    annual: 4790,
    priceMonthly: "pro_aimax_monthly",
    priceYearly: "pro_aimax_yearly",
    aiMax: true,
    badge: "AI Max",
    features: [
      "Everything in Professional",
      "Full AI Access & priority AI queue",
      "Advanced Construction AI & Photo Analysis",
      "Advanced Reports & AI Assistants",
      "AI Workflow Automation & Agent Recommendations",
      "Substantially higher included credits (owner configurable)",
      "Premium future AI features",
    ],
  },
  {
    tier: "team",
    name: "Team",
    tagline: "For growing teams.",
    monthly: 399,
    annual: 3830,
    priceMonthly: "team_v2_monthly",
    priceYearly: "team_v2_yearly",
    extraSeatMonthly: 99,
    includedSeats: 5,
    seatNote: "5 users included · $99/mo per additional seat",
    features: [
      "Shared CRM, Pipeline, Properties & Credit Wallet",
      "Team permissions, analytics & dashboards",
      "Team automations & reports",
      "7,500 Boliviq Credits / month",
      "Priority support",
    ],
  },
  {
    tier: "team_ai_max",
    name: "Team + AI Max",
    tagline: "Shared AI capacity for the whole team.",
    monthly: 1299,
    annual: 12470,
    priceMonthly: "team_aimax_monthly",
    priceYearly: "team_aimax_yearly",
    aiMax: true,
    badge: "AI Max",
    extraSeatMonthly: 99,
    includedSeats: 5,
    seatNote: "5 users included · $99/mo per additional seat",
    features: [
      "Everything in Team",
      "Shared AI capacity across the team",
      "Advanced AI Agents & Team Assistants",
      "AI automation workflows",
      "Advanced reporting & priority AI processing",
      "Substantially higher shared credits (owner configurable)",
      "Future enterprise AI features",
    ],
  },
];

export const AI_MAX_DISCLAIMER = "Subject to the Boliviq Reasonable Use Policy.";
