class UIManager {
    constructor() {
        this.initializeModal();
    }

    showUploadProgress() {
        const progressElement = document.getElementById('uploadProgress');
        progressElement.style.display = 'block';
    }

    hideUploadProgress() {
        const progressElement = document.getElementById('uploadProgress');
        progressElement.style.display = 'none';
    }

    updateProgress(percent) {
        const progressFill = document.getElementById('progressFill');
        const progressText = document.getElementById('progressText');

        progressFill.style.width = `${percent}%`;
        progressText.textContent = `${Math.round(percent)}%`;
    }

    displayResults(result) {
        const resultsContainer = document.getElementById('resultsContainer');
        const resultsGrid = document.getElementById('resultsGrid');
        const resultsSummary = document.getElementById('resultsSummary');

        resultsGrid.innerHTML = '';

        if (result.extracted_files && result.extracted_files.length > 0) {
            result.extracted_files.forEach(file => {
                const fileElement = this.createFileCard(file);
                resultsGrid.appendChild(fileElement);
            });
        } else {
            resultsGrid.innerHTML = '<p>Нет извлеченных файлов</p>';
        }

        const totalFiles = result.extracted_files.length;
        const processingTime = result.processing_time.toFixed(2);

        resultsSummary.innerHTML = `
            <p>Обработано файлов: <strong>${totalFiles}</strong></p>
            <p>Время обработки: <strong>${processingTime} сек.</strong></p>
        `;

        resultsContainer.style.display = 'block';
    }

    createFileCard(fileInfo) {
        const card = document.createElement('div');
        card.className = 'file-card';

        const fileSize = this.formatFileSize(fileInfo.file_size);
        const dimensions = fileInfo.width && fileInfo.height
            ? `${fileInfo.width}×${fileInfo.height}`
            : 'N/A';

        card.innerHTML = `
            <div class="file-icon">🖼️</div>
            <div class="file-info">
                <div class="file-name">${fileInfo.original_filename}</div>
                <div class="file-details">
                    <span>Размер: ${fileSize}</span>
                    <span>Разрешение: ${dimensions}</span>
                </div>
            </div>
        `;

        return card;
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    showError(message) {
        const modal = document.getElementById('errorModal');
        const errorMessage = document.getElementById('errorMessage');

        errorMessage.textContent = message;
        modal.style.display = 'block';
    }

    initializeModal() {
        const modal = document.getElementById('errorModal');
        const closeBtn = modal.querySelector('.close');

        closeBtn.addEventListener('click', () => {
            modal.style.display = 'none';
        });

        window.addEventListener('click', (event) => {
            if (event.target === modal) {
                modal.style.display = 'none';
            }
        });
    }
}