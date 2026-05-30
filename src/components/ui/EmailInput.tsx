"use client";

import React, { useState, KeyboardEvent, useEffect } from 'react';
import { X } from 'lucide-react';

interface EmailInputProps {
  label: string;
  placeholder: string;
  emails: string[];
  onChange: (emails: string[]) => void;
  required?: boolean;
}

export function EmailInput({ label, placeholder, emails, onChange, required = false }: EmailInputProps) {
  const [inputValue, setInputValue] = useState('');

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ' ' || e.key === ',') {
      e.preventDefault();
      addEmail(inputValue);
    } else if (e.key === 'Backspace' && !inputValue && emails.length > 0) {
      e.preventDefault();
      removeEmail(emails.length - 1);
    }
  };

  const addEmail = (email: string) => {
    const trimmed = email.trim().replace(/,/g, '');
    if (trimmed && isValidEmail(trimmed) && !emails.includes(trimmed)) {
      onChange([...emails, trimmed]);
      setInputValue('');
    }
  };

  const handleBlur = () => {
    if (inputValue) {
      addEmail(inputValue);
    }
  };

  const removeEmail = (index: number) => {
    const newEmails = [...emails];
    newEmails.splice(index, 1);
    onChange(newEmails);
  };

  const isValidEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  return (
    <div className="flex flex-col space-y-1.5 w-full">
      <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
        {label}
      </label>
      <div className="flex flex-wrap items-center gap-1.5 min-h-[38px] p-1.5 bg-slate-50 border border-slate-200 hover:border-slate-300 focus-within:border-red-500 focus-within:bg-white rounded-xl transition-all cursor-text"
           onClick={(e) => {
             const input = e.currentTarget.querySelector('input');
             if (input) input.focus();
           }}>
        {emails.map((email, i) => (
          <div key={i} className="flex items-center gap-1 px-2 py-0.5 bg-slate-200 text-slate-700 text-xs font-medium rounded-md animate-in zoom-in-95 duration-100">
            <span>{email}</span>
            <button 
              type="button" 
              onClick={(e) => {
                e.stopPropagation();
                removeEmail(i);
              }}
              className="text-slate-400 hover:text-red-500 hover:bg-slate-300 rounded-full p-0.5 transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          className="flex-1 bg-transparent min-w-[120px] outline-none text-xs text-slate-800 font-semibold placeholder-slate-400"
          placeholder={emails.length === 0 ? placeholder : ''}
          required={required && emails.length === 0}
        />
      </div>
    </div>
  );
}
