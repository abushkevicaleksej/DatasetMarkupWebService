class ImageAnnotator {
    constructor() {
        this.canvas = document.getElementById('annotationCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.uploadBtn = document.getElementById('uploadBtn');
        this.imageInput = document.getElementById('imageInput');
        this.fileName = document.getElementById('fileName');
        this.annotationsList = document.getElementById('annotationsList');

        this.currentImage = null;
        this.imageId = null;
        this.isDrawing = false;
        this.startX = 0;
        this.startY = 0;
        this.currentX = 0;
        this.currentY = 0;
        this.scaleX = 1;
        this.scaleY = 1;

        this.initEventListeners();
    }

    initEventListeners() {
        this.uploadBtn.addEventListener('click', () => this.imageInput.click());
        this.imageInput.addEventListener('change', (e) => this.handleImageUpload(e));

        this.canvas.addEventListener('mousedown', (e) => this.startDrawing(e));
        this.canvas.addEventListener('mousemove', (e) => this.draw(e));
        this.canvas.addEventListener('mouseup', () => this.stopDrawing());
        this.canvas.addEventListener('mouseleave', () => this.stopDrawing());
    }

    async handleImageUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        this.fileName.textContent = file.name;

        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await fetch('/api/v1/upload', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error('Upload failed');
            }

            const imageInfo = await response.json();
            await this.loadImage(imageInfo);

        } catch (error) {
            console.error('Error uploading image:', error);
            alert('Error uploading image');
        }
    }

    async loadImage(imageInfo) {
        this.imageId = imageInfo.id;

        // Создаем промис для загрузки изображения
        await new Promise((resolve, reject) => {
            this.currentImage = new Image();

            this.currentImage.onload = () => {
                console.log('Image loaded successfully');
                resolve();
            };

            this.currentImage.onerror = () => {
                console.error('Failed to load image');
                reject(new Error('Failed to load image'));
            };

            this.currentImage.src = imageInfo.url;
        });

        this.setupCanvas();
        this.drawImage();
        await this.loadExistingAnnotations();
    }

    setupCanvas() {
        if (!this.currentImage) return;

        // Устанавливаем размеры canvas равными размерам изображения
        // с ограничением максимального размера для отображения
        const maxWidth = 800;
        const maxHeight = 600;

        let displayWidth = this.currentImage.width;
        let displayHeight = this.currentImage.height;

        // Масштабируем если изображение слишком большое
        if (displayWidth > maxWidth) {
            displayHeight = (displayHeight * maxWidth) / displayWidth;
            displayWidth = maxWidth;
        }

        if (displayHeight > maxHeight) {
            displayWidth = (displayWidth * maxHeight) / displayHeight;
            displayHeight = maxHeight;
        }

        this.canvas.width = displayWidth;
        this.canvas.height = displayHeight;

        // Коэффициенты масштабирования для преобразования координат
        this.scaleX = displayWidth / this.currentImage.naturalWidth;
        this.scaleY = displayHeight / this.currentImage.naturalHeight;

        console.log(`Canvas setup: ${displayWidth}x${displayHeight}, scale: ${this.scaleX}, ${this.scaleY}`);
    }

    drawImage() {
        if (!this.currentImage || this.currentImage.complete === false) {
            console.error('Cannot draw: image not loaded');
            return;
        }

        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Рисуем изображение с масштабированием
        this.ctx.drawImage(
            this.currentImage,
            0, 0,
            this.canvas.width,
            this.canvas.height
        );
    }

    startDrawing(e) {
        if (!this.currentImage) {
            alert('Please upload an image first');
            return;
        }

        const rect = this.canvas.getBoundingClientRect();
        this.isDrawing = true;

        // Получаем координаты относительно canvas с учетом масштаба
        this.startX = (e.clientX - rect.left) / this.scaleX;
        this.startY = (e.clientY - rect.top) / this.scaleY;

        this.currentX = this.startX;
        this.currentY = this.startY;

        console.log(`Start drawing at: ${this.startX}, ${this.startY}`);
    }

    draw(e) {
        if (!this.isDrawing) return;

        const rect = this.canvas.getBoundingClientRect();
        this.currentX = (e.clientX - rect.left) / this.scaleX;
        this.currentY = (e.clientY - rect.top) / this.scaleY;

        // Перерисовываем изображение и текущий bounding box
        this.drawImage();
        this.drawCurrentBoundingBox();
    }

    drawCurrentBoundingBox() {
        const width = this.currentX - this.startX;
        const height = this.currentY - this.startY;

        this.ctx.strokeStyle = '#e74c3c';
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([5, 5]);

        // Рисуем bounding box с учетом масштаба
        this.ctx.strokeRect(
            this.startX * this.scaleX,
            this.startY * this.scaleY,
            width * this.scaleX,
            height * this.scaleY
        );

        this.ctx.setLineDash([]);
    }

    async stopDrawing() {
        if (!this.isDrawing) return;

        this.isDrawing = false;

        const width = this.currentX - this.startX;
        const height = this.currentY - this.startY;

        // Сохраняем только если bounding box достаточно большой
        if (Math.abs(width) > 5 && Math.abs(height) > 5) {
            const bbox = {
                x: Math.min(this.startX, this.currentX),
                y: Math.min(this.startY, this.currentY),
                width: Math.abs(width),
                height: Math.abs(height)
            };

            console.log('Final bbox:', bbox);
            await this.saveAnnotation(bbox);

            // Перерисовываем без временного bounding box
            this.drawImage();
            await this.loadExistingAnnotations();
        }
    }

    async saveAnnotation(bbox) {
        try {
            const annotation = {
                image_id: this.imageId,
                bbox: bbox
            };

            const response = await fetch('/api/v1/annotations', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(annotation)
            });

            if (!response.ok) {
                throw new Error('Failed to save annotation');
            }

            const savedBbox = await response.json();
            this.addAnnotationToList(savedBbox);

        } catch (error) {
            console.error('Error saving annotation:', error);
            alert('Error saving annotation');
        }
    }

    async loadExistingAnnotations() {
        if (!this.imageId) return;

        try {
            const response = await fetch(`/api/v1/annotations/${this.imageId}`);
            if (!response.ok) return;

            const annotations = await response.json();
            this.annotationsList.innerHTML = '';

            annotations.forEach(bbox => {
                this.addAnnotationToList(bbox);
                this.drawSavedBoundingBox(bbox);
            });

        } catch (error) {
            console.error('Error loading annotations:', error);
        }
    }

    drawSavedBoundingBox(bbox) {
        this.ctx.strokeStyle = '#27ae60';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(
            bbox.x * this.scaleX,
            bbox.y * this.scaleY,
            bbox.width * this.scaleX,
            bbox.height * this.scaleY
        );
    }

    addAnnotationToList(bbox) {
        const annotationItem = document.createElement('div');
        annotationItem.className = 'annotation-item';
        annotationItem.innerHTML = `
            <div class="annotation-coords">
                x: ${bbox.x.toFixed(1)}, y: ${bbox.y.toFixed(1)}<br>
                w: ${bbox.width.toFixed(1)}, h: ${bbox.height.toFixed(1)}
            </div>
        `;
        this.annotationsList.appendChild(annotationItem);
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new ImageAnnotator();
});