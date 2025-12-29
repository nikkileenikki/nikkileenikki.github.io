# HTML5 Ad Builder

## Project Overview
- **Name**: HTML5 Ad Builder
- **Goal**: Professional browser-based tool for creating animated HTML5 banner advertisements
- **Platform**: Cloudflare Pages with Hono backend
- **Tech Stack**: Hono + TypeScript + GSAP 3.12.5 + jQuery 3.7.1 + TailwindCSS

## URLs
- **Sandbox**: https://3000-igiwf52tzmwf7vatrnamo-82b888ba.sandbox.novita.ai
- **Local**: http://localhost:3000
- **GitHub**: (To be deployed)

## ✨ Completed Features

### Core Functionality
1. **Image Upload & Management**
   - JPG, PNG, GIF support
   - Drag-and-drop or browse to upload
   - Instant canvas preview
   - Multiple images per ad

2. **Text Layers**
   - Add text with rich formatting
   - 10 font families (Arial, Helvetica, Times New Roman, Georgia, Courier, Verdana, Impact, Comic Sans, Trebuchet, Arial Black)
   - Font size: 8px - 200px
   - Color picker for text color
   - Bold, Italic, Underline styles
   - **Left, Center, Right alignment** (Fixed: now properly updates justify-content)
   - Draggable, resizable, rotatable

3. **Clickthrough Layer**
   - Add invisible clickthrough areas
   - Configure custom URL and target (_blank, _self, _parent, _top)
   - Multiple clickthrough zones supported
   - Visual overlay during editing (transparent in export)

4. **Visual Editing**
   - Drag to reposition elements
   - Corner handles for resizing
   - **Clean canvas** - no borders when not selected, blue border only when selected
   - **Hidden resize handles** - only visible on selected element
   - Rotation control (0-360°)
   - Opacity control (0-1)
   - Real-time property panel updates

5. **Layer Management**
   - Visual layers panel with icons
   - **Drag-and-drop reordering** (Fixed: now fully functional)
   - Move up/down buttons for z-index control
   - Layer selection and deletion
   - Grip handle for easy drag

6. **Animation Timeline**
   - **Visual timeline editor** with per-element tracks
   - **Editable animation blocks** - click to edit
   - 10 animation types:
     - Fade In/Out
     - Slide from Left/Right/Top/Bottom
     - Scale
     - Rotate
     - Bounce
     - Custom (x, y, scale, rotation, opacity)
   - **Precise timing** - set exact start time and duration per animation
   - **Correct animation duration** - uses individual animation duration, not total timeline
   - **Fixed animation timing** - second and subsequent animations play at correct times
   - **Animation loop control**:
     - Forever (infinite loop)
     - Play Once (plays exactly once, no extra loops)
     - Play Twice (plays exactly twice, no extra loops)
     - Play 3 Times
     - Play 5 Times
   - **Timeline zoom** - positioned at bottom-right of timeline container
     - Zoom in/out: 2-60 second range
     - Adjusts total duration for more/less detail
   - **Draggable playhead** - click and drag the red pin to scrub through animation
   - Easing options (power1-4, back, elastic, bounce, etc.)
   - Multiple animations per element
   - Delete animations with hover icon

7. **Canvas Presets**
   - 300x250 (Medium Rectangle)
   - 728x90 (Leaderboard)
   - 160x600 (Wide Skyscraper)
   - 300x600 (Half Page)
   - 320x50 (Mobile Banner)
   - Custom size support

8. **Export to ZIP**
   - Complete HTML5 package
   - Embedded GSAP library
   - All images exported
   - GSAP timeline-based sequencing
   - Proper animation timing preserved
   - Loop settings applied
   - Text styling preserved
   - Clickthrough functionality included
   - Ready for ad platforms

## 🐛 Recently Fixed Bugs

1. ✅ **Canvas element borders** - Removed white borders, only show blue border when selected
2. ✅ **Text alignment** - Now properly updates both text-align and justify-content CSS
3. ✅ **Layer drag-and-drop** - Fixed scope issues, now fully functional with visual feedback
4. ✅ **Animation duration** - Each animation uses its own duration instead of total timeline duration
5. ✅ **Animation timing** - Second and subsequent animations now start at correct times
6. ✅ **Timeline zoom placement** - Moved to bottom-right of timeline container for better UX
7. ✅ **Play loop counting** - Fixed: Play Once = 1 time, Play Twice = 2 times (no extra initial play)
8. ✅ **Draggable playhead** - Red timeline pin can now be dragged to scrub through animation

