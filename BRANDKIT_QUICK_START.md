# Generic Brandkit System - Quick Start Guide

## 🎉 Implementation Complete!

The Generic Brandkit System has been successfully implemented in your Content Craft section. Here's everything you need to know to start using it.

---

## 🚀 Quick Start

### Step 1: Start Your Servers

Make sure both servers are running:

```bash
# Python Backend (Terminal 1)
cd [backend-directory]
python main.py
# Should run on http://localhost:8000

# Next.js Frontend (Terminal 2)
cd dashboard
npm run dev
# Should run on http://localhost:3000
```

### Step 2: Navigate to Content Craft

Go to: **Dashboard → Content Craft (Create Content)**

You'll now see a brandkit selector in the header!

---

## 📍 Where to Find It

The brandkit system is located **only in the Content Craft section** at:
- **Route:** `/create-content`
- **Location:** Right below the breadcrumb, above the tabs

**Look for:**
- A badge showing the active brandkit (e.g., "Active: Tilting Heads")
- A dropdown button with a palette icon to switch/manage brandkits

---

## 🎯 Key Features

### 1. View Active Brandkit
- Look at the header section
- You'll see: `Active: [Brand Name]` badge
- If there's a tagline, it appears next to the badge

### 2. Switch Between Brandkits
1. Click the brandkit dropdown (palette icon)
2. See list of all your brandkits
3. Click any brandkit to switch to it
4. The page updates automatically

### 3. Create New Brandkit
1. Click the dropdown
2. Select **"Create New Brandkit"**
3. Fill in the form:
   - **Required fields** (marked with *):
     - Brand Name
     - Brand ID (auto-generated, can customize)
     - Primary Brand Voice
     - Core Message
     - At least one Key Pillar
     - Primary Target Audience
   - **Optional fields** (click "Advanced Settings"):
     - Tagline
     - Colors (primary, secondary, accent)
     - Typography
     - Tone Guide (dos & don'ts)
     - Brand Vocabulary
     - Core Products
     - Competitors
4. Click **"Create Brandkit"**

### 4. Manage All Brandkits
1. Click the dropdown
2. Select **"Manage Brandkits"**
3. See a table with all your brandkits
4. Available actions:
   - **✓ Activate:** Set as active brandkit
   - **✏️ Edit:** Modify brandkit details
   - **🖼️ Logo:** Upload brand logo
   - **🗑️ Delete:** Remove brandkit (not allowed if active)

### 5. Edit Brandkit
1. In management modal, click the **edit** icon (pen)
2. Form opens with current values pre-filled
3. Make your changes
4. Click **"Update Brandkit"**

### 6. Upload Logo
1. In management modal, click the **logo** icon (gallery)
2. Select an image file (PNG, JPG, GIF, or WEBP)
3. Preview appears
4. Click **"Upload Logo"**
5. File must be under 5MB

### 7. Delete Brandkit
1. In management modal, click the **delete** icon (trash)
2. Button turns red - click again to confirm
3. **Note:** You cannot delete the active brandkit
4. Switch to another brandkit first, then delete

---

## 🎨 Creating Your First Brandkit

### Example: Beauty Brand

```
Brand Name: Glow Naturals
Brand ID: glow_naturals (auto-generated)
Tagline: Radiance from Nature

Brand Voice:
  Primary: Premium, Confident, Natural
  Secondary: Empowering, Scientific
  Avoid: Generic Beauty Speak

Brand Essence:
  Core Message: Clean beauty backed by science
  Key Pillars: Purity, Efficacy, Sustainability
  Emotional Territory: Confident natural beauty

Target Audience:
  Primary: Women 25-45, health-conscious
  Psychographics: Clean beauty seekers, Ingredient-aware

(Advanced - Optional)
Colors:
  Primary: #E8D5C4
  Accent: #B8A89A

Typography:
  Primary: Playfair Display
  Secondary: Lato

Tone Guide:
  Dos: Speak to efficacy, Use science-backed claims
  Don'ts: Greenwashing, Unrealistic promises

Core Products:
  - Facial serums
  - Natural moisturizers
  - Clean makeup
```

---

## 💡 How It Works

1. **Active Brandkit:** Only one brandkit is "active" at a time
2. **Content Generation:** When you generate content, the system automatically uses the active brandkit's voice, tone, and style
3. **Persistence:** Your active brandkit is saved and remains active even after you log out and log back in
4. **Backend Integration:** All brandkit data is stored on the backend and synced across sessions

---

## ⚠️ Important Notes

### Cannot Delete Active Brandkit
If you try to delete the active brandkit, you'll see an error. To delete it:
1. Switch to a different brandkit first
2. Then delete the old one

### Brand ID Rules
- Lowercase only
- No spaces (use underscores or hyphens)
- Cannot be changed after creation
- Must be unique

### Required Fields
These fields are mandatory when creating a brandkit:
- Brand Name
- Brand ID
- Primary Brand Voice
- Core Message
- At least one Key Pillar
- Primary Target Audience

Everything else is optional but recommended!

---

## 🔧 Troubleshooting

### "Failed to load brandkits"
- Check if the Python backend is running on port 8000
- Verify `src/config.js` has correct backend URL

### "Cannot delete active brandkit"
- This is by design! Switch to another brandkit first

### Dropdown not closing
- Click outside the dropdown or press Escape

### Form validation errors
- Red text appears under invalid fields
- Fill in all required fields (marked with *)
- Check Brand ID format (lowercase, no spaces)

---

## 📊 What Gets Automated

Once you set up brandkits, the system automatically:

✅ Uses the active brandkit for all content generation
✅ Applies brand voice and tone to generated content
✅ Respects brand vocabulary (preferred/avoid terms)
✅ Follows tone guidelines
✅ Generates content aligned with brand essence
✅ Includes voiceover scripts for videos (if applicable)

**You don't need to do anything special** - just make sure the right brandkit is active!

---

## 🎯 Best Practices

1. **Be Descriptive:** Use clear, detailed descriptions in your brandkit
2. **Use Key Pillars:** These heavily influence content generation
3. **Set Tone Guidelines:** Helps AI understand what to do and avoid
4. **Add Brand Vocabulary:** Ensures consistent terminology
5. **Upload Logos:** Makes your brandkit complete
6. **Keep It Updated:** Edit brandkits as your brand evolves

---

## 🚦 System Status

✅ All components implemented
✅ Full CRUD operations working
✅ localStorage persistence active
✅ Error handling in place
✅ Form validation working
✅ No linting errors
✅ Production-ready

---

## 🆘 Need Help?

1. Check `BRANDKIT_IMPLEMENTATION_SUMMARY.md` for technical details
2. Review error messages - they're designed to be helpful
3. All modals have tooltips and helper text
4. Form validation messages guide you to fix issues

---

## 🎉 You're Ready!

Start by:
1. Opening the Content Craft page
2. Checking what the current active brandkit is
3. Creating a new brandkit for your brand
4. Switching to it
5. Generating content and seeing the magic happen!

**Happy content creation! 🚀**

