# Shop illustrations

The source sheet contains isolated 2D item illustrations on warm ivory paper:
coffee, bananas, bánh mì, phở, lacquer nón lá, silk scarf, and festival áo dài.
The spare lotus cell remains in the source sheet.

Runtime files live in `apps/client/public/images/shop/`. Each WebP is 448 × 448;
`manifest.json` records the source dimensions, crop rectangles, and output sizes.

Rebuild runtime images:

```sh
bun scripts/prepare-shop-images.ts
```

The wearable illustrations depict inventory objects. Equipped wearables use their existing models.
