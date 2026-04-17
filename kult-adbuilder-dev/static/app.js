// HTML5 Ad Builder - Full Featured Version
(function() {
    'use strict';    
    function _log(...a)  { if (window.AD_BUILDER_DEBUG) console.log(...a); }
    function _err(...a)  { if (window.AD_BUILDER_DEBUG) console.error(...a); }
    function _warn(...a) { if (window.AD_BUILDER_DEBUG) console.warn(...a); }
    // ============================================
    // STATE MANAGEMENT
    // ============================================
    let elements = [];
    let groups = [];
    let undoStack = [];
    let redoStack = [];
    const MAX_UNDO_STACK = 50;
    let selectedElement = null;
    let selectedFolder = null; // NEW: Track selected folder
    let lastClickTime = 0; // Track last click time for multi-click detection
    let lastClickedElement = null; // Track last clicked element
    let clickCount = 0; // Track number of clicks for triple-click detection
    let dragOffset = { x: 0, y: 0 };
    let isDragging = false;
    let isResizing = false;
    let resizeHandle = null;
    let elementCounter = 0;
    let folderCounter = 0;
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
    
    function getStore() {
        return window.adBuilderStore;
    }

    function syncSelectedElementToStore() {
        const store = getStore();
        if (!store) return;
        store.update(state => {
            state.selection.selectedElementId = selectedElement;
        });
    }

    function syncCanvasSizeToStore() {
        const store = getStore();
        if (!store) return;
        store.update(state => {
            state.meta.width = canvasWidth;
            state.meta.height = canvasHeight;
        });
    }

    function syncTimelineDurationToStore() {
        const store = getStore();
        if (!store) return;
        store.update(state => {
            state.timeline.totalDuration = totalDuration;
        });
    }

    function syncLegacyStateToStore() {
        syncSelectedElementToStore();
        syncCanvasSizeToStore();
        syncTimelineDurationToStore();
    }

    function getAppState() {
        const store = getStore();
        return store ? store.getState() : null;
    }

    function updateAppState(updater) {
        const store = getStore();
        if (!store) return;
        store.update(updater);
    }

    function syncBannerNameToStore() {
        const store = getStore();
        if (!store) return;
        store.update(state => {
            // state.meta.name = currentBannerName || '';
        });
    }
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
        syncLegacyStateToStore();
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
        
        // Folder creation
        $('#createGroupBtn').on('click', createFolder);
        $(document).on('click', '.timeline-folder-toggle', toggleFolder);
        $(document).on('click', '.delete-folder', deleteFolder);
        $(document).on('click', '.toggle-folder-visibility', toggleFolderVisibility);
        
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
        $canvas.on('mousedown', '.canvas-folder', handleFolderMouseDown);
        $canvas.on('mousedown', '.resize-handle', handleResizeStart);
        $canvas.on('mousedown', handleCanvasMouseDown); // Click on blank canvas
        $(document).on('mousemove', handleMouseMove);
        $(document).on('mouseup', handleMouseUp);
        
        // Click outside canvas to unfocus
        $(document).on('mousedown', function(e) {
            const $target = $(e.target);
            // Check if click is outside canvas container and not on UI elements (panels, modals, etc.)
            if (!$target.closest('#canvasContainer').length && 
                !$target.closest('.properties-panel').length &&
                !$target.closest('#propertiesPanel').length &&
                !$target.closest('.modal').length &&
                !$target.closest('#animModal').length && // Animation modal
                !$target.closest('#textModal').length && // Text modal
                !$target.closest('#shapeModal').length && // Shape modal
                !$target.closest('#videoModal').length && // Video modal
                !$target.closest('#clickthroughModal').length && // Clickthrough modal
                !$target.closest('.layers-panel').length &&
                !$target.closest('.timeline').length &&
                !$target.closest('.w-80').length) { // Left sidebar
                // Clicking outside canvas area - deselect everything
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
        $('#clickAction').on('change', function() {
            updateClickActionSettings($(this).val());
        });
        $('#hoverAction').on('change', function() {
            updateHoverActionSettings($(this).val());
        });
        
        // Animation
        $('#closeModal').on('click', closeAnimationModal);
        $('#saveAnimBtn').on('click', saveAnimation);
        $('#deleteAnimBtn').on('click', deleteEditingAnimation);
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
        // Use a timer to distinguish single click (select) from double-click (rename)
        let trackClickTimer = null;

        $timelineTracks.on('click', '.timeline-track-label', function(e) {
            // Don't select if clicking on a button or rename input
            if ($(e.target).closest('button').length > 0) return;
            if ($(e.target).is('.track-rename-input')) return;
            
            e.stopPropagation();
            
            const elementId = $(e.currentTarget).closest('.timeline-track').data('element-id');
            if (!elementId) return;

            clearTimeout(trackClickTimer);
            trackClickTimer = setTimeout(function() {
                selectElement(elementId);
            }, 220);
        });
        
        // Also handle clicks on tracks inside folders explicitly
        $timelineTracks.on('click', '.timeline-folder-children .timeline-track-label', function(e) {
            // Don't select if clicking on a button or rename input
            if ($(e.target).closest('button').length > 0) return;
            if ($(e.target).is('.track-rename-input')) return;
            
            e.stopPropagation();
            e.preventDefault();
            
            const elementId = $(e.currentTarget).closest('.timeline-track').data('element-id');
            if (!elementId) return;

            clearTimeout(trackClickTimer);
            trackClickTimer = setTimeout(function() {
                selectElement(elementId);
            }, 220);
        });
        
        // Folder header click to select folder
        $timelineTracks.on('click', '.timeline-folder-header', function(e) {
            // Don't select if clicking on toggle or buttons
            if ($(e.target).closest('.timeline-folder-toggle, button').length > 0) return;
            
            const folderId = $(this).closest('.timeline-folder').data('folder-id');
            if (folderId) {
                selectFolder(folderId);
            }
        });
        
        // Double-click on element/folder name label to rename inline
        $timelineTracks.on('dblclick', '.track-name-label', function(e) {
            e.stopPropagation();
            e.preventDefault();
            
            // Cancel the pending single-click select so properties panel doesn't flicker
            clearTimeout(trackClickTimer);
            
            const $span = $(this);
            const currentName = $span.text();
            const elementId = $span.data('element-id');
            const folderId = $span.data('folder-id');
            
            // Replace span with input
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
                // Remove focus from active element before rebuilding
                if (document.activeElement) document.activeElement.blur();
                rebuildTimeline();
            }
            
            // Prevent any mousedown inside timelineTracks from stealing focus away from input
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
                    committed = true; // skip save
                    $timelineTracks[0].removeEventListener('mousedown', blockMousedown, true);
                    rebuildTimeline();
                }
            });
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
        $('#previewBtn').on('click', function() {
            $('#importExportMenu').addClass('hidden');
            playTimeline();
        });
        $('#exportBtn').on('click', function() {
            $('#importExportMenu').addClass('hidden');
            exportToZip();
        });
        $('#saveProjectBtn').on('click', function() {
            $('#importExportMenu').addClass('hidden');
            saveProject();
        });
        $('#loadProjectBtn').on('click', function() {
            $('#importExportMenu').addClass('hidden');
            $('#loadProjectInput').click();
        });
        $('#loadProjectInput').on('change', loadProject);
        $('#clearBtn').on('click', clearAll);

        // Import/Export dropdown toggle
        $('#importExportBtn').on('click', function(e) {
            e.stopPropagation();
            $('#importExportMenu').toggleClass('hidden');
        });
        // Close dropdown when clicking outside
        $(document).on('click.importExport', function(e) {
            if (!$(e.target).closest('#importExportDropdownWrapper').length) {
                $('#importExportMenu').addClass('hidden');
            }
        });
        
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
        
        // Keyboard shortcuts
        $(document).on('keydown', function(e) {
            // Check if focused on input/textarea
            const $focused = $(':focus');
            const isInputFocused = $focused.is('input, textarea');
            
            // Ctrl+Z / Cmd+Z for Undo
            if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey && !isInputFocused) {
                e.preventDefault();
                undo();
            }
            // Ctrl+Shift+Z / Cmd+Shift+Z for Redo
            else if ((e.ctrlKey || e.metaKey) && e.key === 'z' && e.shiftKey && !isInputFocused) {
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
            // FIX #6: Namespaced off() — only removes these handlers, prevents stacking
            $(document).off('mousemove.playhead mouseup.playhead');
        };
        
        // FIX #6: Namespaced to prevent listener stacking on repeated drags
        $(document).on('mousemove.playhead', moveHandler);
        $(document).on('mouseup.playhead', upHandler);
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
        const folderId = $block.data('folder-id');
        
        // Don't set dragging flag yet - wait for actual movement
        let hasMoved = false;
        draggedBlock = { animId, elementId, folderId, $block };
        
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
            
            // Update animation start time (element or folder)
            let target, anim;
            if (folderId) {
                target = groups.find(g => g.id === folderId);
            } else {
                target = elements.find(el => el.id === elementId);
            }
            
            if (target) {
                anim = target.animations.find(a => a.id === animId);
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
        const folderId = $block.data('folder-id');
        
        isTimelineBlockResizing = true;
        resizeDirection = $handle.hasClass('left') ? 'left' : 'right';
        draggedBlock = { animId, elementId, folderId, $block };
        
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
            
            // Find target (element or folder)
            let target;
            if (folderId) {
                target = groups.find(g => g.id === folderId);
            } else {
                target = elements.find(el => el.id === elementId);
            }
            if (!target) return;
            
            const anim = target.animations.find(a => a.id === animId);
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
        const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/svg+xml', 'image/webp'];
        if (!validTypes.includes(file.type)) {
            alert('Please upload a JPG, PNG, GIF, SVG, or WEBP file.');
            return;
        }
        
        // Client-side file reading (no server required)
        const reader = new FileReader();
        
        reader.onload = function(e) {
            const dataUrl = e.target.result;
            addImageToCanvas(dataUrl, file.name);
        };
        
        reader.onerror = function(error) {
            _err('File read error:', error);
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
        saveState();
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
            animations: [],
            interactions: initInteractionProperties()
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
        
        appendElementToCanvas($element, element);
        updateLayersList();
        selectElement(id);
    }
    
    // ============================================
    // CLICKTHROUGH MANAGEMENT
    // ============================================
    function openClickthroughModal() {
        $('#clickthroughUrl').val(''); // Empty by default - no default URL
        // Auto-suggest next click index
        $('#clickthroughIndex').val(1);
        $('#clickthroughTarget').val('_blank');
        $clickthroughModal.removeClass('hidden');
        setTimeout(() => $('#clickthroughUrl').focus(), 100);
    }
    
    function closeClickthroughModal() {
        $clickthroughModal.addClass('hidden');
    }
    
    function saveClickthrough() {
        saveState();
        const url = $('#clickthroughUrl').val() || ''; // Allow empty URL
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
    
    function closeShapeModal() {
        $shapeModal.addClass('hidden');
    }
    
    function saveShape() {
        saveState();
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
            borderWidth: 0,
            borderColor: '#000000',
            transparent: false,
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
            animations: [],
            interactions: initInteractionProperties()
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
        
        appendElementToCanvas($element, element);
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
        saveState();
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
            animations: [],
            interactions: initInteractionProperties()
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
                overflow: hidden;
                color: #fff;
                font-size: 14px;
                border: 2px solid #e53e3e;
            ">
                <div style="text-align: center; width: 100%; padding: 0 8px; box-sizing: border-box; overflow: hidden;">
                    <i class="fas fa-video" style="font-size: 32px; margin-bottom: 8px;"></i>
                    <div>${videoName}</div>
                    <div style="font-size: 11px; opacity: 0.7; word-break: break-all; overflow: hidden;">${videoUrl}</div>
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
        
        appendElementToCanvas($element, element);
        updateLayersList();
        selectElement(id);
        updateTimelineTracks();
    }
    
    function addClickthroughToCanvas(url, target, clickIndex = 1) {
        elementCounter++;
        const id = `element_${elementCounter}`;
        
        const element = {
            id: id,
            type: 'clickthrough',
            url: url,
            target: target,
            clickIndex: clickIndex,
            x: 0,
            y: 0,
            width: canvasWidth,
            height: canvasHeight,
            rotation: 0,
            opacity: 1.0,
            zIndex: elements.length, // Follow normal z-index sorting
            animations: [],
            interactions: initInteractionProperties()
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
                background: repeating-linear-gradient(
                    45deg,
                    rgba(168, 85, 247, 0.1),
                    rgba(168, 85, 247, 0.1) 10px,
                    rgba(168, 85, 247, 0.2) 10px,
                    rgba(168, 85, 247, 0.2) 20px
                );
                border: 2px dashed rgba(168, 85, 247, 0.5);
            ">
                <div style="text-align: center; color: rgba(168, 85, 247, 0.8); pointer-events: none;">
                    <i class="fas fa-mouse-pointer text-2xl mb-2"></i>
                    <div class="text-xs">Clickthrough</div>
                    ${url ? `<div class="text-xs font-bold">${url}</div>` : ''}
                </div>
                <div class="resize-handle nw"></div>
                <div class="resize-handle ne"></div>
                <div class="resize-handle sw"></div>
                <div class="resize-handle se"></div>
            </div>
        `);
        
        appendElementToCanvas($element, element);
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
            animations: [],
            interactions: initInteractionProperties()
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
        
        appendElementToCanvas($element, element);
        updateLayersList();
        selectElement(id);
    }
    
    // ============================================
    // INTERACTIONS SYSTEM
    // ============================================
    
    // Initialize interaction properties for an element
    function initInteractionProperties() {
        return {
            click: {
                enabled: false,
                targetElement: 'self',
                action: 'pauseAnimation',
                shadowX: 2,
                shadowY: 2,
                shadowBlur: 5,
                shadowColor: '#000000',
                glowX: 0,
                glowY: 0,
                glowBlur: 10,
                glowColor: '#00ff00',
                scaleAmount: 1.1
            },
            hover: {
                enabled: false,
                targetElement: 'self',
                action: 'addShadow',
                shadowX: 2,
                shadowY: 2,
                shadowBlur: 5,
                shadowColor: '#000000',
                glowX: 0,
                glowY: 0,
                glowBlur: 10,
                glowColor: '#00ff00',
                scaleAmount: 1.1
            }
        };
    }
    
    // Update interaction UI when element is selected
    function updateInteractionUI(element) {
        if (!element.interactions) {
            element.interactions = initInteractionProperties();
        }
        
        const interactions = element.interactions;
        
        // Click settings
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
        
        // Hover settings
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
        
        // Show/hide settings based on enabled state
        $('#clickInteractionSettings').toggleClass('hidden', !interactions.click.enabled);
        $('#hoverInteractionSettings').toggleClass('hidden', !interactions.hover.enabled);
        
        // Show/hide action-specific settings
        updateClickActionSettings(interactions.click.action);
        updateHoverActionSettings(interactions.hover.action);
        
        // Update target element dropdowns
        updateTargetElementDropdowns();
    }
    
    // Update target element dropdowns with available elements
    function updateTargetElementDropdowns() {
        const clickSelect = $('#clickTargetElement');
        const hoverSelect = $('#hoverTargetElement');
        
        // Save current values that should be preserved
        const clickValue = clickSelect.val() || 'self';
        const hoverValue = hoverSelect.val() || 'self';
        
        // Clear existing options except "self"
        clickSelect.find('option:not([value="self"])').remove();
        hoverSelect.find('option:not([value="self"])').remove();
        
        // Add all elements as options
        elements.forEach(el => {
            const label = getElementLabel(el);
            const option = `<option value="${el.id}">${label}</option>`;
            clickSelect.append(option);
            hoverSelect.append(option);
        });
        
        // Restore the saved values
        clickSelect.val(clickValue);
        hoverSelect.val(hoverValue);
    }
    
    // Get human-readable label for element
    function getElementLabel(element) {
        if (element.type === 'text') {
            return `Text: ${element.text.substring(0, 15)}`;
        } else if (element.type === 'clickthrough') {
            const clickIndex = elements.filter(el => el.type === 'clickthrough').findIndex(el => el.id === element.id) + 1;
            return `Click${clickIndex}`;
        } else if (element.type === 'invisible') {
            const invisibleIndex = elements.filter(el => el.type === 'invisible').findIndex(el => el.id === element.id) + 1;
            return `Invisible${invisibleIndex}`;
        } else if (element.type === 'shape') {
            const shapeIndex = elements.filter(el => el.type === 'shape').findIndex(el => el.id === element.id) + 1;
            return `Shape${shapeIndex}`;
        } else if (element.type === 'video') {
            return `Video: ${element.videoName}`;
        } else {
            return element.filename || 'Image';
        }
    }
    
    // Update click action-specific settings visibility
    function updateClickActionSettings(action) {
        $('#clickShadowSettings').addClass('hidden');
        $('#clickGlowSettings').addClass('hidden');
        $('#clickScaleSettings').addClass('hidden');
        
        if (action === 'addShadow') {
            $('#clickShadowSettings').removeClass('hidden');
        } else if (action === 'addGlow') {
            $('#clickGlowSettings').removeClass('hidden');
        } else if (action === 'scale') {
            $('#clickScaleSettings').removeClass('hidden');
        }
    }
    
    // Update hover action-specific settings visibility
    function updateHoverActionSettings(action) {
        $('#hoverShadowSettings').addClass('hidden');
        $('#hoverGlowSettings').addClass('hidden');
        $('#hoverScaleSettings').addClass('hidden');
        
        if (action === 'addShadow') {
            $('#hoverShadowSettings').removeClass('hidden');
        } else if (action === 'addGlow') {
            $('#hoverGlowSettings').removeClass('hidden');
        } else if (action === 'scale') {
            $('#hoverScaleSettings').removeClass('hidden');
        }
    }
    
    // Save interaction settings to selected element or folder
    function saveInteractionSettings() {
        saveState();
        let target = null;
        
        if (selectedFolder) {
            target = groups.find(g => g.id === selectedFolder);
        } else if (selectedElement) {
            target = elements.find(el => el.id === selectedElement);
        }
        
        if (!target) return;
        saveState();
        if (!target.interactions) {
            target.interactions = initInteractionProperties();
        }
        
        // Save click settings
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
        
        // Save hover settings
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
        
        _log('Interaction settings saved:', target.interactions);
        
        // If it's a folder, reapply interactions to the canvas folder element
        if (selectedFolder) {
            const $folderElement = $(`#${selectedFolder}.canvas-folder`);
            if ($folderElement.length) {
                applyFolderInteractions(target, $folderElement);
            }
        }
        
        
    }
    
    // Apply folder interactions to canvas folder wrapper
    function applyFolderInteractions(folder, $folderElement) {
        if (!folder.interactions) return;
        
        const folderId = folder.id;
        
        // Remove existing event handlers
        $folderElement.off('click mouseenter mouseleave');
        
        // Click interaction
        if (folder.interactions.click.enabled) {
            $folderElement.on('click', function(e) {
                // Prevent event from bubbling to canvas
                e.stopPropagation();
                
                const action = folder.interactions.click.action;
                const targetElement = folder.interactions.click.targetElement;
                
                if (action === 'pauseAnimation') {
                    stopTimeline();
                } else if (action === 'playAnimation') {
                    playTimeline();
                } else if (action === 'toggleAnimation') {
                    if (isPlaying) {
                        stopTimeline();
                    } else {
                        playTimeline();
                    }
                } else if (action === 'addShadow') {
                    const shadow = `${folder.interactions.click.shadowX}px ${folder.interactions.click.shadowY}px ${folder.interactions.click.shadowBlur}px ${folder.interactions.click.shadowColor}`;
                    $folderElement.css('box-shadow', shadow);
                } else if (action === 'addGlow') {
                    const glow = `${folder.interactions.click.glowX}px ${folder.interactions.click.glowY}px ${folder.interactions.click.glowBlur}px ${folder.interactions.click.glowColor}`;
                    $folderElement.css('box-shadow', glow);
                } else if (action === 'scale') {
                    const scale = folder.interactions.click.scaleAmount || 1.1;
                    $folderElement.css('transform', `scale(${scale})`);
                    $folderElement.css('transition', 'transform 0.3s ease');
                } else if (action === 'hide') {
                    $folderElement.css('visibility', 'hidden');
                } else if (action === 'show') {
                    $folderElement.css('visibility', 'visible');
                }
            });
        }
        
        // Hover interaction
        if (folder.interactions.hover.enabled) {
            $folderElement.on('mouseenter', function(e) {
                const action = folder.interactions.hover.action;
                
                if (action === 'addShadow') {
                    const shadow = `${folder.interactions.hover.shadowX}px ${folder.interactions.hover.shadowY}px ${folder.interactions.hover.shadowBlur}px ${folder.interactions.hover.shadowColor}`;
                    $folderElement.css('box-shadow', shadow);
                    $folderElement.css('transition', 'box-shadow 0.3s ease');
                } else if (action === 'addGlow') {
                    const glow = `${folder.interactions.hover.glowX}px ${folder.interactions.hover.glowY}px ${folder.interactions.hover.glowBlur}px ${folder.interactions.hover.glowColor}`;
                    $folderElement.css('box-shadow', glow);
                    $folderElement.css('transition', 'box-shadow 0.3s ease');
                } else if (action === 'scale') {
                    const scale = folder.interactions.hover.scaleAmount || 1.1;
                    $folderElement.css('transform', `scale(${scale})`);
                    $folderElement.css('transition', 'transform 0.3s ease');
                }
            });
            
            $folderElement.on('mouseleave', function(e) {
                // Reset on mouse leave
                $folderElement.css('box-shadow', '');
                $folderElement.css('transform', '');
            });
        }
    }
    
    // ============================================
    // CANVAS MANAGEMENT
    // ============================================
    function addImageToCanvas(url, filename) {
        elementCounter++;
        const id = `element_${elementCounter}`;
        
        // For SVGs, extract dimensions from the SVG markup directly
        function getSvgDimensions(dataUrl) {
            try {
                const svgText = decodeURIComponent(
                    dataUrl.startsWith('data:image/svg+xml,')
                        ? dataUrl.slice('data:image/svg+xml,'.length)
                        : atob(dataUrl.split(',')[1])
                );
                const parser = new DOMParser();
                const doc = parser.parseFromString(svgText, 'image/svg+xml');
                const svgEl = doc.querySelector('svg');
                if (!svgEl) return null;
                // Try width/height attributes first
                const w = parseFloat(svgEl.getAttribute('width'));
                const h = parseFloat(svgEl.getAttribute('height'));
                if (w > 0 && h > 0) return { width: w, height: h };
                // Fall back to viewBox
                const vb = svgEl.getAttribute('viewBox');
                if (vb) {
                    const parts = vb.trim().split(/[\s,]+/);
                    if (parts.length === 4) return { width: parseFloat(parts[2]), height: parseFloat(parts[3]) };
                }
            } catch(e) {}
            return null;
        }

        function placeOnCanvas(natW, natH) {
            if (!natW || !natH) { natW = canvasWidth; natH = canvasWidth; }
            const aspectRatio = natH / natW;
            const fitWidth = canvasWidth;
            const fitHeight = Math.round(fitWidth * aspectRatio);
            
            const element = {
                id: id,
                type: 'image',
                src: url,
                filename: filename,
                aspectRatio: aspectRatio,  // Store aspect ratio for export
                borderRadius: 0,  // Initialize border radius
                x: 0,  // Start at X = 0
                y: 0,  // Start at Y = 0
                width: fitWidth,
                height: fitHeight,
                rotation: 0,
                opacity: 1,
                zIndex: elements.length,
                animations: [],
                interactions: initInteractionProperties()
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
            
            appendElementToCanvas($element, element);
            updateLayersList();
            selectElement(id);
        }

        // SVG: extract dimensions from markup, no need for Image()
        if (url.includes('image/svg')) {
            const dims = getSvgDimensions(url);
            placeOnCanvas(dims ? dims.width : 0, dims ? dims.height : 0);
            return;
        }

        // Raster images: use Image() to get natural dimensions
        const img = new Image();
        img.onload = function() { placeOnCanvas(img.width, img.height); };
        img.onerror = function() {
            _err('Failed to load image:', filename);
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
            window.adBuilderHistory.push(window.adBuilderStore.getState());
            canvasWidth = width;
            canvasHeight = height;
            syncCanvasSizeToStore();
            updateCanvasSize();
        }
    }
    
    function updateCustomCanvasSize() {
        const width = parseInt($('#customWidth').val()) || 300;
        const height = parseInt($('#customHeight').val()) || 250;
        window.adBuilderHistory.push(window.adBuilderStore.getState());
        canvasWidth = width;
        canvasHeight = height;
        syncCanvasSizeToStore();
        updateCanvasSize();
    }
    
    // ============================================
    // ELEMENT INTERACTION
    // ============================================
    function handleElementMouseDown(e) {
        if ($(e.target).hasClass('resize-handle')) return;
        
        // Don't prevent default if clicking on video controls
        const $target = $(e.target);
        const isVideoControl = $target.is('video') || $target.closest('video').length > 0;
        
        if (!isVideoControl) {
            e.preventDefault();
        }
        e.stopPropagation();
        
        const $element = $(e.currentTarget);
        const id = $element.attr('id');
        const element = elements.find(el => el.id === id);
        if (!element) return;
        
        // Check if element is in a folder
        const inFolder = element.folderId !== undefined && element.folderId !== null;
        
        // Multi-click detection (within 300ms)
        const currentTime = Date.now();
        const isSameElement = lastClickedElement === id;
        const isWithinTimeWindow = (currentTime - lastClickTime < 300);
        
        if (isSameElement && isWithinTimeWindow) {
            clickCount++;
        } else {
            clickCount = 1;
        }
        
        lastClickTime = currentTime;
        lastClickedElement = id;
        
        const isDoubleClick = clickCount === 2;
        
        // Don't start dragging if clicking on video controls
        if (isVideoControl) {
            return;
        }
        
        // Check if we have an element selected from a folder
        const currentSelectedElement = selectedElement ? elements.find(el => el.id === selectedElement) : null;
        const selectedElementInFolder = currentSelectedElement && currentSelectedElement.folderId;
        
        if (inFolder) {
            // Check if this element is already individually selected
            if (selectedElement === id) {
                // Element is already selected → enable dragging
                isDragging = true;
            } else if (clickCount === 1) {
                // First click on element in folder → select folder and enable folder dragging
                if (selectedElementInFolder && selectedElement !== id) {
                    // Element from folder is selected, clicking different element → deselect and select folder
                    selectFolder(element.folderId);
                } else {
                    // Normal single click → select folder
                    selectFolder(element.folderId);
                }
                // Enable dragging folder via child element on first click
                isDragging = true;
            } else if (isDoubleClick) {
                // Second click (double-click) → select individual element
                selectElement(id);
                return; // Don't start dragging on second click
            }
        } else {
            // Element not in folder → always select element and allow dragging
            selectElement(id);
            isDragging = true;
        }
        
        // Only set up drag offset if dragging is enabled
        if (!isDragging) return;
        
        const canvasOffset = $canvas.offset();
        const $canvasContainer = $('#canvasContainer').parent();
        const scrollLeft = $canvasContainer.scrollLeft() || 0;
        const scrollTop = $canvasContainer.scrollTop() || 0;
        
        if (selectedFolder) {
            // Dragging folder via child element
            const folder = groups.find(g => g.id === element.folderId);
            if (folder) {
                // Initialize folder position if not set
                if (folder.x === undefined) folder.x = 0;
                if (folder.y === undefined) folder.y = 0;
                
                dragOffset = {
                    x: (e.pageX + scrollLeft - canvasOffset.left) / stageZoom - folder.x,
                    y: (e.pageY + scrollTop - canvasOffset.top) / stageZoom - folder.y
                };
            }
        } else {
            // Dragging individual element
            dragOffset = {
                x: (e.pageX + scrollLeft - canvasOffset.left) / stageZoom - element.x,
                y: (e.pageY + scrollTop - canvasOffset.top) / stageZoom - element.y
            };
        }
    }
    
    function handleFolderMouseDown(e) {
        const folderId = $(e.currentTarget).attr('id');
        
        // Allow selecting folder by clicking on it (even if not already selected)
        e.preventDefault();
        e.stopPropagation();
        
        // Select folder on click
        selectFolder(folderId);
        
        isDragging = true;
        
        const folder = groups.find(g => g.id === folderId);
        if (!folder) return;
        
        const canvasOffset = $canvas.offset();
        const $canvasContainer = $('#canvasContainer').parent();
        const scrollLeft = $canvasContainer.scrollLeft() || 0;
        const scrollTop = $canvasContainer.scrollTop() || 0;
        
        // Store initial mouse position and folder offset
        dragOffset = {
            x: (e.pageX + scrollLeft - canvasOffset.left) / stageZoom - (folder.x || 0),
            y: (e.pageY + scrollTop - canvasOffset.top) / stageZoom - (folder.y || 0)
        };
    }
    
    function handleCanvasMouseDown(e) {
        // Only deselect if clicking directly on canvas (not on elements or folders)
        if ($(e.target).is('#canvas')) {
            // Clicking on blank canvas - deselect everything
            selectedElement = null;
            syncSelectedElementToStore();
            selectedFolder = null;
            clickCount = 0; // Reset click count
            lastClickedElement = null;
            
            $('.canvas-element').removeClass('selected');
            $('.canvas-folder').removeClass('selected');
            $('.layer-item').removeClass('selected');
            $('.timeline-track').removeClass('selected');
            $('.timeline-folder').removeClass('selected');
            
            updatePropertiesPanel();
        }
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
        if (!selectedElement && !selectedFolder) return;
        
        const canvasOffset = $canvas.offset();
        const $canvasContainer = $('#canvasContainer').parent();
        const scrollLeft = $canvasContainer.scrollLeft() || 0;
        const scrollTop = $canvasContainer.scrollTop() || 0;
        
        if (isDragging && selectedFolder) {
            // Dragging a folder - move all child elements by delta
            const folder = groups.find(g => g.id === selectedFolder);
            if (!folder) return;
            
            // Initialize folder position if not set
            if (folder.x === undefined) folder.x = 0;
            if (folder.y === undefined) folder.y = 0;
            
            // Calculate new folder position based on mouse and drag offset
            let newFolderX = (e.pageX + scrollLeft - canvasOffset.left) / stageZoom - dragOffset.x;
            let newFolderY = (e.pageY + scrollTop - canvasOffset.top) / stageZoom - dragOffset.y;
            
            // Calculate delta from previous folder position
            const deltaX = newFolderX - folder.x;
            const deltaY = newFolderY - folder.y;
            
            // Update folder position
            folder.x = newFolderX;
            folder.y = newFolderY;
            
            // Move all child elements by the delta
            const folderElements = elements.filter(el => el.folderId === folder.id);
            folderElements.forEach(element => {
                element.x += deltaX;
                element.y += deltaY;
                
                const $element = $(`#${element.id}`);
                $element.css({
                    left: element.x + 'px',
                    top: element.y + 'px'
                });
            });
            
            // Update folder wrapper bounds
            updateFolderBounds(folder.id);
            
            updatePropertiesPanel();
            return;
        }
        
        if (!selectedElement) return;
        
        const element = elements.find(el => el.id === selectedElement);
        if (!element) return;
        
        const $element = $(`#${selectedElement}`);
        
        if (isDragging) {
            // Account for zoom, scroll, and canvas offset
            let newX = (e.pageX + scrollLeft - canvasOffset.left) / stageZoom - dragOffset.x;
            let newY = (e.pageY + scrollTop - canvasOffset.top) / stageZoom - dragOffset.y;
            
            // Calculate delta from current position
            const deltaX = newX - element.x;
            const deltaY = newY - element.y;
            
            // Check if this is an individually selected element in a folder
            const isIndividuallySelected = selectedElement && element.folderId && !selectedFolder;
            
            if (element.folderId && !isIndividuallySelected) {
                // Element in folder but folder is selected - move all elements
                const folderElements = elements.filter(el => el.folderId === element.folderId);
                folderElements.forEach(el => {
                    el.x += deltaX;
                    el.y += deltaY;
                    
                    const $el = $(`#${el.id}`);
                    $el.css({
                        left: el.x + 'px',
                        top: el.y + 'px'
                    });
                });
            } else {
                // Element not in folder OR individually selected - move only this element
                element.x = newX;
                element.y = newY;
                
                $element.css({
                    left: newX + 'px',
                    top: newY + 'px'
                });
            }
            
            updatePropertiesPanel();
        } else if (isResizing) {
            // Account for zoom and scroll when resizing
            const mouseX = (e.pageX + scrollLeft - canvasOffset.left) / stageZoom;
            const mouseY = (e.pageY + scrollTop - canvasOffset.top) / stageZoom;
            
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
    
    // Update folder visual bounds to wrap child elements
    function updateFolderBounds(folderId) {
        const $folder = $(`#${folderId}`);
        if ($folder.length === 0) return;
        
        const bounds = calculateFolderBounds(folderId);
        $folder.css({
            left: bounds.left + 'px',
            top: bounds.top + 'px',
            width: bounds.width + 'px',
            height: bounds.height + 'px'
        });
    }
    
    // Update all folder bounds
    function updateAllFolderBounds() {
        groups.forEach(folder => {
            updateFolderBounds(folder.id);
        });
    }
    
    function handleMouseUp() {
        if (isDragging || isResizing) {

            updateAllFolderBounds(); // Update folder bounds after moving elements
        }
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
            syncSelectedElementToStore();
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
        syncSelectedElementToStore();
        selectedFolder = null; // Clear folder selection
        
        $('.canvas-element').removeClass('selected');
        $('.canvas-folder').removeClass('selected'); // Remove from folders
        $(`#${id}`).addClass('selected');
        
        $('.layer-item').removeClass('selected');
        $(`.layer-item[data-id="${id}"]`).addClass('selected');
        
        $('.timeline-track').removeClass('selected');
        $(`.timeline-track[data-element-id="${id}"]`).addClass('selected');
        
        $('.timeline-folder').removeClass('selected');
        
        updatePropertiesPanel();
    }
    
    // Select folder
    function selectFolder(folderId) {
        selectedFolder = folderId;
        selectedElement = null; // Clear element selection
        syncSelectedElementToStore();n
        
        $('.canvas-element').removeClass('selected');
        $('.canvas-folder').removeClass('selected'); // Remove from all folders
        $('.layer-item').removeClass('selected');
        $('.timeline-track').removeClass('selected');
        
        $('.timeline-folder').removeClass('selected');
        $(`.timeline-folder[data-folder-id="${folderId}"]`).addClass('selected');
        
        // Add selected class to canvas folder for dragging
        $(`#${folderId}.canvas-folder`).addClass('selected');
        
        updateFolderPropertiesPanel();
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
            syncSelectedElementToStore();
            $propertiesPanel.addClass('hidden');
        }
        
        updateLayersList();
        rebuildTimeline();
    }
    
    function handleAddLayerAnimation(e) {
        e.stopPropagation();
        const id = $(e.currentTarget).data('id');
        
        _log('handleAddLayerAnimation clicked, id:', id);
        
        if (!id) {
            _err('No element ID found');
            alert('No element ID found. Please try again.');
            return;
        }
        
        // Check if it's a folder or element
        if (id.startsWith('folder_')) {
            _log('Selecting folder:', id);
            selectFolder(id);
        } else {
            _log('Selecting element:', id);
            selectElement(id);
        }
        
        _log('selectedElement after selection:', selectedElement);
        
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
    
    function toggleFolderVisibility(e) {
        e.stopPropagation();
        const id = $(e.currentTarget).data('id') || $(e.currentTarget).data('folder-id');
        const folder = groups.find(g => g.id === id);
        if (!folder) return;
        
        // Toggle folder visibility
        folder.visible = folder.visible === false ? true : false;
        
        // Update all elements in folder
        const folderElements = elements.filter(el => el.folderId === folder.id);
        folderElements.forEach(element => {
            const $el = $(`#${element.id}`);
            if (folder.visible === false) {
                $el.css('visibility', 'hidden');
            } else {
                $el.css('visibility', 'visible');
            }
        });
        
        // Update folder wrapper visibility
        const $folderWrapper = $(`#${folder.id}`);
        if (folder.visible === false) {
            $folderWrapper.css('visibility', 'hidden');
        } else {
            $folderWrapper.css('visibility', 'visible');
        }
        
        updateTimelineTracks();
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
        
        // IMPORTANT: Always show all common properties grid for elements
        $('#commonPropertiesGrid').removeClass('hidden');
        
        // Reset panel heading to "Properties"
        $('#propertiesPanel h2').text('Properties');
        
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
            $('#propClickUrl').val(element.url || ''); // Show empty if no URL
            $('#propClickIndex').val(element.clickIndex || 1);
            $('#propClickTarget').val(element.target || '_blank');
            $('#imageBorderRadius').addClass('hidden');
        } else {
            $clickthroughProps.addClass('hidden');
        }
        
        // Show border radius for images
        if (element.type === 'image') {
            $('#imageBorderRadius').removeClass('hidden');
            $('#propImageBorderRadius').val(element.borderRadius || 0);
        } else {
            $('#imageBorderRadius').addClass('hidden');
        }
        
        // Show/hide shape properties
        const $shapeProps = $('#shapeProps');
        if (element.type === 'shape') {
            $shapeProps.removeClass('hidden');
            $('#propShapeType').val(element.shapeType);
            $('#propShapeColor').val(element.fillColor);
            $('#propShapeTransparent').prop('checked', element.transparent || false);
            $('#propShapeBorderWidth').val(element.borderWidth || 0);
            $('#propShapeBorderColor').val(element.borderColor || '#000000');
            $('#propShapeBorderRadius').val(element.borderRadius || 0);
            
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
        
        // Common properties - Always ensure they are visible for elements
        $('#propWidth').closest('div').removeClass('hidden');
        $('#propHeight').closest('div').removeClass('hidden');
        $('#propX').closest('div').removeClass('hidden');
        $('#propY').closest('div').removeClass('hidden');
        $('#propRotation').closest('div').removeClass('hidden');
        $('#propOpacity').closest('div').removeClass('hidden');
        
        $('#propWidth').val(Math.round(element.width));
        $('#propHeight').val(Math.round(element.height));
        $('#propX').val(Math.round(element.x));
        $('#propY').val(Math.round(element.y));
        $('#propRotation').val(element.rotation);
        $('#propOpacity').val(element.opacity);
        $('#opacityValue').text(Math.round(element.opacity * 100) + '%');
        
        // Update interaction UI
        updateInteractionUI(element);
    }
    
    // Update properties panel for folders
    function updateFolderPropertiesPanel() {
        if (!selectedFolder) {
            $propertiesPanel.addClass('hidden');
            return;
        }
        
        const folder = groups.find(g => g.id === selectedFolder);
        if (!folder) {
            $propertiesPanel.addClass('hidden');
            return;
        }
        
        // Show properties panel with folder info
        $propertiesPanel.removeClass('hidden');
        
        // Hide ALL type-specific properties for folders
        $textProps.addClass('hidden');
        $('#clickthroughProps').addClass('hidden');
        $('#shapeProps').addClass('hidden');
        $('#videoProps').addClass('hidden');
        
        // Hide common properties grid for folders (folders don't have position/size)
        $('#commonPropertiesGrid').addClass('hidden');
        
        // Set folder opacity
        const folderOpacity = folder.opacity !== undefined ? folder.opacity : 1;
        $('#propOpacity').val(folderOpacity);
        $('#opacityValue').text(Math.round(folderOpacity * 100) + '%');
        
        // Show interactions section for folders
        $('#interactionsSection').removeClass('hidden');
        
        // Initialize folder interactions if not exists
        if (!folder.interactions) {
            folder.interactions = {
                click: { enabled: false, targetElement: 'self', action: 'pauseAnimation' },
                hover: { enabled: false, targetElement: 'self', action: 'addShadow' }
            };
        }
        
        // Update interaction UI for folder
        updateInteractionUI(folder);
        
        // Update panel heading to show folder name
        $('#propertiesPanel h2').text(`Folder: ${folder.name}`);
        
        _log('Folder properties panel updated:', folder);
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
        const opacityValue = parseFloat($(this).val());
        $('#opacityValue').text(Math.round(opacityValue * 100) + '%');
        
        if (selectedFolder) {
            // Update folder opacity
            const folder = groups.find(g => g.id === selectedFolder);
            if (folder) {
                folder.opacity = opacityValue;
                // Apply opacity to folder wrapper and all child elements
                $(`#${selectedFolder}`).css('opacity', opacityValue);
                const folderElements = elements.filter(el => el.folderId === selectedFolder);
                folderElements.forEach(el => {
                    $(`#${el.id}`).css('opacity', opacityValue);
                });
            }
        } else if (selectedElement) {
            // Update element opacity
            const element = elements.find(el => el.id === selectedElement);
            if (element) {
                element.opacity = opacityValue;
                $(`#${selectedElement}`).css('opacity', opacityValue);
            }
        }
    }
    
    // Text property updates
    function updateTextContent() {
        saveState();
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
    
    function updateClickIndex() {
        if (!selectedElement) return;
        const element = elements.find(el => el.id === selectedElement);
        if (element.type !== 'clickthrough') return;
        element.clickIndex = Math.min(10, Math.max(1, parseInt($(this).val()) || 1));
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
        const bgColor = element.transparent ? 'transparent' : element.fillColor;
        $(`#${selectedElement}`).css('background-color', bgColor);
    }
    
    function updateShapeTransparent() {
        if (!selectedElement) return;
        const element = elements.find(el => el.id === selectedElement);
        if (element.type !== 'shape') return;
        
        element.transparent = $(this).is(':checked');
        const bgColor = element.transparent ? 'transparent' : element.fillColor;
        $(`#${selectedElement}`).css('background-color', bgColor);
    }
    
    function updateShapeBorder() {
        if (!selectedElement) return;
        const element = elements.find(el => el.id === selectedElement);
        if (element.type !== 'shape') return;
        
        element.borderWidth = parseInt($('#propShapeBorderWidth').val()) || 0;
        element.borderColor = $('#propShapeBorderColor').val();
        
        const $elem = $(`#${selectedElement}`);
        if (element.borderWidth > 0) {
            $elem.css({
                'border': `${element.borderWidth}px solid ${element.borderColor}`,
                'box-sizing': 'border-box'
            });
        } else {
            $elem.css('border', 'none');
        }
    }
    
    function updateShapeBorderRadius() {
        if (!selectedElement) return;
        const element = elements.find(el => el.id === selectedElement);
        if (element.type !== 'shape') return;
        
        element.borderRadius = parseInt($('#propShapeBorderRadius').val()) || 0;
        
        let borderRadius = '0';
        if (element.shapeType === 'circle') {
            borderRadius = '50%';
        } else if (element.shapeType === 'rounded-rectangle') {
            borderRadius = '12px';
        } else if (element.borderRadius > 0) {
            borderRadius = element.borderRadius + 'px';
        }
        
        $(`#${selectedElement}`).css('border-radius', borderRadius);
    }
    
    function updateImageBorderRadius() {
        if (!selectedElement) return;
        const element = elements.find(el => el.id === selectedElement);
        if (element.type !== 'image') return;
        
        element.borderRadius = parseInt($('#propImageBorderRadius').val()) || 0;
        
        const borderRadius = element.borderRadius > 0 ? element.borderRadius + 'px' : '0';
        $(`#${selectedElement}`).css('border-radius', borderRadius);
        $(`#${selectedElement} img`).css('border-radius', borderRadius);
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
        
        const mutedIcon = element.muted ? '🔇 Muted' : '🔊 Sound';
        const controlsText = element.controls ? ' | ⚙ Controls' : '';
        
        const $element = $(`#${element.id}`);
        // Target the first child div (info display), not the resize handles
        $element.css('overflow', 'hidden');
        $element.children('div').first().css({'width': '100%', 'padding': '0 8px', 'boxSizing': 'border-box', 'overflow': 'hidden'}).html(`
            <i class="fas fa-video" style="font-size: 32px; margin-bottom: 8px;"></i>
            <div>${element.videoName}</div>
            <div style="font-size: 11px; opacity: 0.7; word-break: break-all; overflow: hidden;">${element.videoUrl}</div>
            <div style="font-size: 11px; margin-top: 4px;">${playTriggerText} ${mutedIcon}${controlsText}</div>
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
        _log('openAnimationModal called, selectedElement:', selectedElement, 'selectedFolder:', selectedFolder);
        
        if (!selectedElement && !selectedFolder) {
            _err('No element or folder selected');
            alert('Please select an element or folder first by clicking on it in the canvas or layers panel');
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
        
        _log('Opening animation modal');
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
        const folderId = $(e.currentTarget).data('folder-id');
        
        // Check if this is a folder animation or element animation
        let target, anim;
        
        if (folderId) {
            // Folder animation
            target = groups.find(g => g.id === folderId);
            if (!target) return;
            
            anim = target.animations.find(a => a.id === animId);
            if (!anim) return;
            
            // Populate modal with animation data
            editingAnimation = { folderId, animId };
            selectFolder(folderId);
        } else {
            // Element animation
            target = elements.find(el => el.id === elementId);
            if (!target) return;
            
            anim = target.animations.find(a => a.id === animId);
            if (!anim) return;
            
            // Populate modal with animation data
            editingAnimation = { elementId, animId };
            selectElement(elementId);
        }
        
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
        _log('saveAnimation called');
        _log('selectedElement:', selectedElement);
        _log('selectedFolder:', selectedFolder);
        
        // Check if we're editing a folder or element
        const isFolder = selectedFolder !== null;
        const target = isFolder ? 
            groups.find(g => g.id === selectedFolder) : 
            elements.find(el => el.id === selectedElement);
        
        _log('isFolder:', isFolder);
        _log('target:', target);
        
        if (!target) {
            _err('No target found!');
            alert('Error: No element or folder selected. Please try again.');
            return;
        }
        
        // Ensure animations array exists
        if (!target.animations) {
            _warn('Target has no animations array, initializing...');
            target.animations = [];
        }
        
        // Get all selected animation types from dropdowns
        const selectedTypes = [];
        const fade = $('#animFade').val();
        const slide = $('#animSlide').val();
        const zoom = $('#animZoom').val();
        const rotate = $('#animRotate').val();
        
        _log('Animation values - fade:', fade, 'slide:', slide, 'zoom:', zoom, 'rotate:', rotate);
        
        if (fade) selectedTypes.push(fade);
        if (slide) selectedTypes.push(slide);
        if (zoom) selectedTypes.push(zoom);
        if (rotate) selectedTypes.push(rotate);
        
        _log('selectedTypes:', selectedTypes);
        
        if (selectedTypes.length === 0) {
            alert('Please select at least one animation effect');
            return;
        }
        
        const start = Math.round(parseFloat($('#animStart').val()) * 10) / 10;
        const duration = Math.round(parseFloat($('#animDuration').val()) * 10) / 10;
        const ease = $('#animEase').val();
        
        _log('Animation params - start:', start, 'duration:', duration, 'ease:', ease);
        
        if (editingAnimation) {
            // Update existing animation
            _log('Updating existing animation:', editingAnimation);
            const anim = target.animations.find(a => a.id === editingAnimation.animId);
            if (anim && selectedTypes.length > 0) {
                anim.type = selectedTypes[0];
                anim.start = start;
                anim.duration = duration;
                anim.ease = ease;
                anim.types = selectedTypes; // Store all types for multi-animation
            }
        } else {
            // Add new animations - create one timeline item with multiple types
            _log('Creating new animation');
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
            
            _log('New animation object:', animation);
            target.animations.push(animation);
            _log('Target animations after push:', target.animations);
        }
        
        _log('Saving state and updating timeline...');
        rebuildTimeline();
        updateTimelineTracks();
        closeAnimationModal();
        _log('Animation saved successfully');
    }
    
    function deleteEditingAnimation() {
        saveState();
        if (!editingAnimation) return;
        
        // Check if it's a folder or element animation
        const isFolderAnim = editingAnimation.folderId !== undefined;
        const target = isFolderAnim ? 
            groups.find(g => g.id === editingAnimation.folderId) :
            elements.find(el => el.id === editingAnimation.elementId);
        
        if (target) {
            target.animations = target.animations.filter(a => a.id !== editingAnimation.animId);
            rebuildTimeline();
            updateTimelineTracks();
        }
        
        closeAnimationModal();
    }
    
    function handleDeleteAnimation(e) {
        saveState();
        const animId = $(e.currentTarget).data('anim-id');
        const elementId = $(e.currentTarget).data('element-id');
        const folderId = $(e.currentTarget).data('folder-id');
        
        if (folderId) {
            // Delete folder animation
            const folder = groups.find(g => g.id === folderId);
            if (folder) {
                folder.animations = folder.animations.filter(a => a.id !== animId);
                rebuildTimeline();
                updateTimelineTracks();
            }
        } else if (elementId) {
            // Delete element animation
            const element = elements.find(el => el.id === elementId);
            if (element) {
                element.animations = element.animations.filter(a => a.id !== animId);
                rebuildTimeline();
                updateTimelineTracks();
            }
        }
    }
    
    function updateTimelineDuration() {
        const newDuration = parseFloat($('#timelineDuration').val());
        if (newDuration && newDuration >= 1 && newDuration <= 30) {
            saveState();
            totalDuration = newDuration;
            syncTimelineDurationToStore();
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
        saveState();
        totalDuration = Math.max(totalDuration - 2, 2);
        syncTimelineDurationToStore();
        $('#timelineDuration').val(totalDuration);
        updateTimelineRuler();
        updateTimelineTracks();
    }
    
    function zoomOut() {
        // Zoom out = increase duration to see more time
        saveState();
        totalDuration = Math.min(totalDuration + 2, 30);
        syncTimelineDurationToStore();
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
        if (elements.length === 0 && groups.length === 0) {
            $timelineTracks.html('<div class="text-center text-gray-500 text-sm py-8">Add elements and animations to see timeline</div>');
            return;
        }
        
        $timelineTracks.empty();
        
        // Helper function to get element icon and label
        function getElementIconAndLabel(element) {
            let icon, label;
            
            if (element.type === 'text') {
                icon = 'fa-font';
                label = element.name || element.text.substring(0, 15);
            } else if (element.type === 'clickthrough') {
                icon = 'fa-mouse-pointer';
                const clickthroughElements = elements.filter(el => el.type === 'clickthrough');
                const clickIndex = clickthroughElements.findIndex(el => el.id === element.id) + 1;
                label = element.name || `Click${clickIndex}`;
            } else if (element.type === 'invisible') {
                icon = 'fa-eye-slash';
                const invisibleElements = elements.filter(el => el.type === 'invisible');
                const invisibleIndex = invisibleElements.findIndex(el => el.id === element.id) + 1;
                label = element.name || `Invisible${invisibleIndex}`;
            } else if (element.type === 'shape') {
                icon = 'fa-shapes';
                const shapeElements = elements.filter(el => el.type === 'shape');
                const shapeIndex = shapeElements.findIndex(el => el.id === element.id) + 1;
                label = element.name || `Shape${shapeIndex}`;
            } else if (element.type === 'video') {
                icon = 'fa-video';
                label = element.name || element.videoName;
            } else {
                icon = 'fa-image';
                label = element.name || (element.filename || 'Image').substring(0, 15);
            }
            
            return { icon, label };
        }
        
        // Helper function to render a timeline track for an element
        function renderTrack(element) {
            const { icon, label } = getElementIconAndLabel(element);
            
            const $track = $(`
                <li class="timeline-track layer" data-element-id="${element.id}">
                    <div class="timeline-track-label">
                        <span class="timeline-handle">⋮⋮</span>
                        <i class="fas ${icon} text-blue-400 mr-2"></i>
                        <span class="truncate flex-1 track-name-label" data-element-id="${element.id}">${label}</span>
                        <div class="flex items-center gap-1 ml-2">
                            <button class="timeline-layer-btn toggle-visibility" data-id="${element.id}" title="Toggle visibility">
                                <i class="fas ${element.hidden ? 'fa-eye-slash' : 'fa-eye'} text-xs"></i>
                            </button>
                            <button class="timeline-layer-btn add-layer-anim" data-id="${element.id}" title="Add animation">
                                <i class="fas fa-plus text-xs"></i>
                            </button>
                            <button class="timeline-layer-btn delete-layer" data-id="${element.id}" title="Delete layer">
                                <i class="fas fa-trash text-xs"></i>
                            </button>
                        </div>
                    </div>
                    <div class="timeline-track-content" id="track_${element.id}"></div>
                </li>
            `);
            
            // Add animation blocks
            element.animations.forEach(anim => {
                const leftPercent = (anim.start / totalDuration) * 100;
                const widthPercent = (anim.duration / totalDuration) * 100;
                
                const types = anim.types || [anim.type];
                const animLabel = types.length > 1 ? `${types.length} effects` : types[0];
                
                const $block = $(`
                    <div class="timeline-block" style="left: ${leftPercent}%; width: ${widthPercent}%;" 
                         data-anim-id="${anim.id}" data-element-id="${element.id}">
                        <div class="timeline-block-resize-handle left"></div>
                        <div class="timeline-block-label">${animLabel}</div>
                        <button class="delete-anim" data-anim-id="${anim.id}" data-element-id="${element.id}">
                            <i class="fas fa-times"></i>
                        </button>
                        <div class="timeline-block-resize-handle right"></div>
                    </div>
                `);
                
                $track.find('.timeline-track-content').append($block);
            });
            
            return $track;
        }
        
        // Combine folders and root elements, sort by zIndex (highest first)
        const elementsInFolders = new Set();
        
        // Create array of items with their type and zIndex for sorting
        const timelineItems = [];
        
        // Add folders
        groups.forEach(group => {
            timelineItems.push({
                type: 'folder',
                data: group,
                zIndex: group.zIndex
            });
        });
        
        // Add root elements (not in folders)
        elements.forEach(element => {
            if (!element.folderId) {
                timelineItems.push({
                    type: 'element',
                    data: element,
                    zIndex: element.zIndex
                });
            }
        });
        
        // Sort all items by zIndex (highest first) to maintain proper order
        timelineItems.sort((a, b) => b.zIndex - a.zIndex);
        
        // Render items in sorted order (folders and elements mixed)
        timelineItems.forEach(item => {
            if (item.type === 'folder') {
                const group = item.data;
                const $folder = $(`
                    <li class="timeline-folder${group.collapsed ? ' collapsed' : ''}" data-folder-id="${group.id}">
                        <div class="timeline-folder-row">
                            <div class="timeline-folder-header">
                                <span class="timeline-handle">⋮⋮</span>
                                <span class="timeline-folder-toggle">${group.collapsed ? '▸' : '▾'}</span>
                                <i class="fas fa-folder text-yellow-400 mr-2"></i>
                                <span class="flex-1 track-name-label" data-folder-id="${group.id}">${group.name}</span>
                                <div class="flex items-center gap-1 ml-2">
                                    <button class="timeline-layer-btn toggle-folder-visibility" data-id="${group.id}" title="Toggle folder visibility">
                                        <i class="fas ${group.visible === false ? 'fa-eye-slash' : 'fa-eye'} text-xs"></i>
                                    </button>
                                    <button class="timeline-layer-btn add-layer-anim" data-id="${group.id}" title="Add animation to folder">
                                        <i class="fas fa-plus text-xs"></i>
                                    </button>
                                    <button class="timeline-layer-btn delete-folder" data-id="${group.id}" title="Delete folder">
                                        <i class="fas fa-trash text-xs"></i>
                                    </button>
                                </div>
                            </div>
                            <div class="timeline-track-content folder-track-content" id="track_${group.id}"></div>
                        </div>
                        <ul class="timeline-folder-children"></ul>
                    </li>
                `);
                
                // Add folder animation blocks
                if (group.animations && group.animations.length > 0) {
                    group.animations.forEach(anim => {
                        const leftPercent = (anim.start / totalDuration) * 100;
                        const widthPercent = (anim.duration / totalDuration) * 100;
                        
                        const types = anim.types || [anim.type];
                        const animLabel = types.length > 1 ? `${types.length} effects` : types[0];
                        
                        const $block = $(`
                            <div class="timeline-block folder-anim-block" style="left: ${leftPercent}%; width: ${widthPercent}%; background-color: #fbbf24;" 
                                 data-anim-id="${anim.id}" data-folder-id="${group.id}">
                                <div class="timeline-block-resize-handle left"></div>
                                <div class="timeline-block-label">${animLabel}</div>
                                <button class="delete-anim" data-anim-id="${anim.id}" data-folder-id="${group.id}">
                                    <i class="fas fa-times"></i>
                                </button>
                                <div class="timeline-block-resize-handle right"></div>
                            </div>
                        `);
                        
                        $folder.find('.folder-track-content').append($block);
                    });
                }
                
                // Add elements that belong to this folder
                const folderElements = elements.filter(el => el.folderId === group.id);
                folderElements.sort((a, b) => b.zIndex - a.zIndex);
                
                folderElements.forEach(element => {
                    elementsInFolders.add(element.id);
                    $folder.find('.timeline-folder-children').append(renderTrack(element));
                });
                
                $timelineTracks.append($folder);
            } else {
                // Render root element
                $timelineTracks.append(renderTrack(item.data));
            }
        });
        
        // Initialize jQuery UI sortable
        initTimelineSortable();
    }
    
    // Initialize timeline sortable system
    function initTimelineSortable() {
        // Destroy existing sortables
        if ($timelineTracks.hasClass('ui-sortable')) {
            $timelineTracks.sortable('destroy');
        }
        $('.timeline-folder-children').each(function() {
            if ($(this).hasClass('ui-sortable')) {
                $(this).sortable('destroy');
            }
        });
        
        // Root sortable: accepts both layers and folders, they can be mixed
        $timelineTracks.sortable({
            items: '> .layer, > .timeline-folder',
            connectWith: '.timeline-folder-children',  // Allow layers to move into folders
            handle: '.timeline-handle',
            placeholder: 'ui-sortable-placeholder',
            tolerance: 'pointer',
            forcePlaceholderSize: true,
            update: function(e, ui) {
                updateStructureFromDOM();
            }
        });
        
        // Folder children sortable: only accepts layers
        $('.timeline-folder-children').sortable({
            items: '> .layer',
            connectWith: '#timelineTracks, .timeline-folder-children',  // Can move back to root OR other folders
            handle: '.timeline-handle',
            placeholder: 'ui-sortable-placeholder',
            tolerance: 'pointer',
            forcePlaceholderSize: true,
            receive: function(e, ui) {
                // Block folders from being moved into folders
                if (ui.item.hasClass('timeline-folder')) {
                    $(this).sortable('cancel');
                }
            },
            update: function(e, ui) {
                updateStructureFromDOM();
            }
        });
    }
    
    // Update element and folder data from DOM structure
    function updateStructureFromDOM() {
        
        const maxZIndex = elements.length + groups.length;
        let currentZIndex = maxZIndex;
        
        // Process folders and elements in DOM order (they can be mixed)
        $('#timelineTracks > li').each(function(index) {
            if ($(this).hasClass('timeline-folder')) {
                // Update folder zIndex
                const folderId = $(this).data('folder-id');
                const group = groups.find(g => g.id === folderId);
                if (group) {
                    group.zIndex = currentZIndex--;
                    
                    // Update elements in this folder
                    let folderZIndex = group.zIndex * 100; // Offset for folder children
                    $(this).find('.timeline-folder-children > li').each(function() {
                        const elementId = $(this).data('element-id');
                        const element = elements.find(el => el.id === elementId);
                        if (element) {
                            element.folderId = folderId;
                            element.zIndex = folderZIndex--;
                            
                            // Move DOM element into folder wrapper
                            const $element = $(`#${element.id}`);
                            let $folderWrapper = $(`#${folderId}`);
                            
                            // Create folder wrapper if it doesn't exist
                            if ($folderWrapper.length === 0) {
                                $folderWrapper = $(`
                                    <div class="canvas-folder" id="${folderId}" style="
                                        position: absolute;
                                        left: 0;
                                        top: 0;
                                        width: 100%;
                                        height: 100%;
                                        pointer-events: auto;
                                        z-index: ${group.zIndex};
                                    "></div>
                                `);
                                $canvas.append($folderWrapper);
                                
                                // Apply folder interactions
                                applyFolderInteractions(group, $folderWrapper);
                            }
                            
                            // Move element into folder wrapper
                            if ($element.parent().attr('id') !== folderId) {
                                $folderWrapper.append($element);
                            }
                            
                            $element.css('z-index', element.zIndex);
                        }
                    });
                }
            } else {
                // Update root element
                const elementId = $(this).data('element-id');
                const element = elements.find(el => el.id === elementId);
                if (element) {
                    element.folderId = null; // Remove from folder
                    element.zIndex = currentZIndex--;
                    
                    // Move DOM element back to canvas root
                    const $element = $(`#${element.id}`);
                    if ($element.parent().hasClass('canvas-folder')) {
                        $canvas.append($element);
                    }
                    
                    $element.css('z-index', element.zIndex);
                }
            }
        });
        
        _log('Structure updated from DOM');
        updateLayersList();
    }
    
    // ============================================
    // FOLDER MANAGEMENT
    // ============================================
    
    // Create new folder
    function createFolder() {
        saveState(); // Save state for undo
        folderCounter++;
        const folderId = `folder_${folderCounter}`;
        
        const folder = {
            id: folderId,
            name: `Folder ${folderCounter}`,
            zIndex: elements.length + groups.length,
            collapsed: false,
            visible: true, // Folder visibility
            x: 0, // Folder position offset
            y: 0,
            animations: [] // Folder can have animations
        };
        
        groups.push(folder);
        
        updateTimelineTracks();
        
        _log('Folder created:', folder);
    }
    
    // Toggle folder expand/collapse
    function toggleFolder(e) {
        e.stopPropagation();
        const $folder = $(this).closest('.timeline-folder');
        const folderId = $folder.data('folder-id');
        const group = groups.find(g => g.id === folderId);
        
        if (group) {
            group.collapsed = !group.collapsed;
            $folder.toggleClass('collapsed');
            $(this).text(group.collapsed ? '▸' : '▾');
        }
    }
    
    // Delete folder
    function deleteFolder(e) {
        saveState(); // Save state before deletion
        e.stopPropagation();
        const folderId = $(this).data('id');
        const group = groups.find(g => g.id === folderId);
        
        if (!group) return;
        
        
        
        // Move elements out of folder back to root
        elements.forEach(element => {
            if (element.folderId === folderId) {
                element.folderId = null;
            }
        });
        
        // Remove folder
        groups = groups.filter(g => g.id !== folderId);
        
        updateTimelineTracks();
        updateLayersList();
        
        _log('Folder deleted:', folderId);
    }
    
    // ============================================
    // UNDO/REDO SYSTEM
    // ============================================
    
    // Save current state to undo stack
    function saveState() {
        const state = {
            elements: JSON.parse(JSON.stringify(elements)),
            groups: JSON.parse(JSON.stringify(groups)),
            canvasWidth: canvasWidth,
            canvasHeight: canvasHeight,
            totalDuration: totalDuration
        };

        undoStack.push(state);

        if (undoStack.length > MAX_UNDO_STACK) {
            undoStack.shift();
        }

        redoStack = [];
        _log('State saved. Undo stack:', undoStack.length);
    }
    
    // Undo last action
    function undo() {
        if (undoStack.length === 0) {
            _log('Nothing to undo');
            return;
        }
        
        // Save current state to redo stack
        const currentState = {
            elements: JSON.parse(JSON.stringify(elements)),
            groups: JSON.parse(JSON.stringify(groups)),
            canvasWidth: canvasWidth,
            canvasHeight: canvasHeight,
            totalDuration: totalDuration
        };
        redoStack.push(currentState);
        
        // Restore previous state
        const previousState = undoStack.pop();
        elements = previousState.elements;
        groups = previousState.groups;
        canvasWidth = previousState.canvasWidth ?? canvasWidth;
        canvasHeight = previousState.canvasHeight ?? canvasHeight;
        totalDuration = previousState.totalDuration ?? totalDuration;

        updateCanvasSize();
        $('#timelineDuration').val(totalDuration);
        updateTimelineRuler();

        // Update UI
        updateCanvas();
        updateTimelineTracks();
        updateLayersList();
        
        _log('Undo performed. Undo stack:', undoStack.length, 'Redo stack:', redoStack.length);
    }
    
    // Redo last undone action
    function redo() {
        if (redoStack.length === 0) {
            _log('Nothing to redo');
            return;
        }
        
        // Save current state to undo stack
        const currentState = {
            elements: JSON.parse(JSON.stringify(elements)),
            groups: JSON.parse(JSON.stringify(groups)),
            canvasWidth: canvasWidth,
            canvasHeight: canvasHeight,
            totalDuration: totalDuration
        };
        undoStack.push(currentState);
        
        // Restore redo state
        const nextState = redoStack.pop();
        elements = nextState.elements;
        groups = nextState.groups;
        canvasWidth = nextState.canvasWidth ?? canvasWidth;
        canvasHeight = nextState.canvasHeight ?? canvasHeight;
        totalDuration = nextState.totalDuration ?? totalDuration;

        updateCanvasSize();
        $('#timelineDuration').val(totalDuration);
        updateTimelineRuler();

        // Update UI
        updateCanvas();
        updateTimelineTracks();
        updateLayersList();
        
        _log('Redo performed. Undo stack:', undoStack.length, 'Redo stack:', redoStack.length);
    }
    
    // Calculate bounding box for folder based on child elements
    function calculateFolderBounds(folderId) {
        const folder = groups.find(g => g.id === folderId);
        const folderElements = elements.filter(el => el.folderId === folderId);
        
        // Folder always fills the entire canvas
        return {
            left: 0,
            top: 0,
            width: canvasWidth,
            height: canvasHeight
        };
    }
    
    // Update canvas elements from state
    function updateCanvas() {
        $canvas.find('.canvas-element, .canvas-folder').remove();
        
        // Create folder wrappers first
        groups.forEach(folder => {
            const bounds = calculateFolderBounds(folder.id);
            const $folderWrapper = $(`
                <div class="canvas-folder" id="${folder.id}" style="
                    position: absolute;
                    left: ${bounds.left}px;
                    top: ${bounds.top}px;
                    width: ${bounds.width}px;
                    height: ${bounds.height}px;
                    z-index: ${folder.zIndex};
                    pointer-events: auto;
                "></div>
            `);
            $canvas.append($folderWrapper);
            
            // Apply folder interactions
            applyFolderInteractions(folder, $folderWrapper);
        });
        
        // Restore elements and place them in folders or root
        elements.forEach(element => {
            const $element = createElementDOM(element);
            
            if (element.folderId) {
                // Append to folder wrapper
                $(`#${element.folderId}`).append($element);
            } else {
                // Append to canvas root
                $canvas.append($element);
            }
        });
    }
    
    // Create DOM element from element data
    // Get absolute position for element (always use element.x, element.y as absolute positions)
    function getAbsolutePosition(element) {
        // Elements always store absolute positions, even when in folders
        return {
            x: element.x,
            y: element.y
        };
    }
    
    function createElementDOM(element) {
        const pos = getAbsolutePosition(element);
        let $element;
        
        if (element.type === 'text') {
            $element = $(`
                <div class="canvas-element text-element" id="${element.id}" style="
                    left: ${pos.x}px;
                    top: ${pos.y}px;
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
                    ${element.text}
                    <div class="resize-handle nw"></div>
                    <div class="resize-handle ne"></div>
                    <div class="resize-handle sw"></div>
                    <div class="resize-handle se"></div>
                </div>
            `);
        } else if (element.type === 'shape') {
            let shapeStyle = `background-color: ${element.fillColor};`;
            if (element.shapeType === 'circle') {
                shapeStyle += ' border-radius: 50%;';
            } else if (element.shapeType === 'rounded-rectangle') {
                shapeStyle += ' border-radius: 12px;';
            } else if (element.borderRadius > 0) {
                shapeStyle += ` border-radius: ${element.borderRadius}px;`;
            }
            
            $element = $(`
                <div class="canvas-element" id="${element.id}" style="
                    left: ${pos.x}px;
                    top: ${pos.y}px;
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
        } else if (element.type === 'clickthrough') {
            $element = $(`
                <div class="canvas-element clickthrough-element" id="${element.id}" style="
                    left: ${pos.x}px;
                    top: ${pos.y}px;
                    width: ${element.width}px;
                    height: ${element.height}px;
                    opacity: ${element.opacity};
                    transform: rotate(${element.rotation}deg);
                    z-index: ${element.zIndex};
                    background: repeating-linear-gradient(
                        45deg,
                        rgba(168, 85, 247, 0.1),
                        rgba(168, 85, 247, 0.1) 10px,
                        rgba(168, 85, 247, 0.2) 10px,
                        rgba(168, 85, 247, 0.2) 20px
                    );
                    border: 2px dashed rgba(168, 85, 247, 0.5);
                ">
                    <div style="text-align: center; color: rgba(168, 85, 247, 0.8); pointer-events: none;">
                        <i class="fas fa-mouse-pointer text-2xl mb-2"></i>
                        <div class="text-xs">Clickthrough</div>
                        ${element.url ? `<div class="text-xs font-bold">${element.url}</div>` : ''}
                    </div>
                    <div class="resize-handle nw"></div>
                    <div class="resize-handle ne"></div>
                    <div class="resize-handle sw"></div>
                    <div class="resize-handle se"></div>
                </div>
            `);
        } else if (element.type === 'invisible') {
            $element = $(`
                <div class="canvas-element invisible-element" id="${element.id}" style="
                    left: ${pos.x}px;
                    top: ${pos.y}px;
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
        } else if (element.type === 'image') {
            $element = $(`
                <div class="canvas-element" id="${element.id}" style="
                    left: ${pos.x}px;
                    top: ${pos.y}px;
                    width: ${element.width}px;
                    height: ${element.height}px;
                    opacity: ${element.opacity};
                    transform: rotate(${element.rotation}deg);
                    z-index: ${element.zIndex};
                ">
                    <img src="${element.src}" style="width: 100%; height: 100%; object-fit: contain; pointer-events: none;" />
                    <div class="resize-handle nw"></div>
                    <div class="resize-handle ne"></div>
                    <div class="resize-handle sw"></div>
                    <div class="resize-handle se"></div>
                </div>
            `);
        } else if (element.type === 'video') {
            const playText = element.playTrigger === 'autoplay' ? '▶ Autoplay' : 
                           element.playTrigger === 'onclick' ? '👆 Click to Play' : 
                           '👁 On View';
            
            $element = $(`
                <div class="canvas-element" id="${element.id}" style="
                    left: ${pos.x}px;
                    top: ${pos.y}px;
                    width: ${element.width}px;
                    height: ${element.height}px;
                    opacity: ${element.opacity};
                    transform: rotate(${element.rotation}deg);
                    z-index: ${element.zIndex};
                    background-color: #000;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    overflow: hidden;
                    color: #fff;
                    font-size: 14px;
                    border: 2px solid #e53e3e;
                ">
                    <div style="text-align: center; width: 100%; padding: 0 8px; box-sizing: border-box; overflow: hidden;">
                        <i class="fas fa-video" style="font-size: 32px; margin-bottom: 8px;"></i>
                        <div>${element.videoName}</div>
                        <div style="font-size: 11px; opacity: 0.7; word-break: break-all; overflow: hidden;">${element.videoUrl}</div>
                        <div style="font-size: 11px; margin-top: 4px;">
                            ${playText} ${element.muted ? '🔇 Muted' : '🔊 Sound'} ${element.controls ? '⚙ Controls' : ''}
                        </div>
                    </div>
                    <div class="resize-handle nw"></div>
                    <div class="resize-handle ne"></div>
                    <div class="resize-handle sw"></div>
                    <div class="resize-handle se"></div>
                </div>
            `);
        }
        
        return $element;
    }
    
    // Helper function to append element to canvas or folder
    function appendElementToCanvas($element, element) {
        if (!$element) return;
        
        if (element.folderId) {
            // Check if folder wrapper exists, create if not
            let $folder = $(`#${element.folderId}`);
            if ($folder.length === 0) {
                const folder = groups.find(g => g.id === element.folderId);
                if (folder) {
                    $folder = $(`
                        <div class="canvas-folder" id="${folder.id}" style="
                            position: absolute;
                            left: 0;
                            top: 0;
                            width: 100%;
                            height: 100%;
                            pointer-events: none;
                            z-index: ${folder.zIndex};
                        "></div>
                    `);
                    $canvas.append($folder);
                }
            }
            $folder.append($element);
        } else {
            $canvas.append($element);
        }
    }
    
    // ============================================
    // REBUILD TIMELINE
    // ============================================
    
    function rebuildTimeline() {
        timeline.clear();
        timeline.repeat(0); // Reset repeat, will be set in playTimeline
        
        // Process folder animations first
        groups.forEach(folder => {
            if (!folder.animations || folder.animations.length === 0) return;
            
            folder.animations.forEach(anim => {
                const types = anim.types || [anim.type];
                
                // Get all elements in this folder
                const folderElements = elements.filter(el => el.folderId === folder.id);
                
                // Apply animation to each element in the folder
                folderElements.forEach(element => {
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
        });
        
        // Process individual element animations
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
            case 'slideToLeft':
                props.x = -canvasWidth;
                break;
            case 'slideToRight':
                props.x = canvasWidth;
                break;
            case 'slideToUp':
                props.y = -canvasHeight;
                break;
            case 'slideToDown':
                props.y = canvasHeight;
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
        // Check if there are any animations on elements or folders
        const hasElementAnimations = elements.some(el => el.animations && el.animations.length > 0);
        const hasFolderAnimations = groups.some(g => g.animations && g.animations.length > 0);
        
        if (elements.length === 0 || (!hasElementAnimations && !hasFolderAnimations)) {
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
        _log('Raw banner name:', bannerName);
        
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
        
        _log('Final banner name:', bannerName);
        
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
                _log(`Saved image_${i}.png - element: ${element.id}, zIndex: ${element.zIndex}`);
            } catch (error) {
                _err('Error adding image to zip:', error);
            }
        }
        
        zip.generateAsync({ type: 'blob' }).then(function(content) {
            _log('Saving as:', `${bannerName}.zip`);
            saveAs(content, `${bannerName}.zip`);
        });
    }
    
    function generateManifest() {
        // clickTagCount = highest unique clickIndex used across all clickthrough elements
        const clickthroughEls = elements.filter(el => el.type === 'clickthrough');
        const clickTagCount = clickthroughEls.length === 0 ? 0 :
            Math.max(...clickthroughEls.map(el => el.clickIndex || 1));
        
        // Get video elements
        const videoElements = elements.filter(el => el.type === 'video');
        
        // Get canvas dimensions
        const width = canvasWidth;
        const height = canvasHeight;
        
        let manifestContent = `FT.manifest({
    "filename": "index.html",
    "width": ${width},
    "height": ${height},
    "clickTagCount": ${clickTagCount}`;
        
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
        if (dataUrl.includes('image/svg')) return 'svg';
        if (dataUrl.includes('image/webp')) return 'webp';
        return 'jpg';
    }
    
        function getExtensionFromDataUrl(dataUrl) {
        if (dataUrl.includes('image/png')) return 'png';
        if (dataUrl.includes('image/gif')) return 'gif';
        if (dataUrl.includes('image/svg')) return 'svg';
        if (dataUrl.includes('image/webp')) return 'webp';
        return 'jpg';
    }
    
    function generateHTML(usePoliteLoad = true) {
        let elementsHtml = '';
        let animationsJs = '';
        let clickthroughJs = '';
        
        // Debug: Log element z-indexes before sorting
        _log('Export - Elements before sort:', elements.map(el => ({
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
        
        _log('Export - Elements after sort:', sortedElements.map(el => ({
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
                const borderRadius = (element.borderRadius && element.borderRadius > 0) ? `border-radius: ${Math.round(element.borderRadius)}px;` : '';
                elementsHtml += `
        <img id="${element.id}" src="${imgSrc}" style="
            position: absolute;
            left: ${Math.round(element.x)}px;
            top: ${Math.round(element.y)}px;
            width: ${Math.round(element.width)}px;
            height: ${Math.round(element.height)}px;
            object-fit: contain;
            opacity: ${element.opacity};
            transform: rotate(${element.rotation}deg);
            ${borderRadius}
            z-index: ${element.zIndex};
            user-select: none;
            cursor: pointer;
        ">`;
                imageCounter++;
            } else if (element.type === 'text') {
                // Build text-shadow CSS (always-on effects)
                let textShadow = '';
                if (!element.shadowHover && (element.shadowX || element.shadowY || element.shadowBlur)) {
                    textShadow = `${Math.round(element.shadowX)}px ${Math.round(element.shadowY)}px ${Math.round(element.shadowBlur)}px ${element.shadowColor}`;
                }
                if (!element.glowHover && (element.glowX || element.glowY || element.glowBlur || element.glowSpread)) {
                    let glowShadow = `${Math.round(element.glowX)}px ${Math.round(element.glowY)}px ${Math.round(element.glowBlur)}px ${element.glowColor}`;
                    if (element.glowSpread > 0) {
                        const spreadLayers = [];
                        for (let i = 1; i <= element.glowSpread; i += 2) {
                            spreadLayers.push(`${Math.round(element.glowX)}px ${Math.round(element.glowY)}px ${Math.round(element.glowBlur + i)}px ${element.glowColor}`);
                        }
                        glowShadow = [glowShadow, ...spreadLayers].join(', ');
                    }
                    textShadow = textShadow ? `${textShadow}, ${glowShadow}` : glowShadow;
                }
                const textShadowStyle = textShadow ? `text-shadow: ${textShadow};` : '';
                
                // Build hover text-shadow (if hover effects exist)
                let hoverShadow = '';
                if (element.shadowHover && (element.shadowX || element.shadowY || element.shadowBlur)) {
                    hoverShadow = `${Math.round(element.shadowX)}px ${Math.round(element.shadowY)}px ${Math.round(element.shadowBlur)}px ${element.shadowColor}`;
                }
                if (element.glowHover && (element.glowX || element.glowY || element.glowBlur || element.glowSpread)) {
                    let glowShadow = `${Math.round(element.glowX)}px ${Math.round(element.glowY)}px ${Math.round(element.glowBlur)}px ${element.glowColor}`;
                    if (element.glowSpread > 0) {
                        const spreadLayers = [];
                        for (let i = 1; i <= element.glowSpread; i += 2) {
                            spreadLayers.push(`${Math.round(element.glowX)}px ${Math.round(element.glowY)}px ${Math.round(element.glowBlur + i)}px ${element.glowColor}`);
                        }
                        glowShadow = [glowShadow, ...spreadLayers].join(', ');
                    }
                    hoverShadow = hoverShadow ? `${hoverShadow}, ${glowShadow}` : glowShadow;
                }
                const hoverClass = (element.shadowHover || element.glowHover) ? ` class="text-hover-${element.id}"` : '';
                
                elementsHtml += `
        <div id="${element.id}"${hoverClass} style="
            position: absolute;
            left: ${Math.round(element.x)}px;
            top: ${Math.round(element.y)}px;
            width: ${Math.round(element.width)}px;
            height: ${Math.round(element.height)}px;
            opacity: ${element.opacity};
            transform: rotate(${element.rotation}deg);
            font-size: ${Math.round(element.fontSize)}px;
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
                // Always include data-url and data-click-index
                const clickIndex = element.clickIndex || 1;
                const dataAttrs = `data-url="${element.url || ''}" data-click-index="${clickIndex}"`;
                elementsHtml += `
        <div id="${element.id}" class="clickthrough-zone" ${dataAttrs} style="
            position: absolute;
            left: ${Math.round(element.x)}px;
            top: ${Math.round(element.y)}px;
            width: ${Math.round(element.width)}px;
            height: ${Math.round(element.height)}px;
            opacity: 0;
            z-index: ${element.zIndex};
            cursor: pointer;
        "></div>`;
            } else if (element.type === 'invisible') {
                // Invisible layer - render as an empty div with opacity 0
                elementsHtml += `
        <div id="${element.id}" style="
            position: absolute;
            left: ${Math.round(element.x)}px;
            top: ${Math.round(element.y)}px;
            width: ${Math.round(element.width)}px;
            height: ${Math.round(element.height)}px;
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
                
                // Background color (support transparent)
                const bgColor = element.transparent ? 'transparent' : (element.fillColor || '#ffffff');
                
                // Border style
                const borderStyle = (element.borderWidth && element.borderWidth > 0) 
                    ? `border: ${Math.round(element.borderWidth)}px solid ${element.borderColor || '#000000'}; box-sizing: border-box;`
                    : '';
                
                // Build box-shadow CSS (always-on effects)
                let boxShadow = '';
                if (!element.shadowHover && (element.shadowX || element.shadowY || element.shadowBlur || element.shadowSpread)) {
                    boxShadow = `${Math.round(element.shadowX)}px ${Math.round(element.shadowY)}px ${Math.round(element.shadowBlur)}px ${Math.round(element.shadowSpread)}px ${element.shadowColor}`;
                }
                if (!element.glowHover && (element.glowX || element.glowY || element.glowBlur || element.glowSpread)) {
                    const glowShadow = `${Math.round(element.glowX)}px ${Math.round(element.glowY)}px ${Math.round(element.glowBlur)}px ${Math.round(element.glowSpread)}px ${element.glowColor}`;
                    boxShadow = boxShadow ? `${boxShadow}, ${glowShadow}` : glowShadow;
                }
                const boxShadowStyle = boxShadow ? `box-shadow: ${boxShadow};` : '';
                
                // Build hover box-shadow
                let hoverShadow = '';
                if (element.shadowHover && (element.shadowX || element.shadowY || element.shadowBlur || element.shadowSpread)) {
                    hoverShadow = `${Math.round(element.shadowX)}px ${Math.round(element.shadowY)}px ${Math.round(element.shadowBlur)}px ${Math.round(element.shadowSpread)}px ${element.shadowColor}`;
                }
                if (element.glowHover && (element.glowX || element.glowY || element.glowBlur || element.glowSpread)) {
                    const glowShadow = `${Math.round(element.glowX)}px ${Math.round(element.glowY)}px ${Math.round(element.glowBlur)}px ${Math.round(element.glowSpread)}px ${element.glowColor}`;
                    hoverShadow = hoverShadow ? `${hoverShadow}, ${glowShadow}` : glowShadow;
                }
                
                elementsHtml += `
        <div id="${element.id}" style="
            position: absolute;
            left: ${Math.round(element.x)}px;
            top: ${Math.round(element.y)}px;
            width: ${Math.round(element.width)}px;
            height: ${Math.round(element.height)}px;
            opacity: ${element.opacity};
            transform: rotate(${element.rotation}deg);
            background-color: ${bgColor};
            border-radius: ${borderRadius};
            ${borderStyle}
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
            left: ${Math.round(element.x)}px;
            top: ${Math.round(element.y)}px;
            width: ${Math.round(element.width)}px;
            height: ${Math.round(element.height)}px;
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
        
        // Generate folder animations
        groups.forEach(folder => {
            if (!folder.animations || folder.animations.length === 0) return;
            
            folder.animations.forEach(anim => {
                const types = anim.types || [anim.type];
                
                // Get all elements in this folder
                const folderElements = elements.filter(el => el.folderId === folder.id);
                
                // Apply animation to each element in the folder
                folderElements.forEach(element => {
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
        });
        
        // Generate interaction JavaScript
        let interactionsJs = '';
        sortedElements.forEach((element) => {
            if (!element.interactions) return;
            
            const elemId = element.id;
            const interactions = element.interactions;
            
            // Click interactions
            if (interactions.click.enabled) {
                const target = interactions.click.targetElement === 'self' ? elemId : interactions.click.targetElement;
                const action = interactions.click.action;
                
                interactionsJs += `\n        document.getElementById('${elemId}').addEventListener('click', function() {`;
                
                if (action === 'pauseAnimation') {
                    interactionsJs += `\n            if (window.mainTimeline) window.mainTimeline.pause();`;
                } else if (action === 'playAnimation') {
                    interactionsJs += `\n            if (window.mainTimeline) window.mainTimeline.play();`;
                } else if (action === 'toggleAnimation') {
                    interactionsJs += `\n            if (window.mainTimeline) window.mainTimeline.paused() ? window.mainTimeline.play() : window.mainTimeline.pause();`;
                } else if (action === 'addShadow') {
                    const shadow = `${interactions.click.shadowX}px ${interactions.click.shadowY}px ${interactions.click.shadowBlur}px ${interactions.click.shadowColor}`;
                    interactionsJs += `\n            var targetEl = document.getElementById('${target}');`;
                    interactionsJs += `\n            targetEl.style.transition = '${element.type === 'text' ? 'text-shadow' : 'box-shadow'} 0.3s ease';`;
                    if (element.type === 'text') {
                        interactionsJs += `\n            targetEl.style.textShadow = '${shadow}';`;
                    } else {
                        interactionsJs += `\n            targetEl.style.boxShadow = '${shadow}';`;
                    }
                } else if (action === 'addGlow') {
                    const glow = `${interactions.click.glowX}px ${interactions.click.glowY}px ${interactions.click.glowBlur}px ${interactions.click.glowColor}`;
                    interactionsJs += `\n            var targetEl = document.getElementById('${target}');`;
                    interactionsJs += `\n            targetEl.style.transition = '${element.type === 'text' ? 'text-shadow' : 'box-shadow'} 0.3s ease';`;
                    if (element.type === 'text') {
                        interactionsJs += `\n            targetEl.style.textShadow = '${glow}';`;
                    } else {
                        interactionsJs += `\n            targetEl.style.boxShadow = '${glow}';`;
                    }
                } else if (action === 'scale') {
                    interactionsJs += `\n            var targetEl = document.getElementById('${target}');`;
                    interactionsJs += `\n            targetEl.style.transition = 'transform 0.3s ease';`;
                    interactionsJs += `\n            targetEl.style.transform = 'scale(${interactions.click.scaleAmount})';`;
                } else if (action === 'hide') {
                    interactionsJs += `\n            var targetEl = document.getElementById('${target}');`;
                    interactionsJs += `\n            targetEl.style.transition = 'opacity 0.3s ease';`;
                    interactionsJs += `\n            targetEl.style.opacity = '0';`;
                } else if (action === 'show') {
                    interactionsJs += `\n            var targetEl = document.getElementById('${target}');`;
                    interactionsJs += `\n            targetEl.style.transition = 'opacity 0.3s ease';`;
                    interactionsJs += `\n            targetEl.style.opacity = '1';`;
                }
                
                interactionsJs += `\n        });`;
            }
            
            // Hover interactions
            if (interactions.hover.enabled) {
                const target = interactions.hover.targetElement === 'self' ? elemId : interactions.hover.targetElement;
                const action = interactions.hover.action;
                
                interactionsJs += `\n        document.getElementById('${elemId}').addEventListener('mouseenter', function() {`;
                
                if (action === 'pauseAnimation') {
                    interactionsJs += `\n            if (window.mainTimeline) window.mainTimeline.pause();`;
                } else if (action === 'addShadow') {
                    const shadow = `${interactions.hover.shadowX}px ${interactions.hover.shadowY}px ${interactions.hover.shadowBlur}px ${interactions.hover.shadowColor}`;
                    interactionsJs += `\n            var targetEl = document.getElementById('${target}');`;
                    interactionsJs += `\n            targetEl.style.transition = '${element.type === 'text' ? 'text-shadow' : 'box-shadow'} 0.3s ease';`;
                    if (element.type === 'text') {
                        interactionsJs += `\n            targetEl.style.textShadow = '${shadow}';`;
                    } else {
                        interactionsJs += `\n            targetEl.style.boxShadow = '${shadow}';`;
                    }
                } else if (action === 'addGlow') {
                    const glow = `${interactions.hover.glowX}px ${interactions.hover.glowY}px ${interactions.hover.glowBlur}px ${interactions.hover.glowColor}`;
                    interactionsJs += `\n            var targetEl = document.getElementById('${target}');`;
                    interactionsJs += `\n            targetEl.style.transition = '${element.type === 'text' ? 'text-shadow' : 'box-shadow'} 0.3s ease';`;
                    if (element.type === 'text') {
                        interactionsJs += `\n            targetEl.style.textShadow = '${glow}';`;
                    } else {
                        interactionsJs += `\n            targetEl.style.boxShadow = '${glow}';`;
                    }
                } else if (action === 'scale') {
                    interactionsJs += `\n            var targetEl = document.getElementById('${target}');`;
                    interactionsJs += `\n            targetEl.style.transition = 'transform 0.3s ease';`;
                    interactionsJs += `\n            targetEl.style.transform = 'scale(${interactions.hover.scaleAmount})';`;
                }
                
                interactionsJs += `\n        });`;
                
                // Mouse leave to restore
                interactionsJs += `\n        document.getElementById('${elemId}').addEventListener('mouseleave', function() {`;
                
                if (action === 'addShadow' || action === 'addGlow') {
                    interactionsJs += `\n            var targetEl = document.getElementById('${target}');`;
                    interactionsJs += `\n            targetEl.style.transition = '${element.type === 'text' ? 'text-shadow' : 'box-shadow'} 0.3s ease';`;
                    if (element.type === 'text') {
                        interactionsJs += `\n            targetEl.style.textShadow = '';`;
                    } else {
                        interactionsJs += `\n            targetEl.style.boxShadow = '';`;
                    }
                } else if (action === 'scale') {
                    interactionsJs += `\n            var targetEl = document.getElementById('${target}');`;
                    interactionsJs += `\n            targetEl.style.transition = 'transform 0.3s ease';`;
                    interactionsJs += `\n            targetEl.style.transform = 'scale(1)';`;
                }
                
                interactionsJs += `\n        });`;
            }
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
                    const clickIndex = parseInt(this.getAttribute('data-click-index')) || 1;
                    myFT.clickTag(clickIndex, url);
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
                    video.addEventListener('click', function(e) {
                        // Don't toggle play/pause if clicking on video controls
                        // Check if click is on the video controls area (bottom ~40px)
                        const videoRect = this.getBoundingClientRect();
                        const clickY = e.clientY - videoRect.top;
                        const hasControls = this.hasAttribute('controls');
                        const controlsHeight = 40; // Approximate height of controls bar
                        const clickedOnControls = hasControls && clickY > (videoRect.height - controlsHeight);
                        
                        if (!clickedOnControls) {
                            // Only toggle play/pause if not clicking on controls
                            if (this.paused) {
                                this.play();
                            } else {
                                this.pause();
                            }
                        }
                    });
                }
                // autoplay is handled by the autoplay attribute
            });
            ${clickthroughJs}
            ${interactionsJs}
            
            // GSAP Timeline Animation
            window.mainTimeline = gsap.timeline({ repeat: ${animLoop} });
            const tl = window.mainTimeline;
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
            case 'slideToLeft':
                props.x = -canvasWidth;
                break;
            case 'slideToRight':
                props.x = canvasWidth;
                break;
            case 'slideToUp':
                props.y = -canvasHeight;
                break;
            case 'slideToDown':
                props.y = canvasHeight;
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
        saveState();
        if (elements.length === 0) return;
        
        if (confirm('Are you sure you want to clear all elements?')) {
            saveState();
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
        // Get current canvas dimensions
        const currentWidth = canvasWidth;
        const currentHeight = canvasHeight;
        
        // Update the wrapper's transform scale and dimensions
        // Set wrapper size to scaled dimensions so it doesn't take up full space in layout
        $canvasWrapper.css({
            'transform': `scale(${stageZoom})`,
            'transform-origin': 'center center',
            'width': `${currentWidth}px`,
            'height': `${currentHeight}px`,
            // Use margin to compensate for transform scale space
            'margin': `${currentHeight * (1 - stageZoom) / 2}px ${currentWidth * (1 - stageZoom) / 2}px`
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
    
    // ============================================
    // SAVE/LOAD PROJECT FUNCTIONS
    // ============================================
    
    async function saveProject() {
        try {
            // Check if canvas is empty
            if (elements.length === 0) {
                alert('Nothing to save! Please add some elements to the canvas first.');
                return;
            }
            
            // Use the banner name from the input field
            let bannerName = ($('#bannerName').val() || '').trim();
            if (!bannerName) {
                bannerName = `${canvasWidth}x${canvasHeight}-banner`;
            }
            
            // Sanitize filename (remove special characters)
            const safeBannerName = bannerName.replace(/[^a-z0-9_-]/gi, '_') || 'banner';
            
            // Build image mapping first
            const imageMapping = {};
            let imageIndex = 0;
            
            elements.forEach(el => {
                if (el.type === 'image') {
                    imageIndex++;
                    const ext = getExtensionFromDataUrl(el.src);
                    const filename = `image_${imageIndex}.${ext}`;
                    imageMapping[el.id] = {
                        filename: filename,
                        dataUrl: el.src
                    };
                }
            });
            
            // Create project data
            const projectData = {
                version: '1.0',
                timestamp: new Date().toISOString(),
                bannerName: bannerName,  // Store original banner name
                canvasWidth: canvasWidth,
                canvasHeight: canvasHeight,
                totalDuration: totalDuration,
                animLoop: animLoop,  // GSAP repeat count (0 = once, 1 = twice, etc.)
                elements: elements.map(el => {
                    // For images, store reference to filename in ZIP
                    if (el.type === 'image') {
                        return {
                            ...el,
                            imageFile: imageMapping[el.id].filename  // Reference to file in ZIP
                        };
                    }
                    return el;
                }),
                groups: groups
            };
            
            // Create ZIP file
            const zip = new JSZip();
            
            // Add project.json
            zip.file('project.json', JSON.stringify(projectData, null, 2));
            
            // Add all images to ZIP
            for (const [elementId, imageData] of Object.entries(imageMapping)) {
                // Convert data URL to blob
                const base64Data = imageData.dataUrl.split(',')[1];
                zip.file(imageData.filename, base64Data, { base64: true });
            }
            
            // Generate ZIP
            const blob = await zip.generateAsync({ type: 'blob' });
            
            // Download ZIP with banner name
            const timestamp = new Date().toISOString().slice(0, 10);
            const filename = `${safeBannerName}-${timestamp}.zip`;
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            a.click();
            URL.revokeObjectURL(url);
            
            _log('Project saved successfully as:', filename);
        } catch (error) {
            _err('Error saving project:', error);
            alert('Error saving project. Please try again.');
        }
    }
    
    async function loadProject(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        try {
            // Read ZIP file
            const zip = await JSZip.loadAsync(file);
            
            // Extract project.json
            const projectJsonFile = zip.file('project.json');
            if (!projectJsonFile) {
                alert('Invalid project file: project.json not found');
                return;
            }
            
            const projectJson = await projectJsonFile.async('string');
            const projectData = JSON.parse(projectJson);
            
            // Load all images from ZIP into a map
            const imageDataUrls = {};
            const imageFiles = Object.keys(zip.files).filter(f => f.startsWith('image_'));
            
            for (const filename of imageFiles) {
                const imageFile = zip.file(filename);
                if (imageFile) {
                    const imageBlob = await imageFile.async('blob');
                    const dataUrl = await blobToDataURL(imageBlob);
                    imageDataUrls[filename] = dataUrl;
                }
            }
            
            // Clear current project
            elements.length = 0;
            groups.length = 0;
            selectedElement = null;
            syncSelectedElementToStore();
            selectedFolder = null;
            
            // Restore canvas settings
            canvasWidth = projectData.canvasWidth || 300;
            canvasHeight = projectData.canvasHeight || 250;
            syncCanvasSizeToStore();
            totalDuration = projectData.totalDuration || 5;
            syncTimelineDurationToStore();
            animLoop = projectData.animLoop !== undefined ? projectData.animLoop : 0;
            
            // Update UI (convert animLoop back to user-friendly loop count)
            $('#canvasSize').val(`${canvasWidth}x${canvasHeight}`);
            $('#totalDuration').val(totalDuration);
            $('#animLoop').val(animLoop + 1);  // UI shows 1-based count
            if (projectData.bannerName) {
                $('#bannerName').val(projectData.bannerName);
            }
            updateCanvasSize();
            
            // Restore elements with loaded images
            for (const element of projectData.elements) {
                if (element.type === 'image' && element.imageFile) {
                    // Replace imageFile reference with actual data URL
                    element.src = imageDataUrls[element.imageFile] || element.src;
                    delete element.imageFile;  // Clean up temporary field
                }
                elements.push(element);
            }
            
            // Restore groups
            if (projectData.groups) {
                groups.push(...projectData.groups);
            }
            
            // Increment elementCounter to avoid ID conflicts
            const maxId = Math.max(0, ...elements.map(el => {
                const match = el.id.match(/element_(\d+)/);
                return match ? parseInt(match[1]) : 0;
            }));
            elementCounter = maxId;
            
            // Increment folderCounter to avoid ID conflicts
            const maxFolderId = Math.max(0, ...groups.map(g => {
                const match = g.id.match(/folder_(\d+)/);
                return match ? parseInt(match[1]) : 0;
            }));
            folderCounter = maxFolderId;
            
            // Update display
            updateCanvas();
            updateLayersList();
            rebuildTimeline();
            updatePropertiesPanel();
            
            // Reset file input
            $('#loadProjectInput').val('');
            
            _log('Project loaded successfully!');
            alert('Project loaded successfully!');
        } catch (error) {
            _err('Error loading project:', error);
            alert('Error loading project. Please make sure the file is a valid project ZIP.');
        }
    }
    
    // Helper function to convert Blob to Data URL
    function blobToDataURL(blob) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    }
    
})();
    
