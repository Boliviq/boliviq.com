# Boliviq iOS screens (BB01–BB19)

Official Gate 8 page inventory. **80 static iPhone mockups** (390×844). They are the finished look. They are not live product pages.

Received from the owner as `boliviq-ios-screens-BB01-BB19.zip`. Original pack notes: `README.source.md`. Full canvas: `boliviq-ios-canons-1-19.html`. Per-screen files: `screens/BB{canon}-{seq}-{Name}.dc.html`.

Do **not** insert these over Lovable shells until that screen’s engine workflow already passes (see `docs/completion-plan.md` L8). Do **not** treat this as a separate native iOS app. Canon 11 ships as PWA / responsive web first.

## How a future page uses a mockup

1. Name the BB id (example: `BB05-02`).
2. Confirm the matching engine test is green.
3. Bind the mockup layout to existing server functions / hooks.
4. Prove one real write (not “page loaded”).

## Inventory and engine binding

| ID | Screen | Canon | Engine today |
| --- | --- | --- | --- |
| BB01-01 | Home Dashboard | 1 | Shell only |
| BB01-02 | Personal Profile | 1 / 2 | Identity persist PARTIAL |
| BB01-03 | Workspace | 1 | Create / switch / invite VERIFIED |
| BB01-04 | Account Settings | 2 | Draft + MFA PARTIAL |
| BB01-05 | Credit Wallet | 7 | Reserve / charge / release VERIFIED |
| BB02-01 | Welcome | 2 | Shell |
| BB02-02 | Sign-Up | 2 | Signup + personal workspace VERIFIED; CAPTCHA off |
| BB02-03 | Verify Phone | 2 | Not started |
| BB02-04 | Role Selection | 2 | 16 signup roles VERIFIED (admin is not a signup role) |
| BB02-05 | Business Info | 2 | Onboarding draft PARTIAL |
| BB02-06 | Subscription | 8 | Plan map PARTIAL; Stripe keys later |
| BB02-07 | Login | 2 | Auth + suspend wall PARTIAL |
| BB03-01 | Marketplace Home | 3 | Search / list VERIFIED |
| BB03-02 | Search Results | 3 | Filters VERIFIED |
| BB03-03 | Listing Detail | 3 | Media + convert-to-lead VERIFIED |
| BB03-04 | Create Post | 3 | Create listing VERIFIED |
| BB03-05 | Saved Alerts | 3 | Saved searches VERIFIED |
| BB04-01 | Inbox | 4 | Threads + unread PARTIAL |
| BB04-02 | Conversation Thread | 4 | Send / block / attachments / intents PARTIAL; Realtime later |
| BB04-03 | Schedule Meeting | 4 | Link field only |
| BB04-04 | Notification Consent | 4 | Prefs + quiet hours VERIFIED |
| BB04-05 | Report / Block | 4 | Block + report VERIFIED |
| BB05-01 | Pipeline Board | 5 | 12 stages + legal jumps VERIFIED |
| BB05-02 | Lead Detail | 5 | listing→lead→project→property VERIFIED |
| BB05-03 | Add Task | 5 | Investor CRM leftover |
| BB05-04 | Contacts List | 5 | Investor CRM leftover |
| BB05-05 | Pipeline Reports | 5 | Not started |
| BB06-01 | Public Profile | 6 | Badges: pending is not public VERIFIED |
| BB06-02 | Verification Center | 6 | Request + admin review VERIFIED |
| BB06-03 | Reviews List | 6 | Not started |
| BB06-04 | Write Review | 6 | Not started |
| BB06-05 | Complaint Status | 6 | Not started |
| BB07-01 | AI Assistant Chat | 7 | Logs only; guardrails not started |
| BB07-02 | AI Agent Directory | 7 | Catalog only |
| BB07-03 | Agent Run Detail | 7 | Not started |
| BB07-04 | Agent Approval | 7 | Forbidden actions catalog only |
| BB07-05 | Credit Transaction | 7 | Ledger VERIFIED |
| BB08-01 | Billing Home | 8 | embedded_page_v4 PARTIAL |
| BB08-02 | Change Plan | 8 | Checkout PARTIAL |
| BB08-03 | Payment Method | 8 | Portal PARTIAL |
| BB08-04 | Invoice History | 8 | Not proven |
| BB09-01 | Integrations List | 9 | 23-provider catalog VERIFIED; adapters off |
| BB09-02 | Integration Detail | 9 | Not started |
| BB10-01 | Admin Dashboard | 10 | Shell |
| BB10-02 | Verification Queue | 10 / 6 | Admin grant / reject VERIFIED |
| BB10-03 | Content Moderation | 10 | Not started |
| BB10-04 | Audit Log | 10 | Table + verification writes PARTIAL |
| BB11-01 | Location Priming | 11 | Not started |
| BB11-02 | Document Scanner | 11 | Not started |
| BB11-03 | Offline Drafts | 11 | Not started |
| BB12-01 | Homeowner Home | 12 | Widgets catalog only |
| BB12-02 | My Property | 12 | Property hub conversions VERIFIED |
| BB12-03 | Compare Proposals | 12 | Not started |
| BB12-04 | Invite a Pro | 12 | Not started |
| BB13-01 | Estimate Builder | 13 | Not started |
| BB13-02 | Project Schedule / Log | 13 | Projects persist PARTIAL |
| BB13-03 | Trade Job Feed | 13 | Not started |
| BB13-04 | Change Order | 13 | Not started |
| BB14-01 | Agent Dashboard | 14 | Widgets catalog only |
| BB14-02 | Listing Portfolio | 14 | Marketplace listings VERIFIED |
| BB14-03 | CMA Workspace | 14 | Not started (estimates, not appraisals) |
| BB14-04 | Showings / Open House | 14 | Not started |
| BB15-01 | Deal Calculator | 15 | Not started (label outputs estimates) |
| BB15-02 | Investor Portfolio | 15 | Property hub PARTIAL |
| BB15-03 | Disposition | 15 | Completed project → listing VERIFIED |
| BB15-04 | Due Diligence | 15 | Documents persist PARTIAL |
| BB16-01 | Loan Pipeline | 16 | Not started; no lending decisions |
| BB16-02 | Prequalification | 16 | Not started |
| BB16-03 | Loan Conditions | 16 | Not started |
| BB17-01 | PM Properties | 17 | Not started |
| BB17-02 | Work Order | 17 | Not started |
| BB17-03 | Owner Report | 17 | Not started |
| BB18-01 | Inspection Report | 18 | Immutable-to-AI rule in catalog only |
| BB18-02 | Appraisal Status | 18 | Appraisal ≠ estimate (law only) |
| BB18-03 | Secure Closing Room | 18 | Not started |
| BB18-04 | Insurance Quote | 18 | Not started |
| BB18-05 | Attorney Consultation | 18 | Not started |
| BB19-01 | Plan Storage | 19 | Documents persist PARTIAL |
| BB19-02 | Supplier Catalog | 19 | Not started |
| BB19-03 | Quote Requests | 19 | Not started |

## What this pack does **not** change

- Supabase stays the database.
- Engine-first / pages-last stays in force.
- Lovable route files stay unfinished skins until a BB screen is inserted.
- No App Store binary is implied. Mobile is Canon 11 PWA until a later launch decision.
