export class WorkspaceManager {
    constructor(config) {
        this.annotationArea = config.annotationArea;
        this.labelsList = config.labelsList;
        this.filesList = config.filesList;
        this.navigation = config.navigation;
        this.currentFiles = [];
        this.currentFileIndex = 0;
        this.annotations = new Map();
        this.currentTool = 'select';
        this.isDrawing = false;
        this.currentBoundingBox = null;
        this.canvas = null;
        this.ctx = null;
        this.dragStart = null;
        this.selectedBoundingBox = null;
        this.labelOptions = ['person', 'car', 'bicycle', 'animal', 'object'];

        this.init();
    }

    init() {
        this.loadUploadedFiles();
        this.setupNavigation();
        this.setupToolButtons();
        this.setupSaveTaskButton();
        this.setupLabelSelector();
    }

    setupLabelSelector() {
        const labelSelector = document.createElement('select');
        labelSelector.id = 'label-selector';
        labelSelector.innerHTML = this.labelOptions.map(label =>
            `<option value="${label}">${label}</option>`
        ).join('');

        const toolbar = document.querySelector('.workspace-tool-container');
        if (toolbar) {
            toolbar.appendChild(labelSelector);
        }
    }

    getCurrentLabel() {
        const selector = document.getElementById('label-selector');
        return selector ? selector.value : 'object';
    }

    loadUploadedFiles() {
        const uploadResult = sessionStorage.getItem('uploadResult');
        console.log('Loaded upload result:', uploadResult);

        if (uploadResult) {
            try {
                const result = JSON.parse(uploadResult);
                this.currentFiles = result.extracted_files || [];
                console.log('Loaded files:', this.currentFiles);
                this.renderFilesList();

                if (this.currentFiles.length > 0) {
                    this.loadFile(0);
                }
            } catch (error) {
                console.error('Error parsing upload result:', error);
            }
        } else {
            console.warn('No upload result found in sessionStorage');
        }
    }

