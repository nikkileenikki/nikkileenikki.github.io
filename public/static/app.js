// HTML5 Ad Builder - Full Featured Version
(function() {
    'use strict';
    
    // ============================================
    // STATE MANAGEMENT
    // ============================================
    let elements = [];
    let selectedElement = null;
    let dragOffset = { x: 0, y: 0 };
    let isDragging = false;
    let isResizing = false;
    let resizeHandle = null;
    let elementCounter = 0;
    let timeline = gsap.timeline({ paused: true });
    let totalDuration = 5;
    let isPlaying = false;
    let zoomLevel = 1; // Now controls timeline duration scale
    let animLoop = 0; // Default: 0 = play once (matches HTML default)
    let editingAnimation = null; // For editing existing animations
    
    // Canvas dimensions
    let canvasWidth = 300;
    let canvasHeight = 250;
    let stageZoom = 1.0; // Stage zoom level (0.25 to 2.0)
    
    // Ensure stageZoom is initialized to exact 1.0
    stageZoom = Math.round(stageZoom * 4) / 4;
    
    // DOM elements
    const $canvas = $('#canvas');
    const $canvasWrapper = $('#canvasWrapper');
    const $layersList = $('#layersList');
    const $dropzone = $('#dropzone');
    const $fileInput = $('#fileInput');
    const $propertiesPanel = $('#propertiesPanel');
    const $textProps = $('#textProps');
    const $animModal = $('#animModal');
    const $textModal = $('#textModal');
    const $clickthroughModal = $('#clickthroughModal');
    const $timelineTracks = $('#timelineTracks');
    const $timelineRuler = $('#timelineRuler');
    
    // ============================================
    // INITIALIZATION
    // ============================================
    $(document).ready(function() {
        initEventListeners();
        updateCanvasSize();
        updateTimelineRuler();
    });
    
    // ============================================
    // EVENT LISTENERS
    // ============================================
    function initEventListeners() {
        // File upload
        $dropzone.on('click', () => $fileInput.click());
        $dropzone.on('dragover', handleDragOver);
        $dropzone.on('drop', handleDrop);
        $fileInput.on('change', handleFileSelect);
        
        // Text
        $('#addTextBtn').on('click', openTextModal);
        $('#closeTextModal').on('click', closeTextModal);
        $('#saveTextBtn').on('click', saveText);
        $('#textContent').on('keypress', function(e) {
            if (e.which === 13) { // Enter key
                e.preventDefault();
                saveText();
            }
        });
        
        // Clickthrough
        $('#addClickthroughBtn').on('click', openClickthroughModal);
        $('#closeClickthroughModal').on('click', closeClickthroughModal);
        $('#saveClickthroughBtn').on('click', saveClickthrough);
        
        // Shape
        $('#addShapeBtn').on('click', openShapeModal);
        $('#closeShapeModal').on('click', closeShapeModal);
        $('#saveShapeBtn').on('click', saveShape);
        $('#shapeOpacity').on('input', function() {
            const val = $(this).val();
            $('#shapeOpacityValue').text(Math.round(val * 100) + '%');
        });
        
        // Canvas size
        $('#canvasSize').on('change', handleCanvasSizeChange);
        $('#customWidth, #customHeight').on('change', updateCustomCanvasSize);
        
        // Canvas interactions
        $canvas.on('mousedown', '.canvas-element', handleElementMouseDown);
        $canvas.on('mousedown', '.resize-handle', handleResizeStart);
        $(document).on('mousemove', handleMouseMove);
        $(document).on('mouseup', handleMouseUp);
        
        // Deselect element when clicking on canvas container background only
        $(document).on('mousedown', '#canvasContainer', function(e) {
            // Only deselect if clicked directly on canvasContainer, not on its children
            if (e.target.id === 'canvasContainer') {
                if (selectedElement) {
                    selectedElement = null;
                    $('.canvas-element').removeClass('selected');
                    $('.layer-item').removeClass('selected');
                    $('.timeline-track').removeClass('selected');
                    $propertiesPanel.addClass('hidden');
                }
            }
        });
        
        // Layer selection and controls
        $layersList.on('click', '.layer-item', handleLayerClick);
        $layersList.on('click', '.delete-layer', handleDeleteLayer);
        $layersList.on('click', '.add-layer-anim', handleAddLayerAnimation);
        $layersList.on('click', '.toggle-layer-visibility', toggleLayerVisibility);
        
        // Common properties
        $('#propWidth').on('change', updateElementWidth);
        $('#propHeight').on('change', updateElementHeight);
        $('#propX').on('change', updateElementX);
        $('#propY').on('change', updateElementY);
        $('#propRotation').on('change', updateElementRotation);
        $('#propOpacity').on('input', updateElementOpacity);
        
        // Text properties
        $('#propText').on('input', updateTextContent);
        $('#propFontFamily').on('change', updateFontFamily);
        $('#propFontSize').on('change', updateFontSize);
        $('#propColor').on('change', updateColor);
        
        // Color swatches
        $(document).on('click', '.color-swatch', function() {
            const color = $(this).data('color');
            const $colorInput = $(this).closest('div').parent().find('input[type="color"]');
            
            // Remove selected from siblings
            $(this).siblings('.color-swatch').removeClass('selected');
            // Add selected to this
            $(this).addClass('selected');
            
            $colorInput.val(color).trigger('change');
        });
        
        $(document).on('click', '.color-swatch-rainbow', function() {
            // Remove selected from color swatches
            $('.text-color-swatch').removeClass('selected');
            $('#propColor').removeClass('hidden').click();
        });
        
        $(document).on('click', '.color-swatch-rainbow-shape', function() {
            // Remove selected from shape color swatches
            $('.shape-color-swatch').removeClass('selected');
            $('#shapeFillColor').removeClass('hidden').click();
        });
        $('#propBold').on('click', toggleBold);
        $('#propItalic').on('click', toggleItalic);
        $('#propUnderline').on('click', toggleUnderline);
        $('.text-align-btn').on('click', updateTextAlign);
        
        // Clickthrough properties
        $('#propClickUrl').on('change', updateClickUrl);
        $('#propClickTarget').on('change', updateClickTarget);
        
        // Shape properties
        $('#propShapeType').on('change', updateShapeType);
        $('#propShapeColor').on('change', updateShapeColor);
        
        // Animation
        $('#addAnimBtn').on('click', openAnimationModal);
        $('#closeModal').on('click', closeAnimationModal);
        $('#saveAnimBtn').on('click', saveAnimation);
        $('#deleteAnimBtn').on('click', deleteEditingAnimation);
        $('#animType').on('change', toggleCustomAnimProps);
        $timelineTracks.on('click', '.timeline-block', editAnimation);
        $timelineTracks.on('click', '.delete-anim', function(e) {
            e.stopPropagation();
            handleDeleteAnimation(e);
        });
        
        // Timeline layer controls
        $timelineTracks.on('click', '.timeline-track-label', function(e) {
            // Don't select if clicking on a button
            if ($(e.target).closest('button').length > 0) return;
            
            const elementId = $(e.currentTarget).closest('.timeline-track').data('element-id');
            if (elementId) {
                selectElement(elementId);
            }
        });
        
        $timelineTracks.on('click', '.toggle-visibility', function(e) {
            e.stopPropagation();
            toggleLayerVisibility(e);
        });
        $timelineTracks.on('click', '.add-layer-anim', function(e) {
            e.stopPropagation();
            handleAddLayerAnimation(e);
        });
        $timelineTracks.on('click', '.delete-layer', function(e) {
            e.stopPropagation();
            handleDeleteLayer(e);
        });
        
        // Timeline block dragging and resizing
        $timelineTracks.on('mousedown', '.timeline-block', handleTimelineBlockDragStart);
        $timelineTracks.on('mousedown', '.timeline-block-resize-handle', handleTimelineBlockResizeStart);
        
        // Timeline controls
        $('#timelineDuration').on('change', updateTotalDuration);
        $('#animLoop').on('change', updateAnimLoop);
        $('#zoomIn').on('click', zoomIn);
        $('#zoomOut').on('click', zoomOut);
        $('#playTimeline').on('click', playTimeline);
        $('#stopTimeline').on('click', stopTimeline);
        
        // Playhead dragging
        $('#timelinePlayhead').on('mousedown', handlePlayheadDragStart);
        
        // Actions
        $('#previewBtn').on('click', playTimeline);
        $('#exportBtn').on('click', exportToZip);
        $('#clearBtn').on('click', clearAll);
        
        // Banner name input - sanitize in real-time
        $('#bannerName').on('input', function() {
            let value = $(this).val();
            // Replace spaces with dashes, remove special characters
            value = value.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9-_]/g, '');
            $(this).val(value);
        });
        
        // Stage zoom controls
        $('#stageZoomIn').on('click', stageZoomIn);
        $('#stageZoomOut').on('click', stageZoomOut);
        $('#stageZoomReset').on('click', stageZoomReset);
    }
    
    // ============================================
    // PLAYHEAD DRAGGING
    // ============================================
    let isPlayheadDragging = false;
    
    function handlePlayheadDragStart(e) {
        e.preventDefault();
        e.stopPropagation();
        isPlayheadDragging = true;
        
        const moveHandler = function(moveEvent) {
            if (!isPlayheadDragging) return;
            
            const $ruler = $('#timelineRuler');
            const rulerOffset = $ruler.offset().left;
            const rulerWidth = $ruler.width();
            const mouseX = moveEvent.pageX - rulerOffset;
            
            let percent = (mouseX / rulerWidth) * 100;
            percent = Math.max(0, Math.min(100, percent));
            
            $('#timelinePlayhead').css('left', percent + '%');
            
            // Update timeline position if not playing
            if (!isPlaying && timeline) {
                const time = (percent / 100) * totalDuration;
                timeline.seek(time);
            }
        };
        
        const upHandler = function() {
            isPlayheadDragging = false;
            $(document).off('mousemove', moveHandler);
            $(document).off('mouseup', upHandler);
        };
        
        $(document).on('mousemove', moveHandler);
        $(document).on('mouseup', upHandler);
    }
    
    // Timeline track drag and drop
    
    // ============================================
    // TIMELINE BLOCK DRAGGING AND RESIZING
    // ============================================
    let isTimelineBlockDragging = false;
    let isTimelineBlockResizing = false;
    let draggedBlock = null;
    let resizeDirection = null;
    
    function handleTimelineBlockDragStart(e) {
        // Don't drag if clicking on resize handle or delete button
        if ($(e.target).hasClass('timeline-block-resize-handle') || 
            $(e.target).closest('.delete-anim').length > 0) {
            return;
        }
        
        e.preventDefault();
        e.stopPropagation();
        
        const $block = $(e.currentTarget);
        const animId = $block.data('anim-id');
        const elementId = $block.data('element-id');
        
        // Don't set dragging flag yet - wait for actual movement
        let hasMoved = false;
        draggedBlock = { animId, elementId, $block };
        
        const $track = $block.parent();
        const trackOffset = $track.offset().left;
        const trackWidth = $track.width();
        const blockOffset = $block.offset().left;
        const startX = e.pageX;
        const initialLeft = blockOffset - trackOffset;
        
        const moveHandler = function(moveEvent) {
            const deltaX = moveEvent.pageX - startX;
            
            // Only start dragging if mouse moved more than 3px
            if (!hasMoved && Math.abs(deltaX) > 3) {
                hasMoved = true;
                isTimelineBlockDragging = true;
            }
            
            if (!hasMoved) return;
            
            let newLeft = initialLeft + deltaX;
            newLeft = Math.max(0, Math.min(trackWidth - $block.width(), newLeft));
            
            const newLeftPercent = (newLeft / trackWidth) * 100;
            $block.css('left', newLeftPercent + '%');
            
            // Update animation start time
            const element = elements.find(el => el.id === elementId);
            if (element) {
                const anim = element.animations.find(a => a.id === animId);
                if (anim) {
                    anim.start = (newLeftPercent / 100) * totalDuration;
                }
            }
        };
        
        const upHandler = function() {
            $(document).off('mousemove', moveHandler);
            $(document).off('mouseup', upHandler);
            
            if (hasMoved) {
                rebuildTimeline();
            }
            
            // Reset flags after a short delay to allow click event to check
            setTimeout(() => {
                isTimelineBlockDragging = false;
                draggedBlock = null;
            }, 50);
        };
        
        $(document).on('mousemove', moveHandler);
        $(document).on('mouseup', upHandler);
    }
    
    function handleTimelineBlockResizeStart(e) {
        e.preventDefault();
        e.stopPropagation();
        
        const $handle = $(e.currentTarget);
        const $block = $handle.parent();
        const animId = $block.data('anim-id');
        const elementId = $block.data('element-id');
        
        isTimelineBlockResizing = true;
        resizeDirection = $handle.hasClass('left') ? 'left' : 'right';
        draggedBlock = { animId, elementId, $block };
        
        const $track = $block.parent();
        const trackOffset = $track.offset().left;
        const trackWidth = $track.width();
        const startX = e.pageX;
        const initialLeft = parseFloat($block.css('left'));
        const initialWidth = $block.width();
        
        const moveHandler = function(moveEvent) {
            if (!isTimelineBlockResizing) return;
            
            const deltaX = moveEvent.pageX - startX;
            const deltaPercent = (deltaX / trackWidth) * 100;
            
            const element = elements.find(el => el.id === elementId);
            if (!element) return;
            
            const anim = element.animations.find(a => a.id === animId);
            if (!anim) return;
            
            if (resizeDirection === 'left') {
                // Resize from left - adjust start and duration
                let newLeft = initialLeft + deltaPercent;
                newLeft = Math.max(0, newLeft);
                
                const widthPercent = parseFloat($block.css('width'));
                const newWidthPercent = widthPercent - (newLeft - initialLeft);
                
                if (newWidthPercent > 2) { // Minimum 2% width
                    $block.css('left', newLeft + '%');
                    $block.css('width', newWidthPercent + '%');
                    
                    anim.start = (newLeft / 100) * totalDuration;
                    anim.duration = (newWidthPercent / 100) * totalDuration;
                }
            } else {
                // Resize from right - adjust duration only
                const currentWidthPx = initialWidth + deltaX;
                const maxWidth = trackWidth - parseFloat($block.position().left);
                const newWidthPx = Math.max(20, Math.min(currentWidthPx, maxWidth));
                const newWidthPercent = (newWidthPx / trackWidth) * 100;
                
                $block.css('width', newWidthPercent + '%');
                anim.duration = (newWidthPercent / 100) * totalDuration;
            }
        };
        
        const upHandler = function() {
            isTimelineBlockResizing = false;
            resizeDirection = null;
            draggedBlock = null;
            $(document).off('mousemove', moveHandler);
            $(document).off('mouseup', upHandler);
            rebuildTimeline();
        };
        
        $(document).on('mousemove', moveHandler);
        $(document).on('mouseup', upHandler);
    }
    
    // ============================================
    // FILE UPLOAD
    // ============================================
    function handleDragOver(e) {
        e.preventDefault();
        e.stopPropagation();
        $(this).addClass('border-blue-400');
    }
    
    function handleDrop(e) {
        e.preventDefault();
        e.stopPropagation();
        $(this).removeClass('border-blue-400');
        
        const files = e.originalEvent.dataTransfer.files;
        if (files.length > 0) {
            uploadFile(files[0]);
        }
    }
    
    function handleFileSelect(e) {
        const files = e.target.files;
        if (files.length > 0) {
            uploadFile(files[0]);
        }
    }
    
    async function uploadFile(file) {
        const validTypes = ['image/jpeg', 'image/png', 'image/gif'];
        if (!validTypes.includes(file.type)) {
            alert('Please upload a JPG, PNG, or GIF file.');
            return;
        }
        
        // Client-side file reading (no server required)
        const reader = new FileReader();
        
        reader.onload = function(e) {
            const dataUrl = e.target.result;
            addImageToCanvas(dataUrl, file.name);
        };
        
        reader.onerror = function(error) {
            console.error('File read error:', error);
            alert('Failed to read file. Please try again.');
        };
        
        // Read file as data URL (base64)
        reader.readAsDataURL(file);
    }
    
    // ============================================
    // TEXT MANAGEMENT
    // ============================================
    function openTextModal() {
        $('#textContent').val('');
        $textModal.removeClass('hidden');
        setTimeout(() => $('#textContent').focus(), 100);
    }
    
    function closeTextModal() {
        $textModal.addClass('hidden');
    }
    
    function saveText() {
        const text = $('#textContent').val().trim();
        if (!text) {
            alert('Please enter some text');
            return;
        }
        addTextToCanvas(text);
        closeTextModal();
    }
    
    function addTextToCanvas(text) {
        elementCounter++;
        const id = `element_${elementCounter}`;
        
        const element = {
            id: id,
            type: 'text',
            text: text,
            x: 50,
            y: 50,
            width: 200,
            height: 50,
            rotation: 0,
            opacity: 1,
            fontSize: 24,
            fontFamily: 'Arial',
            color: '#000000',
            bold: false,
            italic: false,
            underline: false,
            textAlign: 'left',
            zIndex: elements.length,
            animations: []
        };
        
        elements.push(element);
        
        const $element = $(`
            <div class="canvas-element text-element" id="${id}" style="
                left: ${element.x}px;
                top: ${element.y}px;
                width: ${element.width}px;
                height: ${element.height}px;
                opacity: ${element.opacity};
                transform: rotate(${element.rotation}deg);
                font-size: ${element.fontSize}px;
                font-family: ${element.fontFamily};
                color: ${element.color};
                font-weight: ${element.bold ? 'bold' : 'normal'};
                font-style: ${element.italic ? 'italic' : 'normal'};
                text-decoration: ${element.underline ? 'underline' : 'none'};
                text-align: ${element.textAlign};
                padding: 5px;
                line-height: 1.2;
                word-wrap: break-word;
                z-index: ${element.zIndex};
            ">
                ${text}
                <div class="resize-handle nw"></div>
                <div class="resize-handle ne"></div>
                <div class="resize-handle sw"></div>
                <div class="resize-handle se"></div>
            </div>
        `);
        
        $canvas.append($element);
        updateLayersList();
        selectElement(id);
    }
    
    // ============================================
    // CLICKTHROUGH MANAGEMENT
    // ============================================
    function openClickthroughModal() {
        $('#clickthroughUrl').val('https://kult.my');
        $('#clickthroughTarget').val('_blank');
        $clickthroughModal.removeClass('hidden');
    }
    
    function closeClickthroughModal() {
        $clickthroughModal.addClass('hidden');
    }
    
    function saveClickthrough() {
        const url = $('#clickthroughUrl').val() || 'https://kult.my';
        const target = $('#clickthroughTarget').val() || '_blank';
        addClickthroughToCanvas(url, target);
        closeClickthroughModal();
    }
    
    // ============================================
    // SHAPE
    // ============================================
    function openShapeModal() {
        $('#shapeModal').removeClass('hidden');
    }
    
    function closeShapeModal() {
        $('#shapeModal').addClass('hidden');
    }
    
    function saveShape() {
        const shapeType = $('#shapeType').val();
        const width = parseInt($('#shapeWidth').val()) || 200;
        const height = parseInt($('#shapeHeight').val()) || 150;
        const fillColor = $('#shapeFillColor').val();
        const opacity = parseFloat($('#shapeOpacity').val()) || 1;
        const borderRadius = parseInt($('#shapeBorderRadius').val()) || 0;
        
        addShapeToCanvas(shapeType, width, height, fillColor, opacity, borderRadius);
        closeShapeModal();
    }
    
    function addShapeToCanvas(shapeType, width, height, fillColor, opacity, borderRadius = 0) {
        elementCounter++;
        const id = `element_${elementCounter}`;
        
        const element = {
            id: id,
            type: 'shape',
            shapeType: shapeType,
            fillColor: fillColor,
            borderRadius: borderRadius,
            x: 50,
            y: 50,
            width: width,
            height: height,
            rotation: 0,
            opacity: opacity,
            zIndex: elements.length,
            animations: []
        };
        
        elements.push(element);
        
        let shapeStyle = `background-color: ${fillColor};`;
        if (shapeType === 'circle') {
            shapeStyle += ' border-radius: 50%;';
        } else if (shapeType === 'rounded-rectangle') {
            shapeStyle += ' border-radius: 12px;';
        } else if (borderRadius > 0) {
            shapeStyle += ` border-radius: ${borderRadius}px;`;
        }
        
        const $element = $(`
            <div class="canvas-element" id="${id}" style="
                left: ${element.x}px;
                top: ${element.y}px;
                width: ${element.width}px;
                height: ${element.height}px;
                opacity: ${element.opacity};
                transform: rotate(${element.rotation}deg);
                z-index: ${element.zIndex};
                ${shapeStyle}
            ">
                <div class="resize-handle nw"></div>
                <div class="resize-handle ne"></div>
                <div class="resize-handle sw"></div>
                <div class="resize-handle se"></div>
            </div>
        `);
        
        $canvas.append($element);
        updateLayersList();
        selectElement(id);
        updateTimelineTracks();
    }
    
    function addClickthroughToCanvas(url, target) {
        elementCounter++;
        const id = `element_${elementCounter}`;
        
        const element = {
            id: id,
            type: 'clickthrough',
            url: url,
            target: target,
            x: 0,
            y: 0,
            width: canvasWidth,
            height: canvasHeight,
            rotation: 0,
            opacity: 0.3,
            zIndex: 9999,
            animations: []
        };
        
        elements.push(element);
        
        const $element = $(`
            <div class="canvas-element clickthrough-element" id="${id}" style="
                left: ${element.x}px;
                top: ${element.y}px;
                width: ${element.width}px;
                height: ${element.height}px;
                opacity: ${element.opacity};
                transform: rotate(${element.rotation}deg);
                z-index: ${element.zIndex};
            ">
                <div style="text-align: center; color: rgba(168, 85, 247, 0.8); pointer-events: none;">
                    <i class="fas fa-mouse-pointer text-2xl mb-2"></i>
                    <div class="text-xs">Clickthrough</div>
                    <div class="text-xs font-bold">${url}</div>
                </div>
                <div class="resize-handle nw"></div>
                <div class="resize-handle ne"></div>
                <div class="resize-handle sw"></div>
                <div class="resize-handle se"></div>
            </div>
        `);
        
        $canvas.append($element);
        updateLayersList();
        selectElement(id);
    }
    
    // ============================================
    // CANVAS MANAGEMENT
    // ============================================
    function addImageToCanvas(url, filename) {
        elementCounter++;
        const id = `element_${elementCounter}`;
        
        // Load image to get natural dimensions
        const img = new Image();
        img.onload = function() {
            const naturalWidth = img.width;
            const naturalHeight = img.height;
            const aspectRatio = naturalHeight / naturalWidth;
            
            // Fit to canvas width, maintain aspect ratio
            const fitWidth = canvasWidth;
            const fitHeight = Math.round(fitWidth * aspectRatio);
            
            const element = {
                id: id,
                type: 'image',
                src: url,
                filename: filename,
                x: 0,  // Start at X = 0
                y: 0,  // Start at Y = 0
                width: fitWidth,
                height: fitHeight,
                rotation: 0,
                opacity: 1,
                zIndex: elements.length,
                animations: []
            };
            
            elements.push(element);
            
            const $element = $(`
                <div class="canvas-element" id="${id}" style="
                    left: ${element.x}px;
                    top: ${element.y}px;
                    width: ${element.width}px;
                    height: ${element.height}px;
                    opacity: ${element.opacity};
                    transform: rotate(${element.rotation}deg);
                    z-index: ${element.zIndex};
                ">
                    <img src="${url}" style="width: 100%; height: 100%; object-fit: contain; pointer-events: none;">
                    <div class="resize-handle nw"></div>
                    <div class="resize-handle ne"></div>
                    <div class="resize-handle sw"></div>
                    <div class="resize-handle se"></div>
                </div>
            `);
            
            $canvas.append($element);
            updateLayersList();
            selectElement(id);
        };
        
        img.onerror = function() {
            // Fallback if image fails to load
            console.error('Failed to load image:', filename);
            alert('Failed to load image. Please try again.');
        };
        
        img.src = url;
    }
    
    function updateCanvasSize() {
        $canvasWrapper.css({
            width: canvasWidth + 'px',
            height: canvasHeight + 'px'
        });
        updateTimelineRuler();
    }
    
    function handleCanvasSizeChange(e) {
        const value = $(e.target).val();
        
        if (value === 'custom') {
            $('#customWidth, #customHeight').removeClass('hidden');
        } else {
            $('#customWidth, #customHeight').addClass('hidden');
            const [width, height] = value.split('x').map(Number);
            canvasWidth = width;
            canvasHeight = height;
            updateCanvasSize();
        }
    }
    
    function updateCustomCanvasSize() {
        const width = parseInt($('#customWidth').val()) || 300;
        const height = parseInt($('#customHeight').val()) || 250;
        canvasWidth = width;
        canvasHeight = height;
        updateCanvasSize();
    }
    
    // ============================================
    // ELEMENT INTERACTION
    // ============================================
    function handleElementMouseDown(e) {
        if ($(e.target).hasClass('resize-handle')) return;
        
        e.preventDefault();
        e.stopPropagation();
        
        const $element = $(e.currentTarget);
        const id = $element.attr('id');
        selectElement(id);
        
        isDragging = true;
        const offset = $element.offset();
        const canvasOffset = $canvas.offset();
        
        dragOffset = {
            x: e.pageX - offset.left,
            y: e.pageY - offset.top
        };
    }
    
    function handleResizeStart(e) {
        e.preventDefault();
        e.stopPropagation();
        
        isResizing = true;
        resizeHandle = $(e.target).attr('class').split(' ')[1];
        
        const $element = $(e.target).closest('.canvas-element');
        selectElement($element.attr('id'));
    }
    
    function handleMouseMove(e) {
        if (!selectedElement) return;
        
        const element = elements.find(el => el.id === selectedElement);
        if (!element) return;
        
        const $element = $(`#${selectedElement}`);
        const canvasOffset = $canvas.offset();
        
        if (isDragging) {
            let newX = e.pageX - canvasOffset.left - dragOffset.x;
            let newY = e.pageY - canvasOffset.top - dragOffset.y;
            
            newX = Math.max(0, Math.min(newX, canvasWidth - element.width));
            newY = Math.max(0, Math.min(newY, canvasHeight - element.height));
            
            element.x = newX;
            element.y = newY;
            
            $element.css({
                left: newX + 'px',
                top: newY + 'px'
            });
            
            updatePropertiesPanel();
        } else if (isResizing) {
            const mouseX = e.pageX - canvasOffset.left;
            const mouseY = e.pageY - canvasOffset.top;
            
            let newWidth = element.width;
            let newHeight = element.height;
            let newX = element.x;
            let newY = element.y;
            
            switch(resizeHandle) {
                case 'se':
                    newWidth = Math.max(20, mouseX - element.x);
                    newHeight = Math.max(20, mouseY - element.y);
                    break;
                case 'sw':
                    newWidth = Math.max(20, element.x + element.width - mouseX);
                    newHeight = Math.max(20, mouseY - element.y);
                    newX = mouseX;
                    break;
                case 'ne':
                    newWidth = Math.max(20, mouseX - element.x);
                    newHeight = Math.max(20, element.y + element.height - mouseY);
                    newY = mouseY;
                    break;
                case 'nw':
                    newWidth = Math.max(20, element.x + element.width - mouseX);
                    newHeight = Math.max(20, element.y + element.height - mouseY);
                    newX = mouseX;
                    newY = mouseY;
                    break;
            }
            
            element.width = newWidth;
            element.height = newHeight;
            element.x = newX;
            element.y = newY;
            
            $element.css({
                width: newWidth + 'px',
                height: newHeight + 'px',
                left: newX + 'px',
                top: newY + 'px'
            });
            
            updatePropertiesPanel();
        }
    }
    
    function handleMouseUp() {
        isDragging = false;
        isResizing = false;
        resizeHandle = null;
    }
    
    // ============================================
    // ARROW KEY POSITIONING
    // ============================================
    function handleKeyDown(e) {
        if (!selectedElement) return;
        
        // Delete/Backspace keys: 8=backspace, 46=delete
        if (e.keyCode === 8 || e.keyCode === 46) {
            // Prevent default browser back navigation on Backspace
            e.preventDefault();
            
            // Delete the selected element
            elements = elements.filter(el => el.id !== selectedElement);
            $(`#${selectedElement}`).remove();
            
            selectedElement = null;
            $propertiesPanel.addClass('hidden');
            
            updateLayersList();
            rebuildTimeline();
            return;
        }
        
        // Arrow keys: 37=left, 38=up, 39=right, 40=down
        const arrowKeys = [37, 38, 39, 40];
        if (!arrowKeys.includes(e.keyCode)) return;
        
        e.preventDefault();
        
        const element = elements.find(el => el.id === selectedElement);
        if (!element) return;
        
        // Shift key: move 10px; default: move 1px
        const step = e.shiftKey ? 10 : 1;
        
        switch(e.keyCode) {
            case 37: // Left
                element.x -= step;
                break;
            case 38: // Up
                element.y -= step;
                break;
            case 39: // Right
                element.x += step;
                break;
            case 40: // Down
                element.y += step;
                break;
        }
        
        // Update element position
        $(`#${element.id}`).css({
            left: element.x + 'px',
            top: element.y + 'px'
        });
        
        // Update properties panel
        updatePropertiesPanel();
    }
    
    // Bind keyboard handler
    $(document).on('keydown', handleKeyDown);
    
    // ============================================
    // ELEMENT SELECTION
    // ============================================
    function selectElement(id) {
        selectedElement = id;
        
        $('.canvas-element').removeClass('selected');
        $(`#${id}`).addClass('selected');
        
        $('.layer-item').removeClass('selected');
        $(`.layer-item[data-id="${id}"]`).addClass('selected');
        
        $('.timeline-track').removeClass('selected');
        $(`.timeline-track[data-element-id="${id}"]`).addClass('selected');
        
        updatePropertiesPanel();
    }
    
    // ============================================
    // LAYER MANAGEMENT
    // ============================================
    function updateLayersList() {
        if (elements.length === 0) {
            $layersList.html('<p class="text-sm text-gray-500 text-center py-4">No layers yet</p>');
            updateTimelineTracks();
            return;
        }
        
        $layersList.empty();
        
        // Sort by zIndex (highest first)
        const sortedElements = [...elements].sort((a, b) => b.zIndex - a.zIndex);
        
        sortedElements.forEach((element, index) => {
            let icon, label;
            
            if (element.type === 'text') {
                icon = 'fa-font';
                label = element.text.substring(0, 20);
            } else if (element.type === 'clickthrough') {
                icon = 'fa-mouse-pointer';
                // Count clickthrough elements to generate click1, click2, etc.
                const clickthroughElements = elements.filter(el => el.type === 'clickthrough');
                const clickIndex = clickthroughElements.findIndex(el => el.id === element.id) + 1;
                label = `Click${clickIndex}`;
            } else if (element.type === 'shape') {
                icon = 'fa-shapes';
                // Count shape elements to generate shape1, shape2, etc.
                const shapeElements = elements.filter(el => el.type === 'shape');
                const shapeIndex = shapeElements.findIndex(el => el.id === element.id) + 1;
                label = `Shape${shapeIndex}`;
            } else {
                icon = 'fa-image';
                label = (element.filename || 'Image').substring(0, 20);
            }
            
            const $layer = $(`
                <div class="layer-item p-2 rounded border border-gray-700 flex items-center justify-between" 
                     data-id="${element.id}" 
                     draggable="true" 
                     data-index="${index}">
                    <div class="flex items-center flex-1">
                        <i class="fas fa-grip-vertical text-gray-600 mr-2 cursor-move"></i>
                        <i class="fas ${icon} text-blue-400 mr-2"></i>
                        <span class="text-sm">${label}</span>
                    </div>
                    <div class="flex items-center space-x-1">
                        <button class="toggle-layer-visibility text-gray-400 hover:text-white px-2 py-1" data-id="${element.id}" title="Toggle Visibility">
                            <i class="fas ${element.visible === false ? 'fa-eye-slash' : 'fa-eye'} text-xs"></i>
                        </button>
                        <button class="add-layer-anim text-blue-400 hover:text-blue-300 px-2 py-1" data-id="${element.id}" title="Add Animation">
                            <i class="fas fa-plus-circle text-xs"></i>
                        </button>
                        <button class="delete-layer text-red-400 hover:text-red-300 px-2 py-1" data-id="${element.id}">
                            <i class="fas fa-trash text-xs"></i>
                        </button>
                    </div>
                </div>
            `);
            
            // Add drag and drop events
            $layer.on('dragstart', window.handleDragStart);
            $layer.on('dragover', window.handleDragOverLayer);
            $layer.on('drop', window.handleLayerDrop);
            $layer.on('dragend', window.handleDragEnd);
            
            $layersList.append($layer);
        });
        
        updateTimelineTracks();
    }
    
    function handleLayerClick(e) {
        if ($(e.target).closest('button').length) return;
        const id = $(e.currentTarget).data('id');
        selectElement(id);
    }
    
    function handleDeleteLayer(e) {
        e.stopPropagation();
        const id = $(e.currentTarget).data('id');
        
        elements = elements.filter(el => el.id !== id);
        $(`#${id}`).remove();
        
        if (selectedElement === id) {
            selectedElement = null;
            $propertiesPanel.addClass('hidden');
        }
        
        updateLayersList();
        rebuildTimeline();
    }
    
    function handleAddLayerAnimation(e) {
        e.stopPropagation();
        const id = $(e.currentTarget).data('id');
        selectElement(id);
        openAnimationModal();
    }
    
    function toggleLayerVisibility(e) {
        e.stopPropagation();
        const id = $(e.currentTarget).data('id');
        const element = elements.find(el => el.id === id);
        if (!element) return;
        
        // Toggle visibility
        element.visible = element.visible === false ? true : false;
        
        // Update DOM
        const $el = $(`#${element.id}`);
        if (element.visible === false) {
            $el.css('visibility', 'hidden');
        } else {
            $el.css('visibility', 'visible');
        }
        
        updateLayersList();
    }
    
    // ============================================
    // PROPERTIES PANEL
    // ============================================
    function updatePropertiesPanel() {
        if (!selectedElement) {
            $propertiesPanel.addClass('hidden');
            return;
        }
        
        const element = elements.find(el => el.id === selectedElement);
        if (!element) return;
        
        $propertiesPanel.removeClass('hidden');
        
        // Show/hide text properties
        if (element.type === 'text') {
            $textProps.removeClass('hidden');
            $('#propText').val(element.text);
            $('#propFontFamily').val(element.fontFamily);
            $('#propFontSize').val(element.fontSize);
            $('#propColor').val(element.color);
            
            $('#propBold').toggleClass('active', element.bold);
            $('#propItalic').toggleClass('active', element.italic);
            $('#propUnderline').toggleClass('active', element.underline);
            
            $('.text-align-btn').removeClass('active');
            $(`.text-align-btn[data-align="${element.textAlign}"]`).addClass('active');
        } else {
            $textProps.addClass('hidden');
        }
        
        // Show/hide clickthrough properties
        const $clickthroughProps = $('#clickthroughProps');
        if (element.type === 'clickthrough') {
            $clickthroughProps.removeClass('hidden');
            $('#propClickUrl').val(element.url);
            $('#propClickTarget').val(element.target);
        } else {
            $clickthroughProps.addClass('hidden');
        }
        
        // Show/hide shape properties
        const $shapeProps = $('#shapeProps');
        if (element.type === 'shape') {
            $shapeProps.removeClass('hidden');
            $('#propShapeType').val(element.shapeType);
            $('#propShapeColor').val(element.fillColor);
        } else {
            $shapeProps.addClass('hidden');
        }
        
        // Common properties
        $('#propWidth').val(Math.round(element.width));
        $('#propHeight').val(Math.round(element.height));
        $('#propX').val(Math.round(element.x));
        $('#propY').val(Math.round(element.y));
        $('#propRotation').val(element.rotation);
        $('#propOpacity').val(element.opacity);
        $('#opacityValue').text(Math.round(element.opacity * 100) + '%');
    }
    
    // Common property updates
    function updateElementWidth() {
        if (!selectedElement) return;
        const element = elements.find(el => el.id === selectedElement);
        element.width = parseInt($(this).val()) || 100;
        $(`#${selectedElement}`).css('width', element.width + 'px');
    }
    
    function updateElementHeight() {
        if (!selectedElement) return;
        const element = elements.find(el => el.id === selectedElement);
        element.height = parseInt($(this).val()) || 100;
        $(`#${selectedElement}`).css('height', element.height + 'px');
    }
    
    function updateElementX() {
        if (!selectedElement) return;
        const element = elements.find(el => el.id === selectedElement);
        element.x = parseInt($(this).val()) || 0;
        $(`#${selectedElement}`).css('left', element.x + 'px');
    }
    
    function updateElementY() {
        if (!selectedElement) return;
        const element = elements.find(el => el.id === selectedElement);
        element.y = parseInt($(this).val()) || 0;
        $(`#${selectedElement}`).css('top', element.y + 'px');
    }
    
    function updateElementRotation() {
        if (!selectedElement) return;
        const element = elements.find(el => el.id === selectedElement);
        element.rotation = parseInt($(this).val()) || 0;
        $(`#${selectedElement}`).css('transform', `rotate(${element.rotation}deg)`);
    }
    
    function updateElementOpacity() {
        if (!selectedElement) return;
        const element = elements.find(el => el.id === selectedElement);
        element.opacity = parseFloat($(this).val());
        $(`#${selectedElement}`).css('opacity', element.opacity);
        $('#opacityValue').text(Math.round(element.opacity * 100) + '%');
    }
    
    // Text property updates
    function updateTextContent() {
        if (!selectedElement) return;
        const element = elements.find(el => el.id === selectedElement);
        if (element.type !== 'text') return;
        
        element.text = $(this).val();
        $(`#${selectedElement}`).text(element.text);
        updateLayersList();
    }
    
    function updateFontFamily() {
        if (!selectedElement) return;
        const element = elements.find(el => el.id === selectedElement);
        if (element.type !== 'text') return;
        
        element.fontFamily = $(this).val();
        $(`#${selectedElement}`).css('font-family', element.fontFamily);
    }
    
    function updateFontSize() {
        if (!selectedElement) return;
        const element = elements.find(el => el.id === selectedElement);
        if (element.type !== 'text') return;
        
        element.fontSize = parseInt($(this).val()) || 24;
        $(`#${selectedElement}`).css('font-size', element.fontSize + 'px');
    }
    
    function updateColor() {
        if (!selectedElement) return;
        const element = elements.find(el => el.id === selectedElement);
        if (element.type !== 'text') return;
        
        element.color = $(this).val();
        $(`#${selectedElement}`).css('color', element.color);
    }
    
    function toggleBold() {
        if (!selectedElement) return;
        const element = elements.find(el => el.id === selectedElement);
        if (element.type !== 'text') return;
        
        element.bold = !element.bold;
        $(this).toggleClass('active', element.bold);
        $(`#${selectedElement}`).css('font-weight', element.bold ? 'bold' : 'normal');
    }
    
    function toggleItalic() {
        if (!selectedElement) return;
        const element = elements.find(el => el.id === selectedElement);
        if (element.type !== 'text') return;
        
        element.italic = !element.italic;
        $(this).toggleClass('active', element.italic);
        $(`#${selectedElement}`).css('font-style', element.italic ? 'italic' : 'normal');
    }
    
    function toggleUnderline() {
        if (!selectedElement) return;
        const element = elements.find(el => el.id === selectedElement);
        if (element.type !== 'text') return;
        
        element.underline = !element.underline;
        $(this).toggleClass('active', element.underline);
        $(`#${selectedElement}`).css('text-decoration', element.underline ? 'underline' : 'none');
    }
    
    function updateTextAlign(e) {
        if (!selectedElement) return;
        const element = elements.find(el => el.id === selectedElement);
        if (element.type !== 'text') return;
        
        const align = $(e.currentTarget).data('align');
        element.textAlign = align;
        
        $('.text-align-btn').removeClass('active');
        $(e.currentTarget).addClass('active');
        
        // Update text-align only (no flexbox)
        const $el = $(`#${selectedElement}`);
        $el.css('text-align', align);
    }
    
    
    // Clickthrough property updates
    function updateClickUrl() {
        if (!selectedElement) return;
        const element = elements.find(el => el.id === selectedElement);
        if (element.type !== 'clickthrough') return;
        
        element.url = $(this).val() || 'https://kult.my';
        updateClickthroughDisplay(element);
    }
    
    function updateClickTarget() {
        if (!selectedElement) return;
        const element = elements.find(el => el.id === selectedElement);
        if (element.type !== 'clickthrough') return;
        
        element.target = $(this).val() || '_blank';
    }
    
    function updateClickthroughDisplay(element) {
        const $element = $(`#${element.id}`);
        $element.find('div').last().html(`
            <i class="fas fa-mouse-pointer text-2xl mb-2"></i>
            <div class="text-xs">Clickthrough</div>
            <div class="text-xs font-bold">${element.url}</div>
        `);
    }
    
    // Shape property updates
    function updateShapeType() {
        if (!selectedElement) return;
        const element = elements.find(el => el.id === selectedElement);
        if (element.type !== 'shape') return;
        
        element.shapeType = $(this).val();
        const $el = $(`#${selectedElement}`);
        
        if (element.shapeType === 'circle') {
            $el.css('border-radius', '50%');
        } else if (element.shapeType === 'rounded-rectangle') {
            $el.css('border-radius', '12px');
        } else {
            $el.css('border-radius', '0');
        }
    }
    
    function updateShapeColor() {
        if (!selectedElement) return;
        const element = elements.find(el => el.id === selectedElement);
        if (element.type !== 'shape') return;
        
        element.fillColor = $(this).val();
        $(`#${selectedElement}`).css('background-color', element.fillColor);
    }
    
    // ============================================
    // ANIMATION & TIMELINE
    // ============================================
    function openAnimationModal() {
        if (!selectedElement) {
            alert('Please select an element first');
            return;
        }
        
        // Reset for new animation
        editingAnimation = null;
        $('#animBtnText').text('Add Animation');
        $('#deleteAnimBtn').addClass('hidden');
        $('#animStart').val(0);
        $('#animDuration').val(1);
        
        // Uncheck all checkboxes
        $('.anim-checkbox').prop('checked', false);
        
        $animModal.removeClass('hidden');
    }
    
    function closeAnimationModal() {
        $animModal.addClass('hidden');
        editingAnimation = null;
    }
    
    function toggleCustomAnimProps() {
        // Not needed anymore with checkbox interface
    }
    
    function editAnimation(e) {
        // Don't open modal if we just finished dragging/resizing
        if (isTimelineBlockDragging || isTimelineBlockResizing) return;
        
        const animId = $(e.currentTarget).data('anim-id');
        const elementId = $(e.currentTarget).data('element-id');
        
        const element = elements.find(el => el.id === elementId);
        if (!element) return;
        
        const anim = element.animations.find(a => a.id === animId);
        if (!anim) return;
        
        // Populate modal with animation data
        editingAnimation = { elementId, animId };
        selectElement(elementId);
        
        // Uncheck all first
        $('.anim-checkbox').prop('checked', false);
        
        // Check the animation types
        const types = anim.types || [anim.type];
        types.forEach(type => {
            $(`.anim-checkbox[value="${type}"]`).prop('checked', true);
        });
        
        $('#animStart').val(anim.start);
        $('#animDuration').val(anim.duration);
        $('#animEase').val(anim.ease);
        $('#timelineDuration').val(totalDuration);
        
        $('#animBtnText').text('Update Animation');
        $('#deleteAnimBtn').removeClass('hidden');
        
        $animModal.removeClass('hidden');
    }
    
    function saveAnimation() {
        if (!selectedElement) return;
        
        const element = elements.find(el => el.id === selectedElement);
        
        // Get all selected animation types
        const selectedTypes = [];
        $('.anim-checkbox:checked').each(function() {
            selectedTypes.push($(this).val());
        });
        
        if (selectedTypes.length === 0) {
            alert('Please select at least one animation effect');
            return;
        }
        
        const start = Math.round(parseFloat($('#animStart').val()) * 10) / 10;
        const duration = Math.round(parseFloat($('#animDuration').val()) * 10) / 10;
        const ease = $('#animEase').val();
        
        // Update total duration if needed
        const newTotalDuration = Math.round(parseFloat($('#timelineDuration').val()) * 10) / 10;
        if (newTotalDuration !== totalDuration) {
            totalDuration = newTotalDuration;
            updateTimelineRuler();
        }
        
        if (editingAnimation) {
            // Update existing animation - only one type allowed when editing
            const anim = element.animations.find(a => a.id === editingAnimation.animId);
            if (anim && selectedTypes.length > 0) {
                anim.type = selectedTypes[0];
                anim.start = start;
                anim.duration = duration;
                anim.ease = ease;
                anim.types = selectedTypes; // Store all types for multi-animation
            }
        } else {
            // Add new animations - create one timeline item with multiple types
            const animationId = `anim_${Date.now()}`;
            const animation = {
                id: animationId,
                type: selectedTypes[0], // Primary type for compatibility
                types: selectedTypes, // All selected types
                start,
                duration,
                ease,
                customProps: {}
            };
            
            element.animations.push(animation);
        }
        
        rebuildTimeline();
        updateTimelineTracks();
        closeAnimationModal();
    }
    
    function deleteEditingAnimation() {
        if (!editingAnimation) return;
        
        const element = elements.find(el => el.id === editingAnimation.elementId);
        if (element) {
            element.animations = element.animations.filter(a => a.id !== editingAnimation.animId);
            rebuildTimeline();
            updateTimelineTracks();
        }
        
        closeAnimationModal();
    }
    
    function handleDeleteAnimation(e) {
        const animId = $(e.currentTarget).data('anim-id');
        const elementId = $(e.currentTarget).data('element-id');
        
        const element = elements.find(el => el.id === elementId);
        if (element) {
            element.animations = element.animations.filter(a => a.id !== animId);
            rebuildTimeline();
            updateTimelineTracks();
        }
    }
    
    function updateTotalDuration() {
        totalDuration = parseFloat($('#timelineDuration').val()) || 5;
        updateTimelineRuler();
        updateTimelineTracks();
    }
    
    function updateAnimLoop() {
        const value = $('#animLoop').val();
        animLoop = value === 'infinite' ? -1 : parseInt(value);
    }
    
    function zoomIn() {
        // Zoom in = decrease duration to see more detail
        totalDuration = Math.max(totalDuration - 2, 2);
        $('#timelineDuration').val(totalDuration);
        updateTimelineRuler();
        updateTimelineTracks();
    }
    
    function zoomOut() {
        // Zoom out = increase duration to see more time
        totalDuration = Math.min(totalDuration + 2, 60);
        $('#timelineDuration').val(totalDuration);
        updateTimelineRuler();
        updateTimelineTracks();
    }
    
    function updateTimelineRuler() {
        $timelineRuler.empty();
        
        const steps = Math.ceil(totalDuration);
        const stepWidth = 100 / steps;
        
        for (let i = 0; i <= steps; i++) {
            const left = (i / steps) * 100;
            $timelineRuler.append(`
                <div class="timeline-time-marker" style="left: ${left}%" data-time="${i}">
                    <div class="timeline-time-label" data-time="${i}">${i}s</div>
                </div>
            `);
        }
        
        // Add click handler for time markers
        $('.timeline-time-label, .timeline-time-marker').off('click').on('click', function(e) {
            e.stopPropagation();
            const time = parseFloat($(this).data('time'));
            const percent = (time / totalDuration) * 100;
            
            $('#timelinePlayhead').css('left', percent + '%');
            
            if (!isPlaying && timeline) {
                timeline.seek(time);
            }
        });
    }
    
    function updateTimelineTracks() {
        if (elements.length === 0) {
            $timelineTracks.html('<div class="text-center text-gray-500 text-sm py-8">Add elements and animations to see timeline</div>');
            return;
        }
        
        $timelineTracks.empty();
        
        // Sort by zIndex (highest first, so top visual layers appear at top of timeline)
        const sortedElements = [...elements].sort((a, b) => b.zIndex - a.zIndex);
        
        sortedElements.forEach(element => {
            let icon, label;
            
            if (element.type === 'text') {
                icon = 'fa-font';
                label = element.text.substring(0, 15);
            } else if (element.type === 'clickthrough') {
                icon = 'fa-mouse-pointer';
                // Count clickthrough elements to generate click1, click2, etc.
                const clickthroughElements = elements.filter(el => el.type === 'clickthrough');
                const clickIndex = clickthroughElements.findIndex(el => el.id === element.id) + 1;
                label = `Click${clickIndex}`;
            } else if (element.type === 'shape') {
                icon = 'fa-shapes';
                // Count shape elements to generate shape1, shape2, etc.
                const shapeElements = elements.filter(el => el.type === 'shape');
                const shapeIndex = shapeElements.findIndex(el => el.id === element.id) + 1;
                label = `Shape${shapeIndex}`;
            } else {
                icon = 'fa-image';
                label = (element.filename || 'Image').substring(0, 15);
            }
            
            const $track = $(`
                <div class="timeline-track" data-element-id="${element.id}">
                    <div class="timeline-track-label">
                        <div class="flex items-center flex-1">
                            <i class="fas fa-grip-vertical text-gray-600 mr-2"></i>
                            <i class="fas ${icon} text-blue-400 mr-2"></i>
                            <span class="truncate flex-1">${label}</span>
                        </div>
                        <div class="flex items-center gap-1 ml-2">
                            <button class="timeline-layer-btn toggle-visibility" data-id="${element.id}" title="Toggle visibility">
                                <i class="fas ${element.hidden ? 'fa-eye-slash' : 'fa-eye'}"></i>
                            </button>
                            <button class="timeline-layer-btn add-layer-anim" data-id="${element.id}" title="Add animation">
                                <i class="fas fa-plus"></i>
                            </button>
                            <button class="timeline-layer-btn delete-layer" data-id="${element.id}" title="Delete layer">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                    <div class="timeline-track-content" id="track_${element.id}">
                    </div>
                </div>
            `);
            
            $timelineTracks.append($track);
            
            // Add animation blocks
            element.animations.forEach(anim => {
                const leftPercent = (anim.start / totalDuration) * 100;
                const widthPercent = (anim.duration / totalDuration) * 100;
                
                // Get label showing multiple types
                const types = anim.types || [anim.type];
                const label = types.length > 1 ? `${types.length} effects` : types[0];
                
                const $block = $(`
                    <div class="timeline-block" style="left: ${leftPercent}%; width: ${widthPercent}%;" 
                         data-anim-id="${anim.id}" data-element-id="${element.id}">
                        <div class="timeline-block-resize-handle left"></div>
                        <div class="timeline-block-label">${label}</div>
                        <button class="delete-anim" data-anim-id="${anim.id}" data-element-id="${element.id}">
                            <i class="fas fa-times"></i>
                        </button>
                        <div class="timeline-block-resize-handle right"></div>
                    </div>
                `);
                
                $(`#track_${element.id}`).append($block);
            });
        });
        
        // Initialize jQuery UI sortable for timeline tracks
        $timelineTracks.sortable({
            handle: '.timeline-track-label',
            axis: 'y',
            cursor: 'move',
            tolerance: 'pointer',
            update: function(event, ui) {
                // Get new order of elements based on DOM order
                const newOrder = [];
                $timelineTracks.find('.timeline-track').each(function() {
                    const elementId = $(this).data('element-id');
                    const element = elements.find(el => el.id === elementId);
                    if (element) {
                        newOrder.push(element);
                    }
                });
                
                // Update zIndex based on new order (reverse because top = highest zIndex)
                newOrder.reverse().forEach((element, index) => {
                    element.zIndex = index;
                    $(`#${element.id}`).css('z-index', index);
                });
                
                // Update layers list and rebuild timeline
                updateLayersList();
            }
        });
    }
    
    function rebuildTimeline() {
        timeline.clear();
        timeline.repeat(0); // Reset repeat, will be set in playTimeline
        
        elements.forEach(element => {
            element.animations.forEach(anim => {
                const types = anim.types || [anim.type]; // Support multi-animation
                
                // Merge props from all selected animation types
                let mergedProps = {};
                let startAt = null;
                
                types.forEach(type => {
                    const props = getAnimationProps(type, element, anim.customProps);
                    
                    if (props.startAt) {
                        startAt = startAt || {};
                        Object.assign(startAt, props.startAt);
                        delete props.startAt;
                    }
                    
                    Object.assign(mergedProps, props);
                });
                
                // Apply startAt if any
                if (startAt) {
                    gsap.set(`#${element.id}`, startAt);
                }
                
                // Add merged animation to timeline
                timeline.to(`#${element.id}`, {
                    ...mergedProps,
                    duration: anim.duration,
                    ease: anim.ease
                }, anim.start);
            });
        });
        
        timeline.eventCallback('onUpdate', updatePlayhead);
    }
    
    function getAnimationProps(type, element, customProps = {}) {
        if (type === 'custom') {
            return customProps;
        }
        
        const props = {};
        
        switch(type) {
            case 'fadeIn':
                props.startAt = { opacity: 0 };
                props.opacity = element.opacity;
                break;
            case 'fadeOut':
                props.opacity = 0;
                break;
            case 'slideLeft':
                props.startAt = { x: -canvasWidth };
                props.x = 0;
                break;
            case 'slideRight':
                props.startAt = { x: canvasWidth };
                props.x = 0;
                break;
            case 'slideUp':
                props.startAt = { y: -canvasHeight };
                props.y = 0;
                break;
            case 'slideDown':
                props.startAt = { y: canvasHeight };
                props.y = 0;
                break;
            case 'scale':
            case 'scaleIn':
                props.startAt = { scale: 0 };
                props.scale = 1;
                break;
            case 'scaleOut':
                props.startAt = { scale: 1 };
                props.scale = 2;
                break;
            case 'scaleFrom':
                const scaleFrom = customProps.scaleFrom !== undefined ? customProps.scaleFrom : 0;
                props.startAt = { scale: scaleFrom };
                props.scale = 1;
                break;
            case 'rotate':
                props.rotation = '+=360';
                break;
            case 'rotateFrom':
                const rotateFrom = customProps.rotateFrom !== undefined ? customProps.rotateFrom : 0;
                props.startAt = { rotation: rotateFrom };
                props.rotation = element.rotation;
                break;
            case 'bounce':
                props.y = '+=50';
                props.repeat = 3;
                props.yoyo = true;
                break;
        }
        
        return props;
    }
    
    function playTimeline() {
        if (elements.length === 0 || !elements.some(el => el.animations.length > 0)) {
            alert('Please add some animations first');
            return;
        }
        
        rebuildTimeline();
        isPlaying = true;
        
        // Calculate actual playback time based on loop setting
        // animLoop values: -1 = infinite, 0 = once, 1 = twice, 2 = 3 times, etc.
        let playbackTime;
        if (animLoop === -1) {
            // Infinite loop - play for 3 iterations then stop preview
            playbackTime = totalDuration * 3 * 1000;
            timeline.repeat(2); // repeat 2 times = play 3 times total
        } else {
            // Play (animLoop + 1) times
            // animLoop=0 -> repeat(0) -> play 1 time
            // animLoop=1 -> repeat(1) -> play 2 times
            // animLoop=2 -> repeat(2) -> play 3 times
            playbackTime = totalDuration * (animLoop + 1) * 1000;
            timeline.repeat(animLoop);
        }
        
        // Don't set timeline.duration() - it stretches all animations
        // Let GSAP use the natural duration based on individual animation timings
        timeline.play(0);
        
        setTimeout(() => {
            if (animLoop !== -1) {
                isPlaying = false;
                $('#timelinePlayhead').css('left', '0');
                stopTimeline();
            }
        }, playbackTime);
    }
    
    function stopTimeline() {
        timeline.pause(0);
        isPlaying = false;
        $('#timelinePlayhead').css('left', '0');
        
        elements.forEach(element => {
            gsap.set(`#${element.id}`, { clearProps: 'all' });
            const style = {
                left: element.x + 'px',
                top: element.y + 'px',
                width: element.width + 'px',
                height: element.height + 'px',
                opacity: element.opacity,
                transform: `rotate(${element.rotation}deg)`,
                'z-index': element.zIndex
            };
            
            // Restore text-specific properties
            if (element.type === 'text') {
                style['font-size'] = element.fontSize + 'px';
                style['font-family'] = element.fontFamily;
                style['color'] = element.color;
                style['font-weight'] = element.bold ? 'bold' : 'normal';
                style['font-style'] = element.italic ? 'italic' : 'normal';
                style['text-decoration'] = element.underline ? 'underline' : 'none';
                style['text-align'] = element.textAlign;
            }
            
            // Restore shape-specific properties
            if (element.type === 'shape') {
                style['background-color'] = element.fillColor;
                if (element.shapeType === 'circle') {
                    style['border-radius'] = '50%';
                } else if (element.shapeType === 'rounded-rectangle') {
                    style['border-radius'] = '12px';
                }
            }
            
            $(`#${element.id}`).css(style);
        });
    }
    
    function updatePlayhead() {
        if (!isPlaying) return;
        const progress = timeline.progress();
        $('#timelinePlayhead').css('left', (progress * 100) + '%');
    }
    
    // ============================================
    // EXPORT
    // ============================================
    async function exportToZip() {
        if (elements.length === 0) {
            alert('Please add at least one element to export');
            return;
        }
        
        // Check if there's at least one clickthrough
        const hasClickthrough = elements.some(el => el.type === 'clickthrough');
        if (!hasClickthrough) {
            const proceed = confirm('Warning: No clickthrough layer added. The banner will not be clickable.\n\nDo you want to continue exporting?');
            if (!proceed) {
                return;
            }
        }
        
        // Get and validate banner name
        let bannerName = $('#bannerName').val();
        console.log('Raw banner name:', bannerName);
        
        if (bannerName) {
            bannerName = bannerName.trim();
        }
        
        if (!bannerName) {
            bannerName = 'ad-banner';
        }
        
        // Remove spaces and special characters, keep only alphanumeric, dash, underscore
        bannerName = bannerName.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9-_]/g, '');
        
        if (!bannerName) {
            bannerName = 'ad-banner';
        }
        
        console.log('Final banner name:', bannerName);
        
        // Get polite load option from checkbox
        const usePoliteLoad = $('#politeLoadCheckbox').is(':checked');
        
        const zip = new JSZip();
        const html = generateHTML(usePoliteLoad);
        zip.file('index.html', html);
        
        // Generate and add manifest.js
        const manifest = generateManifest();
        zip.file('manifest.js', manifest);
        
        // Add images to root folder (no subfolders)
        const imageElements = elements.filter(el => el.type === 'image');
        for (let i = 0; i < imageElements.length; i++) {
            const element = imageElements[i];
            try {
                const response = await fetch(element.src);
                const blob = await response.blob();
                // Place images in root folder (same level as index.html)
                zip.file(`image_${i}.${getExtensionFromDataUrl(element.src)}`, blob);
            } catch (error) {
                console.error('Error adding image to zip:', error);
            }
        }
        
        zip.generateAsync({ type: 'blob' }).then(function(content) {
            console.log('Saving as:', `${bannerName}.zip`);
            saveAs(content, `${bannerName}.zip`);
        });
    }
    
    function generateManifest() {
        // Count clickthrough elements
        const clickthroughCount = elements.filter(el => el.type === 'clickthrough').length;
        
        // Get canvas dimensions
        const width = canvasWidth;
        const height = canvasHeight;
        
        return `FT.manifest({
    "filename": "index.html",
    "width": ${width},
    "height": ${height},
    "clickTagCount": ${clickthroughCount},
    "hideBrowsers": ["ie8"]
});`;
    }
    
    function getExtensionFromDataUrl(dataUrl) {
        if (dataUrl.includes('image/png')) return 'png';
        if (dataUrl.includes('image/gif')) return 'gif';
        return 'jpg';
    }
    
    function generateHTML(usePoliteLoad = true) {
        let elementsHtml = '';
        let animationsJs = '';
        let clickthroughJs = '';
        
        const sortedElements = [...elements].sort((a, b) => a.zIndex - b.zIndex);
        let imageCounter = 0;
        
        sortedElements.forEach((element) => {
            if (element.type === 'image') {
                // Images in root folder (no subfolder)
                const imgSrc = `image_${imageCounter}.${getExtensionFromDataUrl(element.src)}`;
                elementsHtml += `
        <img id="${element.id}" src="${imgSrc}" style="
            position: absolute;
            left: ${element.x}px;
            top: ${element.y}px;
            width: ${element.width}px;
            height: ${element.height}px;
            opacity: ${element.opacity};
            transform: rotate(${element.rotation}deg);
            z-index: ${element.zIndex};
        ">`;
                imageCounter++;
            } else if (element.type === 'text') {
                elementsHtml += `
        <div id="${element.id}" style="
            position: absolute;
            left: ${element.x}px;
            top: ${element.y}px;
            width: ${element.width}px;
            height: ${element.height}px;
            opacity: ${element.opacity};
            transform: rotate(${element.rotation}deg);
            font-size: ${element.fontSize}px;
            font-family: ${element.fontFamily};
            color: ${element.color};
            font-weight: ${element.bold ? 'bold' : 'normal'};
            font-style: ${element.italic ? 'italic' : 'normal'};
            text-decoration: ${element.underline ? 'underline' : 'none'};
            text-align: ${element.textAlign};
            line-height: 1.2;
            word-wrap: break-word;
            z-index: ${element.zIndex};
        ">${element.text}</div>`;
            } else if (element.type === 'clickthrough') {
                // Use div with JavaScript click handler instead of <a> tag
                const clickIndex = elements.filter(el => el.type === 'clickthrough').findIndex(el => el.id === element.id) + 1;
                elementsHtml += `
        <div id="${element.id}" class="clickthrough-zone" data-url="${element.url}" data-target="${element.target}" data-click-index="${clickIndex}" style="
            position: absolute;
            left: ${element.x}px;
            top: ${element.y}px;
            width: ${element.width}px;
            height: ${element.height}px;
            opacity: 0;
            z-index: ${element.zIndex};
            cursor: pointer;
        "></div>`;
            } else if (element.type === 'shape') {
                let borderRadius = '0';
                if (element.shapeType === 'circle') {
                    borderRadius = '50%';
                } else if (element.shapeType === 'rounded-rectangle') {
                    borderRadius = '12px';
                } else if (element.borderRadius && element.borderRadius > 0) {
                    borderRadius = element.borderRadius + 'px';
                }
                
                elementsHtml += `
        <div id="${element.id}" style="
            position: absolute;
            left: ${element.x}px;
            top: ${element.y}px;
            width: ${element.width}px;
            height: ${element.height}px;
            opacity: ${element.opacity};
            transform: rotate(${element.rotation}deg);
            background-color: ${element.fillColor};
            border-radius: ${borderRadius};
            z-index: ${element.zIndex};
        "></div>`;
            }
            
            // Generate animations
            element.animations.forEach(anim => {
                const types = anim.types || [anim.type];
                
                // Merge props from all selected animation types
                let mergedProps = {};
                let startAt = null;
                
                types.forEach(type => {
                    const props = getAnimationPropsForExport(type, element, anim.customProps);
                    
                    if (props.startAt) {
                        startAt = startAt || {};
                        Object.assign(startAt, props.startAt);
                        delete props.startAt;
                    }
                    
                    Object.assign(mergedProps, props);
                });
                
                if (startAt) {
                    animationsJs += `
        gsap.set('#${element.id}', ${JSON.stringify(startAt)});`;
                }
                
                animationsJs += `
        tl.to('#${element.id}', {
            ${Object.entries(mergedProps).map(([key, value]) => `${key}: ${JSON.stringify(value)}`).join(',\n            ')},
            duration: ${anim.duration},
            ease: '${anim.ease}'
        }, ${anim.start});`;
            });
        });
        
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Ad Banner</title>
    <script src="https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/gsap.min.js"></script>
    <style>
        body {
            margin: 0;
            padding: 0;
            overflow: hidden;
        }
        #ad-container {
            position: relative;
            width: ${canvasWidth}px;
            height: ${canvasHeight}px;
            background: white;
            overflow: hidden;
            border: 1px solid #000;
            box-sizing: border-box;${usePoliteLoad ? `
            opacity: 0;
            visibility: hidden;` : ''}
        }${usePoliteLoad ? `
        #ad-container.loaded {
            opacity: 1;
            visibility: visible;
        }
        .loader {
            position: absolute;
            width: 15px;
            aspect-ratio: 1;
            border-radius: 50%;
            animation: l5 1s infinite linear alternate;
            left: calc(50% - 10px);
            top: calc(50% - 10px);
        }
        @keyframes l5 {
            0%  {box-shadow: 20px 0 #000, -20px 0 #0002;background: #000 }
            33% {box-shadow: 20px 0 #000, -20px 0 #0002;background: #0002}
            66% {box-shadow: 20px 0 #0002,-20px 0 #000; background: #0002}
            100%{box-shadow: 20px 0 #0002,-20px 0 #000; background: #000 }
        }
        .loader.hidden {
            display: none;
        }` : ''}
    </style>
