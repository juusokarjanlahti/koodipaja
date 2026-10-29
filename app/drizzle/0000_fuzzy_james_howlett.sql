CREATE TYPE "public"."submission_status" AS ENUM('queued', 'running', 'done', 'error');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('student', 'teacher');--> statement-breakpoint
CREATE TABLE "exercises" (
	"id" text PRIMARY KEY NOT NULL,
	"language" text NOT NULL,
	"title" text NOT NULL,
	"difficulty" integer NOT NULL,
	"topics" text[] DEFAULT '{}' NOT NULL,
	"prompt_markdown" text NOT NULL,
	"starter_code" text NOT NULL,
	"time_limit_seconds" integer NOT NULL,
	"memory_limit_mb" integer NOT NULL,
	"content_hash" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "submission_results" (
	"id" serial PRIMARY KEY NOT NULL,
	"submission_id" uuid NOT NULL,
	"test_case_id" integer NOT NULL,
	"passed" boolean NOT NULL,
	"judge_status" text NOT NULL,
	"stdout" text,
	"stderr" text,
	"time_ms" integer,
	"memory_kb" integer
);
--> statement-breakpoint
CREATE TABLE "submissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"exercise_id" text NOT NULL,
	"source_code" text NOT NULL,
	"status" "submission_status" DEFAULT 'queued' NOT NULL,
	"passed_count" integer DEFAULT 0 NOT NULL,
	"total_count" integer DEFAULT 0 NOT NULL,
	"error_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "test_cases" (
	"id" serial PRIMARY KEY NOT NULL,
	"exercise_id" text NOT NULL,
	"position" integer NOT NULL,
	"name" text NOT NULL,
	"stdin" text NOT NULL,
	"expected_stdout" text NOT NULL,
	"hidden" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"display_name" text,
	"role" "user_role" DEFAULT 'student' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "submission_results" ADD CONSTRAINT "submission_results_submission_id_submissions_id_fk" FOREIGN KEY ("submission_id") REFERENCES "public"."submissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submission_results" ADD CONSTRAINT "submission_results_test_case_id_test_cases_id_fk" FOREIGN KEY ("test_case_id") REFERENCES "public"."test_cases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_exercise_id_exercises_id_fk" FOREIGN KEY ("exercise_id") REFERENCES "public"."exercises"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "test_cases" ADD CONSTRAINT "test_cases_exercise_id_exercises_id_fk" FOREIGN KEY ("exercise_id") REFERENCES "public"."exercises"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "submission_results_submission" ON "submission_results" USING btree ("submission_id");--> statement-breakpoint
CREATE INDEX "submissions_user_exercise" ON "submissions" USING btree ("user_id","exercise_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "test_cases_exercise_position" ON "test_cases" USING btree ("exercise_id","position");