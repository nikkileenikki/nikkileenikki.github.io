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

export function updateInteractionUI({
    element,
    initInteractionProperties,
    updateClickActionSettings,
    updateHoverActionSettings,
    updateTargetElementDropdowns
}) {
    if (!element.interactions) {
        element.interactions = initInteractionProperties();
    }

    const interactions = element.interactions;

    // Click settings
    $('#enableClickInteraction').prop('checked', interactions.click.enabled);
    $('#clickTargetElement').val(interactions.click.targetElement);
    $('#clickAction').val(interactions.click.action);
    $('#clickShadowX').val(interactions.click.shadowX);
    $('#clickShadowY').val(interactions.click.shadowY);
    $('#clickShadowBlur').val(interactions.click.shadowBlur);
    $('#clickShadowColor').val(interactions.click.shadowColor);
    $('#clickGlowX').val(interactions.click.glowX);
    $('#clickGlowY').val(interactions.click.glowY);
    $('#clickGlowBlur').val(interactions.click.glowBlur);
    $('#clickGlowColor').val(interactions.click.glowColor);
    $('#clickScaleAmount').val(interactions.click.scaleAmount);

    // Hover settings
    $('#enableHoverInteraction').prop('checked', interactions.hover.enabled);
    $('#hoverTargetElement').val(interactions.hover.targetElement);
    $('#hoverAction').val(interactions.hover.action);
    $('#hoverShadowX').val(interactions.hover.shadowX);
    $('#hoverShadowY').val(interactions.hover.shadowY);
    $('#hoverShadowBlur').val(interactions.hover.shadowBlur);
    $('#hoverShadowColor').val(interactions.hover.shadowColor);
    $('#hoverGlowX').val(interactions.hover.glowX);
    $('#hoverGlowY').val(interactions.hover.glowY);
    $('#hoverGlowBlur').val(interactions.hover.glowBlur);
    $('#hoverGlowColor').val(interactions.hover.glowColor);
    $('#hoverScaleAmount').val(interactions.hover.scaleAmount);

    $('#clickInteractionSettings').toggleClass('hidden', !interactions.click.enabled);
    $('#hoverInteractionSettings').toggleClass('hidden', !interactions.hover.enabled);

    updateClickActionSettings(interactions.click.action);
    updateHoverActionSettings(interactions.hover.action);
    updateTargetElementDropdowns();
}

export function updateTargetElementDropdowns({ elements, getElementLabel }) {
    const clickSelect = $('#clickTargetElement');
    const hoverSelect = $('#hoverTargetElement');

    const clickValue = clickSelect.val() || 'self';
    const hoverValue = hoverSelect.val() || 'self';

    clickSelect.find('option:not([value="self"])').remove();
    hoverSelect.find('option:not([value="self"])').remove();

    elements.forEach(el => {
        const label = getElementLabel(el);
        const option = `<option value="${el.id}">${label}</option>`;
        clickSelect.append(option);
        hoverSelect.append(option);
    });

    clickSelect.val(clickValue);
    hoverSelect.val(hoverValue);
}
