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

export function fillCommonProperties({ element }) {
    $('#commonPropertiesGrid').removeClass('hidden');

    $('#propWidth').closest('div').removeClass('hidden');
    $('#propHeight').closest('div').removeClass('hidden');
    $('#propX').closest('div').removeClass('hidden');
    $('#propY').closest('div').removeClass('hidden');
    $('#propRotation').closest('div').removeClass('hidden');
    $('#propOpacity').closest('div').removeClass('hidden');

    $('#propWidth').val(Math.round(element.width));
    $('#propHeight').val(Math.round(element.height));
    $('#propX').val(Math.round(element.x));
    $('#propY').val(Math.round(element.y));
    $('#propRotation').val(element.rotation);
    $('#propOpacity').val(element.opacity);
    $('#opacityValue').text(Math.round(element.opacity * 100) + '%');
}

export function fillTextProperties({ element }) {
    $('#textProps').removeClass('hidden');
    $('#propText').val(element.text);
    $('#propFontFamily').val(element.fontFamily);
    $('#propFontSize').val(element.fontSize);
    $('#propColor').val(element.color);

    $('#propBold').toggleClass('active', element.bold);
    $('#propItalic').toggleClass('active', element.italic);
    $('#propUnderline').toggleClass('active', element.underline);

    $('.text-align-btn').removeClass('active');
    $(`.text-align-btn[data-align="${element.textAlign}"]`).addClass('active');

    $('#propTextShadowX').val(element.shadowX || 0);
    $('#propTextShadowY').val(element.shadowY || 0);
    $('#propTextShadowBlur').val(element.shadowBlur || 0);
    $('#propTextShadowColor').val(element.shadowColor || '#000000');
    $('#propTextShadowHover').prop('checked', element.shadowHover || false);

    $('#propTextGlowX').val(element.glowX || 0);
    $('#propTextGlowY').val(element.glowY || 0);
    $('#propTextGlowBlur').val(element.glowBlur || 0);
    $('#propTextGlowSpread').val(element.glowSpread || 0);
    $('#propTextGlowColor').val(element.glowColor || '#ffffff');
    $('#propTextGlowHover').prop('checked', element.glowHover || false);
}

export function fillClickthroughProperties({ element }) {
    $('#clickthroughProps').removeClass('hidden');
    $('#propClickUrl').val(element.url || '');
    $('#propClickIndex').val(element.clickIndex || 1);
    $('#propClickTarget').val(element.target || '_blank');
    $('#imageBorderRadius').addClass('hidden');
}

export function fillShapeProperties({ element }) {
    $('#shapeProps').removeClass('hidden');
    $('#propShapeType').val(element.shapeType);
    $('#propShapeColor').val(element.fillColor);
    $('#propShapeTransparent').prop('checked', element.transparent || false);
    $('#propShapeBorderWidth').val(element.borderWidth || 0);
    $('#propShapeBorderColor').val(element.borderColor || '#000000');
    $('#propShapeBorderRadius').val(element.borderRadius || 0);

    $('#propShapeShadowX').val(element.shadowX || 0);
    $('#propShapeShadowY').val(element.shadowY || 0);
    $('#propShapeShadowBlur').val(element.shadowBlur || 0);
    $('#propShapeShadowSpread').val(element.shadowSpread || 0);
    $('#propShapeShadowColor').val(element.shadowColor || '#000000');
    $('#propShapeShadowHover').prop('checked', element.shadowHover || false);

    $('#propShapeGlowX').val(element.glowX || 0);
    $('#propShapeGlowY').val(element.glowY || 0);
    $('#propShapeGlowBlur').val(element.glowBlur || 0);
    $('#propShapeGlowSpread').val(element.glowSpread || 0);
    $('#propShapeGlowColor').val(element.glowColor || '#ffffff');
    $('#propShapeGlowHover').prop('checked', element.glowHover || false);
}

export function fillVideoProperties({ element }) {
    $('#videoProps').removeClass('hidden');
    $('#propVideoUrl').val(element.videoUrl);
    $('#propVideoName').val(element.videoName);
    $('#propVideoPlayTrigger').val(element.playTrigger || 'autoplay');
    $('#propVideoMuted').prop('checked', element.muted);
    $('#propVideoControls').prop('checked', element.controls);

    if (element.playTrigger === 'autoplay') {
        $('#propVideoMuted').prop('disabled', true);
    } else {
        $('#propVideoMuted').prop('disabled', false);
    }
}