</head>
<body>
    <!-- Flashtalking API as first child in body -->
    <script src="https://cdn.flashtalking.com/frameworks/js/api/2/10/html5API.js"></script>
    ${usePoliteLoad ? `
    <!-- Loader (shown while loading) -->
    <div class="loader"></div>
    ` : ''}
    <div id="ad-container">
        ${elementsHtml}
    </div>
    
    <script>${usePoliteLoad ? `
        // Polite load function - waits for page to be ready
        function politeLoad(callback) {
            if (document.readyState === 'complete') {
                callback();
            } else {
                window.addEventListener('load', callback);
            }
        }
        
        // Preload all images and show ad when ready
        function initAd() {
            const images = document.querySelectorAll('#ad-container img');
            const loader = document.querySelector('.loader');
            const adContainer = document.getElementById('ad-container');
            
            if (images.length === 0) {
                // No images, show ad immediately
                loader.classList.add('hidden');
                adContainer.classList.add('loaded');
                startAnimation();
                return;
            }
            
            let loadedCount = 0;
            const totalImages = images.length;
            
            function imageLoaded() {
                loadedCount++;
                if (loadedCount === totalImages) {
                    // All images loaded, hide loader and show ad
                    loader.classList.add('hidden');
                    adContainer.classList.add('loaded');
                    startAnimation();
                }
            }
            
            images.forEach(function(img) {
                if (img.complete) {
                    imageLoaded();
                } else {
                    img.addEventListener('load', imageLoaded);
                    img.addEventListener('error', imageLoaded); // Count errors as loaded
                }
            });
        }
        ` : ''}
        function startAnimation() {
            // Clickthrough handling with JavaScript (no <a> tags)
            const clickthroughZones = document.querySelectorAll('.clickthrough-zone');
            clickthroughZones.forEach(function(zone) {
                zone.addEventListener('click', function() {
                    const url = this.getAttribute('data-url');
                    const target = this.getAttribute('data-target');
                    const clickIndex = this.getAttribute('data-click-index');
                    
                    // Try Flashtalking API first, fallback to window.open
                    if (typeof myFT !== 'undefined' && myFT.clickTag) {
                        myFT.clickTag(clickIndex, url);
                    } else {
                        window.open(url, target);
                    }
                });
            });
            
            // GSAP Timeline Animation
            const tl = gsap.timeline({ repeat: ${animLoop} });
            ${animationsJs}
        }
        ${usePoliteLoad ? `
        // Use polite load to ensure page is fully loaded before initializing
        politeLoad(initAd);` : `
        // Start animation immediately (no polite load)
        startAnimation();`}
    </script>
