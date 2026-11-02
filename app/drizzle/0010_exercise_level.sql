CREATE TYPE "public"."exercise_level" AS ENUM('perus', 'soveltava', 'haaste');--> statement-breakpoint
ALTER TABLE "exercises" ADD COLUMN "level" "exercise_level" DEFAULT 'perus' NOT NULL;