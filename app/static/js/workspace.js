import { WorkspaceManager } from '/static/js/services/workspaceService.js';

class WorkspaceModule {
    constructor() {
        this.workspaceManager = null;
        this.init();
    }

    init() {
        document.addEventListener('DOMContentLoaded', () => {
            this.initializeWorkspace();
        });
    }

    initializeWorkspace() {
        this.workspaceManager = new WorkspaceManager({
            annotationArea: document.getElementById('annotation-area'),
            labelsList: document.getElementById('labels-list'),
            filesList: document.getElementById('files-list'),
            navigation: {
                first: document.getElementById('first-btn'),
                prev: document.getElementById('prev-btn'),
                next: document.getElementById('next-btn'),
                last: document.getElementById('last-btn')
            }
        });

        this.workspaceManager.init();
    }
}

new WorkspaceModule();