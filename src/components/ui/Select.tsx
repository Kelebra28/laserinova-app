"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";

interface Option {
  value: string | number;
  label: string;
}

interface SelectProps {
  options: Option[];
  value: string | number;
  onChange: (value: any) => void;
  placeholder?: string;
  label?: string;
  disabled?: boolean;
  className?: string;
  menuPlacement?: "top" | "bottom";
}

export default function Select({ 
  options, 
  value, 
  onChange, 
  placeholder = "Seleccionar...", 
  label,
  disabled,
  className = "",
  menuPlacement = "bottom"
}: SelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedOption = options.find(opt => opt.value === value);

  return (
    <div ref={wrapperRef} className={`relative w-full ${className}`}>
      {label && (
        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">
          {label}
        </label>
      )}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center justify-between w-full text-sm font-medium rounded-xl py-3 px-4 border transition-all duration-200 shadow-sm ${
          disabled 
            ? "bg-gray-50 text-gray-400 border-gray-100 cursor-not-allowed" 
            : isOpen
              ? "bg-white border-red-600 ring-4 ring-red-600/10 text-gray-900"
              : "bg-gray-50 border-gray-200 text-gray-700 hover:bg-white hover:border-gray-300"
        }`}
      >
        <span className="truncate">
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown className={`h-4 w-4 text-gray-400 shrink-0 ml-2 transition-transform duration-300 ${isOpen ? 'rotate-180 text-red-600' : ''}`} />
      </button>

      {isOpen && !disabled && (
        <div className={`absolute z-50 w-full bg-white/95 backdrop-blur-sm shadow-2xl rounded-2xl border border-gray-100 overflow-hidden animate-in fade-in zoom-in duration-200 ${
          menuPlacement === "top" ? "bottom-full mb-2 origin-bottom" : "mt-2 origin-top"
        }`}>
          <ul className="max-h-60 overflow-y-auto py-2 text-sm text-gray-700">
            {options.map((opt) => (
              <li
                key={opt.value}
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                }}
                className={`flex items-center justify-between px-4 py-2.5 cursor-pointer transition-colors group ${
                  value === opt.value ? "bg-red-50 text-red-700 font-bold" : "hover:bg-gray-50 text-gray-600 hover:text-gray-900"
                }`}
              >
                <span className="truncate text-xs uppercase tracking-tight">{opt.label}</span>
                {value === opt.value && <Check className="h-4 w-4 text-red-600 shrink-0 ml-4" />}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
