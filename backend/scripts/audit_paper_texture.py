import glob
import re

for ext in ('*.tsx', '*.ts', '*.css'):
    for path in glob.glob(f'frontend/apps/desktop/src/**/{ext}', recursive=True):
        with open(path, 'r', encoding='utf-8') as f:
            content = f.read()
        whites = re.findall(r'#[fF]{6}\b|#[fF]{3}\b|background(?:Color)?\s*:\s*[\'"]#(?:fff|ffffff)[\'"]', content)
        if whites:
            print(f'{path}: {len(whites)} occurrences of white')
