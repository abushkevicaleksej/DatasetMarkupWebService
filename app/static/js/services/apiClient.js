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
    }

    handleButtonClick() {
        if (this.isUploading) {
            this.setStatus('Идет загрузка, пожалуйста подождите...', 'info');
            return;
        }
        this.fileInput.click();
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
            const result = await this.uploadFile(file);

            if (result.success) {
                this.setStatus('Успешно! Переход в рабочее пространство...', 'success');
                this.navigateToWorkspace(result);
            }
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

        const response = await fetch(this.uploadUrl, {
            method: 'POST',
            body: formData
        });

        return await this.handleResponse(response);
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

    navigateToWorkspace(uploadResult) {
        console.log('Upload result:', uploadResult);
        sessionStorage.setItem('uploadResult', JSON.stringify(uploadResult));

        const workspaceUrl = '/api/routes/workspace';
        console.log('Redirecting to:', workspaceUrl);

        setTimeout(() => {
            window.location.href = workspaceUrl;
        }, 1000);
    }

    setStatus(message, type) {
        if (!this.statusContainer) return;

        this.statusContainer.textContent = message;
        this.statusContainer.className = `upload-status upload-status--${type}`;
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
}