## Data Architecture

### Data Models
```javascript
Element {
  id: string,
  type: 'image' | 'text' | 'clickthrough',
  x: number,
  y: number,
  width: number,
  height: number,
  rotation: number,
  opacity: number,
  zIndex: number,
  animations: Animation[],
  // Image-specific
  src?: string,
  filename?: string,
  // Text-specific
  text?: string,
  fontSize?: number,
  fontFamily?: string,
  color?: string,
  bold?: boolean,
  italic?: boolean,
  underline?: boolean,
  textAlign?: 'left' | 'center' | 'right',
  // Clickthrough-specific
  url?: string,
  target?: '_blank' | '_self' | '_parent' | '_top'
}

Animation {
  id: string,
  type: string,
  start: number,
  duration: number,
  ease: string,
  customProps?: object
}
```

### Storage Services
- **Development**: In-memory storage with base64 data URLs
- **Production**: Cloudflare R2 for image storage (planned)

### Data Flow
1. Upload image → Base64 data URL → Create element
2. Add text → Create text element with styling
3. Add clickthrough → Create invisible overlay element
4. Configure animations → Add to element.animations array
5. Drag-and-drop layers → Swap z-index values
6. Export → Generate HTML with GSAP timeline + images in ZIP

## User Guide

### Getting Started
1. Open the HTML5 Ad Builder
2. Select canvas size or use custom dimensions
3. Upload images or add text/clickthrough layers
4. Position and resize elements on canvas

### Adding Animations
1. Select an element
2. Click "Add to Timeline"
3. Choose animation type and timing
4. Set start time and duration
5. Click timeline blocks to edit
6. Use loop control to set play behavior

### Timeline Controls
- **Zoom In/Out**: Bottom-right buttons adjust timeline duration (2-60s)
- **Drag Playhead**: Click and drag red pin to preview animation state
- **Edit Animation**: Click any purple block on timeline
- **Delete Animation**: Hover over block and click X icon

### Exporting
1. Click "Preview Animation" to test
2. Click "Export as ZIP" when ready
3. Extract ZIP file
4. Upload to ad platform

## API Endpoints
- `POST /api/upload` - Upload image file
  - Body: FormData with 'image' field
  - Returns: `{ success: true, id, url, filename }`
- `GET /api/image/:id` - Retrieve uploaded image

## Development

### Setup
```bash
cd /home/user/webapp
npm install
npm run build
pm2 start ecosystem.config.cjs
```

### Scripts
```json
{
  "dev": "vite",
  "build": "vite build",
  "deploy": "npm run build && wrangler pages deploy dist"
}
```

### Project Structure
```
webapp/
├── src/
│   ├── index.tsx          # Main Hono application
│   └── renderer.tsx       # HTML renderer
├── public/
│   └── static/
│       ├── app.js         # Frontend JavaScript (~1,570 lines)
│       ├── styles.css     # Custom CSS with timeline styles
│       └── styles.css     # Additional styles
├── dist/                  # Build output
├── package.json
├── vite.config.ts
├── wrangler.jsonc
└── ecosystem.config.cjs   # PM2 configuration
```

## Deployment

### Status
- **Sandbox**: ✅ Active
- **Production**: ❌ Pending
- **GitHub**: ❌ Pending

### Last Updated
2025-12-29

## Next Steps

1. **GitHub Push** - Deploy code to repository
2. **Cloudflare Pages** - Deploy to production
3. **Enhancements**:
   - Undo/redo functionality
   - Copy/paste elements
   - Background colors/gradients
   - More animation presets
   - Multi-page ads
   - Template library
   - Keyboard shortcuts
   - Animation curves editor

## Technical Highlights

- **Zero-config GSAP integration** - Timeline-based animations with perfect timing
- **Drag-and-drop everything** - Elements, layers, and playhead
- **Real-time preview** - See changes instantly
- **Clean export** - Production-ready HTML5 ads
- **Professional UX** - Dark theme, intuitive controls, visual feedback
- **Lightweight** - ~1,570 lines of JavaScript, no heavy frameworks
- **Edge-ready** - Built for Cloudflare Workers deployment

## Known Limitations

- Images stored in memory (lost on restart in development)
- Export requires internet for CDN libraries (GSAP, jQuery)
- No persistent storage without Cloudflare R2 integration
- Limited to GSAP animation capabilities

## License
MIT
