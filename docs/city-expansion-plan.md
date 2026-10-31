# Saigon Tour — City Expansion Plan

## Goal

Build **one compressed “District 1 loop,” not a map replica**: preserve the real-world relationships between key Sài Gòn landmarks, but shrink distances and reuse modular city blocks.

The target is a city that is **small enough to walk in five minutes, dense enough to feel like Sài Gòn, and organized so every landmark supports a quest, transport stop, or NPC encounter**.

## Target Layout

Use a roughly **400 × 400 m authored play area** (or equivalent in-engine units), bounded by the Saigon River on one side and invisible walls or natural barriers elsewhere.

```text
            Saigon River / waterfront
                 |
       City Hall — Nguyễn Huệ Walking Street
                 |
        Opera House — Đồng Khởi shops
                 |
   Notre-Dame — Central Post Office — small square
                 |
          Lê Lợi / commercial street
                 |
          Bến Thành Market + Metro/bus hub
                 |
      Bùi Viện-style nightlife alley / food street
```

This preserves the real spatial logic of central District 1:

- Nguyễn Huệ runs from City Hall toward the Saigon River.
- Bến Thành Market anchors the market and transport side.
- Notre-Dame and the Central Post Office form a recognizable civic square.
- Đồng Khởi and the Opera House form the colonial/cultural core.
- Bùi Viện provides a contrasting nightlife and street-food area.

## Landmark Anchors

Build **6–8 recognizable landmarks** at reduced scale. Do not create full interiors except where needed for gameplay, such as Bến Thành Market.

| Landmark                         | Gameplay role                                        | Size approach                                      |
| -------------------------------- | ---------------------------------------------------- | -------------------------------------------------- |
| Bến Thành Market                 | Transport hub, quest destination, market NPC cluster | Simplified clock-tower façade plus interior stalls |
| Nguyễn Huệ Walking Street        | Main pedestrian spine, events, crowds                | Wide plaza, trees, fountains, benches              |
| City Hall / People’s Committee   | Northern visual anchor                               | Façade-only, non-enterable                         |
| Saigon River waterfront          | Natural boundary and scenic route                    | Railings, boats, riverbank walk                    |
| Opera House                      | Cultural quest location                              | Simplified exterior plus plaza                     |
| Notre-Dame + Central Post Office | Paired landmark square                               | Two façades facing a compact plaza                 |
| Bùi Viện-style alley             | Food, neon, nightlife NPCs                           | Narrow street, signs, stalls                       |
| Tao Đản-like park                | Quiet contrast, NPC encounter space                  | Trees, paths, exercise equipment                   |

## Street Modules

Create **3–4 tileable block types** and reuse them with color, signage, and prop variation.

### Shophouse block

- Narrow 3–5 story buildings.
- Balconies, awnings, shutters, and vertical signage.
- Motorbikes, delivery boxes, plants, and street vendors.

### Colonial block

- Yellow or cream façades.
- Arched windows, columns, and larger setbacks.
- Suitable around the Opera House, Post Office, and Notre-Dame area.

### Modern block

- Glass towers or mid-rise offices.
- Use sparingly to create skyline contrast.
- Best placed near the river or as distant background geometry.

### Market / alley block

- Dense food stalls and market tables.
- Plastic stools, hanging cables, neon signs, and awnings.
- Best for Bến Thành Market and Bùi Viện-style areas.

The city should feel dense because the **street rhythm** is dense, not because the map is physically large.

## Distance Compression

Keep landmark order and sightlines accurate, but reduce block length so walking between quests remains enjoyable.

| Real-world relationship          | In-game distance |
| -------------------------------- | ---------------- |
| Bến Thành Market to Notre-Dame   | 150–250 m        |
| Bến Thành Market to Nguyễn Huệ   | 100–180 m        |
| Nguyễn Huệ to riverfront         | 50–100 m         |
| Opera House to Notre-Dame square | 80–150 m         |

A good rule: **a player should reach any major landmark within 60–90 seconds on foot**. The xe ôm, bus, or metro shuttle should make longer trips feel faster and more scenic.

## City Life Details

### Visual density

- Vietnamese shop signs, banners, neon, and vertical signage.
- Air-conditioners, balconies, awnings, and tangled cables.
- Motorbikes, delivery boxes, plastic stools, and food carts.
- Trees in pots, bus stops, benches, and street lamps.
- Market stalls with colorful goods and hanging decorations.

### Crowd illusion

- Place 10–20 low-poly pedestrians near markets, plazas, and transport stops.
- Animate only agents near the player.
- Use simple idle, walk, talk, and browse animations.

### Audio

- Traffic and distant horns.
- Market chatter and vendor calls.
- River/waterfront ambience.
- Music or nightlife ambience near the Bùi Viện-style alley.

### Time of day

- **Daytime:** busy market, traffic, tourists, food stalls.
- **Evening:** neon signs, river lights, Nguyễn Huệ crowds, nightlife activity.

## Performance Rules

Target at least **60 FPS on desktop** and **72 FPS on Quest 3 VR**.

- Use instancing for shophouses, trees, signs, stalls, motorbikes, and street props.
- Bake lighting where possible; minimize real-time shadow-casting lights.
- Use façade-only landmarks; avoid full interiors except for essential gameplay spaces.
- Add LODs for buildings, props, vehicles, and NPCs.
- Simulate NPCs and traffic only near the player.
- Place distant towers, including a stylized Landmark 81-like silhouette, beyond the playable boundary as background geometry.

## Implementation Phases

### Phase 1 — Core loop

1. Polish Bến Thành Market, Nguyễn Huệ, City Hall, and riverfront.
2. Build the main road network, sidewalks, and crossing points.
3. Place 3 quest-relevant NPCs.
4. Add one transport route, preferably xe ôm or city bus.
5. Add street props, signage, and ambient pedestrians.

### Phase 2 — Cultural identity

1. Add the Opera House, Notre-Dame, and Central Post Office square.
2. Add a Đồng Khởi-style shopping street.
3. Add a compact park and Bùi Viện-style alley.
4. Introduce new NPC types: vendor, student, tourist, xe ôm driver, café owner.

### Phase 3 — Make it feel alive

1. Add a second transport route: bus or metro shuttle.
2. Add market stalls with purchasable items.
3. Add time-of-day lighting and evening crowd variation.
4. Add one “postcard” viewpoint, such as the riverfront looking back toward the skyline.

## Scope Guardrails

Do **not** include:

- A large open-world map or full city scale.
- An accurate geographic replica of Ho Chi Minh City.
- Chợ Lớn or District 5.
- Landmark 81 as a visitable interior location.
- A full metro network.
- Full traffic simulation.
- Photorealistic assets.

Keep the project focused on a **stylized, hand-authored District 1-inspired district** that supports the AI NPC, transport, and quest systems.

## Success Criteria

The expanded city is successful when:

- A new player can recognize the Sài Gòn setting within seconds.
- Major landmarks are visually distinct and connected by believable streets.
- Walking between quest locations remains short and enjoyable.
- Transport provides a meaningful shortcut rather than being decorative.
- The city feels busy through props, signage, audio, and limited ambient agents.
- The scene remains performant on desktop and Quest 3 VR.
