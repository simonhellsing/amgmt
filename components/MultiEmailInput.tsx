import React, { useState, useRef, useEffect } from 'react';
import { X } from 'lucide-react';

interface MultiEmailInputProps {
  emails: string[];
  onChange: (emails: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export default function MultiEmailInput({
  emails,
  onChange,
  placeholder = "Enter email addresses...",
  disabled = false,
  className = ''
}: MultiEmailInputProps) {
  const [inputValue, setInputValue] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const addEmail = (email: string) => {
    const trimmedEmail = email.trim().toLowerCase();
    if (trimmedEmail && validateEmail(trimmedEmail) && !emails.includes(trimmedEmail)) {
      onChange([...emails, trimmedEmail]);
      setInputValue('');
    }
  };

  const removeEmail = (emailToRemove: string) => {
    onChange(emails.filter(email => email !== emailToRemove));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      if (inputValue.trim()) {
        addEmail(inputValue);
      }
    } else if (e.key === 'Backspace' && inputValue === '' && emails.length > 0) {
      removeEmail(emails[emails.length - 1]);
    }
  };

  const handleBlur = () => {
    setIsFocused(false);
    if (inputValue.trim()) {
      addEmail(inputValue);
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text');
    const emails = pastedText.split(/[,\s]+/).filter(email => email.trim());
    emails.forEach(email => addEmail(email));
  };

  return (
    <div 
      className={`min-h-[48px] bg-gray-800 border border-gray-700 rounded-xl p-3 flex flex-wrap gap-2 transition-colors ${
        isFocused ? 'border-blue-500 ring-2 ring-blue-500' : ''
      } ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
      onClick={() => !disabled && inputRef.current?.focus()}
    >
      {emails.map((email, index) => (
        <span
          key={index}
          className="inline-flex items-center gap-1 bg-gray-700 text-white px-3 py-1.5 rounded-lg text-sm"
        >
          {email}
          {!disabled && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                removeEmail(email);
              }}
              className="hover:text-red-400 transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </span>
      ))}
      
      <input
        ref={inputRef}
        type="email"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => setIsFocused(true)}
        onBlur={handleBlur}
        onPaste={handlePaste}
        placeholder={emails.length === 0 ? placeholder : ''}
        disabled={disabled}
        className="flex-1 bg-transparent text-white placeholder-gray-400 outline-none min-w-[120px] text-sm"
      />
    </div>
  );
}
