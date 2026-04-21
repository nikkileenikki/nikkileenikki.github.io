export function renderLayersEmptyState({ $layersList }) {
    $layersList.html('<p class="text-sm text-gray-500 text-center py-4">No layers yet</p>');
}

export function getLayerIconAndLabel({ element, elements }) {
    let icon, label;

    if (element.type === 'text') {
        icon = 'fa-font';
        label = element.name || element.text.substring(0, 20);
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
        label = element.name || (element.filename || 'Image').substring(0, 20);
    }

    return { icon, label };
}

export function renderLayerItem({ element, index, elements }) {
    const { icon, label } = getLayerIconAndLabel({ element, elements });

    return $(`
        <div class="layer-item p-2 rounded border border-gray-700 flex items-center justify-between" 
             data-id="${element.id}" 
             draggable="true" 
             data-index="${index}">
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
                <button class="duplicate-layer timeline-layer-btn" data-id="${element.id}" title="Duplicate layer">
                    <i class="fas fa-clone text-xs"></i>
                </button>
                <button class="delete-layer text-red-400 hover:text-red-300 px-2 py-1" data-id="${element.id}">
                    <i class="fas fa-trash text-xs"></i>
                </button>
            </div>
        </div>
    `);
}

export function buildSortedLayerElements({ elements }) {
    return [...elements].sort((a, b) => b.zIndex - a.zIndex);
}

export function bindLayerDragEvents({ $layer, handleDragStart, handleDragOverLayer, handleLayerDrop, handleDragEnd }) {
    $layer.on('dragstart', handleDragStart);
    $layer.on('dragover', handleDragOverLayer);
    $layer.on('drop', handleLayerDrop);
    $layer.on('dragend', handleDragEnd);

    return $layer;
}

export function appendRenderedLayers({
    $layersList,
    sortedElements,
    renderLayerItem,
    bindLayerDragEvents
}) {
    sortedElements.forEach((element, index) => {
        const $layer = renderLayerItem(element, index);
        bindLayerDragEvents($layer);
        $layersList.append($layer);
    });
}
