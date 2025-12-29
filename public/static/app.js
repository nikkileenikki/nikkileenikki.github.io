// HTML5 Ad Builder - Main Application
(function() {
    'use strict';
    
    // State management
    let elements = [];
    let selectedElement = null;
    let dragOffset = { x: 0, y: 0 };
    let isDragging = false;
    let isResizing = false;
    let resizeHandle = null;
    let elementCounter = 0;
    let timeline = gsap.timeline({ paused: true });
    
    // Canvas dimensions
    let canvasWidth = 300;
    let canvasHeight = 250;
    
    // DOM elements
    const $canvas = $('#canvas');
    const $canvasWrapper = $('#canvasWrapper');
    const $layersList = $('#layersList');
    const $dropzone = $('#dropzone');
    const $fileInput = $('#fileInput');
    const $propertiesPanel = $('#propertiesPanel');
    const $animModal = $('#animModal');
    const $animationsList = $('#animationsList');
    
    // Initialize
    $(document).ready(function() {
        initEventListeners();
        updateCanvasSize();
    });
    
    // Event Listeners
    function initEventListeners() {
        // File upload
        $dropzone.on('click', () => $fileInput.click());
        $dropzone.on('dragover', handleDragOver);
        $dropzone.on('drop', handleDrop);
        $fileInput.on('change', handleFileSelect);
        
        // Canvas size
        $('#canvasSize').on('change', handleCanvasSizeChange);
        $('#customWidth, #customHeight').on('change', updateCustomCanvasSize);
        
        // Canvas interactions
        $canvas.on('mousedown', '.canvas-element', handleElementMouseDown);
        $canvas.on('mousedown', '.resize-handle', handleResizeStart);
        $(document).on('mousemove', handleMouseMove);
        $(document).on('mouseup', handleMouseUp);
        
        // Layer selection
        $layersList.on('click', '.layer-item', handleLayerClick);
        $layersList.on('click', '.delete-layer', handleDeleteLayer);
        
        // Properties
        $('#propWidth').on('change', updateElementWidth);
        $('#propHeight').on('change', updateElementHeight);
        $('#propX').on('change', updateElementX);
        $('#propY').on('change', updateElementY);
        $('#propRotation').on('change', updateElementRotation);
        $('#propOpacity').on('input', updateElementOpacity);
        
        // Animation
        $('#addAnimBtn').on('click', openAnimationModal);
        $('#closeModal').on('click', closeAnimationModal);
        $('#saveAnimBtn').on('click', saveAnimation);
        $animationsList.on('click', '.delete-anim', handleDeleteAnimation);
        
        // Actions
        $('#previewBtn').on('click', previewAnimation);
        $('#exportBtn').on('click', exportToZip);
        $('#clearBtn').on('click', clearAll);
    }
    
    // File Upload Handlers
    function handleDragOver(e) {
        e.preventDefault();
        e.stopPropagation();
        $(this).addClass('border-blue-400');
    }
    
    function handleDrop(e) {
        e.preventDefault();
        e.stopPropagation();
        $(this).removeClass('border-blue-400');
        
        const files = e.originalEvent.dataTransfer.files;
        if (files.length > 0) {
            uploadFile(files[0]);
        }
    }
    
    function handleFileSelect(e) {
        const files = e.target.files;
        if (files.length > 0) {
            uploadFile(files[0]);
        }
    }
    
    async function uploadFile(file) {
        // Validate file type
        const validTypes = ['image/jpeg', 'image/png', 'image/gif'];
        if (!validTypes.includes(file.type)) {
            alert('Please upload a JPG, PNG, or GIF file.');
            return;
        }
        
        // Create FormData
        const formData = new FormData();
        formData.append('image', file);
        
        try {
            // Upload to server
            const response = await fetch('/api/upload', {
                method: 'POST',
                body: formData
            });
            
            const result = await response.json();
            
            if (result.success) {
                addImageToCanvas(result.url, result.filename);
            } else {
                alert('Upload failed: ' + result.error);
            }
        } catch (error) {
            console.error('Upload error:', error);
            alert('Upload failed. Please try again.');
        }
    }
    
    // Canvas Management
    function addImageToCanvas(url, filename) {
        elementCounter++;
        const id = `element_${elementCounter}`;
        
        // Create element data
        const element = {
            id: id,
            type: 'image',
            src: url,
            filename: filename,
            x: 50,
            y: 50,
            width: 100,
            height: 100,
            rotation: 0,
            opacity: 1,
            animations: []
        };
        
        elements.push(element);
        
        // Create DOM element
        const $element = $(`
            <div class="canvas-element" id="${id}" style="
                left: ${element.x}px;
                top: ${element.y}px;
                width: ${element.width}px;
                height: ${element.height}px;
                opacity: ${element.opacity};
                transform: rotate(${element.rotation}deg);
            ">
                <img src="${url}" style="width: 100%; height: 100%; object-fit: contain; pointer-events: none;">
                <div class="resize-handle nw"></div>
                <div class="resize-handle ne"></div>
                <div class="resize-handle sw"></div>
                <div class="resize-handle se"></div>
            </div>
        `);
        
        $canvas.append($element);
        updateLayersList();
        selectElement(id);
    }
    
    function updateCanvasSize() {
        $canvasWrapper.css({
            width: canvasWidth + 'px',
            height: canvasHeight + 'px'
        });
    }
    
    function handleCanvasSizeChange(e) {
        const value = $(e.target).val();
        
        if (value === 'custom') {
            $('#customWidth, #customHeight').removeClass('hidden');
        } else {
            $('#customWidth, #customHeight').addClass('hidden');
            const [width, height] = value.split('x').map(Number);
            canvasWidth = width;
            canvasHeight = height;
            updateCanvasSize();
        }
    }
    
    function updateCustomCanvasSize() {
        const width = parseInt($('#customWidth').val()) || 300;
        const height = parseInt($('#customHeight').val()) || 250;
        canvasWidth = width;
        canvasHeight = height;
        updateCanvasSize();
    }
    
    // Element Interaction
    function handleElementMouseDown(e) {
        if ($(e.target).hasClass('resize-handle')) return;
        
        e.preventDefault();
        e.stopPropagation();
        
        const $element = $(e.currentTarget);
        const id = $element.attr('id');
        selectElement(id);
        
        isDragging = true;
        const offset = $element.offset();
        const canvasOffset = $canvas.offset();
        
        dragOffset = {
            x: e.pageX - offset.left,
            y: e.pageY - offset.top
        };
    }
    
    function handleResizeStart(e) {
        e.preventDefault();
        e.stopPropagation();
        
        isResizing = true;
        resizeHandle = $(e.target).attr('class').split(' ')[1]; // Get handle direction
        
        const $element = $(e.target).closest('.canvas-element');
        selectElement($element.attr('id'));
    }
    
    function handleMouseMove(e) {
        if (!selectedElement) return;
        
        const element = elements.find(el => el.id === selectedElement);
        if (!element) return;
        
        const $element = $(`#${selectedElement}`);
        const canvasOffset = $canvas.offset();
        
        if (isDragging) {
            // Calculate new position
            let newX = e.pageX - canvasOffset.left - dragOffset.x;
            let newY = e.pageY - canvasOffset.top - dragOffset.y;
            
            // Constrain to canvas bounds
            newX = Math.max(0, Math.min(newX, canvasWidth - element.width));
            newY = Math.max(0, Math.min(newY, canvasHeight - element.height));
            
            element.x = newX;
            element.y = newY;
            
            $element.css({
                left: newX + 'px',
                top: newY + 'px'
            });
            
            updatePropertiesPanel();
        } else if (isResizing) {
            const mouseX = e.pageX - canvasOffset.left;
            const mouseY = e.pageY - canvasOffset.top;
            
            let newWidth = element.width;
            let newHeight = element.height;
            let newX = element.x;
            let newY = element.y;
            
            switch(resizeHandle) {
                case 'se':
                    newWidth = Math.max(20, mouseX - element.x);
                    newHeight = Math.max(20, mouseY - element.y);
                    break;
                case 'sw':
                    newWidth = Math.max(20, element.x + element.width - mouseX);
                    newHeight = Math.max(20, mouseY - element.y);
                    newX = mouseX;
                    break;
                case 'ne':
                    newWidth = Math.max(20, mouseX - element.x);
                    newHeight = Math.max(20, element.y + element.height - mouseY);
                    newY = mouseY;
                    break;
                case 'nw':
                    newWidth = Math.max(20, element.x + element.width - mouseX);
                    newHeight = Math.max(20, element.y + element.height - mouseY);
                    newX = mouseX;
                    newY = mouseY;
                    break;
            }
            
            element.width = newWidth;
            element.height = newHeight;
            element.x = newX;
            element.y = newY;
            
            $element.css({
                width: newWidth + 'px',
                height: newHeight + 'px',
                left: newX + 'px',
                top: newY + 'px'
            });
            
            updatePropertiesPanel();
        }
    }
    
    function handleMouseUp() {
        isDragging = false;
        isResizing = false;
        resizeHandle = null;
    }
    
    // Element Selection
    function selectElement(id) {
        selectedElement = id;
        
        // Update UI
        $('.canvas-element').removeClass('selected');
        $(`#${id}`).addClass('selected');
        
        $('.layer-item').removeClass('selected');
        $(`.layer-item[data-id="${id}"]`).addClass('selected');
        
        updatePropertiesPanel();
    }
    
    // Layers Panel
    function updateLayersList() {
        if (elements.length === 0) {
            $layersList.html('<p class="text-sm text-gray-500 text-center py-4">No layers yet</p>');
            return;
        }
        
        $layersList.empty();
        
        // Reverse order to show newest first
        [...elements].reverse().forEach((element, index) => {
            const $layer = $(`
                <div class="layer-item p-2 rounded border border-gray-700 flex items-center justify-between" data-id="${element.id}">
                    <div class="flex items-center">
                        <i class="fas fa-image text-blue-400 mr-2"></i>
                        <span class="text-sm">${element.filename || 'Image'}</span>
                    </div>
                    <button class="delete-layer text-red-400 hover:text-red-300" data-id="${element.id}">
                        <i class="fas fa-trash text-xs"></i>
                    </button>
                </div>
            `);
            $layersList.append($layer);
        });
    }
    
    function handleLayerClick(e) {
        if ($(e.target).closest('.delete-layer').length) return;
        const id = $(e.currentTarget).data('id');
        selectElement(id);
    }
    
    function handleDeleteLayer(e) {
        e.stopPropagation();
        const id = $(e.currentTarget).data('id');
        
        // Remove from array
        elements = elements.filter(el => el.id !== id);
        
        // Remove from DOM
        $(`#${id}`).remove();
        
        // Clear selection if deleted element was selected
        if (selectedElement === id) {
            selectedElement = null;
            $propertiesPanel.addClass('hidden');
        }
        
        updateLayersList();
        rebuildTimeline();
    }
    
    // Properties Panel
    function updatePropertiesPanel() {
        if (!selectedElement) {
            $propertiesPanel.addClass('hidden');
            return;
        }
        
        const element = elements.find(el => el.id === selectedElement);
        if (!element) return;
        
        $propertiesPanel.removeClass('hidden');
        $('#propWidth').val(Math.round(element.width));
        $('#propHeight').val(Math.round(element.height));
        $('#propX').val(Math.round(element.x));
        $('#propY').val(Math.round(element.y));
        $('#propRotation').val(element.rotation);
        $('#propOpacity').val(element.opacity);
        $('#opacityValue').text(Math.round(element.opacity * 100) + '%');
    }
    
    function updateElementWidth() {
        if (!selectedElement) return;
        const element = elements.find(el => el.id === selectedElement);
        element.width = parseInt($(this).val()) || 100;
        $(`#${selectedElement}`).css('width', element.width + 'px');
    }
    
    function updateElementHeight() {
        if (!selectedElement) return;
        const element = elements.find(el => el.id === selectedElement);
        element.height = parseInt($(this).val()) || 100;
        $(`#${selectedElement}`).css('height', element.height + 'px');
    }
    
    function updateElementX() {
        if (!selectedElement) return;
        const element = elements.find(el => el.id === selectedElement);
        element.x = parseInt($(this).val()) || 0;
        $(`#${selectedElement}`).css('left', element.x + 'px');
    }
    
    function updateElementY() {
        if (!selectedElement) return;
        const element = elements.find(el => el.id === selectedElement);
        element.y = parseInt($(this).val()) || 0;
        $(`#${selectedElement}`).css('top', element.y + 'px');
    }
    
    function updateElementRotation() {
        if (!selectedElement) return;
        const element = elements.find(el => el.id === selectedElement);
        element.rotation = parseInt($(this).val()) || 0;
        $(`#${selectedElement}`).css('transform', `rotate(${element.rotation}deg)`);
    }
    
    function updateElementOpacity() {
        if (!selectedElement) return;
        const element = elements.find(el => el.id === selectedElement);
        element.opacity = parseFloat($(this).val());
        $(`#${selectedElement}`).css('opacity', element.opacity);
        $('#opacityValue').text(Math.round(element.opacity * 100) + '%');
    }
    
    // Animation
    function openAnimationModal() {
        if (!selectedElement) {
            alert('Please select an element first');
            return;
        }
        $animModal.removeClass('hidden');
    }
    
    function closeAnimationModal() {
        $animModal.addClass('hidden');
    }
    
    function saveAnimation() {
        if (!selectedElement) return;
        
        const element = elements.find(el => el.id === selectedElement);
        const type = $('#animType').val();
        const duration = parseFloat($('#animDuration').val());
        const delay = parseFloat($('#animDelay').val());
        const ease = $('#animEase').val();
        
        const animation = {
            type,
            duration,
            delay,
            ease,
            id: `anim_${Date.now()}`
        };
        
        element.animations.push(animation);
        updateAnimationsList();
        rebuildTimeline();
        closeAnimationModal();
    }
    
    function updateAnimationsList() {
        if (!selectedElement) return;
        
        const element = elements.find(el => el.id === selectedElement);
        $animationsList.empty();
        
        if (element.animations.length === 0) {
            return;
        }
        
        element.animations.forEach(anim => {
            const $anim = $(`
                <div class="anim-item flex justify-between items-center">
                    <div>
                        <div class="font-semibold text-purple-300">${anim.type}</div>
                        <div class="text-gray-400">${anim.duration}s / delay: ${anim.delay}s</div>
                    </div>
                    <button class="delete-anim text-red-400 hover:text-red-300" data-anim-id="${anim.id}">
                        <i class="fas fa-trash text-xs"></i>
                    </button>
                </div>
            `);
            $animationsList.append($anim);
        });
    }
    
    function handleDeleteAnimation(e) {
        e.stopPropagation();
        if (!selectedElement) return;
        
        const animId = $(e.currentTarget).data('anim-id');
        const element = elements.find(el => el.id === selectedElement);
        
        element.animations = element.animations.filter(a => a.id !== animId);
        updateAnimationsList();
        rebuildTimeline();
    }
    
    function rebuildTimeline() {
        timeline.clear();
        
        elements.forEach(element => {
            element.animations.forEach(anim => {
                const props = getAnimationProps(anim.type, element);
                timeline.to(`#${element.id}`, {
                    ...props,
                    duration: anim.duration,
                    delay: anim.delay,
                    ease: anim.ease
                }, 0);
            });
        });
    }
    
    function getAnimationProps(type, element) {
        const props = {};
        
        switch(type) {
            case 'fadeIn':
                gsap.set(`#${element.id}`, { opacity: 0 });
                props.opacity = element.opacity;
                break;
            case 'fadeOut':
                props.opacity = 0;
                break;
            case 'slideLeft':
                gsap.set(`#${element.id}`, { x: -canvasWidth });
                props.x = 0;
                break;
            case 'slideRight':
                gsap.set(`#${element.id}`, { x: canvasWidth });
                props.x = 0;
                break;
            case 'slideUp':
                gsap.set(`#${element.id}`, { y: -canvasHeight });
                props.y = 0;
                break;
            case 'slideDown':
                gsap.set(`#${element.id}`, { y: canvasHeight });
                props.y = 0;
                break;
            case 'scale':
                gsap.set(`#${element.id}`, { scale: 0 });
                props.scale = 1;
                break;
            case 'rotate':
                props.rotation = 360;
                break;
            case 'bounce':
                props.y = '+=50';
                props.repeat = 3;
                props.yoyo = true;
                break;
        }
        
        return props;
    }
    
    function previewAnimation() {
        rebuildTimeline();
        timeline.restart();
    }
    
    // Export
    async function exportToZip() {
        if (elements.length === 0) {
            alert('Please add at least one element to export');
            return;
        }
        
        const zip = new JSZip();
        
        // Generate HTML
        const html = generateHTML();
        zip.file('index.html', html);
        
        // Add images
        for (let i = 0; i < elements.length; i++) {
            const element = elements[i];
            try {
                const response = await fetch(element.src);
                const blob = await response.blob();
                zip.file(`images/image_${i}.${getExtensionFromDataUrl(element.src)}`, blob);
            } catch (error) {
                console.error('Error adding image to zip:', error);
            }
        }
        
        // Generate and download ZIP
        zip.generateAsync({ type: 'blob' }).then(function(content) {
            saveAs(content, 'ad-banner.zip');
        });
    }
    
    function getExtensionFromDataUrl(dataUrl) {
        if (dataUrl.includes('image/png')) return 'png';
        if (dataUrl.includes('image/gif')) return 'gif';
        return 'jpg';
    }
    
    function generateHTML() {
        let imagesHtml = '';
        let animationsJs = '';
        
        elements.forEach((element, index) => {
            const imgSrc = `images/image_${index}.${getExtensionFromDataUrl(element.src)}`;
            
            imagesHtml += `
        <img id="${element.id}" src="${imgSrc}" style="
            position: absolute;
            left: ${element.x}px;
            top: ${element.y}px;
            width: ${element.width}px;
            height: ${element.height}px;
            opacity: ${element.opacity};
            transform: rotate(${element.rotation}deg);
        ">`;
            
            // Generate animations
            element.animations.forEach(anim => {
                const props = getAnimationPropsForExport(anim.type, element);
                animationsJs += `
        gsap.to('#${element.id}', {
            ${Object.entries(props).map(([key, value]) => `${key}: ${JSON.stringify(value)}`).join(',\n            ')},
            duration: ${anim.duration},
            delay: ${anim.delay},
            ease: '${anim.ease}'
        });`;
            });
        });
        
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Ad Banner</title>
    <script src="https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/gsap.min.js"></script>
    <style>
        body {
            margin: 0;
            padding: 0;
            overflow: hidden;
        }
        #ad-container {
            position: relative;
            width: ${canvasWidth}px;
            height: ${canvasHeight}px;
            background: white;
            overflow: hidden;
        }
    </style>
</head>
<body>
    <div id="ad-container">
        ${imagesHtml}
    </div>
    
    <script>
        // Initialize animations
        ${animationsJs}
    </script>
</body>
</html>`;
    }
    
    function getAnimationPropsForExport(type, element) {
        const props = {};
        
        switch(type) {
            case 'fadeIn':
                props.opacity = element.opacity;
                props.startAt = { opacity: 0 };
                break;
            case 'fadeOut':
                props.opacity = 0;
                break;
            case 'slideLeft':
                props.x = 0;
                props.startAt = { x: -canvasWidth };
                break;
            case 'slideRight':
                props.x = 0;
                props.startAt = { x: canvasWidth };
                break;
            case 'slideUp':
                props.y = 0;
                props.startAt = { y: -canvasHeight };
                break;
            case 'slideDown':
                props.y = 0;
                props.startAt = { y: canvasHeight };
                break;
            case 'scale':
                props.scale = 1;
                props.startAt = { scale: 0 };
                break;
            case 'rotate':
                props.rotation = 360;
                break;
            case 'bounce':
                props.y = '+=50';
                props.repeat = 3;
                props.yoyo = true;
                break;
        }
        
        return props;
    }
    
    // Clear All
    function clearAll() {
        if (elements.length === 0) return;
        
        if (confirm('Are you sure you want to clear all elements?')) {
            elements = [];
            selectedElement = null;
            $canvas.empty();
            $layersList.html('<p class="text-sm text-gray-500 text-center py-4">No layers yet</p>');
            $propertiesPanel.addClass('hidden');
            $animationsList.empty();
            timeline.clear();
        }
    }
    
})();
