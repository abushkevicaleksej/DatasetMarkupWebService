class FileUploader {
    constructor(apiClient) {
        this.apiClient = apiClient;
        this.fileInput = null;
        this.isUploading = false;
    }

    initialize() {
        this.createFileInput();
        this.setupEventListeners();
    }

    createFileInput() {
        this.fileInput = document.createElement('input');
        this.fileInput.type = 'file';
        this.fileInput.style.display = 'none';
        
        this.fileInput.accept = '.zip,.mp4,.mov,.avi,.mkv,.webm,.flv,.m4v,.jpg,.jpeg,.png,.gif,.bmp,.tiff,.webp';
        
        document.body.appendChild(this.fileInput);
    }

    setupEventListeners() {
        const uploadButton = document.querySelector('.loadspace-button');
        
        if (uploadButton) {
            uploadButton.addEventListener('click', () => {
                this.triggerFileSelection();
            });
        }

        this.fileInput.addEventListener('change', (event) => {
            this.handleFileSelection(event);
        });
    }

    triggerFileSelection() {
        if (this.isUploading) return;
        this.fileInput.click();
    }

    async handleFileSelection(event) {
        const file = event.target.files[0];
        if (!file) return;

        this.isUploading = true;
        
        try {
            const result = await this.apiClient.uploadFile(file);
            this.handleUploadSuccess(result);
        } catch (error) {
            this.handleUploadError(error);
        } finally {
            this.isUploading = false;
            this.fileInput.value = '';
        }
    }

    handleUploadSuccess(result) {
        console.log('File upload successful:', result);
    }

    handleUploadError(error) {
        console.error('File upload failed:', error);
    }
}

export default FileUploader;