import { Button } from '../ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useState } from 'react';

export function WorkspaceNavigation() {
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = 10;

  const goToPrevious = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const goToNext = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  return (
    <div className="border-t bg-card px-4 py-3">
      <div className="flex items-center justify-center gap-4">
        <Button
          variant="outline"
          onClick={goToPrevious}
          disabled={currentPage === 1}
          className="min-w-24"
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          Previous
        </Button>
        
        <div className="flex items-center gap-2 min-w-32 justify-center">
          <span className="text-muted-foreground">Page</span>
          <span>{currentPage}</span>
          <span className="text-muted-foreground">of</span>
          <span>{totalPages}</span>
        </div>
        
        <Button
          variant="outline"
          onClick={goToNext}
          disabled={currentPage === totalPages}
          className="min-w-24"
        >
          Next
          <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}
