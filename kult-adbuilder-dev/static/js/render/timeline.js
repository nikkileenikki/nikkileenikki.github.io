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
