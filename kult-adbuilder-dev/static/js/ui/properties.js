export function getElementLabel({ element, elements }) {
    if (element.type === 'text') {
        return `Text: ${element.text.substring(0, 15)}`;
    } else if (element.type === 'clickthrough') {
        const clickIndex = elements.filter(el => el.type === 'clickthrough').findIndex(el => el.id === element.id) + 1;
        return `Click${clickIndex}`;
    } else if (element.type === 'invisible') {
        const invisibleIndex = elements.filter(el => el.type === 'invisible').findIndex(el => el.id === element.id) + 1;
        return `Invisible${invisibleIndex}`;
    } else if (element.type === 'shape') {
        const shapeIndex = elements.filter(el => el.type === 'shape').findIndex(el => el.id === element.id) + 1;
        return `Shape${shapeIndex}`;
    } else if (element.type === 'video') {
        return `Video: ${element.videoName}`;
    } else {
        return element.filename || 'Image';
    }
}

export function updateClickActionSettings({ action }) {
    $('#clickShadowSettings').addClass('hidden');
    $('#clickGlowSettings').addClass('hidden');
    $('#clickScaleSettings').addClass('hidden');

    if (action === 'addShadow') {
        $('#clickShadowSettings').removeClass('hidden');
    } else if (action === 'addGlow') {
        $('#clickGlowSettings').removeClass('hidden');
    } else if (action === 'scale') {
        $('#clickScaleSettings').removeClass('hidden');
    }
}

export function updateHoverActionSettings({ action }) {
    $('#hoverShadowSettings').addClass('hidden');
    $('#hoverGlowSettings').addClass('hidden');
    $('#hoverScaleSettings').addClass('hidden');

    if (action === 'addShadow') {
        $('#hoverShadowSettings').removeClass('hidden');
    } else if (action === 'addGlow') {
        $('#hoverGlowSettings').removeClass('hidden');
    } else if (action === 'scale') {
        $('#hoverScaleSettings').removeClass('hidden');
    }
}
