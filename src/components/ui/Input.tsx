import React, { InputHTMLAttributes, forwardRef } from "react";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  helperText?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(({
  className = "",
  label,
  error,
  leftIcon,
  rightIcon,
  helperText,
  id,
  ...props
}, ref) => {
  const generatedId = id || `input-${Math.random().toString(36).substring(2, 9)}`;
  const hasError = !!error;

  return (
    <div className="w-full flex flex-col space-y-1.5">
      {label && (
        <label htmlFor={generatedId} className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          {label}
        </label>
      )}
      <div className="relative group">
        {leftIcon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-indigo-500 transition-colors">
            {leftIcon}
          </div>
        )}
        <input
          id={generatedId}
          ref={ref}
          className={`
            w-full h-10 px-3 rounded-xl border bg-white/50 dark:bg-black/20 
            text-sm transition-all duration-200 outline-none
            backdrop-blur-sm shadow-sm
            ${hasError 
              ? "border-red-500/50 focus:border-red-500 focus:ring-4 focus:ring-red-500/20" 
              : "border-zinc-200 dark:border-zinc-800 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 hover:border-zinc-300 dark:hover:border-zinc-700"
            }
            ${leftIcon ? "pl-10" : ""}
            ${rightIcon ? "pr-10" : ""}
            ${className}
          `}
          {...props}
        />
        {rightIcon && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400">
            {rightIcon}
          </div>
        )}
      </div>
      {(error || helperText) && (
        <p className={`text-xs ${hasError ? "text-red-500 font-medium" : "text-zinc-500 dark:text-zinc-400"}`}>
          {error || helperText}
        </p>
      )}
    </div>
  );
});

Input.displayName = "Input";
