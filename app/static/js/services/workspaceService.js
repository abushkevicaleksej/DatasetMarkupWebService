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
        this.taskService = config.taskService;
    }

    init() {
        this.loadUploadedFiles();
        this.setupNavigation();
        this.setupToolButtons();
        this.setupSaveTaskButton();
    }

    setupSaveTaskButton() {
        const saveBtn = document.getElementById('save-task-btn');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => this.saveTask());
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

            const response = await fetch('/api/routes/api/tasks', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(taskData)
            });

            if (response.ok) {
                const task = await response.json();
                alert(`Задача "${task.name}" успешно создана!`);

                await this.saveAnnotations(task.id);
            } else {
                throw new Error('Ошибка сохранения задачи');
            }
        } catch (error) {
            console.error('Error saving task:', error);
            alert('Ошибка сохранения задачи');
        }
    }

    async saveAnnotations(taskId) {
        for (const [fileId, annotations] of this.annotations.entries()) {
            if (annotations.length > 0) {
                const annotationData = {
                    task_id: taskId,
                    file_id: fileId,
                    bounding_boxes: annotations
                };

                await fetch('/api/routes/api/tasks/${taskId}/annotations', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(annotationData)
                });
            }
        }
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

    displayCurrentFile() {
        if (!this.annotationArea) return;

        const currentFile = this.currentFiles[this.currentFileIndex];

        if (currentFile.media_type === 'image') {
            this.annotationArea.innerHTML = `
                <div class="image-container">
                    <img src="/api/files/${currentFile.id}" alt="${currentFile.original_filename}" 
                         class="annotation-image" id="annotation-image">
                    <canvas id="annotation-canvas"></canvas>
                </div>
            `;

            const img = document.getElementById('annotation-image');
            img.onload = () => this.initCanvas();
        } else {
            this.annotationArea.innerHTML = `
                <div class="placeholder-message">
                    Файл ${currentFile.original_filename} (${currentFile.media_type})<br>
                    Предпросмотр недоступен для данного типа файла
                </div>
            `;
        }
    }

    initCanvas() {
        const img = document.getElementById('annotation-image');
        const canvas = document.getElementById('annotation-canvas');
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');

        canvas.width = img.width;
        canvas.height = img.height;
        canvas.style.position = 'absolute';
        canvas.style.left = img.offsetLeft + 'px';
        canvas.style.top = img.offsetTop + 'px';

        canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
        canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
        canvas.addEventListener('mouseup', this.handleMouseUp.bind(this));

        this.loadAnnotationsForCurrentFile();
        this.drawAnnotations();
    }

    handleMouseDown(e) {
        if (this.currentTool !== 'rectangle') return;

        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        this.isDrawing = true;
        this.currentBoundingBox = {
            x, y, width: 0, height: 0, label: 'object'
        };
    }

    handleMouseMove(e) {
        if (!this.isDrawing || !this.currentBoundingBox) return;

        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        this.currentBoundingBox.width = x - this.currentBoundingBox.x;
        this.currentBoundingBox.height = y - this.currentBoundingBox.y;

        this.drawAnnotations();
        this.drawCurrentBoundingBox();
    }

    handleMouseUp(e) {
        if (!this.isDrawing) return;

        this.isDrawing = false;

        if (Math.abs(this.currentBoundingBox.width) > 5 &&
            Math.abs(this.currentBoundingBox.height) > 5) {

            if (this.currentBoundingBox.width < 0) {
                this.currentBoundingBox.x += this.currentBoundingBox.width;
                this.currentBoundingBox.width = Math.abs(this.currentBoundingBox.width);
            }
            if (this.currentBoundingBox.height < 0) {
                this.currentBoundingBox.y += this.currentBoundingBox.height;
                this.currentBoundingBox.height = Math.abs(this.currentBoundingBox.height);
            }

            this.addAnnotation(this.currentBoundingBox);
        }

        this.currentBoundingBox = null;
        this.drawAnnotations();
    }

    addAnnotation(bbox) {
        const currentFile = this.currentFiles[this.currentFileIndex];
        const fileId = currentFile.id;

        if (!this.annotations.has(fileId)) {
            this.annotations.set(fileId, []);
        }

        this.annotations.get(fileId).push({
            ...bbox,
            id: Date.now()
        });

        this.updateLabels();
    }

    deleteAnnotation(annotationId) {
        const currentFile = this.currentFiles[this.currentFileIndex];
        const fileId = currentFile.id;

        if (this.annotations.has(fileId)) {
            const annotations = this.annotations.get(fileId);
            this.annotations.set(fileId, annotations.filter(ann => ann.id !== annotationId));
            this.drawAnnotations();
            this.updateLabels();
        }
    }

    drawAnnotations() {
        if (!this.ctx) return;

        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        const currentFile = this.currentFiles[this.currentFileIndex];
        const annotations = this.annotations.get(currentFile.id) || [];

        annotations.forEach(bbox => {
            this.ctx.strokeStyle = '#00ff00';
            this.ctx.lineWidth = 2;
            this.ctx.strokeRect(bbox.x, bbox.y, bbox.width, bbox.height);

            this.ctx.fillStyle = '#00ff00';
            this.ctx.fillText(bbox.label, bbox.x, bbox.y - 5);
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

    loadAnnotationsForCurrentFile() {
        const currentFile = this.currentFiles[this.currentFileIndex];
        if (!this.annotations.has(currentFile.id)) {
            this.annotations.set(currentFile.id, []);
        }
    }

    updateLabels() {
        if (!this.labelsList) return;

        const currentFile = this.currentFiles[this.currentFileIndex];
        const annotations = this.annotations.get(currentFile.id) || [];

        this.labelsList.innerHTML = annotations
            .map(annotation => `
                <div class="workspace-label">
                    <div class="label-text-box">
                        ${annotation.label}<br>
                        ${Math.round(annotation.width)}x${Math.round(annotation.height)}
                        <button class="delete-annotation" 
                                data-id="${annotation.id}"
                                style="margin-left: 10px; color: red; border: none; background: none; cursor: pointer;">
                            ×
                        </button>
                    </div>
                </div>
            `)
            .join('');

        this.labelsList.querySelectorAll('.delete-annotation').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const annotationId = parseInt(btn.dataset.id);
                this.deleteAnnotation(annotationId);
            });
        });
    }
}