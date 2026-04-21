export function clearSelectionUI() {
    $('.canvas-element').removeClass('selected');
    $('.canvas-folder').removeClass('selected');
    $('.layer-item').removeClass('selected');
    $('.timeline-track').removeClass('selected');
    $('.timeline-folder').removeClass('selected');
}

export function applyElementSelectionUI({ id }) {
    $(`#${id}`).addClass('selected');
    $(`.layer-item[data-id="${id}"]`).addClass('selected');
    $(`.timeline-track[data-element-id="${id}"]`).addClass('selected');
}

export function applyFolderSelectionUI({ folderId }) {
    $(`.timeline-folder[data-folder-id="${folderId}"]`).addClass('selected');
    $(`#${folderId}.canvas-folder`).addClass('selected');
}
