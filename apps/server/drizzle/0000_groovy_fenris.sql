CREATE TABLE "model_spend" (
	"day" text PRIMARY KEY NOT NULL,
	"calls" integer DEFAULT 0 NOT NULL,
	"reserved_usd" numeric DEFAULT '0' NOT NULL,
	"input_tokens" integer DEFAULT 0 NOT NULL,
	"output_tokens" integer DEFAULT 0 NOT NULL,
	"barks" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "npc_facts" (
	"player_id" uuid NOT NULL,
	"npc_id" text NOT NULL,
	"fact" text NOT NULL,
	"importance" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "npc_facts_player_id_npc_id_fact_pk" PRIMARY KEY("player_id","npc_id","fact")
);
--> statement-breakpoint
CREATE TABLE "npc_greetings" (
	"key" text PRIMARY KEY NOT NULL,
	"reply" text NOT NULL,
	"source" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "players" (
	"id" uuid PRIMARY KEY NOT NULL,
	"token_hash" text NOT NULL,
	"name" text NOT NULL,
	"color" text NOT NULL,
	"world" jsonb NOT NULL,
	"quest" jsonb,
	"completed" jsonb NOT NULL,
	"reputation" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "players_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "quest_completions" (
	"player_id" uuid NOT NULL,
	"quest_id" text NOT NULL,
	CONSTRAINT "quest_completions_player_id_quest_id_pk" PRIMARY KEY("player_id","quest_id")
);
--> statement-breakpoint
ALTER TABLE "npc_facts" ADD CONSTRAINT "npc_facts_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quest_completions" ADD CONSTRAINT "quest_completions_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE cascade ON UPDATE no action;