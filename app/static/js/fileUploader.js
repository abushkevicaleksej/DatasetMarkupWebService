import { FileUploader } from '/static/js/services/apiClient.js';

class UploadModule {
    constructor() {
        this.uploader = null;
        this.init();
    }

    init() {
        document.addEventListener('DOMContentLoaded', () => {
            this.initializeUploader();
        });
    }

    initializeUploader() {
        const uploadButton = document.getElementById('upload-button');
        const fileInput = document.getElementById('file-input');
        const statusDiv = document.getElementById('upload-status');

        if (!uploadButton || !fileInput) {
            console.error('Required DOM elements not found');
            return;
        }

        this.uploader = new FileUploader({
            uploadUrl: '/api/routes/upload',
            button: uploadButton,
            fileInput: fileInput,
            statusContainer: statusDiv
        });

        this.uploader.init();
    }
}

new UploadModule();