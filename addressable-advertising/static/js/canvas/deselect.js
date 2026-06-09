export function deselectAllUI() {
    $('.canvas-element').removeClass('selected');
    $('.canvas-folder').removeClass('selected');
    $('.layer-item').removeClass('selected');
    $('.timeline-track').removeClass('selected');
    $('.timeline-folder').removeClass('selected');
}

export function shouldDeselectFromOutsideClick({ $target }) {
    return (
        !$target.closest('#canvasContainer').length &&
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
        !$target.closest('.w-80').length
    );
}

export function isCanvasContainerBackgroundClick({ target }) {
    return target && target.id === 'canvasContainer';
}
