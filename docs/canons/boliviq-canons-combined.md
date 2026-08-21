# Boliviq — Combined Canon Reference

All 19 Boliviq canon documents combined into a single file, in the order listed in the canon index. Each section below is one standalone canon; they were split out individually in the Boliviq project so each can be maintained on its own, and are combined here for a single-file read-through.

---

## Table of Contents

**Platform canons**
1. Platform Overview & Account Structure
2. Onboarding & Authentication
3. Marketplace & Search
4. Communication Center
5. CRM & Pipeline
6. Trust & Verification
7. AI Features
8. Subscriptions & Billing
9. External Integrations
10. Administrative System
11. Mobile, PWA & App Requirements

**Profile canons**
12. Homeowner Profile
13. Contractor & Trade Professional Profiles
14. Realtor & Broker Profile
15. Investor & Wholesaler Profiles
16. Lender Profile
17. Property Manager Profile
18. Transaction-Support Professional Profiles
19. Design & Supply Profiles

---

# 1. Canon: Platform Overview & Account Structure

## What Boliviq Is

Boliviq is an AI-powered real estate, construction, investing, and professional-services ecosystem. It brings homeowners, contractors, realtors, investors, wholesalers, lenders, property managers, inspectors, appraisers, title companies, insurance providers, attorneys, suppliers, and other industry professionals into one connected platform.

Boliviq combines: a real-estate-focused marketplace, property listings and off-market opportunities, construction project bidding, professional service directories, customer relationship management, property and deal analysis, construction estimating, project management, team collaboration, document generation and storage, communication tools, subscription billing and AI credits, specialized AI agents, and administrative monitoring and security.

The goal is one operating system for the entire lifecycle of real estate:

Find an opportunity → Connect with people → Analyze the property → Finance and close → Repair or construct → Sell, rent, or manage → (loops back to Find an opportunity)

Boliviq is not only a property-listing website. It is a connected business ecosystem in which information entered once can be reused across listings, leads, estimates, projects, financing, contracts, transactions, and AI workflows.

## Core Account Structure

### Individual accounts

Every person receives: a personal profile, a role-based dashboard, marketplace access, a messaging inbox, notifications, saved searches and favorites, contact management, a document center, account and privacy settings, light and dark mode, language selection, subscription management, and a credit wallet when applicable.

### Professional workspaces

Paid professionals can create or join a workspace containing: a business profile, team members, role-based permissions, shared leads and contacts, shared properties and projects, shared documents, a shared calendar, shared marketplace posts, a shared subscription and AI-credit wallet, activity and audit history, and business reporting.

A person may belong to more than one workspace but must only see information belonging to workspaces they are authorized to access.

### Profile roles

During registration, users select a primary profile from:

1. Homeowner
2. Contractor
3. Realtor or broker
4. Investor
5. Wholesaler
6. Lender or mortgage professional
7. Property manager
8. Inspector
9. Appraiser
10. Title or closing professional
11. Insurance professional
12. Attorney
13. Architect, engineer, or designer
14. Supplier or material vendor
15. Trade professional or subcontractor
16. Other real estate service provider
17. Administrator

Users may select secondary roles, subject to verification and subscription rules.

## Key System Rule

Boliviq must be designed around one principle:

> Every property, person, lead, project, document, conversation, estimate, transaction, and AI action should be connected — without exposing information to anyone who does not have permission to see it.

A homeowner's repair post can become a contractor lead. A contractor's estimate can become a project. An investor's property analysis can become an offer. An accepted offer can become a transaction. A completed renovation can become a new listing or rental-management record.

That connected lifecycle is the defining advantage of Boliviq: one platform that helps the entire real estate and construction community discover opportunities, communicate, analyze, finance, build, close, and manage property with or without AI assistance.

---

# 2. Canon: Onboarding & Authentication

## Registration and onboarding

Registration must include: name, email, verified mobile number, password or secure social login, primary account type, secondary professional roles, individual or company account, service area, preferred language, terms and privacy acceptance, communication consent, subscription selection, and payment information when choosing a paid plan.

Professional onboarding should additionally request: company name, business address, phone number, website, profile description, service categories, service locations, years in business, license information, insurance information, professional certifications, portfolio images, business logo, operating hours, and preferred lead types.

