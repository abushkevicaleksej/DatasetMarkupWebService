export class FileUploader {
    constructor(config) {
        this.uploadUrl = config.uploadUrl;
        this.button = config.button;
        this.fileInput = config.fileInput;
        this.statusContainer = config.statusContainer;
        this.isUploading = false;
    }

    init() {
        this.button.addEventListener('click', () => this.handleButtonClick());
        this.fileInput.addEventListener('change', (e) => this.handleFileSelect(e));

        this.button.addEventListener('dragenter', (e) => this.handleDragEnter(e));
        this.button.addEventListener('dragover', (e) => this.handleDragOver(e));
        this.button.addEventListener('dragleave', (e) => this.handleDragLeave(e));
        this.button.addEventListener('drop', (e) => this.handleDrop(e));
    }

    handleButtonClick() {
        if (this.isUploading) {
            this.setStatus('Идет загрузка, пожалуйста подождите...', 'info');
            return;
        }
        this.fileInput.click();
    }

    handleDragEnter(e) {
        e.preventDefault();
        e.stopPropagation();
        this.button.classList.add('drag-over');
    }

    handleDragOver(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    handleDragLeave(e) {
        e.preventDefault();
        e.stopPropagation();
        this.button.classList.remove('drag-over');
    }

    handleDrop(e) {
        e.preventDefault();
        e.stopPropagation();
        this.button.classList.remove('drag-over');

        const files = e.dataTransfer.files;
        if (files.length > 0) {
            this.processFile(files[0]);
        }
    }

    async handleFileSelect(event) {
        const file = event.target.files[0];
        if (!file) return;

        await this.processFile(file);
    }

    async processFile(file) {
        if (this.isUploading) {
            this.setStatus('Пожалуйста дождитесь завершения текущей загрузки', 'warning');
            return;
        }

        if (!this.validateFile(file)) {
            return;
        }

        this.isUploading = true;
        this.setUploadButtonState(true);

        try {
            await this.uploadFile(file);
        } catch (error) {
            console.error('Upload error:', error);
            this.setStatus(`Ошибка: ${error.message}`, 'error');
        } finally {
            this.isUploading = false;
            this.setUploadButtonState(false);
            this.fileInput.value = '';
        }
    }

    validateFile(file) {
        const maxSize = 100 * 1024 * 1024; // 100MB

        if (file.size > maxSize) {
            this.setStatus('Файл слишком большой. Максимальный размер: 100MB', 'error');
            return false;
        }

        if (file.size === 0) {
            this.setStatus('Файл пустой', 'error');
            return false;
        }

        return true;
    }

    async uploadFile(file) {
        this.setStatus(`Загрузка: ${file.name}...`, 'info');

        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await fetch(this.uploadUrl, {
                method: 'POST',
                body: formData
            });

            const result = await this.handleResponse(response);

            if (result.success) {
                this.setStatus(
                    `Успешно обработано за ${result.processing_time}с. Извлечено файлов: ${result.extracted_files.length}`,
                    'success'
                );
                this.displayResults(result.extracted_files);
            } else {
                throw new Error(result.detail || 'Unknown error occurred');
            }

            return result;

        } catch (error) {
            if (error.name === 'TypeError' && error.message.includes('fetch')) {
                throw new Error('Network error - please check your connection');
            }
            throw error;
        }
    }

    async handleResponse(response) {
        if (!response.ok) {
            let errorDetail = `HTTP ${response.status}`;

            try {
                const errorData = await response.json();
                errorDetail = errorData.detail || errorDetail;
            } catch {
                errorDetail = await response.text() || errorDetail;
            }

            throw new Error(errorDetail);
        }

        return await response.json();
    }

    setStatus(message, type) {
        if (!this.statusContainer) return;

        this.statusContainer.textContent = message;
        this.statusContainer.className = `upload-status upload-status--${type}`;

        if (type === 'success') {
            setTimeout(() => {
                if (this.statusContainer.textContent === message) {
                    this.statusContainer.textContent = '';
                    this.statusContainer.className = 'upload-status';
                }
            }, 5000);
        }
    }

    setUploadButtonState(isUploading) {
        if (isUploading) {
            this.button.textContent = 'Загрузка...';
            this.button.disabled = true;
        } else {
            this.button.textContent = 'Выбрать данные';
            this.button.disabled = false;
        }
    }

    displayResults(files) {
        if (!files || files.length === 0 || !this.statusContainer) return;

        const fileList = files.map(file => `
            <div class="file-info">
                <div class="file-info__name">${this.escapeHtml(file.original_filename)}</div>
                <div class="file-info__details">
                    <span>Тип: ${this.escapeHtml(file.media_type)}</span>
                    <span>Размер: ${this.formatFileSize(file.file_size)}</span>
                    ${file.width && file.height ? 
                        `<span>Разрешение: ${file.width}×${file.height}</span>` : ''}
                </div>
            </div>
        `).join('');

        const resultsHtml = `
            <div class="file-results">
                <h3>Обработанные файлы:</h3>
                ${fileList}
            </div>
        `;

        const existingResults = this.statusContainer.querySelector('.file-results');
        if (existingResults) {
            existingResults.remove();
        }

        this.statusContainer.insertAdjacentHTML('afterend', resultsHtml);
    }

    escapeHtml(unsafe) {
        if (typeof unsafe !== 'string') return unsafe;
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
}