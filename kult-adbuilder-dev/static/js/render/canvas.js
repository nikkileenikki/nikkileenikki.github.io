export function getAbsolutePosition({ element }) {
    return {
        x: element.x,
        y: element.y
    };
}

export function calculateFolderBounds({ folderId, groups, elements, canvasWidth, canvasHeight }) {
    const folder = groups.find(g => g.id === folderId);
    const folderElements = elements.filter(el => el.folderId === folderId);

    return {
        left: 0,
        top: 0,
        width: canvasWidth,
        height: canvasHeight
    };
}

export function createElementDOM({ element, getAbsolutePosition }) {
    const pos = getAbsolutePosition({ element });
    let $element;

    if (element.type === 'text') {
        $element = $(`
            <div class="canvas-element text-element" id="${element.id}" style="
                left: ${pos.x}px;
                top: ${pos.y}px;
                width: ${element.width}px;
                height: ${element.height}px;
                opacity: ${element.opacity};
                transform: rotate(${element.rotation}deg);
                font-size: ${element.fontSize}px;
                font-family: ${element.fontFamily};
                color: ${element.color};
                font-weight: ${element.bold ? 'bold' : 'normal'};
                font-style: ${element.italic ? 'italic' : 'normal'};
                text-decoration: ${element.underline ? 'underline' : 'none'};
                text-align: ${element.textAlign};
                line-height: 1.2;
                word-wrap: break-word;
                z-index: ${element.zIndex};
            ">
                ${element.text}
                <div class="resize-handle nw"></div>
                <div class="resize-handle ne"></div>
                <div class="resize-handle sw"></div>
                <div class="resize-handle se"></div>
            </div>
        `);
    } else if (element.type === 'shape') {
        let shapeStyle = `background-color: ${element.fillColor};`;
        if (element.shapeType === 'circle') {
            shapeStyle += ' border-radius: 50%;';
        } else if (element.shapeType === 'rounded-rectangle') {
            shapeStyle += ' border-radius: 12px;';
        } else if (element.borderRadius > 0) {
            shapeStyle += ` border-radius: ${element.borderRadius}px;`;
        }

        $element = $(`
            <div class="canvas-element" id="${element.id}" style="
                left: ${pos.x}px;
                top: ${pos.y}px;
                width: ${element.width}px;
                height: ${element.height}px;
                opacity: ${element.opacity};
                transform: rotate(${element.rotation}deg);
                z-index: ${element.zIndex};
                ${shapeStyle}
            ">
                <div class="resize-handle nw"></div>
                <div class="resize-handle ne"></div>
                <div class="resize-handle sw"></div>
                <div class="resize-handle se"></div>
            </div>
        `);
    } else if (element.type === 'clickthrough') {
        $element = $(`
            <div class="canvas-element clickthrough-element" id="${element.id}" style="
                left: ${pos.x}px;
                top: ${pos.y}px;
                width: ${element.width}px;
                height: ${element.height}px;
                opacity: ${element.opacity};
                transform: rotate(${element.rotation}deg);
                z-index: ${element.zIndex};
                background: repeating-linear-gradient(
                    45deg,
                    rgba(168, 85, 247, 0.1),
                    rgba(168, 85, 247, 0.1) 10px,
                    rgba(168, 85, 247, 0.2) 10px,
                    rgba(168, 85, 247, 0.2) 20px
                );
                border: 2px dashed rgba(168, 85, 247, 0.5);
            ">
                <div style="text-align: center; color: rgba(168, 85, 247, 0.8); pointer-events: none;">
                    <i class="fas fa-mouse-pointer text-2xl mb-2"></i>
                    <div class="text-xs">Clickthrough</div>
                    ${element.url ? `<div class="text-xs font-bold">${element.url}</div>` : ''}
                </div>
                <div class="resize-handle nw"></div>
                <div class="resize-handle ne"></div>
                <div class="resize-handle sw"></div>
                <div class="resize-handle se"></div>
            </div>
        `);
    } else if (element.type === 'invisible') {
        $element = $(`
            <div class="canvas-element invisible-element" id="${element.id}" style="
                left: ${pos.x}px;
                top: ${pos.y}px;
                width: ${element.width}px;
                height: ${element.height}px;
                opacity: 0.3;
                transform: rotate(${element.rotation}deg);
                z-index: ${element.zIndex};
                background: repeating-linear-gradient(
                    45deg,
                    rgba(200, 200, 200, 0.3),
                    rgba(200, 200, 200, 0.3) 10px,
                    rgba(150, 150, 150, 0.3) 10px,
                    rgba(150, 150, 150, 0.3) 20px
                );
                border: 2px dashed rgba(100, 100, 100, 0.5);
            ">
                <div style="text-align: center; color: rgba(100, 100, 100, 0.8); pointer-events: none; padding-top: 40%;">
                    <i class="fas fa-eye-slash text-2xl mb-2"></i>
                    <div class="text-xs">Invisible Layer</div>
                </div>
                <div class="resize-handle nw"></div>
                <div class="resize-handle ne"></div>
                <div class="resize-handle sw"></div>
                <div class="resize-handle se"></div>
            </div>
        `);
    } else if (element.type === 'image') {
        $element = $(`
            <div class="canvas-element" id="${element.id}" style="
                left: ${pos.x}px;
                top: ${pos.y}px;
                width: ${element.width}px;
                height: ${element.height}px;
                opacity: ${element.opacity};
                transform: rotate(${element.rotation}deg);
                z-index: ${element.zIndex};
            ">
                <img src="${element.src}" style="width: 100%; height: 100%; object-fit: contain; pointer-events: none;" />
                <div class="resize-handle nw"></div>
                <div class="resize-handle ne"></div>
                <div class="resize-handle sw"></div>
                <div class="resize-handle se"></div>
            </div>
        `);
    } else if (element.type === 'video') {
        const playText =
            element.playTrigger === 'autoplay' ? '▶ Autoplay' :
            element.playTrigger === 'mouseover' ? '🖱 On Hover' :
            '👆 On Click';

        $element = $(`
            <div class="canvas-element video-element" id="${element.id}" style="
                left: ${pos.x}px;
                top: ${pos.y}px;
                width: ${element.width}px;
                height: ${element.height}px;
                opacity: ${element.opacity};
                transform: rotate(${element.rotation}deg);
                z-index: ${element.zIndex};
                background-color: #000;
                display: flex;
                align-items: center;
                justify-content: center;
                overflow: hidden;
                color: #fff;
                font-size: 14px;
                border: 2px solid #e53e3e;
            ">
                <div style="text-align: center; width: 100%; padding: 0 8px; box-sizing: border-box; overflow: hidden;">
                    <i class="fas fa-video" style="font-size: 32px; margin-bottom: 8px;"></i>
                    <div>${element.videoName}</div>
                    <div style="font-size: 11px; opacity: 0.7; word-break: break-all; overflow: hidden;">${element.videoUrl}</div>
                    <div style="font-size: 11px; margin-top: 4px;">
                        ${playText} ${element.muted ? '🔇 Muted' : '🔊 Sound'} ${element.controls ? '⚙ Controls' : ''}
                    </div>
                </div>
                <div class="resize-handle nw"></div>
                <div class="resize-handle ne"></div>
                <div class="resize-handle sw"></div>
                <div class="resize-handle se"></div>
            </div>
        `);
    }

    return $element;
}
export function appendElementToCanvas({ $canvas, $element, element, groups }) {
    if (!$element) return;

    if (element.folderId) {
        let $folder = $canvas.find(`#${element.folderId}`);

        if ($folder.length === 0) {
            const folder = groups.find(g => g.id === element.folderId);
            if (folder) {
                $folder = $(`
                    <div class="canvas-folder" id="${folder.id}" style="
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 100%;
                        height: 100%;
                        pointer-events: none;
                        z-index: ${folder.zIndex};
                    "></div>
                `);
                $canvas.append($folder);
            }
        }

        $folder.append($element);
    } else {
        $canvas.append($element);
    }
}

