-- Brings /vendor-network/ up to the field depth of a Lessen-style vendor
-- application: primary + secondary trade each with its own license number,
-- service radius, work-type coverage, Secretary of State standing, whether
-- the applicant will use our client/vendor portal, and how they heard about
-- us. All additive and nullable - existing rows are unaffected. See
-- db/schema.sql for the fresh-install version of this same table.

ALTER TABLE vendors ADD COLUMN license_number TEXT;
ALTER TABLE vendors ADD COLUMN secondary_trade TEXT;
ALTER TABLE vendors ADD COLUMN secondary_license_number TEXT;
ALTER TABLE vendors ADD COLUMN service_radius TEXT;
ALTER TABLE vendors ADD COLUMN work_types TEXT;
ALTER TABLE vendors ADD COLUMN sos_active TEXT;
ALTER TABLE vendors ADD COLUMN uses_portal TEXT;
ALTER TABLE vendors ADD COLUMN referral_source TEXT;
