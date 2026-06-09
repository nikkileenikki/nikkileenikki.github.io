export function getCanvasPointerPosition({
    pageX,
    pageY,
    canvasOffset,
    scrollLeft,
    scrollTop,
    stageZoom
}) {
    return {
        x: (pageX + scrollLeft - canvasOffset.left) / stageZoom,
        y: (pageY + scrollTop - canvasOffset.top) / stageZoom
    };
}

export function buildElementDragOffset({
    pageX,
    pageY,
    canvasOffset,
    scrollLeft,
    scrollTop,
    stageZoom,
    element
}) {
    const pointer = getCanvasPointerPosition({
        pageX,
        pageY,
        canvasOffset,
        scrollLeft,
        scrollTop,
        stageZoom
    });

    return {
        x: pointer.x - element.x,
        y: pointer.y - element.y
    };
}

export function buildFolderDragOffset({
    pageX,
    pageY,
    canvasOffset,
    scrollLeft,
    scrollTop,
    stageZoom,
    folder
}) {
    const pointer = getCanvasPointerPosition({
        pageX,
        pageY,
        canvasOffset,
        scrollLeft,
        scrollTop,
        stageZoom
    });

    return {
        x: pointer.x - (folder.x || 0),
        y: pointer.y - (folder.y || 0)
    };
}
