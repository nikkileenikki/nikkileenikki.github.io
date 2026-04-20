function round1(value) {
    return Math.round(value * 10) / 10;
}

const FOLDER_ZINDEX_STRIDE = 100;

export function updateTimelineRuler({ $timelineRuler, totalDuration, timeline, isPlaying }) {
    $timelineRuler.empty();

    const steps = Math.ceil(totalDuration);

    for (let i = 0; i <= steps; i++) {
        const left = (i / steps) * 100;
        $timelineRuler.append(`
            <div class="timeline-time-marker" style="left: ${left}%" data-time="${i}">
                <div class="timeline-time-label" data-time="${i}">${i}s</div>
            </div>
        `);
    }

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

export function getElementIconAndLabel({ element, elements }) {
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

export function renderTrack({ element, elements, totalDuration }) {
    const { icon, label } = getElementIconAndLabel({ element, elements });

    const $track = $(`
        <li class="timeline-track layer" data-element-id="${element.id}">
            <div class="timeline-track-label">
                <span class="timeline-handle">⋮⋮</span>
                <i class="fas ${icon} text-blue-400 mr-2"></i>
                <span class="truncate flex-1 track-name-label" data-element-id="${element.id}">${label}</span>
                <div class="flex items-center gap-1 ml-2">
                    <button class="timeline-layer-btn toggle-visibility" data-id="${element.id}" title="Toggle visibility">
                        <i class="fas ${element.visible === false ? 'fa-eye-slash' : 'fa-eye'} text-xs"></i>
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

    element.animations.forEach(anim => {
        const leftPercent = round1((anim.start / totalDuration) * 100);
        const widthPercent = round1((anim.duration / totalDuration) * 100);

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

export function renderEmptyTimelineState({ $timelineTracks }) {
    $timelineTracks.html('<div class="text-center text-gray-500 text-sm py-8">Add elements and animations to see timeline</div>');
}

export function buildTimelineItems({ groups, elements }) {
    const timelineItems = [];

    groups.forEach(group => {
        timelineItems.push({
            type: 'folder',
            data: group,
            zIndex: group.zIndex
        });
    });

    elements.forEach(element => {
        if (!element.folderId) {
            timelineItems.push({
                type: 'element',
                data: element,
                zIndex: element.zIndex
            });
        }
    });

    timelineItems.sort((a, b) => b.zIndex - a.zIndex);

    return timelineItems;
}

export function renderFolderTrack({ group, elements, totalDuration, renderTrack }) {
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

    if (group.animations && group.animations.length > 0) {
        group.animations.forEach(anim => {
            const leftPercent = round1((anim.start / totalDuration) * 100);
            const widthPercent = round1((anim.duration / totalDuration) * 100);

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

    const folderElements = elements.filter(el => el.folderId === group.id);
    folderElements.sort((a, b) => b.zIndex - a.zIndex);

    folderElements.forEach(element => {
        $folder.find('.timeline-folder-children').append(renderTrack(element));
    });

    return $folder;
}

export function buildRootSortableConfig({
    saveState,
    updateStructureFromDOM,
    getHasSavedSortableSnapshot,
    setHasSavedSortableSnapshot
}) {
    return {
        items: '> .layer, > .timeline-folder',
        connectWith: '.timeline-folder-children',
        handle: '.timeline-handle',
        placeholder: 'ui-sortable-placeholder',
        tolerance: 'pointer',
        forcePlaceholderSize: true,
        start: function() {
            if (!getHasSavedSortableSnapshot()) {
                saveState();
                setHasSavedSortableSnapshot(true);
            }
        },
        update: function() {
            updateStructureFromDOM();
        },
        stop: function() {
            setHasSavedSortableSnapshot(false);
        }
    };
}

export function buildFolderChildrenSortableConfig({
    saveState,
    updateStructureFromDOM,
    getHasSavedSortableSnapshot,
    setHasSavedSortableSnapshot
}) {
    return {
        items: '> .layer',
        connectWith: '#timelineTracks, .timeline-folder-children',
        handle: '.timeline-handle',
        placeholder: 'ui-sortable-placeholder',
        tolerance: 'pointer',
        forcePlaceholderSize: true,
        start: function() {
            if (!getHasSavedSortableSnapshot()) {
                saveState();
                setHasSavedSortableSnapshot(true);
            }
        },
        receive: function(e, ui) {
            if (ui.item.hasClass('timeline-folder')) {
                $(this).sortable('cancel');
            }
        },
        update: function() {
            updateStructureFromDOM();
        },
        stop: function() {
            setHasSavedSortableSnapshot(false);
        }
    };
}

export function updateStructureFromDOM({
    $timelineTracks,
    elements,
    groups,
    $canvas,
    applyFolderInteractions,
    updateLayersList
}) {
    const maxZIndex = elements.length + groups.length;
    let currentZIndex = maxZIndex;

    $timelineTracks.children('li').each(function() {
        if ($(this).hasClass('timeline-folder')) {
            const folderId = $(this).data('folder-id');
            const group = groups.find(g => g.id === folderId);

            if (group) {
                group.zIndex = currentZIndex--;

                let folderZIndex = group.zIndex * FOLDER_ZINDEX_STRIDE;
                $(this).find('.timeline-folder-children > li').each(function() {
                    const elementId = $(this).data('element-id');
                    const element = elements.find(el => el.id === elementId);

                    if (element) {
                        element.folderId = folderId;
                        element.zIndex = folderZIndex--;

                        const $element = $(`#${element.id}`);
                        let $folderWrapper = $(`#${folderId}`);

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
                            applyFolderInteractions(group, $folderWrapper);
                        }

                        $folderWrapper.css('z-index', group.zIndex);

                        if ($element.parent().attr('id') !== folderId) {
                            $folderWrapper.append($element);
                        }

                        $element.css('z-index', element.zIndex);
                    }
                });
            }
        } else {
            const elementId = $(this).data('element-id');
            const element = elements.find(el => el.id === elementId);

            if (element) {
                element.folderId = null;
                element.zIndex = currentZIndex--;

                const $element = $(`#${element.id}`);
                if ($element.parent().hasClass('canvas-folder')) {
                    $canvas.append($element);
                }

                $element.css('z-index', element.zIndex);
                $element.appendTo($canvas);
            }
        }
    });

    updateLayersList();
}

