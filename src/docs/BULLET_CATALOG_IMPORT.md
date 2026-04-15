# Bullet Catalog Import Guide

## Expanded Bullet Catalog Data

The expanded bullet catalog is located in `scripts/bullet_catalog_import.json` and contains comprehensive real-world bullet specifications from major manufacturers.

### Brands Included

- **Hornady** - V-MAX, NTX, Match, ELD Match, InterLock
- **Sierra** - MatchKing, Tipped MatchKing (TMK)
- **Nosler** - Partition, Solid Base, AccuBond, RDF, Ballistic Tip
- **Berger** - VLD Hunting, VLD Target, Classic Hunter, Elite Hunter
- **Barnes** - TTSX, LRX (lead-free monolithic copper)
- **Swift** - A-Frame, Scirocco II
- **Speer** - Gold Dot
- **Winchester** - Power-Point
- **Lapua** - Scenar-L, FMJBT
- **Sako** - Gamehead

### Total Entries: 46 Bullet Products

### Data Structure

Each bullet entry includes:
- **brand** - Manufacturer name
- **product_name** - Official product name
- **short_name** - Display name (used in app UI)
- **product_line** - Family/series name
- **weight_grains** - Weight in grains
- **diameter** - Diameter in inches
- **caliber** - Caliber designation
- **bullet_style** - Style (HPBT, VLD, Boat Tail, etc.)
- **bullet_construction** - Construction type (Cup and Core, Bonded, Monolithic, Match, etc.)
- **intended_use** - Array of purposes (Hunting, Match, Target, Long Range, etc.)
- **ballistic_coefficient_g1** - G1 ballistic coefficient when available
- **package_quantity** - Bullets per box
- **lead_free** - Boolean indicating lead-free composition
- **manufacturer_sku** - Official SKU
- **status** - active/discontinued

### How to Import

#### Option 1: Manual Entry (Dashboard UI)
1. Go to ReloadingManagement page
2. Click "Manage Components" tab
3. Click "Add" button
4. Search catalog for bullets by brand, model, or weight
5. Select from autocomplete results to populate fields

#### Option 2: Bulk Import (Backend)
Use the Base44 import_data tool:
```javascript
import { base44 } from '@/api/base44Client';

const bulletsData = [/* from bullet_catalog_import.json */];
await base44.entities.ReloadingBulletCatalog.bulkCreate(bulletsData);
```

### Search & Autocomplete Features

The ComponentManager now supports intelligent searching:
- Type "Sierra" → Suggests all Sierra bullets
- Type "MatchKing" → Suggests all MatchKing variants
- Type "140" → Suggests all 140gr bullets
- Type "6.5" → Suggests all 6.5mm bullets

Bullets are matched across brand, product name, short name, weight, and style.

### Data Quality Notes

- All data sourced from official manufacturer websites
- Weights normalized to grain format (e.g., "140gr")
- Duplicates removed (same bullet in multiple weights stored separately)
- Ballistic coefficients sourced from official specifications
- Lead-free status accurate for Barnes and select Hornady NTX bullets

### Extending the Catalog

To add more bullets:
1. Edit `scripts/bullet_catalog_import.json`
2. Follow the same JSON structure
3. Use official manufacturer specifications
4. Include brand, product line, weight, and style at minimum
5. Test autocomplete search with new entries

### Related Documentation

- [ComponentManager](/docs/FEATURES_ADDED.md) - Bullet component management
- [ReloadingStockInventory](/docs/BULLET_CATALOG_IMPORT.md) - Stock tracking
- ReloadingBulletCatalog Entity Schema