CREATE TYPE "public"."output_match_mode" AS ENUM('lenient', 'exact');--> statement-breakpoint
ALTER TABLE "exercises" ADD COLUMN "output_match" "output_match_mode" DEFAULT 'lenient' NOT NULL;