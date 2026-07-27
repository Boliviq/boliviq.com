// Boliviq — call-script templates
// Users can edit and save custom versions in the UI (session-only until backend template store lands).

export type Tone = "professional" | "friendly" | "direct" | "conversational";

export const TONES: { value: Tone; label: string }[] = [
  { value: "professional", label: "Professional" },
  { value: "friendly", label: "Friendly" },
  { value: "direct", label: "Direct" },
  { value: "conversational", label: "Conversational" },
];

export const CONTACT_TYPES = [
  "Listing agent", "Seller", "Buyer", "Wholesaler",
  "Property manager", "Contractor", "Lender", "Title company",
] as const;

export const CALL_PURPOSES = [
  "Initial outreach", "Follow-up", "Price negotiation", "Property condition",
  "Ask about offers", "Seller motivation", "Closing timeline",
  "Owner financing", "Subject-to financing", "Inspection concerns",
  "Cash buyer outreach", "Contract questions",
] as const;

export interface ScriptTemplate {
  id: string;
  title: string;
  contactType: string;
  purpose: string;
  intro: (ctx: ScriptContext, tone: Tone) => string;
  questions: string[];
  close: (ctx: ScriptContext, tone: Tone) => string;
}

export interface ScriptContext {
  yourName?: string;
  companyName?: string;
  propertyAddress?: string;
  agentName?: string;
  sellerName?: string;
  askingPrice?: number;
  offerAmount?: number;
}

const money = (n?: number) => (n ? `$${n.toLocaleString()}` : "$___");

const toneOpener = (tone: Tone, name: string) => {
  switch (tone) {
    case "friendly": return `Hi ${name}, hope you're having a great day!`;
    case "direct": return `Hi ${name}.`;
    case "conversational": return `Hey ${name} — thanks for taking my call.`;
    default: return `Hello ${name}, thank you for taking my call.`;
  }
};

