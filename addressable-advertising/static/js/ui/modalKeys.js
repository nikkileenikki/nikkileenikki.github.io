export function bindEscapeToClose({ $modal, onClose }) {
    $modal.on('keydown', function(e) {
        if (e.key === 'Escape' || e.keyCode === 27) {
            e.preventDefault();
            onClose();
        }
    });
}

export function bindEnterToSubmit({ $inputs, onSubmit }) {
    $inputs.on('keydown', function(e) {
        if (e.key === 'Enter' || e.keyCode === 13) {
            e.preventDefault();
            onSubmit();
        }
    });
}

export function bindEnterAndEscape({ $modal, onSubmit, onClose }) {
    $modal.on('keydown', function(e) {
        if (e.key === 'Escape' || e.keyCode === 27) {
            e.preventDefault();
            onClose();
            return;
        }

        if (e.key === 'Enter' || e.keyCode === 13) {
            e.preventDefault();
            onSubmit();
        }
    });
}
