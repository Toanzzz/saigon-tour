CREATE TABLE "coin_pickups" (
	"player_id" uuid NOT NULL,
	"coin_id" text NOT NULL,
	CONSTRAINT "coin_pickups_player_id_coin_id_pk" PRIMARY KEY("player_id","coin_id")
);
--> statement-breakpoint
ALTER TABLE "coin_pickups" ADD CONSTRAINT "coin_pickups_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE cascade ON UPDATE no action;