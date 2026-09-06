-- Adds client/vendor profile fields to accounts on a database that already
-- has the auth-era schema (0001_auth.sql already applied). See db/schema.sql
-- for the fresh-install version of this same table and the full comment on
-- why role-specific columns live directly on accounts rather than in two
-- separate 1:1 tables - this file only needs the ALTERs, not that context.

ALTER TABLE accounts ADD COLUMN address TEXT;
ALTER TABLE accounts ADD COLUMN city TEXT;
ALTER TABLE accounts ADD COLUMN state TEXT;
ALTER TABLE accounts ADD COLUMN zip TEXT;
ALTER TABLE accounts ADD COLUMN property_type TEXT;
ALTER TABLE accounts ADD COLUMN preferred_contact TEXT;
ALTER TABLE accounts ADD COLUMN notes TEXT;

ALTER TABLE accounts ADD COLUMN trade TEXT;
ALTER TABLE accounts ADD COLUMN trades_other TEXT;
ALTER TABLE accounts ADD COLUMN service_area TEXT;
ALTER TABLE accounts ADD COLUMN license_number TEXT;
ALTER TABLE accounts ADD COLUMN license_expires INTEGER;
ALTER TABLE accounts ADD COLUMN insurance_on_file INTEGER NOT NULL DEFAULT 0;
ALTER TABLE accounts ADD COLUMN years_in_business TEXT;
ALTER TABLE accounts ADD COLUMN emergency_available INTEGER NOT NULL DEFAULT 0;
