CREATE TABLE "course_memberships" (
	"course_id" integer NOT NULL,
	"user_id" uuid NOT NULL,
	"role" "user_role" NOT NULL,
	"last_launch_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "course_memberships_course_id_user_id_pk" PRIMARY KEY("course_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "courses" (
	"id" serial PRIMARY KEY NOT NULL,
	"platform_id" integer NOT NULL,
	"context_id" text NOT NULL,
	"title" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lti_identities" (
	"platform_id" integer NOT NULL,
	"sub" text NOT NULL,
	"user_id" uuid NOT NULL,
	CONSTRAINT "lti_identities_platform_id_sub_pk" PRIMARY KEY("platform_id","sub")
);
--> statement-breakpoint
CREATE TABLE "lti_launch_states" (
	"state" text PRIMARY KEY NOT NULL,
	"nonce" text NOT NULL,
	"platform_id" integer NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lti_platforms" (
	"id" serial PRIMARY KEY NOT NULL,
	"issuer" text NOT NULL,
	"client_id" text NOT NULL,
	"auth_login_url" text NOT NULL,
	"auth_token_url" text NOT NULL,
	"jwks_url" text NOT NULL,
	"deployment_ids" text[] DEFAULT '{}' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "email" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "course_memberships" ADD CONSTRAINT "course_memberships_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_memberships" ADD CONSTRAINT "course_memberships_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "courses" ADD CONSTRAINT "courses_platform_id_lti_platforms_id_fk" FOREIGN KEY ("platform_id") REFERENCES "public"."lti_platforms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lti_identities" ADD CONSTRAINT "lti_identities_platform_id_lti_platforms_id_fk" FOREIGN KEY ("platform_id") REFERENCES "public"."lti_platforms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lti_identities" ADD CONSTRAINT "lti_identities_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lti_launch_states" ADD CONSTRAINT "lti_launch_states_platform_id_lti_platforms_id_fk" FOREIGN KEY ("platform_id") REFERENCES "public"."lti_platforms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "courses_platform_context" ON "courses" USING btree ("platform_id","context_id");--> statement-breakpoint
CREATE UNIQUE INDEX "lti_platforms_issuer_client" ON "lti_platforms" USING btree ("issuer","client_id");