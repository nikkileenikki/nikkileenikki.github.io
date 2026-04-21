export function moveElementTo({ element, newX, newY }) {
    element.x = newX;
    element.y = newY;

    $(`#${element.id}`).css({
        left: newX + 'px',
        top: newY + 'px'
    });
}

export function moveFolderByDelta({ folderId, elements, deltaX, deltaY }) {
    const folderElements = elements.filter(el => el.folderId === folderId);

    folderElements.forEach(element => {
        element.x += deltaX;
        element.y += deltaY;

        $(`#${element.id}`).css({
            left: element.x + 'px',
            top: element.y + 'px'
        });
    });
}
