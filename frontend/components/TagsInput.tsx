import { useState, useRef, KeyboardEvent } from 'react';
import { X } from 'lucide-react';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Label } from './ui/label';

interface TagsInputProps {
  label?: string;
  description?: string;
  value: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
}

export function TagsInput({ 
  label = "Поддерживаемые классы",
  description,
  value,
  onChange,
  placeholder = "Введите класс и нажмите Enter или запятую"
}: TagsInputProps) {
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleInputKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',' || e.key === ';') {
      e.preventDefault();
      addTag();
    } else if (e.key === 'Backspace' && inputValue === '' && value.length > 0) {
      removeTag(value.length - 1);
    }
  };

  const addTag = () => {
    const tag = inputValue.trim();
    
    const cleanTag = tag.replace(/^[,;]+|[,;]+$/g, '');
    
    if (cleanTag && !value.includes(cleanTag)) {
      onChange([...value, cleanTag]);
      setInputValue('');
    }
  };

  const removeTag = (index: number) => {
    const newTags = [...value];
    newTags.splice(index, 1);
    onChange(newTags);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    
    // Автоматически добавляем тэг при вводе запятой
    if (val.endsWith(',') || val.endsWith(';')) {
      const tag = val.slice(0, -1).trim();
      if (tag && !value.includes(tag)) {
        onChange([...value, tag]);
        setInputValue('');
        return;
      }
      setInputValue('');
      return;
    }
    
    setInputValue(val);
  };

  const handleInputBlur = () => {
    if (inputValue.trim()) {
      addTag();
    }
  };

  return (
    <div className="space-y-2">
      {label && <Label htmlFor="tags-input">{label}</Label>}
      
      <div className="flex flex-wrap gap-2 p-2 border rounded-md min-h-[42px]">
        {value.map((tag, index) => (
          <Badge 
            key={index} 
            variant="secondary" 
            className="flex items-center gap-1 pl-3 pr-2 py-1"
          >
            {tag}
            <button
              type="button"
              onClick={() => removeTag(index)}
              className="ml-1 rounded-full hover:bg-muted p-0.5"
              aria-label={`Удалить ${tag}`}
            >
              <X className="w-3 h-3" />
            </button>
          </Badge>
        ))}
        
        <Input
          ref={inputRef}
          id="tags-input"
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleInputKeyDown}
          onBlur={handleInputBlur}
          placeholder={value.length === 0 ? placeholder : ''}
          className="flex-1 min-w-[120px] border-0 focus-visible:ring-0 focus-visible:ring-offset-0 shadow-none p-0 h-7"
        />
      </div>
      
      {description && (
        <p className="text-sm text-muted-foreground">
          {description}
        </p>
      )}
      
      <div className="text-xs text-muted-foreground">
        <p>• Нажмите Enter, запятую или точку с запятой для добавления класса</p>
        <p>• Нажмите Backspace на пустом поле для удаления последнего класса</p>
        <p>• Максимальная длина одного класса: 50 символов</p>
      </div>
    </div>
  );
}