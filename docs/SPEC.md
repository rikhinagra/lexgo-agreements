# LexGo Agreements: Specification (v0.2, 2026-11-13)

Internal tool for lexgosolutions.com, to be hosted at `agreements.lexgosolutions.com`.
It automates MOU signing and invoicing for Virtual Assistant (VA) services.
Reference material is in `docs/reference/` (prototype HTML, MOU PDF, sample invoices).

## Decisions (made by the user)
| Topic | Decision |
|---|---|
| Framework | Next.js (App Router), TypeScript, Tailwind |
| Package manager | pnpm |
| Database | Neon Postgres with Prisma |
| Admin login | Own email and password system, not Auth.js. Simpler, no beta dependency, works before email exists. |
| Email | Resend (verify lexgosolutions.com with SPF and DKIM) |
| Default rate | $1,800 per agent per month, stored on each MOU. Spectrum MRI stays at $1,600. |
| Billing timing | In advance, as the MOU PDF says. Arrears stays available as a per MOU setting. |
| Business timezone | America/Los_Angeles (Pacific). Admins: Baba (Simran, CEO, California), Rikhi (Chicago), Saheb (India). |
| Provider signatory | Placeholder for testing, changeable in settings. |

## Billing flow (advance)
1. Admin creates a MOU with company, agents, rate, client email, and optional custom scope, governing law, payment method and payment due days.
2. The client receives a secure link. The client can ask questions. Admins are emailed with the client's reply address, and the MOU stays open.
3. The client signs. Name, title, primary email and primary phone are required. A second email and phone are optional. The client types their name and ticks the agree box, and confirms by an email code. The signing time in Pacific becomes the start date.
4. The first invoice is issued at signing. It is pro rated for the start month, counting the start day. Signing on the 1st bills the full month. It is numbered by service month.
5. Service for a month begins once that month's invoice is paid in full (the pay to start clause is kept). An admin marks the invoice paid and the contract becomes active.
6. On the 1st of each later month (about 9:00 AM Pacific), the invoice for that month (agents times rate) is issued and emailed to the client and the admins.
7. Admins are notified of client questions, signings, each invoice sent, payments received and any failures.

This differs from steps 7 to 9 of the client's written flow, which bills in arrears. The client must confirm.

## Pro rating
`amount = round half up (agents x rate x days billed / days in month)`, calculated once on the total, in whole cents, using Pacific calendar days.
Example: signing on Nov 3 bills 28 of 30 days. Two agents at $1,800 gives $3,360.00.

## Invoice numbering
`INV-YYYY-MM-NNN`, where the month is the service month and NNN is a gapless sequence per month, reserved inside the same database transaction that creates the invoice. The existing Spectrum invoices (INV-2026-10 and INV-2026-11) will be imported as they are.

## Security
Admin login with email and password (two factor sign in planned for Phase 8), account lock after 5 failures, per address limit, database sessions and a nonce based Content Security Policy. Client links use an unguessable token that is stored only as a hash, and can expire or be revoked. An email code is required before signing. The signing record keeps IP address, device, MOU version, document hash and timestamp. The question box is rate limited. The monthly job cannot create duplicates. A staging mode sends emails only to test inboxes. Secrets stay in environment variables, and backups are enabled.

## Planned extra features
Signed MOU PDF emailed to the client and admins. Invoice PDFs. Payment tracking (sent, paid, overdue, reminders). MOU statuses (sent, viewed, signed, expired, cancelled) with resend and reminders. A review before send switch. Adding or removing agents mid month with pro rating, and termination with 30 days notice and a final pro rated invoice. Void, credit note and adjustments. An admin dashboard with an email log and job failure alerts. CSV export. A client portal and online payment later.

## Hosting notes
Vercel Hobby is for non commercial use and allows only a daily cron, so use Vercel Pro or a GitHub Actions schedule that calls a protected endpoint. Resend free allows about 100 emails per day.

## Open items
- Client confirmation of advance billing and the $1,800 default.
- Payment due days (the MOU leaves it blank). Proposed default is 7 days.
- Real provider signatory name and title, and the company legal name.
