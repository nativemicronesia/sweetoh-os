-- Sweet'Oh launch: structured customer contact fields on studio_project,
-- alongside the existing prose notes (not replacing it).
ALTER TABLE "studio_project" ADD COLUMN "customer_email" text;
ALTER TABLE "studio_project" ADD COLUMN "customer_name" text;
