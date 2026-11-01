CREATE TYPE "public"."approval_action" AS ENUM('approve', 'revoke');--> statement-breakpoint
CREATE TABLE "approval_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"course_id" integer NOT NULL,
	"exercise_id" text NOT NULL,
	"case_position" integer NOT NULL,
	"output_hash" text NOT NULL,
	"action" "approval_action" NOT NULL,
	"actor_id" uuid,
	"submission_id" uuid,
	"reason" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "approved_outputs" (
	"id" serial PRIMARY KEY NOT NULL,
	"course_id" integer NOT NULL,
	"exercise_id" text NOT NULL,
	"case_position" integer NOT NULL,
	"output_hash" text NOT NULL,
	"output_sample" text NOT NULL,
	"approved_by" uuid,
	"reason" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "submission_results" ADD COLUMN "output_hash" text;--> statement-breakpoint
ALTER TABLE "approval_events" ADD CONSTRAINT "approval_events_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval_events" ADD CONSTRAINT "approval_events_exercise_id_exercises_id_fk" FOREIGN KEY ("exercise_id") REFERENCES "public"."exercises"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval_events" ADD CONSTRAINT "approval_events_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval_events" ADD CONSTRAINT "approval_events_submission_id_submissions_id_fk" FOREIGN KEY ("submission_id") REFERENCES "public"."submissions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approved_outputs" ADD CONSTRAINT "approved_outputs_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approved_outputs" ADD CONSTRAINT "approved_outputs_exercise_id_exercises_id_fk" FOREIGN KEY ("exercise_id") REFERENCES "public"."exercises"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approved_outputs" ADD CONSTRAINT "approved_outputs_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "approval_events_course" ON "approval_events" USING btree ("course_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "approved_outputs_unique" ON "approved_outputs" USING btree ("course_id","exercise_id","case_position","output_hash");