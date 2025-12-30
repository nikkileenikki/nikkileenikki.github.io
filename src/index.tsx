import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serveStatic } from 'hono/cloudflare-workers'

const app = new Hono()

// Enable CORS for API routes
app.use('/api/*', cors())

// Serve static files
app.use('/static/*', serveStatic({ root: './public' }))

// Store uploaded images in memory (for demo - in production use R2 or similar)
const imageStore = new Map<string, { data: string; filename: string; contentType: string }>()

// API: Upload image
app.post('/api/upload', async (c) => {
  try {
    const formData = await c.req.formData()
    const file = formData.get('image') as File
    
    if (!file) {
      return c.json({ error: 'No file uploaded' }, 400)
    }

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/gif']
    if (!validTypes.includes(file.type)) {
      return c.json({ error: 'Invalid file type. Only JPG, PNG, and GIF are allowed.' }, 400)
    }

    // Convert to base64
    const buffer = await file.arrayBuffer()
    const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)))
    const dataUrl = `data:${file.type};base64,${base64}`
    
    const id = `img_${Date.now()}_${Math.random().toString(36).substring(7)}`
    imageStore.set(id, {
      data: dataUrl,
      filename: file.name,
      contentType: file.type
    })

    return c.json({ 
      success: true, 
      id,
      url: dataUrl,
      filename: file.name 
    })
  } catch (error) {
    return c.json({ error: 'Upload failed' }, 500)
  }
})

// API: Get uploaded image
app.get('/api/image/:id', (c) => {
  const id = c.req.param('id')
  const image = imageStore.get(id)
  
  if (!image) {
    return c.json({ error: 'Image not found' }, 404)
  }
  
  return c.json(image)
})

