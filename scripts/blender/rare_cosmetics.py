"""Authored rare shop cosmetics, using the standard avatar attachment helpers."""
import math


def rare_cosmetics(material, cone, torus, box, head_top):
    def lacquer_non_la():
        lacquer = material("lacquer-black", "#19202b", 0.18)
        gold = material("lacquer-gold", "#e9bc58", 0.3)
        parts = [
            cone("lacquer-shell", 0.34, 0.012, 0.27,
                 (0, 0, head_top + 0.05), lacquer, 32),
            torus("gold-bound-rim", 0.335, 0.009,
                  (0, 0, head_top - 0.083), gold, 32, 6),
            cone("gold-crown", 0.035, 0.006, 0.037,
                 (0, 0, head_top + 0.19), gold, 12),
        ]
        for angle in (-0.55, 0, 0.55):
            rib = box("gold-lacquer-inlay", (0.009, 0.22, 0.006),
                      (math.sin(angle) * 0.16, -math.cos(angle) * 0.16,
                       head_top + 0.062), gold, 0)
            rib.rotation_euler = (math.atan(0.27 / 0.328), 0, angle)
            parts.append(rib)
        return parts

    def silk_scarf():
        silk = material("silk-crimson", "#a31f46", 0.32)
        gold = material("silk-gold", "#f0c66d", 0.4)
        ring = torus("silk-fold", 0.17, 0.048,
                     (0, 0, 0.345), silk, 24, 8)
        ring.scale = (1, 0.7, 0.5)
        parts = [ring]
        for side, bottom in ((-1, 0.218), (1, 0.242)):
            tail = box("silk-tail", (0.065, 0.021, 0.12),
                       (side * 0.048, -0.143, bottom + 0.06), silk, 0.004)
            border = box("woven-gold-border", (0.065, 0.006, 0.013),
                         (side * 0.048, -0.157, bottom + 0.009), gold, 0)
            parts.extend([tail, border])
            for x in (-0.024, -0.008, 0.008, 0.024):
                parts.append(cone("gold-silk-tassel", 0.003, 0.003, 0.027,
                                  (side * 0.048 + x, -0.145, bottom - 0.014),
                                  gold, 5))
            for dx, dz in ((0, 0.012), (-0.012, 0), (0.012, 0), (0, -0.012)):
                leaf = box("woven-lotus", (0.012, 0.005, 0.012),
                           (side * 0.048 + dx, -0.158,
                            bottom + 0.065 + dz), gold, 0)
                leaf.rotation_euler.y = math.pi / 4
                parts.append(leaf)
        return parts

    return {
        "lacquer-non-la": (lacquer_non_la, "head"),
        "silk-scarf": (silk_scarf, "torso"),
    }
