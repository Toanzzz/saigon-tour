CREATE TABLE "item_actions" (
  "player_id" uuid NOT NULL REFERENCES "players"("id") ON DELETE CASCADE,
  "request_id" uuid NOT NULL,
  "fingerprint" text NOT NULL,
  "receipt" jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "item_actions_player_id_request_id_pk" PRIMARY KEY("player_id","request_id")
);
