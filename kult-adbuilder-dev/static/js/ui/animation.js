export function resetAnimationModal() {
    $('#animBtnText').text('Add Animation');
    $('#deleteAnimBtn').addClass('hidden');
    $('#animStart').val(0);
    $('#animDuration').val(1);

    $('#animFade').val('');
    $('#animSlide').val('');
    $('#animZoom').val('');
    $('#animRotate').val('');
}

export function populateAnimationModal({ anim }) {
    $('#animFade').val('');
    $('#animSlide').val('');
    $('#animZoom').val('');
    $('#animRotate').val('');

    const types = anim.types || [anim.type];

    types.forEach(type => {
        if (type === 'fadeIn' || type === 'fadeOut') {
            $('#animFade').val(type);
        } else if (type.startsWith('slide')) {
            $('#animSlide').val(type);
        } else if (type === 'scaleIn' || type === 'scaleOut') {
            $('#animZoom').val(type);
        } else if (type.startsWith('rotate')) {
            $('#animRotate').val(type);
        }
    });

    $('#animStart').val(Number(anim.start).toFixed(1));
    $('#animDuration').val(Number(anim.duration).toFixed(1));
    $('#animEase').val(anim.ease);

    $('#animBtnText').text('Update Animation');
    $('#deleteAnimBtn').removeClass('hidden');
}

export function getSelectedAnimationTypes() {
    const selectedTypes = [];

    const fade = $('#animFade').val();
    const slide = $('#animSlide').val();
    const zoom = $('#animZoom').val();
    const rotate = $('#animRotate').val();

    if (fade) selectedTypes.push(fade);
    if (slide) selectedTypes.push(slide);
    if (zoom) selectedTypes.push(zoom);
    if (rotate) selectedTypes.push(rotate);

    return selectedTypes;
}

export function readAnimationFormValues() {
    return {
        start: parseFloat($('#animStart').val()),
        duration: parseFloat($('#animDuration').val()),
        ease: $('#animEase').val()
    };
}

export function roundAnimationTiming({ start, duration }) {
    return {
        start: Math.round(start * 10) / 10,
        duration: Math.round(duration * 10) / 10
    };
}

export function validateSelectedAnimationTypes({ selectedTypes }) {
    return selectedTypes && selectedTypes.length > 0;
}
