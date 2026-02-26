// HTML5 Ad Builder - Full Featured Version
(function() {
    'use strict';
    
    // ============================================
    // STATE MANAGEMENT
    // ============================================
    let elements = [];
    let groups = [];
    let selectedElement = null;
    let dragOffset = { x: 0, y: 0 };
    let isDragging = false;
    let isResizing = false;
    let resizeHandle = null;
    let elementCounter = 0;
    let timeline = gsap.timeline({ paused: true });
    let totalDuration = 5;
    let isPlaying = false;
    let playbackTimeout = null; // Store timeout ID to clear on stop
    let zoomLevel = 1; // Now controls timeline duration scale
    let animLoop = 0; // Default: 0 = play once (GSAP repeat count)
    let editingAnimation = null; // For editing existing animations
    
    // Canvas dimensions
    let canvasWidth = 300;
    let canvasHeight = 250;
    let stageZoom = 1.0; // Stage zoom level (0.25 to 2.0)
    
    // Ensure stageZoom is initialized to exact 1.0
    stageZoom = Math.round(stageZoom * 4) / 4;
    
    // DOM elements - initialized after DOM is ready
    let $canvas, $canvasWrapper, $layersList, $dropzone, $fileInput;
    let $propertiesPanel, $textProps, $animModal, $textModal;
    let $clickthroughModal, $shapeModal, $videoModal, $timelineTracks, $timelineRuler;
    
    // ============================================
    // INITIALIZATION
    // ============================================
    $(document).ready(function() {
        // Initialize DOM element references
        $canvas = $('#canvas');
        $canvasWrapper = $('#canvasWrapper');
        $layersList = $('#layersList');
        $dropzone = $('#dropzone');
        $fileInput = $('#fileInput');
        $propertiesPanel = $('#propertiesPanel');
        $textProps = $('#textProps');
        $animModal = $('#animModal');
        $textModal = $('#textModal');
        $clickthroughModal = $('#clickthroughModal');
        $shapeModal = $('#shapeModal');
        $videoModal = $('#videoModal');
        $timelineTracks = $('#timelineTracks');
        $timelineRuler = $('#timelineRuler');
        
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
        // Escape key for text modal
        $('#textModal').on('keydown', function(e) {
            if (e.keyCode === 27) { // Escape
                e.preventDefault();
                closeTextModal();
            }
        });
        
        // Clickthrough
        $('#addClickthroughBtn').on('click', openClickthroughModal);
        $('#closeClickthroughModal').on('click', closeClickthroughModal);
        $('#saveClickthroughBtn').on('click', saveClickthrough);
        
        // Invisible Layer
        $('#addInvisibleBtn').on('click', addInvisibleLayer);
        
        // Enter key support for clickthrough
        $('#clickthroughUrl, #clickthroughTarget').on('keypress', function(e) {
            if (e.which === 13) { // Enter key
                e.preventDefault();
                saveClickthrough();
            }
        });
        // Escape key for clickthrough modal
        $('#clickthroughModal').on('keydown', function(e) {
            if (e.keyCode === 27) { // Escape
                e.preventDefault();
                closeClickthroughModal();
            }
        });
        
        // Shape
        $('#addShapeBtn').on('click', openShapeModal);
        $('#closeShapeModal').on('click', closeShapeModal);
        $('#saveShapeBtn').on('click', saveShape);
        $('#shapeOpacity').on('input', function() {
            const val = $(this).val();
            $('#shapeOpacityValue').text(Math.round(val * 100) + '%');
        });
        // Enter key support for shape
        $('#shapeType, #shapeWidth, #shapeHeight, #shapeFillColor, #shapeOpacity, #shapeBorderRadius').on('keypress', function(e) {
            if (e.which === 13) { // Enter key
                e.preventDefault();
                saveShape();
            }
        });
        // Escape key for shape modal
        $('#shapeModal').on('keydown', function(e) {
            if (e.keyCode === 27) { // Escape
                e.preventDefault();
                closeShapeModal();
            }
        });
        
        // Video
        $('#addVideoBtn').on('click', openVideoModal);
        $('#closeVideoModal').on('click', closeVideoModal);
        $('#saveVideoBtn').on('click', saveVideo);
        // Enter key support for video
        $('#videoUrl, #videoName').on('keypress', function(e) {
            if (e.which === 13) { // Enter key
                e.preventDefault();
                saveVideo();
            }
        });
        // Escape key for video modal
        $('#videoModal').on('keydown', function(e) {
            if (e.keyCode === 27) { // Escape
                e.preventDefault();
                closeVideoModal();
            }
        });
        
        // Video play trigger change handler (modal)
        $('#videoPlayTrigger').on('change', function() {
            const playTrigger = $(this).val();
            if (playTrigger === 'autoplay') {
                $('#videoMuted').prop('checked', true).prop('disabled', true);
            } else {
                $('#videoMuted').prop('disabled', false);
            }
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
        
        // Video properties
        $('#propVideoUrl').on('change', updateVideoUrl);
        $('#propVideoName').on('change', updateVideoName);
        $('#propVideoPlayTrigger').on('change', updateVideoPlayTrigger);
        $('#propVideoMuted').on('change', updateVideoMuted);
        $('#propVideoControls').on('change', updateVideoControls);
        
        // Video play trigger change handler (properties panel)
        $('#propVideoPlayTrigger').on('change', function() {
            const playTrigger = $(this).val();
            if (playTrigger === 'autoplay') {
                $('#propVideoMuted').prop('checked', true).prop('disabled', true);
            } else {
                $('#propVideoMuted').prop('disabled', false);
            }
        });
        
        // Text glow and shadow
        $('#propTextShadowX, #propTextShadowY, #propTextShadowBlur, #propTextShadowColor, #propTextShadowHover').on('change input', updateTextShadow);
        $('#propTextGlowX, #propTextGlowY, #propTextGlowBlur, #propTextGlowSpread, #propTextGlowColor, #propTextGlowHover').on('change input', updateTextGlow);
        
        // Shape glow and shadow
        $('#propShapeShadowX, #propShapeShadowY, #propShapeShadowBlur, #propShapeShadowSpread, #propShapeShadowColor, #propShapeShadowHover').on('change input', updateShapeShadow);
        $('#propShapeGlowX, #propShapeGlowY, #propShapeGlowBlur, #propShapeGlowSpread, #propShapeGlowColor, #propShapeGlowHover').on('change input', updateShapeGlow);
        
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
        // Escape key for animation modal
        $('#animModal').on('keydown', function(e) {
            if (e.keyCode === 27) { // Escape
                e.preventDefault();
                closeAnimationModal();
            } else if (e.keyCode === 13) { // Enter
                e.preventDefault();
                saveAnimation();
            }
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
        $('#timelineDuration').on('change', updateTimelineDuration);
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
                    anim.start = Math.round(((newLeftPercent / 100) * totalDuration) * 10) / 10;
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
                    
                    anim.start = Math.round(((newLeft / 100) * totalDuration) * 10) / 10;
                    anim.duration = Math.round(((newWidthPercent / 100) * totalDuration) * 10) / 10;
                }
            } else {
                // Resize from right - adjust duration only
                const currentWidthPx = initialWidth + deltaX;
                const maxWidth = trackWidth - parseFloat($block.position().left);
                const newWidthPx = Math.max(20, Math.min(currentWidthPx, maxWidth));
                const newWidthPercent = (newWidthPx / trackWidth) * 100;
                
                $block.css('width', newWidthPercent + '%');
                anim.duration = Math.round(((newWidthPercent / 100) * totalDuration) * 10) / 10;
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
            // Upload all dropped files
            Array.from(files).forEach(file => {
                uploadFile(file);
            });
        }
    }
    
    function handleFileSelect(e) {
        const files = e.target.files;
        if (files.length > 0) {
            // Upload all selected files
            Array.from(files).forEach(file => {
                uploadFile(file);
            });
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
            shadowX: 0,
            shadowY: 0,
            shadowBlur: 0,
            shadowColor: '#000000',
            shadowHover: false,
            glowX: 0,
            glowY: 0,
            glowBlur: 0,
            glowSpread: 0,
            glowColor: '#ffffff',
            glowHover: false,
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
        setTimeout(() => $('#clickthroughUrl').focus(), 100);
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
        $shapeModal.removeClass('hidden');
        setTimeout(() => $('#shapeWidth').focus(), 100);
    }
    
    function closeShapeModal() {
        $shapeModal.addClass('hidden');
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
            shadowX: 0,
            shadowY: 0,
            shadowBlur: 0,
            shadowSpread: 0,
            shadowColor: '#000000',
            shadowHover: false,
            glowX: 0,
            glowY: 0,
            glowBlur: 0,
            glowSpread: 0,
            glowColor: '#ffffff',
            glowHover: false,
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
    
    // ============================================
    // VIDEO MANAGEMENT
    // ============================================
    function openVideoModal() {
        $('#videoUrl').val('');
        $('#videoName').val('video1');
        $('#videoPlayTrigger').val('autoplay');
        $('#videoMuted').prop('checked', true).prop('disabled', true); // Autoplay requires muted
        $('#videoControls').prop('checked', false);
        $videoModal.removeClass('hidden');
        setTimeout(() => $('#videoUrl').focus(), 100);
    }
    
    function closeVideoModal() {
        $videoModal.addClass('hidden');
    }
    
    function saveVideo() {
        const videoUrl = $('#videoUrl').val().trim();
        const videoName = $('#videoName').val().trim() || 'video1';
        const playTrigger = $('#videoPlayTrigger').val();
        const muted = $('#videoMuted').is(':checked');
        const controls = $('#videoControls').is(':checked');
        
        if (!videoUrl) {
            alert('Please enter video URL');
            return;
        }
        
        addVideoToCanvas(videoUrl, videoName, playTrigger, muted, controls);
        closeVideoModal();
    }
    
    function addVideoToCanvas(videoUrl, videoName, playTrigger, muted, controls) {
        elementCounter++;
        const id = `element_${elementCounter}`;
        
        const element = {
            id: id,
            type: 'video',
            videoUrl: videoUrl,
            videoName: videoName,
            playTrigger: playTrigger, // 'autoplay', 'mouseover', or 'click'
            muted: muted,
            controls: controls,
            x: 0,
            y: 0,
            width: 300,
            height: 169, // 16:9 aspect ratio
            rotation: 0,
            opacity: 1,
            zIndex: elements.length,
            animations: []
        };
        
        elements.push(element);
        
        // Get play trigger display text
        let playText = '';
        if (playTrigger === 'autoplay') {
            playText = '▶ Autoplay';
        } else if (playTrigger === 'mouseover') {
            playText = '🖱 On Hover';
        } else if (playTrigger === 'click') {
            playText = '👆 On Click';
        }
        
        const $element = $(`
            <div class="canvas-element video-element" id="${id}" style="
                left: ${element.x}px;
                top: ${element.y}px;
                width: ${element.width}px;
                height: ${element.height}px;
                opacity: ${element.opacity};
                transform: rotate(${element.rotation}deg);
                z-index: ${element.zIndex};
                background-color: #000;
                display: flex;
                align-items: center;
                justify-content: center;
                color: #fff;
                font-size: 14px;
                border: 2px solid #e53e3e;
            ">
                <div style="text-align: center;">
                    <i class="fas fa-video" style="font-size: 32px; margin-bottom: 8px;"></i>
                    <div>${videoName}</div>
                    <div style="font-size: 11px; opacity: 0.7;">${videoUrl}</div>
                    <div style="font-size: 11px; margin-top: 4px;">
                        ${playText} ${muted ? '🔇 Muted' : '🔊 Sound'} ${controls ? '⚙ Controls' : ''}
                    </div>
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
    // INVISIBLE LAYER
    // ============================================
    function addInvisibleLayer() {
        elementCounter++;
        const id = `element_${elementCounter}`;
        
        const element = {
            id: id,
            type: 'invisible',
            x: 50,
            y: 50,
            width: 200,
            height: 150,
            rotation: 0,
            opacity: 1,
            zIndex: elements.length,
            animations: []
        };
        
        elements.push(element);
        
        const $element = $(`
            <div class="canvas-element invisible-element" id="${id}" style="
                left: ${element.x}px;
                top: ${element.y}px;
                width: ${element.width}px;
                height: ${element.height}px;
                opacity: 0.3;
                transform: rotate(${element.rotation}deg);
                z-index: ${element.zIndex};
                background: repeating-linear-gradient(
                    45deg,
                    rgba(200, 200, 200, 0.3),
                    rgba(200, 200, 200, 0.3) 10px,
                    rgba(150, 150, 150, 0.3) 10px,
                    rgba(150, 150, 150, 0.3) 20px
                );
                border: 2px dashed rgba(100, 100, 100, 0.5);
            ">
                <div style="text-align: center; color: rgba(100, 100, 100, 0.8); pointer-events: none; padding-top: 40%;">
                    <i class="fas fa-eye-slash text-2xl mb-2"></i>
                    <div class="text-xs">Invisible Layer</div>
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
        // Check if user is typing in an input field or textarea
        const isTyping = $(e.target).is('input, textarea, [contenteditable="true"]');
        
        // Escape key: close any open modal
        if (e.keyCode === 27) { // Escape
            if (!$textModal.hasClass('hidden')) {
                closeTextModal();
                return;
            }
            if (!$clickthroughModal.hasClass('hidden')) {
                closeClickthroughModal();
                return;
            }
            if (!$shapeModal.hasClass('hidden')) {
                closeShapeModal();
                return;
            }
            if (!$videoModal.hasClass('hidden')) {
                closeVideoModal();
                return;
            }
            if (!$animModal.hasClass('hidden')) {
                closeAnimationModal();
                return;
            }
        }
        
        if (!selectedElement) return;
        
        // Delete/Backspace keys: 8=backspace, 46=delete
        // Only delete element if NOT typing in an input field
        if ((e.keyCode === 8 || e.keyCode === 46) && !isTyping) {
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
        // Only move element if NOT typing in an input field
        const arrowKeys = [37, 38, 39, 40];
        if (!arrowKeys.includes(e.keyCode) || isTyping) return;
        
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
            } else if (element.type === 'video') {
                icon = 'fa-video';
                label = element.videoName;
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
            
            // Text shadow and glow
            $('#propTextShadowX').val(element.shadowX || 0);
            $('#propTextShadowY').val(element.shadowY || 0);
            $('#propTextShadowBlur').val(element.shadowBlur || 0);
            $('#propTextShadowColor').val(element.shadowColor || '#000000');
            $('#propTextShadowHover').prop('checked', element.shadowHover || false);
            
            $('#propTextGlowX').val(element.glowX || 0);
            $('#propTextGlowY').val(element.glowY || 0);
            $('#propTextGlowBlur').val(element.glowBlur || 0);
            $('#propTextGlowSpread').val(element.glowSpread || 0);
            $('#propTextGlowColor').val(element.glowColor || '#ffffff');
            $('#propTextGlowHover').prop('checked', element.glowHover || false);
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
            
            // Shape shadow and glow
            $('#propShapeShadowX').val(element.shadowX || 0);
            $('#propShapeShadowY').val(element.shadowY || 0);
            $('#propShapeShadowBlur').val(element.shadowBlur || 0);
            $('#propShapeShadowSpread').val(element.shadowSpread || 0);
            $('#propShapeShadowColor').val(element.shadowColor || '#000000');
            $('#propShapeShadowHover').prop('checked', element.shadowHover || false);
            
            $('#propShapeGlowX').val(element.glowX || 0);
            $('#propShapeGlowY').val(element.glowY || 0);
            $('#propShapeGlowBlur').val(element.glowBlur || 0);
            $('#propShapeGlowSpread').val(element.glowSpread || 0);
            $('#propShapeGlowColor').val(element.glowColor || '#ffffff');
            $('#propShapeGlowHover').prop('checked', element.glowHover || false);
        } else {
            $shapeProps.addClass('hidden');
        }
        
        // Show/hide video properties
        const $videoProps = $('#videoProps');
        if (element.type === 'video') {
            $videoProps.removeClass('hidden');
            $('#propVideoUrl').val(element.videoUrl);
            $('#propVideoName').val(element.videoName);
            $('#propVideoPlayTrigger').val(element.playTrigger || 'autoplay');
            $('#propVideoMuted').prop('checked', element.muted);
            $('#propVideoControls').prop('checked', element.controls);
            
            // Enable/disable muted based on play trigger
            if (element.playTrigger === 'autoplay') {
                $('#propVideoMuted').prop('disabled', true);
            } else {
                $('#propVideoMuted').prop('disabled', false);
            }
        } else {
            $videoProps.addClass('hidden');
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
    
    // Video property updates
    function updateVideoUrl() {
        if (!selectedElement) return;
        const element = elements.find(el => el.id === selectedElement);
        if (element.type !== 'video') return;
        
        element.videoUrl = $(this).val() || '';
        updateVideoDisplay(element);
    }
    
    function updateVideoName() {
        if (!selectedElement) return;
        const element = elements.find(el => el.id === selectedElement);
        if (element.type !== 'video') return;
        
        element.videoName = $(this).val() || 'video1';
        updateVideoDisplay(element);
    }
    
    function updateVideoPlayTrigger() {
        if (!selectedElement) return;
        const element = elements.find(el => el.id === selectedElement);
        if (element.type !== 'video') return;
        
        element.playTrigger = $(this).val();
        updateVideoDisplay(element);
    }
    
    function updateVideoMuted() {
        if (!selectedElement) return;
        const element = elements.find(el => el.id === selectedElement);
        if (element.type !== 'video') return;
        
        element.muted = $(this).is(':checked');
        updateVideoDisplay(element);
    }
    
    function updateVideoControls() {
        if (!selectedElement) return;
        const element = elements.find(el => el.id === selectedElement);
        if (element.type !== 'video') return;
        
        element.controls = $(this).is(':checked');
        updateVideoDisplay(element);
    }
    
    function updateVideoDisplay(element) {
        const playTriggerText = 
            element.playTrigger === 'autoplay' ? '▶ Autoplay' :
            element.playTrigger === 'mouseover' ? '🖱 On Hover' :
            '👆 On Click';
        
        const mutedIcon = element.muted ? '🔇' : '🔊';
        const controlsText = element.controls ? ' | 🎛 Controls' : '';
        
        const $element = $(`#${element.id}`);
        $element.find('div').last().html(`
            <i class="fas fa-video text-2xl mb-2"></i>
            <div class="text-xs font-bold">${element.videoName}</div>
            <div class="text-xs">${element.videoUrl}</div>
            <div class="text-xs mt-1">${playTriggerText} ${mutedIcon}${controlsText}</div>
        `);
    }
    
    // Text shadow and glow updates
    function updateTextShadow() {
        if (!selectedElement) return;
        const element = elements.find(el => el.id === selectedElement);
        if (element.type !== 'text') return;
        
        element.shadowX = parseInt($('#propTextShadowX').val()) || 0;
        element.shadowY = parseInt($('#propTextShadowY').val()) || 0;
        element.shadowBlur = parseInt($('#propTextShadowBlur').val()) || 0;
        element.shadowColor = $('#propTextShadowColor').val() || '#000000';
        element.shadowHover = $('#propTextShadowHover').is(':checked');
        
        applyTextStyles(element);
    }
    
    function updateTextGlow() {
        if (!selectedElement) return;
        const element = elements.find(el => el.id === selectedElement);
        if (element.type !== 'text') return;
        
        element.glowX = parseInt($('#propTextGlowX').val()) || 0;
        element.glowY = parseInt($('#propTextGlowY').val()) || 0;
        element.glowBlur = parseInt($('#propTextGlowBlur').val()) || 0;
        element.glowSpread = parseInt($('#propTextGlowSpread').val()) || 0;
        element.glowColor = $('#propTextGlowColor').val() || '#ffffff';
        element.glowHover = $('#propTextGlowHover').is(':checked');
        
        applyTextStyles(element);
    }
    
    function applyTextStyles(element) {
        const $el = $(`#${selectedElement}`);
        
        // Build text-shadow CSS (for always-on effects)
        let textShadow = '';
        
        // Add shadow if not hover-only or if both are not hover-only
        if (!element.shadowHover && (element.shadowX || element.shadowY || element.shadowBlur)) {
            textShadow = `${element.shadowX}px ${element.shadowY}px ${element.shadowBlur}px ${element.shadowColor}`;
        }
        
        // Add glow if not hover-only
        if (!element.glowHover && (element.glowX || element.glowY || element.glowBlur || element.glowSpread)) {
            // For text, we simulate spread by using multiple shadows with slight offsets
            let glowShadow = `${element.glowX}px ${element.glowY}px ${element.glowBlur}px ${element.glowColor}`;
            if (element.glowSpread > 0) {
                // Add additional glow layers for spread effect
                const spreadLayers = [];
                for (let i = 1; i <= element.glowSpread; i += 2) {
                    spreadLayers.push(`${element.glowX}px ${element.glowY}px ${element.glowBlur + i}px ${element.glowColor}`);
                }
                glowShadow = [glowShadow, ...spreadLayers].join(', ');
            }
            textShadow = textShadow ? `${textShadow}, ${glowShadow}` : glowShadow;
        }
        
        $el.css('text-shadow', textShadow || 'none');
        
        // Build hover styles if needed
        let hoverShadow = '';
        
        // Add shadow for hover
        if (element.shadowHover && (element.shadowX || element.shadowY || element.shadowBlur)) {
            hoverShadow = `${element.shadowX}px ${element.shadowY}px ${element.shadowBlur}px ${element.shadowColor}`;
        }
        
        // Add glow for hover
        if (element.glowHover && (element.glowX || element.glowY || element.glowBlur || element.glowSpread)) {
            let glowShadow = `${element.glowX}px ${element.glowY}px ${element.glowBlur}px ${element.glowColor}`;
            if (element.glowSpread > 0) {
                const spreadLayers = [];
                for (let i = 1; i <= element.glowSpread; i += 2) {
                    spreadLayers.push(`${element.glowX}px ${element.glowY}px ${element.glowBlur + i}px ${element.glowColor}`);
                }
                glowShadow = [glowShadow, ...spreadLayers].join(', ');
            }
            hoverShadow = hoverShadow ? `${hoverShadow}, ${glowShadow}` : glowShadow;
        }
        
        // Store hover effect on element data
        $el.data('hover-shadow', hoverShadow);
        $el.data('normal-shadow', textShadow || 'none');
        
        // Remove old hover handlers
        $el.off('mouseenter.shadow mouseleave.shadow');
        
        // Add hover handlers if needed
        if (element.shadowHover || element.glowHover) {
            $el.on('mouseenter.shadow', function() {
                $(this).css('text-shadow', hoverShadow);
            });
            $el.on('mouseleave.shadow', function() {
                $(this).css('text-shadow', textShadow || 'none');
            });
        }
    }
    
    // Shape shadow and glow updates
    function updateShapeShadow() {
        if (!selectedElement) return;
        const element = elements.find(el => el.id === selectedElement);
        if (element.type !== 'shape') return;
        
        element.shadowX = parseInt($('#propShapeShadowX').val()) || 0;
        element.shadowY = parseInt($('#propShapeShadowY').val()) || 0;
        element.shadowBlur = parseInt($('#propShapeShadowBlur').val()) || 0;
        element.shadowSpread = parseInt($('#propShapeShadowSpread').val()) || 0;
        element.shadowColor = $('#propShapeShadowColor').val() || '#000000';
        element.shadowHover = $('#propShapeShadowHover').is(':checked');
        
        applyShapeStyles(element);
    }
    
    function updateShapeGlow() {
        if (!selectedElement) return;
        const element = elements.find(el => el.id === selectedElement);
        if (element.type !== 'shape') return;
        
        element.glowX = parseInt($('#propShapeGlowX').val()) || 0;
        element.glowY = parseInt($('#propShapeGlowY').val()) || 0;
        element.glowBlur = parseInt($('#propShapeGlowBlur').val()) || 0;
        element.glowSpread = parseInt($('#propShapeGlowSpread').val()) || 0;
        element.glowColor = $('#propShapeGlowColor').val() || '#ffffff';
        element.glowHover = $('#propShapeGlowHover').is(':checked');
        
        applyShapeStyles(element);
    }
    
    function applyShapeStyles(element) {
        const $el = $(`#${selectedElement}`);
        
        // Build box-shadow CSS (for always-on effects)
        let boxShadow = '';
        
        // Add shadow if not hover-only
        if (!element.shadowHover && (element.shadowX || element.shadowY || element.shadowBlur || element.shadowSpread)) {
            boxShadow = `${element.shadowX}px ${element.shadowY}px ${element.shadowBlur}px ${element.shadowSpread}px ${element.shadowColor}`;
        }
        
        // Add glow if not hover-only
        if (!element.glowHover && (element.glowX || element.glowY || element.glowBlur || element.glowSpread)) {
            const glowShadow = `${element.glowX}px ${element.glowY}px ${element.glowBlur}px ${element.glowSpread}px ${element.glowColor}`;
            boxShadow = boxShadow ? `${boxShadow}, ${glowShadow}` : glowShadow;
        }
        
        $el.css('box-shadow', boxShadow || 'none');
        
        // Build hover styles if needed
        let hoverShadow = '';
        
        // Add shadow for hover
        if (element.shadowHover && (element.shadowX || element.shadowY || element.shadowBlur || element.shadowSpread)) {
            hoverShadow = `${element.shadowX}px ${element.shadowY}px ${element.shadowBlur}px ${element.shadowSpread}px ${element.shadowColor}`;
        }
        
        // Add glow for hover
        if (element.glowHover && (element.glowX || element.glowY || element.glowBlur || element.glowSpread)) {
            const glowShadow = `${element.glowX}px ${element.glowY}px ${element.glowBlur}px ${element.glowSpread}px ${element.glowColor}`;
            hoverShadow = hoverShadow ? `${hoverShadow}, ${glowShadow}` : glowShadow;
        }
        
        // Store hover effect on element data
        $el.data('hover-shadow', hoverShadow);
        $el.data('normal-shadow', boxShadow || 'none');
        
        // Remove old hover handlers
        $el.off('mouseenter.shadow mouseleave.shadow');
        
        // Add hover handlers if needed
        if (element.shadowHover || element.glowHover) {
            $el.on('mouseenter.shadow', function() {
                $(this).css('box-shadow', hoverShadow);
            });
            $el.on('mouseleave.shadow', function() {
                $(this).css('box-shadow', boxShadow || 'none');
            });
        }
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
        
        // Reset all dropdowns to "None"
        $('#animFade').val('');
        $('#animSlide').val('');
        $('#animZoom').val('');
        $('#animRotate').val('');
        
        $animModal.removeClass('hidden');
        setTimeout(() => $('#animStart').focus(), 100);
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
        
        // Reset all dropdowns first
        $('#animFade').val('');
        $('#animSlide').val('');
        $('#animZoom').val('');
        $('#animRotate').val('');
        
        // Set the dropdown values based on animation types
        const types = anim.types || [anim.type];
        types.forEach(type => {
            if (type === 'fadeIn' || type === 'fadeOut') {
                $('#animFade').val(type);
            } else if (type.startsWith('slide')) {
                $('#animSlide').val(type);
            } else if (type === 'scaleIn' || type === 'scaleOut') {
                $('#animZoom').val(type);
            } else if (type.startsWith('rotate')) {
                $('#animRotate').val(type);
            }
        });
        
        $('#animStart').val(anim.start.toFixed(1));
        $('#animDuration').val(anim.duration.toFixed(1));
        $('#animEase').val(anim.ease);
        
        $('#animBtnText').text('Update Animation');
        $('#deleteAnimBtn').removeClass('hidden');
        
        $animModal.removeClass('hidden');
    }
    
    function saveAnimation() {
        if (!selectedElement) return;
        
        const element = elements.find(el => el.id === selectedElement);
        
        // Get all selected animation types from dropdowns
        const selectedTypes = [];
        const fade = $('#animFade').val();
        const slide = $('#animSlide').val();
        const zoom = $('#animZoom').val();
        const rotate = $('#animRotate').val();
        
        if (fade) selectedTypes.push(fade);
        if (slide) selectedTypes.push(slide);
        if (zoom) selectedTypes.push(zoom);
        if (rotate) selectedTypes.push(rotate);
        
        if (selectedTypes.length === 0) {
            alert('Please select at least one animation effect');
            return;
        }
        
        const start = Math.round(parseFloat($('#animStart').val()) * 10) / 10;
        const duration = Math.round(parseFloat($('#animDuration').val()) * 10) / 10;
        const ease = $('#animEase').val();
        
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
    
    function updateTimelineDuration() {
        const newDuration = parseFloat($('#timelineDuration').val());
        if (newDuration && newDuration >= 1 && newDuration <= 30) {
            totalDuration = newDuration;
            updateTimelineRuler();
            updateTimelineTracks();
        }
    }
    
    function updateAnimLoop() {
        const value = parseInt($('#animLoop').val()) || 1;
        // User input: 1 = play once, 2 = twice, etc.
        // GSAP repeat: 0 = once, 1 = twice, etc.
        // So: animLoop = userInput - 1
        animLoop = Math.max(0, value - 1);
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
        totalDuration = Math.min(totalDuration + 2, 30);
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
            } else if (element.type === 'invisible') {
                icon = 'fa-eye-slash';
                // Count invisible elements to generate invisible1, invisible2, etc.
                const invisibleElements = elements.filter(el => el.type === 'invisible');
                const invisibleIndex = invisibleElements.findIndex(el => el.id === element.id) + 1;
                label = `Invisible${invisibleIndex}`;
            } else if (element.type === 'shape') {
                icon = 'fa-shapes';
                // Count shape elements to generate shape1, shape2, etc.
                const shapeElements = elements.filter(el => el.type === 'shape');
                const shapeIndex = shapeElements.findIndex(el => el.id === element.id) + 1;
                label = `Shape${shapeIndex}`;
            } else if (element.type === 'video') {
                icon = 'fa-video';
                label = element.videoName;
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
        
        // Initialize jQuery UI sortable for timeline tracks (only once)
        if (!$timelineTracks.hasClass('ui-sortable')) {
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
                    
                    // Update zIndex based on new order
                    // Timeline shows top = highest z-index, so first in newOrder should get highest z-index
                    const maxIndex = newOrder.length - 1;
                    newOrder.forEach((element, index) => {
                        element.zIndex = maxIndex - index; // First gets highest, last gets 0
                        $(`#${element.id}`).css('z-index', element.zIndex);
                    });
                    
                    console.log('Timeline reordered - New z-indexes:', newOrder.map(el => ({
                        id: el.id,
                        type: el.type,
                        filename: el.filename || el.text?.substring(0,20) || el.type,
                        zIndex: el.zIndex
                    })));
                    
                    // Update layers list and rebuild timeline
                    updateLayersList();
                }
            });
        }
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
        
        // Extend timeline to totalDuration by adding a dummy animation
        // This ensures the timeline plays for the full duration set by the user
        const actualDuration = timeline.duration();
        if (actualDuration < totalDuration) {
            // Add an invisible dummy animation to extend timeline
            timeline.to({}, { duration: totalDuration - actualDuration }, actualDuration);
        }
        
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
            case 'rotate360':
                props.rotation = '+=360';
                break;
            case 'rotate90':
                props.rotation = '+=90';
                break;
            case 'rotate180':
                props.rotation = '+=180';
                break;
            case 'rotate270':
                props.rotation = '+=270';
                break;
            case 'rotateFrom':
                const rotateFrom = customProps.rotateFrom !== undefined ? customProps.rotateFrom : 0;
                props.startAt = { rotation: rotateFrom };
                props.rotation = element.rotation;
                break;
        }
        
        return props;
    }
    
    function playTimeline() {
        if (elements.length === 0 || !elements.some(el => el.animations.length > 0)) {
            alert('Please add some animations first');
            return;
        }
        
        // Stop any existing playback first
        if (isPlaying) {
            stopTimeline();
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
        
        // Store timeout ID so we can clear it on stop
        playbackTimeout = setTimeout(() => {
            if (animLoop !== -1) {
                isPlaying = false;
                $('#timelinePlayhead').css('left', '0');
                stopTimeline();
            }
        }, playbackTime);
    }
    
    function stopTimeline() {
        // Clear any pending timeout
        if (playbackTimeout) {
            clearTimeout(playbackTimeout);
            playbackTimeout = null;
        }
        
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
        // Use totalDuration (ruler duration) for playhead position
        const currentTime = timeline.time();
        const progress = totalDuration > 0 ? currentTime / totalDuration : 0;
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
        
        // Add images to root folder in z-index order (matching HTML generation)
        const imageElements = elements
            .filter(el => el.type === 'image')
            .sort((a, b) => a.zIndex - b.zIndex); // Same sort as HTML generation
        
        for (let i = 0; i < imageElements.length; i++) {
            const element = imageElements[i];
            try {
                const response = await fetch(element.src);
                const blob = await response.blob();
                // Place images in root folder (same level as index.html)
                zip.file(`image_${i}.${getExtensionFromDataUrl(element.src)}`, blob);
                console.log(`Saved image_${i}.png - element: ${element.id}, zIndex: ${element.zIndex}`);
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
        
        // Get video elements
        const videoElements = elements.filter(el => el.type === 'video');
        
        // Get canvas dimensions
        const width = canvasWidth;
        const height = canvasHeight;
        
        let manifestContent = `FT.manifest({
    "filename": "index.html",
    "width": ${width},
    "height": ${height},
    "clickTagCount": ${clickthroughCount}`;
        
        // Add videos array if there are video elements
        if (videoElements.length > 0) {
            manifestContent += `,
    "videos": [`;
            videoElements.forEach((video, index) => {
                manifestContent += `
        { "name": "${video.videoName}", "ref": "${video.videoUrl}" }`;
                if (index < videoElements.length - 1) {
                    manifestContent += ',';
                }
            });
            manifestContent += `
    ]`;
        }
        
        manifestContent += `,
    "hideBrowsers": ["ie8"]
});`;
        
        return manifestContent;
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
        
        // Debug: Log element z-indexes before sorting
        console.log('Export - Elements before sort:', elements.map(el => ({
            id: el.id,
            type: el.type,
            filename: el.filename || el.text?.substring(0,20) || el.type,
            zIndex: el.zIndex
        })));
        
        // Sort by z-index ASCENDING (lowest z-index first in HTML)
        // Lower z-index = behind visually, so render first in HTML
        // Higher z-index = on top visually, so render last in HTML
        // This ensures HTML order is reversed from canvas visual order
        const sortedElements = [...elements].sort((a, b) => a.zIndex - b.zIndex);
        
        console.log('Export - Elements after sort:', sortedElements.map(el => ({
            id: el.id,
            type: el.type,
            filename: el.filename || el.text?.substring(0,20) || el.type,
            zIndex: el.zIndex
        })));
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
            user-select: none;
            cursor: pointer;
        ">`;
                imageCounter++;
            } else if (element.type === 'text') {
                // Build text-shadow CSS (always-on effects)
                let textShadow = '';
                if (!element.shadowHover && (element.shadowX || element.shadowY || element.shadowBlur)) {
                    textShadow = `${element.shadowX}px ${element.shadowY}px ${element.shadowBlur}px ${element.shadowColor}`;
                }
                if (!element.glowHover && (element.glowX || element.glowY || element.glowBlur || element.glowSpread)) {
                    let glowShadow = `${element.glowX}px ${element.glowY}px ${element.glowBlur}px ${element.glowColor}`;
                    if (element.glowSpread > 0) {
                        const spreadLayers = [];
                        for (let i = 1; i <= element.glowSpread; i += 2) {
                            spreadLayers.push(`${element.glowX}px ${element.glowY}px ${element.glowBlur + i}px ${element.glowColor}`);
                        }
                        glowShadow = [glowShadow, ...spreadLayers].join(', ');
                    }
                    textShadow = textShadow ? `${textShadow}, ${glowShadow}` : glowShadow;
                }
                const textShadowStyle = textShadow ? `text-shadow: ${textShadow};` : '';
                
                // Build hover text-shadow (if hover effects exist)
                let hoverShadow = '';
                if (element.shadowHover && (element.shadowX || element.shadowY || element.shadowBlur)) {
                    hoverShadow = `${element.shadowX}px ${element.shadowY}px ${element.shadowBlur}px ${element.shadowColor}`;
                }
                if (element.glowHover && (element.glowX || element.glowY || element.glowBlur || element.glowSpread)) {
                    let glowShadow = `${element.glowX}px ${element.glowY}px ${element.glowBlur}px ${element.glowColor}`;
                    if (element.glowSpread > 0) {
                        const spreadLayers = [];
                        for (let i = 1; i <= element.glowSpread; i += 2) {
                            spreadLayers.push(`${element.glowX}px ${element.glowY}px ${element.glowBlur + i}px ${element.glowColor}`);
                        }
                        glowShadow = [glowShadow, ...spreadLayers].join(', ');
                    }
                    hoverShadow = hoverShadow ? `${hoverShadow}, ${glowShadow}` : glowShadow;
                }
                const hoverClass = (element.shadowHover || element.glowHover) ? ` class="text-hover-${element.id}"` : '';
                
                elementsHtml += `
        <div id="${element.id}"${hoverClass} style="
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
            ${textShadowStyle}
            z-index: ${element.zIndex};
            user-select: none;
            cursor: pointer;
        ">${element.text}</div>`;
                
                // Add hover CSS if needed
                if (element.shadowHover || element.glowHover) {
                    clickthroughJs += `
            const text_${element.id.replace(/[^a-zA-Z0-9]/g, '_')} = document.getElementById('${element.id}');
            text_${element.id.replace(/[^a-zA-Z0-9]/g, '_')}.addEventListener('mouseenter', function() {
                this.style.textShadow = '${hoverShadow}';
            });
            text_${element.id.replace(/[^a-zA-Z0-9]/g, '_')}.addEventListener('mouseleave', function() {
                this.style.textShadow = '${textShadow}';
            });`;
                }
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
            } else if (element.type === 'invisible') {
                // Invisible layer - render as an empty div with opacity 0
                elementsHtml += `
        <div id="${element.id}" style="
            position: absolute;
            left: ${element.x}px;
            top: ${element.y}px;
            width: ${element.width}px;
            height: ${element.height}px;
            opacity: 0;
            transform: rotate(${element.rotation}deg);
            z-index: ${element.zIndex};
            user-select: none;
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
                
                // Build box-shadow CSS (always-on effects)
                let boxShadow = '';
                if (!element.shadowHover && (element.shadowX || element.shadowY || element.shadowBlur || element.shadowSpread)) {
                    boxShadow = `${element.shadowX}px ${element.shadowY}px ${element.shadowBlur}px ${element.shadowSpread}px ${element.shadowColor}`;
                }
                if (!element.glowHover && (element.glowX || element.glowY || element.glowBlur || element.glowSpread)) {
                    const glowShadow = `${element.glowX}px ${element.glowY}px ${element.glowBlur}px ${element.glowSpread}px ${element.glowColor}`;
                    boxShadow = boxShadow ? `${boxShadow}, ${glowShadow}` : glowShadow;
                }
                const boxShadowStyle = boxShadow ? `box-shadow: ${boxShadow};` : '';
                
                // Build hover box-shadow
                let hoverShadow = '';
                if (element.shadowHover && (element.shadowX || element.shadowY || element.shadowBlur || element.shadowSpread)) {
                    hoverShadow = `${element.shadowX}px ${element.shadowY}px ${element.shadowBlur}px ${element.shadowSpread}px ${element.shadowColor}`;
                }
                if (element.glowHover && (element.glowX || element.glowY || element.glowBlur || element.glowSpread)) {
                    const glowShadow = `${element.glowX}px ${element.glowY}px ${element.glowBlur}px ${element.glowSpread}px ${element.glowColor}`;
                    hoverShadow = hoverShadow ? `${hoverShadow}, ${glowShadow}` : glowShadow;
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
            ${boxShadowStyle}
            z-index: ${element.zIndex};
            user-select: none;
            cursor: pointer;
        "></div>`;
                
                // Add hover CSS if needed
                if (element.shadowHover || element.glowHover) {
                    clickthroughJs += `
            const shape_${element.id.replace(/[^a-zA-Z0-9]/g, '_')} = document.getElementById('${element.id}');
            shape_${element.id.replace(/[^a-zA-Z0-9]/g, '_')}.addEventListener('mouseenter', function() {
                this.style.boxShadow = '${hoverShadow}';
            });
            shape_${element.id.replace(/[^a-zA-Z0-9]/g, '_')}.addEventListener('mouseleave', function() {
                this.style.boxShadow = '${boxShadow}';
            });`;
                }
            } else if (element.type === 'video') {
                const autoplayAttr = element.playTrigger === 'autoplay' ? ' autoplay' : '';
                const mutedAttr = element.muted ? ' muted' : '';
                const controlsAttr = element.controls ? ' controls' : '';
                const playTrigger = element.playTrigger || 'autoplay';
                elementsHtml += `
        <ft-video id="${element.videoName}" name="${element.videoName}"${autoplayAttr}${mutedAttr}${controlsAttr} data-play-trigger="${playTrigger}" style="
            position: absolute;
            left: ${element.x}px;
            top: ${element.y}px;
            width: ${element.width}px;
            height: ${element.height}px;
            opacity: ${element.opacity};
            transform: rotate(${element.rotation}deg);
            z-index: ${element.zIndex};
        "></ft-video>`;
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
    <script src="https://cdn.flashtalking.com/feeds/frameworks/js/utils/Tracker.js"></script>
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
            
            // Video play trigger handling
            const videos = document.querySelectorAll('ft-video[data-play-trigger]');
            videos.forEach(function(video) {
                const playTrigger = video.getAttribute('data-play-trigger');
                
                if (playTrigger === 'mouseover') {
                    video.addEventListener('mouseenter', function() {
                        this.play();
                    });
                } else if (playTrigger === 'click') {
                    video.addEventListener('click', function() {
                        if (this.paused) {
                            this.play();
                        } else {
                            this.pause();
                        }
                    });
                }
                // autoplay is handled by the autoplay attribute
            });
            ${clickthroughJs}
            
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
            case 'rotate360':
                props.rotation = '+=360';
                break;
            case 'rotate90':
                props.rotation = '+=90';
                break;
            case 'rotate180':
                props.rotation = '+=180';
                break;
            case 'rotate270':
                props.rotation = '+=270';
                break;
            case 'rotateFrom':
                const rotateFrom = customProps.rotateFrom !== undefined ? customProps.rotateFrom : 0;
                props.startAt = { rotation: rotateFrom };
                props.rotation = element.rotation;
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
    
