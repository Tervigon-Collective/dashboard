# Brandkit System - API Reference

Quick reference for developers working with the brandkit system.

---

## 📦 Import Paths

```javascript
// API Functions
import * as brandkitApi from "@/services/contentGenerationApi";

// Context Hook
import { useBrandkit } from "@/contexts/BrandkitContext";

// UI Components
import BrandkitSelector from "@/components/BrandkitSelector";
import BrandkitFormModal from "@/components/BrandkitFormModal";
import BrandkitManagementModal from "@/components/BrandkitManagementModal";
import BrandkitLogoUpload from "@/components/BrandkitLogoUpload";
```

---

## 🔌 API Functions

### Get All Brandkits
```javascript
const response = await brandkitApi.getBrandkits();
// Returns: { brandkits: BrandkitSummary[] }
```

### Get Active Brandkit
```javascript
const brandkit = await brandkitApi.getActiveBrandkit();
// Returns: Brandkit (full object)
```

### Get Specific Brandkit
```javascript
const brandkit = await brandkitApi.getBrandkit("brand_id");
// Returns: Brandkit (full object)
```

### Create Brandkit
```javascript
const response = await brandkitApi.createBrandkit({
  brand_id: "my_brand",
  brand_name: "My Brand",
  brand_voice: {
    primary: "Calm, Professional",
    secondary: ["Assertive"],
    avoid: ["Aggressive"]
  },
  brand_essence: {
    core_message: "Quality and trust",
    key_pillars: ["Quality", "Trust", "Innovation"]
  },
  target_audience: {
    primary: "Professionals 30-50"
  }
  // ... other optional fields
});
// Returns: { message, brand_id, brand_name }
```

### Update Brandkit
```javascript
const response = await brandkitApi.updateBrandkit("brand_id", {
  tagline: "New tagline",
  color_palette: {
    primary: "#NEW_COLOR"
  }
  // Only include fields to update
});
// Returns: { message, brand_id }
```

### Delete Brandkit
```javascript
const response = await brandkitApi.deleteBrandkit("brand_id");
// Returns: { message, brand_id }
// Error if brandkit is active
```

### Activate Brandkit
```javascript
const response = await brandkitApi.activateBrandkit("brand_id");
// Returns: { message, brand_id, brand_name }
```

### Upload Logo
```javascript
const file = event.target.files[0];
const response = await brandkitApi.uploadBrandkitLogo("brand_id", file);
// Returns: { message, logo_path }
```

---

## 🎣 Context Hook

### Usage
```javascript
function MyComponent() {
  const {
    activeBrandkit,    // Active brandkit object
    brandkits,         // Array of all brandkits
    isLoading,         // Loading state
    error,             // Error message
    switchBrandkit,    // Function to switch active
    refresh            // Function to reload data
  } = useBrandkit();

  // Use the data
  return (
    <div>
      <h1>{activeBrandkit?.brand_name}</h1>
      <button onClick={() => switchBrandkit("new_brand_id")}>
        Switch
      </button>
    </div>
  );
}
```

### Context Properties

#### `activeBrandkit`
- **Type:** `Brandkit | null`
- **Description:** Currently active brandkit object
- **Properties:** brand_id, brand_name, tagline, brand_voice, brand_essence, color_palette, typography, target_audience, tone_guide, brand_vocabulary, core_products, competitors, logo_path

#### `brandkits`
- **Type:** `BrandkitSummary[]`
- **Description:** Array of all brandkit summaries
- **Properties:** brand_id, brand_name, version, updated_at, active, last_activated_at

#### `isLoading`
- **Type:** `boolean`
- **Description:** True when loading/switching brandkits

#### `error`
- **Type:** `string | null`
- **Description:** Error message if operation failed

#### `switchBrandkit(brandId)`
- **Type:** `async function`
- **Parameters:** brandId (string)
- **Returns:** Promise<void>
- **Description:** Switch to a different brandkit
- **Throws:** Error if operation fails

#### `refresh()`
- **Type:** `async function`
- **Returns:** Promise<void>
- **Description:** Reload active brandkit and brandkit list

---

## 🧩 Component Props

