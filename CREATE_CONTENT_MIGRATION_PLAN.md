# 🚀 Create Content Feature Migration Plan

## Table of Contents

1. [Overview](#overview)
2. [Feature Analysis](#feature-analysis)
3. [Backend Communication Strategy](#backend-communication-strategy)
4. [Tech Stack Conversion Matrix](#tech-stack-conversion-matrix)
5. [Step-by-Step Implementation](#step-by-step-implementation)
6. [File Structure](#file-structure)
7. [Code Pattern Conversions](#code-pattern-conversions)
8. [Testing Strategy](#testing-strategy)

---

## Overview

**Objective**: Port "Create Content" AI generation functionality from `@frontend/` (TypeScript/Tailwind) to `@dashboard/` (JavaScript/Bootstrap) without disturbing either project.

**Key Challenges**:

- TypeScript → JavaScript conversion
- Tailwind CSS → Bootstrap conversion
- Zustand → React Context conversion
- **Python backend ↔ Node.js backend** communication
- Maintain both projects independently

---

## Feature Analysis

### What We're Migrating

From `@frontend/src/app/`:

1. **`/generate`** - Main content generation page
2. **`/quick-generate`** - Quick generation form

### Core Components (7 files)

1. `components/generation/content-generator.tsx`
   - Video/Graphic plan generation
   - Real-time progress tracking
   - Job status monitoring
2. `components/generation/generation-results-modal.tsx`

   - Results display modal
   - Download functionality

3. `components/forms/quick-content-form.tsx`

   - Quick generation form
   - Image upload
   - Form validation

4. `stores/useGenerationStore.ts` ➜ Context

   - Generation job state
   - Progress tracking
   - API integration

5. `stores/useBriefStore.ts` ➜ Context

   - Creative brief management
   - Brief CRUD operations

6. `lib/api.ts`

   - API client for Python backend
   - File upload
   - Generation endpoints

7. `types/index.ts`
   - TypeScript definitions

### Key Features

✅ **Brief Selection** - Choose creative brief for generation  
✅ **Content Type Toggle** - Video or Graphic  
✅ **Quick Generate** - Fast content creation without full brief  
✅ **Image Upload** - Multi-image upload with preview  
✅ **Real-time Progress** - Live generation status (polling every 2s)  
✅ **Job Management** - Track active and completed jobs  
✅ **Results Display** - View generated content  
✅ **Stats Dashboard** - Total briefs, active jobs, success rate

---

## Backend Communication Strategy

### 🔥 THE CRITICAL ISSUE: Python Backend

Your `@dashboard/` uses **Node.js backend**, but Create Content requires **Python backend** for AI generation.

### ✅ SOLUTION: Node.js API Proxy/Gateway

**DO NOT convert Python to Node.js**. Instead, create a **proxy layer** in your Node.js backend.

```
Frontend (Dashboard)
       ↓
Node.js Backend (Dashboard_Backend)
       ↓ [Proxy/Forward]
Python Backend (AI Generation)
```

### Implementation in Node.js Backend

**File**: `Dashboard_Backend/controller/Api/contentGenerationController.js`

```javascript
const axios = require("axios");

// Python backend URL (from environment)
const PYTHON_API_URL = process.env.PYTHON_API_URL || "http://localhost:8000";

class ContentGenerationController {
  // Proxy: Start video generation
  static async generateVideo(req, res) {
    try {
      const { brief_id } = req.body;

      // Forward to Python backend
      const response = await axios.post(
        `${PYTHON_API_URL}/api/generate/video`,
        { brief_id },
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      res.json(response.data);
    } catch (error) {
      console.error("Error proxying to Python backend:", error);
      res.status(500).json({
        success: false,
        message: "Failed to start video generation",
        error: error.message,
      });
    }
  }

  // Proxy: Start graphic generation
  static async generateGraphic(req, res) {
    try {
      const { brief_id } = req.body;

      const response = await axios.post(
        `${PYTHON_API_URL}/api/generate/graphic`,
        { brief_id }
      );

      res.json(response.data);
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to start graphic generation",
        error: error.message,
      });
    }
  }

  // Proxy: Check generation status
  static async getGenerationStatus(req, res) {
    try {
      const { jobId } = req.params;

      const response = await axios.get(
        `${PYTHON_API_URL}/api/generate/status/${jobId}`
      );

      res.json(response.data);
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to get generation status",
        error: error.message,
      });
    }
  }

  // Proxy: Get generation results
  static async getGenerationResults(req, res) {
    try {
      const { jobId } = req.params;

      const response = await axios.get(
        `${PYTHON_API_URL}/api/generate/results/${jobId}`
      );

      res.json(response.data);
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to get generation results",
        error: error.message,
      });
    }
  }

  // Proxy: Quick generation
  static async quickGenerate(req, res) {
    try {
      const generationData = req.body;

      const response = await axios.post(
        `${PYTHON_API_URL}/api/generate/quick`,
        generationData
      );

      res.json(response.data);
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to start quick generation",
        error: error.message,
      });
    }
  }

  // Proxy: Upload images
  static async uploadImages(req, res) {
    try {
      const FormData = require("form-data");
      const form = new FormData();

      // Forward uploaded files
      if (req.files && req.files.length > 0) {
        req.files.forEach((file) => {
          form.append("images", file.buffer, file.originalname);
        });
      }

      const response = await axios.post(
        `${PYTHON_API_URL}/api/upload/images`,
        form,
        {
          headers: form.getHeaders(),
        }
      );

      res.json(response.data);
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to upload images",
        error: error.message,
      });
    }
  }

  // Proxy: Retry image generation
  static async retryImageGeneration(req, res) {
    try {
      const { jobId, artifactId } = req.params;

      const response = await axios.post(
        `${PYTHON_API_URL}/api/generate/retry-image/${jobId}/${artifactId}`
      );

      res.json(response.data);
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to retry image generation",
        error: error.message,
      });
    }
  }
}

module.exports = ContentGenerationController;
```

**Route**: `Dashboard_Backend/routes/analytics/contentGeneration.js`

```javascript
const express = require("express");
const router = express.Router();
const ContentGenerationController = require("../../controller/Api/contentGenerationController");
const { authenticateToken } = require("../../middleware/firebaseAuth");
const multer = require("multer");

// Setup multer for file upload
const upload = multer({ storage: multer.memoryStorage() });

// All routes require authentication
router.use(authenticateToken);

// Generation endpoints
router.post("/generate/video", ContentGenerationController.generateVideo);
router.post("/generate/graphic", ContentGenerationController.generateGraphic);
router.post("/generate/quick", ContentGenerationController.quickGenerate);
router.get(
  "/generate/status/:jobId",
  ContentGenerationController.getGenerationStatus
);
router.get(
  "/generate/results/:jobId",
  ContentGenerationController.getGenerationResults
);
router.post(
  "/generate/retry-image/:jobId/:artifactId",
  ContentGenerationController.retryImageGeneration
);

// Upload endpoints
router.post(
  "/upload/images",
  upload.array("images", 10),
  ContentGenerationController.uploadImages
);

module.exports = router;
```

**Update**: `Dashboard_Backend/routes/index.js`

```javascript
const contentGenerationRoutes = require("./analytics/contentGeneration");
app.use("/api/content-generation", contentGenerationRoutes);
```

**Environment Variable**: `.env`

```env
PYTHON_API_URL=http://localhost:8000
# Or production: https://your-python-backend.com
```

---

## Tech Stack Conversion Matrix

| Frontend (@frontend/) | Dashboard (@dashboard/)  | Conversion Method           |
| --------------------- | ------------------------ | --------------------------- |
| **TypeScript**        | **JavaScript**           | Remove types, use JSDoc     |
| **Tailwind CSS**      | **Bootstrap 5**          | Replace utility classes     |
| **Zustand**           | **React Context**        | Create Context providers    |
| **shadcn/ui**         | **Bootstrap components** | Use Bootstrap markup        |
| **Lucide Icons**      | **Iconify/Phosphor**     | Replace icon imports        |
| **React Hook Form**   | **Manual state**         | useState + validation       |
| **Zod validation**    | **Manual validation**    | Custom validation functions |
| **TanStack Query**    | **Axios (recommended)**  | Direct API calls with state |
| **Framer Motion**     | **Animate.css**          | Replace animations          |

---

## Recommended: Data Fetching Solution

### Option 1: ✅ **Axios (RECOMMENDED)**

**Why**: Already used in dashboard, consistent pattern.

**Install**:

```bash
cd dashboard
npm install axios
```

**Usage Pattern**:

```javascript
import axios from "axios";
import config from "../config";

// Create axios instance
const contentApiClient = axios.create({
  baseURL: config.api.baseURL,
});

// Add interceptor for auth
contentApiClient.interceptors.request.use((config) => {
  const idToken = localStorage.getItem("idToken");
  if (idToken) {
    config.headers.Authorization = `Bearer ${idToken}`;
  }
  return config;
});

// API functions
export const generateVideoContent = async (briefId) => {
  try {
    const response = await contentApiClient.post(
      "/api/content-generation/generate/video",
      {
        brief_id: briefId,
      }
    );
    return response.data;
  } catch (error) {
    console.error("Error:", error);
    throw error;
  }
};
```

### Option 2: Native Fetch (Alternative)

Already available, no installation needed, but more boilerplate.

---

## Step-by-Step Implementation

### Phase 1: Setup (Day 1)

#### Step 1.1: Create File Structure

```bash
cd dashboard/src
```

Create new directories:

```
src/
├── contexts/
│   ├── GenerationContext.jsx      # New
│   └── BriefContext.jsx            # New
├── app/
│   └── create-content/             # New
│       ├── layout.js
│       └── page.jsx
├── components/
│   ├── ContentGenerator.jsx        # New
│   ├── QuickContentForm.jsx        # New
│   └── GenerationResultsModal.jsx  # New
└── services/
    └── contentGenerationApi.js     # New
```

#### Step 1.2: Add Sidebar Permission

**File**: `src/utils/sidebarPermissions.js`

```javascript
export const AVAILABLE_SIDEBAR_ITEMS = {
  // ... existing items

  createContent: {
    key: "createContent",
    label: "Create Content",
    description: "AI-powered content generation for video and graphics",
    icon: "solar:magic-stick-3-bold",
    requiredRoles: ["manager", "admin", "super_admin"],
    availableOperations: [OPERATION_TYPES.READ, OPERATION_TYPES.CREATE],
    supportsCRUD: true,
  },
};
```

#### Step 1.3: Add to Sidebar Menu

**File**: `src/masterLayout/MasterLayout.jsx` (around line 200+)

```jsx
{
  /* Create Content */
}
{
  hasSidebarPermission("createContent") && (
    <li className="sidebar-menu-item">
      <Link href="/create-content" className="sidebar-menu-link">
        <Icon
          icon="solar:magic-stick-3-bold"
          className="sidebar-menu-icon"
          width="20"
          height="20"
        />
        <span>Create Content</span>
      </Link>
    </li>
  );
}
```

---

### Phase 2: Backend Proxy (Day 1-2)

✅ **Follow Backend Communication Strategy above**

1. Install axios in backend: `cd Dashboard_Backend && npm install axios`
2. Create `controller/Api/contentGenerationController.js`
3. Create `routes/analytics/contentGeneration.js`
4. Update `routes/index.js`
5. Add `PYTHON_API_URL` to environment variables
6. Test proxy endpoints with Postman

---

### Phase 3: Create Contexts (Day 2-3)

#### GenerationContext.jsx

```javascript
"use client";
import { createContext, useContext, useState, useCallback } from "react";
import * as contentApi from "../services/contentGenerationApi";

const GenerationContext = createContext({});

export const useGeneration = () => {
  const context = useContext(GenerationContext);
  if (!context) {
    throw new Error("useGeneration must be used within GenerationProvider");
  }
  return context;
};

export const GenerationProvider = ({ children }) => {
  const [activeGenerations, setActiveGenerations] = useState([]);
  const [completedGenerations, setCompletedGenerations] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Start video generation
  const startVideoGeneration = useCallback(async (briefId) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await contentApi.generateVideo(briefId);
      const jobId = response.job_id;

      const job = {
        id: jobId,
        type: "video",
        planId: `video_plan_${briefId}`,
        status: "pending",
        progress: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      setActiveGenerations((prev) => [job, ...prev]);
      setIsLoading(false);
      return jobId;
    } catch (error) {
      setError(error.message);
      setIsLoading(false);
      throw error;
    }
  }, []);

  // Start graphic generation
  const startGraphicGeneration = useCallback(async (briefId) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await contentApi.generateGraphic(briefId);
      const jobId = response.job_id;

      const job = {
        id: jobId,
        type: "graphic",
        planId: `graphic_plan_${briefId}`,
        status: "pending",
        progress: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      setActiveGenerations((prev) => [job, ...prev]);
      setIsLoading(false);
      return jobId;
    } catch (error) {
      setError(error.message);
      setIsLoading(false);
      throw error;
    }
  }, []);

  // Check generation status
  const checkGenerationStatus = useCallback(async (jobId) => {
    try {
      const status = await contentApi.getGenerationStatus(jobId);

      if (status.status === "completed") {
        // Move to completed
        setActiveGenerations((prev) => {
          const job = prev.find((j) => j.id === jobId);
          if (!job) return prev;

          const completedJob = {
            ...job,
            status: "completed",
            progress: 100,
            result: status.result,
            updatedAt: new Date(),
          };

          setCompletedGenerations((prev) => [completedJob, ...prev]);
          return prev.filter((j) => j.id !== jobId);
        });
      } else if (status.status === "failed") {
        // Mark as failed
        setActiveGenerations((prev) =>
          prev.map((job) =>
            job.id === jobId
              ? {
                  ...job,
                  status: "failed",
                  error: status.error,
                  updatedAt: new Date(),
                }
              : job
          )
        );
      } else {
        // Update progress
        setActiveGenerations((prev) =>
          prev.map((job) =>
            job.id === jobId
              ? { ...job, progress: status.progress, updatedAt: new Date() }
              : job
          )
        );
      }
    } catch (error) {
      console.error("Error checking status:", error);
    }
  }, []);

  // Get generations by type
  const getGenerationsByType = useCallback(
    (type) => {
      return [...activeGenerations, ...completedGenerations].filter(
        (job) => job.type === type
      );
    },
    [activeGenerations, completedGenerations]
  );

  const value = {
    activeGenerations,
    completedGenerations,
    isLoading,
    error,
    startVideoGeneration,
    startGraphicGeneration,
    checkGenerationStatus,
    getGenerationsByType,
  };

  return (
    <GenerationContext.Provider value={value}>
      {children}
    </GenerationContext.Provider>
  );
};
```

#### BriefContext.jsx

```javascript
"use client";
import { createContext, useContext, useState, useCallback } from "react";
import * as contentApi from "../services/contentGenerationApi";

const BriefContext = createContext({});

export const useBrief = () => {
  const context = useContext(BriefContext);
  if (!context) {
    throw new Error("useBrief must be used within BriefProvider");
  }
  return context;
};

export const BriefProvider = ({ children }) => {
  const [briefs, setBriefs] = useState([]);
  const [currentBrief, setCurrentBrief] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch all briefs
  const fetchBriefs = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await contentApi.getBriefs();
      setBriefs(data);
      setIsLoading(false);
    } catch (error) {
      setError(error.message);
      setIsLoading(false);
    }
  }, []);

  // Fetch single brief
  const fetchBrief = useCallback(async (briefId) => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await contentApi.getBrief(briefId);
      setCurrentBrief(data);
      setIsLoading(false);
    } catch (error) {
      setError(error.message);
      setIsLoading(false);
    }
  }, []);

  const value = {
    briefs,
    currentBrief,
    isLoading,
    error,
    fetchBriefs,
    fetchBrief,
    setCurrentBrief,
  };

  return (
    <BriefContext.Provider value={value}>{children}</BriefContext.Provider>
  );
};
```

---

### Phase 4: Create API Service (Day 3)

**File**: `src/services/contentGenerationApi.js`

```javascript
import axios from "axios";
import config from "../config";

// Create axios instance
const apiClient = axios.create({
  baseURL: config.api.baseURL,
});

// Add auth interceptor
apiClient.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const idToken = localStorage.getItem("idToken");
    if (idToken) {
      config.headers.Authorization = `Bearer ${idToken}`;
    }
  }
  return config;
});

// === Creative Briefs ===
export const getBriefs = async () => {
  const response = await apiClient.get("/api/content-generation/briefs");
  return response.data;
};

export const getBrief = async (briefId) => {
  const response = await apiClient.get(
    `/api/content-generation/briefs/${briefId}`
  );
  return response.data;
};

export const createBrief = async (briefData) => {
  const response = await apiClient.post(
    "/api/content-generation/briefs",
    briefData
  );
  return response.data;
};

// === Content Generation ===
export const generateVideo = async (briefId) => {
  const response = await apiClient.post(
    "/api/content-generation/generate/video",
    {
      brief_id: briefId,
    }
  );
  return response.data;
};

export const generateGraphic = async (briefId) => {
  const response = await apiClient.post(
    "/api/content-generation/generate/graphic",
    {
      brief_id: briefId,
    }
  );
  return response.data;
};

export const quickGenerate = async (formData) => {
  const response = await apiClient.post(
    "/api/content-generation/generate/quick",
    formData
  );
  return response.data;
};

export const getGenerationStatus = async (jobId) => {
  const response = await apiClient.get(
    `/api/content-generation/generate/status/${jobId}`
  );
  return response.data;
};

export const getGenerationResults = async (jobId) => {
  const response = await apiClient.get(
    `/api/content-generation/generate/results/${jobId}`
  );
  return response.data;
};

export const retryImageGeneration = async (jobId, artifactId) => {
  const response = await apiClient.post(
    `/api/content-generation/generate/retry-image/${jobId}/${artifactId}`
  );
  return response.data;
};

// === File Upload ===
export const uploadImages = async (files) => {
  const formData = new FormData();
  files.forEach((file) => {
    formData.append("images", file);
  });

  const response = await apiClient.post(
    "/api/content-generation/upload/images",
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }
  );
  return response.data;
};
```

---

## Code Pattern Conversions

### 1. TypeScript → JavaScript

**Before (TypeScript)**:

```tsx
interface ContentGeneratorProps {
  briefId: string;
  className?: string;
}

export function ContentGenerator({
  briefId,
  className,
}: ContentGeneratorProps) {
  const [selectedType, setSelectedType] = useState<"video" | "graphic">(
    "video"
  );
  // ...
}
```

**After (JavaScript + JSDoc)**:

```jsx
/**
 * @typedef {Object} ContentGeneratorProps
 * @property {string} briefId
 * @property {string} [className]
 */

/**
 * @param {ContentGeneratorProps} props
 */
export function ContentGenerator({ briefId, className }) {
  const [selectedType, setSelectedType] = useState("video"); // 'video' | 'graphic'
  // ...
}
```

---

### 2. Tailwind → Bootstrap

**Before (Tailwind)**:

```tsx
<div className="space-y-6">
  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
    <div className="flex items-center justify-between space-x-2">
      <span className="text-3xl font-bold text-gray-900">Title</span>
      <button className="bg-brand-primary hover:bg-brand-primary/90 text-white px-4 py-2 rounded-lg">
        Generate
      </button>
    </div>
  </div>
</div>
```

**After (Bootstrap)**:

```jsx
<div className="mb-4">
  <div className="row g-3">
    <div className="col-12 col-md-3">
      <div className="d-flex align-items-center justify-content-between">
        <h3 className="mb-0">Title</h3>
        <button className="btn btn-primary">Generate</button>
      </div>
    </div>
  </div>
</div>
```

**Conversion Guide**:
| Tailwind | Bootstrap |
|----------|-----------|
| `space-y-6` | `mb-4` on each child |
| `grid grid-cols-4` | `row` + `col-md-3` |
| `gap-6` | `g-3` on row |
| `flex items-center` | `d-flex align-items-center` |
| `justify-between` | `justify-content-between` |
| `text-3xl font-bold` | `h3` or custom class |
| `bg-brand-primary` | `btn btn-primary` |
| `rounded-lg` | `rounded` |
| `px-4 py-2` | Built into `btn` |

---

### 3. shadcn/ui → Bootstrap Components

#### Card Component

**Before (shadcn)**:

```tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
  </CardHeader>
  <CardContent>Content here</CardContent>
</Card>;
```

**After (Bootstrap)**:

```jsx
<div className="card">
  <div className="card-header">
    <h5 className="card-title mb-0">Title</h5>
  </div>
  <div className="card-body">Content here</div>
</div>
```

#### Button

**Before**:

```tsx
import { Button } from "@/components/ui/button";

<Button variant="outline" size="sm">
  Click me
</Button>;
```

**After**:

```jsx
<button className="btn btn-outline-primary btn-sm">Click me</button>
```

#### Badge

**Before**:

```tsx
import { Badge } from "@/components/ui/badge";

<Badge variant="destructive">Failed</Badge>;
```

**After**:

```jsx
<span className="badge bg-danger">Failed</span>
```

#### Progress

**Before**:

```tsx
import { Progress } from "@/components/ui/progress";

<Progress value={75} className="h-2" />;
```

**After**:

```jsx
<div className="progress" style={{ height: "8px" }}>
  <div
    className="progress-bar"
    role="progressbar"
    style={{ width: "75%" }}
    aria-valuenow="75"
    aria-valuemin="0"
    aria-valuemax="100"
  />
</div>
```

#### Select

**Before**:

```tsx
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

<Select value={value} onValueChange={setValue}>
  <SelectTrigger>
    <SelectValue placeholder="Select option" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="option1">Option 1</SelectItem>
  </SelectContent>
</Select>;
```

**After**:

```jsx
<select
  className="form-select"
  value={value}
  onChange={(e) => setValue(e.target.value)}
>
  <option value="">Select option</option>
  <option value="option1">Option 1</option>
</select>
```

---

### 4. Icons: Lucide → Iconify

**Before**:

```tsx
import { Play, Video, CheckCircle } from 'lucide-react'

<Play className="h-4 w-4 mr-2" />
<Video className="h-5 w-5" />
<CheckCircle className="text-green-500" />
```

**After**:

```jsx
import { Icon } from "@iconify/react/dist/iconify.js";

<Icon icon="solar:play-bold" width="16" height="16" className="me-2" />
<Icon icon="solar:video-library-bold" width="20" height="20" />
<Icon icon="solar:check-circle-bold" className="text-success" />
```

**Icon Mapping**:
| Lucide | Iconify (Solar) |
|--------|-----------------|
| `Play` | `solar:play-bold` |
| `Video` | `solar:video-library-bold` |
| `Image` | `solar:gallery-bold` |
| `CheckCircle` | `solar:check-circle-bold` |
| `AlertCircle` | `solar:danger-circle-bold` |
| `RefreshCw` | `solar:refresh-bold` |
| `Download` | `solar:download-bold` |
| `Eye` | `solar:eye-bold` |
| `Upload` | `solar:upload-bold` |
| `Sparkles` | `solar:magic-stick-3-bold` |

---

### 5. Modal: shadcn Dialog → React Modal

**Before**:

```tsx
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

<Dialog open={isOpen} onOpenChange={setIsOpen}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Results</DialogTitle>
    </DialogHeader>
    <div>Content</div>
  </DialogContent>
</Dialog>;
```

**After** (Already used in dashboard):

```jsx
import Modal from "react-modal";

<Modal
  isOpen={isOpen}
  onRequestClose={() => setIsOpen(false)}
  className="modal-content"
  overlayClassName="modal-overlay"
  contentLabel="Results Modal"
>
  <div className="modal-header">
    <h5 className="modal-title">Results</h5>
    <button className="btn-close" onClick={() => setIsOpen(false)} />
  </div>
  <div className="modal-body">Content</div>
</Modal>;
```

---

## File Structure

```
dashboard/src/
├── contexts/                        # NEW
│   ├── GenerationContext.jsx       # Generation state
│   └── BriefContext.jsx            # Brief management
│
├── app/
│   └── create-content/             # NEW
│       ├── layout.js               # Layout wrapper
│       └── page.jsx                # Main page
│
├── components/
│   ├── ContentGenerator.jsx        # NEW - Main generator component
│   ├── QuickContentForm.jsx        # NEW - Quick generation form
│   └── GenerationResultsModal.jsx  # NEW - Results modal
│
└── services/
    └── contentGenerationApi.js     # NEW - API client
```

---

## Testing Strategy

### Phase 1: Backend Testing

1. Test Python backend is running
2. Test Node.js proxy endpoints with Postman
3. Verify authentication passthrough

### Phase 2: Component Testing

1. Test page loads without errors
2. Test context providers work
3. Test API calls reach backend

### Phase 3: Integration Testing

1. Test full generation flow
2. Test status polling
3. Test results display

### Phase 4: E2E Testing

1. Create brief → Generate → View results
2. Quick generate flow
3. Error handling

---

## Migration Checklist

### Backend Setup

- [ ] Install axios in Dashboard_Backend
- [ ] Create contentGenerationController.js
- [ ] Create contentGeneration routes
- [ ] Add PYTHON_API_URL to .env
- [ ] Test proxy endpoints

### Frontend Setup

- [ ] Create contexts folder
- [ ] Create GenerationContext.jsx
- [ ] Create BriefContext.jsx
- [ ] Create services/contentGenerationApi.js
- [ ] Add sidebar permission
- [ ] Update MasterLayout sidebar

### Components

- [ ] Create create-content page
- [ ] Create ContentGenerator component
- [ ] Create QuickContentForm component
- [ ] Create GenerationResultsModal component

### Testing

- [ ] Test backend proxy
- [ ] Test page loads
- [ ] Test generation flow
- [ ] Test status updates
- [ ] Test results display

---

## Next Steps

1. **Review this plan** - Make sure you understand each part
2. **Setup backend proxy** - This is critical for Python communication
3. **Create contexts** - Port Zustand to React Context
4. **Build components** - Convert Tailwind to Bootstrap
5. **Test thoroughly** - Ensure both projects work independently

---

## Need Help?

If you get stuck on any conversion, ask:

- "How do I convert [specific Tailwind pattern] to Bootstrap?"
- "Show me how to convert [specific component]"
- "Help with [specific error]"

---

**Created**: For migrating Create Content from @frontend/ to @dashboard/
**Last Updated**: $(date)
