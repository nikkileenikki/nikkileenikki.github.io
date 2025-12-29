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
            <div class="w-80 bg-gray-800 border-r border-gray-700 overflow-y-auto">
                <div class="p-6">
                    <h1 class="text-2xl font-bold mb-6 flex items-center">
                        <i class="fas fa-ad mr-2 text-blue-400"></i>
                        Ad Builder
                    </h1>
                    
                    <!-- Upload Section -->
                    <div class="mb-6">
                        <h2 class="text-lg font-semibold mb-3">Upload Image</h2>
                        <div id="dropzone" class="border-2 border-dashed border-gray-600 rounded-lg p-6 text-center cursor-pointer hover:border-blue-400 transition-colors">
                            <i class="fas fa-cloud-upload-alt text-4xl text-gray-500 mb-2"></i>
                            <p class="text-sm text-gray-400">Drop image here or click to upload</p>
                            <p class="text-xs text-gray-500 mt-1">JPG, PNG, GIF</p>
                        </div>
                        <input type="file" id="fileInput" accept="image/jpeg,image/png,image/gif" class="hidden">
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
                                <input type="range" id="propOpacity" class="w-full" min="0" max="1" step="0.1" value="1">
                                <span id="opacityValue" class="text-xs text-gray-500">100%</span>
                            </div>
                        </div>
                    </div>

                    <!-- Animation Panel -->
                    <div class="mb-6">
                        <h2 class="text-lg font-semibold mb-3">Animation</h2>
                        <div class="space-y-3 bg-gray-900 rounded-lg p-3">
                            <button id="addAnimBtn" class="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded transition-colors">
                                <i class="fas fa-plus mr-2"></i>Add Animation
                            </button>
                            <div id="animationsList" class="space-y-2 mt-3">
                                <!-- Animations will be listed here -->
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
                <div class="flex-1 flex items-center justify-center p-8 overflow-auto bg-gray-900">
                    <div id="canvasWrapper" class="relative bg-white shadow-2xl" style="width: 300px; height: 250px;">
                        <div id="canvas" class="w-full h-full relative overflow-hidden">
                            <!-- Elements will be added here -->
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Animation Modal -->
        <div id="animModal" class="hidden fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div class="bg-gray-800 rounded-lg p-6 w-[500px] max-h-[90vh] overflow-y-auto">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="text-xl font-bold">Add Animation</h3>
                    <button id="closeModal" class="text-gray-400 hover:text-white">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                
                <div class="space-y-4">
                    <div>
                        <label class="block text-sm text-gray-400 mb-2">Animation Type</label>
                        <select id="animType" class="w-full bg-gray-700 rounded px-3 py-2">
                            <option value="fadeIn">Fade In</option>
                            <option value="fadeOut">Fade Out</option>
                            <option value="slideLeft">Slide from Left</option>
                            <option value="slideRight">Slide from Right</option>
                            <option value="slideUp">Slide from Top</option>
                            <option value="slideDown">Slide from Bottom</option>
                            <option value="scale">Scale</option>
                            <option value="rotate">Rotate</option>
                            <option value="bounce">Bounce</option>
                        </select>
                    </div>
                    
                    <div>
                        <label class="block text-sm text-gray-400 mb-2">Duration (seconds)</label>
                        <input type="number" id="animDuration" value="1" step="0.1" min="0.1" class="w-full bg-gray-700 rounded px-3 py-2">
                    </div>
                    
                    <div>
                        <label class="block text-sm text-gray-400 mb-2">Delay (seconds)</label>
                        <input type="number" id="animDelay" value="0" step="0.1" min="0" class="w-full bg-gray-700 rounded px-3 py-2">
                    </div>
                    
                    <div>
                        <label class="block text-sm text-gray-400 mb-2">Easing</label>
                        <select id="animEase" class="w-full bg-gray-700 rounded px-3 py-2">
                            <option value="power1.out">Power1 Out</option>
                            <option value="power2.out">Power2 Out</option>
                            <option value="power3.out">Power3 Out</option>
                            <option value="back.out">Back Out</option>
                            <option value="elastic.out">Elastic Out</option>
                            <option value="bounce.out">Bounce Out</option>
                            <option value="linear">Linear</option>
                        </select>
                    </div>
                    
                    <button id="saveAnimBtn" class="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded transition-colors">
                        Save Animation
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
