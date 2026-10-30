# A little journey through Sài Gòn

## Design brief

Be the neighbor who brings a small kindness across a lively city. Wander, talk, choose a route, ride, and deliver. The feeling is curious, welcoming, and unhurried.

Every 5–30 seconds the player chooses a direction, meets someone, boards a ride, or checks a landmark. Over three minutes, Cô Hoa entrusts fresh herbs to the player, Chị Linh receives them in the park, and the player earns coins, reputation, and a postcard.

Fares make route choice matter: walking is free, the bus costs 5 coins. A premature claim earns clear directions rather than a reward. Restart resets the session immediately. Better players read the map, use nearby stops, and spend fewer fares. No combat, health bar, or imposed deadline.

## Core loop contract

The player explores and talks to neighbors to deliver a market parcel while fares create a modest route-planning cost. Verified delivery earns spendable currency and a postcard; incomplete delivery keeps the quest active and tells the player what remains. A fresh journey is one menu action away.

- WASD / arrow keys and touch controls move; Shift sprints; drag rotates the camera.
- E / contextual action opens a nearby NPC or transport stop.
- Dialogue proposes a validated quest; the journal records its objective.
- A ride animates through the district and charges its displayed fare.
- Delivery consumes the carried parcel; verification grants each reward once.
- The same journey remains playable when the model or backend is unavailable, visibly labeled as an offline guide.

## Level plan

A compact district bounded by the river and outer streets. Market in the west, park in the east, cathedral northeast, riverside south. The camera follows the player from above; dragging changes its heading. Large landmark silhouettes and map labels provide orientation.

The player starts in front of the market, facing Cô Hoa. The first decision is whether to help her or explore. The first cost is a bus fare. A short ride reveals the district before the park arrival and first reward. Four landmark stamps support free exploration after delivery.

Modular shophouses, palms, pavement, stall props, benches, and ambient pedestrians form the surrounding city. Static building colliders use simple Rapier proxies; detailed meshes do not drive collision.
