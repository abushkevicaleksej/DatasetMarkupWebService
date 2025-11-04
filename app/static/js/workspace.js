class WorkspaceManager {
    constructor() {
        this.currentImage = null;
        this.currentScale = 1.0;
        this.currentOffset = { x: 0, y: 0 };
        this.isDragging = false;
        this.dragStart = { x: 0, y: 0 };
        this.currentTool = 'select';
        this.boundingBoxes = [];
        this.selectedBox = null;
        this.isDrawing = false;
        this.drawingStart = { x: 0, y: 0 };
        this.apiBase = '/api/routes'; // Базовый путь API
        this.lastMousePosition = { x: 0, y: 0 };
        this.eventLog = [];
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadFiles();
        this.setupToolButtons();
        this.setupMouseTracking(); // Добавьте эту строку
    }

    logEvent(eventName, details = {}) {
    const event = {
        name: eventName,
        timestamp: new Date().toISOString(),
        tool: this.currentTool,
        details: details
        };
        this.eventLog.push(event);
        console.log(`[Event] ${eventName}`, details);
    }

    setupEventListeners() {
        // Обработчики для навигации
        document.getElementById('first-btn').addEventListener('click', () => this.navigateToFirst());

        document.getElementById('prev-btn').addEventListener('click', () => this.navigateToPrev());
        document.getElementById('next-btn').addEventListener('click', () => this.navigateToNext());
        document.getElementById('last-btn').addEventListener('click', () => this.navigateToLast());

        // Обработчики для масштабирования

        document.addEventListener('wheel', (e) => this.handleZoom(e), { passive: false });
    }

    setupToolButtons() {
        const toolButtons = document.querySelectorAll('.workspace-tool-button');

        toolButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const clickedButton = e.currentTarget;
                const tool = clickedButton.dataset.tool;

                console.log('Tool button clicked, tool:', tool);

                // Снимаем активность со всех кнопок - более надежный способ
                toolButtons.forEach(btn => {
                    btn.classList.remove('active');
                    btn.style.setProperty('background-color', '', 'important');
                    btn.style.setProperty('border-color', '', 'important');
                });

                // Активируем текущую кнопку
                clickedButton.classList.add('active');
                clickedButton.style.setProperty('background-color', '#4CAF50', 'important');
                clickedButton.style.setProperty('color', 'white', 'important');
                clickedButton.style.setProperty('border-color', '#367c39', 'important');

                this.currentTool = tool;
                console.log('Current tool set to:', this.currentTool);
                this.updateCanvasInteractivity();
            });
        });

        // Активируем инструмент по умолчанию
        const defaultTool = document.querySelector('[data-tool="select"]');
        if (defaultTool) {
            defaultTool.click(); // Имитируем клик для полной активации
        }
    }

    setupMouseTracking() {
        const canvas = document.getElementById('annotation-canvas');
        if (!canvas) return;

        canvas.addEventListener('mousemove', (e) => {
            this.lastMousePosition = { x: e.clientX, y: e.clientY };

            // Обновляем статус в реальном времени для отладки
            if (this.debugMode) {
                const tooltip = document.getElementById('cursor-debug');
                if (!tooltip) {
                    const debugEl = document.createElement('div');
                    debugEl.id = 'cursor-debug';
                    debugEl.style.position = 'fixed';
                    debugEl.style.top = '10px';
                    debugEl.style.left = '10px';
                    debugEl.style.background = 'rgba(0,0,0,0.8)';
                    debugEl.style.color = 'white';
                    debugEl.style.padding = '5px';
                    debugEl.style.zIndex = '10000';
                    document.body.appendChild(debugEl);
                }
                document.getElementById('cursor-debug').textContent =
                    `Tool: ${this.currentTool} | Cursor: ${canvas.style.cursor}`;
            }
        });
    }

    updateCanvasInteractivity() {
        const canvas = document.getElementById('annotation-canvas');
        const imageContainer = document.querySelector('.image-container');

        console.log('Updating canvas interactivity:', {
            canvasExists: !!canvas,
            imageContainerExists: !!imageContainer,
            currentTool: this.currentTool
        });

        if (canvas && imageContainer) {
            if (this.currentTool === 'rectangle' || this.currentTool === 'model') {
                canvas.classList.add('canvas-interactive');
                canvas.classList.remove('canvas-passive');
                canvas.style.pointerEvents = 'auto'; // Разрешаем события
                imageContainer.classList.add('drawing');
                imageContainer.classList.remove('dragging');
                console.log('Canvas set to interactive mode (rectangle)');
            } else if (this.currentTool === 'select') {
                canvas.classList.remove('canvas-interactive');
                canvas.classList.add('canvas-passive');
                canvas.style.pointerEvents = 'auto';
                imageContainer.classList.remove('drawing');
                imageContainer.classList.remove('dragging');
                console.log('Canvas set to passive mode (select)');
            } else {
                canvas.classList.remove('canvas-interactive');
                canvas.classList.add('canvas-passive');
                canvas.style.pointerEvents = 'none'; // Запрещаем события
                imageContainer.classList.remove('drawing');
                imageContainer.classList.remove('dragging');
                console.log('Canvas set to disabled mode');
            }
        } else {
            console.warn('Canvas or image container not found');
        }
    }

    async loadFiles() {
        try {
            // Используем правильный путь к API
            const response = await fetch(`${this.apiBase}/files`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const files = await response.json();
            this.renderFilesList(files);
        } catch (error) {
            console.error('Error loading files:', error);
        }
    }

    renderFilesList(files) {
        const filesList = document.getElementById('files-list');
        filesList.innerHTML = '';

        files.forEach(file => {
            const fileElement = document.createElement('div');
            fileElement.className = 'workspace-file';
            fileElement.innerHTML = `
                <div class="file-info">
                    <div class="file-name">${file.original_filename}</div>
                    <div class="file-size">${this.formatFileSize(file.file_size)}</div>
                </div>
            `;

            fileElement.addEventListener('click', () => this.loadImage(file.id));
            filesList.appendChild(fileElement);
        });
    }

    async loadImage(fileId) {
        try {
            // Используем правильный путь для загрузки файла
            const response = await fetch(`${this.apiBase}/files/${fileId}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const blob = await response.blob();
            const url = URL.createObjectURL(blob);

            this.displayImage(url, fileId);
            this.loadAnnotations(fileId);

            // Обновляем активный файл
            document.querySelectorAll('.workspace-file').forEach(file => file.classList.remove('active'));
            event.target.closest('.workspace-file').classList.add('active');
        } catch (error) {
            console.error('Error loading image:', error);
        }
    }

    displayImage(imageUrl, fileId) {
        const annotationArea = document.getElementById('annotation-area');

        // Очищаем область аннотации
        annotationArea.innerHTML = '';

        // Создаем контейнер для изображения
        const imageContainer = document.createElement('div');
        imageContainer.className = 'image-container';

        // Создаем элемент изображения
        const img = document.createElement('img');
        img.id = 'annotation-image';
        img.className = 'annotation-image';
        img.src = imageUrl;
        img.alt = 'Annotation image';
        img.dataset.fileId = fileId;

        imageContainer.appendChild(img);
        annotationArea.appendChild(imageContainer);

        // Инициализируем canvas
        this.setupCanvas();

        this.currentImage = img;
        this.setupImageInteractions();
        this.resetView();

        // Принудительно обновляем интерактивность
        this.updateCanvasInteractivity();
    }

    setupImageInteractions() {
        const imageContainer = this.currentImage.parentElement;
        const canvas = document.getElementById('annotation-canvas');

        if (!canvas) {
            console.error('Canvas not found in setupImageInteractions');
            return;
        }

        console.log('Setting up image interactions');
        this.logEvent('setup_image_interactions', {
            canvasExists: !!canvas,
            imageContainerExists: !!imageContainer,
            currentTool: this.currentTool
        });

        // Очищаем старые обработчики
        canvas.removeEventListener('mousedown', this.boundStartDrawing);
        canvas.removeEventListener('mousemove', this.boundWhileDrawing);
        canvas.removeEventListener('mouseup', this.boundFinishDrawing);

        // Привязываем методы к контексту
        this.boundStartDrawing = this.startDrawing.bind(this);
        this.boundWhileDrawing = this.whileDrawing.bind(this);
        this.boundFinishDrawing = this.finishDrawing.bind(this);

        // Рисование рамок - только на canvas
        canvas.addEventListener('mousedown', this.boundStartDrawing);
        canvas.addEventListener('mousemove', this.boundWhileDrawing);
        canvas.addEventListener('mouseup', this.boundFinishDrawing);

        // Добавляем обработчик для проверки событий
        canvas.addEventListener('mousedown', (e) => {
            this.logEvent('canvas_mousedown_raw', {
                button: e.button,
                clientX: e.clientX,
                clientY: e.clientY,
                target: e.target.tagName,
                currentTarget: e.currentTarget.tagName
            });
        });

        // Перетаскивание изображения - на контейнере
        imageContainer.addEventListener('mousedown', (e) => this.startDrag(e));
        document.addEventListener('mousemove', (e) => this.drag(e));
        document.addEventListener('mouseup', () => this.endDrag());

        // Обновляем курсор сразу после настройки
        this.updateCanvasInteractivity();
    }

    setupCanvas() {
        const annotationArea = document.getElementById('annotation-area');
        const imageContainer = document.querySelector('.image-container');

        // Если canvas уже существует, удаляем его
        const existingCanvas = document.getElementById('annotation-canvas');
        if (existingCanvas) {
            existingCanvas.remove();
        }

        // Создаем новый canvas
        const canvas = document.createElement('canvas');
        canvas.id = 'annotation-canvas';

        // Устанавливаем размеры как у контейнера изображения
        if (imageContainer) {
            const rect = imageContainer.getBoundingClientRect();
            canvas.width = rect.width;
            canvas.height = rect.height;
            canvas.style.width = rect.width + 'px';
            canvas.style.height = rect.height + 'px';
        } else {
            canvas.width = annotationArea.offsetWidth;
            canvas.height = annotationArea.offsetHeight;
            canvas.style.width = annotationArea.offsetWidth + 'px';
            canvas.style.height = annotationArea.offsetHeight + 'px';
        }

        canvas.style.position = 'absolute';
        canvas.style.top = '0';
        canvas.style.left = '0';
        canvas.style.pointerEvents = 'auto';
        canvas.style.zIndex = '10'; // Убедимся, что canvas поверх изображения

        // Добавляем стили для видимости (временно для отладки)
        canvas.style.backgroundColor = 'rgba(255, 0, 0, 0.1)'; // Красный фон для видимости
        canvas.style.border = '1px dashed blue'; // Синяя рамка для видимости

        annotationArea.appendChild(canvas);

        this.logEvent('canvas_created', {
            width: canvas.width,
            height: canvas.height,
            styleWidth: canvas.style.width,
            styleHeight: canvas.style.height
        });

        // Обновляем интерактивность
        this.updateCanvasInteractivity();

        return canvas;
    }

    startDrag(e) {
        if (e.button !== 0) return;

        this.isDragging = true;
        this.dragStart = { x: e.clientX - this.currentOffset.x, y: e.clientY - this.currentOffset.y };
        this.currentImage.parentElement.classList.add('dragging');
    }

    drag(e) {
        if (!this.isDragging) return;

        this.currentOffset.x = e.clientX - this.dragStart.x;
        this.currentOffset.y = e.clientY - this.dragStart.y;
        this.updateImageTransform();
    }

    endDrag() {
        this.isDragging = false;
        this.currentImage.parentElement.classList.remove('dragging');
    }

    handleZoom(e) {
        e.preventDefault();

        const zoomIntensity = 0.1;
        const wheel = e.deltaY < 0 ? 1 : -1;
        const zoom = Math.exp(wheel * zoomIntensity);

        // Масштабирование относительно курсора
        const mouseX = e.clientX - this.currentImage.getBoundingClientRect().left;
        const mouseY = e.clientY - this.currentImage.getBoundingClientRect().top;

        const newScale = Math.max(0.1, Math.min(5, this.currentScale * zoom));

        // Вычисляем смещение для масштабирования относительно курсора
        this.currentOffset.x = mouseX - (mouseX - this.currentOffset.x) * (newScale / this.currentScale);
        this.currentOffset.y = mouseY - (mouseY - this.currentOffset.y) * (newScale / this.currentScale);

        this.currentScale = newScale;
        this.updateImageTransform();
    }

    updateImageTransform() {
        if (this.currentImage) {
            this.currentImage.style.transform = `translate(${this.currentOffset.x}px, ${this.currentOffset.y}px) scale(${this.currentScale})`;
            this.redrawBoundingBoxes();
        }
    }

    resetView() {
        if (!this.currentImage) return;

        const container = document.querySelector('.workspace-annotation-container');
        const img = this.currentImage;

        // Ждем загрузки изображения
        img.onload = () => {
            const containerRect = container.getBoundingClientRect();
            const scaleX = containerRect.width / img.naturalWidth;
            const scaleY = containerRect.height / img.naturalHeight;

            this.currentScale = Math.min(scaleX, scaleY, 1);
            this.currentOffset = {
                x: (containerRect.width - img.naturalWidth * this.currentScale) / 2,
                y: (containerRect.height - img.naturalHeight * this.currentScale) / 2
            };

            this.updateImageTransform();
            this.setupCanvas();
        };
    }

    // Методы для работы с ограничивающими рамками
    startDrawing(e) {
        this.logEvent('startDrawing_called', {
            button: e.button,
            currentTool: this.currentTool,
            hasCurrentImage: !!this.currentImage,
            isDrawing: this.isDrawing
        });

        if (e.button !== 0) {
            this.logEvent('startDrawing_wrong_button', { button: e.button });
            return; // только левая кнопка мыши
        }

        if (this.currentTool !== 'rectangle') {
            this.logEvent('startDrawing_wrong_tool', { currentTool: this.currentTool });
            return;
        }

        if (!this.currentImage) {
            this.logEvent('startDrawing_no_image');
            return;
        }

        e.preventDefault();
        e.stopPropagation();

        const canvas = document.getElementById('annotation-canvas');
        if (!canvas) {
            this.logEvent('startDrawing_no_canvas');
            return;
        }

        const rect = canvas.getBoundingClientRect();
        this.logEvent('startDrawing_canvas_rect', rect);

        // Получаем координаты относительно canvas с учетом масштаба и смещения
        const x = (e.clientX - rect.left - this.currentOffset.x) / this.currentScale;
        const y = (e.clientY - rect.top - this.currentOffset.y) / this.currentScale;

        this.logEvent('startDrawing_coordinates', {
            x, y,
            scale: this.currentScale,
            offset: this.currentOffset,
            clientX: e.clientX,
            clientY: e.clientY,
            rectLeft: rect.left,
            rectTop: rect.top
        });

        this.isDrawing = true;
        this.drawingStart = { x, y };

        // Создаем временную рамку
        this.tempBox = this.createBoundingBox(this.drawingStart.x, this.drawingStart.y, 0, 0);
        this.logEvent('startDrawing_tempbox_created');

        // Блокируем перетаскивание изображения во время рисования
        this.isDragging = false;
    }

    whileDrawing(e) {
        if (!this.isDrawing || !this.tempBox) {
            if (this.isDrawing && !this.tempBox) {
                this.logEvent('whileDrawing_no_tempbox');
            }
            return;
        }

        const canvas = document.getElementById('annotation-canvas');
        const rect = canvas.getBoundingClientRect();
        const scale = this.currentScale;
        const offset = this.currentOffset;

        const currentX = (e.clientX - rect.left - offset.x) / scale;
        const currentY = (e.clientY - rect.top - offset.y) / scale;

        const width = currentX - this.drawingStart.x;
        const height = currentY - this.drawingStart.y;

        this.logEvent('whileDrawing_update', {
            currentX, currentY, width, height
        });

        this.updateBoundingBox(this.tempBox, this.drawingStart.x, this.drawingStart.y, width, height);
    }

    finishDrawing(e) {
        this.logEvent('finishDrawing_called', {
            isDrawing: this.isDrawing,
            hasTempBox: !!this.tempBox
        });

        if (!this.isDrawing) return;

        this.isDrawing = false;

        if (this.tempBox) {
            const rect = this.tempBox.getBoundingClientRect();
            this.logEvent('finishDrawing_tempbox_size', {
                width: rect.width,
                height: rect.height
            });

            if (rect.width > 5 && rect.height > 5) {
                this.logEvent('finishDrawing_saving_box');
                this.saveBoundingBox(this.tempBox);
            } else {
                this.logEvent('finishDrawing_removing_small_box');
                this.tempBox.remove();
            }
            this.tempBox = null;
        }
    }

    createBoundingBox(x, y, width, height) {
        const box = document.createElement('div');
        box.className = 'bounding-box';
        box.style.position = 'absolute';
        box.style.left = (x * this.currentScale + this.currentOffset.x) + 'px';
        box.style.top = (y * this.currentScale + this.currentOffset.y) + 'px';
        box.style.width = Math.abs(width) * this.currentScale + 'px';
        box.style.height = Math.abs(height) * this.currentScale + 'px';
        box.style.border = '2px solid #00ff00';
        box.style.backgroundColor = 'rgba(0, 255, 0, 0.1)';
        box.style.boxSizing = 'border-box';

        // Добавляем в контейнер изображения
        const imageContainer = document.querySelector('.image-container');
        if (imageContainer) {
            imageContainer.appendChild(box);
        }

        return box;
    }

    updateBoundingBox(box, x, y, width, height) {
        const absWidth = Math.abs(width);
        const absHeight = Math.abs(height);

        const realX = width < 0 ? x + width : x;
        const realY = height < 0 ? y + height : y;

        box.style.left = (realX * this.currentScale + this.currentOffset.x) + 'px';
        box.style.top = (realY * this.currentScale + this.currentOffset.y) + 'px';
        box.style.width = absWidth * this.currentScale + 'px';
        box.style.height = absHeight * this.currentScale + 'px';
    }

    selectBox(e, box) {
        e.stopPropagation();

        // Снимаем выделение с других рамок
        document.querySelectorAll('.bounding-box').forEach(b => b.classList.remove('selected'));

        // Выделяем текущую рамку
        box.classList.add('selected');
        this.selectedBox = box;
    }

    startResize(e, direction, box) {
        e.stopPropagation();
        this.isResizing = true;
        this.resizeDirection = direction;
        this.resizeStart = { x: e.clientX, y: e.clientY };
        this.boxStart = {
            x: parseInt(box.style.left),
            y: parseInt(box.style.top),
            width: parseInt(box.style.width),
            height: parseInt(box.style.height)
        };

        document.addEventListener('mousemove', this.handleResize.bind(this));
        document.addEventListener('mouseup', this.stopResize.bind(this));
    }

    handleResize(e) {
        if (!this.isResizing || !this.selectedBox) return;

        const dx = e.clientX - this.resizeStart.x;
        const dy = e.clientY - this.resizeStart.y;

        let { x, y, width, height } = this.boxStart;

        switch (this.resizeDirection) {
            case 'nw':
                x += dx; y += dy; width -= dx; height -= dy;
                break;
            case 'n':
                y += dy; height -= dy;
                break;
            case 'ne':
                y += dy; width += dx; height -= dy;
                break;
            case 'w':
                x += dx; width -= dx;
                break;
            case 'e':
                width += dx;
                break;
            case 'sw':
                x += dx; width -= dx; height += dy;
                break;
            case 's':
                height += dy;
                break;
            case 'se':
                width += dx; height += dy;
                break;
        }

        this.updateBoundingBox(this.selectedBox, x, y, width, height);
    }

    stopResize() {
        this.isResizing = false;
        document.removeEventListener('mousemove', this.handleResize);
        document.removeEventListener('mouseup', this.stopResize);
    }

    redrawBoundingBoxes() {
    }

    async saveBoundingBox(box) {
        const rect = box.getBoundingClientRect();
        const imageRect = this.currentImage.getBoundingClientRect();

        const bboxData = {
            x: (rect.left - imageRect.left) / this.currentScale,
            y: (rect.top - imageRect.top) / this.currentScale,
            width: rect.width / this.currentScale,
            height: rect.height / this.currentScale,
            label: document.getElementById('label-selector').value
        };

        try {
            const response = await fetch(`${this.apiBase}/annotations`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    file_id: this.currentImage.dataset.fileId,
                    task_id: 'default-task', // Добавьте реальный task_id
                    bounding_boxes: [bboxData]
                })
            });

            if (response.ok) {
                console.log('Bounding box saved');
            } else {
                console.error('Failed to save bounding box:', response.status);
            }
        } catch (error) {
            console.error('Error saving bounding box:', error);
        }
    }

    async loadAnnotations(fileId) {
        try {
            const response = await fetch(`${this.apiBase}/annotations/file/${fileId}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const annotations = await response.json();
            this.renderAnnotations(annotations);
        } catch (error) {
            console.error('Error loading annotations:', error);
        }
    }

    renderAnnotations(annotations) {
        // Очищаем существующие рамки
        document.querySelectorAll('.bounding-box').forEach(box => box.remove());

        annotations.forEach(annotation => {
            annotation.bounding_boxes.forEach(bbox => {
                const box = this.createBoundingBox(
                    bbox.x * this.currentScale,
                    bbox.y * this.currentScale,
                    bbox.width * this.currentScale,
                    bbox.height * this.currentScale
                );
            });
        });
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    navigateToFirst() {  }
    navigateToPrev() { /* реализация */ }
    navigateToNext() { /* реализация */ }
    navigateToLast() { /* реализация */ }
}

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM fully loaded, initializing WorkspaceManager...');
    window.workspaceManager = new WorkspaceManager();
});