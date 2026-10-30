CREATE TABLE "concept_notes" (
	"user_id" uuid NOT NULL,
	"language" text NOT NULL,
	"concept_id" text NOT NULL,
	"note" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "concept_notes_user_id_language_concept_id_pk" PRIMARY KEY("user_id","language","concept_id")
);
--> statement-breakpoint
CREATE TABLE "concepts" (
	"language" text NOT NULL,
	"id" text NOT NULL,
	"title" text NOT NULL,
	"topic" text NOT NULL,
	"position" integer NOT NULL,
	"explanation_markdown" text NOT NULL,
	"example_code" text NOT NULL,
	"example_stdin" text DEFAULT '' NOT NULL,
	"example_stdout" text NOT NULL,
	"content_hash" text NOT NULL,
	CONSTRAINT "concepts_language_id_pk" PRIMARY KEY("language","id")
);
--> statement-breakpoint
ALTER TABLE "exercises" ADD COLUMN "concepts" text[] DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE "concept_notes" ADD CONSTRAINT "concept_notes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;