export function handleTimelineBlockDragStart({
    event,
    saveState,
    elements,
    groups,
    totalDuration,
    setIsTimelineBlockDragging,
    setDraggedBlock,
    rebuildTimeline
}) {
    if ($(event.target).hasClass('timeline-block-resize-handle') ||
        $(event.target).closest('.delete-anim').length > 0) {
        return;
    }

    event.preventDefault();
    event.stopPropagation();

    const $block = $(event.currentTarget);
    const animId = $block.data('anim-id');
    const elementId = $block.data('element-id');
    const folderId = $block.data('folder-id');

    let hasMoved = false;
    setDraggedBlock({ animId, elementId, folderId, $block });

    const $track = $block.parent();
    const trackOffset = $track.offset().left;
    const trackWidth = $track.width();
    const blockOffset = $block.offset().left;
    const startX = event.pageX;
    const initialLeft = blockOffset - trackOffset;

    const moveHandler = function(moveEvent) {
        const deltaX = moveEvent.pageX - startX;

        if (!hasMoved && Math.abs(deltaX) > 3) {
            saveState();
            hasMoved = true;
            setIsTimelineBlockDragging(true);
        }

        if (!hasMoved) return;

        let newLeft = initialLeft + deltaX;
        newLeft = Math.max(0, Math.min(trackWidth - $block.width(), newLeft));

        const newLeftPercent = round1((newLeft / trackWidth) * 100);
        $block.css('left', newLeftPercent + '%');

        let target, anim;
        if (folderId) {
            target = groups.find(g => g.id === folderId);
        } else {
            target = elements.find(el => el.id === elementId);
        }

        if (target) {
            anim = target.animations.find(a => a.id === animId);
            if (anim) {
                anim.start = round1((newLeftPercent / 100) * totalDuration);
            }
        }
    };

    const upHandler = function() {
        $(document).off('mousemove', moveHandler);
        $(document).off('mouseup', upHandler);

        if (hasMoved) {
            rebuildTimeline();
        }

        setTimeout(() => {
            setIsTimelineBlockDragging(false);
            setDraggedBlock(null);
        }, 50);
    };

    $(document).on('mousemove', moveHandler);
    $(document).on('mouseup', upHandler);
}