</body>
</html>`;
    }
    
    function getAnimationPropsForExport(type, element, customProps = {}) {
        if (type === 'custom') {
            return customProps;
        }
        
        const props = {};
        
        switch(type) {
            case 'fadeIn':
                props.startAt = { opacity: 0 };
                props.opacity = element.opacity;
                break;
            case 'fadeOut':
                props.opacity = 0;
                break;
            case 'slideLeft':
                props.startAt = { x: -canvasWidth };
                props.x = 0;
                break;
            case 'slideRight':
                props.startAt = { x: canvasWidth };
                props.x = 0;
                break;
            case 'slideUp':
                props.startAt = { y: -canvasHeight };
                props.y = 0;
                break;
            case 'slideDown':
                props.startAt = { y: canvasHeight };
                props.y = 0;
                break;
            case 'scale':
            case 'scaleIn':
                props.startAt = { scale: 0 };
                props.scale = 1;
                break;
            case 'scaleOut':
                props.startAt = { scale: 1 };
                props.scale = 2;
                break;
            case 'scaleFrom':
                const scaleFrom = customProps.scaleFrom !== undefined ? customProps.scaleFrom : 0;
                props.startAt = { scale: scaleFrom };
                props.scale = 1;
                break;
            case 'rotate':
                props.rotation = '+=360';
                break;
            case 'rotateFrom':
                const rotateFrom = customProps.rotateFrom !== undefined ? customProps.rotateFrom : 0;
                props.startAt = { rotation: rotateFrom };
                props.rotation = element.rotation;
                break;
            case 'bounce':
                props.y = '+=50';
                props.repeat = 3;
                props.yoyo = true;
                break;
        }
        
        return props;
    }
    
    function clearAll() {
        if (elements.length === 0) return;
        
        if (confirm('Are you sure you want to clear all elements?')) {
            elements = [];
            selectedElement = null;
            $canvas.empty();
            $layersList.html('<p class="text-sm text-gray-500 text-center py-4">No layers yet</p>');
            $propertiesPanel.addClass('hidden');
            $timelineTracks.html('<div class="text-center text-gray-500 text-sm py-8">Add elements and animations to see timeline</div>');
            timeline.clear();
            stopTimeline();
        }
    }
    
    // ============================================
    // DRAG AND DROP HANDLERS FOR LAYER REORDERING
    // ============================================
    let draggedLayerId = null;
    
    function handleDragStart(e) {
        draggedLayerId = $(e.currentTarget).data('id');
        $(e.currentTarget).addClass('dragging');
        e.originalEvent.dataTransfer.effectAllowed = 'move';
    }
    
    function handleDragOverLayer(e) {
        e.preventDefault();
        e.originalEvent.dataTransfer.dropEffect = 'move';
        
        const $target = $(e.currentTarget);
        if (!$target.hasClass('dragging')) {
            $('.layer-item').removeClass('drag-over drag-over-top drag-over-bottom');
            
            // Determine if we're in the top or bottom half
            const rect = e.currentTarget.getBoundingClientRect();
            const midpoint = rect.top + rect.height / 2;
            
            if (e.clientY < midpoint) {
                $target.addClass('drag-over-top');
            } else {
                $target.addClass('drag-over-bottom');
            }
        }
    }
    
    function handleLayerDrop(e) {
        e.preventDefault();
        e.stopPropagation();
        
        const targetId = $(e.currentTarget).data('id');
        if (!draggedLayerId || draggedLayerId === targetId) {
            handleDragEnd(e);
            return;
        }
        
        const draggedEl = elements.find(el => el.id === draggedLayerId);
        const targetEl = elements.find(el => el.id === targetId);
        
        if (draggedEl && targetEl) {
            // Get positions before manipulation
            const draggedIndex = elements.indexOf(draggedEl);
            const targetIndex = elements.indexOf(targetEl);
            
            // Determine if dropping above or below target
            const rect = e.currentTarget.getBoundingClientRect();
            const mouseY = e.originalEvent.clientY;
            const targetMidY = rect.top + rect.height / 2;
            const dropBelow = mouseY > targetMidY;
            
            // Remove dragged element
            elements.splice(draggedIndex, 1);
            
            // Calculate new insertion index
            let newIndex = elements.indexOf(targetEl);
            if (dropBelow) {
                newIndex += 1;
            }
            
            // Insert at new position
            elements.splice(newIndex, 0, draggedEl);
            
            // Reassign z-indexes based on array order
            elements.forEach((el, idx) => {
                el.zIndex = idx;
                $(`#${el.id}`).css('z-index', el.zIndex);
            });
            
            updateLayersList();
            rebuildTimeline();
        }
        
        handleDragEnd(e);
    }
    
    function handleDragEnd(e) {
        $('.layer-item').removeClass('dragging drag-over');
        draggedLayerId = null;
    }
    
    // Make functions available globally for event handlers
    window.handleDragStart = handleDragStart;
    window.handleDragOverLayer = handleDragOverLayer;
    window.handleLayerDrop = handleLayerDrop;
    window.handleDragEnd = handleDragEnd;
    
    // ============================================
    // ZOOM CONTROLS
    // ============================================
    function updateStageZoom() {
        // Update the wrapper's transform scale
        $canvasWrapper.css({
            'transform': `scale(${stageZoom})`,
            'transform-origin': 'center center'
        });
        
        // Update zoom level display
        $('#stageZoomLevel').text(Math.round(stageZoom * 100) + '%');
    }
    
    function stageZoomIn() {
        if (stageZoom < 2.0) {
            // Round to nearest 0.25 to ensure exact 25% steps
            stageZoom = Math.round((stageZoom + 0.25) * 4) / 4;
            stageZoom = Math.min(2.0, stageZoom);
            updateStageZoom();
        }
    }
    
    function stageZoomOut() {
        if (stageZoom > 0.25) {
            // Round to nearest 0.25 to ensure exact 25% steps
            stageZoom = Math.round((stageZoom - 0.25) * 4) / 4;
            stageZoom = Math.max(0.25, stageZoom);
            updateStageZoom();
        }
    }
    
    function stageZoomReset() {
        // Get canvas container dimensions (available space for canvas)
        const containerWidth = $('#canvasContainer').width();
        const containerHeight = $('#canvasContainer').height();
        
        // Calculate zoom to fit canvas in container
        const zoomToFitWidth = containerWidth / canvasWidth;
        const zoomToFitHeight = containerHeight / canvasHeight;
        const zoomToFit = Math.min(zoomToFitWidth, zoomToFitHeight, 1.0);
        
        // For small banners (fits easily), use 100%
        // For tall/wide banners, fit to stage
        if (zoomToFit >= 1.0) {
            stageZoom = 1.0;
        } else {
            // Round to nearest 25% step
            stageZoom = Math.floor(zoomToFit * 4) / 4;
            // Ensure minimum 25%
            if (stageZoom < 0.25) stageZoom = 0.25;
        }
        
        updateStageZoom();
    }
    
})();
    