### BrandkitSelector

```javascript
<BrandkitSelector
  onCreateNew={() => void}    // Called when "Create New" clicked
  onManage={() => void}       // Called when "Manage" clicked
/>
```

### BrandkitFormModal

```javascript
<BrandkitFormModal
  isOpen={boolean}                      // Show/hide modal
  onClose={() => void}                  // Called when modal closes
  onSuccess={(response) => void}        // Called after successful save
  editBrandkit={Brandkit | null}        // Brandkit to edit (null for create)
/>
```

### BrandkitManagementModal

```javascript
<BrandkitManagementModal
  isOpen={boolean}                      // Show/hide modal
  onClose={() => void}                  // Called when modal closes
  onEdit={(brandkit) => void}           // Called when edit clicked
  onUploadLogo={(brandkit) => void}     // Called when logo upload clicked
/>
```

### BrandkitLogoUpload

```javascript
<BrandkitLogoUpload
  isOpen={boolean}                      // Show/hide modal
  onClose={() => void}                  // Called when modal closes
  brandkit={Brandkit}                   // Brandkit to upload logo for
  onSuccess={(response) => void}        // Called after successful upload
/>
```

---

## 📋 Data Types

### Brandkit (Full Object)
```typescript
{
  brand_id: string;
  brand_name: string;
  version: string;
  updated_at: string;  // ISO datetime
  tagline?: string;
  brand_voice: {
    primary: string;
    secondary: string[];
    avoid: string[];
  };
  brand_essence: {
    core_message: string;
    key_pillars: string[];
    emotional_territory: string;
  };
  color_palette: {
    primary: string;
    secondary: string[];
    accent: string;
  };
  typography: {
    primary_font: string;
    secondary_font: string;
  };
  target_audience: {
    primary: string;
    psychographics: string[];
  };
  tone_guide: {
    dos: string[];
    donts: string[];
  };
  brand_vocabulary: {
    preferred_terms: string[];
    avoid_terms: string[];
  };
  core_products?: string[];
  competitors?: Array<{
    name: string;
    positioning: string;
  }>;
  logo_path?: string;
}
```

### BrandkitSummary (List Item)
```typescript
{
  brand_id: string;
  brand_name: string;
  version: string;
  updated_at: string;
  active: boolean;
  last_activated_at?: string;
}
```

---

## 🔐 Validation Rules

### Brand ID
- Lowercase only
- No spaces
- Only letters, numbers, underscores, hyphens
- Cannot be changed after creation
- Must be unique

### Required Fields (Create)
- brand_id
- brand_name
- brand_voice.primary
- brand_essence.core_message
- brand_essence.key_pillars (at least 1)
- target_audience.primary

### Optional Fields
- Everything else!

### Logo Upload
- Accepted formats: PNG, JPG, JPEG, GIF, WEBP
- Max size: 5MB

---

## 🎯 Common Patterns

### Display Active Brandkit
```javascript
function Header() {
  const { activeBrandkit } = useBrandkit();
  
  return (
    <div>
      {activeBrandkit && (
        <span>Active: {activeBrandkit.brand_name}</span>
      )}
    </div>
  );
}
```

### Switch Brandkit
```javascript
function BrandkitList() {
  const { brandkits, switchBrandkit } = useBrandkit();
  
  const handleSwitch = async (brandId) => {
    try {
      await switchBrandkit(brandId);
      alert("Switched successfully!");
    } catch (error) {
      alert("Failed to switch: " + error.message);
    }
  };
  
  return (
    <ul>
      {brandkits.map(bk => (
        <li key={bk.brand_id} onClick={() => handleSwitch(bk.brand_id)}>
          {bk.brand_name}
        </li>
      ))}
    </ul>
  );
}
```

### Create Brandkit
```javascript
function CreateForm() {
  const { refresh } = useBrandkit();
  
  const handleCreate = async (formData) => {
    try {
      const response = await brandkitApi.createBrandkit(formData);
      await refresh();  // Reload brandkits
      alert("Created: " + response.brand_name);
    } catch (error) {
      alert("Failed: " + error.message);
    }
  };
  
  // ... form implementation
}
```