    renderFilesList() {
        if (!this.filesList) return;

        this.filesList.innerHTML = this.currentFiles
            .map((file, index) => `
                <div class="workspace-file ${index === this.currentFileIndex ? 'active' : ''}" 
                     data-index="${index}">
                    <div class="file-thumbnail">📷</div>
                    <div class="file-info">
                        <div class="file-name">${file.original_filename}</div>
                        <div class="file-size">${this.formatFileSize(file.file_size)}</div>
                    </div>
                </div>
            `).join('');

        this.filesList.querySelectorAll('.workspace-file').forEach(fileElement => {
            fileElement.addEventListener('click', () => {
                const index = parseInt(fileElement.dataset.index);
                this.loadFile(index);
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

    async loadFile(index) {
        if (index < 0 || index >= this.currentFiles.length) return;

        this.currentFileIndex = index;
        this.renderFilesList();
        await this.displayCurrentFile();
        await this.loadAnnotations();
        this.updateLabels();
    }

    async displayCurrentFile() {
        if (!this.annotationArea) return;

        const currentFile = this.currentFiles[this.currentFileIndex];
        console.log('Displaying file:', currentFile);

        if (currentFile.media_type === 'image') {
            this.annotationArea.innerHTML = `
                <div class="annotation-area-container">
                    <div class="image-container">
                        <img src="/api/routes/files/${currentFile.id}" 
                             alt="${currentFile.original_filename}" 
                             class="annotation-image"
                             id="annotation-image"
                             onerror="this.style.display='none'; document.getElementById('image-error').style.display='block';">
                        <div id="image-error" style="display: none; color: red; padding: 20px;">
                            Ошибка загрузки изображения. Проверьте console для деталей.
                        </div>
                        <canvas id="annotation-canvas"></canvas>
                    </div>
                </div>
                <div class="image-info">
                    <strong>${currentFile.original_filename}</strong>
                    <div class="file-stats">
                        Размер: ${currentFile.width || 'N/A'} × ${currentFile.height || 'N/A'} | 
                        Аннотации: <span id="annotation-count">0</span>
                    </div>
                </div>
            `;

            const img = document.getElementById('annotation-image');
            const errorDiv = document.getElementById('image-error');

            img.onload = () => {
                errorDiv.style.display = 'none';
                this.initCanvas();
            };

            img.onerror = () => {
                console.error('Failed to load image:', img.src);
                errorDiv.style.display = 'block';
            };

            if (img.complete) {
                img.onload();
            }
                } else {
                    this.annotationArea.innerHTML = `
                        <div class="placeholder-message">
                            <h3>${currentFile.original_filename}</h3>
                            <p>Тип файла: ${currentFile.media_type}</p>
                            <p>Размер: ${this.formatFileSize(currentFile.file_size)}</p>
                            <p>📁 Предпросмотр недоступен для данного типа файла</p>
                        </div>
                    `;
                }
            }


    initCanvas() {
        const img = document.getElementById('annotation-image');
        const canvas = document.getElementById('annotation-canvas');

        if (!img || !canvas) {
            console.error('Image or canvas not found');
            return;
        }

        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');

        canvas.width = img.offsetWidth;
        canvas.height = img.offsetHeight;

        canvas.style.position = 'absolute';
        canvas.style.top = '0';
        canvas.style.left = '0';
        canvas.style.width = '100%';
        canvas.style.height = '100%';

        console.log(`Canvas initialized: ${canvas.width}x${canvas.height}, Image: ${img.naturalWidth}x${img.naturalHeight}`);

        canvas.style.pointerEvents = 'auto';
        canvas.classList.add('canvas-active');

        this.setupCanvasEvents();

        this.drawAnnotations();
    }

    handleMouseDown(e) {
        if (this.currentTool !== 'rectangle') return;

        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        this.isDrawing = true;
        this.dragStart = { x, y };
        this.currentBoundingBox = {
            x, y, width: 0, height: 0, label: this.getCurrentLabel()
        };
    }

    handleMouseMove(e) {
        if (!this.isDrawing || !this.currentBoundingBox) return;

        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        this.currentBoundingBox.width = x - this.dragStart.x;
        this.currentBoundingBox.height = y - this.dragStart.y;

        this.drawAnnotations();
        this.drawCurrentBoundingBox();
    }

    handleMouseUp(e) {
        if (!this.isDrawing) return;

        this.isDrawing = false;

        if (Math.abs(this.currentBoundingBox.width) > 10 &&
            Math.abs(this.currentBoundingBox.height) > 10) {

            let { x, y, width, height } = this.currentBoundingBox;

            if (width < 0) {
                x += width;
                width = Math.abs(width);
            }
            if (height < 0) {
                y += height;
                height = Math.abs(height);
            }

            const normalizedBbox = {
                x, y, width, height,
                label: this.getCurrentLabel(),
                confidence: 0.95
            };

            this.addAnnotation(normalizedBbox);
        }

        this.currentBoundingBox = null;
        this.dragStart = null;
        this.drawAnnotations();
    }

    handleClick(e) {
        if (this.currentTool === 'delete' && this.selectedBoundingBox) {
            this.deleteAnnotation(this.selectedBoundingBox.annotationId, this.selectedBoundingBox.bboxId);
            this.selectedBoundingBox = null;
            this.drawAnnotations();
        }
    }

    setupCanvasEvents() {
        if (!this.canvas) return;

        this.canvas.removeEventListener('mousedown', this.boundMouseDown);
        this.canvas.removeEventListener('mousemove', this.boundMouseMove);
        this.canvas.removeEventListener('mouseup', this.boundMouseUp);

        this.boundMouseDown = this.handleMouseDown.bind(this);
        this.boundMouseMove = this.handleMouseMove.bind(this);
        this.boundMouseUp = this.handleMouseUp.bind(this);

        this.canvas.addEventListener('mousedown', this.boundMouseDown);
        this.canvas.addEventListener('mousemove', this.boundMouseMove);
        this.canvas.addEventListener('mouseup', this.boundMouseUp);
    }

    async addAnnotation(bbox) {
        const currentFile = this.currentFiles[this.currentFileIndex];
        const fileId = currentFile.id;
        
        const img = document.getElementById('annotation-image');
        const normalizedBbox = this.normalizeBoundingBox(bbox, img.naturalWidth, img.naturalHeight);
        
        try {
            let taskId = sessionStorage.getItem('currentTaskId');
            if (!taskId) {
                const taskResponse = await fetch('/api/routes/tasks', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        name: `Task ${new Date().toLocaleDateString()}`,
                        description: 'Auto-created task',
                        file_ids: [fileId]
                    })
                });
                
                if (taskResponse.ok) {
                    const task = await taskResponse.json();
                    taskId = task.id;
                    sessionStorage.setItem('currentTaskId', taskId);
                }
            }
        
            const response = await fetch('/api/routes/annotations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    file_id: fileId,
                    task_id: taskId,
                    bounding_boxes: [normalizedBbox]
                })
            });

            if (response.ok) {
                await this.loadAnnotations();
                this.updateLabels();
            }
        } catch (error) {
            console.error('Error saving annotation:', error);
        }
    }

    normalizeBoundingBox(bbox, imageWidth, imageHeight) {
        return {
            x: bbox.x / imageWidth,
            y: bbox.y / imageHeight,
            width: bbox.width / imageWidth,
            height: bbox.height / imageHeight,
            label: bbox.label,
            confidence: bbox.confidence || 0.95
        };
    }

    denormalizeBoundingBox(bbox, imageWidth, imageHeight) {
        return {
            x: bbox.x * imageWidth,
            y: bbox.y * imageHeight,
            width: bbox.width * imageWidth,
            height: bbox.height * imageHeight,
            label: bbox.label,
            confidence: bbox.confidence
        };
    }

    async loadAnnotations() {
        const currentFile = this.currentFiles[this.currentFileIndex];
        if (!currentFile) return;

        try {
            const response = await fetch(`/api/routes/annotations/file/${currentFile.id}`);
            if (response.ok) {
                const annotations = await response.json();
                this.annotations.set(currentFile.id, annotations);
                this.drawAnnotations();
                this.updateAnnotationCount(annotations.length);
            }
        } catch (error) {
            console.error('Error loading annotations:', error);
        }
    }

    updateAnnotationCount(count) {
        const countElement = document.getElementById('annotation-count');
        if (countElement) {
            countElement.textContent = count;
        }
    }

    async deleteAnnotation(annotationId, bboxId) {
        try {
            const response = await fetch(`/api/routes/annotations/${annotationId}/bbox/${bboxId}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                await this.loadAnnotations(); // Перезагружаем аннотации
                this.updateLabels();
            } else {
                console.error('Failed to delete annotation');
            }
        } catch (error) {
            console.error('Error deleting annotation:', error);
        }
    }

    drawAnnotations() {
        if (!this.ctx || !this.canvas) return;

        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        const currentFile = this.currentFiles[this.currentFileIndex];
        if (!currentFile) return;

        const annotations = this.annotations.get(currentFile.id) || [];
        const img = document.getElementById('annotation-image');

        annotations.forEach(annotation => {
            annotation.bounding_boxes.forEach(bbox => {
                const denormalized = this.denormalizeBoundingBox(
                    bbox, 
                    img.naturalWidth, 
                    img.naturalHeight
                );
                
                const isSelected = this.selectedBoundingBox && 
                                this.selectedBoundingBox.bboxId === bbox.id;
                
                this.ctx.strokeStyle = isSelected ? '#ff0000' : '#00ff00';
                this.ctx.lineWidth = isSelected ? 3 : 2;
                this.ctx.strokeRect(denormalized.x, denormalized.y, denormalized.width, denormalized.height);
                
                this.ctx.fillStyle = isSelected ? '#ff0000' : '#00ff00';
                this.ctx.fillRect(denormalized.x, denormalized.y - 15, bbox.label.length * 8, 15);
                
                this.ctx.fillStyle = '#ffffff';
                this.ctx.font = '12px Arial';
                this.ctx.fillText(bbox.label, denormalized.x + 2, denormalized.y - 3);
                });
            });
        }

    drawCurrentBoundingBox() {
        if (!this.currentBoundingBox || !this.ctx) return;

        this.ctx.strokeStyle = '#ff0000';
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([5, 5]);
        this.ctx.strokeRect(
            this.currentBoundingBox.x,
            this.currentBoundingBox.y,
            this.currentBoundingBox.width,
            this.currentBoundingBox.height
        );
        this.ctx.setLineDash([]);
    }

    updateLabels() {
        if (!this.labelsList) return;

        const currentFile = this.currentFiles[this.currentFileIndex];
        const annotations = this.annotations.get(currentFile.id) || [];

        this.labelsList.innerHTML = annotations
            .flatMap(annotation =>
                annotation.bounding_boxes.map(bbox => `
                    <div class="workspace-label ${this.selectedBoundingBox && this.selectedBoundingBox.bboxId === bbox.id ? 'selected' : ''}"
                         data-annotation-id="${annotation.id}"
                         data-bbox-id="${bbox.id}">
                        <div class="label-text-box">
                            <strong>${bbox.label}</strong><br>
                            Pos: (${Math.round(bbox.x)}, ${Math.round(bbox.y)})<br>
                            Size: ${Math.round(bbox.width)}x${Math.round(bbox.height)}
                            <button class="delete-annotation" 
                                    style="margin-left: 10px; color: red; border: none; background: none; cursor: pointer; float: right;">
                                ×
                            </button>
                        </div>
                    </div>
                `)
            )
            .join('');

        this.labelsList.querySelectorAll('.workspace-label').forEach(label => {
            label.addEventListener('click', (e) => {
                if (!e.target.classList.contains('delete-annotation')) {
                    const annotationId = label.dataset.annotationId;
                    const bboxId = label.dataset.bboxId;
                    this.selectedBoundingBox = { annotationId, bboxId };
                    this.drawAnnotations();
                    this.updateLabels();
                }
            });
        });

        this.labelsList.querySelectorAll('.delete-annotation').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const label = btn.closest('.workspace-label');
                const annotationId = label.dataset.annotationId;
                const bboxId = label.dataset.bboxId;
                this.deleteAnnotation(annotationId, bboxId);
            });
        });
    }

    setupToolButtons() {
        const toolButtons = document.querySelectorAll('.workspace-tool-button');
        toolButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                toolButtons.forEach(btn => btn.classList.remove('active'));
                e.target.classList.add('active');

                this.currentTool = e.target.dataset.tool;
                this.updateCanvasCursor();
            });
        });
    }

    updateCanvasCursor() {
        if (!this.canvas) return;

        const cursors = {
            'select': 'default',
            'rectangle': 'crosshair',
            'delete': 'not-allowed'
        };

        this.canvas.style.cursor = cursors[this.currentTool] || 'default';
    }

    setupNavigation() {
        if (!this.navigation) return;

        this.navigation.first.addEventListener('click', () => this.loadFile(0));
        this.navigation.prev.addEventListener('click', () => this.loadFile(this.currentFileIndex - 1));
        this.navigation.next.addEventListener('click', () => this.loadFile(this.currentFileIndex + 1));
        this.navigation.last.addEventListener('click', () => this.loadFile(this.currentFiles.length - 1));
    }

    setupSaveTaskButton() {
        const saveButton = document.createElement('button');
        saveButton.className = 'workspace-tool-button';
        saveButton.textContent = '💾 Сохранить';
        saveButton.style.background = '#4CAF50';
        saveButton.addEventListener('click', () => this.saveTask());

        const toolbar = document.querySelector('.workspace-tool-container');
        if (toolbar) {
            toolbar.appendChild(saveButton);
        }
    }

    async saveTask() {
        const taskName = prompt('Введите название задачи:');
        if (!taskName) return;

        try {
            const taskData = {
                name: taskName,
                description: `Задача создана ${new Date().toLocaleString()}`,
                files: this.currentFiles.map(file => file.id)
            };

            const response = await fetch('/api/routes/tasks', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(taskData)
            });

            if (response.ok) {
                const task = await response.json();
                alert(`Задача "${task.name}" успешно создана!`);
            } else {
                throw new Error('Ошибка сохранения задачи');
            }
        } catch (error) {
            console.error('Error saving task:', error);
            alert('Ошибка сохранения задачи: ' + error.message);
        }
    }
}