# HTML5 Ad Builder

A powerful, browser-based HTML5 ad creation tool with image upload, text layers, visual timeline editor, GSAP animations, and ZIP export functionality.

## Project Overview

- **Name**: HTML5 Ad Builder
- **Goal**: Create professional HTML5 banner ads with animations and text
- **Tech Stack**: Hono + TypeScript + GSAP + jQuery + TailwindCSS
- **Platform**: Cloudflare Pages

## 🎯 Features

### ✅ Currently Completed Features

1. **Image Upload**
   - Drag-and-drop interface
   - Support for JPG, PNG, and GIF formats
   - Click to upload alternative
   - Instant preview on canvas

2. **Text Layers** ⭐ NEW
   - Add custom text elements
   - Font family selection (10+ fonts)
   - Font size control
   - Text color picker
   - Bold, italic, underline styling
   - Text alignment (left, center, right)
   - Full positioning and sizing control

3. **Visual Editing**
   - Drag to reposition elements (images and text)
   - Corner handles for resizing
   - Real-time property panel
   - Adjust width, height, X/Y position
   - Rotation control
   - Opacity slider
   - Text-specific properties panel

4. **Layer Management**
   - Visual layers panel with icons
   - Layer selection
   - Delete layers
   - Support for both image and text layers
   - Mixed layer types

5. **Visual Timeline Editor** ⭐ NEW
   - Interactive timeline with visual blocks
   - Drag animations to specific start times
   - Set animation duration visually
   - Timeline ruler with time markers
   - Animated playhead during preview
   - Per-element animation tracks
   - Delete animations directly from timeline
   - Adjustable total duration

6. **GSAP Animations**
   - 10 animation types:
     - Fade In/Out
     - Slide from Left/Right/Top/Bottom
     - Scale
     - Rotate
     - Bounce
     - Custom (manual property control)
   - Customizable start time and duration
   - Multiple easing options
   - Animation preview with timeline playback
   - Per-layer animations
   - Timeline-based sequencing

7. **Canvas Presets**
   - 300x250 (Medium Rectangle)
   - 728x90 (Leaderboard)
   - 160x600 (Wide Skyscraper)
   - 300x600 (Half Page)
   - 320x50 (Mobile Banner)
   - Custom size support

8. **Export**
   - Export as ZIP file
   - Includes HTML file with embedded GSAP animations
   - All images included in images/ folder
   - Text layers preserved with styling
   - Timeline-based animation sequencing
   - Ready-to-use banner ad

## 🌐 URLs

- **Sandbox Development**: https://3000-igiwf52tzmwf7vatrnamo-82b888ba.sandbox.novita.ai
- **Local Development**: http://localhost:3000
- **GitHub**: (To be deployed)
- **Production**: (To be deployed to Cloudflare Pages)

## 📐 Data Architecture

- **Data Models**: 
  - Element objects with properties (position, size, rotation, opacity)
  - Text element objects with font properties (family, size, color, style, alignment)
  - Animation objects with GSAP properties and timeline positioning
  - In-memory storage for uploaded images (base64 encoded)

- **Storage Services**: 
  - Currently: In-memory storage (demo mode)
  - Production ready: Can integrate Cloudflare R2 for persistent image storage

- **Data Flow**:
  1. User uploads image OR creates text → Server converts images to base64 → Returns data URL or creates text element
  2. Frontend creates element object (image/text) → Adds to canvas
  3. User adds animations with start times → Stored in element animations array with timeline position
  4. Timeline visualizes all animations → Interactive editing
  5. Export generates HTML with GSAP timeline code → Packages with images into ZIP

## 🎨 User Guide

### Creating Your First Ad Banner

1. **Set Canvas Size**
   - Use the dropdown in the toolbar to select a standard ad size
   - Or select "Custom Size" to enter your own dimensions

2. **Add Elements**
   - **Images**: Drag and drop image files onto the upload zone, or click to browse
   - **Text**: Click "Add Text" button, enter your text, and click "Add Text"
   - Supported image formats: JPG, PNG, GIF

3. **Edit Text Properties** (for text layers)
   - Select the text layer
   - Customize font family, size, and color
   - Apply bold, italic, or underline
   - Set text alignment (left, center, right)

4. **Position & Resize**
   - Drag elements to reposition on canvas
   - Use corner handles to resize
   - Or use the Properties panel for precise control
   - Adjust rotation and opacity as needed

5. **Add Animations Using Timeline**
   - Select a layer from the Layers panel
   - Click "Add to Timeline"
   - Choose animation type (Fade, Slide, Scale, Rotate, Bounce, or Custom)
   - Set **start time** (when animation begins)
   - Set **duration** (how long it lasts)
   - Choose easing function
   - Click "Add to Timeline"
   - See your animation appear as a visual block in the timeline!

6. **Visual Timeline Management**
   - View all animations across all layers
   - Each layer has its own track
   - Animation blocks show timing visually
   - Hover over blocks to see delete button
   - Adjust "Total Duration" to change timeline scale

7. **Preview & Refine**
   - Click "Play" button on timeline to preview
   - Watch animated playhead move through timeline
   - Click "Stop" to reset
   - Add more animations or adjust timing as needed

8. **Export**
   - Click "Export as ZIP"
   - Download contains:
     - `index.html` - Complete banner with timeline-based animations
     - `images/` - All uploaded images
     - Fully styled text elements
   - Upload to your ad platform or website

### Timeline Tips

- Animations are positioned using **start time** (not delay)
- Total duration controls timeline scale and final banner loop
- Multiple animations can run simultaneously on different layers
- Use Custom animation type for manual property control (x, y, scale, rotation, opacity)
- Timeline visualizes the entire animation sequence
- Preview shows exactly how the exported banner will behave

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
   - Google Fonts integration
   - More animation presets
   - Template library
   - Undo/redo functionality
   - Copy/paste layers
   - Background colors and gradients
   - Click-through URL support
   - Multi-page ad support
   - Save/load projects
   - Animation keyframe editor
   - Drag to reposition animations on timeline

4. **Storage Integration**
   - Integrate Cloudflare R2 for persistent image storage
   - Add project save/load functionality

## 🐛 Known Limitations

- Images stored in memory (lost on server restart)
- No undo/redo functionality yet
- Timeline blocks cannot be dragged (delete and recreate to change timing)
- Export doesn't include CDN libraries locally (requires internet)

## 📄 License

MIT License - Feel free to use and modify for your projects!

---

**Enjoy creating amazing HTML5 banner ads!** 🎨✨
