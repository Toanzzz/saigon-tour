# A little journey through Sài Gòn

## Design brief

Be the neighbor who brings a small kindness across a lively city. Wander, talk, choose a route, ride, and deliver. The feeling is curious, welcoming, and unhurried.

Every 5–30 seconds the player chooses a direction, meets someone, boards a ride, or checks a landmark. Neighbors author small errands with one to three steps. Players choose which errands to follow, visit places, talk, deliver, or buy, then return to the giver for coins, reputation, and a persona-appropriate gift.

Fares make route choice matter: walking is free; rides cost 3–8 coins (cyclo 3, bus 5, metro 6, xe ôm 8). A premature claim earns clear directions rather than a reward. Restart resets the saved journey while keeping the guest identity. Better players read the map, use nearby stops, and spend fewer fares. No combat, health bar, or imposed deadline.

## Core loop contract

The player explores and talks to neighbors to complete neighbor-authored errands while fares create a modest route-planning cost. Verified delivery earns spendable currency and a gift; incomplete delivery keeps the quest active and tells the player what remains. A fresh journey is one menu action away.

- WASD / arrow keys and touch controls move; Shift sprints; drag rotates the camera.
- E / contextual action opens a nearby NPC or transport stop.
- Dialogue proposes a validated quest; the journal records each step and lets the player track an active quest.
- A ride animates through the district and charges its displayed fare.
- Delivery consumes the carried parcel; verification grants each reward once.
- The same journey remains playable when the model or backend is unavailable, visibly labeled as an offline guide.

## Level plan

A compressed District 1 loop, about 160 × 160 units, bounded by the Sài Gòn River and outer streets. Landmark order and bearings come from OpenStreetMap with Chợ Bến Thành at the origin; distances are shortened so any stop is a short walk or one bus ride. Game +x follows Lê Lợi, so real north points up and to the right on the map.

| Landmark                          | Real offset from the market | Game position |
| --------------------------------- | --------------------------- | ------------- |
| Chợ Bến Thành                     | origin                      | (−23, −12)    |
| Tòa Thị Chính, head of Nguyễn Huệ | 550 m at 35°                | (69, −26)     |
| Nhà thờ Đức Bà, Công xã Paris     | 810 m at 7°                 | (88, −95)     |
| Riverside promenade               | 1.1 km at 64°               | z = 35        |

Lê Lợi links the market to Nguyễn Huệ, a paved walking street with planters and a fountain that ends at the City Hall forecourt. Đồng Khởi runs north from Lê Lợi to the cathedral square. The bus follows a road tree with Lê Lợi as its trunk. Towers across the river are background only. The camera follows the player from above; dragging changes its heading.

The player starts in front of the market, facing Cô Hoa. The first decision is whether to help her or explore. The first cost is a bus fare. A short ride reveals the district before the park arrival and first reward. Eight locations support exploration between errands.

Modular shophouses, palms, pavement, stall props, benches, and ambient pedestrians form the surrounding city. Static building colliders use simple Rapier proxies; detailed meshes do not drive collision.

Scope guardrails: keep a stylized, hand-authored District 1, not a full-scale or geographically exact city; no Chợ Lớn or District 5, no visitable tower interiors, no full metro network or traffic simulation, and no photorealistic assets; the art target is a comic papercraft diorama (toon shading, warm paper palette, unlit neon and window glow), with `?look=classic` restoring the original render. Repeated props render through `ModelInstances`, and residents beyond 62 units are hidden. Targets are ≥ 60 FPS on desktop and ≥ 72 FPS on Quest 3.

## Shared neighborhood and co-op

Everyone shares one street room of twenty. When it is full, a waiting notice names the longest stroller, the game retries every ten seconds, and solo play continues. Anonymous guests retain progress in Postgres. The People control (`P`) shows the public room and party invitations; `Q` sends fixed emotes and phrases. Nearby tourists interpolate at a 150 ms delay. NPC room lines run on proximity events and bounded cooldowns. A City Director creates shared festivals, market rushes, rain, street music, and lost-item events, moves neighbors between authored anchors, and gives them needs that shape new errands. Event markers and the hub’s City pulse explain what is happening. Rain changes tint and fog.

Parties of two to four support invitations and shared presence. Each player’s quest journal and rewards are saved independently. A party speaker can receive a shared errand. Each recipient follows their own steps, then one return visit rewards all ready recipients once. The journal supports tracking and abandoning errands, and the minimap marks the tracked target. See `docs/multiplayer.md` for protocol, topology, and persistence behavior.

## Neighbors, residents, and friendship

Nine neighbors and twenty residents accept conversations and offer errands within their own domains. Walking residents pause and face the player within conversation range. The map shows smaller resident dots, and quest targets follow live positions.

Friendship ranges from −5 to +5. Neighbors start at +1; residents start mostly neutral, with a few reserved presets. Meaningful chat can shift friendship by one once per turn with a three-minute cooldown and a +3 chat ceiling. Completed errands add one for each rewarded participant. Abandoned, expired, or declined errands subtract one. At −3 or below, an NPC stays civil and offers no errands.

Players request errands in chat, give carried items through the conversation, and return to the giver for automatic thanks and rewards. Active errands expire after twenty minutes; ready errands persist. Reopening conversations shows earlier messages; journey reset clears conversation memory and friendship.

## Avatar and wardrobe

Players pick a plain young man or young woman with the gender toggle beside the name on the title screen; the dice rolls a body and a matching name. The body is identity, like the name: it can be changed later from the wardrobe or the Pause menu and survives a new journey. Both bodies are Kenney mini-characters whose shirt and trouser faces are split into recolourable `outfit-top` and `outfit-bottom` materials, so earned outfits recolour the clothing without touching skin or face.

Neighbor gifts land in the wardrobe as hats, outfits, accessories, rides, and follower pets, one equipped per slot. The wardrobe is a 3D fitting room: a turning avatar stage on one side and slot tabs with spinning item previews on the other. Earned items equip and unequip at any time — from the wardrobe (key `I`) while walking, riding, paused, or in the hub, or straight from the reward popup with "Wear now". Locked items show who grants them and at which friendship tier.