export const SCRIPT_TEMPLATES: ScriptTemplate[] = [
  {
    id: "listing-agent",
    title: "Calling a listing agent",
    contactType: "Listing agent",
    purpose: "Initial outreach",
    intro: (c, t) => `${toneOpener(t, c.agentName || "there")} My name is ${c.yourName || "___"} with ${c.companyName || "___"}. I'm calling about your listing at ${c.propertyAddress || "___"}.`,
    questions: [
      "Is the property still available?",
      "Have any offers been submitted?",
      "Why is the seller moving?",
      "How motivated is the seller?",
      "What repairs are known?",
      "Are there any inspection reports available?",
      "Is the seller flexible on price?",
      "What closing timeline does the seller prefer?",
      "Would the seller consider a cash offer?",
      "Would the seller consider creative terms?",
      "Are there any title, tenant, lien, or access issues we should know about?",
    ],
    close: (_c, t) => t === "direct"
      ? "Based on this, I'll put together an offer and follow up within 24 hours. Sound good?"
      : "Thanks for the details — I'll review with my team and follow up within 24 hours. What's the best way to reach you?",
  },
  {
    id: "off-market-seller",
    title: "Calling an off-market seller",
    contactType: "Seller",
    purpose: "Initial outreach",
    intro: (c, t) => `${toneOpener(t, c.sellerName || "there")} My name is ${c.yourName || "___"}. I'm a local real estate investor and I noticed your property at ${c.propertyAddress || "___"}. Would you be open to a quick conversation about it?`,
    questions: [
      "How long have you owned the property?",
      "Have you thought about selling recently?",
      "Is there a price you would consider?",
      "What is the current condition of the property?",
      "Is it currently occupied or vacant?",
      "Are there any repairs or issues we should know about?",
      "How quickly would you want to close if we agreed on a price?",
      "Are you open to different payment structures — cash, terms, or financing?",
    ],
    close: () => "Really appreciate the time. If it's alright, I'd like to put together a fair offer and share it with you this week.",
  },
  {
    id: "follow-up",
    title: "Following up on a previous conversation",
    contactType: "Seller",
    purpose: "Follow-up",
    intro: (c, t) => `${toneOpener(t, c.sellerName || c.agentName || "there")} We spoke recently about ${c.propertyAddress || "the property"} — I wanted to follow up on where things stand.`,
    questions: [
      "Has anything changed since we last spoke?",
      "Have you received any other offers?",
      "Is the previous asking price still where you'd like to be?",
      "Any new information on repairs, inspections, or title?",
      "Would you like to move forward, or is now not the right time?",
    ],
    close: () => "Thanks again for the follow-up. I'll be in touch shortly with next steps.",
  },
  {
    id: "price-flex",
    title: "Asking about price flexibility",
    contactType: "Listing agent",
    purpose: "Price negotiation",
    intro: (c) => `Hi ${c.agentName || "there"}, following up on ${c.propertyAddress || "the property"}. Based on comps and needed repairs, I'm working on an offer near ${money(c.offerAmount)} — versus the asking of ${money(c.askingPrice)}.`,
    questions: [
      "Is the seller open to a price adjustment?",
      "What has the feedback been from other buyers?",
      "Is there flexibility on terms if the price stays where it is?",
      "Would the seller consider a quick-close cash discount?",
    ],
    close: () => "Happy to put the offer in writing today if it's in the right range.",
  },
  {
    id: "condition",
    title: "Asking about property condition",
    contactType: "Listing agent",
    purpose: "Property condition",
    intro: (c) => `Hi ${c.agentName || "there"}, I have a few condition questions about ${c.propertyAddress || "the property"} before I finalize numbers.`,
    questions: [
      "When were the roof, HVAC, and water heater last serviced or replaced?",
      "Any known plumbing or electrical issues?",
      "Is there any foundation movement, settling, or moisture?",
      "Any recent renovations or updates?",
      "Are appliances included and functional?",
      "Any known lead paint, asbestos, or environmental concerns?",
    ],
    close: () => "Thanks — this helps me put together an accurate offer.",
  },
  {
    id: "offers",
    title: "Asking about existing offers",
    contactType: "Listing agent",
    purpose: "Ask about offers",
    intro: (c) => `Quick question on ${c.propertyAddress || "the listing"}.`,
    questions: [
      "Are there any offers on the property right now?",
      "Where do those offers sit relative to asking?",
      "Is there a deadline for offers?",
      "What terms matter most to the seller — price, timing, or contingencies?",
    ],
    close: () => "Appreciate the transparency — I'll act fast if it makes sense.",
  },
  {
    id: "motivation",
    title: "Asking about seller motivation",
    contactType: "Listing agent",
    purpose: "Seller motivation",
    intro: (c) => `Hi ${c.agentName || "there"}, trying to understand the seller's situation on ${c.propertyAddress || "the property"}.`,
    questions: [
      "What's the seller's timeline for moving?",
      "Is there a life event driving the sale — job, family, health?",
      "How important is a certain-close over top dollar?",
      "Would the seller trade price for speed?",
    ],
    close: () => "Thanks — I'll tailor the offer to what matters most.",
  },
  {
    id: "closing",
    title: "Asking about closing timeline",
    contactType: "Listing agent",
    purpose: "Closing timeline",
    intro: (c) => `Following up on ${c.propertyAddress || "the property"} — checking on timing preferences.`,
    questions: [
      "What close date does the seller prefer?",
      "Is a leaseback or delayed possession needed?",
      "Any hard deadlines like tax or 1031 windows?",
      "Preferred title company?",
    ],
    close: () => "Great, I'll structure the offer around that timeline.",
  },
  {
    id: "owner-financing",
    title: "Asking about owner financing",
    contactType: "Seller",
    purpose: "Owner financing",
    intro: (c) => `${c.sellerName ? `Hi ${c.sellerName}, ` : "Hi, "}I wanted to explore whether owner financing might be a fit for ${c.propertyAddress || "your property"}.`,
    questions: [
      "Is the property owned free and clear, or is there a mortgage?",
      "Would you be open to carrying the note for a period of time?",
      "What down payment would you be looking for?",
      "What interest rate would you consider?",
      "How long a term would you be comfortable with?",
    ],
    close: () => "This can be a good fit for both sides — I'll put together a couple of scenarios.",
  },
  {
    id: "subject-to",
    title: "Asking about subject-to financing",
    contactType: "Seller",
    purpose: "Subject-to financing",
    intro: (c) => `Wanted to see whether a subject-to structure could help you move on from ${c.propertyAddress || "the property"} quickly.`,
    questions: [
      "What's the remaining balance on the mortgage?",
      "What is the interest rate and monthly payment?",
      "Is the loan current?",
      "Are you comfortable if I take over payments while the loan stays in your name?",
      "Would having your payment obligations handled solve your main concern?",
    ],
    close: () => "I'll walk you through exactly how this works and what protections you'd have.",
  },
  {
    id: "inspection",
    title: "Asking about inspection concerns",
    contactType: "Listing agent",
    purpose: "Inspection concerns",
    intro: (c) => `Following up on inspection items for ${c.propertyAddress || "the property"}.`,
    questions: [
      "Which items from the inspection are most concerning?",
      "Is the seller willing to make repairs, credit, or lower the price?",
      "Any items that need immediate attention for occupancy?",
      "Are contractor estimates available?",
    ],
    close: () => "Thanks — I'll get you my proposed resolution in writing.",
  },
  {
    id: "cash-buyer",
    title: "Calling a cash buyer",
    contactType: "Buyer",
    purpose: "Cash buyer outreach",
    intro: (c, t) => `${toneOpener(t, c.agentName || "there")} I have a property at ${c.propertyAddress || "___"} that might match your buy box.`,
    questions: [
      "What areas and price ranges are you actively buying in?",
      "What kind of properties fit your buy box?",
      "Do you prefer turn-key, light rehab, or heavy rehab?",
      "Can you close in cash, and how quickly?",
      "Do you have proof of funds ready to send?",
    ],
    close: () => "If it's a fit, I can send full details right after this call.",
  },
];

