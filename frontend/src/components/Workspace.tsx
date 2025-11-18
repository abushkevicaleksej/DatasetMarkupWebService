import { WorkspaceToolbar } from './workspace/WorkspaceToolbar';
import { WorkspaceCanvas } from './workspace/WorkspaceCanvas';
import { AnnotationList } from './workspace/AnnotationList';
import { FileList } from './workspace/FileList';
import { WorkspaceNavigation } from './workspace/WorkspaceNavigation';

export function Workspace() {
  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col">
      <div className="flex-1 flex gap-4 p-4 overflow-hidden">
        <WorkspaceToolbar />
        
        <WorkspaceCanvas />
        
        <div className="w-80 flex flex-col gap-4">
          <AnnotationList />
          <FileList />
        </div>
      </div>
      
      <WorkspaceNavigation />
    </div>
  );
}
