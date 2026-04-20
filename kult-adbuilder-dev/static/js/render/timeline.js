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
