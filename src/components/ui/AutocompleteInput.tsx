"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import { Search } from "lucide-react";

interface AutocompleteInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  suggestions: string[];
  value: string;
  onChange: (val: string) => void;
  containerClassName?: string;
}

export function AutocompleteInput({
  suggestions,
  value,
  onChange,
  containerClassName = "",
  className = "",
  ...props
}: AutocompleteInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filter and sort suggestions intelligently
  const filteredSuggestions = useMemo(() => {
    if (!value) return suggestions.slice(0, 10); // Show top 10 if empty
    
    const searchLower = value.toLowerCase();
    
    // Score based matching:
    // 1. Exact match (case insensitive) -> highest priority (though usually we don't need to show it if exact, but we do for selection)
    // 2. Starts with -> high priority
    // 3. Contains all words -> medium priority
    // 4. Contains some words -> low priority
    
    const scored = suggestions.map(s => {
      const sLower = s.toLowerCase();
      let score = 0;
      
      if (sLower === searchLower) score = 100;
      else if (sLower.startsWith(searchLower)) score = 50;
      else if (sLower.includes(searchLower)) score = 25;
      else {
        // Check if all words match
        const searchWords = searchLower.split(' ').filter(Boolean);
        const allWordsMatch = searchWords.every(w => sLower.includes(w));
        if (allWordsMatch) score = 10;
      }
      
      return { value: s, score };
    }).filter(s => s.score > 0);
    
    // Sort by score descending, then alphabetically
    scored.sort((a, b) => b.score - a.score || a.value.localeCompare(b.value));
    
    return scored.map(s => s.value).slice(0, 8); // Max 8 suggestions
  }, [suggestions, value]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        setIsOpen(true);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex(prev => (prev < filteredSuggestions.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex(prev => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === 'Enter') {
      if (highlightedIndex >= 0 && highlightedIndex < filteredSuggestions.length) {
        e.preventDefault();
        onChange(filteredSuggestions[highlightedIndex]);
        setIsOpen(false);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <div ref={wrapperRef} className={`relative w-full ${containerClassName}`}>
      <input
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setIsOpen(true);
          setHighlightedIndex(-1);
        }}
        onFocus={() => setIsOpen(true)}
        onKeyDown={handleKeyDown}
        className={className}
        autoComplete="off"
        {...props}
      />
      
      {isOpen && filteredSuggestions.length > 0 && (
        <div className="absolute z-[100] w-full mt-1 bg-white/95 backdrop-blur-md border border-gray-200/60 shadow-2xl rounded-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 origin-top">
          <ul className="max-h-60 overflow-y-auto py-1 scrollbar-thin scrollbar-thumb-gray-200">
            {filteredSuggestions.map((suggestion, index) => {
              const isHighlighted = index === highlightedIndex;
              return (
                <li
                  key={suggestion}
                  onClick={() => {
                    onChange(suggestion);
                    setIsOpen(false);
                  }}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  className={`px-4 py-2.5 text-sm cursor-pointer transition-colors flex items-center gap-2 ${
                    isHighlighted ? "bg-red-50 text-red-900 font-medium" : "text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  <Search className={`w-3.5 h-3.5 ${isHighlighted ? "text-red-400" : "text-gray-400"}`} />
                  <span className="truncate">{suggestion}</span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
