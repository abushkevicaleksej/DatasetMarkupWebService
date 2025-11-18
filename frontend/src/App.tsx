import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { FileUpload } from './components/FileUpload.tsx';
import { Workspace } from './components/Workspace';
import { ModelList } from './components/ModelList.tsx';
import { TaskList } from './components/TaskList.tsx';
import { Header } from './components/Header';

export default function App() {
  return (
    <Router>
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 min-h-0">
          <Routes>
            <Route path="/" element={<Navigate to="/upload" replace />} />
            <Route path="/upload" element={<FileUpload />} />
            <Route path="/workspace" element={<Workspace />} />
            <Route path="/models" element={<ModelList />} />
            <Route path="/tasks" element={<TaskList />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}