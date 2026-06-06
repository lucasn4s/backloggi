CREATE TABLE "games" (
	"igdb_id" integer PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"cover_url" text,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
