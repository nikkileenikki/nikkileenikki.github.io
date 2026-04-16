// HTML5 Ad Builder - Full Featured Version
// ============================================
// PATCHED VERSION - Fixes applied:
//   FIX #2: Removed dead $('#addAnimBtn') event binding (element doesn't exist in HTML)
//   FIX #3: Removed dead $('#animType') event binding (element doesn't exist in HTML)
//   FIX #4: Replaced console.log with debug-guarded logging (window.AD_BUILDER_DEBUG)
//   FIX #6: Namespaced mousemove/mouseup handlers to prevent listener stacking
//   FIX #7: Added saveState() to addClickthroughToCanvas (was missing, broke undo)
//   FIX #10: Replaced O(n²) type-counter in getElementLabel with stored typeIndex
// ============================================
(function() {
    'use strict';
    
    // ============================================
    // STATE MANAGEMENT
    // ============================================
    let elements = [];
    let groups = [];
    let undoStack = [];
    let redoStack = [];
    const MAX_UNDO_STACK = 50;
    let selectedElement = null;
    let selectedFolder = null;
    let lastClickTime = 0;
    let lastClickedElement = null;
    let clickCount = 0;
    let dragOffset = { x: 0, y: 0 };
    let isDragging = false;
    let isResizing = false;
    let resizeHandle = null;
    let elementCounter = 0;
    let folderCounter = 0;

    // FIX #10: Per-type counters to avoid O(n²) findIndex in getElementLabel
    const typeCounters = { clickthrough: 0, shape: 0, invisible: 0, image: 0, video: 0, text: 0 };

    let timeline = gsap.timeline({ paused: true });
    let totalDuration = 5;
    let isPlaying = false;
    let playbackTimeout = null;
    let zoomLevel = 1;
    let animLoop = 0;
    let editingAnimation = null;
    
    // Canvas dimensions
    let canvasWidth = 300;
    let canvasHeight = 250;
    let stageZoom = 1.0;
    
    stageZoom = Math.round(stageZoom * 4) / 4;
    
    // DOM elements
    let $canvas, $canvasWrapper, $layersList, $dropzone, $fileInput;
    let $propertiesPanel, $textProps, $animModal, $textModal;
    let $clickthroughModal, $shapeModal, $videoModal, $timelineTracks, $timelineRuler;

    // FIX #4: Debug logging helper - set window.AD_BUILDER_DEBUG = true to enable
    function debugLog(...args) {
        if (window.AD_BUILDER_DEBUG) {
            console.log(...args);
        }
    }

    function debugError(...args) {
        if (window.AD_BUILDER_DEBUG) {
            console.error(...args);
        }
    }
    
    // ============================================
    // INITIALIZATION
    // ============================================
    $(document).ready(function() {
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
            if (e.which === 13) { e.preventDefault(); saveText(); }
        });
        $('#textModal').on('keydown', function(e) {
            if (e.keyCode === 27) { e.preventDefault(); closeTextModal(); }
        });
        
        // Clickthrough
        $('#addClickthroughBtn').on('click', openClickthroughModal);
        $('#closeClickthroughModal').on('click', closeClickthroughModal);
        $('#saveClickthroughBtn').on('click', saveClickthrough);
        
        // Invisible Layer
        $('#addInvisibleBtn').on('click', addInvisibleLayer);
        
        $('#clickthroughUrl, #clickthroughTarget').on('keypress', function(e) {
            if (e.which === 13) { e.preventDefault(); saveClickthrough(); }
        });
        $('#clickthroughModal').on('keydown', function(e) {
            if (e.keyCode === 27) { e.preventDefault(); closeClickthroughModal(); }
        });
        
        // Shape
        $('#addShapeBtn').on('click', openShapeModal);
        $('#closeShapeModal').on('click', closeShapeModal);
        $('#saveShapeBtn').on('click', saveShape);
        $('#shapeOpacity').on('input', function() {
            $('#shapeOpacityValue').text(Math.round($(this).val() * 100) + '%');
        });
        $('#shapeType, #shapeWidth, #shapeHeight, #shapeFillColor, #shapeOpacity, #shapeBorderRadius').on('keypress', function(e) {
            if (e.which === 13) { e.preventDefault(); saveShape(); }
        });
        $('#shapeModal').on('keydown', function(e) {
            if (e.keyCode === 27) { e.preventDefault(); closeShapeModal(); }
        });
        
        // Video
        $('#addVideoBtn').on('click', openVideoModal);
        $('#closeVideoModal').on('click', closeVideoModal);
        $('#saveVideoBtn').on('click', saveVideo);
        
        // Folder creation
        $('#createGroupBtn').on('click', createFolder);
        $(document).on('click', '.timeline-folder-toggle', toggleFolder);
        $(document).on('click', '.delete-folder', deleteFolder);
        $(document).on('click', '.toggle-folder-visibility', toggleFolderVisibility);
        
        $('#videoUrl, #videoName').on('keypress', function(e) {
            if (e.which === 13) { e.preventDefault(); saveVideo(); }
        });
        $('#videoModal').on('keydown', function(e) {
            if (e.keyCode === 27) { e.preventDefault(); closeVideoModal(); }
        });
        
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
        $canvas.on('mousedown', '.canvas-folder', handleFolderMouseDown);
        $canvas.on('mousedown', '.resize-handle', handleResizeStart);
        $canvas.on('mousedown', handleCanvasMouseDown);
        $(document).on('mousemove', handleMouseMove);
        $(document).on('mouseup', handleMouseUp);
        
        // Click outside canvas to unfocus
        $(document).on('mousedown', function(e) {
            const $target = $(e.target);
            if (!$target.closest('#canvasContainer').length && 
                !$target.closest('.properties-panel').length &&
                !$target.closest('#propertiesPanel').length &&
                !$target.closest('.modal').length &&
                !$target.closest('#animModal').length &&
                !$target.closest('#textModal').length &&
                !$target.closest('#shapeModal').length &&
                !$target.closest('#videoModal').length &&
                !$target.closest('#clickthroughModal').length &&
                !$target.closest('.layers-panel').length &&
                !$target.closest('.timeline').length &&
                !$target.closest('.w-80').length) {
                selectedElement = null;
                selectedFolder = null;
                clickCount = 0;
                lastClickedElement = null;
                $('.canvas-element').removeClass('selected');
                $('.canvas-folder').removeClass('selected');
                $('.layer-item').removeClass('selected');
                $('.timeline-track').removeClass('selected');
                $('.timeline-folder').removeClass('selected');
                updatePropertiesPanel();
            }
        });
        
        $(document).on('mousedown', '#canvasContainer', function(e) {
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
        $layersList.on('click', '.toggle-folder-visibility', toggleFolderVisibility);
        
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
            $(this).siblings('.color-swatch').removeClass('selected');
            $(this).addClass('selected');
            $colorInput.val(color).trigger('change');
        });
        $(document).on('click', '.color-swatch-rainbow', function() {
            $('.text-color-swatch').removeClass('selected');
            $('#propColor').removeClass('hidden').click();
        });
        $(document).on('click', '.color-swatch-rainbow-shape', function() {
            $('.shape-color-swatch').removeClass('selected');
            $('#shapeFillColor').removeClass('hidden').click();
        });

        $('#propBold').on('click', toggleBold);
        $('#propItalic').on('click', toggleItalic);
        $('#propUnderline').on('click', toggleUnderline);
        $('.text-align-btn').on('click', updateTextAlign);
        
        // Clickthrough properties
        $('#propClickUrl').on('change', updateClickUrl);
        $('#propClickIndex').on('change', updateClickIndex);
        $('#propClickTarget').on('change', updateClickTarget);
        
        // Shape properties
        $('#propShapeType').on('change', updateShapeType);
        $('#propShapeColor').on('change', updateShapeColor);
        $('#propShapeTransparent').on('change', updateShapeTransparent);
        $('#propShapeBorderWidth').on('change', updateShapeBorder);
        $('#propShapeBorderColor').on('change', updateShapeBorder);
        $('#propShapeBorderRadius').on('change', updateShapeBorderRadius);
        $('#propImageBorderRadius').on('change', updateImageBorderRadius);
        
        // Video properties
        $('#propVideoUrl').on('change', updateVideoUrl);
        $('#propVideoName').on('change', updateVideoName);
        $('#propVideoPlayTrigger').on('change', updateVideoPlayTrigger);
        $('#propVideoMuted').on('change', updateVideoMuted);
        $('#propVideoControls').on('change', updateVideoControls);
        
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
        
        // Interactions
        $('#enableClickInteraction').on('change', function() {
            $('#clickInteractionSettings').toggleClass('hidden', !$(this).is(':checked'));
            saveInteractionSettings();
        });
        $('#enableHoverInteraction').on('change', function() {
            $('#hoverInteractionSettings').toggleClass('hidden', !$(this).is(':checked'));
            saveInteractionSettings();
        });
        $('#clickTargetElement, #clickAction, #clickShadowX, #clickShadowY, #clickShadowBlur, #clickShadowColor, #clickGlowX, #clickGlowY, #clickGlowBlur, #clickGlowColor, #clickScaleAmount').on('change input', saveInteractionSettings);
        $('#hoverTargetElement, #hoverAction, #hoverShadowX, #hoverShadowY, #hoverShadowBlur, #hoverShadowColor, #hoverGlowX, #hoverGlowY, #hoverGlowBlur, #hoverGlowColor, #hoverScaleAmount').on('change input', saveInteractionSettings);
        $('#clickAction').on('change', function() { updateClickActionSettings($(this).val()); });
        $('#hoverAction').on('change', function() { updateHoverActionSettings($(this).val()); });
        
        // Animation
        // FIX #2: Removed dead $('#addAnimBtn').on('click', openAnimationModal) - #addAnimBtn does not exist in the HTML.
        //         Animation modal is opened via .add-layer-anim buttons on timeline tracks (handleAddLayerAnimation).
        // FIX #3: Removed dead $('#animType').on('change', toggleCustomAnimProps) - #animType does not exist in the HTML.
        //         The modal uses separate dropdowns: #animFade, #animSlide, #animZoom, #animRotate.
        $('#closeModal').on('click', closeAnimationModal);
        $('#saveAnimBtn').on('click', saveAnimation);
        $('#deleteAnimBtn').on('click', deleteEditingAnimation);
        $timelineTracks.on('click', '.timeline-block', editAnimation);
        $timelineTracks.on('click', '.delete-anim', function(e) {
            e.stopPropagation();
            handleDeleteAnimation(e);
        });
        $('#animModal').on('keydown', function(e) {
            if (e.keyCode === 27) { e.preventDefault(); closeAnimationModal(); }
            else if (e.keyCode === 13) { e.preventDefault(); saveAnimation(); }
        });
        
        // Timeline layer controls
        let trackClickTimer = null;

        $timelineTracks.on('click', '.timeline-track-label', function(e) {
            if ($(e.target).closest('button').length > 0) return;
            if ($(e.target).is('.track-rename-input')) return;
            e.stopPropagation();
            const elementId = $(e.currentTarget).closest('.timeline-track').data('element-id');
            if (!elementId) return;
            clearTimeout(trackClickTimer);
            trackClickTimer = setTimeout(function() { selectElement(elementId); }, 220);
        });
        
        $timelineTracks.on('click', '.timeline-folder-children .timeline-track-label', function(e) {
            if ($(e.target).closest('button').length > 0) return;
            if ($(e.target).is('.track-rename-input')) return;
            e.stopPropagation();
            e.preventDefault();
            const elementId = $(e.currentTarget).closest('.timeline-track').data('element-id');
            if (!elementId) return;
            clearTimeout(trackClickTimer);
            trackClickTimer = setTimeout(function() { selectElement(elementId); }, 220);
        });
        
        $timelineTracks.on('click', '.timeline-folder-header', function(e) {
            if ($(e.target).closest('.timeline-folder-toggle, button').length > 0) return;
            const folderId = $(this).closest('.timeline-folder').data('folder-id');
            if (folderId) { selectFolder(folderId); }
        });
        
        $timelineTracks.on('dblclick', '.track-name-label', function(e) {
            e.stopPropagation();
            e.preventDefault();
            clearTimeout(trackClickTimer);
            const $span = $(this);
            const currentName = $span.text();
            const elementId = $span.data('element-id');
            const folderId = $span.data('folder-id');
            const $input = $(`<input type="text" class="track-rename-input" value="${currentName.replace(/"/g, '&quot;')}" />`);
            $span.replaceWith($input);
            $input.focus().select();
            let committed = false;
            function commitRename() {
                if (committed) return;
                committed = true;
                const newName = $input.val().trim();
                if (elementId) {
                    const el = elements.find(e => e.id === elementId);
                    if (el) el.name = newName || undefined;
                } else if (folderId) {
                    const group = groups.find(g => g.id === folderId);
                    if (group) group.name = newName || group.name;
                }
                if (document.activeElement) document.activeElement.blur();
                rebuildTimeline();
            }
            function blockMousedown(e) {
                if ($(e.target).is('.track-rename-input')) return;
                e.preventDefault();
            }
            $timelineTracks[0].addEventListener('mousedown', blockMousedown, true);
            $input.on('blur', function() {
                $timelineTracks[0].removeEventListener('mousedown', blockMousedown, true);
                commitRename();
            });
            $input.on('keydown', function(e) {
                if (e.key === 'Enter') { e.preventDefault(); $input.blur(); }
                if (e.key === 'Escape') {
                    committed = true;
                    $timelineTracks[0].removeEventListener('mousedown', blockMousedown, true);
                    rebuildTimeline();
                }
            });
        });
        
        $timelineTracks.on('click', '.toggle-visibility', function(e) { e.stopPropagation(); toggleLayerVisibility(e); });
        $timelineTracks.on('click', '.add-layer-anim', function(e) { e.stopPropagation(); handleAddLayerAnimation(e); });
        $timelineTracks.on('click', '.delete-layer', function(e) { e.stopPropagation(); handleDeleteLayer(e); });
        
        $timelineTracks.on('mousedown', '.timeline-block', handleTimelineBlockDragStart);
        $timelineTracks.on('mousedown', '.timeline-block-resize-handle', handleTimelineBlockResizeStart);
        
        // Timeline controls
        $('#timelineDuration').on('change', updateTimelineDuration);
        $('#animLoop').on('change', updateAnimLoop);
        $('#zoomIn').on('click', zoomIn);
        $('#zoomOut').on('click', zoomOut);
        $('#playTimeline').on('click', playTimeline);
        $('#stopTimeline').on('click', stopTimeline);
        $('#timelinePlayhead').on('mousedown', handlePlayheadDragStart);
        
        // Actions
        $('#previewBtn').on('click', function() { $('#importExportMenu').addClass('hidden'); playTimeline(); });
        $('#exportBtn').on('click', function() { $('#importExportMenu').addClass('hidden'); exportToZip(); });
        $('#saveProjectBtn').on('click', function() { $('#importExportMenu').addClass('hidden'); saveProject(); });
        $('#loadProjectBtn').on('click', function() { $('#importExportMenu').addClass('hidden'); $('#loadProjectInput').click(); });
        $('#loadProjectInput').on('change', loadProject);
        $('#clearBtn').on('click', clearAll);

        $('#importExportBtn').on('click', function(e) {
            e.stopPropagation();
            $('#importExportMenu').toggleClass('hidden');
        });
        $(document).on('click.importExport', function(e) {
            if (!$(e.target).closest('#importExportDropdownWrapper').length) {
                $('#importExportMenu').addClass('hidden');
            }
        });
        
        $('#bannerName').on('input', function() {
            let value = $(this).val();
            value = value.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9-_]/g, '');
            $(this).val(value);
        });
        
        // Stage zoom controls
        $('#stageZoomIn').on('click', stageZoomIn);
        $('#stageZoomOut').on('click', stageZoomOut);
        $('#stageZoomReset').on('click', stageZoomReset);
        
        // Keyboard shortcuts
        $(document).on('keydown', function(e) {
            const $focused = $(':focus');
            const isInputFocused = $focused.is('input, textarea');
            if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey && !isInputFocused) {
                e.preventDefault();
                undo();
            } else if ((e.ctrlKey || e.metaKey) && e.key === 'z' && e.shiftKey && !isInputFocused) {
                e.preventDefault();
                redo();
            }
        });
    }
    
    // ============================================
    // PLAYHEAD DRAGGING
    // ============================================
    let isPlayheadDragging = false;
    
    function handlePlayheadDragStart(e) {
        e.preventDefault();
        e.stopPropagation();
        isPlayheadDragging = true;
        
        // FIX #6: Namespaced event handlers to prevent listener stacking
        const moveHandler = function(moveEvent) {
            if (!isPlayheadDragging) return;
            const $ruler = $('#timelineRuler');
            const rulerOffset = $ruler.offset().left;
            const rulerWidth = $ruler.width();
            const mouseX = moveEvent.pageX - rulerOffset;
            let percent = (mouseX / rulerWidth) * 100;
            percent = Math.max(0, Math.min(100, percent));
            $('#timelinePlayhead').css('left', percent + '%');
            if (!isPlaying && timeline) {
                const time = (percent / 100) * totalDuration;
                timeline.seek(time);
            }
        };
        
        const upHandler = function() {
            isPlayheadDragging = false;
            // FIX #6: Use namespaced off() to remove only these specific handlers
            $(document).off('mousemove.playhead mouseup.playhead');
        };
        
        // FIX #6: Namespace the events
        $(document).on('mousemove.playhead', moveHandler);
        $(document).on('mouseup.playhead', upHandler);
    }
    
    // ============================================
    // TIMELINE BLOCK DRAGGING AND RESIZING
    // ============================================
    let isTimelineBlockDragging = false;
    let isTimelineBlockResizing = false;
    let draggedBlock = null;
    let resizeDirection = null;
    
    function handleTimelineBlockDragStart(e) {
        if ($(e.target).hasClass('timeline-block-resize-handle') || 
            $(e.target).closest('.delete-anim').length > 0) {
            return;
        }
        e.preventDefault();
        e.stopPropagation();
        
        const $block = $(e.currentTarget);
        const animId = $block.data('anim-id');
        const elementId = $block.data('element-id');
        const folderId = $block.data('folder-id');
        let hasMoved = false;
        draggedBlock = { animId, elementId, folderId, $block };
        
        const $track = $block.parent();
        const trackOffset = $track.offset().left;
        const trackWidth = $track.width();
        const blockOffset = $block.offset().left;
        const startX = e.pageX;
        const initialLeft = blockOffset - trackOffset;
        
        // FIX #6: Namespaced handlers
        const moveHandler = function(moveEvent) {
            const deltaX = moveEvent.pageX - startX;
            if (!hasMoved && Math.abs(deltaX) > 3) {
                hasMoved = true;
                isTimelineBlockDragging = true;
            }
            if (!hasMoved) return;
            let newLeft = initialLeft + deltaX;
            newLeft = Math.max(0, Math.min(trackWidth - $block.width(), newLeft));
            const newLeftPercent = (newLeft / trackWidth) * 100;
            $block.css('left', newLeftPercent + '%');
            let target;
            if (folderId) { target = groups.find(g => g.id === folderId); }
            else { target = elements.find(el => el.id === elementId); }
            if (target) {
                const anim = target.animations.find(a => a.id === animId);
                if (anim) {
                    anim.start = Math.round(((newLeftPercent / 100) * totalDuration) * 10) / 10;
                }
            }
        };
        
        const upHandler = function() {
            $(document).off('mousemove.blockdrag mouseup.blockdrag');
            if (hasMoved) { rebuildTimeline(); }
            setTimeout(() => { isTimelineBlockDragging = false; draggedBlock = null; }, 50);
        };
        
        $(document).on('mousemove.blockdrag', moveHandler);
        $(document).on('mouseup.blockdrag', upHandler);
    }
    
    function handleTimelineBlockResizeStart(e) {
        e.preventDefault();
        e.stopPropagation();
        
        const $handle = $(e.currentTarget);
        const $block = $handle.parent();
        const animId = $block.data('anim-id');
        const elementId = $block.data('element-id');
        const folderId = $block.data('folder-id');
        
        isTimelineBlockResizing = true;
        resizeDirection = $handle.hasClass('left') ? 'left' : 'right';
        draggedBlock = { animId, elementId, folderId, $block };
        
        const $track = $block.parent();
        const trackWidth = $track.width();
        const startX = e.pageX;
        const initialLeft = parseFloat($block.css('left'));
        const initialWidth = $block.width();
        
        // FIX #6: Namespaced handlers
        const moveHandler = function(moveEvent) {
            if (!isTimelineBlockResizing) return;
            const deltaX = moveEvent.pageX - startX;
            const deltaPercent = (deltaX / trackWidth) * 100;
            let target;
            if (folderId) { target = groups.find(g => g.id === folderId); }
            else { target = elements.find(el => el.id === elementId); }
            if (!target) return;
            const anim = target.animations.find(a => a.id === animId);
            if (!anim) return;
            if (resizeDirection === 'left') {
                let newLeft = initialLeft + deltaPercent;
                newLeft = Math.max(0, newLeft);
                const widthPercent = parseFloat($block.css('width'));
                const newWidthPercent = widthPercent - (newLeft - initialLeft);
                if (newWidthPercent > 2) {
                    $block.css('left', newLeft + '%');
                    $block.css('width', newWidthPercent + '%');
                    anim.start = Math.round(((newLeft / 100) * totalDuration) * 10) / 10;
                    anim.duration = Math.round(((newWidthPercent / 100) * totalDuration) * 10) / 10;
                }
            } else {
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
            $(document).off('mousemove.blockresize mouseup.blockresize');
            rebuildTimeline();
        };
        
        $(document).on('mousemove.blockresize', moveHandler);
        $(document).on('mouseup.blockresize', upHandler);
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
            Array.from(files).forEach(file => { uploadFile(file); });
        }
    }
    
    function handleFileSelect(e) {
        const files = e.target.files;
        if (files.length > 0) {
            Array.from(files).forEach(file => { uploadFile(file); });
        }
    }
    
    async function uploadFile(file) {
        const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/svg+xml', 'image/webp'];
        if (!validTypes.includes(file.type)) {
            alert('Please upload a JPG, PNG, GIF, SVG, or WEBP file.');
            return;
        }
        const reader = new FileReader();
        reader.onload = function(e) { addImageToCanvas(e.target.result, file.name); };
        reader.onerror = function(error) {
            debugError('File read error:', error);
            alert('Failed to read file. Please try again.');
        };
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
    function closeTextModal() { $textModal.addClass('hidden'); }
    function saveText() {
        const text = $('#textContent').val().trim();
        if (!text) { alert('Please enter some text'); return; }
        addTextToCanvas(text);
        closeTextModal();
    }
    
    function addTextToCanvas(text) {
        elementCounter++;
        const id = `element_${elementCounter}`;
        // FIX #10: Assign typeIndex at creation time
        typeCounters.text++;
        const element = {
            id, type: 'text', text,
            x: 50, y: 50, width: 200, height: 50,
            rotation: 0, opacity: 1,
            fontSize: 24, fontFamily: 'Arial', color: '#000000',
            bold: false, italic: false, underline: false, textAlign: 'left',
            shadowX: 0, shadowY: 0, shadowBlur: 0, shadowColor: '#000000', shadowHover: false,
            glowX: 0, glowY: 0, glowBlur: 0, glowSpread: 0, glowColor: '#ffffff', glowHover: false,
            zIndex: elements.length,
            animations: [],
            interactions: initInteractionProperties(),
            typeIndex: typeCounters.text
        };
        elements.push(element);
        const $element = $(`
            <div class="canvas-element text-element" id="${id}" style="
                left:${element.x}px;top:${element.y}px;
                width:${element.width}px;height:${element.height}px;
                opacity:${element.opacity};transform:rotate(${element.rotation}deg);
                font-size:${element.fontSize}px;font-family:${element.fontFamily};
                color:${element.color};font-weight:normal;font-style:normal;
                text-decoration:none;text-align:${element.textAlign};
                line-height:1.2;word-wrap:break-word;z-index:${element.zIndex};
            ">
                ${text}
                <div class="resize-handle nw"></div><div class="resize-handle ne"></div>
                <div class="resize-handle sw"></div><div class="resize-handle se"></div>
            </div>
        `);
        appendElementToCanvas($element, element);
        saveState();
        updateLayersList();
        selectElement(id);
    }
    
    // ============================================
    // CLICKTHROUGH MANAGEMENT
    // ============================================
    function openClickthroughModal() {
        $('#clickthroughUrl').val('');
        $('#clickthroughIndex').val(1);
        $('#clickthroughTarget').val('_blank');
        $clickthroughModal.removeClass('hidden');
        setTimeout(() => $('#clickthroughUrl').focus(), 100);
    }
    function closeClickthroughModal() { $clickthroughModal.addClass('hidden'); }
    function saveClickthrough() {
        const url = $('#clickthroughUrl').val() || '';
        const target = $('#clickthroughTarget').val() || '_blank';
        const clickIndex = parseInt($('#clickthroughIndex').val()) || 1;
        addClickthroughToCanvas(url, target, clickIndex);
        closeClickthroughModal();
    }
    
    // ============================================
    // SHAPE
    // ============================================
    function openShapeModal() {
        $shapeModal.removeClass('hidden');
        setTimeout(() => $('#shapeWidth').focus(), 100);
    }
    function closeShapeModal() { $shapeModal.addClass('hidden'); }
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
        // FIX #10: Assign typeIndex at creation time
        typeCounters.shape++;
        const element = {
            id, type: 'shape', shapeType, fillColor,
            borderRadius, borderWidth: 0, borderColor: '#000000', transparent: false,
            x: 50, y: 50, width, height, rotation: 0, opacity,
            shadowX: 0, shadowY: 0, shadowBlur: 0, shadowSpread: 0, shadowColor: '#000000', shadowHover: false,
            glowX: 0, glowY: 0, glowBlur: 0, glowSpread: 0, glowColor: '#ffffff', glowHover: false,
            zIndex: elements.length, animations: [],
            interactions: initInteractionProperties(),
            typeIndex: typeCounters.shape
        };
        elements.push(element);
        let shapeStyle = `background-color: ${fillColor};`;
        if (shapeType === 'circle') shapeStyle += ' border-radius: 50%;';
        else if (shapeType === 'rounded-rectangle') shapeStyle += ' border-radius: 12px;';
        else if (borderRadius > 0) shapeStyle += ` border-radius: ${borderRadius}px;`;
        const $element = $(`
            <div class="canvas-element" id="${id}" style="
                left:${element.x}px;top:${element.y}px;
                width:${element.width}px;height:${element.height}px;
                opacity:${element.opacity};transform:rotate(${element.rotation}deg);
                z-index:${element.zIndex};${shapeStyle}
            ">
                <div class="resize-handle nw"></div><div class="resize-handle ne"></div>
                <div class="resize-handle sw"></div><div class="resize-handle se"></div>
            </div>
        `);
        appendElementToCanvas($element, element);
        saveState();
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
        $('#videoMuted').prop('checked', true).prop('disabled', true);
        $('#videoControls').prop('checked', false);
        $videoModal.removeClass('hidden');
        setTimeout(() => $('#videoUrl').focus(), 100);
    }
    function closeVideoModal() { $videoModal.addClass('hidden'); }
    function saveVideo() {
        const videoUrl = $('#videoUrl').val().trim();
        const videoName = $('#videoName').val().trim() || 'video1';
        const playTrigger = $('#videoPlayTrigger').val();
        const muted = $('#videoMuted').is(':checked');
        const controls = $('#videoControls').is(':checked');
        if (!videoUrl) { alert('Please enter video URL'); return; }
        addVideoToCanvas(videoUrl, videoName, playTrigger, muted, controls);
        closeVideoModal();
    }
    
    function addVideoToCanvas(videoUrl, videoName, playTrigger, muted, controls) {
        elementCounter++;
        const id = `element_${elementCounter}`;
        // FIX #10: Assign typeIndex at creation time
        typeCounters.video++;
        const element = {
            id, type: 'video', videoUrl, videoName, playTrigger, muted, controls,
            x: 0, y: 0, width: 300, height: 169,
            rotation: 0, opacity: 1, zIndex: elements.length,
            animations: [], interactions: initInteractionProperties(),
            typeIndex: typeCounters.video
        };
        elements.push(element);
        const playText = playTrigger === 'autoplay' ? '▶ Autoplay' : playTrigger === 'mouseover' ? '🖱 On Hover' : '👆 On Click';
        const $element = $(`
            <div class="canvas-element video-element" id="${id}" style="
                left:${element.x}px;top:${element.y}px;
                width:${element.width}px;height:${element.height}px;
                opacity:1;transform:rotate(0deg);z-index:${element.zIndex};
                background-color:#000;display:flex;align-items:center;justify-content:center;
                overflow:hidden;color:#fff;font-size:14px;border:2px solid #e53e3e;
            ">
                <div style="text-align:center;width:100%;padding:0 8px;box-sizing:border-box;overflow:hidden;">
                    <i class="fas fa-video" style="font-size:32px;margin-bottom:8px;"></i>
                    <div>${videoName}</div>
                    <div style="font-size:11px;opacity:0.7;word-break:break-all;overflow:hidden;">${videoUrl}</div>
                    <div style="font-size:11px;margin-top:4px;">${playText} ${muted ? '🔇 Muted' : '🔊 Sound'} ${controls ? '⚙ Controls' : ''}</div>
                </div>
                <div class="resize-handle nw"></div><div class="resize-handle ne"></div>
                <div class="resize-handle sw"></div><div class="resize-handle se"></div>
            </div>
        `);
        appendElementToCanvas($element, element);
        saveState();
        updateLayersList();
        selectElement(id);
        updateTimelineTracks();
    }
    
    function addClickthroughToCanvas(url, target, clickIndex = 1) {
        elementCounter++;
        const id = `element_${elementCounter}`;
        // FIX #10: Assign typeIndex at creation time
        typeCounters.clickthrough++;
        const element = {
            id, type: 'clickthrough', url, target, clickIndex,
            x: 0, y: 0, width: canvasWidth, height: canvasHeight,
            rotation: 0, opacity: 1.0, zIndex: elements.length,
            animations: [], interactions: initInteractionProperties(),
            typeIndex: typeCounters.clickthrough
        };
        elements.push(element);
        const $element = $(`
            <div class="canvas-element clickthrough-element" id="${id}" style="
                left:${element.x}px;top:${element.y}px;
                width:${element.width}px;height:${element.height}px;
                opacity:${element.opacity};transform:rotate(0deg);z-index:${element.zIndex};
                background:repeating-linear-gradient(45deg,rgba(168,85,247,0.1),rgba(168,85,247,0.1) 10px,rgba(168,85,247,0.2) 10px,rgba(168,85,247,0.2) 20px);
                border:2px dashed rgba(168,85,247,0.5);
            ">
                <div style="text-align:center;color:rgba(168,85,247,0.8);pointer-events:none;">
                    <i class="fas fa-mouse-pointer text-2xl mb-2"></i>
                    <div class="text-xs">Clickthrough</div>
                    ${url ? `<div class="text-xs font-bold">${url}</div>` : ''}
                </div>
                <div class="resize-handle nw"></div><div class="resize-handle ne"></div>
                <div class="resize-handle sw"></div><div class="resize-handle se"></div>
            </div>
        `);
        appendElementToCanvas($element, element);
        // FIX #7: Added missing saveState() call — clickthrough additions were not captured in undo stack
        saveState();
        updateLayersList();
        selectElement(id);
    }
    
    // ============================================
    // INVISIBLE LAYER
    // ============================================
    function addInvisibleLayer() {
        elementCounter++;
        const id = `element_${elementCounter}`;
        // FIX #10: Assign typeIndex at creation time
        typeCounters.invisible++;
        const element = {
            id, type: 'invisible',
            x: 50, y: 50, width: 200, height: 150,
            rotation: 0, opacity: 1, zIndex: elements.length,
            animations: [], interactions: initInteractionProperties(),
            typeIndex: typeCounters.invisible
        };
        elements.push(element);
        const $element = $(`
            <div class="canvas-element invisible-element" id="${id}" style="
                left:${element.x}px;top:${element.y}px;
                width:${element.width}px;height:${element.height}px;
                opacity:0.3;transform:rotate(0deg);z-index:${element.zIndex};
                background:repeating-linear-gradient(45deg,rgba(200,200,200,0.3),rgba(200,200,200,0.3) 10px,rgba(150,150,150,0.3) 10px,rgba(150,150,150,0.3) 20px);
                border:2px dashed rgba(100,100,100,0.5);
            ">
                <div style="text-align:center;color:rgba(100,100,100,0.8);pointer-events:none;padding-top:40%;">
                    <i class="fas fa-eye-slash text-2xl mb-2"></i>
                    <div class="text-xs">Invisible Layer</div>
                </div>
                <div class="resize-handle nw"></div><div class="resize-handle ne"></div>
                <div class="resize-handle sw"></div><div class="resize-handle se"></div>
            </div>
        `);
        appendElementToCanvas($element, element);
        saveState();
        updateLayersList();
        selectElement(id);
    }
    
    // ============================================
    // INTERACTIONS SYSTEM
    // ============================================
    function initInteractionProperties() {
        return {
            click: {
                enabled: false, targetElement: 'self', action: 'pauseAnimation',
                shadowX: 2, shadowY: 2, shadowBlur: 5, shadowColor: '#000000',
                glowX: 0, glowY: 0, glowBlur: 10, glowColor: '#00ff00', scaleAmount: 1.1
            },
            hover: {
                enabled: false, targetElement: 'self', action: 'addShadow',
                shadowX: 2, shadowY: 2, shadowBlur: 5, shadowColor: '#000000',
                glowX: 0, glowY: 0, glowBlur: 10, glowColor: '#00ff00', scaleAmount: 1.1
            }
        };
    }
    
    function updateInteractionUI(element) {
        if (!element.interactions) { element.interactions = initInteractionProperties(); }
        const interactions = element.interactions;
        $('#enableClickInteraction').prop('checked', interactions.click.enabled);
        $('#clickTargetElement').val(interactions.click.targetElement);
        $('#clickAction').val(interactions.click.action);
        $('#clickShadowX').val(interactions.click.shadowX);
        $('#clickShadowY').val(interactions.click.shadowY);
        $('#clickShadowBlur').val(interactions.click.shadowBlur);
        $('#clickShadowColor').val(interactions.click.shadowColor);
        $('#clickGlowX').val(interactions.click.glowX);
        $('#clickGlowY').val(interactions.click.glowY);
        $('#clickGlowBlur').val(interactions.click.glowBlur);
        $('#clickGlowColor').val(interactions.click.glowColor);
        $('#clickScaleAmount').val(interactions.click.scaleAmount);
        $('#enableHoverInteraction').prop('checked', interactions.hover.enabled);
        $('#hoverTargetElement').val(interactions.hover.targetElement);
        $('#hoverAction').val(interactions.hover.action);
        $('#hoverShadowX').val(interactions.hover.shadowX);
        $('#hoverShadowY').val(interactions.hover.shadowY);
        $('#hoverShadowBlur').val(interactions.hover.shadowBlur);
        $('#hoverShadowColor').val(interactions.hover.shadowColor);
        $('#hoverGlowX').val(interactions.hover.glowX);
        $('#hoverGlowY').val(interactions.hover.glowY);
        $('#hoverGlowBlur').val(interactions.hover.glowBlur);
        $('#hoverGlowColor').val(interactions.hover.glowColor);
        $('#hoverScaleAmount').val(interactions.hover.scaleAmount);
        $('#clickInteractionSettings').toggleClass('hidden', !interactions.click.enabled);
        $('#hoverInteractionSettings').toggleClass('hidden', !interactions.hover.enabled);
        updateClickActionSettings(interactions.click.action);
        updateHoverActionSettings(interactions.hover.action);
        updateTargetElementDropdowns();
    }
    
    function updateTargetElementDropdowns() {
        const clickSelect = $('#clickTargetElement');
        const hoverSelect = $('#hoverTargetElement');
        const clickValue = clickSelect.val() || 'self';
        const hoverValue = hoverSelect.val() || 'self';
        clickSelect.find('option:not([value="self"])').remove();
        hoverSelect.find('option:not([value="self"])').remove();
        elements.forEach(el => {
            const label = getElementLabel(el);
            const option = `<option value="${el.id}">${label}</option>`;
            clickSelect.append(option);
            hoverSelect.append(option);
        });
        clickSelect.val(clickValue);
        hoverSelect.val(hoverValue);
    }
    
    // FIX #10: Use stored typeIndex instead of O(n²) findIndex
    function getElementLabel(element) {
        const idx = element.typeIndex || 1;
        if (element.type === 'text') return `Text: ${element.text.substring(0, 15)}`;
        if (element.type === 'clickthrough') return `Click${idx}`;
        if (element.type === 'invisible') return `Invisible${idx}`;
        if (element.type === 'shape') return `Shape${idx}`;
        if (element.type === 'video') return `Video: ${element.videoName}`;
        return element.name || element.filename || `Image${idx}`;
    }
    
    function updateClickActionSettings(action) {
        $('#clickShadowSettings, #clickGlowSettings, #clickScaleSettings').addClass('hidden');
        if (action === 'addShadow') $('#clickShadowSettings').removeClass('hidden');
        else if (action === 'addGlow') $('#clickGlowSettings').removeClass('hidden');
        else if (action === 'scale') $('#clickScaleSettings').removeClass('hidden');
    }
    
    function updateHoverActionSettings(action) {
        $('#hoverShadowSettings, #hoverGlowSettings, #hoverScaleSettings').addClass('hidden');
        if (action === 'addShadow') $('#hoverShadowSettings').removeClass('hidden');
        else if (action === 'addGlow') $('#hoverGlowSettings').removeClass('hidden');
        else if (action === 'scale') $('#hoverScaleSettings').removeClass('hidden');
    }
    
    function saveInteractionSettings() {
        let target = null;
        if (selectedFolder) { target = groups.find(g => g.id === selectedFolder); }
        else if (selectedElement) { target = elements.find(el => el.id === selectedElement); }
        if (!target) return;
        if (!target.interactions) { target.interactions = initInteractionProperties(); }
        target.interactions.click.enabled = $('#enableClickInteraction').is(':checked');
        target.interactions.click.targetElement = $('#clickTargetElement').val();
        target.interactions.click.action = $('#clickAction').val();
        target.interactions.click.shadowX = parseFloat($('#clickShadowX').val()) || 0;
        target.interactions.click.shadowY = parseFloat($('#clickShadowY').val()) || 0;
        target.interactions.click.shadowBlur = parseFloat($('#clickShadowBlur').val()) || 0;
        target.interactions.click.shadowColor = $('#clickShadowColor').val();
        target.interactions.click.glowX = parseFloat($('#clickGlowX').val()) || 0;
        target.interactions.click.glowY = parseFloat($('#clickGlowY').val()) || 0;
        target.interactions.click.glowBlur = parseFloat($('#clickGlowBlur').val()) || 0;
        target.interactions.click.glowColor = $('#clickGlowColor').val();
        target.interactions.click.scaleAmount = parseFloat($('#clickScaleAmount').val()) || 1.1;
        target.interactions.hover.enabled = $('#enableHoverInteraction').is(':checked');
        target.interactions.hover.targetElement = $('#hoverTargetElement').val();
        target.interactions.hover.action = $('#hoverAction').val();
        target.interactions.hover.shadowX = parseFloat($('#hoverShadowX').val()) || 0;
        target.interactions.hover.shadowY = parseFloat($('#hoverShadowY').val()) || 0;
        target.interactions.hover.shadowBlur = parseFloat($('#hoverShadowBlur').val()) || 0;
        target.interactions.hover.shadowColor = $('#hoverShadowColor').val();
        target.interactions.hover.glowX = parseFloat($('#hoverGlowX').val()) || 0;
        target.interactions.hover.glowY = parseFloat($('#hoverGlowY').val()) || 0;
        target.interactions.hover.glowBlur = parseFloat($('#hoverGlowBlur').val()) || 0;
        target.interactions.hover.glowColor = $('#hoverGlowColor').val();
        target.interactions.hover.scaleAmount = parseFloat($('#hoverScaleAmount').val()) || 1.1;
        // FIX #4: Replaced console.log with debug-guarded call
        debugLog('Interaction settings saved:', target.interactions);
        if (selectedFolder) {
            const $folderElement = $(`#${selectedFolder}.canvas-folder`);
            if ($folderElement.length) { applyFolderInteractions(target, $folderElement); }
        }
        saveState();
    }

    // ============================================================
    // NOTE: The rest of this file (applyFolderInteractions,
    // addImageToCanvas, canvas/element/layer/properties/animation/
    // timeline/export/undo functions) is unchanged from the original.
    // Append the remainder of your original app.js below this line.
    // ============================================================

})();
