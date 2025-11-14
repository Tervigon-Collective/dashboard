# Brandkit Data Structure Mapping

## Backend vs Frontend Field Mapping

The backend has a different data structure than the frontend form. Here's how fields are mapped:

### Basic Information
| Frontend Field | Backend Field | Notes |
|---------------|---------------|-------|
| `brand_name` | `brand_name` | Direct mapping |
| `brand_id` | `brand_id` | Direct mapping |
| `tagline` | `brand_essence.tagline` | Nested in brand_essence |

### Brand Voice
| Frontend Field | Backend Field | Notes |
|---------------|---------------|-------|
| `brand_voice_primary` | `brand_voice.primary` OR `tone_profile.primary` | Fallback to tone_profile |
| `brand_voice_secondary` | `brand_voice.alternates` | Array of alternate voices |
| `brand_voice_avoid` | N/A | Not in backend structure |

### Brand Essence
| Frontend Field | Backend Field | Notes |
|---------------|---------------|-------|
| `core_message` | `brand_essence.core_message` | Direct mapping |
| `key_pillars` | `unique_selling_points` | Array of USPs |
| `emotional_territory` | `brand_essence.archetype_blend` | Converted from object to string |

### Target Audience
| Frontend Field | Backend Field | Notes |
|---------------|---------------|-------|
| `target_audience_primary` | `target_audience.primary` OR `target_audience` (if string) | Can be string or object |
| `target_audience_psychographics` | `target_audience.psychographics` | Array |

### Color Palette
| Frontend Field | Backend Field | Notes |
|---------------|---------------|-------|
| `color_primary` | `color_palette[0]` | First color in array |
| `color_secondary` | `color_palette[1..]` | All colors except first and last |
| `color_accent` | `color_palette[last]` | Last color in array |

**Backend Structure:**
```json
{
  "color_palette": ["#d67578", "#f1b5ad", "#4e8cc5", ...]  // 23 colors
}
```

### Typography
| Frontend Field | Backend Field | Notes |
|---------------|---------------|-------|
| `typography_primary` | `typography.primary` | Direct mapping |
| `typography_secondary` | `typography.secondary` | Direct mapping |

### Tone Guide
| Frontend Field | Backend Field | Notes |
|---------------|---------------|-------|
| `tone_dos` | `style_guide.dos` | Array of guidelines |
| `tone_donts` | `style_guide.donts` | Array of don'ts |

### Brand Vocabulary
| Frontend Field | Backend Field | Notes |
|---------------|---------------|-------|
| `preferred_terms` | `keywords.hero_words` OR `brand_vocabulary.hero_words` | Fallback chain |
| `avoid_terms` | `keywords.words_to_avoid` OR `brand_vocabulary.words_to_avoid` | Fallback chain |
| `core_products` | `keywords.product_categories` OR `brand_vocabulary.product_categories` | Fallback chain |

### Competitors
| Frontend Field | Backend Field | Notes |
|---------------|---------------|-------|
| `competitors` | `competitors` | Direct mapping, array of objects |

---

## Backend JSON Structure (Tilting Heads)

```json
{
  "brand_id": "tilting_heads",
  "brand_name": "Tilting Heads",
  "brand_description": "...",
  "niche": "Pet Biome Rituals™",
  "version": "1.0.0",
  "updated_at": "2025-11-12T12:05:36.474700",
  
  "color_palette": ["#d67578", "#f1b5ad", ...],  // 23 colors
  
  "typography": {
    "primary": "Workshop",
    "secondary": "NauticaRounded-Regular",
    "fallback_stack": null
  },
  
  "tone_profile": {
    "primary": "Calm, emotional, poetic, assertive, respectful"
  },
  
  "style_guide": {
    "dos": ["Focus on biology-first care...", ...],
    "donts": ["Use artificial fragrance...", ...]
  },
  
  "keywords": {
    "hero_words": ["Biome-safe", "instinctive care", ...],
    "words_to_avoid": ["Scented", "pamper", ...]
  },
  
  "brand_essence": {
    "core_message": "...",
    "tagline": "Let Nature Lead.",
    "archetype_blend": {
      "caregiver": "80% — Nurturing...",
      "explorer": "20% — Curious..."
    }
  },
  
  "unique_selling_points": [
    "First Indian brand to champion...",
    ...
  ],
  
  "competitors": [
    {
      "name": "...",
      "differentiator": "...",
      "our_advantage": "..."
    }
  ],
  
  "brand_voice": {
    "primary": "Calm, emotional, poetic, assertive, respectful",
    "alternates": [],
    "voice_attributes": []
  },
  
  "brand_vocabulary": {
    "hero_words": [...],
    "words_to_avoid": [...],
    "product_categories": []
  }
}
```

---

## Frontend Form Structure

The frontend form expects a normalized structure:

```javascript
{
  // Basic
  brand_name: string,
  brand_id: string,
  tagline: string,
  
  // Voice
  brand_voice_primary: string,
  brand_voice_secondary: string[],
  brand_voice_avoid: string[],
  
  // Essence
  core_message: string,
  key_pillars: string[],
  emotional_territory: string,
  
  // Audience
  target_audience_primary: string,
  target_audience_psychographics: string[],
  
  // Colors
  color_primary: string,      // hex color
  color_secondary: string[],  // array of hex colors
  color_accent: string,       // hex color
  
  // Typography
  typography_primary: string,
  typography_secondary: string,
  
  // Tone
  tone_dos: string[],
  tone_donts: string[],
  
  // Vocabulary
  preferred_terms: string[],
  avoid_terms: string[],
  core_products: string[],
  
  // Competitors
  competitors: Array<{
    name: string,
    positioning: string
  }>
}
```

---

## Data Transformation Logic

### Loading Backend Data (Edit Mode)

```javascript
// Color palette transformation
const colorPalette = Array.isArray(editBrandkit.color_palette) 
  ? editBrandkit.color_palette 
  : [];

// Takes first color as primary
color_primary: colorPalette[0] || "#2C5F4F"

// Takes all middle colors as secondary
color_secondary: colorPalette.slice(1) || []

// Takes last color as accent  
color_accent: colorPalette[colorPalette.length - 1] || "#D4A574"
```

### Saving to Backend (Create/Update)

The form sends data in the frontend structure, and the backend should handle the transformation.

---

## Known Differences

1. **Color Palette**: Backend uses single array, frontend splits into primary/secondary/accent
2. **Key Pillars**: Backend uses `unique_selling_points`, frontend calls them `key_pillars`
3. **Brand Voice**: Backend has both `brand_voice` and `tone_profile`, frontend uses single `brand_voice_primary`
4. **Vocabulary**: Backend has both `keywords` and `brand_vocabulary`, frontend checks both

---

## Recommendations

For better compatibility, consider:

1. **Backend Update**: Accept frontend structure directly
2. **Or Frontend Update**: Transform data before sending to backend
3. **Validation**: Ensure array fields are properly initialized as arrays, not null
4. **Default Values**: Provide sensible defaults for optional fields

---

## Testing Data

When testing, ensure:
- Color palette has at least 3 colors
- Arrays are properly initialized (not null)
- Nested objects exist before accessing properties
- Fallback chains work correctly

