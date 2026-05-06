import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Auth } from '../components/Auth';
import { FileUpload } from '../components/FileUpload';
import { Workspace } from '../components/Workspace';
import { ModelList } from '../components/ModelList';
import { TaskList } from '../components/TaskList';
import { Header } from '../components/Header';
import { HelpPage } from '../components/HelpPage';
import { AuthProvider } from './AuthContext';
import { RequireAuth } from '../components/checkAuth';
import { AdminRedirect } from '../components/AdminRedirect'

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen flex flex-col">
          <Header />
          <main className="flex-1 min-h-0">
            <Routes>
              <Route path="/" element={<RequireAuth><Navigate to="/auth" replace /></RequireAuth>} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/upload" element={<RequireAuth><FileUpload /></RequireAuth>} />
              <Route path="/workspace" element={<RequireAuth><Workspace /></RequireAuth>} />
              <Route path="/models" element={<RequireAuth><ModelList /></RequireAuth>} />
              <Route path="/tasks" element={<RequireAuth><TaskList /></RequireAuth>} />
              <Route path="/help" element={<HelpPage />} />
              <Route path="/admin" element={<AdminRedirect />} />
            </Routes>
          </main>
        </div>
      </Router>
    </AuthProvider>
  );
}