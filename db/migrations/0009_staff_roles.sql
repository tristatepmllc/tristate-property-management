-- Staff roles for admin accounts. Applied automatically by
-- ensureAdminSchema (src/lib/admin.ts); recorded here for fresh installs.
-- NULL = owner (admins created before roles existed keep full access).
-- Values: owner | manager | dispatch | sales | viewer.
-- A removed staff member has accounts.role = 'disabled' and no credential.
ALTER TABLE accounts ADD COLUMN staff_role TEXT;
