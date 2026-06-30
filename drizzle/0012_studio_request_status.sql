-- Sweet'Oh custom request lifecycle: New → Reviewing → Approved → In Production → Completed
ALTER TYPE "public"."studio_project_status" RENAME TO "studio_project_status_old";--> statement-breakpoint
CREATE TYPE "public"."studio_project_status" AS ENUM('new', 'reviewing', 'approved', 'in_production', 'completed');--> statement-breakpoint
ALTER TABLE "studio_project" ALTER COLUMN "status" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "studio_project" ALTER COLUMN "status" TYPE "studio_project_status" USING (
  CASE "status"::text
    WHEN 'draft' THEN 'new'
    WHEN 'ready_for_review' THEN 'reviewing'
    WHEN 'in_progress' THEN 'in_production'
    WHEN 'approved' THEN 'approved'
    WHEN 'archived' THEN 'completed'
    ELSE 'new'
  END
)::"studio_project_status";--> statement-breakpoint
ALTER TABLE "studio_project" ALTER COLUMN "status" SET DEFAULT 'new';--> statement-breakpoint
DROP TYPE "public"."studio_project_status_old";