**Rule:** Users must be permitted to save onboarding progress and complete it later.

## Authentication and security

Implement: secure email and password authentication, email verification, mobile verification, optional multi-factor authentication, password reset, session management, device and login history, brute-force protection, bot and spam prevention, role-based access control, workspace-level data isolation, private document storage, signed file-download links, encryption in transit and at rest, consent and privacy management, administrative audit logs, and account suspension with an appeal process.

---

# 3. Canon: Marketplace & Search

## Marketplace

The marketplace should resemble the simplicity of Craigslist while being built specifically for real estate and construction.

**Primary categories:** homes for sale, off-market properties, investment properties, land and lots, rental properties, commercial properties, foreclosures and distressed properties, repairs and home-improvement projects, new construction, contractor and trade services, realtor services, investor and buyer services, lending and financing, property-management services, inspections and appraisals, title/legal/insurance services, building materials and equipment, businesses and real-estate partnerships, jobs and employment, education and networking.

**Every post should support:** title, description, category and subcategory, property or service location, photos/videos/documents, price or requested budget, property or project details, contact preferences, expiration date, public or limited visibility, save and share, report listing, in-platform messaging, lead creation, and view/response analytics.

## Search and discovery

Users should be able to search by: location and radius, marketplace category, property type, price, bedrooms and bathrooms, square footage, acreage, property condition, project type, project budget, professional specialty, license status, verification status, ratings, availability, financing type, investment strategy, and keywords.

Search results should support maps, lists, sorting, favorites, saved searches, and alerts.

---

# 4. Canon: Communication Center

Provide: direct messaging, group conversations, property-specific conversations, project-specific conversations, file and photo sharing, email notifications, SMS notifications with consent, call scheduling, video-meeting links, read status, conversation search, spam reporting, blocking, AI-generated summaries, AI-assisted replies, and automatic follow-up reminders.

**Rule:** Every external communication must respect user consent, opt-out requests, quiet hours, and applicable communication laws.

---

# 5. Canon: CRM & Pipeline

Professional accounts should receive: leads, contacts, companies, properties, opportunities, tasks, notes, appointments, documents, communication history, custom tags, lead sources, pipeline stages, assignment rules, follow-up reminders, duplicate detection, CSV import and export, and reporting.

**Recommended pipeline stages:**

1. New lead
2. Attempting contact
3. Contacted
4. Qualified
5. Appointment scheduled
6. Offer, estimate, or proposal created
7. Negotiation
8. Under contract
9. In progress
10. Closed or completed
11. Lost
12. Long-term follow-up

---

# 6. Canon: Trust & Verification

Professional profiles should display: identity verification, email and phone verification, license verification, insurance verification, background-screening status where permitted, completed Boliviq projects, customer reviews, response time, service areas, portfolio, and complaint status.

**Boliviq must distinguish between these verification tiers:**

- Identity verified
- License verified
- Insurance verified
- Boliviq certified
- Unverified

**Rule:** No badge should imply that Boliviq guarantees a person's services.

---

# 7. Canon: AI Features

## Boliviq AI assistant

The main assistant should understand the user's role, permissions, subscription, workspace, properties, projects, and authorized documents.

It should help users: search Boliviq, create listings, draft messages, summarize conversations, create tasks, analyze properties, calculate potential deals, prepare scopes of work, estimate repairs, organize documents, generate reports, recommend next steps, identify missing information, follow up on leads, monitor deadlines.

## Specialized AI agents

Recommended agents: Lead Qualification Agent, Property Analysis Agent, Construction Estimating Agent, Marketplace Matching Agent, Communication and Follow-Up Agent, Project Monitoring Agent, Compliance Review Agent, Customer Support Agent, Document Organization Agent, Business Intelligence Agent.

**Rule:** Agents must operate within explicit permissions and should not autonomously: send messages without authorization or an approved automation; sign agreements; move money; make lending decisions; provide licensed legal or appraisal conclusions; publish listings without confirmation; purchase services; delete critical records.

## AI credit system

