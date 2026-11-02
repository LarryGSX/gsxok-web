import { z } from 'zod'

// Server-side contact form validation. This is the source of truth — the
// client form only adds native HTML5 `required`/`type` attributes for
// immediate feedback; every submission is re-validated here regardless of
// what the browser already checked.

// Each option identifies a situation where someone actually needs to reach
// a person at GSX — not ordinary product-info questions the site itself
// already answers.
export const CONTACT_REASONS = [
  'Retailer / Wholesale Inquiry',
  'Existing Retailer Support',
  'Product Concern or Feedback',
  'Business / Partnership Inquiry',
  'Website / Technical Issue',
  'Other',
] as const

export type ContactReason = (typeof CONTACT_REASONS)[number]

// Field limits — generous enough for real messages, small enough to reject
// bulk/garbage payloads outright.
const NAME_MAX = 100
const EMAIL_MAX = 254 // RFC 5321 max mailbox length
const PHONE_MAX = 30
const COMPANY_MAX = 150
const MESSAGE_MAX = 2000
const HONEYPOT_MAX = 200 // never expected to be non-empty; just a sane upper bound

export const contactFormSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(NAME_MAX),
  email: z.string().trim().min(1, 'Email is required').max(EMAIL_MAX).email('Enter a valid email address'),
  phone: z.string().trim().max(PHONE_MAX).optional().default(''),
  company: z.string().trim().max(COMPANY_MAX).optional().default(''),
  reason: z.enum(CONTACT_REASONS, { error: 'Select a reason for contacting GSX' }),
  message: z.string().trim().min(1, 'Message is required').max(MESSAGE_MAX),
  // Anti-spam fields — not shown to the visitor as form content, but part
  // of every real submission from the actual page.
  renderedAt: z.number({ error: 'Missing form timing data' }),
  gsxHpToken: z.string().max(HONEYPOT_MAX).optional().default(''),
})

export type ContactFormInput = z.infer<typeof contactFormSchema>
