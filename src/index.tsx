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
        <script src="https://code.jquery.com/ui/1.13.2/jquery-ui.min.js"></script>
        <link href="https://code.jquery.com/ui/1.13.2/themes/base/jquery-ui.css" rel="stylesheet">
        <script src="https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js"></script>
        <script src="https://cdnjs.cloudflare.com/ajax/libs/FileSaver.js/2.0.5/FileSaver.min.js"></script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
        <link href="/static/styles.css" rel="stylesheet">
    </head>
    <body class="bg-gray-900 text-gray-100">
        <div class="flex h-screen">
            <!-- Left Sidebar - Tools -->
            <div class="w-80 bg-gray-800 border-r border-gray-700 overflow-y-auto flex flex-col max-h-screen">
                <div class="p-3 flex-1 overflow-y-auto"
                    <h1 class="text-xl font-bold mb-3 flex items-center">
                        <i class="fas fa-ad mr-2 text-blue-400"></i>
                        Ad Builder
                    </h1>
                    
                    <!-- Banner Name -->
                    <div class="mb-4 bg-gray-900 rounded-lg p-3">
                        <label class="text-sm text-gray-400 block mb-1">Banner Name</label>
                        <input type="text" id="bannerName" placeholder="my-banner" 
                            class="w-full bg-gray-700 text-white rounded px-3 py-2 text-sm border border-gray-600 focus:border-blue-500 focus:outline-none"
                            value="ad-banner">
                        <p class="text-xs text-gray-500 mt-1">No spaces (used for ZIP filename)</p>
                    </div>
                    
                    <!-- Add Elements -->
                    <div class="mb-2">
                        <h2 class="text-lg font-semibold mb-3">Add Elements</h2>
                        <div class="space-y-2">
                            <div id="dropzone" class="border-2 border-dashed border-gray-600 rounded-lg p-4 text-center cursor-pointer hover:border-blue-400 transition-colors">
                                <i class="fas fa-cloud-upload-alt text-3xl text-gray-500 mb-1"></i>
                                <p class="text-sm text-gray-400">Upload Images</p>
                                <p class="text-xs text-gray-500 mt-1">JPG, PNG, GIF (Multiple files supported)</p>
                            </div>
                            <input type="file" id="fileInput" accept="image/jpeg,image/png,image/gif" multiple class="hidden">
                            
                            <div class="grid grid-cols-2 gap-2">
                                <button id="addTextBtn" class="bg-blue-600 hover:bg-blue-700 text-white py-2 rounded transition-colors">
                                    <i class="fas fa-font mr-1"></i>Text
                                </button>
                                
                                <button id="addShapeBtn" class="bg-teal-600 hover:bg-teal-700 text-white py-2 rounded transition-colors">
                                    <i class="fas fa-shapes mr-1"></i>Shape
                                </button>
                            </div>
                            
                            <button id="addVideoBtn" class="w-full bg-red-600 hover:bg-red-700 text-white py-2 rounded transition-colors">
                                <i class="fas fa-video mr-2"></i>Add Video
                            </button>
                            
                            <button id="addInvisibleBtn" class="w-full bg-gray-600 hover:bg-gray-700 text-white py-2 rounded transition-colors">
                                <i class="fas fa-eye-slash mr-2"></i>Add Invisible Layer
                            </button>
                            
                            <button id="addClickthroughBtn" class="w-full bg-purple-600 hover:bg-purple-700 text-white py-2 rounded transition-colors">
                                <i class="fas fa-mouse-pointer mr-2"></i>Add Clickthrough
                            </button>
                        </div>
                    </div>


                    <!-- Properties Panel -->
                    <div id="propertiesPanel" class="mb-2 hidden">
                        <h2 class="text-lg font-semibold mb-3">Properties</h2>
                        <div class="space-y-2 bg-gray-900 rounded-lg p-3">
                            <!-- Text Properties -->
                            <div id="textProps" class="hidden space-y-2 pb-3 border-b border-gray-700">
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
                                    <div class="flex gap-1">
                                        <button class="color-swatch text-color-swatch" data-color="#FFFFFF" style="background: #FFFFFF; border: 2px solid #444;" title="White"></button>
                                        <button class="color-swatch text-color-swatch" data-color="#000000" style="background: #000000; border: 2px solid #444;" title="Black"></button>
                                        <button class="color-swatch text-color-swatch" data-color="#6B7280" style="background: #6B7280; border: 2px solid #444;" title="Gray"></button>
                                        <button class="color-swatch text-color-swatch" data-color="#EF4444" style="background: #EF4444; border: 2px solid #444;" title="Red"></button>
                                        <button class="color-swatch text-color-swatch" data-color="#3B82F6" style="background: #3B82F6; border: 2px solid #444;" title="Blue"></button>
                                        <button class="color-swatch text-color-swatch" data-color="#10B981" style="background: #10B981; border: 2px solid #444;" title="Green"></button>
                                        <button class="color-swatch text-color-swatch" data-color="#F59E0B" style="background: #F59E0B; border: 2px solid #444;" title="Yellow"></button>
                                        <button class="color-swatch-rainbow" title="Custom color">
                                            <i class="fas fa-palette"></i>
                                        </button>
                                    </div>
                                    <input type="color" id="propColor" class="hidden">
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
                                    <label class="text-sm text-gray-400">Text Shadow</label>
                                    <div class="grid grid-cols-4 gap-2">
                                        <div>
                                            <input type="number" id="propTextShadowX" class="w-full bg-gray-800 rounded px-2 py-1 text-xs" placeholder="X" min="-100" max="100" value="0">
                                            <label class="text-xs text-gray-500">X Offset</label>
                                        </div>
                                        <div>
                                            <input type="number" id="propTextShadowY" class="w-full bg-gray-800 rounded px-2 py-1 text-xs" placeholder="Y" min="-100" max="100" value="0">
                                            <label class="text-xs text-gray-500">Y Offset</label>
                                        </div>
                                        <div>
                                            <input type="number" id="propTextShadowBlur" class="w-full bg-gray-800 rounded px-2 py-1 text-xs" placeholder="Blur" min="0" max="100" value="0">
                                            <label class="text-xs text-gray-500">Blur Size</label>
                                        </div>
                                        <div>
                                            <input type="color" id="propTextShadowColor" class="w-full h-8 bg-gray-800 rounded" value="#000000">
                                            <label class="text-xs text-gray-500">Color</label>
                                        </div>
                                    </div>
                                    <label class="flex items-center cursor-pointer mt-2">
                                        <input type="checkbox" id="propTextShadowHover" class="w-4 h-4 mr-2">
                                        <span class="text-xs text-gray-300">On Hover</span>
                                    </label>
                                </div>
                                <div>
                                    <label class="text-sm text-gray-400">Glow Effect</label>
                                    <div class="grid grid-cols-5 gap-2">
                                        <div>
                                            <input type="number" id="propTextGlowX" class="w-full bg-gray-800 rounded px-2 py-1 text-xs" placeholder="X" min="-100" max="100" value="0">
                                            <label class="text-xs text-gray-500">X Offset</label>
                                        </div>
                                        <div>
                                            <input type="number" id="propTextGlowY" class="w-full bg-gray-800 rounded px-2 py-1 text-xs" placeholder="Y" min="-100" max="100" value="0">
                                            <label class="text-xs text-gray-500">Y Offset</label>
                                        </div>
                                        <div>
                                            <input type="number" id="propTextGlowBlur" class="w-full bg-gray-800 rounded px-2 py-1 text-xs" placeholder="Blur" min="0" max="100" value="0">
                                            <label class="text-xs text-gray-500">Blur Size</label>
                                        </div>
                                        <div>
                                            <input type="number" id="propTextGlowSpread" class="w-full bg-gray-800 rounded px-2 py-1 text-xs" placeholder="Spread" min="-50" max="50" value="0">
                                            <label class="text-xs text-gray-500">Spread</label>
                                        </div>
                                        <div>
                                            <input type="color" id="propTextGlowColor" class="w-full h-8 bg-gray-800 rounded" value="#ffffff">
                                            <label class="text-xs text-gray-500">Color</label>
                                        </div>
                                    </div>
                                    <label class="flex items-center cursor-pointer mt-2">
                                        <input type="checkbox" id="propTextGlowHover" class="w-4 h-4 mr-2">
                                        <span class="text-xs text-gray-300">On Hover</span>
                                    </label>
                                </div>
                            </div>
                            
                            <!-- Clickthrough Properties -->
                            <div id="clickthroughProps" class="hidden space-y-2 pb-3 border-b border-gray-700">
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
                            
                            <!-- Shape Properties -->
                            <div id="shapeProps" class="hidden space-y-2 pb-3 border-b border-gray-700">
                                <div>
                                    <label class="text-sm text-gray-400">Shape Type</label>
                                    <select id="propShapeType" class="w-full bg-gray-800 rounded px-3 py-2 text-sm">
                                        <option value="rectangle">Rectangle</option>
                                        <option value="rounded-rectangle">Rounded Rectangle</option>
                                        <option value="circle">Circle</option>
                                    </select>
                                </div>
                                <div>
                                    <label class="text-sm text-gray-400">Fill Color</label>
                                    <input type="color" id="propShapeColor" class="w-full h-10 bg-gray-800 rounded px-2 py-1">
                                </div>
                                <div>
                                    <label class="text-sm text-gray-400">Shadow</label>
                                    <div class="grid grid-cols-5 gap-2">
                                        <div>
                                            <input type="number" id="propShapeShadowX" class="w-full bg-gray-800 rounded px-2 py-1 text-xs" placeholder="X" min="-100" max="100" value="0">
                                            <label class="text-xs text-gray-500">X Offset</label>
                                        </div>
                                        <div>
                                            <input type="number" id="propShapeShadowY" class="w-full bg-gray-800 rounded px-2 py-1 text-xs" placeholder="Y" min="-100" max="100" value="0">
                                            <label class="text-xs text-gray-500">Y Offset</label>
                                        </div>
                                        <div>
                                            <input type="number" id="propShapeShadowBlur" class="w-full bg-gray-800 rounded px-2 py-1 text-xs" placeholder="Blur" min="0" max="100" value="0">
                                            <label class="text-xs text-gray-500">Blur Size</label>
                                        </div>
                                        <div>
                                            <input type="number" id="propShapeShadowSpread" class="w-full bg-gray-800 rounded px-2 py-1 text-xs" placeholder="Spread" min="-50" max="50" value="0">
                                            <label class="text-xs text-gray-500">Spread</label>
                                        </div>
                                        <div>
                                            <input type="color" id="propShapeShadowColor" class="w-full h-8 bg-gray-800 rounded" value="#000000">
                                            <label class="text-xs text-gray-500">Color</label>
                                        </div>
                                    </div>
                                    <label class="flex items-center cursor-pointer mt-2">
                                        <input type="checkbox" id="propShapeShadowHover" class="w-4 h-4 mr-2">
                                        <span class="text-xs text-gray-300">On Hover</span>
                                    </label>
                                </div>
                                <div>
                                    <label class="text-sm text-gray-400">Glow Effect</label>
                                    <div class="grid grid-cols-5 gap-2">
                                        <div>
                                            <input type="number" id="propShapeGlowX" class="w-full bg-gray-800 rounded px-2 py-1 text-xs" placeholder="X" min="-100" max="100" value="0">
                                            <label class="text-xs text-gray-500">X Offset</label>
                                        </div>
                                        <div>
                                            <input type="number" id="propShapeGlowY" class="w-full bg-gray-800 rounded px-2 py-1 text-xs" placeholder="Y" min="-100" max="100" value="0">
                                            <label class="text-xs text-gray-500">Y Offset</label>
                                        </div>
                                        <div>
                                            <input type="number" id="propShapeGlowBlur" class="w-full bg-gray-800 rounded px-2 py-1 text-xs" placeholder="Blur" min="0" max="100" value="0">
                                            <label class="text-xs text-gray-500">Blur Size</label>
                                        </div>
                                        <div>
                                            <input type="number" id="propShapeGlowSpread" class="w-full bg-gray-800 rounded px-2 py-1 text-xs" placeholder="Spread" min="-50" max="50" value="0">
                                            <label class="text-xs text-gray-500">Spread</label>
                                        </div>
                                        <div>
                                            <input type="color" id="propShapeGlowColor" class="w-full h-8 bg-gray-800 rounded" value="#ffffff">
                                            <label class="text-xs text-gray-500">Color</label>
                                        </div>
                                    </div>
                                    <label class="flex items-center cursor-pointer mt-2">
                                        <input type="checkbox" id="propShapeGlowHover" class="w-4 h-4 mr-2">
                                        <span class="text-xs text-gray-300">On Hover</span>
                                    </label>
                                </div>
                            </div>
                            
                            <!-- Video Properties -->
                            <div id="videoProps" class="hidden space-y-2 pb-3 border-b border-gray-700">
                                <div>
                                    <label class="text-sm text-gray-400">Video URL</label>
                                    <input type="text" id="propVideoUrl" class="w-full bg-gray-800 rounded px-3 py-2 text-sm" placeholder="220952/video">
                                </div>
                                <div>
                                    <label class="text-sm text-gray-400">Video Name/ID</label>
                                    <input type="text" id="propVideoName" class="w-full bg-gray-800 rounded px-3 py-2 text-sm" placeholder="video1">
                                </div>
                                <div>
                                    <label class="text-sm text-gray-400">Start Playing When</label>
                                    <select id="propVideoPlayTrigger" class="w-full bg-gray-800 rounded px-3 py-2 text-sm">
                                        <option value="autoplay">Autoplay</option>
                                        <option value="mouseover">Mouse Over</option>
                                        <option value="click">Click/Tap</option>
                                    </select>
                                </div>
                                <div class="flex items-center space-x-4">
                                    <label class="flex items-center cursor-pointer">
                                        <input type="checkbox" id="propVideoMuted" class="w-4 h-4 mr-2">
                                        <span class="text-sm text-gray-300">Muted</span>
                                    </label>
                                    
                                    <label class="flex items-center cursor-pointer">
                                        <input type="checkbox" id="propVideoControls" class="w-4 h-4 mr-2">
                                        <span class="text-sm text-gray-300">Controls</span>
                                    </label>
                                </div>
                            </div>
                            
                            <!-- Common Properties -->
                            <div class="grid grid-cols-2 gap-2">
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
                            
                            <!-- Interactions Section -->
                            <div id="interactionsSection" class="mt-4 pt-4 border-t border-gray-700">
                                <h3 class="text-sm font-semibold text-gray-300 mb-3">
                                    <i class="fas fa-hand-pointer mr-2"></i>Interactions
                                </h3>
                                
                                <!-- Click Interaction -->
                                <div class="mb-4 p-3 bg-gray-800 rounded">
                                    <label class="flex items-center cursor-pointer mb-2">
                                        <input type="checkbox" id="enableClickInteraction" class="w-4 h-4 mr-2">
                                        <span class="text-sm text-gray-300 font-medium">Enable Click Interaction</span>
                                    </label>
                                    <div id="clickInteractionSettings" class="hidden space-y-2 mt-2">
                                        <div>
                                            <label class="text-xs text-gray-400">Target Element</label>
                                            <select id="clickTargetElement" class="w-full bg-gray-700 rounded px-2 py-1 text-sm">
                                                <option value="self">Self</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label class="text-xs text-gray-400">Action</label>
                                            <select id="clickAction" class="w-full bg-gray-700 rounded px-2 py-1 text-sm">
                                                <option value="pauseAnimation">Pause Animation</option>
                                                <option value="playAnimation">Play Animation</option>
                                                <option value="toggleAnimation">Toggle Animation</option>
                                                <option value="addShadow">Add Shadow</option>
                                                <option value="addGlow">Add Glow</option>
                                                <option value="hide">Hide Element</option>
                                                <option value="show">Show Element</option>
                                            </select>
                                        </div>
                                        <div id="clickShadowSettings" class="hidden">
                                            <label class="text-xs text-gray-400">Shadow Settings</label>
                                            <div class="grid grid-cols-4 gap-1">
                                                <input type="number" id="clickShadowX" class="bg-gray-700 rounded px-2 py-1 text-xs" placeholder="X" value="2">
                                                <input type="number" id="clickShadowY" class="bg-gray-700 rounded px-2 py-1 text-xs" placeholder="Y" value="2">
                                                <input type="number" id="clickShadowBlur" class="bg-gray-700 rounded px-2 py-1 text-xs" placeholder="Blur" value="5">
                                                <input type="color" id="clickShadowColor" class="w-full h-7 bg-gray-700 rounded" value="#000000">
                                            </div>
                                        </div>
                                        <div id="clickGlowSettings" class="hidden">
                                            <label class="text-xs text-gray-400">Glow Settings</label>
                                            <div class="grid grid-cols-4 gap-1">
                                                <input type="number" id="clickGlowX" class="bg-gray-700 rounded px-2 py-1 text-xs" placeholder="X" value="0">
                                                <input type="number" id="clickGlowY" class="bg-gray-700 rounded px-2 py-1 text-xs" placeholder="Y" value="0">
                                                <input type="number" id="clickGlowBlur" class="bg-gray-700 rounded px-2 py-1 text-xs" placeholder="Blur" value="10">
                                                <input type="color" id="clickGlowColor" class="w-full h-7 bg-gray-700 rounded" value="#00ff00">
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                
                                <!-- Hover Interaction -->
                                <div class="mb-3 p-3 bg-gray-800 rounded">
                                    <label class="flex items-center cursor-pointer mb-2">
                                        <input type="checkbox" id="enableHoverInteraction" class="w-4 h-4 mr-2">
                                        <span class="text-sm text-gray-300 font-medium">Enable Hover Interaction</span>
                                    </label>
                                    <div id="hoverInteractionSettings" class="hidden space-y-2 mt-2">
                                        <div>
                                            <label class="text-xs text-gray-400">Target Element</label>
                                            <select id="hoverTargetElement" class="w-full bg-gray-700 rounded px-2 py-1 text-sm">
                                                <option value="self">Self</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label class="text-xs text-gray-400">Action</label>
                                            <select id="hoverAction" class="w-full bg-gray-700 rounded px-2 py-1 text-sm">
                                                <option value="addShadow">Add Shadow</option>
                                                <option value="addGlow">Add Glow</option>
                                                <option value="pauseAnimation">Pause Animation</option>
                                                <option value="scale">Scale Up</option>
                                            </select>
                                        </div>
                                        <div id="hoverShadowSettings" class="hidden">
                                            <label class="text-xs text-gray-400">Shadow Settings</label>
                                            <div class="grid grid-cols-4 gap-1">
                                                <input type="number" id="hoverShadowX" class="bg-gray-700 rounded px-2 py-1 text-xs" placeholder="X" value="2">
                                                <input type="number" id="hoverShadowY" class="bg-gray-700 rounded px-2 py-1 text-xs" placeholder="Y" value="2">
                                                <input type="number" id="hoverShadowBlur" class="bg-gray-700 rounded px-2 py-1 text-xs" placeholder="Blur" value="5">
                                                <input type="color" id="hoverShadowColor" class="w-full h-7 bg-gray-700 rounded" value="#000000">
                                            </div>
                                        </div>
                                        <div id="hoverGlowSettings" class="hidden">
                                            <label class="text-xs text-gray-400">Glow Settings</label>
                                            <div class="grid grid-cols-4 gap-1">
                                                <input type="number" id="hoverGlowX" class="bg-gray-700 rounded px-2 py-1 text-xs" placeholder="X" value="0">
                                                <input type="number" id="hoverGlowY" class="bg-gray-700 rounded px-2 py-1 text-xs" placeholder="Y" value="0">
                                                <input type="number" id="hoverGlowBlur" class="bg-gray-700 rounded px-2 py-1 text-xs" placeholder="Blur" value="10">
                                                <input type="color" id="hoverGlowColor" class="w-full h-7 bg-gray-700 rounded" value="#00ff00">
                                            </div>
                                        </div>
                                        <div id="hoverScaleSettings" class="hidden">
                                            <label class="text-xs text-gray-400">Scale Amount</label>
                                            <input type="number" id="hoverScaleAmount" class="w-full bg-gray-700 rounded px-2 py-1 text-sm" placeholder="1.1" step="0.1" value="1.1">
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Export Section -->
                    <div class="mb-2">
                        <h2 class="text-lg font-semibold mb-3">Export</h2>
                        <div class="space-y-2">
                            <!-- Polite Load Option -->
                            <label class="flex items-center space-x-2 text-sm text-gray-300 cursor-pointer hover:text-white">
                                <input type="checkbox" id="politeLoadCheckbox" checked class="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500">
                                <span>Enable Polite Load</span>
                            </label>
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
                            <option value="300x600">300x600 (Half Page)</option>
                            <option value="320x480">320x480 (Mobile Portrait)</option>
                            <option value="800x600">800x600 (Large Rectangle)</option>
                            <option value="970x250">970x250 (Billboard)</option>
                            <option value="320x50">320x50 (Mobile Banner)</option>
                            <option value="custom">Custom Size</option>
                        </select>
                        <input type="number" id="customWidth" class="bg-gray-700 rounded px-3 py-1 text-sm w-20 hidden" placeholder="Width">
                        <input type="number" id="customHeight" class="bg-gray-700 rounded px-3 py-1 text-sm w-20 hidden" placeholder="Height">
                        
                        <div class="border-l border-gray-600 pl-4 flex items-center space-x-2">
                            <label class="text-sm text-gray-400">Zoom:</label>
                            <button id="stageZoomOut" class="bg-gray-700 hover:bg-gray-600 text-white px-3 py-1 rounded text-sm transition-colors">
                                <i class="fas fa-search-minus"></i>
                            </button>
                            <span id="stageZoomLevel" class="text-sm text-gray-300 w-12 text-center">100%</span>
                            <button id="stageZoomIn" class="bg-gray-700 hover:bg-gray-600 text-white px-3 py-1 rounded text-sm transition-colors">
                                <i class="fas fa-search-plus"></i>
                            </button>
                            <button id="stageZoomReset" class="bg-gray-700 hover:bg-gray-600 text-white px-3 py-1 rounded text-sm transition-colors">
                                <i class="fas fa-compress"></i>
                            </button>
                        </div>
                    </div>
                    <div class="flex items-center space-x-2">
                        <button id="clearBtn" class="bg-red-600 hover:bg-red-700 text-white px-4 py-1 rounded text-sm transition-colors">
                            <i class="fas fa-trash mr-2"></i>Clear All
                        </button>
                    </div>
                </div>

                <!-- Canvas -->
                <div class="flex-1 flex flex-col overflow-hidden bg-gray-900">
                    <div id="canvasContainer" class="flex-1 flex items-center justify-center p-8 overflow-auto">
                        <div id="canvasWrapper" class="relative shadow-2xl" style="width: 300px; height: 250px;">
                            <div id="canvas" class="w-full h-full relative overflow-hidden">
                                <!-- Elements will be added here -->
                            </div>
                        </div>
                    </div>
                    
                    <!-- Timeline Editor - Fixed at bottom -->
                    <div class="flex-shrink-0 bg-gray-800 border-t border-gray-700 p-4">
                        <div class="flex items-center justify-between mb-3">
                            <h3 class="text-lg font-semibold flex items-center">
                                <i class="fas fa-film mr-2 text-purple-400"></i>
                                Animation Timeline
                            </h3>
                            <div class="flex items-center space-x-4">
                                <!-- Duration Control -->
                                <div class="flex items-center space-x-2 bg-gray-800 rounded-lg px-3 py-1">
                                    <label class="text-xs text-gray-400">Duration:</label>
                                    <input type="number" id="timelineDuration" value="5" step="0.5" min="1" max="30" class="bg-gray-700 rounded px-2 py-1 text-sm w-16">
                                </div>
                                
                                <!-- Loop Control -->
                                <div class="flex items-center space-x-2 bg-gray-800 rounded-lg px-3 py-1">
                                    <label class="text-xs text-gray-400">Loop:</label>
                                    <input type="number" id="animLoop" value="1" min="1" max="999" class="bg-gray-700 rounded px-2 py-1 text-sm w-16">
                                </div>
                                
                                <!-- Play/Stop Buttons -->
                                <div class="flex space-x-2">
                                    <button id="playTimeline" class="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm transition-colors">
                                        <i class="fas fa-play mr-1"></i>Play
                                    </button>
                                    <button id="stopTimeline" class="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm transition-colors">
                                        <i class="fas fa-stop mr-1"></i>Stop
                                    </button>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Timeline Container -->
                        <div id="timelineContainer" class="bg-gray-900 rounded-lg overflow-x-auto relative" style="height: 190px;">
                            <div class="min-w-[800px]">
                                <!-- Timeline Header -->
                                <div class="flex border-b border-gray-700 sticky top-0 bg-gray-900 z-10">
                                    <div class="w-[200px] p-2 bg-gray-800 border-r border-gray-700 flex items-center justify-between">
                                        <span class="text-xs text-gray-400 font-semibold">LAYER</span>
                                        <button id="createGroupBtn" class="text-gray-600 hover:text-yellow-300 px-2 py-1 rounded transition-colors" title="Create Empty Group">
                                            <i class="fas fa-folder-plus text-sm"></i>
                                        </button>
                                    </div>
                                    <div class="flex-1 relative h-8">
                                        <div id="timelineRuler" class="absolute inset-0 flex user-select-none">
                                            <!-- Time markers will be added here -->
                                        </div>
                                        <div id="timelinePlayhead" class="absolute top-0 bottom-0 w-1 bg-red-500 z-10 cursor-ew-resize" style="left: 0;">
                                            <div class="w-4 h-4 bg-red-500 rounded-full absolute -top-1.5 -left-1.5 cursor-grab active:cursor-grabbing shadow-lg border-2 border-white"></div>
                                        </div>
                                    </div>
                                </div>
                                
                                <!-- Timeline Tracks (scrollable) -->
                                <div id="timelineTracks" class="overflow-y-auto" style="max-height: 150px;">
                                    <div class="text-center text-gray-500 text-sm py-8">
                                        Add elements and animations to see timeline
                                    </div>
                                </div>
                            </div>
                            
                            <!-- Zoom Controls -->
                            <div class="absolute bottom-4 right-4 flex items-center space-x-2 bg-gray-800 rounded-lg p-2 shadow-lg">
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
        <div id="animModal" tabindex="-1" class="hidden fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10000]">
            <div class="bg-gray-800 rounded-lg p-3 w-[600px] max-h-[90vh] overflow-y-auto">
                <div class="flex justify-between items-center mb-2">
                    <h3 class="text-xl font-bold">Add Animation</h3>
                    <button id="closeModal" class="text-gray-400 hover:text-white">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                
                <div class="space-y-2">
                    <div>
                        <label class="block text-sm text-gray-400 mb-2">Select Animation Effects</label>
                        <div class="grid grid-cols-2 gap-3">
                            <!-- Fade Dropdown -->
                            <div>
                                <label class="block text-xs text-gray-400 mb-1">Fade</label>
                                <select id="animFade" class="w-full bg-gray-700 rounded px-3 py-2 text-sm">
                                    <option value="">None</option>
                                    <option value="fadeIn">Fade In</option>
                                    <option value="fadeOut">Fade Out</option>
                                </select>
                            </div>
                            
                            <!-- Slide Dropdown -->
                            <div>
                                <label class="block text-xs text-gray-400 mb-1">Slide</label>
                                <select id="animSlide" class="w-full bg-gray-700 rounded px-3 py-2 text-sm">
                                    <option value="">None</option>
                                    <option value="slideLeft">From Left</option>
                                    <option value="slideRight">From Right</option>
                                    <option value="slideUp">From Top</option>
                                    <option value="slideDown">From Bottom</option>
                                </select>
                            </div>
                            
                            <!-- Zoom Dropdown -->
                            <div>
                                <label class="block text-xs text-gray-400 mb-1">Zoom</label>
                                <select id="animZoom" class="w-full bg-gray-700 rounded px-3 py-2 text-sm">
                                    <option value="">None</option>
                                    <option value="scaleIn">Zoom In</option>
                                    <option value="scaleOut">Zoom Out</option>
                                </select>
                            </div>
                            
                            <!-- Rotate Dropdown -->
                            <div>
                                <label class="block text-xs text-gray-400 mb-1">Rotate</label>
                                <select id="animRotate" class="w-full bg-gray-700 rounded px-3 py-2 text-sm">
                                    <option value="">None</option>
                                    <option value="rotate90">90°</option>
                                    <option value="rotate180">180°</option>
                                    <option value="rotate270">270°</option>
                                    <option value="rotate360">360°</option>
                                </select>
                            </div>
                        </div>
                    </div>
                    
                    <div class="grid grid-cols-2 gap-2">
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
                        <button type="button" id="saveAnimBtn" class="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded transition-colors">
                            <span id="animBtnText">Add Animation</span>
                        </button>
                        <button type="button" id="deleteAnimBtn" class="hidden bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded transition-colors">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- Clickthrough Modal -->
        <div id="clickthroughModal" tabindex="-1" class="hidden fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10000]">
            <div class="bg-gray-800 rounded-lg p-3 w-[500px]">
                <div class="flex justify-between items-center mb-2">
                    <h3 class="text-xl font-bold">Add Clickthrough Layer</h3>
                    <button id="closeClickthroughModal" class="text-gray-400 hover:text-white">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                
                <div class="space-y-2">
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
        <div id="shapeModal" tabindex="-1" class="hidden fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10000]">
            <div class="bg-gray-800 rounded-lg p-3 w-[500px]">
                <div class="flex justify-between items-center mb-2">
                    <h3 class="text-xl font-bold">Add Shape</h3>
                    <button id="closeShapeModal" class="text-gray-400 hover:text-white">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                
                <div class="space-y-2">
                    <div>
                        <label class="block text-sm text-gray-400 mb-2">Shape Type</label>
                        <select id="shapeType" class="w-full bg-gray-700 rounded px-3 py-2">
                            <option value="rectangle">Rectangle</option>
                            <option value="circle">Circle</option>
                            <option value="rounded-rectangle">Rounded Rectangle</option>
                        </select>
                    </div>
                    
                    <div class="grid grid-cols-2 gap-2">
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
                        <div class="flex gap-1">
                            <button class="color-swatch shape-color-swatch" data-color="#FFFFFF" style="background: #FFFFFF; border: 2px solid #444;" title="White"></button>
                            <button class="color-swatch shape-color-swatch" data-color="#000000" style="background: #000000; border: 2px solid #444;" title="Black"></button>
                            <button class="color-swatch shape-color-swatch" data-color="#6B7280" style="background: #6B7280; border: 2px solid #444;" title="Gray"></button>
                            <button class="color-swatch shape-color-swatch" data-color="#EF4444" style="background: #EF4444; border: 2px solid #444;" title="Red"></button>
                            <button class="color-swatch shape-color-swatch" data-color="#3B82F6" style="background: #3B82F6; border: 2px solid #444;" title="Blue"></button>
                            <button class="color-swatch shape-color-swatch" data-color="#10B981" style="background: #10B981; border: 2px solid #444;" title="Green"></button>
                            <button class="color-swatch shape-color-swatch" data-color="#F59E0B" style="background: #F59E0B; border: 2px solid #444;" title="Yellow"></button>
                            <button class="color-swatch-rainbow-shape" title="Custom color">
                                <i class="fas fa-palette"></i>
                            </button>
                        </div>
                        <input type="color" id="shapeFillColor" value="#3b82f6" class="hidden">
                    </div>
                    
                    <div>
                        <label class="block text-sm text-gray-400 mb-2">Border Radius (px)</label>
                        <input type="number" id="shapeBorderRadius" value="0" min="0" max="200" class="w-full bg-gray-700 rounded px-3 py-2">
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
        <!-- Video Modal -->
        <div id="videoModal" tabindex="-1" class="hidden fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10000]">
            <div class="bg-gray-800 rounded-lg p-3 w-[500px]">
                <div class="flex justify-between items-center mb-2">
                    <h3 class="text-xl font-bold">Add Video</h3>
                    <button id="closeVideoModal" class="text-gray-400 hover:text-white">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                
                <div class="space-y-2">
                    <div>
                        <label class="block text-sm text-gray-400 mb-2">Video URL (Flashtalking)</label>
                        <input type="text" id="videoUrl" placeholder="220952/video" class="w-full bg-gray-700 rounded px-3 py-2">
                        <p class="text-xs text-gray-500 mt-1">Format: folder/filename</p>
                    </div>
                    
                    <div>
                        <label class="block text-sm text-gray-400 mb-2">Video Name/ID</label>
                        <input type="text" id="videoName" placeholder="video1" class="w-full bg-gray-700 rounded px-3 py-2">
                        <p class="text-xs text-gray-500 mt-1">Unique identifier (e.g., video1, video2)</p>
                    </div>
                    
                    <div>
                        <label class="block text-sm text-gray-400 mb-2">Start Playing When</label>
                        <select id="videoPlayTrigger" class="w-full bg-gray-700 rounded px-3 py-2">
                            <option value="autoplay">Autoplay</option>
                            <option value="mouseover">Mouse Over</option>
                            <option value="click">Click/Tap</option>
                        </select>
                    </div>
                    
                    <div class="flex items-center space-x-4 py-2">
                        <label class="flex items-center cursor-pointer">
                            <input type="checkbox" id="videoMuted" class="w-4 h-4 mr-2" checked>
                            <span class="text-sm text-gray-300">Muted</span>
                        </label>
                        
                        <label class="flex items-center cursor-pointer">
                            <input type="checkbox" id="videoControls" class="w-4 h-4 mr-2">
                            <span class="text-sm text-gray-300">Controls</span>
                        </label>
                    </div>
                    
                    <button id="saveVideoBtn" class="w-full bg-red-600 hover:bg-red-700 text-white py-2 rounded transition-colors">
                        Add Video
                    </button>
                </div>
            </div>
        </div>

        <!-- Text Modal -->
        <div id="textModal" tabindex="-1" class="hidden fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10000]">
            <div class="bg-gray-800 rounded-lg p-3 w-[500px]">
                <div class="flex justify-between items-center mb-2">
                    <h3 class="text-xl font-bold">Add Text</h3>
                    <button id="closeTextModal" class="text-gray-400 hover:text-white">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                
                <div class="space-y-2">
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