export function handleTimelineBlockResizeStart({
    event,
    saveState,
    elements,
    groups,
    totalDuration,
    setIsTimelineBlockResizing,
    setResizeDirection,
    setDraggedBlock,
    rebuildTimeline
}) {
    event.preventDefault();
    event.stopPropagation();

    const $handle = $(event.currentTarget);
    const $block = $handle.parent();
    const animId = $block.data('anim-id');
    const elementId = $block.data('element-id');
    const folderId = $block.data('folder-id');

    saveState();
    setIsTimelineBlockResizing(true);
    setResizeDirection($handle.hasClass('left') ? 'left' : 'right');
    setDraggedBlock({ animId, elementId, folderId, $block });

    const $track = $block.parent();
    const trackWidth = $track.width();
    const startX = event.pageX;
    const initialLeftPercent = parseFloat($block[0].style.left) || 0;
    const initialWidthPercent = parseFloat($block[0].style.width) || 0;
    const initialLeftPx = (initialLeftPercent / 100) * trackWidth;
    const initialWidthPx = (initialWidthPercent / 100) * trackWidth;

    const moveHandler = function(moveEvent) {
        const deltaX = moveEvent.pageX - startX;

        let target;
        if (folderId) {
            target = groups.find(g => g.id === folderId);
        } else {
            target = elements.find(el => el.id === elementId);
        }
        if (!target) return;

        const anim = target.animations.find(a => a.id === animId);
        if (!anim) return;

        const minWidthPx = Math.max(20, trackWidth * 0.02);

        if ($handle.hasClass('left')) {
            const rightEdgePx = initialLeftPx + initialWidthPx;

            let newLeftPx = initialLeftPx + deltaX;
            newLeftPx = Math.max(0, Math.min(rightEdgePx - minWidthPx, newLeftPx));

            let newWidthPx = rightEdgePx - newLeftPx;
            newWidthPx = Math.max(minWidthPx, newWidthPx);

            const newLeftPercent = round1((newLeftPx / trackWidth) * 100);
            const newWidthPercent = round1((newWidthPx / trackWidth) * 100);

            $block.css('left', newLeftPercent + '%');
            $block.css('width', newWidthPercent + '%');

            anim.start = round1((newLeftPercent / 100) * totalDuration);
            anim.duration = round1((newWidthPercent / 100) * totalDuration);
        } else {
            let newWidthPx = initialWidthPx + deltaX;
            const maxWidthPx = trackWidth - initialLeftPx;
            newWidthPx = Math.max(minWidthPx, Math.min(maxWidthPx, newWidthPx));

            const newWidthPercent = round1((newWidthPx / trackWidth) * 100);

            $block.css('width', newWidthPercent + '%');
            anim.duration = round1((newWidthPercent / 100) * totalDuration);
        }
    };

    const upHandler = function() {
        $(document).off('mousemove', moveHandler);
        $(document).off('mouseup', upHandler);

        rebuildTimeline();

        // Keep resize flag alive briefly so click-after-mouseup does not open modal
        setTimeout(() => {
            setIsTimelineBlockResizing(false);
            setResizeDirection(null);
            setDraggedBlock(null);
        }, 50);
    };

    $(document).on('mousemove', moveHandler);
    $(document).on('mouseup', upHandler);
}

export function handlePlayheadDragStart({
    event,
    timeline,
    totalDuration,
    getIsPlaying,
    setIsPlayheadDragging
}) {
    event.preventDefault();
    event.stopPropagation();
    setIsPlayheadDragging(true);

    function updateFromPointer(pageX) {
        const $ruler = $('#timelineRuler');
        const rulerOffset = $ruler.offset().left;
        const rulerWidth = $ruler.width();
        if (!rulerWidth) return;

        const mouseX = pageX - rulerOffset;

        let percent = (mouseX / rulerWidth) * 100;
        percent = Math.max(0, Math.min(100, percent));

        $('#timelinePlayhead').css('left', percent + '%');

        if (!getIsPlaying() && timeline) {
            const time = Math.round(((percent / 100) * totalDuration) * 10) / 10;
            timeline.seek(time);
        }
    }

    // Update immediately on mousedown too
    updateFromPointer(event.pageX);

    const moveHandler = function(moveEvent) {
        updateFromPointer(moveEvent.pageX);
    };

    const upHandler = function() {
        setIsPlayheadDragging(false);
        $(document).off('mousemove.playhead mouseup.playhead');
    };

    $(document).on('mousemove.playhead', moveHandler);
    $(document).on('mouseup.playhead', upHandler);
}
