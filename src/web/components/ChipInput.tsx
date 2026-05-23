import React, { useState, type KeyboardEvent } from 'react';

interface ChipInputProps {
  value: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  label: string;
  name: string;
  disabled?: boolean;
  suggestions?: string[];
  onAddSuggestion?: (label: string) => void;
}

const ChipInput: React.FC<ChipInputProps> = ({ value, onChange, placeholder, label, name, disabled, suggestions, onAddSuggestion }) => {
  const [inputValue, setInputValue] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputId = `chip-input-${name}`;

  const filteredSuggestions = useMemo(() => {
    if (!suggestions || !inputValue || inputValue.length < 1) return [];
    const query = inputValue.toLowerCase();
    return suggestions.filter((s) => s.toLowerCase().includes(query) && !value.includes(s));
  }, [suggestions, inputValue, value]);

  const isUnmanaged = inputValue.length >= 1 && suggestions && !suggestions.some((s) => s.toLowerCase() === inputValue.toLowerCase());

  const addChip = (chipValue: string) => {
    const trimmed = chipValue.trim();
    if (trimmed && !value.includes(trimmed)) {
      onChange([...value, trimmed]);
    }
    setInputValue('');
    setShowSuggestions(false);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;
    if ((e.key === 'Enter' || e.key === ',') && inputValue.trim()) {
      e.preventDefault();
      addChip(inputValue);
    } else if (e.key === 'Backspace' && !inputValue && value.length > 0) {
      onChange(value.slice(0, -1));
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    } else if (e.key === 'ArrowDown' && showSuggestions && filteredSuggestions.length > 0) {
      e.preventDefault();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled) return;
    const newValue = e.target.value;
    if (newValue.endsWith(',')) {
      const chipValue = newValue.slice(0, -1).trim();
      if (chipValue && !value.includes(chipValue)) {
        onChange([...value, chipValue]);
      }
      setInputValue('');
      setShowSuggestions(false);
    } else {
      setInputValue(newValue);
      setShowSuggestions(newValue.length >= 1);
    }
  };

  const removeChip = (index: number) => {
    if (disabled) return;
    onChange(value.filter((_, i) => i !== index));
  };

  return (
    <div className="w-full relative">
      <label htmlFor={inputId} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 transition-colors duration-200">
        {label}
      </label>
      <div className={`relative w-full min-h-10 px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 rounded-md focus-within:ring-2 focus-within:ring-blue-500 dark:focus-within:ring-blue-400 focus-within:border-transparent transition-colors duration-200 pr-2 ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}>
        <div className="flex flex-wrap gap-2 items-center w-full">
          {value.map((item, index) => (
            <span
              key={index}
              className="inline-flex items-center gap-1 px-2 py-0.5 text-sm bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200 rounded-md flex-shrink-0 min-w-0 max-w-full transition-colors duration-200"
            >
              <span className="truncate max-w-[16rem] sm:max-w-[20rem] md:max-w-[24rem]">{item}</span>
              {!disabled && (
                <button
                  type="button"
                  onClick={() => removeChip(index)}
                  className="hover:bg-blue-200 dark:hover:bg-blue-800 rounded-sm p-0.5 transition-colors duration-200"
                  aria-label={`Remove ${item}`}
                >
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
              )}
            </span>
          ))}
          <input
            id={inputId}
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={() => inputValue.length >= 1 && setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            placeholder={value.length === 0 ? placeholder : ''}
            className="flex-1 min-w-[2ch] outline-none text-sm bg-transparent text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
            disabled={disabled}
          />
        </div>
      </div>
      {showSuggestions && suggestions && (
        <div className="absolute z-50 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-48 overflow-y-auto">
          {filteredSuggestions.map((s) => (
            <button
              key={s}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); addChip(s); }}
              className="w-full text-left px-3 py-1.5 text-sm text-gray-900 dark:text-gray-100 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
            >
              {s}
            </button>
          ))}
          {isUnmanaged && onAddSuggestion && (
            <button
              type="button"
              onMouseDown={(e) => { e.preventDefault(); onAddSuggestion(inputValue); addChip(inputValue); }}
              className="w-full text-left px-3 py-1.5 text-sm text-yellow-700 dark:text-yellow-400 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 border-t border-gray-200 dark:border-gray-600 transition-colors"
            >
              "{inputValue}" not in managed list — add it?
            </button>
          )}
          {filteredSuggestions.length === 0 && !isUnmanaged && (
            <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">No suggestions</div>
          )}
        </div>
      )}
    </div>
  );
};

export default ChipInput;
