# HTML5 Ad Builder

A powerful, browser-based HTML5 ad creation tool with drag-and-drop image upload, visual editing, GSAP animations, and ZIP export functionality.

## Project Overview

- **Name**: HTML5 Ad Builder
- **Goal**: Create professional HTML5 banner ads with animations
- **Tech Stack**: Hono + TypeScript + GSAP + jQuery + TailwindCSS
- **Platform**: Cloudflare Pages

## 🎯 Features

### ✅ Currently Completed Features

1. **Image Upload**
   - Drag-and-drop interface
   - Support for JPG, PNG, and GIF formats
   - Click to upload alternative
   - Instant preview on canvas

2. **Visual Editing**
   - Drag to reposition images
   - Corner handles for resizing
   - Real-time property panel
   - Adjust width, height, X/Y position
   - Rotation control
   - Opacity slider

3. **Layer Management**
   - Visual layers panel
   - Layer selection
   - Delete layers
   - Multiple image support

4. **GSAP Animations**
   - 9 animation types:
     - Fade In/Out
     - Slide from Left/Right/Top/Bottom
     - Scale
     - Rotate
     - Bounce
   - Customizable duration and delay
   - Multiple easing options
   - Animation preview
   - Per-layer animations

5. **Canvas Presets**
   - 300x250 (Medium Rectangle)
   - 728x90 (Leaderboard)
   - 160x600 (Wide Skyscraper)
   - 300x600 (Half Page)
   - 320x50 (Mobile Banner)
   - Custom size support

6. **Export**
   - Export as ZIP file
   - Includes HTML file with embedded animations
   - All images included in images/ folder
   - Ready-to-use banner ad

## 🌐 URLs

- **Sandbox Development**: https://3000-igiwf52tzmwf7vatrnamo-82b888ba.sandbox.novita.ai
- **Local Development**: http://localhost:3000
- **GitHub**: (To be deployed)
- **Production**: (To be deployed to Cloudflare Pages)

## 📐 Data Architecture

- **Data Models**: 
  - Element objects with properties (position, size, rotation, opacity)
  - Animation objects with GSAP properties
  - In-memory storage for uploaded images (base64 encoded)

- **Storage Services**: 
  - Currently: In-memory storage (demo mode)
  - Production ready: Can integrate Cloudflare R2 for persistent image storage

- **Data Flow**:
  1. User uploads image → Server converts to base64 → Returns data URL
  2. Frontend creates element object → Adds to canvas
  3. User adds animations → Stored in element animations array
  4. Export generates HTML with GSAP code → Packages with images into ZIP

## 🎨 User Guide

### Creating Your First Ad Banner

1. **Set Canvas Size**
   - Use the dropdown in the toolbar to select a standard ad size
   - Or select "Custom Size" to enter your own dimensions

2. **Upload Images**
   - Drag and drop image files onto the upload zone
   - Or click the upload zone to browse files
   - Supported formats: JPG, PNG, GIF

3. **Position & Resize**
   - Drag images to reposition on canvas
   - Use corner handles to resize
   - Or use the Properties panel for precise control
   - Adjust rotation and opacity as needed

4. **Add Animations**
   - Select a layer from the Layers panel
   - Click "Add Animation"
   - Choose animation type, duration, delay, and easing
   - Click "Save Animation"
   - Repeat for multiple animations on the same element

5. **Preview**
   - Click "Preview Animation" to see your animations play
   - Animations replay from the beginning each time

6. **Export**
   - Click "Export as ZIP"
   - Download contains:
     - `index.html` - Complete banner with animations
     - `images/` - All uploaded images
   - Upload to your ad platform or website

### Tips

- Select an element first before adding animations
- Use the Layers panel to manage multiple elements
- Preview your animations frequently
- Combine multiple animation types for complex effects
- Use delay to sequence animations

## 🚀 Development

### Local Setup

```bash
# Install dependencies
cd /home/user/webapp
npm install

# Build project
npm run build

# Start development server
pm2 start ecosystem.config.cjs

# Test
curl http://localhost:3000
```

### Project Structure

```
webapp/
├── src/
│   └── index.tsx          # Hono backend with upload API
├── public/static/
│   ├── app.js             # Main frontend application
│   └── styles.css         # Custom styles
├── ecosystem.config.cjs   # PM2 configuration
├── wrangler.jsonc         # Cloudflare configuration
└── package.json           # Dependencies and scripts
```

### API Endpoints

- `POST /api/upload` - Upload image (multipart/form-data)
  - Returns: `{ success, id, url, filename }`
- `GET /api/image/:id` - Get uploaded image data

## 🔧 Technology Stack

### Frontend
- **TailwindCSS** - Utility-first styling
- **GSAP 3.12.5** - Professional animation library
- **jQuery 3.7.1** - DOM manipulation
- **JSZip** - ZIP file generation
- **FileSaver.js** - File download
- **Font Awesome** - Icons

### Backend
- **Hono** - Lightweight web framework
- **Cloudflare Workers** - Edge runtime

## 📝 Deployment Status

- **Sandbox**: ✅ Active
- **GitHub**: ⏳ Pending
- **Production**: ⏳ Pending
- **Last Updated**: 2025-12-29

## 🎯 Recommended Next Steps

1. **GitHub Deployment**
   - Push to GitHub repository
   - Set up version control

2. **Cloudflare Pages Deployment**
   - Deploy to production
   - Get public URL

3. **Enhanced Features** (Future improvements)
   - Add text layers with custom fonts
   - More animation presets
   - Animation timeline editor
   - Template library
   - Undo/redo functionality
   - Copy/paste layers
   - Background colors and gradients
   - Click-through URL support
   - Multi-page ad support

4. **Storage Integration**
   - Integrate Cloudflare R2 for persistent image storage
   - Add project save/load functionality

## 🐛 Known Limitations

- Images stored in memory (lost on server restart)
- No undo/redo functionality yet
- No text layer support yet
- Export doesn't include CDN libraries locally (requires internet)

## 📄 License

MIT License - Feel free to use and modify for your projects!

---

**Enjoy creating amazing HTML5 banner ads!** 🎨✨
