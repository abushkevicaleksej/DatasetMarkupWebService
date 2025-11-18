import { Card } from '../ui/card';
// import { ImageWithFallback } from 'components/figma/ImageWithFallback.tsx';

export function WorkspaceCanvas() {
  return (
    <Card className="flex-1 flex items-center justify-center bg-muted/30 overflow-hidden">
      <div className="relative w-full h-full flex items-center justify-center p-8">
        <div className="relative w-full max-w-4xl aspect-video bg-background border-2 border-dashed rounded-lg flex items-center justify-center">
          <div className="text-center text-muted-foreground">
            <p>Workspace Canvas</p>
            <p className="text-sm">Your content will appear here</p>
          </div>
        </div>
      </div>
    </Card>
  );
}