export function fillScript(t: ScriptTemplate, ctx: ScriptContext, tone: Tone) {
  return `${t.intro(ctx, tone)}\n\nQuestions:\n${t.questions.map((q, i) => `${i + 1}. ${q}`).join("\n")}\n\nClose:\n${t.close(ctx, tone)}`;
}

// Fake AI post-call summarizer — parses a transcript for keywords and returns structured notes.
export function summarizeTranscript(transcript: string) {
  const text = transcript.toLowerCase();
  const has = (...kws: string[]) => kws.some((k) => text.includes(k));
  const summary = {
    property_condition: has("roof", "hvac", "leak", "foundation", "condition", "repair") ? "Mentioned condition items — see transcript." : "Not discussed.",
    seller_motivation: has("motivated", "quick", "asap", "divorce", "job", "relocate", "estate", "urgent") ? "Seller appears motivated." : "Motivation unclear.",
    agent_comments: has("agent", "listing", "realtor", "broker") ? "Agent provided context on the listing." : "—",
    price_flexibility: has("flexible", "negotiable", "reduce", "lower", "counter", "discount") ? "Some price flexibility indicated." : "None indicated.",
    existing_offers: has("offer", "offers", "bid", "under contract") ? "Other offer activity mentioned." : "No other offers mentioned.",
    preferred_closing: (text.match(/(\d+)\s*(day|week|month)/) || [])[0] || "Not specified.",
    financing_openness: has("owner financ", "seller financ", "subject to", "carry", "terms") ? "Open to creative financing." : "Cash / conventional only.",
    repairs_mentioned: has("roof", "hvac", "kitchen", "bath", "electrical", "plumbing", "paint", "floor") ? "Repairs discussed — capture in rehab budget." : "None mentioned.",
    tenant_info: has("tenant", "renter", "lease", "occupied") ? "Tenant/occupancy discussed." : "Vacant or not discussed.",
    title_concerns: has("lien", "title", "probate", "estate", "back tax") ? "Potential title issue — verify." : "None flagged.",
    recommended_next: has("send offer", "make offer", "put in writing", "proof of funds") ? "Prepare and send offer package." : "Follow up within 3 days.",
  };
  // Generate suggested tasks
  const tasks: string[] = [];
  if (summary.price_flexibility.includes("flexibility")) tasks.push("Run updated comps");
  if (summary.repairs_mentioned.includes("Repairs")) tasks.push("Estimate rehab based on items discussed");
  if (summary.existing_offers.includes("mentioned")) tasks.push("Move fast — prepare offer today");
  if (summary.recommended_next.includes("Prepare")) tasks.push("Send proof of funds", "Draft offer");
  if (summary.title_concerns.includes("issue")) tasks.push("Contact title company for record check");
  if (tasks.length === 0) tasks.push("Follow up call by end of week");
  return { summary, tasks };
}
