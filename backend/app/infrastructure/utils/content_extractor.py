import tempfile
from pathlib import Path
from typing import List, Tuple

from app.domain.interfaces.file_processor import ExtractorProcessor


class ContentExtractor:
    
    def __init__(self):
        self._extractors = {}
        self._setup_extractors()
    

    def _setup_extractors(self):
        from app.infrastructure.file_processors.zip_extractor import ZipExtractor
        from app.infrastructure.file_processors.video_extractor import VideoExtractor
        
        extractors = [ZipExtractor(), VideoExtractor()]
        
        for extractor in extractors:
            for ext in extractor.supported_extensions:
                self._extractors[ext] = extractor
    

    def get_extractor(self, filename: str) -> ExtractorProcessor:
        file_path = Path(filename)
        extension = file_path.suffix.lower()
        
        extractor = self._extractors.get(extension)
        if not extractor:
            raise ValueError(f"No extractor found for file type: {extension}")
        
        return extractor
    

    async def extract_content(self, file_path: Path, original_filename: str) -> Tuple[List[Path], Path]:
        extractor = self.get_extractor(original_filename)
        temp_dir = Path(tempfile.mkdtemp(prefix=f"extract_{original_filename}_"))
        
        try:
            extracted_files = await extractor.extract(file_path, temp_dir)
            return extracted_files, temp_dir
        except Exception as e:
            import shutil
            if temp_dir.exists():
                shutil.rmtree(temp_dir)
            raise
    

    def can_extract(self, filename: str) -> bool:
        try:
            self.get_extractor(filename)
            return True
        except ValueError:
            return False
