export function updateTimelineRuler({ $timelineRuler, totalDuration }) {
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

        if (!window.isPlaying && window.timeline) {
            window.timeline.seek(time);
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
