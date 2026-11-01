ALTER TABLE players ADD COLUMN quests jsonb NOT NULL DEFAULT '[]'::jsonb;
--> statement-breakpoint
UPDATE players SET quests = jsonb_build_array(
  jsonb_build_object(
    'id', 'q_legacy_' || (quest->>'id'),
    'giverNpcId', quest->'giverNpcId', 'title', quest->'title',
    'description', quest->'description', 'steps', jsonb_build_array(quest->'objective'),
    'scope', 'solo', 'reward', quest->'reward',
    'progress', jsonb_build_array(
      CASE quest->'objective'->>'type'
        WHEN 'GO_TO' THEN world->'visitedLocations' ? (quest->'objective'->>'locationId')
        WHEN 'TALK_TO' THEN world->'talkedTo' ? (quest->'objective'->>'npcId')
        WHEN 'DELIVER' THEN world->'deliveredItems' ? ((quest->'objective'->>'itemId') || ':' || (quest->'objective'->>'npcId'))
        ELSE false
      END
    ),
    'status', CASE
      WHEN quest->'objective'->>'type' = 'GO_TO' AND world->'visitedLocations' ? (quest->'objective'->>'locationId') THEN 'ready'
      WHEN quest->'objective'->>'type' = 'TALK_TO' AND world->'talkedTo' ? (quest->'objective'->>'npcId') THEN 'ready'
      WHEN quest->'objective'->>'type' = 'DELIVER' AND world->'deliveredItems' ? ((quest->'objective'->>'itemId') || ':' || (quest->'objective'->>'npcId')) THEN 'ready'
      ELSE 'active' END,
    'createdAt', floor(extract(epoch FROM created_at) * 1000)
  )
) WHERE quest IS NOT NULL AND quest <> 'null'::jsonb;
--> statement-breakpoint
UPDATE players SET completed = (
  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'id', entry->'id', 'title', entry->'title', 'giverNpcId', entry->'giverNpcId',
    'reward', entry->'reward', 'completedAt', floor(extract(epoch FROM seen_at) * 1000)
  )), '[]'::jsonb) FROM jsonb_array_elements(completed) AS entry
);
--> statement-breakpoint
ALTER TABLE players DROP COLUMN quest;
