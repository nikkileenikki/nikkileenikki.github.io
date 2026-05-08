export function computeDraggedElementPosition({ pointer, dragOffset }) {
    return {
        newX: pointer.x - dragOffset.x,
        newY: pointer.y - dragOffset.y
    };
}

export function computeFolderDraggedPosition({ pointer, dragOffset }) {
    return {
        newFolderX: pointer.x - dragOffset.x,
        newFolderY: pointer.y - dragOffset.y
    };
}

export function computeResizeResult({
    element,
    resizeHandle,
    mouseX,
    mouseY,
    minSize = 20
}) {
    let newWidth = element.width;
    let newHeight = element.height;
    let newX = element.x;
    let newY = element.y;

    switch (resizeHandle) {
        case 'se':
            newWidth = Math.max(minSize, mouseX - element.x);
            newHeight = Math.max(minSize, mouseY - element.y);
            break;

        case 'sw':
            newWidth = Math.max(minSize, element.x + element.width - mouseX);
            newHeight = Math.max(minSize, mouseY - element.y);
            newX = mouseX;
            break;

        case 'ne':
            newWidth = Math.max(minSize, mouseX - element.x);
            newHeight = Math.max(minSize, element.y + element.height - mouseY);
            newY = mouseY;
            break;

        case 'nw':
            newWidth = Math.max(minSize, element.x + element.width - mouseX);
            newHeight = Math.max(minSize, element.y + element.height - mouseY);
            newX = mouseX;
            newY = mouseY;
            break;
    }

    return {
        newWidth,
        newHeight,
        newX,
        newY
    };
}