// Main page
app.get('/', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>HTML5 Ad Builder</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <script src="https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/gsap.min.js"></script>
        <script src="https://code.jquery.com/jquery-3.7.1.min.js"></script>
        <script src="https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js"></script>
        <script src="https://cdnjs.cloudflare.com/ajax/libs/FileSaver.js/2.0.5/FileSaver.min.js"></script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
        <link href="/static/styles.css" rel="stylesheet">
    </head>
    <body class="bg-gray-900 text-gray-100">
        <div class="flex h-screen">
            <!-- Left Sidebar - Tools -->
            <div class="w-80 bg-gray-800 border-r border-gray-700 overflow-y-auto flex flex-col max-h-screen">
                <div class="p-6 flex-1 overflow-y-auto"
                    <h1 class="text-2xl font-bold mb-6 flex items-center">
                        <i class="fas fa-ad mr-2 text-blue-400"></i>
                        Ad Builder
                    </h1>
                    
                    <!-- Add Elements -->
                    <div class="mb-6">
                        <h2 class="text-lg font-semibold mb-3">Add Elements</h2>
                        <div class="space-y-2">
                            <div id="dropzone" class="border-2 border-dashed border-gray-600 rounded-lg p-4 text-center cursor-pointer hover:border-blue-400 transition-colors">
                                <i class="fas fa-cloud-upload-alt text-3xl text-gray-500 mb-1"></i>
                                <p class="text-sm text-gray-400">Upload Image</p>
                                <p class="text-xs text-gray-500 mt-1">JPG, PNG, GIF</p>
                            </div>
                            <input type="file" id="fileInput" accept="image/jpeg,image/png,image/gif" class="hidden">
                            
                            <button id="addTextBtn" class="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded transition-colors">
                                <i class="fas fa-font mr-2"></i>Add Text
                            </button>
                            
                            <button id="addShapeBtn" class="w-full bg-teal-600 hover:bg-teal-700 text-white py-3 rounded transition-colors">
                                <i class="fas fa-shapes mr-2"></i>Add Shape
                            </button>
                            
                            <button id="addClickthroughBtn" class="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 rounded transition-colors">
                                <i class="fas fa-mouse-pointer mr-2"></i>Add Clickthrough
                            </button>
                        </div>
                    </div>

                    <!-- Layers Panel -->
                    <div class="mb-6">
                        <h2 class="text-lg font-semibold mb-3">Layers</h2>
                        <div id="layersList" class="space-y-2 bg-gray-900 rounded-lg p-3 min-h-[100px]">
                            <p class="text-sm text-gray-500 text-center py-4">No layers yet</p>
                        </div>
                    </div>

                    <!-- Properties Panel -->
                    <div id="propertiesPanel" class="mb-6 hidden">
                        <h2 class="text-lg font-semibold mb-3">Properties</h2>
                        <div class="space-y-3 bg-gray-900 rounded-lg p-3">
                            <!-- Text Properties -->
                            <div id="textProps" class="hidden space-y-3 pb-3 border-b border-gray-700">
                                <div>
                                    <label class="text-sm text-gray-400">Text Content</label>
                                    <input type="text" id="propText" class="w-full bg-gray-800 rounded px-3 py-2 text-sm">
                                </div>
                                <div>
                                    <label class="text-sm text-gray-400">Font Family</label>
                                    <select id="propFontFamily" class="w-full bg-gray-800 rounded px-3 py-2 text-sm">
                                        <option value="Arial">Arial</option>
                                        <option value="Helvetica">Helvetica</option>
                                        <option value="Times New Roman">Times New Roman</option>
                                        <option value="Georgia">Georgia</option>
                                        <option value="Courier New">Courier New</option>
                                        <option value="Verdana">Verdana</option>
                                        <option value="Impact">Impact</option>
                                        <option value="Comic Sans MS">Comic Sans MS</option>
                                        <option value="Trebuchet MS">Trebuchet MS</option>
                                        <option value="Arial Black">Arial Black</option>
                                    </select>
                                </div>
                                <div>
                                    <label class="text-sm text-gray-400">Font Size</label>
                                    <input type="number" id="propFontSize" class="w-full bg-gray-800 rounded px-3 py-2 text-sm" min="8" max="200">
                                </div>
                                <div>
                                    <label class="text-sm text-gray-400">Color</label>
                                    <input type="color" id="propColor" class="w-full bg-gray-800 rounded px-3 py-2 h-10">
                                </div>
                                <div class="flex space-x-2">
                                    <button id="propBold" class="flex-1 bg-gray-700 hover:bg-gray-600 rounded py-2 text-sm">
                                        <i class="fas fa-bold"></i>
                                    </button>
                                    <button id="propItalic" class="flex-1 bg-gray-700 hover:bg-gray-600 rounded py-2 text-sm">
                                        <i class="fas fa-italic"></i>
                                    </button>
                                    <button id="propUnderline" class="flex-1 bg-gray-700 hover:bg-gray-600 rounded py-2 text-sm">
                                        <i class="fas fa-underline"></i>
                                    </button>
                                </div>
                                <div>
                                    <label class="text-sm text-gray-400">Text Align</label>
                                    <div class="flex space-x-2">
                                        <button class="text-align-btn flex-1 bg-gray-700 hover:bg-gray-600 rounded py-2 text-sm" data-align="left">
                                            <i class="fas fa-align-left"></i>
                                        </button>
                                        <button class="text-align-btn flex-1 bg-gray-700 hover:bg-gray-600 rounded py-2 text-sm" data-align="center">
                                            <i class="fas fa-align-center"></i>
                                        </button>
                                        <button class="text-align-btn flex-1 bg-gray-700 hover:bg-gray-600 rounded py-2 text-sm" data-align="right">
                                            <i class="fas fa-align-right"></i>
                                        </button>
                                    </div>
                                </div>
                                <div>
                                    <label class="text-sm text-gray-400">Vertical Align</label>
                                    <div class="flex space-x-2">
                                        <button class="vertical-align-btn flex-1 bg-gray-700 hover:bg-gray-600 rounded py-2 text-sm" data-valign="top">
                                            <i class="fas fa-arrow-up"></i> Top
                                        </button>
                                        <button class="vertical-align-btn flex-1 bg-gray-700 hover:bg-gray-600 rounded py-2 text-sm" data-valign="middle">
                                            <i class="fas fa-grip-lines"></i> Mid
                                        </button>
                                        <button class="vertical-align-btn flex-1 bg-gray-700 hover:bg-gray-600 rounded py-2 text-sm" data-valign="bottom">
                                            <i class="fas fa-arrow-down"></i> Bot
                                        </button>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- Clickthrough Properties -->
                            <div id="clickthroughProps" class="hidden space-y-3 pb-3 border-b border-gray-700">
                                <div>
                                    <label class="text-sm text-gray-400">Click URL</label>
                                    <input type="text" id="propClickUrl" class="w-full bg-gray-800 rounded px-3 py-2 text-sm" placeholder="https://kult.my">
                                </div>
                                <div>
                                    <label class="text-sm text-gray-400">Target</label>
                                    <select id="propClickTarget" class="w-full bg-gray-800 rounded px-3 py-2 text-sm">
                                        <option value="_blank">New Window (_blank)</option>
                                        <option value="_self">Same Window (_self)</option>
                                        <option value="_parent">Parent Frame (_parent)</option>
                                        <option value="_top">Top Frame (_top)</option>
                                    </select>
                                </div>
                            </div>
                            
                            <!-- Common Properties -->
                            <div class="grid grid-cols-2 gap-3">
                                <div>
                                    <label class="text-sm text-gray-400">Width</label>
                                    <input type="number" id="propWidth" class="w-full bg-gray-800 rounded px-3 py-2 text-sm">
                                </div>
                                <div>
                                    <label class="text-sm text-gray-400">Height</label>
                                    <input type="number" id="propHeight" class="w-full bg-gray-800 rounded px-3 py-2 text-sm">
                                </div>
                                <div>
                                    <label class="text-sm text-gray-400">X Position</label>
                                    <input type="number" id="propX" class="w-full bg-gray-800 rounded px-3 py-2 text-sm">
                                </div>
                                <div>
                                    <label class="text-sm text-gray-400">Y Position</label>
                                    <input type="number" id="propY" class="w-full bg-gray-800 rounded px-3 py-2 text-sm">
                                </div>
                                <div>
                                    <label class="text-sm text-gray-400">Rotation</label>
                                    <input type="number" id="propRotation" class="w-full bg-gray-800 rounded px-3 py-2 text-sm" placeholder="degrees">
                                </div>
                                <div>
                                    <label class="text-sm text-gray-400">Opacity</label>
                                    <div>
                                        <input type="range" id="propOpacity" class="w-full" min="0" max="1" step="0.1" value="1">
                                        <span id="opacityValue" class="text-xs text-gray-500">100%</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Export Section -->
                    <div class="mb-6">
                        <h2 class="text-lg font-semibold mb-3">Export</h2>
                        <div class="space-y-2">
                            <button id="exportBtn" class="w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded transition-colors">
                                <i class="fas fa-file-archive mr-2"></i>Export as ZIP
                            </button>
                            <button id="previewBtn" class="w-full bg-purple-600 hover:bg-purple-700 text-white py-2 rounded transition-colors">
                                <i class="fas fa-play mr-2"></i>Preview Animation
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Main Canvas Area -->
            <div class="flex-1 flex flex-col">
                <!-- Toolbar -->
                <div class="bg-gray-800 border-b border-gray-700 p-4 flex items-center justify-between">
                    <div class="flex items-center space-x-4">
                        <label class="text-sm text-gray-400">Canvas Size:</label>
                        <select id="canvasSize" class="bg-gray-700 rounded px-3 py-1 text-sm">
                            <option value="300x250">300x250 (Medium Rectangle)</option>
                            <option value="728x90">728x90 (Leaderboard)</option>
                            <option value="160x600">160x600 (Wide Skyscraper)</option>
                            <option value="300x600">300x600 (Half Page)</option>
                            <option value="320x50">320x50 (Mobile Banner)</option>
                            <option value="custom">Custom Size</option>
                        </select>
                        <input type="number" id="customWidth" class="bg-gray-700 rounded px-3 py-1 text-sm w-20 hidden" placeholder="Width">
                        <input type="number" id="customHeight" class="bg-gray-700 rounded px-3 py-1 text-sm w-20 hidden" placeholder="Height">
                    </div>
                    <div class="flex items-center space-x-2">
                        <button id="clearBtn" class="bg-red-600 hover:bg-red-700 text-white px-4 py-1 rounded text-sm transition-colors">
                            <i class="fas fa-trash mr-2"></i>Clear All
                        </button>
                    </div>
                </div>

                <!-- Canvas -->
                <div class="flex-1 flex flex-col p-8 overflow-auto bg-gray-900">
                    <div class="flex items-center justify-center flex-1">
                        <div id="canvasWrapper" class="relative shadow-2xl" style="width: 300px; height: 250px;">
                            <div id="canvas" class="w-full h-full relative overflow-hidden">
                                <!-- Elements will be added here -->
                            </div>
                        </div>
                    </div>
                    
                    <!-- Timeline Editor -->
                    <div class="mt-6 bg-gray-800 rounded-lg p-4 border border-gray-700">
                        <div class="flex items-center justify-between mb-3">
                            <h3 class="text-lg font-semibold flex items-center">
                                <i class="fas fa-film mr-2 text-purple-400"></i>
                                Animation Timeline
                            </h3>
                            <div class="flex space-x-2">
                                <button id="playTimeline" class="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm transition-colors">
                                    <i class="fas fa-play mr-1"></i>Play
                                </button>
                                <button id="stopTimeline" class="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm transition-colors">
                                    <i class="fas fa-stop mr-1"></i>Stop
                                </button>
                            </div>
                        </div>
                        
                        <!-- Timeline Container -->
                        <div id="timelineContainer" class="bg-gray-900 rounded-lg overflow-x-auto relative">
                            <div class="min-w-[800px]">
                                <!-- Timeline Header -->
                                <div class="flex border-b border-gray-700">
                                    <div class="w-40 p-2 bg-gray-800 border-r border-gray-700">
                                        <span class="text-xs text-gray-400 font-semibold">LAYER</span>
                                    </div>
                                    <div class="flex-1 relative h-8">
                                        <div id="timelineRuler" class="absolute inset-0 flex">
                                            <!-- Time markers will be added here -->
                                        </div>
                                        <div id="timelinePlayhead" class="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10 cursor-ew-resize" style="left: 0;">
                                            <div class="w-3 h-3 bg-red-500 rounded-full absolute -top-1 -left-1 cursor-grab active:cursor-grabbing"></div>
                                        </div>
                                    </div>
                                </div>
                                
                                <!-- Timeline Tracks -->
                                <div id="timelineTracks">
                                    <div class="text-center text-gray-500 text-sm py-8">
                                        Add elements and animations to see timeline
                                    </div>
                                </div>
                            </div>
                            
                            <!-- Timeline Zoom Controls -->
                            <div class="absolute bottom-4 right-4 flex space-x-2 bg-gray-800 rounded-lg p-2 shadow-lg">
                                <button id="zoomOut" class="bg-gray-700 hover:bg-gray-600 rounded px-3 py-1 text-sm">
                                    <i class="fas fa-search-minus"></i>
                                </button>
                                <button id="zoomIn" class="bg-gray-700 hover:bg-gray-600 rounded px-3 py-1 text-sm">
                                    <i class="fas fa-search-plus"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Animation Modal -->
        <div id="animModal" class="hidden fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div class="bg-gray-800 rounded-lg p-6 w-[500px] max-h-[90vh] overflow-y-auto">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="text-xl font-bold">Add to Timeline</h3>
                    <button id="closeModal" class="text-gray-400 hover:text-white">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                
                <div class="space-y-4">
                    <div>
                        <label class="block text-sm text-gray-400 mb-2">Animation Type</label>
                        <select id="animType" class="w-full bg-gray-700 rounded px-3 py-2">
                            <optgroup label="🌅 Fade">
                                <option value="fadeIn">Fade In</option>
                                <option value="fadeOut">Fade Out</option>
                            </optgroup>
                            <optgroup label="➡️ Slide">
                                <option value="slideLeft">Slide from Left</option>
                                <option value="slideRight">Slide from Right</option>
                                <option value="slideUp">Slide from Top</option>
                                <option value="slideDown">Slide from Bottom</option>
                            </optgroup>
                            <optgroup label="🔍 Scale">
                                <option value="scaleIn">Scale In (from small)</option>
                                <option value="scaleOut">Scale Out (to large)</option>
                                <option value="scaleFrom">Scale From (custom start)</option>
                            </optgroup>
                            <optgroup label="🔄 Rotate">
                                <option value="rotate">Rotate (360°)</option>
                                <option value="rotateFrom">Rotate From (custom start)</option>
                            </optgroup>
                            <optgroup label="🎪 Special">
                                <option value="bounce">Bounce</option>
                                <option value="custom">Custom Properties</option>
                            </optgroup>
                        </select>
                    </div>
                    
                    <!-- Scale From Properties -->
                    <div id="scaleFromProps" class="hidden space-y-2 p-3 bg-gray-700 rounded">
                        <label class="block text-xs text-gray-400">Scale From Value</label>
                        <input type="number" id="animScaleFrom" step="0.1" value="0" class="w-full bg-gray-800 rounded px-2 py-1 text-sm" placeholder="e.g. 0 or 2">
                    </div>
                    
                    <!-- Rotate From Properties -->
                    <div id="rotateFromProps" class="hidden space-y-2 p-3 bg-gray-700 rounded">
                        <label class="block text-xs text-gray-400">Rotate From Angle (deg)</label>
                        <input type="number" id="animRotateFrom" value="0" class="w-full bg-gray-800 rounded px-2 py-1 text-sm" placeholder="e.g. -180 or 90">
                    </div>
                    
                    <!-- Custom Animation Properties -->
                    <div id="customAnimProps" class="hidden space-y-3 p-3 bg-gray-700 rounded">
                        <div>
                            <label class="block text-xs text-gray-400 mb-1">Target X</label>
                            <input type="number" id="animCustomX" class="w-full bg-gray-800 rounded px-2 py-1 text-sm" placeholder="Leave empty to keep current">
                        </div>
                        <div>
                            <label class="block text-xs text-gray-400 mb-1">Target Y</label>
                            <input type="number" id="animCustomY" class="w-full bg-gray-800 rounded px-2 py-1 text-sm" placeholder="Leave empty to keep current">
                        </div>
                        <div>
                            <label class="block text-xs text-gray-400 mb-1">Target Scale</label>
                            <input type="number" id="animCustomScale" step="0.1" class="w-full bg-gray-800 rounded px-2 py-1 text-sm" placeholder="e.g. 1.5">
                        </div>
                        <div>
                            <label class="block text-xs text-gray-400 mb-1">Target Rotation (deg)</label>
                            <input type="number" id="animCustomRotation" class="w-full bg-gray-800 rounded px-2 py-1 text-sm" placeholder="e.g. 360">
                        </div>
                        <div>
                            <label class="block text-xs text-gray-400 mb-1">Target Opacity</label>
                            <input type="number" id="animCustomOpacity" step="0.1" min="0" max="1" class="w-full bg-gray-800 rounded px-2 py-1 text-sm" placeholder="0 to 1">
                        </div>
                    </div>
                    
                    <div class="grid grid-cols-2 gap-3">
                        <div>
                            <label class="block text-sm text-gray-400 mb-2">Start Time (s)</label>
                            <input type="number" id="animStart" value="0" step="0.1" min="0" class="w-full bg-gray-700 rounded px-3 py-2">
                        </div>
                        <div>
                            <label class="block text-sm text-gray-400 mb-2">Duration (s)</label>
                            <input type="number" id="animDuration" value="1" step="0.1" min="0.1" class="w-full bg-gray-700 rounded px-3 py-2">
                        </div>
                    </div>
                    
                    <div>
                        <label class="block text-sm text-gray-400 mb-2">Total Timeline Duration</label>
                        <input type="number" id="timelineDuration" value="5" step="0.5" min="1" max="60" class="w-full bg-gray-700 rounded px-3 py-2">
                    </div>
                    
                    <div>
                        <label class="block text-sm text-gray-400 mb-2">Animation Loop</label>
                        <select id="animLoop" class="w-full bg-gray-700 rounded px-3 py-2">
                            <option value="infinite">Loop Forever</option>
                            <option value="0">Play Once</option>
                            <option value="1">Play Twice</option>
                            <option value="2">Play 3 Times</option>
                            <option value="4">Play 5 Times</option>
                        </select>
                    </div>
                    
                    <div>
                        <label class="block text-sm text-gray-400 mb-2">Easing</label>
                        <select id="animEase" class="w-full bg-gray-700 rounded px-3 py-2">
                            <option value="power1.out">Power1 Out</option>
                            <option value="power2.out">Power2 Out</option>
                            <option value="power3.out">Power3 Out</option>
                            <option value="power1.inOut">Power1 InOut</option>
                            <option value="back.out">Back Out</option>
                            <option value="elastic.out">Elastic Out</option>
                            <option value="bounce.out">Bounce Out</option>
                            <option value="linear">Linear</option>
                        </select>
                    </div>
                    
                    <div class="flex space-x-2">
                        <button id="saveAnimBtn" class="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded transition-colors">
                            <span id="animBtnText">Add to Timeline</span>
                        </button>
                        <button id="deleteAnimBtn" class="hidden bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded transition-colors">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- Clickthrough Modal -->
        <div id="clickthroughModal" class="hidden fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div class="bg-gray-800 rounded-lg p-6 w-[500px]">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="text-xl font-bold">Add Clickthrough Layer</h3>
                    <button id="closeClickthroughModal" class="text-gray-400 hover:text-white">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                
                <div class="space-y-4">
                    <div>
                        <label class="block text-sm text-gray-400 mb-2">Click URL</label>
                        <input type="text" id="clickthroughUrl" value="https://kult.my" placeholder="https://kult.my" class="w-full bg-gray-700 rounded px-3 py-2">
                    </div>
                    
                    <div>
                        <label class="block text-sm text-gray-400 mb-2">Target</label>
                        <select id="clickthroughTarget" class="w-full bg-gray-700 rounded px-3 py-2">
                            <option value="_blank">New Window (_blank)</option>
                            <option value="_self">Same Window (_self)</option>
                            <option value="_parent">Parent Frame (_parent)</option>
                            <option value="_top">Top Frame (_top)</option>
                        </select>
                    </div>
                    
                    <button id="saveClickthroughBtn" class="w-full bg-purple-600 hover:bg-purple-700 text-white py-2 rounded transition-colors">
                        Add Clickthrough Layer
                    </button>
                </div>
            </div>
        </div>
        
        <!-- Shape Modal -->
        <div id="shapeModal" class="hidden fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div class="bg-gray-800 rounded-lg p-6 w-[500px]">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="text-xl font-bold">Add Shape</h3>
                    <button id="closeShapeModal" class="text-gray-400 hover:text-white">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                
                <div class="space-y-4">
                    <div>
                        <label class="block text-sm text-gray-400 mb-2">Shape Type</label>
                        <select id="shapeType" class="w-full bg-gray-700 rounded px-3 py-2">
                            <option value="rectangle">Rectangle</option>
                            <option value="circle">Circle</option>
                            <option value="rounded-rectangle">Rounded Rectangle</option>
                        </select>
                    </div>
                    
                    <div class="grid grid-cols-2 gap-3">
                        <div>
                            <label class="block text-sm text-gray-400 mb-2">Width</label>
                            <input type="number" id="shapeWidth" value="200" class="w-full bg-gray-700 rounded px-3 py-2">
                        </div>
                        <div>
                            <label class="block text-sm text-gray-400 mb-2">Height</label>
                            <input type="number" id="shapeHeight" value="150" class="w-full bg-gray-700 rounded px-3 py-2">
                        </div>
                    </div>
                    
                    <div>
                        <label class="block text-sm text-gray-400 mb-2">Fill Color</label>
                        <input type="color" id="shapeFillColor" value="#3b82f6" class="w-full bg-gray-700 rounded px-3 py-2 h-10">
                    </div>
                    
                    <div>
                        <label class="block text-sm text-gray-400 mb-2">Opacity</label>
                        <input type="range" id="shapeOpacity" class="w-full" min="0" max="1" step="0.1" value="1">
                        <span id="shapeOpacityValue" class="text-xs text-gray-500">100%</span>
                    </div>
                    
                    <button id="saveShapeBtn" class="w-full bg-teal-600 hover:bg-teal-700 text-white py-2 rounded transition-colors">
                        Add Shape
                    </button>
                </div>
            </div>
        </div>
        
        <!-- Text Modal -->
        <div id="textModal" class="hidden fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div class="bg-gray-800 rounded-lg p-6 w-[500px]">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="text-xl font-bold">Add Text</h3>
                    <button id="closeTextModal" class="text-gray-400 hover:text-white">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                
                <div class="space-y-4">
                    <div>
                        <label class="block text-sm text-gray-400 mb-2">Text Content</label>
                        <input type="text" id="textContent" placeholder="Your Text Here" class="w-full bg-gray-700 rounded px-3 py-2">
                    </div>
                    
                    <button id="saveTextBtn" class="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded transition-colors">
                        Add Text
                    </button>
                </div>
            </div>
        </div>

        <script src="/static/app.js"></script>
    </body>
    </html>
  `)
})

export default app