AI usage should be managed through a shared workspace wallet. The system needs: credit balance; credit-cost catalog; reservations before expensive operations; final charges; releases for unused reservations; refunds for failed operations; immutable transaction ledger; idempotency protection; usage history; low-balance alerts; credit-pack purchases; subscription credit deposits; administrative adjustments; referral rewards; promotional credits.

---

# 8. Canon: Subscriptions & Billing

## Subscription structure

The platform should support the latest approved pricing configuration while keeping pricing editable from the administrative system.

**Recommended account groups:** Homeowner Free, Professional, Team Professional, Professional + AI, AI Team, higher-volume or enterprise plans.

**Subscription logic must control:** number of team members, AI access, monthly credits, marketplace privileges, CRM features, reporting, automation limits, storage limits, communication limits, advanced analytics, administrative tools.

## Billing

Needs: Stripe-hosted or embedded checkout; customer billing portal; monthly and annual billing; trials when enabled; coupons; proration; upgrades and downgrades; failed-payment recovery; grace periods; cancellation; receipts and invoices; tax handling; credit-pack purchases; verified webhook processing.

**Rule:** Payment access must be enforced by server-side entitlements, not hidden buttons alone.

---

# 9. Canon: External Integrations

Each integration must be modular and configurable. Boliviq should remain functional when an optional provider is unavailable.

| Integration | Purpose | Primary profiles |
|---|---|---|
| Stripe | Subscriptions, credit packs, receipts | All paid users |
| Email provider | Verification, alerts, follow-up | All users |
| SMS/voice provider | Consented messages and calls | Professionals |
| Maps/geocoding | Locations, service areas, property maps | All users |
| Calendar services | Appointments and project events | Professionals |
| Cloud storage | Private files and documents | All users |
| E-signature | Contracts, estimates, approvals | Professionals |
| MLS/IDX | Authorized property listings | Realtors |
| Property-data providers | Records, characteristics, comps | Investors and realtors |
| Accounting platforms | Invoice and transaction export | Businesses |
| Video meetings | Remote appointments | Professionals |
| AI model providers | Analysis, generation, assistants | AI plans |
| CAPTCHA/security | Abuse and bot protection | All users |
| Analytics | Product and business performance | Admin |
| Error monitoring | Reliability and incident response | Admin |
| Translation services | Multilingual content assistance | All users |

**Rule:** No provider should receive more user data than it needs. Each integration requires consent management, error logging, retry rules, credential security, and a documented replacement strategy.

---

# 10. Canon: Administrative System

Administrators need an Intelligence Center containing: user management; workspace management; professional verification; license and insurance review; subscription management; credit-wallet management; marketplace moderation; reported-content review; dispute management; AI-agent controls; AI-cost configuration; integration health; security alerts; audit logs; feature flags; coupon management; referral management; revenue reporting; usage reporting; support tickets; email and notification templates; language and translation management; system status; data-export and deletion requests.

**Rule:** Administrative actions must be recorded with: administrator identity, date and time, affected account or record, previous value, new value, reason, and related support or incident reference.

---

# 11. Canon: Mobile, PWA & App Requirements

Boliviq should be built as a responsive progressive web application and prepared for packaging for the Apple App Store and Google Play Store.

**Required mobile capabilities:** responsive navigation; camera uploads; push notifications; saved login; offline draft saving; fast marketplace search; location-aware discovery with permission; property and project photo capture; document scanning; light and dark mode; accessibility support; major U.S. languages; app links and deep links.

**Rule:** Any app-store payment implementation must be reviewed against the current Apple and Google rules before publication. External payment links cannot be assumed to be permitted in every app category or region.

---

# 12. Canon: Homeowner Profile

Homeowner accounts should remain free for core marketplace participation.

## Features

List a home for sale without an agent; post an off-market property; request a cash offer; post repairs or renovation projects; request contractor estimates; search for verified professionals; upload photos, videos, plans, and inspection reports; compare proposals; schedule appointments; save contractors and listings; communicate with professionals; track project status; review completed work; maintain a private property record; invite a realtor, contractor, lender, or investor into a property workspace.

## Connections

A homeowner can connect with: contractors (repairs/construction), realtors (pricing, listing, purchasing), investors and wholesalers (direct-sale offers), lenders (refinance/purchase options), inspectors (inspections), appraisers (valuations), property managers (rental management), insurance professionals (coverage), title companies and attorneys (closing), architects and engineers (plans), suppliers (material purchases).

