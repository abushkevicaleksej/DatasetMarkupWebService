import ApiClient from './modules/apiClient.js';
import FileUploader from './modules/fileUploader.js';

class App {
    constructor() {
        this.apiClient = new ApiClient();
        this.fileUploader = new FileUploader(this.apiClient);
    }

    init() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.initializeModules();
            });
        } else {
            this.initializeModules();
        }
    }

    initializeModules() {
        this.fileUploader.initialize();
        console.log('App initialized successfully');
    }
}

const app = new App();
app.init();