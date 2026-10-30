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

A compressed District 1 loop, about 160 × 160 units, bounded by the Sài Gòn River and outer streets. Landmark order and bearings come from OpenStreetMap with Chợ Bến Thành at the origin; distances are shortened so any stop is a short walk or one bus ride. Game +x follows Lê Lợi, so real north points up and to the right on the map.

| Landmark | Real offset from the market | Game position |
| --- | --- | --- |
| Chợ Bến Thành | origin | (−23, −12) |
| Tòa Thị Chính, head of Nguyễn Huệ | 550 m at 35° | (69, −26) |
| Nhà thờ Đức Bà, Công xã Paris | 810 m at 7° | (88, −95) |
| Riverside promenade | 1.1 km at 64° | z = 35 |

Lê Lợi links the market to Nguyễn Huệ, a paved walking street with planters and a fountain that ends at the City Hall forecourt. Đồng Khởi runs north from Lê Lợi to the cathedral square. The bus follows a road tree with Lê Lợi as its trunk. Towers across the river are background only. The camera follows the player from above; dragging changes its heading.

The player starts in front of the market, facing Cô Hoa. The first decision is whether to help her or explore. The first cost is a bus fare. A short ride reveals the district before the park arrival and first reward. Five places to discover support free exploration after delivery.

Modular shophouses, palms, pavement, stall props, benches, and ambient pedestrians form the surrounding city. Static building colliders use simple Rapier proxies; detailed meshes do not drive collision.
