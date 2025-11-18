import { Card } from '../ui/card';

export function WorkspaceCanvas() {
  return (
    <Card className="flex-1 flex items-center justify-center bg-muted/30 overflow-hidden">
      <div className="relative w-full h-full flex items-center justify-center p-8">
        {/* Canvas area - placeholder content */}
        <div className="relative w-full max-w-4xl aspect-video bg-background border-2 border-dashed rounded-lg flex items-center justify-center">
        </div>
      </div>
    </Card>
  );
}