## Workflow

A homeowner's property post should be convertible into: a public listing, a private opportunity, a repair request, a contractor bid request, a cash-offer request, a realtor consultation, a financing request, or a property-management request.

---

# 13. Canon: Contractor & Trade Professional Profiles

Construction-labor side of the platform.

## Contractor profile

### Features

Professional business page; license and insurance display; service categories; service-area mapping; portfolio; project lead feed; bid invitations; lead qualification; estimate creation; scope-of-work generation; material and labor calculations; change orders; contracts; project scheduling; daily logs; progress photos; customer approvals; invoice and payment tracking; subcontractor management; warranty tracking; review collection; job profitability reporting.

### Connections

Homeowners requesting work, investors renovating properties, realtors preparing listings, property managers requiring maintenance, lenders funding construction, inspectors identifying repairs, architects and engineers supplying plans, suppliers providing materials, subcontractors providing labor, insurance professionals handling restoration work.

### Integrations

Calendar synchronization, mapping and service-radius tools, email and SMS notifications, electronic signatures, payment processing, accounting export, cloud document storage, material pricing sources when authorized, permit information sources when available, AI estimating and scope creation.

## Trade professional and subcontractor profile

**Supported trades:** electrical, plumbing, HVAC, roofing, framing, concrete, masonry, drywall, painting, flooring, cabinets and countertops, excavation, septic, landscaping, cleaning, demolition, insulation, windows and doors, siding and gutters, handyman services.

### Features

Trade profile; certifications; service radius; availability; portfolio; job feed; bid invitations; estimates; scheduling; progress updates; document sharing; invoice tracking; reviews.

---

# 14. Canon: Realtor & Broker Profile

## Features

Agent and brokerage profile; license verification; listing portfolio; buyer and seller pipelines; comparative market analysis workspace; listing appointment tools; marketing task checklists; showing management; offer tracking; transaction milestones; commission tracking; referral management; open-house promotion; off-market opportunity search; contractor coordination; investor buyer lists; automated follow-up; document and disclosure center.

## Connections

Homeowners considering selling, buyers searching for properties, investors and wholesalers, lenders providing preapproval, contractors preparing properties, inspectors and appraisers, title companies and attorneys, property managers, insurance professionals.

## Listing integrations

Where legally and contractually permitted: MLS or IDX feeds, brokerage-approved listing systems, map and geocoding services, property and public-record data, showing calendars, electronic signatures, transaction-management systems, email and calendar platforms.

**Rule:** Boliviq must never represent an off-market listing as an MLS listing unless the listing was legitimately received through an authorized MLS integration.

---

# 15. Canon: Investor & Wholesaler Profiles

Deal-analysis and disposition side of the platform.

## Investor profile

### Features

Investment criteria; buy-box configuration; opportunity feed; property analysis; comparable-property workspace; repair-cost estimator; maximum allowable offer calculator; fix-and-flip calculator; rental cash-flow calculator; BRRRR calculator; wholesale calculator; development calculator; portfolio dashboard; capital and partner tracking; offer generation; due-diligence checklist; contractor bidding; disposition marketplace; buyer and seller CRM; deal-room collaboration; investment reports.

### Connections

Homeowners and motivated sellers, wholesalers, realtors, private and institutional lenders, equity partners, contractors, inspectors, appraisers, title companies and attorneys, property managers, insurance providers.

### Data and service integrations

Subject to licensing and authorization: property data, public records, comparable sales, mapping, rental estimates, market statistics, construction estimating, financing calculators, electronic signatures, document storage, accounting exports.

**Rule:** All automated valuations must be labeled as estimates rather than licensed appraisals.

## Wholesaler profile

### Features

Seller lead pipeline; property intake; deal analysis; offer calculator; contract milestone tracking; inspection-period reminders; buyer list; buyer criteria matching; assignment opportunity posts; deal-package generation; proof-of-funds request; document storage; disposition campaigns; communication tracking; assignment-fee reporting; compliance checklists.

### Connections

Property owners, investors and cash buyers, realtors, transactional and private lenders, contractors, inspectors, title companies and attorneys.

