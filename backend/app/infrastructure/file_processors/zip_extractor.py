import zipfile
from pathlib import Path
from typing import List

from app.domain.interfaces.file_processor import ExtractorProcessor


class ZipExtractor(ExtractorProcessor):
    
    @property
    def supported_extensions(self) -> List[str]:
        return ['.zip']
    

    async def process(self, file_path: Path, original_filename: str):
        raise NotImplementedError("Use extract() method via ContentExtractor")
    

    async def extract(self, file_path: Path, output_dir: Path) -> List[Path]:
        extracted_files = []
        
        with zipfile.ZipFile(file_path, 'r') as zip_ref:
            zip_ref.extractall(output_dir)
        
        for extracted_file in output_dir.rglob('*'):
            if extracted_file.is_file():
                extracted_files.append(extracted_file)
        
        return extracted_files
