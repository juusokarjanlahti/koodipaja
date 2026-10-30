CREATE TYPE "public"."grade_sync_status" AS ENUM('idle', 'pending', 'sent', 'failed');--> statement-breakpoint
CREATE TABLE "lti_grade_syncs" (
	"resource_link_id" integer NOT NULL,
	"user_id" uuid NOT NULL,
	"platform_user_id" text NOT NULL,
	"status" "grade_sync_status" DEFAULT 'idle' NOT NULL,
	"score_given" integer,
	"score_maximum" integer,
	"attempts" integer DEFAULT 0 NOT NULL,
	"last_error" text,
	"sent_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "lti_grade_syncs_resource_link_id_user_id_pk" PRIMARY KEY("resource_link_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "lti_resource_links" (
	"id" serial PRIMARY KEY NOT NULL,
	"platform_id" integer NOT NULL,
	"resource_link_id" text NOT NULL,
	"course_id" integer,
	"exercise_id" text,
	"line_item_url" text,
	"ags_scopes" text[] DEFAULT '{}' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "lti_grade_syncs" ADD CONSTRAINT "lti_grade_syncs_resource_link_id_lti_resource_links_id_fk" FOREIGN KEY ("resource_link_id") REFERENCES "public"."lti_resource_links"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lti_grade_syncs" ADD CONSTRAINT "lti_grade_syncs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lti_resource_links" ADD CONSTRAINT "lti_resource_links_platform_id_lti_platforms_id_fk" FOREIGN KEY ("platform_id") REFERENCES "public"."lti_platforms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lti_resource_links" ADD CONSTRAINT "lti_resource_links_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lti_resource_links" ADD CONSTRAINT "lti_resource_links_exercise_id_exercises_id_fk" FOREIGN KEY ("exercise_id") REFERENCES "public"."exercises"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "lti_resource_links_platform_link" ON "lti_resource_links" USING btree ("platform_id","resource_link_id");