**Rule:** Boliviq must provide state-sensitive compliance notices because wholesaling, marketing equitable interests, licensing, and disclosure requirements vary by jurisdiction.

---

# 16. Canon: Lender Profile

## Features

Professional lending profile; loan-program directory; borrower intake; prequalification request; secure document collection; loan-opportunity pipeline; property and project details; deal-analysis review; construction draw tracking; conditions checklist; application status updates; referral management; communication history.

## Connections

Homebuyers, investors, realtors, contractors, appraisers, insurance professionals, title and closing professionals.

## Integrations

Secure application links, identity-verification services, credit or underwriting providers only with authorization, loan-origination systems, document verification, e-signatures, calendar and email, payment calculators.

**Rule:** Boliviq should not make lending decisions unless separately licensed and designed to meet applicable lending regulations.

---

# 17. Canon: Property Manager Profile

## Features

Owner and property portfolios; unit records; tenant contact records; maintenance requests; work-order management; contractor assignment; inspection scheduling; turnover checklists; vendor directory; expense tracking; document storage; lease milestone reminders; property reporting; owner communication.

## Connections

Property owners, tenants, contractors, realtors, investors, inspectors, insurance professionals, attorneys.

**Rule:** Tenant screening, rent collection, and lease execution should only be activated through compliant third-party services and applicable permissions.

---

# 18. Canon: Transaction-Support Professional Profiles

Covers Inspector, Appraiser, Title/Closing, Insurance, and Attorney profiles — professionals who support a transaction rather than originate or fund it.

## Inspector profile

**Features:** credentials and service areas; inspection types; availability calendar; appointment requests; report upload; photo and defect documentation; repair-category tagging; contractor referral options; invoice tracking; review collection.

**Connections:** homeowners, buyers, realtors, investors, contractors, lenders, property managers, insurance professionals.

**Rule:** Inspection findings may create repair requests, but AI must not alter the inspector's signed report.

## Appraiser profile

**Features:** license and coverage areas; property-type specialties; appointment management; secure document exchange; status tracking; report delivery; revision requests; invoice tracking.

**Connections:** lenders, homeowners, realtors, investors, attorneys, property managers.

**Rule:** Boliviq estimates must remain clearly separated from licensed appraisal reports.

## Title and closing profile

**Features:** closing-company profile; coverage areas; new-order intake; secure transaction room; required-document checklist; title milestone tracking; closing appointment scheduling; participant communication; final-document delivery; referral reporting.

**Connections:** buyers and sellers, realtors, investors and wholesalers, lenders, attorneys, insurance professionals.

**Rule:** Sensitive identity, banking, wire, and closing information requires restricted permissions, encryption, warning banners, and anti-wire-fraud protections.

## Insurance profile

**Features:** agent and carrier information; coverage specialties; quote-request intake; property details; secure document requests; policy milestone tracking; renewal reminders; claim-related contractor referrals; communication history.

**Connections:** homeowners, buyers, investors, lenders, contractors, property managers, inspectors.

## Attorney profile

**Features:** practice areas; jurisdiction and license information; consultation requests; secure client intake; conflict-check status; document exchange; appointment management; matter milestones; referral tracking.

**Connections:** property owners, buyers and sellers, investors and wholesalers, realtors, contractors, lenders, title professionals, property managers.

**Rule:** Boliviq AI must not represent itself as an attorney or replace jurisdiction-specific legal advice.

---

# 19. Canon: Design & Supply Profiles

Covers Architect/Engineer/Designer and Supplier/Material-Vendor profiles — the planning and materials side of construction.

## Architect, engineer, or designer profile

**Features:** professional credentials; portfolio; design specialties; consultation requests; plan and drawing storage; revision tracking; project milestones; contractor collaboration; client approvals; proposal and invoice tracking.

**Connections:** homeowners, contractors, developers and investors, engineers and consultants, suppliers, inspectors, lenders.

## Supplier and material-vendor profile

**Features:** business profile; product catalog; service areas; inventory indicators; contractor pricing requests; quote requests; delivery options; promotions; order inquiries; contractor and project connections; lead analytics.

**Connections:** contractors, subcontractors, homeowners, investors, property managers, architects and designers.