export function updateFolderBounds({ folderId, $canvas, calculateFolderBounds }) {
    const $folder = $canvas.find(`#${folderId}`);
    if ($folder.length === 0) return;

    const bounds = calculateFolderBounds({ folderId });

    $folder.css({
        left: bounds.left + 'px',
        top: bounds.top + 'px',
        width: bounds.width + 'px',
        height: bounds.height + 'px'
    });
}

export function updateAllFolderBounds({ groups, updateFolderBounds }) {
    groups.forEach(folder => {
        updateFolderBounds(folder.id);
    });
}

export function updateCanvas({
    $canvas,
    groups,
    elements,
    calculateFolderBounds,
    createElementDOM,
    applyFolderInteractions
}) {
    $canvas.find('.canvas-element, .canvas-folder').remove();

    // Create folder wrappers first
    groups.forEach(folder => {
        const bounds = calculateFolderBounds(folder.id);
        const $folderWrapper = $(`
            <div class="canvas-folder" id="${folder.id}" style="
                position: absolute;
                left: ${bounds.left}px;
                top: ${bounds.top}px;
                width: ${bounds.width}px;
                height: ${bounds.height}px;
                z-index: ${folder.zIndex};
                pointer-events: auto;
            "></div>
        `);
        $canvas.append($folderWrapper);

        applyFolderInteractions(folder, $folderWrapper);
    });

    // Restore elements and place them in folders or root
    elements.forEach(element => {
        const $element = createElementDOM(element);

        if (element.folderId) {
            $(`#${element.folderId}`).append($element);
        } else {
            $canvas.append($element);
        }
    });
}
