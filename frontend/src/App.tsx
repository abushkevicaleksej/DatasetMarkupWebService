import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { FileUpload } from '../components/FileUpload';
import { Workspace } from '../components/Workspace';
import { ModelList } from '../components/ModelList';
import { TaskList } from '../components/TaskList';
import { Header } from '../components/Header';
import { HelpPage } from '../components/HelpPage';

export default function App() {
  return (
    <Router>
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 min-h-0">
          <Routes>
            <Route path="/" element={<Navigate to="/tasks" replace />} />
            <Route path="/upload" element={<FileUpload />} />
            <Route path="/workspace" element={<Workspace />} />
            <Route path="/models" element={<ModelList />} />
            <Route path="/tasks" element={<TaskList />} />
            <Route path="/help" element={<HelpPage />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}