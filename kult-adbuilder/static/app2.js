// HTML5 Ad Builder - Full Featured Version
// ============================================
// PATCHED VERSION - Fixes applied:
//   FIX #2: Removed dead $('#addAnimBtn') binding — #addAnimBtn does not exist in HTML
//   FIX #3: Removed dead $('#animType') binding — #animType does not exist in HTML
//   FIX #4: All console.log/error/warn guarded by window.AD_BUILDER_DEBUG = true
//   FIX #6: Namespaced playhead mousemove/mouseup handlers (.playhead namespace)
//   FIX #7: Added missing saveState() to addClickthroughToCanvas
// To enable debug logging: window.AD_BUILDER_DEBUG = true;
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
    let timeline = gsap.timeline({ paused: true });
    let totalDuration = 5;
    let isPlaying = false;
    let playbackTimeout = null;
    let zoomLevel = 1;
    let animLoop = 0;
    let editingAnimation = null;
    
    let canvasWidth = 300;
    let canvasHeight = 250;
    let stageZoom = 1.0;
    stageZoom = Math.round(stageZoom * 4) / 4;
    
    let $canvas, $canvasWrapper, $layersList, $dropzone, $fileInput;
    let $propertiesPanel, $textProps, $animModal, $textModal;
    let $clickthroughModal, $shapeModal, $videoModal, $timelineTracks, $timelineRuler;
    
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
        $dropzone.on('click', () => $fileInput.click());
        $dropzone.on('dragover', handleDragOver);
        $dropzone.on('drop', handleDrop);
        $fileInput.on('change', handleFileSelect);
        
        $('#addTextBtn').on('click', openTextModal);
        $('#closeTextModal').on('click', closeTextModal);
        $('#saveTextBtn').on('click', saveText);
        $('#textContent').on('keypress', function(e) {
            if (e.which === 13) { e.preventDefault(); saveText(); }
        });
        $('#textModal').on('keydown', function(e) {
            if (e.keyCode === 27) { e.preventDefault(); closeTextModal(); }
        });
        
        $('#addClickthroughBtn').on('click', openClickthroughModal);
        $('#closeClickthroughModal').on('click', closeClickthroughModal);
        $('#saveClickthroughBtn').on('click', saveClickthrough);
        $('#addInvisibleBtn').on('click', addInvisibleLayer);
        
        $('#clickthroughUrl, #clickthroughTarget').on('keypress', function(e) {
            if (e.which === 13) { e.preventDefault(); saveClickthrough(); }
        });
        $('#clickthroughModal').on('keydown', function(e) {
            if (e.keyCode === 27) { e.preventDefault(); closeClickthroughModal(); }
        });
        
        $('#addShapeBtn').on('click', openShapeModal);
        $('#closeShapeModal').on('click', closeShapeModal);
        $('#saveShapeBtn').on('click', saveShape);
        $('#shapeOpacity').on('input', function() {
            const val = $(this).val();
            $('#shapeOpacityValue').text(Math.round(val * 100) + '%');
        });
        $('#shapeType, #shapeWidth, #shapeHeight, #shapeFillColor, #shapeOpacity, #shapeBorderRadius').on('keypress', function(e) {
            if (e.which === 13) { e.preventDefault(); saveShape(); }
        });
        $('#shapeModal').on('keydown', function(e) {
            if (e.keyCode === 27) { e.preventDefault(); closeShapeModal(); }
        });
        
        $('#addVideoBtn').on('click', openVideoModal);
        $('#closeVideoModal').on('click', closeVideoModal);
        $('#saveVideoBtn').on('click', saveVideo);
        
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
        
        $('#canvasSize').on('change', handleCanvasSizeChange);
        $('#customWidth, #customHeight').on('change', updateCustomCanvasSize);
        
        $canvas.on('mousedown', '.canvas-element', handleElementMouseDown);
        $canvas.on('mousedown', '.canvas-folder', handleFolderMouseDown);
        $canvas.on('mousedown', '.resize-handle', handleResizeStart);
        $canvas.on('mousedown', handleCanvasMouseDown);
        $(document).on('mousemove', handleMouseMove);
        $(document).on('mouseup', handleMouseUp);
        
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
        
        $layersList.on('click', '.layer-item', handleLayerClick);
        $layersList.on('click', '.delete-layer', handleDeleteLayer);
        $layersList.on('click', '.add-layer-anim', handleAddLayerAnimation);
        $layersList.on('click', '.toggle-layer-visibility', toggleLayerVisibility);
        $layersList.on('click', '.toggle-folder-visibility', toggleFolderVisibility);
        
        $('#propWidth').on('change', updateElementWidth);
        $('#propHeight').on('change', updateElementHeight);
        $('#propX').on('change', updateElementX);
        $('#propY').on('change', updateElementY);
        $('#propRotation').on('change', updateElementRotation);
        $('#propOpacity').on('input', updateElementOpacity);
        
        $('#propText').on('input', updateTextContent);
        $('#propFontFamily').on('change', updateFontFamily);
        $('#propFontSize').on('change', updateFontSize);
        $('#propColor').on('change', updateColor);
        
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
        
        $('#propClickUrl').on('change', updateClickUrl);
        $('#propClickIndex').on('change', updateClickIndex);
        $('#propClickTarget').on('change', updateClickTarget);
        
        $('#propShapeType').on('change', updateShapeType);
        $('#propShapeColor').on('change', updateShapeColor);
        $('#propShapeTransparent').on('change', updateShapeTransparent);
        $('#propShapeBorderWidth').on('change', updateShapeBorder);
        $('#propShapeBorderColor').on('change', updateShapeBorder);
        $('#propShapeBorderRadius').on('change', updateShapeBorderRadius);
        $('#propImageBorderRadius').on('change', updateImageBorderRadius);
        
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
        
        $('#propTextShadowX, #propTextShadowY, #propTextShadowBlur, #propTextShadowColor, #propTextShadowHover').on('change input', updateTextShadow);
        $('#propTextGlowX, #propTextGlowY, #propTextGlowBlur, #propTextGlowSpread, #propTextGlowColor, #propTextGlowHover').on('change input', updateTextGlow);
        $('#propShapeShadowX, #propShapeShadowY, #propShapeShadowBlur, #propShapeShadowSpread, #propShapeShadowColor, #propShapeShadowHover').on('change input', updateShapeShadow);
        $('#propShapeGlowX, #propShapeGlowY, #propShapeGlowBlur, #propShapeGlowSpread, #propShapeGlowColor, #propShapeGlowHover').on('change input', updateShapeGlow);
        
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
        // FIX #2: Removed dead $('#addAnimBtn').on('click', openAnimationModal) — #addAnimBtn does not exist in HTML.
        //         Animation modal is triggered via .add-layer-anim buttons (handleAddLayerAnimation).
        // FIX #3: Removed dead $('#animType').on('change', toggleCustomAnimProps) — #animType does not exist in HTML.
        //         Modal uses separate dropdowns: #animFade, #animSlide, #animZoom, #animRotate.
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
        
        $('#timelineDuration').on('change', updateTimelineDuration);
        $('#animLoop').on('change', updateAnimLoop);
        $('#zoomIn').on('click', zoomIn);
        $('#zoomOut').on('click', zoomOut);
        $('#playTimeline').on('click', playTimeline);
        $('#stopTimeline').on('click', stopTimeline);
        $('#timelinePlayhead').on('mousedown', handlePlayheadDragStart);
        
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
        
        $('#stageZoomIn').on('click', stageZoomIn);
        $('#stageZoomOut').on('click', stageZoomOut);
        $('#stageZoomReset').on('click', stageZoomReset);
        
        $(document).on('keydown', function(e) {
            const $focused = $(':focus');
            const isInputFocused = $focused.is('input, textarea');
            if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey && !isInputFocused) {
                e.preventDefault(); undo();
            } else if ((e.ctrlKey || e.metaKey) && e.key === 'z' && e.shiftKey && !isInputFocused) {
                e.preventDefault(); redo();
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
            if (!isPlaying && timeline) {
                const time = (percent / 100) * totalDuration;
                timeline.seek(time);
            }
        };
        
        const upHandler = function() {
            isPlayheadDragging = false;
            // FIX #6: Use namespaced off() to only remove these specific handlers
            $(document).off('mousemove.playhead mouseup.playhead');
        };
        
        // FIX #6: Namespace to prevent listener stacking on repeated drags
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
        
        const moveHandler = function(moveEvent) {
            const deltaX = moveEvent.pageX - startX;
            if (!hasMoved && Math.abs(deltaX) > 3) { hasMoved = true; isTimelineBlockDragging = true; }
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
                if (anim) { anim.start = Math.round(((newLeftPercent / 100) * totalDuration) * 10) / 10; }
            }
        };
        
        const upHandler = function() {
            $(document).off('mousemove', moveHandler);
            $(document).off('mouseup', upHandler);
            if (hasMoved) { rebuildTimeline(); }
            setTimeout(() => { isTimelineBlockDragging = false; draggedBlock = null; }, 50);
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
        if (files.length > 0) { Array.from(files).forEach(file => { uploadFile(file); }); }
    }
    
    function handleFileSelect(e) {
        const files = e.target.files;
        if (files.length > 0) { Array.from(files).forEach(file => { uploadFile(file); }); }
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
            // FIX #4: guarded console.error
            if (window.AD_BUILDER_DEBUG) { console.error('File read error:', error); }
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
        const element = {
            id, type: 'text', text,
            x: 50, y: 50, width: 200, height: 50, rotation: 0, opacity: 1,
            fontSize: 24, fontFamily: 'Arial', color: '#000000',
            bold: false, italic: false, underline: false, textAlign: 'left',
            shadowX: 0, shadowY: 0, shadowBlur: 0, shadowColor: '#000000', shadowHover: false,
            glowX: 0, glowY: 0, glowBlur: 0, glowSpread: 0, glowColor: '#ffffff', glowHover: false,
            zIndex: elements.length, animations: [], interactions: initInteractionProperties()
        };
        elements.push(element);
        const $element = $(`
            <div class="canvas-element text-element" id="${id}" style="
                left: ${element.x}px; top: ${element.y}px;
                width: ${element.width}px; height: ${element.height}px;
                opacity: ${element.opacity}; transform: rotate(${element.rotation}deg);
                font-size: ${element.fontSize}px; font-family: ${element.fontFamily};
                color: ${element.color}; font-weight: ${element.bold ? 'bold' : 'normal'};
                font-style: ${element.italic ? 'italic' : 'normal'};
                text-decoration: ${element.underline ? 'underline' : 'none'};
                text-align: ${element.textAlign}; line-height: 1.2; word-wrap: break-word;
                z-index: ${element.zIndex};">
                ${text}
                <div class="resize-handle nw"></div><div class="resize-handle ne"></div>
                <div class="resize-handle sw"></div><div class="resize-handle se"></div>
            </div>`);
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
    function openShapeModal() { $shapeModal.removeClass('hidden'); setTimeout(() => $('#shapeWidth').focus(), 100); }
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
        const element = {
            id, type: 'shape', shapeType, fillColor, borderRadius,
            borderWidth: 0, borderColor: '#000000', transparent: false,
            x: 50, y: 50, width, height, rotation: 0, opacity,
            shadowX: 0, shadowY: 0, shadowBlur: 0, shadowSpread: 0, shadowColor: '#000000', shadowHover: false,
            glowX: 0, glowY: 0, glowBlur: 0, glowSpread: 0, glowColor: '#ffffff', glowHover: false,
            zIndex: elements.length, animations: [], interactions: initInteractionProperties()
        };
        elements.push(element);
        let shapeStyle = `background-color: ${fillColor};`;
        if (shapeType === 'circle') { shapeStyle += ' border-radius: 50%;'; }
        else if (shapeType === 'rounded-rectangle') { shapeStyle += ' border-radius: 12px;'; }
        else if (borderRadius > 0) { shapeStyle += ` border-radius: ${borderRadius}px;`; }
        const $element = $(`
            <div class="canvas-element" id="${id}" style="
                left: ${element.x}px; top: ${element.y}px;
                width: ${element.width}px; height: ${element.height}px;
                opacity: ${element.opacity}; transform: rotate(${element.rotation}deg);
                z-index: ${element.zIndex}; ${shapeStyle}">
                <div class="resize-handle nw"></div><div class="resize-handle ne"></div>
                <div class="resize-handle sw"></div><div class="resize-handle se"></div>
            </div>`);
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
        $('#videoUrl').val(''); $('#videoName').val('video1');
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
        const element = {
            id, type: 'video', videoUrl, videoName, playTrigger, muted, controls,
            x: 0, y: 0, width: 300, height: 169, rotation: 0, opacity: 1,
            zIndex: elements.length, animations: [], interactions: initInteractionProperties()
        };
        elements.push(element);
        let playText = '';
        if (playTrigger === 'autoplay') { playText = '▶ Autoplay'; }
        else if (playTrigger === 'mouseover') { playText = '🖱 On Hover'; }
        else if (playTrigger === 'click') { playText = '👆 On Click'; }
        const $element = $(`
            <div class="canvas-element video-element" id="${id}" style="
                left: ${element.x}px; top: ${element.y}px;
                width: ${element.width}px; height: ${element.height}px;
                opacity: ${element.opacity}; transform: rotate(${element.rotation}deg);
                z-index: ${element.zIndex}; background-color: #000; display: flex;
                align-items: center; justify-content: center; overflow: hidden;
                color: #fff; font-size: 14px; border: 2px solid #e53e3e;">
                <div style="text-align: center; width: 100%; padding: 0 8px; box-sizing: border-box; overflow: hidden;">
                    <i class="fas fa-video" style="font-size: 32px; margin-bottom: 8px;"></i>
                    <div>${videoName}</div>
                    <div style="font-size: 11px; opacity: 0.7; word-break: break-all; overflow: hidden;">${videoUrl}</div>
                    <div style="font-size: 11px; margin-top: 4px;">
                        ${playText} ${muted ? '🔇 Muted' : '🔊 Sound'} ${controls ? '⚙ Controls' : ''}
                    </div>
                </div>
                <div class="resize-handle nw"></div><div class="resize-handle ne"></div>
                <div class="resize-handle sw"></div><div class="resize-handle se"></div>
            </div>`);
        appendElementToCanvas($element, element);
        saveState();
        updateLayersList();
        selectElement(id);
        updateTimelineTracks();
    }
    
    function addClickthroughToCanvas(url, target, clickIndex = 1) {
        elementCounter++;
        const id = `element_${elementCounter}`;
        const element = {
            id, type: 'clickthrough', url, target, clickIndex,
            x: 0, y: 0, width: canvasWidth, height: canvasHeight,
            rotation: 0, opacity: 1.0, zIndex: elements.length,
            animations: [], interactions: initInteractionProperties()
        };
        elements.push(element);
        const $element = $(`
            <div class="canvas-element clickthrough-element" id="${id}" style="
                left: ${element.x}px; top: ${element.y}px;
                width: ${element.width}px; height: ${element.height}px;
                opacity: ${element.opacity}; transform: rotate(${element.rotation}deg);
                z-index: ${element.zIndex};
                background: repeating-linear-gradient(45deg,rgba(168,85,247,0.1),rgba(168,85,247,0.1) 10px,rgba(168,85,247,0.2) 10px,rgba(168,85,247,0.2) 20px);
                border: 2px dashed rgba(168, 85, 247, 0.5);">
                <div style="text-align: center; color: rgba(168, 85, 247, 0.8); pointer-events: none;">
                    <i class="fas fa-mouse-pointer text-2xl mb-2"></i>
                    <div class="text-xs">Clickthrough</div>
                    ${url ? `<div class="text-xs font-bold">${url}</div>` : ''}
                </div>
                <div class="resize-handle nw"></div><div class="resize-handle ne"></div>
                <div class="resize-handle sw"></div><div class="resize-handle se"></div>
            </div>`);
        appendElementToCanvas($element, element);
        // FIX #7: Added missing saveState() — clickthrough was not captured in undo stack
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
        const element = {
            id, type: 'invisible',
            x: 50, y: 50, width: 200, height: 150, rotation: 0, opacity: 1,
            zIndex: elements.length, animations: [], interactions: initInteractionProperties()
        };
        elements.push(element);
        const $element = $(`
            <div class="canvas-element invisible-element" id="${id}" style="
                left: ${element.x}px; top: ${element.y}px;
                width: ${element.width}px; height: ${element.height}px;
                opacity: 0.3; transform: rotate(${element.rotation}deg);
                z-index: ${element.zIndex};
                background: repeating-linear-gradient(45deg,rgba(200,200,200,0.3),rgba(200,200,200,0.3) 10px,rgba(150,150,150,0.3) 10px,rgba(150,150,150,0.3) 20px);
                border: 2px dashed rgba(100, 100, 100, 0.5);">
                <div style="text-align: center; color: rgba(100, 100, 100, 0.8); pointer-events: none; padding-top: 40%;">
                    <i class="fas fa-eye-slash text-2xl mb-2"></i>
                    <div class="text-xs">Invisible Layer</div>
                </div>
                <div class="resize-handle nw"></div><div class="resize-handle ne"></div>
                <div class="resize-handle sw"></div><div class="resize-handle se"></div>
            </div>`);
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
            click: { enabled: false, targetElement: 'self', action: 'pauseAnimation', shadowX: 2, shadowY: 2, shadowBlur: 5, shadowColor: '#000000', glowX: 0, glowY: 0, glowBlur: 10, glowColor: '#00ff00', scaleAmount: 1.1 },
            hover: { enabled: false, targetElement: 'self', action: 'addShadow', shadowX: 2, shadowY: 2, shadowBlur: 5, shadowColor: '#000000', glowX: 0, glowY: 0, glowBlur: 10, glowColor: '#00ff00', scaleAmount: 1.1 }
        };
    }
    
    function updateInteractionUI(element) {
        if (!element.interactions) { element.interactions = initInteractionProperties(); }
        const interactions = element.interactions;
        $('#enableClickInteraction').prop('checked', interactions.click.enabled);
        $('#clickTargetElement').val(interactions.click.targetElement);
        $('#clickAction').val(interactions.click.action);
        $('#clickShadowX').val(interactions.click.shadowX); $('#clickShadowY').val(interactions.click.shadowY);
        $('#clickShadowBlur').val(interactions.click.shadowBlur); $('#clickShadowColor').val(interactions.click.shadowColor);
        $('#clickGlowX').val(interactions.click.glowX); $('#clickGlowY').val(interactions.click.glowY);
        $('#clickGlowBlur').val(interactions.click.glowBlur); $('#clickGlowColor').val(interactions.click.glowColor);
        $('#clickScaleAmount').val(interactions.click.scaleAmount);
        $('#enableHoverInteraction').prop('checked', interactions.hover.enabled);
        $('#hoverTargetElement').val(interactions.hover.targetElement);
        $('#hoverAction').val(interactions.hover.action);
        $('#hoverShadowX').val(interactions.hover.shadowX); $('#hoverShadowY').val(interactions.hover.shadowY);
        $('#hoverShadowBlur').val(interactions.hover.shadowBlur); $('#hoverShadowColor').val(interactions.hover.shadowColor);
        $('#hoverGlowX').val(interactions.hover.glowX); $('#hoverGlowY').val(interactions.hover.glowY);
        $('#hoverGlowBlur').val(interactions.hover.glowBlur); $('#hoverGlowColor').val(interactions.hover.glowColor);
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
    
    function getElementLabel(element) {
        if (element.type === 'text') { return `Text: ${element.text.substring(0, 15)}`; }
        else if (element.type === 'clickthrough') {
            const clickIndex = elements.filter(el => el.type === 'clickthrough').findIndex(el => el.id === element.id) + 1;
            return `Click${clickIndex}`;
        } else if (element.type === 'invisible') {
            const invisibleIndex = elements.filter(el => el.type === 'invisible').findIndex(el => el.id === element.id) + 1;
            return `Invisible${invisibleIndex}`;
        } else if (element.type === 'shape') {
            const shapeIndex = elements.filter(el => el.type === 'shape').findIndex(el => el.id === element.id) + 1;
            return `Shape${shapeIndex}`;
        } else if (element.type === 'video') { return `Video: ${element.videoName}`; }
        else { return element.filename || 'Image'; }
    }
    
    function updateClickActionSettings(action) {
        $('#clickShadowSettings').addClass('hidden'); $('#clickGlowSettings').addClass('hidden'); $('#clickScaleSettings').addClass('hidden');
        if (action === 'addShadow') { $('#clickShadowSettings').removeClass('hidden'); }
        else if (action === 'addGlow') { $('#clickGlowSettings').removeClass('hidden'); }
        else if (action === 'scale') { $('#clickScaleSettings').removeClass('hidden'); }
    }
    
    function updateHoverActionSettings(action) {
        $('#hoverShadowSettings').addClass('hidden'); $('#hoverGlowSettings').addClass('hidden'); $('#hoverScaleSettings').addClass('hidden');
        if (action === 'addShadow') { $('#hoverShadowSettings').removeClass('hidden'); }
        else if (action === 'addGlow') { $('#hoverGlowSettings').removeClass('hidden'); }
        else if (action === 'scale') { $('#hoverScaleSettings').removeClass('hidden'); }
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
        // FIX #4: guarded console.log
        if (window.AD_BUILDER_DEBUG) { console.log('Interaction settings saved:', target.interactions); }
        if (selectedFolder) {
            const $folderElement = $(`#${selectedFolder}.canvas-folder`);
            if ($folderElement.length) { applyFolderInteractions(target, $folderElement); }
        }
        saveState();
    }
    
    function applyFolderInteractions(folder, $folderElement) {
        if (!folder.interactions) return;
        $folderElement.off('click mouseenter mouseleave');
        if (folder.interactions.click.enabled) {
            $folderElement.on('click', function(e) {
                e.stopPropagation();
                const action = folder.interactions.click.action;
                if (action === 'pauseAnimation') { stopTimeline(); }
                else if (action === 'playAnimation') { playTimeline(); }
                else if (action === 'toggleAnimation') { if (isPlaying) { stopTimeline(); } else { playTimeline(); } }
                else if (action === 'addShadow') { $folderElement.css('box-shadow', `${folder.interactions.click.shadowX}px ${folder.interactions.click.shadowY}px ${folder.interactions.click.shadowBlur}px ${folder.interactions.click.shadowColor}`); }
                else if (action === 'addGlow') { $folderElement.css('box-shadow', `${folder.interactions.click.glowX}px ${folder.interactions.click.glowY}px ${folder.interactions.click.glowBlur}px ${folder.interactions.click.glowColor}`); }
                else if (action === 'scale') { $folderElement.css('transform', `scale(${folder.interactions.click.scaleAmount || 1.1})`).css('transition', 'transform 0.3s ease'); }
                else if (action === 'hide') { $folderElement.css('visibility', 'hidden'); }
                else if (action === 'show') { $folderElement.css('visibility', 'visible'); }
            });
        }
        if (folder.interactions.hover.enabled) {
            $folderElement.on('mouseenter', function(e) {
                const action = folder.interactions.hover.action;
                if (action === 'addShadow') { $folderElement.css('box-shadow', `${folder.interactions.hover.shadowX}px ${folder.interactions.hover.shadowY}px ${folder.interactions.hover.shadowBlur}px ${folder.interactions.hover.shadowColor}`).css('transition', 'box-shadow 0.3s ease'); }
                else if (action === 'addGlow') { $folderElement.css('box-shadow', `${folder.interactions.hover.glowX}px ${folder.interactions.hover.glowY}px ${folder.interactions.hover.glowBlur}px ${folder.interactions.hover.glowColor}`).css('transition', 'box-shadow 0.3s ease'); }
                else if (action === 'scale') { $folderElement.css('transform', `scale(${folder.interactions.hover.scaleAmount || 1.1})`).css('transition', 'transform 0.3s ease'); }
            });
            $folderElement.on('mouseleave', function(e) { $folderElement.css('box-shadow', '').css('transform', ''); });
        }
    }
    
    // ============================================
    // CANVAS MANAGEMENT
    // ============================================
    function addImageToCanvas(url, filename) {
        elementCounter++;
        const id = `element_${elementCounter}`;
        function getSvgDimensions(dataUrl) {
            try {
                const svgText = decodeURIComponent(dataUrl.startsWith('data:image/svg+xml,') ? dataUrl.slice('data:image/svg+xml,'.length) : atob(dataUrl.split(',')[1]));
                const parser = new DOMParser();
                const doc = parser.parseFromString(svgText, 'image/svg+xml');
                const svgEl = doc.querySelector('svg');
                if (!svgEl) return null;
                const w = parseFloat(svgEl.getAttribute('width')); const h = parseFloat(svgEl.getAttribute('height'));
                if (w > 0 && h > 0) return { width: w, height: h };
                const vb = svgEl.getAttribute('viewBox');
                if (vb) { const parts = vb.trim().split(/[\s,]+/); if (parts.length === 4) return { width: parseFloat(parts[2]), height: parseFloat(parts[3]) }; }
            } catch(e) {}
            return null;
        }
        function placeOnCanvas(natW, natH) {
            if (!natW || !natH) { natW = canvasWidth; natH = canvasWidth; }
            const aspectRatio = natH / natW;
            const fitWidth = canvasWidth;
            const fitHeight = Math.round(fitWidth * aspectRatio);
            const element = {
                id, type: 'image', src: url, filename, aspectRatio, borderRadius: 0,
                x: 0, y: 0, width: fitWidth, height: fitHeight, rotation: 0, opacity: 1,
                zIndex: elements.length, animations: [], interactions: initInteractionProperties()
            };
            elements.push(element);
            const $element = $(`
                <div class="canvas-element" id="${id}" style="
                    left: ${element.x}px; top: ${element.y}px;
                    width: ${element.width}px; height: ${element.height}px;
                    opacity: ${element.opacity}; transform: rotate(${element.rotation}deg);
                    z-index: ${element.zIndex};">
                    <img src="${url}" style="width: 100%; height: 100%; object-fit: contain; pointer-events: none;">
                    <div class="resize-handle nw"></div><div class="resize-handle ne"></div>
                    <div class="resize-handle sw"></div><div class="resize-handle se"></div>
                </div>`);
            appendElementToCanvas($element, element);
            saveState();
            updateLayersList();
            selectElement(id);
        }
        if (url.includes('image/svg')) { const dims = getSvgDimensions(url); placeOnCanvas(dims ? dims.width : 0, dims ? dims.height : 0); return; }
        const img = new Image();
        img.onload = function() { placeOnCanvas(img.width, img.height); };
        img.onerror = function() {
            if (window.AD_BUILDER_DEBUG) { console.error('Failed to load image:', filename); }
            alert('Failed to load image. Please try again.');
        };
        img.src = url;
    }
    
    function updateCanvasSize() {
        $canvasWrapper.css({ width: canvasWidth + 'px', height: canvasHeight + 'px' });
        updateTimelineRuler();
    }
    function handleCanvasSizeChange(e) {
        const value = $(e.target).val();
        if (value === 'custom') { $('#customWidth, #customHeight').removeClass('hidden'); }
        else {
            $('#customWidth, #customHeight').addClass('hidden');
            const [width, height] = value.split('x').map(Number);
            canvasWidth = width; canvasHeight = height;
            updateCanvasSize();
        }
    }
    function updateCustomCanvasSize() {
        canvasWidth = parseInt($('#customWidth').val()) || 300;
        canvasHeight = parseInt($('#customHeight').val()) || 250;
        updateCanvasSize();
    }
    
    // ============================================
    // ELEMENT INTERACTION (mouse handlers)
    // ============================================
    function handleElementMouseDown(e) {
        if ($(e.target).hasClass('resize-handle')) return;
        const $target = $(e.target);
        const isVideoControl = $target.is('video') || $target.closest('video').length > 0;
        if (!isVideoControl) { e.preventDefault(); }
        e.stopPropagation();
        const $element = $(e.currentTarget);
        const id = $element.attr('id');
        const element = elements.find(el => el.id === id);
        if (!element) return;
        const inFolder = element.folderId !== undefined && element.folderId !== null;
        const currentTime = Date.now();
        if (lastClickedElement === id && (currentTime - lastClickTime < 300)) { clickCount++; } else { clickCount = 1; }
        lastClickTime = currentTime; lastClickedElement = id;
        const isDoubleClick = clickCount === 2;
        if (isVideoControl) { return; }
        const currentSelectedElement = selectedElement ? elements.find(el => el.id === selectedElement) : null;
        const selectedElementInFolder = currentSelectedElement && currentSelectedElement.folderId;
        if (inFolder) {
            if (selectedElement === id) { isDragging = true; }
            else if (clickCount === 1) {
                if (selectedElementInFolder && selectedElement !== id) { selectFolder(element.folderId); }
                else { selectFolder(element.folderId); }
                isDragging = true;
            } else if (isDoubleClick) { selectElement(id); return; }
        } else { selectElement(id); isDragging = true; }
        if (!isDragging) return;
        const canvasOffset = $canvas.offset();
        const $canvasContainer = $('#canvasContainer').parent();
        const scrollLeft = $canvasContainer.scrollLeft() || 0;
        const scrollTop = $canvasContainer.scrollTop() || 0;
        if (selectedFolder) {
            const folder = groups.find(g => g.id === element.folderId);
            if (folder) {
                if (folder.x === undefined) folder.x = 0;
                if (folder.y === undefined) folder.y = 0;
                dragOffset = { x: (e.pageX + scrollLeft - canvasOffset.left) / stageZoom - folder.x, y: (e.pageY + scrollTop - canvasOffset.top) / stageZoom - folder.y };
            }
        } else {
            dragOffset = { x: (e.pageX + scrollLeft - canvasOffset.left) / stageZoom - element.x, y: (e.pageY + scrollTop - canvasOffset.top) / stageZoom - element.y };
        }
    }
    
    function handleFolderMouseDown(e) {
        const folderId = $(e.currentTarget).attr('id');
        e.preventDefault(); e.stopPropagation();
        selectFolder(folderId);
        isDragging = true;
        const folder = groups.find(g => g.id === folderId);
        if (!folder) return;
        const canvasOffset = $canvas.offset();
        const $canvasContainer = $('#canvasContainer').parent();
        const scrollLeft = $canvasContainer.scrollLeft() || 0;
        const scrollTop = $canvasContainer.scrollTop() || 0;
        dragOffset = { x: (e.pageX + scrollLeft - canvasOffset.left) / stageZoom - (folder.x || 0), y: (e.pageY + scrollTop - canvasOffset.top) / stageZoom - (folder.y || 0) };
    }
    
    function handleCanvasMouseDown(e) {
        if ($(e.target).is('#canvas')) {
            selectedElement = null; selectedFolder = null; clickCount = 0; lastClickedElement = null;
            $('.canvas-element').removeClass('selected'); $('.canvas-folder').removeClass('selected');
            $('.layer-item').removeClass('selected'); $('.timeline-track').removeClass('selected');
            $('.timeline-folder').removeClass('selected');
            updatePropertiesPanel();
        }
    }
    
    function handleResizeStart(e) {
        e.preventDefault(); e.stopPropagation();
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
            const folder = groups.find(g => g.id === selectedFolder);
            if (!folder) return;
            if (folder.x === undefined) folder.x = 0;
            if (folder.y === undefined) folder.y = 0;
            let newFolderX = (e.pageX + scrollLeft - canvasOffset.left) / stageZoom - dragOffset.x;
            let newFolderY = (e.pageY + scrollTop - canvasOffset.top) / stageZoom - dragOffset.y;
            const deltaX = newFolderX - folder.x; const deltaY = newFolderY - folder.y;
            folder.x = newFolderX; folder.y = newFolderY;
            elements.filter(el => el.folderId === folder.id).forEach(element => {
                element.x += deltaX; element.y += deltaY;
                $(`#${element.id}`).css({ left: element.x + 'px', top: element.y + 'px' });
            });
            updateFolderBounds(folder.id);
            updatePropertiesPanel();
            return;
        }
        if (!selectedElement) return;
        const element = elements.find(el => el.id === selectedElement);
        if (!element) return;
        const $element = $(`#${selectedElement}`);
        if (isDragging) {
            let newX = (e.pageX + scrollLeft - canvasOffset.left) / stageZoom - dragOffset.x;
            let newY = (e.pageY + scrollTop - canvasOffset.top) / stageZoom - dragOffset.y;
            const deltaX = newX - element.x; const deltaY = newY - element.y;
            const isIndividuallySelected = selectedElement && element.folderId && !selectedFolder;
            if (element.folderId && !isIndividuallySelected) {
                elements.filter(el => el.folderId === element.folderId).forEach(el => {
                    el.x += deltaX; el.y += deltaY;
                    $(`#${el.id}`).css({ left: el.x + 'px', top: el.y + 'px' });
                });
            } else {
                element.x = newX; element.y = newY;
                $element.css({ left: newX + 'px', top: newY + 'px' });
            }
            updatePropertiesPanel();
        } else if (isResizing) {
            const mouseX = (e.pageX + scrollLeft - canvasOffset.left) / stageZoom;
            const mouseY = (e.pageY + scrollTop - canvasOffset.top) / stageZoom;
            let newWidth = element.width, newHeight = element.height, newX = element.x, newY = element.y;
            switch(resizeHandle) {
                case 'se': newWidth = Math.max(20, mouseX - element.x); newHeight = Math.max(20, mouseY - element.y); break;
                case 'sw': newWidth = Math.max(20, element.x + element.width - mouseX); newHeight = Math.max(20, mouseY - element.y); newX = mouseX; break;
                case 'ne': newWidth = Math.max(20, mouseX - element.x); newHeight = Math.max(20, element.y + element.height - mouseY); newY = mouseY; break;
                case 'nw': newWidth = Math.max(20, element.x + element.width - mouseX); newHeight = Math.max(20, element.y + element.height - mouseY); newX = mouseX; newY = mouseY; break;
            }
            element.width = newWidth; element.height = newHeight; element.x = newX; element.y = newY;
            $element.css({ width: newWidth + 'px', height: newHeight + 'px', left: newX + 'px', top: newY + 'px' });
            updatePropertiesPanel();
        }
    }
    
    function updateFolderBounds(folderId) {
        const $folder = $(`#${folderId}`);
        if ($folder.length === 0) return;
        const bounds = calculateFolderBounds(folderId);
        $folder.css({ left: bounds.left + 'px', top: bounds.top + 'px', width: bounds.width + 'px', height: bounds.height + 'px' });
    }
    function updateAllFolderBounds() { groups.forEach(folder => { updateFolderBounds(folder.id); }); }
    function handleMouseUp() {
        if (isDragging || isResizing) { saveState(); updateAllFolderBounds(); }
        isDragging = false; isResizing = false; resizeHandle = null;
    }
    
    // ============================================
    // ARROW KEY POSITIONING
    // ============================================
    function handleKeyDown(e) {
        const isTyping = $(e.target).is('input, textarea, [contenteditable="true"]');
        if (e.keyCode === 27) {
            if (!$textModal.hasClass('hidden')) { closeTextModal(); return; }
            if (!$clickthroughModal.hasClass('hidden')) { closeClickthroughModal(); return; }
            if (!$shapeModal.hasClass('hidden')) { closeShapeModal(); return; }
            if (!$videoModal.hasClass('hidden')) { closeVideoModal(); return; }
            if (!$animModal.hasClass('hidden')) { closeAnimationModal(); return; }
        }
        if (!selectedElement) return;
        if ((e.keyCode === 8 || e.keyCode === 46) && !isTyping) {
            e.preventDefault();
            elements = elements.filter(el => el.id !== selectedElement);
            $(`#${selectedElement}`).remove();
            selectedElement = null;
            $propertiesPanel.addClass('hidden');
            updateLayersList(); rebuildTimeline();
            return;
        }
        const arrowKeys = [37, 38, 39, 40];
        if (!arrowKeys.includes(e.keyCode) || isTyping) return;
        e.preventDefault();
        const element = elements.find(el => el.id === selectedElement);
        if (!element) return;
        const step = e.shiftKey ? 10 : 1;
        switch(e.keyCode) {
            case 37: element.x -= step; break;
            case 38: element.y -= step; break;
            case 39: element.x += step; break;
            case 40: element.y += step; break;
        }
        $(`#${element.id}`).css({ left: element.x + 'px', top: element.y + 'px' });
        updatePropertiesPanel();
    }
    $(document).on('keydown', handleKeyDown);
    
    // ============================================
    // ELEMENT SELECTION
    // ============================================
    function selectElement(id) {
        selectedElement = id; selectedFolder = null;
        $('.canvas-element').removeClass('selected'); $('.canvas-folder').removeClass('selected');
        $(`#${id}`).addClass('selected');
        $('.layer-item').removeClass('selected'); $(`.layer-item[data-id="${id}"]`).addClass('selected');
        $('.timeline-track').removeClass('selected'); $(`.timeline-track[data-element-id="${id}"]`).addClass('selected');
        $('.timeline-folder').removeClass('selected');
        updatePropertiesPanel();
    }
    function selectFolder(folderId) {
        selectedFolder = folderId; selectedElement = null;
        $('.canvas-element').removeClass('selected'); $('.canvas-folder').removeClass('selected');
        $('.layer-item').removeClass('selected'); $('.timeline-track').removeClass('selected');
        $('.timeline-folder').removeClass('selected');
        $(`.timeline-folder[data-folder-id="${folderId}"]`).addClass('selected');
        $(`#${folderId}.canvas-folder`).addClass('selected');
        updateFolderPropertiesPanel();
    }
    
    // ============================================
    // LAYER MANAGEMENT
    // ============================================
    function updateLayersList() {
        if (elements.length === 0) {
            $layersList.html('<p class="text-sm text-gray-500 text-center py-4">No layers yet</p>');
            updateTimelineTracks(); return;
        }
        $layersList.empty();
        const sortedElements = [...elements].sort((a, b) => b.zIndex - a.zIndex);
        sortedElements.forEach((element, index) => {
            let icon, label;
            if (element.type === 'text') { icon = 'fa-font'; label = element.text.substring(0, 20); }
            else if (element.type === 'clickthrough') {
                icon = 'fa-mouse-pointer';
                const clickIndex = elements.filter(el => el.type === 'clickthrough').findIndex(el => el.id === element.id) + 1;
                label = `Click${clickIndex}`;
            } else if (element.type === 'shape') {
                icon = 'fa-shapes';
                const shapeIndex = elements.filter(el => el.type === 'shape').findIndex(el => el.id === element.id) + 1;
                label = `Shape${shapeIndex}`;
            } else if (element.type === 'video') { icon = 'fa-video'; label = element.videoName; }
            else { icon = 'fa-image'; label = (element.filename || 'Image').substring(0, 20); }
            const $layer = $(`
                <div class="layer-item p-2 rounded border border-gray-700 flex items-center justify-between"
                     data-id="${element.id}" draggable="true" data-index="${index}">
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
                </div>`);
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
        selectElement($(e.currentTarget).data('id'));
    }
    function handleDeleteLayer(e) {
        e.stopPropagation();
        const id = $(e.currentTarget).data('id');
        saveState();
        elements = elements.filter(el => el.id !== id);
        $(`#${id}`).remove();
        if (selectedElement === id) { selectedElement = null; $propertiesPanel.addClass('hidden'); }
        updateLayersList(); rebuildTimeline();
    }
    function handleAddLayerAnimation(e) {
        e.stopPropagation();
        const id = $(e.currentTarget).data('id');
        // FIX #4: guarded console logs
        if (window.AD_BUILDER_DEBUG) { console.log('handleAddLayerAnimation clicked, id:', id); }
        if (!id) {
            if (window.AD_BUILDER_DEBUG) { console.error('No element ID found'); }
            alert('No element ID found. Please try again.');
            return;
        }
        if (id.startsWith('folder_')) {
            if (window.AD_BUILDER_DEBUG) { console.log('Selecting folder:', id); }
            selectFolder(id);
        } else {
            if (window.AD_BUILDER_DEBUG) { console.log('Selecting element:', id); }
            selectElement(id);
        }
        if (window.AD_BUILDER_DEBUG) { console.log('selectedElement after selection:', selectedElement); }
        openAnimationModal();
    }
    function toggleLayerVisibility(e) {
        e.stopPropagation();
        const id = $(e.currentTarget).data('id');
        const element = elements.find(el => el.id === id);
        if (!element) return;
        element.visible = element.visible === false ? true : false;
        $(`#${element.id}`).css('visibility', element.visible === false ? 'hidden' : 'visible');
        updateLayersList();
    }
    function toggleFolderVisibility(e) {
        e.stopPropagation();
        const id = $(e.currentTarget).data('id') || $(e.currentTarget).data('folder-id');
        const folder = groups.find(g => g.id === id);
        if (!folder) return;
        folder.visible = folder.visible === false ? true : false;
        elements.filter(el => el.folderId === folder.id).forEach(element => {
            $(`#${element.id}`).css('visibility', folder.visible === false ? 'hidden' : 'visible');
        });
        $(`#${folder.id}`).css('visibility', folder.visible === false ? 'hidden' : 'visible');
        updateTimelineTracks();
        saveState();
    }
    
    // ============================================
    // PROPERTIES PANEL
    // ============================================
    function updatePropertiesPanel() {
        if (!selectedElement) { $propertiesPanel.addClass('hidden'); return; }
        const element = elements.find(el => el.id === selectedElement);
        if (!element) return;
        $propertiesPanel.removeClass('hidden');
        $('#commonPropertiesGrid').removeClass('hidden');
        $('#propertiesPanel h2').text('Properties');
        if (element.type === 'text') {
            $textProps.removeClass('hidden');
            $('#propText').val(element.text); $('#propFontFamily').val(element.fontFamily);
            $('#propFontSize').val(element.fontSize); $('#propColor').val(element.color);
            $('#propBold').toggleClass('active', element.bold); $('#propItalic').toggleClass('active', element.italic); $('#propUnderline').toggleClass('active', element.underline);
            $('.text-align-btn').removeClass('active'); $(`.text-align-btn[data-align="${element.textAlign}"]`).addClass('active');
            $('#propTextShadowX').val(element.shadowX || 0); $('#propTextShadowY').val(element.shadowY || 0);
            $('#propTextShadowBlur').val(element.shadowBlur || 0); $('#propTextShadowColor').val(element.shadowColor || '#000000');
            $('#propTextShadowHover').prop('checked', element.shadowHover || false);
            $('#propTextGlowX').val(element.glowX || 0); $('#propTextGlowY').val(element.glowY || 0);
            $('#propTextGlowBlur').val(element.glowBlur || 0); $('#propTextGlowSpread').val(element.glowSpread || 0);
            $('#propTextGlowColor').val(element.glowColor || '#ffffff'); $('#propTextGlowHover').prop('checked', element.glowHover || false);
        } else { $textProps.addClass('hidden'); }
        const $clickthroughProps = $('#clickthroughProps');
        if (element.type === 'clickthrough') {
            $clickthroughProps.removeClass('hidden');
            $('#propClickUrl').val(element.url || ''); $('#propClickIndex').val(element.clickIndex || 1);
            $('#propClickTarget').val(element.target || '_blank'); $('#imageBorderRadius').addClass('hidden');
        } else { $clickthroughProps.addClass('hidden'); }
        if (element.type === 'image') { $('#imageBorderRadius').removeClass('hidden'); $('#propImageBorderRadius').val(element.borderRadius || 0); }
        else { $('#imageBorderRadius').addClass('hidden'); }
        const $shapeProps = $('#shapeProps');
        if (element.type === 'shape') {
            $shapeProps.removeClass('hidden');
            $('#propShapeType').val(element.shapeType); $('#propShapeColor').val(element.fillColor);
            $('#propShapeTransparent').prop('checked', element.transparent || false);
            $('#propShapeBorderWidth').val(element.borderWidth || 0); $('#propShapeBorderColor').val(element.borderColor || '#000000');
            $('#propShapeBorderRadius').val(element.borderRadius || 0);
            $('#propShapeShadowX').val(element.shadowX || 0); $('#propShapeShadowY').val(element.shadowY || 0);
            $('#propShapeShadowBlur').val(element.shadowBlur || 0); $('#propShapeShadowSpread').val(element.shadowSpread || 0);
            $('#propShapeShadowColor').val(element.shadowColor || '#000000'); $('#propShapeShadowHover').prop('checked', element.shadowHover || false);
            $('#propShapeGlowX').val(element.glowX || 0); $('#propShapeGlowY').val(element.glowY || 0);
            $('#propShapeGlowBlur').val(element.glowBlur || 0); $('#propShapeGlowSpread').val(element.glowSpread || 0);
            $('#propShapeGlowColor').val(element.glowColor || '#ffffff'); $('#propShapeGlowHover').prop('checked', element.glowHover || false);
        } else { $shapeProps.addClass('hidden'); }
        const $videoProps = $('#videoProps');
        if (element.type === 'video') {
            $videoProps.removeClass('hidden');
            $('#propVideoUrl').val(element.videoUrl); $('#propVideoName').val(element.videoName);
            $('#propVideoPlayTrigger').val(element.playTrigger || 'autoplay');
            $('#propVideoMuted').prop('checked', element.muted); $('#propVideoControls').prop('checked', element.controls);
            $('#propVideoMuted').prop('disabled', element.playTrigger === 'autoplay');
        } else { $videoProps.addClass('hidden'); }
        $('#propWidth').val(Math.round(element.width)); $('#propHeight').val(Math.round(element.height));
        $('#propX').val(Math.round(element.x)); $('#propY').val(Math.round(element.y));
        $('#propRotation').val(element.rotation); $('#propOpacity').val(element.opacity);
        $('#opacityValue').text(Math.round(element.opacity * 100) + '%');
        updateInteractionUI(element);
    }
    
    function updateFolderPropertiesPanel() {
        if (!selectedFolder) { $propertiesPanel.addClass('hidden'); return; }
        const folder = groups.find(g => g.id === selectedFolder);
        if (!folder) { $propertiesPanel.addClass('hidden'); return; }
        $propertiesPanel.removeClass('hidden');
        $textProps.addClass('hidden'); $('#clickthroughProps').addClass('hidden');
        $('#shapeProps').addClass('hidden'); $('#videoProps').addClass('hidden');
        $('#commonPropertiesGrid').addClass('hidden');
        const folderOpacity = folder.opacity !== undefined ? folder.opacity : 1;
        $('#propOpacity').val(folderOpacity);
        $('#opacityValue').text(Math.round(folderOpacity * 100) + '%');
        $('#interactionsSection').removeClass('hidden');
        if (!folder.interactions) {
            folder.interactions = { click: { enabled: false, targetElement: 'self', action: 'pauseAnimation' }, hover: { enabled: false, targetElement: 'self', action: 'addShadow' } };
        }
        updateInteractionUI(folder);
        $('#propertiesPanel h2').text(`Folder: ${folder.name}`);
        // FIX #4: guarded console.log
        if (window.AD_BUILDER_DEBUG) { console.log('Folder properties panel updated:', folder); }
    }
    
    function updateElementWidth() { if (!selectedElement) return; const element = elements.find(el => el.id === selectedElement); element.width = parseInt($(this).val()) || 100; $(`#${selectedElement}`).css('width', element.width + 'px'); saveState(); }
    function updateElementHeight() { if (!selectedElement) return; const element = elements.find(el => el.id === selectedElement); element.height = parseInt($(this).val()) || 100; $(`#${selectedElement}`).css('height', element.height + 'px'); saveState(); }
    function updateElementX() { if (!selectedElement) return; const element = elements.find(el => el.id === selectedElement); element.x = parseInt($(this).val()) || 0; $(`#${selectedElement}`).css('left', element.x + 'px'); saveState(); }
    function updateElementY() { if (!selectedElement) return; const element = elements.find(el => el.id === selectedElement); element.y = parseInt($(this).val()) || 0; $(`#${selectedElement}`).css('top', element.y + 'px'); saveState(); }
    function updateElementRotation() { if (!selectedElement) return; const element = elements.find(el => el.id === selectedElement); element.rotation = parseInt($(this).val()) || 0; $(`#${selectedElement}`).css('transform', `rotate(${element.rotation}deg)`); saveState(); }
    function updateElementOpacity() {
        const opacityValue = parseFloat($(this).val());
        $('#opacityValue').text(Math.round(opacityValue * 100) + '%');
        if (selectedFolder) {
            const folder = groups.find(g => g.id === selectedFolder);
            if (folder) { folder.opacity = opacityValue; $(`#${selectedFolder}`).css('opacity', opacityValue); elements.filter(el => el.folderId === selectedFolder).forEach(el => { $(`#${el.id}`).css('opacity', opacityValue); }); saveState(); }
        } else if (selectedElement) {
            const element = elements.find(el => el.id === selectedElement);
            if (element) { element.opacity = opacityValue; $(`#${selectedElement}`).css('opacity', opacityValue); saveState(); }
        }
    }
    function updateTextContent() { if (!selectedElement) return; const element = elements.find(el => el.id === selectedElement); if (element.type !== 'text') return; element.text = $(this).val(); $(`#${selectedElement}`).text(element.text); updateLayersList(); }
    function updateFontFamily() { if (!selectedElement) return; const element = elements.find(el => el.id === selectedElement); if (element.type !== 'text') return; element.fontFamily = $(this).val(); $(`#${selectedElement}`).css('font-family', element.fontFamily); }
    function updateFontSize() { if (!selectedElement) return; const element = elements.find(el => el.id === selectedElement); if (element.type !== 'text') return; element.fontSize = parseInt($(this).val()) || 24; $(`#${selectedElement}`).css('font-size', element.fontSize + 'px'); }
    function updateColor() { if (!selectedElement) return; const element = elements.find(el => el.id === selectedElement); if (element.type !== 'text') return; element.color = $(this).val(); $(`#${selectedElement}`).css('color', element.color); }
    function toggleBold() { if (!selectedElement) return; const element = elements.find(el => el.id === selectedElement); if (element.type !== 'text') return; element.bold = !element.bold; $(this).toggleClass('active', element.bold); $(`#${selectedElement}`).css('font-weight', element.bold ? 'bold' : 'normal'); }
    function toggleItalic() { if (!selectedElement) return; const element = elements.find(el => el.id === selectedElement); if (element.type !== 'text') return; element.italic = !element.italic; $(this).toggleClass('active', element.italic); $(`#${selectedElement}`).css('font-style', element.italic ? 'italic' : 'normal'); }
    function toggleUnderline() { if (!selectedElement) return; const element = elements.find(el => el.id === selectedElement); if (element.type !== 'text') return; element.underline = !element.underline; $(this).toggleClass('active', element.underline); $(`#${selectedElement}`).css('text-decoration', element.underline ? 'underline' : 'none'); }
    function updateTextAlign(e) {
        if (!selectedElement) return;
        const element = elements.find(el => el.id === selectedElement);
        if (element.type !== 'text') return;
        const align = $(e.currentTarget).data('align');
        element.textAlign = align;
        $('.text-align-btn').removeClass('active'); $(e.currentTarget).addClass('active');
        $(`#${selectedElement}`).css('text-align', align);
    }
    function updateClickUrl() { if (!selectedElement) return; const element = elements.find(el => el.id === selectedElement); if (element.type !== 'clickthrough') return; element.url = $(this).val() || 'https://kult.my'; updateClickthroughDisplay(element); }
    function updateClickIndex() { if (!selectedElement) return; const element = elements.find(el => el.id === selectedElement); if (element.type !== 'clickthrough') return; element.clickIndex = Math.min(10, Math.max(1, parseInt($(this).val()) || 1)); }
    function updateClickTarget() { if (!selectedElement) return; const element = elements.find(el => el.id === selectedElement); if (element.type !== 'clickthrough') return; element.target = $(this).val() || '_blank'; }
    function updateClickthroughDisplay(element) {
        $(`#${element.id}`).find('div').last().html(`<i class="fas fa-mouse-pointer text-2xl mb-2"></i><div class="text-xs">Clickthrough</div><div class="text-xs font-bold">${element.url}</div>`);
    }
    function updateShapeType() { if (!selectedElement) return; const element = elements.find(el => el.id === selectedElement); if (element.type !== 'shape') return; element.shapeType = $(this).val(); const $el = $(`#${selectedElement}`); if (element.shapeType === 'circle') { $el.css('border-radius', '50%'); } else if (element.shapeType === 'rounded-rectangle') { $el.css('border-radius', '12px'); } else { $el.css('border-radius', '0'); } }
    function updateShapeColor() { if (!selectedElement) return; const element = elements.find(el => el.id === selectedElement); if (element.type !== 'shape') return; element.fillColor = $(this).val(); $(`#${selectedElement}`).css('background-color', element.transparent ? 'transparent' : element.fillColor); }
    function updateShapeTransparent() { if (!selectedElement) return; const element = elements.find(el => el.id === selectedElement); if (element.type !== 'shape') return; element.transparent = $(this).is(':checked'); $(`#${selectedElement}`).css('background-color', element.transparent ? 'transparent' : element.fillColor); }
    function updateShapeBorder() {
        if (!selectedElement) return; const element = elements.find(el => el.id === selectedElement); if (element.type !== 'shape') return;
        element.borderWidth = parseInt($('#propShapeBorderWidth').val()) || 0; element.borderColor = $('#propShapeBorderColor').val();
        const $elem = $(`#${selectedElement}`);
        if (element.borderWidth > 0) { $elem.css({ 'border': `${element.borderWidth}px solid ${element.borderColor}`, 'box-sizing': 'border-box' }); } else { $elem.css('border', 'none'); }
    }
    function updateShapeBorderRadius() {
        if (!selectedElement) return; const element = elements.find(el => el.id === selectedElement); if (element.type !== 'shape') return;
        element.borderRadius = parseInt($('#propShapeBorderRadius').val()) || 0;
        let borderRadius = '0';
        if (element.shapeType === 'circle') { borderRadius = '50%'; } else if (element.shapeType === 'rounded-rectangle') { borderRadius = '12px'; } else if (element.borderRadius > 0) { borderRadius = element.borderRadius + 'px'; }
        $(`#${selectedElement}`).css('border-radius', borderRadius);
    }
    function updateImageBorderRadius() {
        if (!selectedElement) return; const element = elements.find(el => el.id === selectedElement); if (element.type !== 'image') return;
        element.borderRadius = parseInt($('#propImageBorderRadius').val()) || 0;
        const borderRadius = element.borderRadius > 0 ? element.borderRadius + 'px' : '0';
        $(`#${selectedElement}`).css('border-radius', borderRadius); $(`#${selectedElement} img`).css('border-radius', borderRadius);
    }
    function updateVideoUrl() { if (!selectedElement) return; const element = elements.find(el => el.id === selectedElement); if (element.type !== 'video') return; element.videoUrl = $(this).val() || ''; updateVideoDisplay(element); }
    function updateVideoName() { if (!selectedElement) return; const element = elements.find(el => el.id === selectedElement); if (element.type !== 'video') return; element.videoName = $(this).val() || 'video1'; updateVideoDisplay(element); }
    function updateVideoPlayTrigger() { if (!selectedElement) return; const element = elements.find(el => el.id === selectedElement); if (element.type !== 'video') return; element.playTrigger = $(this).val(); updateVideoDisplay(element); }
    function updateVideoMuted() { if (!selectedElement) return; const element = elements.find(el => el.id === selectedElement); if (element.type !== 'video') return; element.muted = $(this).is(':checked'); updateVideoDisplay(element); }
    function updateVideoControls() { if (!selectedElement) return; const element = elements.find(el => el.id === selectedElement); if (element.type !== 'video') return; element.controls = $(this).is(':checked'); updateVideoDisplay(element); }
    function updateVideoDisplay(element) {
        const playTriggerText = element.playTrigger === 'autoplay' ? '▶ Autoplay' : element.playTrigger === 'mouseover' ? '🖱 On Hover' : '👆 On Click';
        const mutedIcon = element.muted ? '🔇 Muted' : '🔊 Sound';
        const controlsText = element.controls ? ' | ⚙ Controls' : '';
        const $element = $(`#${element.id}`);
        $element.css('overflow', 'hidden');
        $element.children('div').first().css({'width': '100%', 'padding': '0 8px', 'boxSizing': 'border-box', 'overflow': 'hidden'}).html(`
            <i class="fas fa-video" style="font-size: 32px; margin-bottom: 8px;"></i>
            <div>${element.videoName}</div>
            <div style="font-size: 11px; opacity: 0.7; word-break: break-all; overflow: hidden;">${element.videoUrl}</div>
            <div style="font-size: 11px; margin-top: 4px;">${playTriggerText} ${mutedIcon}${controlsText}</div>`);
    }
    
    // Text shadow/glow
    function updateTextShadow() {
        if (!selectedElement) return; const element = elements.find(el => el.id === selectedElement); if (element.type !== 'text') return;
        element.shadowX = parseInt($('#propTextShadowX').val()) || 0; element.shadowY = parseInt($('#propTextShadowY').val()) || 0;
        element.shadowBlur = parseInt($('#propTextShadowBlur').val()) || 0; element.shadowColor = $('#propTextShadowColor').val() || '#000000';
        element.shadowHover = $('#propTextShadowHover').is(':checked'); applyTextStyles(element);
    }
    function updateTextGlow() {
        if (!selectedElement) return; const element = elements.find(el => el.id === selectedElement); if (element.type !== 'text') return;
        element.glowX = parseInt($('#propTextGlowX').val()) || 0; element.glowY = parseInt($('#propTextGlowY').val()) || 0;
        element.glowBlur = parseInt($('#propTextGlowBlur').val()) || 0; element.glowSpread = parseInt($('#propTextGlowSpread').val()) || 0;
        element.glowColor = $('#propTextGlowColor').val() || '#ffffff'; element.glowHover = $('#propTextGlowHover').is(':checked');
        applyTextStyles(element);
    }
    function applyTextStyles(element) {
        const $el = $(`#${selectedElement}`);
        let textShadow = '';
        if (!element.shadowHover && (element.shadowX || element.shadowY || element.shadowBlur)) { textShadow = `${element.shadowX}px ${element.shadowY}px ${element.shadowBlur}px ${element.shadowColor}`; }
        if (!element.glowHover && (element.glowX || element.glowY || element.glowBlur || element.glowSpread)) {
            let glowShadow = `${element.glowX}px ${element.glowY}px ${element.glowBlur}px ${element.glowColor}`;
            if (element.glowSpread > 0) { const sl = []; for (let i = 1; i <= element.glowSpread; i += 2) { sl.push(`${element.glowX}px ${element.glowY}px ${element.glowBlur + i}px ${element.glowColor}`); } glowShadow = [glowShadow, ...sl].join(', '); }
            textShadow = textShadow ? `${textShadow}, ${glowShadow}` : glowShadow;
        }
        $el.css('text-shadow', textShadow || 'none');
        let hoverShadow = '';
        if (element.shadowHover && (element.shadowX || element.shadowY || element.shadowBlur)) { hoverShadow = `${element.shadowX}px ${element.shadowY}px ${element.shadowBlur}px ${element.shadowColor}`; }
        if (element.glowHover && (element.glowX || element.glowY || element.glowBlur || element.glowSpread)) {
            let glowShadow = `${element.glowX}px ${element.glowY}px ${element.glowBlur}px ${element.glowColor}`;
            if (element.glowSpread > 0) { const sl = []; for (let i = 1; i <= element.glowSpread; i += 2) { sl.push(`${element.glowX}px ${element.glowY}px ${element.glowBlur + i}px ${element.glowColor}`); } glowShadow = [glowShadow, ...sl].join(', '); }
            hoverShadow = hoverShadow ? `${hoverShadow}, ${glowShadow}` : glowShadow;
        }
        $el.data('hover-shadow', hoverShadow).data('normal-shadow', textShadow || 'none');
        $el.off('mouseenter.shadow mouseleave.shadow');
        if (element.shadowHover || element.glowHover) {
            $el.on('mouseenter.shadow', function() { $(this).css('text-shadow', hoverShadow); });
            $el.on('mouseleave.shadow', function() { $(this).css('text-shadow', textShadow || 'none'); });
        }
    }
    function updateShapeShadow() {
        if (!selectedElement) return; const element = elements.find(el => el.id === selectedElement); if (element.type !== 'shape') return;
        element.shadowX = parseInt($('#propShapeShadowX').val()) || 0; element.shadowY = parseInt($('#propShapeShadowY').val()) || 0;
        element.shadowBlur = parseInt($('#propShapeShadowBlur').val()) || 0; element.shadowSpread = parseInt($('#propShapeShadowSpread').val()) || 0;
        element.shadowColor = $('#propShapeShadowColor').val() || '#000000'; element.shadowHover = $('#propShapeShadowHover').is(':checked');
        applyShapeStyles(element);
    }
    function updateShapeGlow() {
        if (!selectedElement) return; const element = elements.find(el => el.id === selectedElement); if (element.type !== 'shape') return;
        element.glowX = parseInt($('#propShapeGlowX').val()) || 0; element.glowY = parseInt($('#propShapeGlowY').val()) || 0;
        element.glowBlur = parseInt($('#propShapeGlowBlur').val()) || 0; element.glowSpread = parseInt($('#propShapeGlowSpread').val()) || 0;
        element.glowColor = $('#propShapeGlowColor').val() || '#ffffff'; element.glowHover = $('#propShapeGlowHover').is(':checked');
        applyShapeStyles(element);
    }
    function applyShapeStyles(element) {
        const $el = $(`#${selectedElement}`);
        let boxShadow = '';
        if (!element.shadowHover && (element.shadowX || element.shadowY || element.shadowBlur || element.shadowSpread)) { boxShadow = `${element.shadowX}px ${element.shadowY}px ${element.shadowBlur}px ${element.shadowSpread}px ${element.shadowColor}`; }
        if (!element.glowHover && (element.glowX || element.glowY || element.glowBlur || element.glowSpread)) { const gs = `${element.glowX}px ${element.glowY}px ${element.glowBlur}px ${element.glowSpread}px ${element.glowColor}`; boxShadow = boxShadow ? `${boxShadow}, ${gs}` : gs; }
        $el.css('box-shadow', boxShadow || 'none');
        let hoverShadow = '';
        if (element.shadowHover && (element.shadowX || element.shadowY || element.shadowBlur || element.shadowSpread)) { hoverShadow = `${element.shadowX}px ${element.shadowY}px ${element.shadowBlur}px ${element.shadowSpread}px ${element.shadowColor}`; }
        if (element.glowHover && (element.glowX || element.glowY || element.glowBlur || element.glowSpread)) { const gs = `${element.glowX}px ${element.glowY}px ${element.glowBlur}px ${element.glowSpread}px ${element.glowColor}`; hoverShadow = hoverShadow ? `${hoverShadow}, ${gs}` : gs; }
        $el.data('hover-shadow', hoverShadow).data('normal-shadow', boxShadow || 'none');
        $el.off('mouseenter.shadow mouseleave.shadow');
        if (element.shadowHover || element.glowHover) {
            $el.on('mouseenter.shadow', function() { $(this).css('box-shadow', hoverShadow); });
            $el.on('mouseleave.shadow', function() { $(this).css('box-shadow', boxShadow || 'none'); });
        }
    }
    
    // ============================================
    // ANIMATION & TIMELINE
    // ============================================
    function openAnimationModal() {
        // FIX #4: guarded console logs
        if (window.AD_BUILDER_DEBUG) { console.log('openAnimationModal called, selectedElement:', selectedElement, 'selectedFolder:', selectedFolder); }
        if (!selectedElement && !selectedFolder) {
            if (window.AD_BUILDER_DEBUG) { console.error('No element or folder selected'); }
            alert('Please select an element or folder first by clicking on it in the canvas or layers panel');
            return;
        }
        editingAnimation = null;
        $('#animBtnText').text('Add Animation');
        $('#deleteAnimBtn').addClass('hidden');
        $('#animStart').val(0); $('#animDuration').val(1);
        $('#animFade').val(''); $('#animSlide').val(''); $('#animZoom').val(''); $('#animRotate').val('');
        if (window.AD_BUILDER_DEBUG) { console.log('Opening animation modal'); }
        $animModal.removeClass('hidden');
        setTimeout(() => $('#animStart').focus(), 100);
    }
    function closeAnimationModal() { $animModal.addClass('hidden'); editingAnimation = null; }
    function toggleCustomAnimProps() { /* not needed with dropdown interface */ }
    
    function editAnimation(e) {
        if (isTimelineBlockDragging || isTimelineBlockResizing) return;
        const animId = $(e.currentTarget).data('anim-id');
        const elementId = $(e.currentTarget).data('element-id');
        const folderId = $(e.currentTarget).data('folder-id');
        let target, anim;
        if (folderId) {
            target = groups.find(g => g.id === folderId); if (!target) return;
            anim = target.animations.find(a => a.id === animId); if (!anim) return;
            editingAnimation = { folderId, animId }; selectFolder(folderId);
        } else {
            target = elements.find(el => el.id === elementId); if (!target) return;
            anim = target.animations.find(a => a.id === animId); if (!anim) return;
            editingAnimation = { elementId, animId }; selectElement(elementId);
        }
        $('#animFade').val(''); $('#animSlide').val(''); $('#animZoom').val(''); $('#animRotate').val('');
        const types = anim.types || [anim.type];
        types.forEach(type => {
            if (type === 'fadeIn' || type === 'fadeOut') { $('#animFade').val(type); }
            else if (type.startsWith('slide')) { $('#animSlide').val(type); }
            else if (type === 'scaleIn' || type === 'scaleOut') { $('#animZoom').val(type); }
            else if (type.startsWith('rotate')) { $('#animRotate').val(type); }
        });
        $('#animStart').val(anim.start.toFixed(1)); $('#animDuration').val(anim.duration.toFixed(1)); $('#animEase').val(anim.ease);
        $('#animBtnText').text('Update Animation'); $('#deleteAnimBtn').removeClass('hidden');
        $animModal.removeClass('hidden');
    }
    
    function saveAnimation() {
        // FIX #4: guarded console logs
        if (window.AD_BUILDER_DEBUG) { console.log('saveAnimation called'); console.log('selectedElement:', selectedElement); console.log('selectedFolder:', selectedFolder); }
        const isFolder = selectedFolder !== null;
        const target = isFolder ? groups.find(g => g.id === selectedFolder) : elements.find(el => el.id === selectedElement);
        if (window.AD_BUILDER_DEBUG) { console.log('isFolder:', isFolder); console.log('target:', target); }
        if (!target) {
            if (window.AD_BUILDER_DEBUG) { console.error('No target found!'); }
            alert('Error: No element or folder selected. Please try again.'); return;
        }
        if (!target.animations) {
            if (window.AD_BUILDER_DEBUG) { console.warn('Target has no animations array, initializing...'); }
            target.animations = [];
        }
        const selectedTypes = [];
        const fade = $('#animFade').val(); const slide = $('#animSlide').val();
        const zoom = $('#animZoom').val(); const rotate = $('#animRotate').val();
        if (window.AD_BUILDER_DEBUG) { console.log('Animation values - fade:', fade, 'slide:', slide, 'zoom:', zoom, 'rotate:', rotate); }
        if (fade) selectedTypes.push(fade); if (slide) selectedTypes.push(slide);
        if (zoom) selectedTypes.push(zoom); if (rotate) selectedTypes.push(rotate);
        if (window.AD_BUILDER_DEBUG) { console.log('selectedTypes:', selectedTypes); }
        if (selectedTypes.length === 0) { alert('Please select at least one animation effect'); return; }
        const start = Math.round(parseFloat($('#animStart').val()) * 10) / 10;
        const duration = Math.round(parseFloat($('#animDuration').val()) * 10) / 10;
        const ease = $('#animEase').val();
        if (window.AD_BUILDER_DEBUG) { console.log('Animation params - start:', start, 'duration:', duration, 'ease:', ease); }
        if (editingAnimation) {
            if (window.AD_BUILDER_DEBUG) { console.log('Updating existing animation:', editingAnimation); }
            const anim = target.animations.find(a => a.id === editingAnimation.animId);
            if (anim && selectedTypes.length > 0) { anim.type = selectedTypes[0]; anim.start = start; anim.duration = duration; anim.ease = ease; anim.types = selectedTypes; }
        } else {
            if (window.AD_BUILDER_DEBUG) { console.log('Creating new animation'); }
            const animationId = `anim_${Date.now()}`;
            const animation = { id: animationId, type: selectedTypes[0], types: selectedTypes, start, duration, ease, customProps: {} };
            if (window.AD_BUILDER_DEBUG) { console.log('New animation object:', animation); }
            target.animations.push(animation);
            if (window.AD_BUILDER_DEBUG) { console.log('Target animations after push:', target.animations); }
        }
        if (window.AD_BUILDER_DEBUG) { console.log('Saving state and updating timeline...'); }
        saveState(); rebuildTimeline(); updateTimelineTracks(); closeAnimationModal();
        if (window.AD_BUILDER_DEBUG) { console.log('Animation saved successfully'); }
    }
    
    function deleteEditingAnimation() {
        if (!editingAnimation) return;
        const isFolderAnim = editingAnimation.folderId !== undefined;
        const target = isFolderAnim ? groups.find(g => g.id === editingAnimation.folderId) : elements.find(el => el.id === editingAnimation.elementId);
        if (target) { saveState(); target.animations = target.animations.filter(a => a.id !== editingAnimation.animId); rebuildTimeline(); updateTimelineTracks(); }
        closeAnimationModal();
    }
    function handleDeleteAnimation(e) {
        const animId = $(e.currentTarget).data('anim-id');
        const elementId = $(e.currentTarget).data('element-id');
        const folderId = $(e.currentTarget).data('folder-id');
        if (folderId) { const folder = groups.find(g => g.id === folderId); if (folder) { saveState(); folder.animations = folder.animations.filter(a => a.id !== animId); rebuildTimeline(); updateTimelineTracks(); } }
        else if (elementId) { const element = elements.find(el => el.id === elementId); if (element) { saveState(); element.animations = element.animations.filter(a => a.id !== animId); rebuildTimeline(); updateTimelineTracks(); } }
    }
    
    function updateTimelineDuration() {
        const newDuration = parseFloat($('#timelineDuration').val());
        if (newDuration && newDuration >= 1 && newDuration <= 30) { totalDuration = newDuration; updateTimelineRuler(); updateTimelineTracks(); }
    }
    function updateAnimLoop() { const value = parseInt($('#animLoop').val()) || 1; animLoop = Math.max(0, value - 1); }
    function zoomIn() { totalDuration = Math.max(totalDuration - 2, 2); $('#timelineDuration').val(totalDuration); updateTimelineRuler(); updateTimelineTracks(); }
    function zoomOut() { totalDuration = Math.min(totalDuration + 2, 30); $('#timelineDuration').val(totalDuration); updateTimelineRuler(); updateTimelineTracks(); }
    
    function updateTimelineRuler() {
        $timelineRuler.empty();
        const steps = Math.ceil(totalDuration);
        for (let i = 0; i <= steps; i++) {
            const left = (i / steps) * 100;
            $timelineRuler.append(`<div class="timeline-time-marker" style="left: ${left}%" data-time="${i}"><div class="timeline-time-label" data-time="${i}">${i}s</div></div>`);
        }
        $('.timeline-time-label, .timeline-time-marker').off('click').on('click', function(e) {
            e.stopPropagation();
            const time = parseFloat($(this).data('time'));
            const percent = (time / totalDuration) * 100;
            $('#timelinePlayhead').css('left', percent + '%');
            if (!isPlaying && timeline) { timeline.seek(time); }
        });
    }
    
    function updateTimelineTracks() {
        if (elements.length === 0 && groups.length === 0) {
            $timelineTracks.html('<div class="text-center text-gray-500 text-sm py-8">Add elements and animations to see timeline</div>');
            return;
        }
        $timelineTracks.empty();
        function getElementIconAndLabel(element) {
            let icon, label;
            if (element.type === 'text') { icon = 'fa-font'; label = element.name || element.text.substring(0, 15); }
            else if (element.type === 'clickthrough') { icon = 'fa-mouse-pointer'; const ci = elements.filter(el => el.type === 'clickthrough').findIndex(el => el.id === element.id) + 1; label = element.name || `Click${ci}`; }
            else if (element.type === 'invisible') { icon = 'fa-eye-slash'; const ii = elements.filter(el => el.type === 'invisible').findIndex(el => el.id === element.id) + 1; label = element.name || `Invisible${ii}`; }
            else if (element.type === 'shape') { icon = 'fa-shapes'; const si = elements.filter(el => el.type === 'shape').findIndex(el => el.id === element.id) + 1; label = element.name || `Shape${si}`; }
            else if (element.type === 'video') { icon = 'fa-video'; label = element.name || element.videoName; }
            else { icon = 'fa-image'; label = element.name || (element.filename || 'Image').substring(0, 15); }
            return { icon, label };
        }
        function renderTrack(element) {
            const { icon, label } = getElementIconAndLabel(element);
            const $track = $(`
                <li class="timeline-track layer" data-element-id="${element.id}">
                    <div class="timeline-track-label">
                        <span class="timeline-handle">⋮⋮</span>
                        <i class="fas ${icon} text-blue-400 mr-2"></i>
                        <span class="truncate flex-1 track-name-label" data-element-id="${element.id}">${label}</span>
                        <div class="flex items-center gap-1 ml-2">
                            <button class="timeline-layer-btn toggle-visibility" data-id="${element.id}" title="Toggle visibility"><i class="fas ${element.hidden ? 'fa-eye-slash' : 'fa-eye'} text-xs"></i></button>
                            <button class="timeline-layer-btn add-layer-anim" data-id="${element.id}" title="Add animation"><i class="fas fa-plus text-xs"></i></button>
                            <button class="timeline-layer-btn delete-layer" data-id="${element.id}" title="Delete layer"><i class="fas fa-trash text-xs"></i></button>
                        </div>
                    </div>
                    <div class="timeline-track-content" id="track_${element.id}"></div>
                </li>`);
            element.animations.forEach(anim => {
                const leftPercent = (anim.start / totalDuration) * 100;
                const widthPercent = (anim.duration / totalDuration) * 100;
                const types = anim.types || [anim.type];
                const animLabel = types.length > 1 ? `${types.length} effects` : types[0];
                const $block = $(`
                    <div class="timeline-block" style="left: ${leftPercent}%; width: ${widthPercent}%;" data-anim-id="${anim.id}" data-element-id="${element.id}">
                        <div class="timeline-block-resize-handle left"></div>
                        <div class="timeline-block-label">${animLabel}</div>
                        <button class="delete-anim" data-anim-id="${anim.id}" data-element-id="${element.id}"><i class="fas fa-times"></i></button>
                        <div class="timeline-block-resize-handle right"></div>
                    </div>`);
                $track.find('.timeline-track-content').append($block);
            });
            return $track;
        }
        const elementsInFolders = new Set();
        const timelineItems = [];
        groups.forEach(group => { timelineItems.push({ type: 'folder', data: group, zIndex: group.zIndex }); });
        elements.forEach(element => { if (!element.folderId) { timelineItems.push({ type: 'element', data: element, zIndex: element.zIndex }); } });
        timelineItems.sort((a, b) => b.zIndex - a.zIndex);
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
                                    <button class="timeline-layer-btn toggle-folder-visibility" data-id="${group.id}" title="Toggle folder visibility"><i class="fas ${group.visible === false ? 'fa-eye-slash' : 'fa-eye'} text-xs"></i></button>
                                    <button class="timeline-layer-btn add-layer-anim" data-id="${group.id}" title="Add animation to folder"><i class="fas fa-plus text-xs"></i></button>
                                    <button class="timeline-layer-btn delete-folder" data-id="${group.id}" title="Delete folder"><i class="fas fa-trash text-xs"></i></button>
                                </div>
                            </div>
                            <div class="timeline-track-content folder-track-content" id="track_${group.id}"></div>
                        </div>
                        <ul class="timeline-folder-children"></ul>
                    </li>`);
                if (group.animations && group.animations.length > 0) {
                    group.animations.forEach(anim => {
                        const leftPercent = (anim.start / totalDuration) * 100;
                        const widthPercent = (anim.duration / totalDuration) * 100;
                        const types = anim.types || [anim.type];
                        const animLabel = types.length > 1 ? `${types.length} effects` : types[0];
                        const $block = $(`
                            <div class="timeline-block folder-anim-block" style="left: ${leftPercent}%; width: ${widthPercent}%; background-color: #fbbf24;" data-anim-id="${anim.id}" data-folder-id="${group.id}">
                                <div class="timeline-block-resize-handle left"></div>
                                <div class="timeline-block-label">${animLabel}</div>
                                <button class="delete-anim" data-anim-id="${anim.id}" data-folder-id="${group.id}"><i class="fas fa-times"></i></button>
                                <div class="timeline-block-resize-handle right"></div>
                            </div>`);
                        $folder.find('.folder-track-content').append($block);
                    });
                }
                const folderElements = elements.filter(el => el.folderId === group.id);
                folderElements.sort((a, b) => b.zIndex - a.zIndex);
                folderElements.forEach(element => { elementsInFolders.add(element.id); $folder.find('.timeline-folder-children').append(renderTrack(element)); });
                $timelineTracks.append($folder);
            } else { $timelineTracks.append(renderTrack(item.data)); }
        });
        initTimelineSortable();
    }
    
    function initTimelineSortable() {
        if ($timelineTracks.hasClass('ui-sortable')) { $timelineTracks.sortable('destroy'); }
        $('.timeline-folder-children').each(function() { if ($(this).hasClass('ui-sortable')) { $(this).sortable('destroy'); } });
        $timelineTracks.sortable({ items: '> .layer, > .timeline-folder', connectWith: '.timeline-folder-children', handle: '.timeline-handle', placeholder: 'ui-sortable-placeholder', tolerance: 'pointer', forcePlaceholderSize: true, update: function(e, ui) { updateStructureFromDOM(); } });
        $('.timeline-folder-children').sortable({ items: '> .layer', connectWith: '#timelineTracks, .timeline-folder-children', handle: '.timeline-handle', placeholder: 'ui-sortable-placeholder', tolerance: 'pointer', forcePlaceholderSize: true, receive: function(e, ui) { if (ui.item.hasClass('timeline-folder')) { $(this).sortable('cancel'); } }, update: function(e, ui) { updateStructureFromDOM(); } });
    }
    
    function updateStructureFromDOM() {
        const maxZIndex = elements.length + groups.length;
        let currentZIndex = maxZIndex;
        $('#timelineTracks > li').each(function(index) {
            if ($(this).hasClass('timeline-folder')) {
                const folderId = $(this).data('folder-id');
                const group = groups.find(g => g.id === folderId);
                if (group) {
                    group.zIndex = currentZIndex--;
                    let folderZIndex = group.zIndex * 100;
                    $(this).find('.timeline-folder-children > li').each(function() {
                        const elementId = $(this).data('element-id');
                        const element = elements.find(el => el.id === elementId);
                        if (element) {
                            element.folderId = folderId; element.zIndex = folderZIndex--;
                            const $element = $(`#${element.id}`);
                            let $folderWrapper = $(`#${folderId}`);
                            if ($folderWrapper.length === 0) {
                                $folderWrapper = $(`<div class="canvas-folder" id="${folderId}" style="position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:auto;z-index:${group.zIndex};"></div>`);
                                $canvas.append($folderWrapper);
                                applyFolderInteractions(group, $folderWrapper);
                            }
                            if ($element.parent().attr('id') !== folderId) { $folderWrapper.append($element); }
                            $element.css('z-index', element.zIndex);
                        }
                    });
                }
            } else {
                const elementId = $(this).data('element-id');
                const element = elements.find(el => el.id === elementId);
                if (element) {
                    element.folderId = null; element.zIndex = currentZIndex--;
                    const $element = $(`#${element.id}`);
                    if ($element.parent().hasClass('canvas-folder')) { $canvas.append($element); }
                    $element.css('z-index', element.zIndex);
                }
            }
        });
        if (window.AD_BUILDER_DEBUG) { console.log('Structure updated from DOM'); }
        updateLayersList();
    }
    
    // ============================================
    // FOLDER MANAGEMENT
    // ============================================
    function createFolder() {
        folderCounter++;
        const folderId = `folder_${folderCounter}`;
        const folder = { id: folderId, name: `Folder ${folderCounter}`, zIndex: elements.length + groups.length, collapsed: false, visible: true, x: 0, y: 0, animations: [] };
        groups.push(folder);
        saveState();
        updateTimelineTracks();
        if (window.AD_BUILDER_DEBUG) { console.log('Folder created:', folder); }
    }
    function toggleFolder(e) {
        e.stopPropagation();
        const $folder = $(this).closest('.timeline-folder');
        const folderId = $folder.data('folder-id');
        const group = groups.find(g => g.id === folderId);
        if (group) { group.collapsed = !group.collapsed; $folder.toggleClass('collapsed'); $(this).text(group.collapsed ? '▸' : '▾'); }
    }
    function deleteFolder(e) {
        e.stopPropagation();
        const folderId = $(this).data('id');
        const group = groups.find(g => g.id === folderId);
        if (!group) return;
        saveState();
        elements.forEach(element => { if (element.folderId === folderId) { element.folderId = null; } });
        groups = groups.filter(g => g.id !== folderId);
        updateTimelineTracks(); updateLayersList();
        if (window.AD_BUILDER_DEBUG) { console.log('Folder deleted:', folderId); }
    }
    
    // ============================================
    // UNDO/REDO SYSTEM
    // ============================================
    function saveState() {
        const state = { elements: JSON.parse(JSON.stringify(elements)), groups: JSON.parse(JSON.stringify(groups)) };
        undoStack.push(state);
        if (undoStack.length > MAX_UNDO_STACK) { undoStack.shift(); }
        redoStack = [];
        if (window.AD_BUILDER_DEBUG) { console.log('State saved. Undo stack:', undoStack.length); }
    }
    function undo() {
        if (undoStack.length === 0) { if (window.AD_BUILDER_DEBUG) { console.log('Nothing to undo'); } return; }
        const currentState = { elements: JSON.parse(JSON.stringify(elements)), groups: JSON.parse(JSON.stringify(groups)) };
        redoStack.push(currentState);
        const previousState = undoStack.pop();
        elements = previousState.elements; groups = previousState.groups;
        updateCanvas(); updateTimelineTracks(); updateLayersList();
        if (window.AD_BUILDER_DEBUG) { console.log('Undo performed. Undo stack:', undoStack.length, 'Redo stack:', redoStack.length); }
    }
    function redo() {
        if (redoStack.length === 0) { if (window.AD_BUILDER_DEBUG) { console.log('Nothing to redo'); } return; }
        const currentState = { elements: JSON.parse(JSON.stringify(elements)), groups: JSON.parse(JSON.stringify(groups)) };
        undoStack.push(currentState);
        const nextState = redoStack.pop();
        elements = nextState.elements; groups = nextState.groups;
        updateCanvas(); updateTimelineTracks(); updateLayersList();
        if (window.AD_BUILDER_DEBUG) { console.log('Redo performed. Undo stack:', undoStack.length, 'Redo stack:', redoStack.length); }
    }
    
    function calculateFolderBounds(folderId) {
        return { left: 0, top: 0, width: canvasWidth, height: canvasHeight };
    }
    
    function updateCanvas() {
        $canvas.find('.canvas-element, .canvas-folder').remove();
        groups.forEach(folder => {
            const bounds = calculateFolderBounds(folder.id);
            const $folderWrapper = $(`<div class="canvas-folder" id="${folder.id}" style="position:absolute;left:${bounds.left}px;top:${bounds.top}px;width:${bounds.width}px;height:${bounds.height}px;z-index:${folder.zIndex};pointer-events:auto;"></div>`);
            $canvas.append($folderWrapper);
            applyFolderInteractions(folder, $folderWrapper);
        });
        elements.forEach(element => {
            const $element = createElementDOM(element);
            if (element.folderId) { $(`#${element.folderId}`).append($element); }
            else { $canvas.append($element); }
        });
    }
    
    function getAbsolutePosition(element) { return { x: element.x, y: element.y }; }
    
    function createElementDOM(element) {
        const pos = getAbsolutePosition(element);
        let $element;
        if (element.type === 'text') {
            $element = $(`<div class="canvas-element text-element" id="${element.id}" style="left:${pos.x}px;top:${pos.y}px;width:${element.width}px;height:${element.height}px;opacity:${element.opacity};transform:rotate(${element.rotation}deg);font-size:${element.fontSize}px;font-family:${element.fontFamily};color:${element.color};font-weight:${element.bold?'bold':'normal'};font-style:${element.italic?'italic':'normal'};text-decoration:${element.underline?'underline':'none'};text-align:${element.textAlign};line-height:1.2;word-wrap:break-word;z-index:${element.zIndex};">${element.text}<div class="resize-handle nw"></div><div class="resize-handle ne"></div><div class="resize-handle sw"></div><div class="resize-handle se"></div></div>`);
        } else if (element.type === 'shape') {
            let shapeStyle = `background-color: ${element.fillColor};`;
            if (element.shapeType === 'circle') { shapeStyle += ' border-radius: 50%;'; } else if (element.shapeType === 'rounded-rectangle') { shapeStyle += ' border-radius: 12px;'; } else if (element.borderRadius > 0) { shapeStyle += ` border-radius: ${element.borderRadius}px;`; }
            $element = $(`<div class="canvas-element" id="${element.id}" style="left:${pos.x}px;top:${pos.y}px;width:${element.width}px;height:${element.height}px;opacity:${element.opacity};transform:rotate(${element.rotation}deg);z-index:${element.zIndex};${shapeStyle}"><div class="resize-handle nw"></div><div class="resize-handle ne"></div><div class="resize-handle sw"></div><div class="resize-handle se"></div></div>`);
        } else if (element.type === 'clickthrough') {
            $element = $(`<div class="canvas-element clickthrough-element" id="${element.id}" style="left:${pos.x}px;top:${pos.y}px;width:${element.width}px;height:${element.height}px;opacity:${element.opacity};transform:rotate(${element.rotation}deg);z-index:${element.zIndex};background:repeating-linear-gradient(45deg,rgba(168,85,247,0.1),rgba(168,85,247,0.1) 10px,rgba(168,85,247,0.2) 10px,rgba(168,85,247,0.2) 20px);border:2px dashed rgba(168,85,247,0.5);"><div style="text-align:center;color:rgba(168,85,247,0.8);pointer-events:none;"><i class="fas fa-mouse-pointer text-2xl mb-2"></i><div class="text-xs">Clickthrough</div>${element.url?`<div class="text-xs font-bold">${element.url}</div>`:''}</div><div class="resize-handle nw"></div><div class="resize-handle ne"></div><div class="resize-handle sw"></div><div class="resize-handle se"></div></div>`);
        } else if (element.type === 'invisible') {
            $element = $(`<div class="canvas-element invisible-element" id="${element.id}" style="left:${pos.x}px;top:${pos.y}px;width:${element.width}px;height:${element.height}px;opacity:0.3;transform:rotate(${element.rotation}deg);z-index:${element.zIndex};background:repeating-linear-gradient(45deg,rgba(200,200,200,0.3),rgba(200,200,200,0.3) 10px,rgba(150,150,150,0.3) 10px,rgba(150,150,150,0.3) 20px);border:2px dashed rgba(100,100,100,0.5);"><div style="text-align:center;color:rgba(100,100,100,0.8);pointer-events:none;padding-top:40%;"><i class="fas fa-eye-slash text-2xl mb-2"></i><div class="text-xs">Invisible Layer</div></div><div class="resize-handle nw"></div><div class="resize-handle ne"></div><div class="resize-handle sw"></div><div class="resize-handle se"></div></div>`);
        } else if (element.type === 'image') {
            $element = $(`<div class="canvas-element" id="${element.id}" style="left:${pos.x}px;top:${pos.y}px;width:${element.width}px;height:${element.height}px;opacity:${element.opacity};transform:rotate(${element.rotation}deg);z-index:${element.zIndex};"><img src="${element.src}" style="width:100%;height:100%;object-fit:contain;pointer-events:none;"/><div class="resize-handle nw"></div><div class="resize-handle ne"></div><div class="resize-handle sw"></div><div class="resize-handle se"></div></div>`);
        } else if (element.type === 'video') {
            const playText = element.playTrigger === 'autoplay' ? '▶ Autoplay' : element.playTrigger === 'onclick' ? '👆 Click to Play' : '👁 On View';
            $element = $(`<div class="canvas-element" id="${element.id}" style="left:${pos.x}px;top:${pos.y}px;width:${element.width}px;height:${element.height}px;opacity:${element.opacity};transform:rotate(${element.rotation}deg);z-index:${element.zIndex};background-color:#000;display:flex;align-items:center;justify-content:center;overflow:hidden;color:#fff;font-size:14px;border:2px solid #e53e3e;"><div style="text-align:center;width:100%;padding:0 8px;box-sizing:border-box;overflow:hidden;"><i class="fas fa-video" style="font-size:32px;margin-bottom:8px;"></i><div>${element.videoName}</div><div style="font-size:11px;opacity:0.7;word-break:break-all;overflow:hidden;">${element.videoUrl}</div><div style="font-size:11px;margin-top:4px;">${playText} ${element.muted?'🔇 Muted':'🔊 Sound'} ${element.controls?'⚙ Controls':''}</div></div><div class="resize-handle nw"></div><div class="resize-handle ne"></div><div class="resize-handle sw"></div><div class="resize-handle se"></div></div>`);
        }
        return $element;
    }
    
    function appendElementToCanvas($element, element) {
        if (!$element) return;
        if (element.folderId) {
            let $folder = $(`#${element.folderId}`);
            if ($folder.length === 0) {
                const folder = groups.find(g => g.id === element.folderId);
                if (folder) {
                    $folder = $(`<div class="canvas-folder" id="${folder.id}" style="position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:none;z-index:${folder.zIndex};"></div>`);
                    $canvas.append($folder);
                }
            }
            $folder.append($element);
        } else { $canvas.append($element); }
    }
    
    // ============================================
    // REBUILD TIMELINE
    // ============================================
    function rebuildTimeline() {
        timeline.clear();
        timeline.repeat(0);
        groups.forEach(folder => {
            if (!folder.animations || folder.animations.length === 0) return;
            folder.animations.forEach(anim => {
                const types = anim.types || [anim.type];
                const folderElements = elements.filter(el => el.folderId === folder.id);
                folderElements.forEach(element => {
                    let mergedProps = {}, startAt = null;
                    types.forEach(type => {
                        const props = getAnimationProps(type, element, anim.customProps);
                        if (props.startAt) { startAt = startAt || {}; Object.assign(startAt, props.startAt); delete props.startAt; }
                        Object.assign(mergedProps, props);
                    });
                    if (startAt) { gsap.set(`#${element.id}`, startAt); }
                    timeline.to(`#${element.id}`, { ...mergedProps, duration: anim.duration, ease: anim.ease }, anim.start);
                });
            });
        });
        elements.forEach(element => {
            element.animations.forEach(anim => {
                const types = anim.types || [anim.type];
                let mergedProps = {}, startAt = null;
                types.forEach(type => {
                    const props = getAnimationProps(type, element, anim.customProps);
                    if (props.startAt) { startAt = startAt || {}; Object.assign(startAt, props.startAt); delete props.startAt; }
                    Object.assign(mergedProps, props);
                });
                if (startAt) { gsap.set(`#${element.id}`, startAt); }
                timeline.to(`#${element.id}`, { ...mergedProps, duration: anim.duration, ease: anim.ease }, anim.start);
            });
        });
        const actualDuration = timeline.duration();
        if (actualDuration < totalDuration) { timeline.to({}, { duration: totalDuration - actualDuration }, actualDuration); }
        timeline.eventCallback('onUpdate', updatePlayhead);
    }
    
    function getAnimationProps(type, element, customProps = {}) {
        if (type === 'custom') { return customProps; }
        const props = {};
        switch(type) {
            case 'fadeIn': props.startAt = { opacity: 0 }; props.opacity = element.opacity; break;
            case 'fadeOut': props.opacity = 0; break;
            case 'slideLeft': props.startAt = { x: -canvasWidth }; props.x = 0; break;
            case 'slideRight': props.startAt = { x: canvasWidth }; props.x = 0; break;
            case 'slideUp': props.startAt = { y: -canvasHeight }; props.y = 0; break;
            case 'slideDown': props.startAt = { y: canvasHeight }; props.y = 0; break;
            case 'slideToLeft': props.x = -canvasWidth; break;
            case 'slideToRight': props.x = canvasWidth; break;
            case 'slideToUp': props.y = -canvasHeight; break;
            case 'slideToDown': props.y = canvasHeight; break;
            case 'scale': case 'scaleIn': props.startAt = { scale: 0 }; props.scale = 1; break;
            case 'scaleOut': props.startAt = { scale: 1 }; props.scale = 2; break;
            case 'scaleFrom': const scaleFrom = customProps.scaleFrom !== undefined ? customProps.scaleFrom : 0; props.startAt = { scale: scaleFrom }; props.scale = 1; break;
            case 'rotate': case 'rotate360': props.rotation = '+=360'; break;
            case 'rotate90': props.rotation = '+=90'; break;
            case 'rotate180': props.rotation = '+=180'; break;
            case 'rotate270': props.rotation = '+=270'; break;
            case 'rotateFrom': const rotateFrom = customProps.rotateFrom !== undefined ? customProps.rotateFrom : 0; props.startAt = { rotation: rotateFrom }; props.rotation = element.rotation; break;
        }
        return props;
    }
    
    function playTimeline() {
        const hasElementAnimations = elements.some(el => el.animations && el.animations.length > 0);
        const hasFolderAnimations = groups.some(g => g.animations && g.animations.length > 0);
        if (elements.length === 0 || (!hasElementAnimations && !hasFolderAnimations)) { alert('Please add some animations first'); return; }
        if (isPlaying) { stopTimeline(); }
        rebuildTimeline();
        isPlaying = true;
        let playbackTime;
        if (animLoop === -1) { playbackTime = totalDuration * 3 * 1000; timeline.repeat(2); }
        else { playbackTime = totalDuration * (animLoop + 1) * 1000; timeline.repeat(animLoop); }
        timeline.play(0);
        playbackTimeout = setTimeout(() => {
            if (animLoop !== -1) { isPlaying = false; $('#timelinePlayhead').css('left', '0'); stopTimeline(); }
        }, playbackTime);
    }
    
    function stopTimeline() {
        if (playbackTimeout) { clearTimeout(playbackTimeout); playbackTimeout = null; }
        timeline.pause(0);
        isPlaying = false;
        $('#timelinePlayhead').css('left', '0');
        elements.forEach(element => {
            gsap.set(`#${element.id}`, { clearProps: 'all' });
            const style = {
                left: element.x + 'px', top: element.y + 'px',
                width: element.width + 'px', height: element.height + 'px',
                opacity: element.opacity, transform: `rotate(${element.rotation}deg)`, 'z-index': element.zIndex
            };
            if (element.type === 'text') {
                style['font-size'] = element.fontSize + 'px'; style['font-family'] = element.fontFamily;
                style['color'] = element.color; style['font-weight'] = element.bold ? 'bold' : 'normal';
                style['font-style'] = element.italic ? 'italic' : 'normal';
                style['text-decoration'] = element.underline ? 'underline' : 'none'; style['text-align'] = element.textAlign;
            }
            if (element.type === 'shape') {
                style['background-color'] = element.fillColor;
                if (element.shapeType === 'circle') { style['border-radius'] = '50%'; }
                else if (element.shapeType === 'rounded-rectangle') { style['border-radius'] = '12px'; }
            }
            $(`#${element.id}`).css(style);
        });
    }
    
    function updatePlayhead() {
        if (!isPlaying) return;
        const currentTime = timeline.time();
        const progress = totalDuration > 0 ? currentTime / totalDuration : 0;
        $('#timelinePlayhead').css('left', (progress * 100) + '%');
    }
    
    // ============================================
    // EXPORT
    // ============================================
    async function exportToZip() {
        if (elements.length === 0) { alert('Please add at least one element to export'); return; }
        const hasClickthrough = elements.some(el => el.type === 'clickthrough');
        if (!hasClickthrough) {
            const proceed = confirm('Warning: No clickthrough layer added. The banner will not be clickable.\n\nDo you want to continue exporting?');
            if (!proceed) { return; }
        }
        let bannerName = $('#bannerName').val();
        if (window.AD_BUILDER_DEBUG) { console.log('Raw banner name:', bannerName); }
        if (bannerName) { bannerName = bannerName.trim(); }
        if (!bannerName) { bannerName = 'ad-banner'; }
        bannerName = bannerName.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9-_]/g, '');
        if (!bannerName) { bannerName = 'ad-banner'; }
        if (window.AD_BUILDER_DEBUG) { console.log('Final banner name:', bannerName); }
        const usePoliteLoad = $('#politeLoadCheckbox').is(':checked');
        const zip = new JSZip();
        const html = generateHTML(usePoliteLoad);
        zip.file('index.html', html);
        const manifest = generateManifest();
        zip.file('manifest.js', manifest);
        const imageElements = elements.filter(el => el.type === 'image').sort((a, b) => a.zIndex - b.zIndex);
        for (let i = 0; i < imageElements.length; i++) {
            const element = imageElements[i];
            try {
                const response = await fetch(element.src);
                const blob = await response.blob();
                zip.file(`image_${i}.${getExtensionFromDataUrl(element.src)}`, blob);
                if (window.AD_BUILDER_DEBUG) { console.log(`Saved image_${i}.png - element: ${element.id}, zIndex: ${element.zIndex}`); }
            } catch (error) {
                if (window.AD_BUILDER_DEBUG) { console.error('Error adding image to zip:', error); }
            }
        }
        zip.generateAsync({ type: 'blob' }).then(function(content) {
            if (window.AD_BUILDER_DEBUG) { console.log('Saving as:', `${bannerName}.zip`); }
            saveAs(content, `${bannerName}.zip`);
        });
    }
    
    function generateManifest() {
        const clickthroughEls = elements.filter(el => el.type === 'clickthrough');
        const clickTagCount = clickthroughEls.length === 0 ? 0 : Math.max(...clickthroughEls.map(el => el.clickIndex || 1));
        const videoElements = elements.filter(el => el.type === 'video');
        let manifestContent = `FT.manifest({\n    "filename": "index.html",\n    "width": ${canvasWidth},\n    "height": ${canvasHeight},\n    "clickTagCount": ${clickTagCount}`;
        if (videoElements.length > 0) {
            manifestContent += `,\n    "videos": [`;
            videoElements.forEach((video, index) => {
                manifestContent += `\n        { "name": "${video.videoName}", "ref": "${video.videoUrl}" }`;
                if (index < videoElements.length - 1) { manifestContent += ','; }
            });
            manifestContent += `\n    ]`;
        }
        manifestContent += `,\n    "hideBrowsers": ["ie8"]\n});`;
        return manifestContent;
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
        if (window.AD_BUILDER_DEBUG) { console.log('Export - Elements before sort:', elements.map(el => ({ id: el.id, type: el.type, filename: el.filename || el.text?.substring(0,20) || el.type, zIndex: el.zIndex }))); }
        const sortedElements = [...elements].sort((a, b) => a.zIndex - b.zIndex);
        if (window.AD_BUILDER_DEBUG) { console.log('Export - Elements after sort:', sortedElements.map(el => ({ id: el.id, type: el.type, filename: el.filename || el.text?.substring(0,20) || el.type, zIndex: el.zIndex }))); }
        let imageCounter = 0;
        
        sortedElements.forEach((element) => {
            if (element.type === 'image') {
                const imgSrc = `image_${imageCounter}.${getExtensionFromDataUrl(element.src)}`;
                const borderRadius = (element.borderRadius && element.borderRadius > 0) ? `border-radius: ${Math.round(element.borderRadius)}px;` : '';
                elementsHtml += `\n        <img id="${element.id}" src="${imgSrc}" style="position:absolute;left:${Math.round(element.x)}px;top:${Math.round(element.y)}px;width:${Math.round(element.width)}px;height:${Math.round(element.height)}px;object-fit:contain;opacity:${element.opacity};transform:rotate(${element.rotation}deg);${borderRadius}z-index:${element.zIndex};user-select:none;cursor:pointer;">`;
                imageCounter++;
            } else if (element.type === 'text') {
                let textShadow = '';
                if (!element.shadowHover && (element.shadowX || element.shadowY || element.shadowBlur)) { textShadow = `${Math.round(element.shadowX)}px ${Math.round(element.shadowY)}px ${Math.round(element.shadowBlur)}px ${element.shadowColor}`; }
                if (!element.glowHover && (element.glowX || element.glowY || element.glowBlur || element.glowSpread)) {
                    let glowShadow = `${Math.round(element.glowX)}px ${Math.round(element.glowY)}px ${Math.round(element.glowBlur)}px ${element.glowColor}`;
                    if (element.glowSpread > 0) { const sl = []; for (let i = 1; i <= element.glowSpread; i += 2) { sl.push(`${Math.round(element.glowX)}px ${Math.round(element.glowY)}px ${Math.round(element.glowBlur + i)}px ${element.glowColor}`); } glowShadow = [glowShadow, ...sl].join(', '); }
                    textShadow = textShadow ? `${textShadow}, ${glowShadow}` : glowShadow;
                }
                const textShadowStyle = textShadow ? `text-shadow: ${textShadow};` : '';
                let hoverShadow = '';
                if (element.shadowHover && (element.shadowX || element.shadowY || element.shadowBlur)) { hoverShadow = `${Math.round(element.shadowX)}px ${Math.round(element.shadowY)}px ${Math.round(element.shadowBlur)}px ${element.shadowColor}`; }
                if (element.glowHover && (element.glowX || element.glowY || element.glowBlur || element.glowSpread)) {
                    let gs = `${Math.round(element.glowX)}px ${Math.round(element.glowY)}px ${Math.round(element.glowBlur)}px ${element.glowColor}`;
                    if (element.glowSpread > 0) { const sl = []; for (let i = 1; i <= element.glowSpread; i += 2) { sl.push(`${Math.round(element.glowX)}px ${Math.round(element.glowY)}px ${Math.round(element.glowBlur + i)}px ${element.glowColor}`); } gs = [gs, ...sl].join(', '); }
                    hoverShadow = hoverShadow ? `${hoverShadow}, ${gs}` : gs;
                }
                elementsHtml += `\n        <div id="${element.id}" style="position:absolute;left:${Math.round(element.x)}px;top:${Math.round(element.y)}px;width:${Math.round(element.width)}px;height:${Math.round(element.height)}px;opacity:${element.opacity};transform:rotate(${element.rotation}deg);font-size:${Math.round(element.fontSize)}px;font-family:${element.fontFamily};color:${element.color};font-weight:${element.bold?'bold':'normal'};font-style:${element.italic?'italic':'normal'};text-decoration:${element.underline?'underline':'none'};text-align:${element.textAlign};line-height:1.2;word-wrap:break-word;${textShadowStyle}z-index:${element.zIndex};user-select:none;cursor:pointer;">${element.text}</div>`;
                if (element.shadowHover || element.glowHover) {
                    const varName = `text_${element.id.replace(/[^a-zA-Z0-9]/g, '_')}`;
                    clickthroughJs += `\n            const ${varName} = document.getElementById('${element.id}'); ${varName}.addEventListener('mouseenter', function() { this.style.textShadow = '${hoverShadow}'; }); ${varName}.addEventListener('mouseleave', function() { this.style.textShadow = '${textShadow}'; });`;
                }
            } else if (element.type === 'clickthrough') {
                elementsHtml += `\n        <div id="${element.id}" class="clickthrough-zone" data-url="${element.url||''}" data-click-index="${element.clickIndex||1}" style="position:absolute;left:${Math.round(element.x)}px;top:${Math.round(element.y)}px;width:${Math.round(element.width)}px;height:${Math.round(element.height)}px;opacity:0;z-index:${element.zIndex};cursor:pointer;"></div>`;
            } else if (element.type === 'invisible') {
                elementsHtml += `\n        <div id="${element.id}" style="position:absolute;left:${Math.round(element.x)}px;top:${Math.round(element.y)}px;width:${Math.round(element.width)}px;height:${Math.round(element.height)}px;opacity:0;transform:rotate(${element.rotation}deg);z-index:${element.zIndex};user-select:none;cursor:pointer;"></div>`;
            } else if (element.type === 'shape') {
                let borderRadius = '0';
                if (element.shapeType === 'circle') { borderRadius = '50%'; } else if (element.shapeType === 'rounded-rectangle') { borderRadius = '12px'; } else if (element.borderRadius && element.borderRadius > 0) { borderRadius = element.borderRadius + 'px'; }
                const bgColor = element.transparent ? 'transparent' : (element.fillColor || '#ffffff');
                const borderStyle = (element.borderWidth && element.borderWidth > 0) ? `border:${Math.round(element.borderWidth)}px solid ${element.borderColor||'#000000'};box-sizing:border-box;` : '';
                let boxShadow = '';
                if (!element.shadowHover && (element.shadowX || element.shadowY || element.shadowBlur || element.shadowSpread)) { boxShadow = `${Math.round(element.shadowX)}px ${Math.round(element.shadowY)}px ${Math.round(element.shadowBlur)}px ${Math.round(element.shadowSpread)}px ${element.shadowColor}`; }
                if (!element.glowHover && (element.glowX || element.glowY || element.glowBlur || element.glowSpread)) { const gs = `${Math.round(element.glowX)}px ${Math.round(element.glowY)}px ${Math.round(element.glowBlur)}px ${Math.round(element.glowSpread)}px ${element.glowColor}`; boxShadow = boxShadow ? `${boxShadow}, ${gs}` : gs; }
                const boxShadowStyle = boxShadow ? `box-shadow:${boxShadow};` : '';
                let hoverShadow = '';
                if (element.shadowHover && (element.shadowX || element.shadowY || element.shadowBlur || element.shadowSpread)) { hoverShadow = `${Math.round(element.shadowX)}px ${Math.round(element.shadowY)}px ${Math.round(element.shadowBlur)}px ${Math.round(element.shadowSpread)}px ${element.shadowColor}`; }
                if (element.glowHover && (element.glowX || element.glowY || element.glowBlur || element.glowSpread)) { const gs = `${Math.round(element.glowX)}px ${Math.round(element.glowY)}px ${Math.round(element.glowBlur)}px ${Math.round(element.glowSpread)}px ${element.glowColor}`; hoverShadow = hoverShadow ? `${hoverShadow}, ${gs}` : gs; }
                elementsHtml += `\n        <div id="${element.id}" style="position:absolute;left:${Math.round(element.x)}px;top:${Math.round(element.y)}px;width:${Math.round(element.width)}px;height:${Math.round(element.height)}px;opacity:${element.opacity};transform:rotate(${element.rotation}deg);background-color:${bgColor};border-radius:${borderRadius};${borderStyle}${boxShadowStyle}z-index:${element.zIndex};user-select:none;cursor:pointer;"></div>`;
                if (element.shadowHover || element.glowHover) {
                    const varName = `shape_${element.id.replace(/[^a-zA-Z0-9]/g, '_')}`;
                    clickthroughJs += `\n            const ${varName} = document.getElementById('${element.id}'); ${varName}.addEventListener('mouseenter', function() { this.style.boxShadow = '${hoverShadow}'; }); ${varName}.addEventListener('mouseleave', function() { this.style.boxShadow = '${boxShadow}'; });`;
                }
            } else if (element.type === 'video') {
                const autoplayAttr = element.playTrigger === 'autoplay' ? ' autoplay' : '';
                const mutedAttr = element.muted ? ' muted' : '';
                const controlsAttr = element.controls ? ' controls' : '';
                elementsHtml += `\n        <ft-video id="${element.videoName}" name="${element.videoName}"${autoplayAttr}${mutedAttr}${controlsAttr} data-play-trigger="${element.playTrigger||'autoplay'}" style="position:absolute;left:${Math.round(element.x)}px;top:${Math.round(element.y)}px;width:${Math.round(element.width)}px;height:${Math.round(element.height)}px;opacity:${element.opacity};transform:rotate(${element.rotation}deg);z-index:${element.zIndex};"></ft-video>`;
            }
            
            element.animations.forEach(anim => {
                const types = anim.types || [anim.type];
                let mergedProps = {}, startAt = null;
                types.forEach(type => {
                    const props = getAnimationPropsForExport(type, element, anim.customProps);
                    if (props.startAt) { startAt = startAt || {}; Object.assign(startAt, props.startAt); delete props.startAt; }
                    Object.assign(mergedProps, props);
                });
                if (startAt) { animationsJs += `\n        gsap.set('#${element.id}', ${JSON.stringify(startAt)});`; }
                animationsJs += `\n        tl.to('#${element.id}', {\n            ${Object.entries(mergedProps).map(([key, value]) => `${key}: ${JSON.stringify(value)}`).join(',\n            ')},\n            duration: ${anim.duration},\n            ease: '${anim.ease}'\n        }, ${anim.start});`;
            });
        });
        
        groups.forEach(folder => {
            if (!folder.animations || folder.animations.length === 0) return;
            folder.animations.forEach(anim => {
                const types = anim.types || [anim.type];
                const folderElements = elements.filter(el => el.folderId === folder.id);
                folderElements.forEach(element => {
                    let mergedProps = {}, startAt = null;
                    types.forEach(type => {
                        const props = getAnimationPropsForExport(type, element, anim.customProps);
                        if (props.startAt) { startAt = startAt || {}; Object.assign(startAt, props.startAt); delete props.startAt; }
                        Object.assign(mergedProps, props);
                    });
                    if (startAt) { animationsJs += `\n        gsap.set('#${element.id}', ${JSON.stringify(startAt)});`; }
                    animationsJs += `\n        tl.to('#${element.id}', {\n            ${Object.entries(mergedProps).map(([key, value]) => `${key}: ${JSON.stringify(value)}`).join(',\n            ')},\n            duration: ${anim.duration},\n            ease: '${anim.ease}'\n        }, ${anim.start});`;
                });
            });
        });
        
        let interactionsJs = '';
        sortedElements.forEach((element) => {
            if (!element.interactions) return;
            const elemId = element.id;
            const interactions = element.interactions;
            if (interactions.click.enabled) {
                const target = interactions.click.targetElement === 'self' ? elemId : interactions.click.targetElement;
                const action = interactions.click.action;
                interactionsJs += `\n        document.getElementById('${elemId}').addEventListener('click', function() {`;
                if (action === 'pauseAnimation') { interactionsJs += `\n            if (window.mainTimeline) window.mainTimeline.pause();`; }
                else if (action === 'playAnimation') { interactionsJs += `\n            if (window.mainTimeline) window.mainTimeline.play();`; }
                else if (action === 'toggleAnimation') { interactionsJs += `\n            if (window.mainTimeline) window.mainTimeline.paused() ? window.mainTimeline.play() : window.mainTimeline.pause();`; }
                else if (action === 'addShadow') { const shadow = `${interactions.click.shadowX}px ${interactions.click.shadowY}px ${interactions.click.shadowBlur}px ${interactions.click.shadowColor}`; interactionsJs += `\n            var targetEl = document.getElementById('${target}'); targetEl.style.transition = '${element.type==='text'?'text-shadow':'box-shadow'} 0.3s ease'; targetEl.style.${element.type==='text'?'textShadow':'boxShadow'} = '${shadow}';`; }
                else if (action === 'addGlow') { const glow = `${interactions.click.glowX}px ${interactions.click.glowY}px ${interactions.click.glowBlur}px ${interactions.click.glowColor}`; interactionsJs += `\n            var targetEl = document.getElementById('${target}'); targetEl.style.transition = '${element.type==='text'?'text-shadow':'box-shadow'} 0.3s ease'; targetEl.style.${element.type==='text'?'textShadow':'boxShadow'} = '${glow}';`; }
                else if (action === 'scale') { interactionsJs += `\n            var targetEl = document.getElementById('${target}'); targetEl.style.transition = 'transform 0.3s ease'; targetEl.style.transform = 'scale(${interactions.click.scaleAmount})';`; }
                else if (action === 'hide') { interactionsJs += `\n            var targetEl = document.getElementById('${target}'); targetEl.style.transition = 'opacity 0.3s ease'; targetEl.style.opacity = '0';`; }
                else if (action === 'show') { interactionsJs += `\n            var targetEl = document.getElementById('${target}'); targetEl.style.transition = 'opacity 0.3s ease'; targetEl.style.opacity = '1';`; }
                interactionsJs += `\n        });`;
            }
            if (interactions.hover.enabled) {
                const target = interactions.hover.targetElement === 'self' ? elemId : interactions.hover.targetElement;
                const action = interactions.hover.action;
                interactionsJs += `\n        document.getElementById('${elemId}').addEventListener('mouseenter', function() {`;
                if (action === 'pauseAnimation') { interactionsJs += `\n            if (window.mainTimeline) window.mainTimeline.pause();`; }
                else if (action === 'addShadow') { const shadow = `${interactions.hover.shadowX}px ${interactions.hover.shadowY}px ${interactions.hover.shadowBlur}px ${interactions.hover.shadowColor}`; interactionsJs += `\n            var targetEl = document.getElementById('${target}'); targetEl.style.transition = '${element.type==='text'?'text-shadow':'box-shadow'} 0.3s ease'; targetEl.style.${element.type==='text'?'textShadow':'boxShadow'} = '${shadow}';`; }
                else if (action === 'addGlow') { const glow = `${interactions.hover.glowX}px ${interactions.hover.glowY}px ${interactions.hover.glowBlur}px ${interactions.hover.glowColor}`; interactionsJs += `\n            var targetEl = document.getElementById('${target}'); targetEl.style.transition = '${element.type==='text'?'text-shadow':'box-shadow'} 0.3s ease'; targetEl.style.${element.type==='text'?'textShadow':'boxShadow'} = '${glow}';`; }
                else if (action === 'scale') { interactionsJs += `\n            var targetEl = document.getElementById('${target}'); targetEl.style.transition = 'transform 0.3s ease'; targetEl.style.transform = 'scale(${interactions.hover.scaleAmount})';`; }
                interactionsJs += `\n        });`;
                interactionsJs += `\n        document.getElementById('${elemId}').addEventListener('mouseleave', function() {`;
                if (action === 'addShadow' || action === 'addGlow') { interactionsJs += `\n            var targetEl = document.getElementById('${target}'); targetEl.style.transition = '${element.type==='text'?'text-shadow':'box-shadow'} 0.3s ease'; targetEl.style.${element.type==='text'?'textShadow':'boxShadow'} = '';`; }
                else if (action === 'scale') { interactionsJs += `\n            var targetEl = document.getElementById('${target}'); targetEl.style.transition = 'transform 0.3s ease'; targetEl.style.transform = 'scale(1)';`; }
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
        body { margin: 0; padding: 0; overflow: hidden; }
        #ad-container { position: relative; width: ${canvasWidth}px; height: ${canvasHeight}px; background: white; overflow: hidden; border: 1px solid #000; box-sizing: border-box;${usePoliteLoad ? '\n            opacity: 0; visibility: hidden;' : ''} }${usePoliteLoad ? `
        #ad-container.loaded { opacity: 1; visibility: visible; }
        .loader { position: absolute; width: 15px; aspect-ratio: 1; border-radius: 50%; animation: l5 1s infinite linear alternate; left: calc(50% - 10px); top: calc(50% - 10px); }
        @keyframes l5 { 0%{box-shadow:20px 0 #000,-20px 0 #0002;background:#000} 33%{box-shadow:20px 0 #000,-20px 0 #0002;background:#0002} 66%{box-shadow:20px 0 #0002,-20px 0 #000;background:#0002} 100%{box-shadow:20px 0 #0002,-20px 0 #000;background:#000} }
        .loader.hidden { display: none; }` : ''}
    </style>
</head>
<body>
    <script src="https://cdn.flashtalking.com/frameworks/js/api/2/10/html5API.js"></script>
    <script src="https://cdn.flashtalking.com/feeds/frameworks/js/utils/Tracker.js"></script>
    ${usePoliteLoad ? '<div class="loader"></div>' : ''}
    <div id="ad-container">${elementsHtml}
    </div>
    <script>${usePoliteLoad ? `
        function politeLoad(callback) { if (document.readyState === 'complete') { callback(); } else { window.addEventListener('load', callback); } }
        function initAd() {
            const images = document.querySelectorAll('#ad-container img');
            const loader = document.querySelector('.loader');
            const adContainer = document.getElementById('ad-container');
            if (images.length === 0) { loader.classList.add('hidden'); adContainer.classList.add('loaded'); startAnimation(); return; }
            let loadedCount = 0;
            function imageLoaded() { loadedCount++; if (loadedCount === images.length) { loader.classList.add('hidden'); adContainer.classList.add('loaded'); startAnimation(); } }
            images.forEach(function(img) { if (img.complete) { imageLoaded(); } else { img.addEventListener('load', imageLoaded); img.addEventListener('error', imageLoaded); } });
        }` : ''}
        function startAnimation() {
            const clickthroughZones = document.querySelectorAll('.clickthrough-zone');
            clickthroughZones.forEach(function(zone) { zone.addEventListener('click', function() { const url = this.getAttribute('data-url'); const clickIndex = parseInt(this.getAttribute('data-click-index')) || 1; myFT.clickTag(clickIndex, url); }); });
            const videos = document.querySelectorAll('ft-video[data-play-trigger]');
            videos.forEach(function(video) {
                const playTrigger = video.getAttribute('data-play-trigger');
                if (playTrigger === 'mouseover') { video.addEventListener('mouseenter', function() { this.play(); }); }
                else if (playTrigger === 'click') { video.addEventListener('click', function(e) { const videoRect = this.getBoundingClientRect(); const clickY = e.clientY - videoRect.top; const hasControls = this.hasAttribute('controls'); const clickedOnControls = hasControls && clickY > (videoRect.height - 40); if (!clickedOnControls) { if (this.paused) { this.play(); } else { this.pause(); } } }); }
            });
            ${clickthroughJs}
            ${interactionsJs}
            window.mainTimeline = gsap.timeline({ repeat: ${animLoop} });
            const tl = window.mainTimeline;
            ${animationsJs}
        }
        ${usePoliteLoad ? 'politeLoad(initAd);' : 'startAnimation();'}
    </script>
</body>
</html>`;
    }
    
    function getAnimationPropsForExport(type, element, customProps = {}) {
        if (type === 'custom') { return customProps; }
        const props = {};
        switch(type) {
            case 'fadeIn': props.startAt = { opacity: 0 }; props.opacity = element.opacity; break;
            case 'fadeOut': props.opacity = 0; break;
            case 'slideLeft': props.startAt = { x: -canvasWidth }; props.x = 0; break;
            case 'slideRight': props.startAt = { x: canvasWidth }; props.x = 0; break;
            case 'slideUp': props.startAt = { y: -canvasHeight }; props.y = 0; break;
            case 'slideDown': props.startAt = { y: canvasHeight }; props.y = 0; break;
            case 'slideToLeft': props.x = -canvasWidth; break;
            case 'slideToRight': props.x = canvasWidth; break;
            case 'slideToUp': props.y = -canvasHeight; break;
            case 'slideToDown': props.y = canvasHeight; break;
            case 'scale': case 'scaleIn': props.startAt = { scale: 0 }; props.scale = 1; break;
            case 'scaleOut': props.startAt = { scale: 1 }; props.scale = 2; break;
            case 'scaleFrom': const scaleFrom = customProps.scaleFrom !== undefined ? customProps.scaleFrom : 0; props.startAt = { scale: scaleFrom }; props.scale = 1; break;
            case 'rotate': case 'rotate360': props.rotation = '+=360'; break;
            case 'rotate90': props.rotation = '+=90'; break;
            case 'rotate180': props.rotation = '+=180'; break;
            case 'rotate270': props.rotation = '+=270'; break;
            case 'rotateFrom': const rotateFrom = customProps.rotateFrom !== undefined ? customProps.rotateFrom : 0; props.startAt = { rotation: rotateFrom }; props.rotation = element.rotation; break;
        }
        return props;
    }
    
    function clearAll() {
        if (elements.length === 0) return;
        if (confirm('Are you sure you want to clear all elements?')) {
            elements = []; selectedElement = null;
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
    function handleDragStart(e) { draggedLayerId = $(e.currentTarget).data('id'); $(e.currentTarget).addClass('dragging'); e.originalEvent.dataTransfer.effectAllowed = 'move'; }
    function handleDragOverLayer(e) {
        e.preventDefault(); e.originalEvent.dataTransfer.dropEffect = 'move';
        const $target = $(e.currentTarget);
        if (!$target.hasClass('dragging')) {
            $('.layer-item').removeClass('drag-over drag-over-top drag-over-bottom');
            const rect = e.currentTarget.getBoundingClientRect();
            if (e.clientY < rect.top + rect.height / 2) { $target.addClass('drag-over-top'); } else { $target.addClass('drag-over-bottom'); }
        }
    }
    function handleLayerDrop(e) {
        e.preventDefault(); e.stopPropagation();
        const targetId = $(e.currentTarget).data('id');
        if (!draggedLayerId || draggedLayerId === targetId) { handleDragEnd(e); return; }
        const draggedEl = elements.find(el => el.id === draggedLayerId);
        const targetEl = elements.find(el => el.id === targetId);
        if (draggedEl && targetEl) {
            const draggedIndex = elements.indexOf(draggedEl);
            const rect = e.currentTarget.getBoundingClientRect();
            const dropBelow = e.originalEvent.clientY > rect.top + rect.height / 2;
            elements.splice(draggedIndex, 1);
            let newIndex = elements.indexOf(targetEl);
            if (dropBelow) { newIndex += 1; }
            elements.splice(newIndex, 0, draggedEl);
            elements.forEach((el, idx) => { el.zIndex = idx; $(`#${el.id}`).css('z-index', el.zIndex); });
            updateLayersList(); rebuildTimeline();
        }
        handleDragEnd(e);
    }
    function handleDragEnd(e) { $('.layer-item').removeClass('dragging drag-over'); draggedLayerId = null; }
    window.handleDragStart = handleDragStart;
    window.handleDragOverLayer = handleDragOverLayer;
    window.handleLayerDrop = handleLayerDrop;
    window.handleDragEnd = handleDragEnd;
    
    // ============================================
    // ZOOM CONTROLS
    // ============================================
    function updateStageZoom() {
        const currentWidth = canvasWidth; const currentHeight = canvasHeight;
        $canvasWrapper.css({ 'transform': `scale(${stageZoom})`, 'transform-origin': 'center center', 'width': `${currentWidth}px`, 'height': `${currentHeight}px`, 'margin': `${currentHeight * (1 - stageZoom) / 2}px ${currentWidth * (1 - stageZoom) / 2}px` });
        $('#stageZoomLevel').text(Math.round(stageZoom * 100) + '%');
    }
    function stageZoomIn() { if (stageZoom < 2.0) { stageZoom = Math.min(2.0, Math.round((stageZoom + 0.25) * 4) / 4); updateStageZoom(); } }
    function stageZoomOut() { if (stageZoom > 0.25) { stageZoom = Math.max(0.25, Math.round((stageZoom - 0.25) * 4) / 4); updateStageZoom(); } }
    function stageZoomReset() {
        const containerWidth = $('#canvasContainer').width(); const containerHeight = $('#canvasContainer').height();
        const zoomToFit = Math.min(containerWidth / canvasWidth, containerHeight / canvasHeight, 1.0);
        if (zoomToFit >= 1.0) { stageZoom = 1.0; } else { stageZoom = Math.max(0.25, Math.floor(zoomToFit * 4) / 4); }
        updateStageZoom();
    }
    
    // ============================================
    // SAVE/LOAD PROJECT FUNCTIONS
    // ============================================
    async function saveProject() {
        try {
            if (elements.length === 0) { alert('Nothing to save! Please add some elements to the canvas first.'); return; }
            let bannerName = ($('#bannerName').val() || '').trim();
            if (!bannerName) { bannerName = `${canvasWidth}x${canvasHeight}-banner`; }
            const safeBannerName = bannerName.replace(/[^a-z0-9_-]/gi, '_') || 'banner';
            const imageMapping = {};
            let imageIndex = 0;
            elements.forEach(el => {
                if (el.type === 'image') {
                    imageIndex++;
                    const ext = getExtensionFromDataUrl(el.src);
                    const filename = `image_${imageIndex}.${ext}`;
                    imageMapping[el.id] = { filename: filename, dataUrl: el.src };
                }
            });
            const projectData = {
                version: '1.0', timestamp: new Date().toISOString(), bannerName,
                canvasWidth, canvasHeight, totalDuration,
                animLoop,
                elements: elements.map(el => {
                    if (el.type === 'image') { return { ...el, imageFile: imageMapping[el.id].filename }; }
                    return el;
                }),
                groups
            };
            const zip = new JSZip();
            zip.file('project.json', JSON.stringify(projectData, null, 2));
            for (const [elementId, imageData] of Object.entries(imageMapping)) {
                const base64Data = imageData.dataUrl.split(',')[1];
                zip.file(imageData.filename, base64Data, { base64: true });
            }
            const blob = await zip.generateAsync({ type: 'blob' });
            const timestamp = new Date().toISOString().slice(0, 10);
            const filename = `${safeBannerName}-${timestamp}.zip`;
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url; a.download = filename; a.click();
            URL.revokeObjectURL(url);
            if (window.AD_BUILDER_DEBUG) { console.log('Project saved successfully as:', filename); }
        } catch (error) {
            if (window.AD_BUILDER_DEBUG) { console.error('Error saving project:', error); }
            alert('Error saving project. Please try again.');
        }
    }
    
    async function loadProject(event) {
        const file = event.target.files[0];
        if (!file) return;
        try {
            const zip = await JSZip.loadAsync(file);
            const projectJsonFile = zip.file('project.json');
            if (!projectJsonFile) { alert('Invalid project file: project.json not found'); return; }
            const projectJson = await projectJsonFile.async('string');
            const projectData = JSON.parse(projectJson);
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
            elements.length = 0; groups.length = 0;
            selectedElement = null; selectedFolder = null;
            canvasWidth = projectData.canvasWidth || 300;
            canvasHeight = projectData.canvasHeight || 250;
            totalDuration = projectData.totalDuration || 5;
            animLoop = projectData.animLoop !== undefined ? projectData.animLoop : 0;
            $('#canvasSize').val(`${canvasWidth}x${canvasHeight}`);
            $('#totalDuration').val(totalDuration);
            $('#animLoop').val(animLoop + 1);
            if (projectData.bannerName) { $('#bannerName').val(projectData.bannerName); }
            updateCanvasSize();
            for (const element of projectData.elements) {
                if (element.type === 'image' && element.imageFile) {
                    element.src = imageDataUrls[element.imageFile] || element.src;
                    delete element.imageFile;
                }
                elements.push(element);
            }
            if (projectData.groups) { groups.push(...projectData.groups); }
            const maxId = Math.max(0, ...elements.map(el => { const match = el.id.match(/element_(\d+)/); return match ? parseInt(match[1]) : 0; }));
            elementCounter = maxId;
            const maxFolderId = Math.max(0, ...groups.map(g => { const match = g.id.match(/folder_(\d+)/); return match ? parseInt(match[1]) : 0; }));
            folderCounter = maxFolderId;
            updateCanvas(); updateLayersList(); rebuildTimeline(); updatePropertiesPanel();
            $('#loadProjectInput').val('');
            if (window.AD_BUILDER_DEBUG) { console.log('Project loaded successfully!'); }
            alert('Project loaded successfully!');
        } catch (error) {
            if (window.AD_BUILDER_DEBUG) { console.error('Error loading project:', error); }
            alert('Error loading project. Please make sure the file is a valid project ZIP.');
        }
    }
    
    function blobToDataURL(blob) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    }

})();
