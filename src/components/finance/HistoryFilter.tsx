"use client";

import { useRouter } from "next/navigation";
import { useTransition, useState, useRef, useEffect } from "react";
import { ChevronLeft, ChevronRight, Calendar, ChevronDown, Check } from "lucide-react";

const MONTHS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

// Generar los últimos 5 años
const YEARS = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

// Reusable Custom Glassmorphic Select Component
function CustomSelect({
  value,
  onChange,
  options,
  disabled,
  isDark
}: {
  value: number | string;
  onChange: (val: any) => void;
  options: { label: string; value: any }[];
  disabled?: boolean;
  isDark?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const selectedOption = options.find(o => String(o.value) === String(value));
  const isYear = options.length <= 5;

  return (
    <div ref={containerRef} className="relative select-none">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center justify-between gap-2.5 text-xs md:text-sm font-black uppercase tracking-wider border rounded-xl px-3.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-red-500/30 cursor-pointer transition-all ${
          isDark
            ? "bg-white/10 border-white/20 text-white hover:bg-white/15 disabled:opacity-50 shadow-inner"
            : "bg-white border-gray-200 text-gray-900 hover:bg-gray-50 disabled:opacity-50 shadow-sm"
        }`}
      >
        <span className={`${isYear ? "min-w-[2.8rem]" : "min-w-[5.8rem]"} text-left block truncate`}>
          {selectedOption?.label}
        </span>
        <ChevronDown className={`w-3.5 h-3.5 opacity-60 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <div 
          className={`absolute z-[999] left-0 mt-2 w-48 rounded-2xl border shadow-2xl backdrop-blur-xl transition-all animate-in fade-in slide-in-from-top-2 duration-200 ${
            isDark
              ? "bg-gray-950/95 border-white/10 text-white shadow-black/80"
              : "bg-white border-gray-100 text-gray-900 shadow-gray-200/50"
          }`}
        >
          <div className="p-1.5 max-h-60 overflow-y-auto scrollbar-thin">
            {options.map(opt => {
              const isSelected = String(opt.value) === String(value);
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    onChange(opt.value);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left text-xs font-bold uppercase tracking-wider transition-all ${
                    isSelected
                      ? (isDark ? "bg-red-500/20 text-red-400 font-extrabold" : "bg-red-50 text-red-600 font-extrabold")
                      : (isDark ? "hover:bg-white/5 text-white/75 hover:text-white" : "hover:bg-gray-50 text-gray-600 hover:text-gray-900")
                  }`}
                >
                  <span>{opt.label}</span>
                  {isSelected && <Check className="w-3.5 h-3.5" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export function HistoryFilter({ 
  currentMonth, 
  currentYear, 
  basePath = "/dashboard/finance/history",
  variant = "light"
}: { 
  currentMonth: number;
  currentYear: number;
  basePath?: string;
  variant?: "light" | "dark";
}) {
  const isDark = variant === "dark";
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  
  const handlePrevMonth = () => {
    let m = currentMonth - 1;
    let y = currentYear;
    if (m < 0) {
      m = 11;
      y--;
    }
    startTransition(() => {
      router.push(`${basePath}?month=${m}&year=${y}`);
    });
  };

  const handleNextMonth = () => {
    let m = currentMonth + 1;
    let y = currentYear;
    if (m > 11) {
      m = 0;
      y++;
    }
    startTransition(() => {
      router.push(`${basePath}?month=${m}&year=${y}`);
    });
  };

  const handleCurrentMonth = () => {
    const now = new Date();
    startTransition(() => {
      router.push(`${basePath}?month=${now.getMonth()}&year=${now.getFullYear()}`);
    });
  };

  const handleMonthChange = (val: number) => {
    startTransition(() => {
      router.push(`${basePath}?month=${val}&year=${currentYear}`);
    });
  };

  const handleYearChange = (val: number) => {
    startTransition(() => {
      router.push(`${basePath}?month=${currentMonth}&year=${val}`);
    });
  };

  const monthOptions = MONTHS.map((m, i) => ({ label: m, value: i }));
  const yearOptions = YEARS.map(y => ({ label: String(y), value: y }));

  return (
    <>
      <div className={`flex items-center gap-4 px-5 py-3 rounded-[2rem] border shadow-xl transition-all ${
        isDark 
          ? "bg-white/5 border-white/10 shadow-black/20 backdrop-blur-md"
          : "bg-white border-gray-100 shadow-gray-200/20"
      }`}>
        <div className="flex items-center gap-2">
          <div className={`p-2 rounded-xl ${isDark ? "bg-red-500/10 text-red-400" : "bg-red-50 text-red-600"}`}>
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <p className={`text-[10px] font-black uppercase tracking-widest leading-none mb-1.5 ${isDark ? "text-white/50" : "text-gray-400"}`}>
              Período
            </p>
            <div className="flex items-center gap-2">
              <button 
                onClick={handlePrevMonth} 
                disabled={isPending}
                className={`p-1.5 rounded-lg transition-all ${
                  isDark 
                    ? "text-white/70 hover:text-white hover:bg-white/10 disabled:opacity-30" 
                    : "text-gray-400 hover:text-gray-900 hover:bg-gray-100 disabled:opacity-30"
                }`}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              
              <div className="flex gap-2">
                <CustomSelect
                  value={currentMonth}
                  onChange={handleMonthChange}
                  options={monthOptions}
                  disabled={isPending}
                  isDark={isDark}
                />

                <CustomSelect
                  value={currentYear}
                  onChange={handleYearChange}
                  options={yearOptions}
                  disabled={isPending}
                  isDark={isDark}
                />
              </div>

              <button 
                onClick={handleNextMonth} 
                disabled={isPending}
                className={`p-1.5 rounded-lg transition-all ${
                  isDark 
                    ? "text-white/70 hover:text-white hover:bg-white/10 disabled:opacity-30" 
                    : "text-gray-400 hover:text-gray-900 hover:bg-gray-100 disabled:opacity-30"
                }`}
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
        <div className={`w-px h-8 ${isDark ? "bg-white/20" : "bg-gray-100"}`} />
        <button 
          onClick={handleCurrentMonth}
          disabled={isPending}
          className={`text-xs font-bold transition-all uppercase tracking-widest px-3 py-1.5 rounded-xl ${
            isDark 
              ? "text-white/70 hover:text-white hover:bg-white/10 disabled:opacity-50" 
              : "text-gray-500 hover:text-red-600 hover:bg-gray-50 disabled:opacity-50"
          }`}
        >
          Mes Actual
        </button>
      </div>

      {/* Global Transition Loading Overlay */}
      {isPending && (
        <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-black/50 backdrop-blur-md transition-all duration-300 animate-in fade-in">
          <div className="bg-gray-950/95 border border-white/10 rounded-[2.5rem] p-8 max-w-sm w-full flex flex-col items-center space-y-6 shadow-2xl shadow-black/80 animate-in zoom-in-95 duration-200">
            <div className="relative w-16 h-16">
              {/* Outer ring */}
              <div className="absolute inset-0 border-4 border-red-500/10 rounded-full"></div>
              {/* Spinning ring */}
              <div className="absolute inset-0 border-4 border-t-red-500 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
              {/* Center pulse */}
              <div className="absolute inset-3 bg-red-500/10 rounded-full animate-pulse flex items-center justify-center">
                <div className="w-2.5 h-2.5 bg-red-500 rounded-full"></div>
              </div>
            </div>
            <div className="flex flex-col items-center space-y-1 text-center">
              <h3 className="text-xs font-black text-white uppercase tracking-[0.2em] animate-pulse">
                Actualizando Periodo
              </h3>
              <p className="text-[9px] text-white/40 uppercase tracking-[0.2em] font-bold">
                Cargando datos financieros
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
