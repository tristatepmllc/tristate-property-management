-- Adds "Which best describes you?" to leads, used by the rebuilt /contact/
-- form (Lessen-pattern: commercial vs residential property manager/owner).
-- Nullable, additive - the other four forms posting to /api/leads
-- (home hero, quote popup, careers, client-registration) never send this
-- field and are unaffected.

ALTER TABLE leads ADD COLUMN describes_you TEXT;