### Upload Logo
```javascript
function LogoUploader({ brandId }) {
  const { refresh } = useBrandkit();
  
  const handleUpload = async (file) => {
    try {
      const response = await brandkitApi.uploadBrandkitLogo(brandId, file);
      await refresh();
      alert("Logo uploaded!");
    } catch (error) {
      alert("Upload failed: " + error.message);
    }
  };
  
  return (
    <input
      type="file"
      accept="image/*"
      onChange={(e) => handleUpload(e.target.files[0])}
    />
  );
}
```

---

## 🚨 Error Handling

### API Errors
```javascript
try {
  await brandkitApi.createBrandkit(data);
} catch (error) {
  // error.response.data.detail has backend error message
  console.error(error.response?.data?.detail || error.message);
}
```

### Context Errors
```javascript
const { error } = useBrandkit();

if (error) {
  return <div>Error: {error}</div>;
}
```

### Common Error Responses

#### 400 Bad Request
- Invalid brandkit data
- Validation errors
- Brand ID already exists

#### 404 Not Found
- Brandkit doesn't exist

#### 500 Server Error
- Backend error
- Check backend logs

---

## 📍 Backend Endpoints

All endpoints are relative to: `http://localhost:8000`

```
GET    /api/brandkits              - List all brandkits
GET    /api/brandkits/active       - Get active brandkit
GET    /api/brandkits/{id}         - Get specific brandkit
POST   /api/brandkits              - Create brandkit
PUT    /api/brandkits/{id}         - Update brandkit
DELETE /api/brandkits/{id}         - Delete brandkit
POST   /api/brandkits/{id}/activate - Activate brandkit
POST   /api/brandkits/{id}/logo    - Upload logo
```

---

## 💾 localStorage

### Key
```
activeBrandkitId
```

### Usage
```javascript
// Get stored brandkit ID
const storedId = localStorage.getItem('activeBrandkitId');

// Set active brandkit ID (done automatically by context)
localStorage.setItem('activeBrandkitId', 'brand_id');
```

---

## 🧪 Testing Helpers

### Check if Brandkit System is Working
```javascript
import { useBrandkit } from "@/contexts/BrandkitContext";

function TestComponent() {
  const { activeBrandkit, brandkits, isLoading } = useBrandkit();
  
  console.log("Active:", activeBrandkit);
  console.log("All:", brandkits);
  console.log("Loading:", isLoading);
  
  return <div>Check console</div>;
}
```

### Manually Test API
```javascript
import * as brandkitApi from "@/services/contentGenerationApi";

// In browser console or component
async function testAPI() {
  const brandkits = await brandkitApi.getBrandkits();
  console.log("Brandkits:", brandkits);
  
  const active = await brandkitApi.getActiveBrandkit();
  console.log("Active:", active);
}

testAPI();
```

---

## 📚 Additional Resources

- **Implementation Summary:** See `BRANDKIT_IMPLEMENTATION_SUMMARY.md`
- **Quick Start Guide:** See `BRANDKIT_QUICK_START.md`
- **Backend API Docs:** See backend implementation guide
- **Component Examples:** Check `src/app/create-content/page.jsx`

---

## 🎯 Quick Reference Card

```
📦 Import API:     import * as brandkitApi from "@/services/contentGenerationApi"
📦 Import Hook:    import { useBrandkit } from "@/contexts/BrandkitContext"

🔌 Get All:        await brandkitApi.getBrandkits()
🔌 Get Active:     await brandkitApi.getActiveBrandkit()
🔌 Create:         await brandkitApi.createBrandkit(data)
🔌 Update:         await brandkitApi.updateBrandkit(id, updates)
🔌 Delete:         await brandkitApi.deleteBrandkit(id)
🔌 Activate:       await brandkitApi.activateBrandkit(id)
🔌 Upload Logo:    await brandkitApi.uploadBrandkitLogo(id, file)

🎣 Hook:           const { activeBrandkit, brandkits, switchBrandkit, refresh } = useBrandkit()

💾 localStorage:   activeBrandkitId

🌐 Backend:        http://localhost:8000/api/brandkits
```

---

**Happy Coding! 🚀**

