import React, { useState, useRef, useEffect } from 'react';
import { Calendar, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { formatDateToDisplay, displayDateToIso } from '../utils/defaultData';

interface TailwindDatePickerProps {
  label: string;
  required?: boolean;
  value: string; // e.g. "18 Nov 2026"
  placeholder?: string;
  onChange: (value: string) => void;
  allowClear?: boolean;
  align?: 'left' | 'right';
}

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const WEEKDAY_NAMES = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

function parseDateString(dateStr: string): Date | null {
  if (!dateStr) return null;
  const iso = displayDateToIso(dateStr);
  if (!iso) return null;
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

function isSameDay(d1: Date, d2: Date): boolean {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

export const TailwindDatePicker: React.FC<TailwindDatePickerProps> = ({
  label,
  required = false,
  value,
  placeholder = 'Select date',
  onChange,
  allowClear = false,
  align = 'left',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedDate = parseDateString(value);
  const today = new Date();

  // Navigation view state
  const [viewYear, setViewYear] = useState<number>(
    selectedDate ? selectedDate.getFullYear() : today.getFullYear()
  );
  const [viewMonth, setViewMonth] = useState<number>(
    selectedDate ? selectedDate.getMonth() : today.getMonth()
  );

  // When value changes externally or when opened, sync view
  useEffect(() => {
    if (selectedDate) {
      setViewYear(selectedDate.getFullYear());
      setViewMonth(selectedDate.getMonth());
    }
  }, [value, isOpen]);

  // Click outside and escape key handling
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((prev) => prev - 1);
    } else {
      setViewMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((prev) => prev + 1);
    } else {
      setViewMonth((prev) => prev + 1);
    }
  };

  const handleSelectDay = (date: Date) => {
    onChange(formatDateToDisplay(date));
    setIsOpen(false);
  };

  const handleSelectToday = () => {
    onChange(formatDateToDisplay(today));
    setViewYear(today.getFullYear());
    setViewMonth(today.getMonth());
    setIsOpen(false);
  };

  const handleClear = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    onChange('');
    setIsOpen(false);
  };

  // Generate calendar days for viewYear and viewMonth
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay(); // 0 is Sun
  const daysInCurrentMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

  interface CalendarSlot {
    date: Date;
    dayNumber: number;
    isCurrentMonth: boolean;
  }

  const days: CalendarSlot[] = [];

  // Previous month trailing days
  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    const d = daysInPrevMonth - i;
    days.push({
      date: new Date(viewYear, viewMonth - 1, d),
      dayNumber: d,
      isCurrentMonth: false,
    });
  }

  // Current month days
  for (let d = 1; d <= daysInCurrentMonth; d++) {
    days.push({
      date: new Date(viewYear, viewMonth, d),
      dayNumber: d,
      isCurrentMonth: true,
    });
  }

  // Next month leading days to complete full weeks (either 35 or 42 slots)
  const totalSlots = days.length <= 35 ? 35 : 42;
  const remaining = totalSlots - days.length;
  for (let d = 1; d <= remaining; d++) {
    days.push({
      date: new Date(viewYear, viewMonth + 1, d),
      dayNumber: d,
      isCurrentMonth: false,
    });
  }

  // Generate year options around current year (e.g. 2018 to 2035)
  const startYear = Math.min(viewYear - 5, today.getFullYear() - 5);
  const endYear = Math.max(viewYear + 10, today.getFullYear() + 10);
  const yearOptions: number[] = [];
  for (let y = startYear; y <= endYear; y++) {
    yearOptions.push(y);
  }

  return (
    <div ref={containerRef} className="relative">
      <label className="block text-xs font-semibold text-slate-700 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>

      {/* Styled Non-Editable Trigger Input */}
      <div
        onClick={() => setIsOpen((prev) => !prev)}
        className={`w-full flex items-center justify-between text-xs rounded-lg border px-3 py-2 cursor-pointer transition-all select-none ${
          isOpen
            ? 'border-emerald-500 ring-2 ring-emerald-100 bg-white shadow-xs'
            : 'border-slate-200 bg-slate-50/70 hover:bg-slate-50 hover:border-slate-300'
        }`}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
            e.preventDefault();
            setIsOpen((prev) => !prev);
          }
        }}
      >
        <div className="flex items-center space-x-2 truncate min-w-0">
          <Calendar
            className={`w-4 h-4 shrink-0 transition-colors ${
              isOpen ? 'text-emerald-600' : 'text-slate-400'
            }`}
          />
          <span
            className={`font-medium truncate ${
              value ? 'text-slate-900' : 'text-slate-400'
            }`}
          >
            {value || placeholder}
          </span>
        </div>

        <div className="flex items-center space-x-1 shrink-0 ml-1">
          {allowClear && value && (
            <button
              type="button"
              onClick={handleClear}
              title="Clear date"
              className="p-1 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-200/80 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <span className="text-[10px] text-slate-400 font-medium px-1.5 py-0.5 rounded bg-slate-200/60">
            {isOpen ? 'Close' : 'Pick'}
          </span>
        </div>
      </div>

      {/* Custom Tailwind Datepicker Dropdown */}
      {isOpen && (
        <div
          className={`absolute top-full mt-1.5 z-50 bg-white rounded-xl shadow-xl border border-slate-200 p-3.5 w-72 sm:w-76 max-sm:left-1/2 max-sm:-translate-x-1/2 max-sm:w-[calc(100vw-32px)] max-sm:max-w-xs select-none transition-all ${
            align === 'right' ? 'sm:right-0' : 'sm:left-0'
          }`}
        >
          {/* Header: Month / Year Controls */}
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors"
              title="Previous month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="flex items-center space-x-1.5">
              {/* Month Selector */}
              <select
                value={viewMonth}
                onChange={(e) => setViewMonth(Number(e.target.value))}
                className="text-xs font-bold text-slate-800 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-md px-2 py-1 cursor-pointer focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                {MONTH_NAMES.map((m, idx) => (
                  <option key={m} value={idx}>
                    {m}
                  </option>
                ))}
              </select>

              {/* Year Selector */}
              <select
                value={viewYear}
                onChange={(e) => setViewYear(Number(e.target.value))}
                className="text-xs font-bold text-slate-800 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-md px-2 py-1 cursor-pointer focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                {yearOptions.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors"
              title="Next month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Weekday Names Header */}
          <div className="grid grid-cols-7 gap-1 text-center mb-1">
            {WEEKDAY_NAMES.map((d) => (
              <span
                key={d}
                className="text-[11px] font-semibold text-slate-400 py-1"
              >
                {d}
              </span>
            ))}
          </div>

          {/* Calendar Days Grid */}
          <div className="grid grid-cols-7 gap-1">
            {days.map((slot, index) => {
              const isSelected = selectedDate && isSameDay(slot.date, selectedDate);
              const isCurrentDay = isSameDay(slot.date, today);

              let buttonClass =
                'h-8 w-8 text-xs rounded-lg flex items-center justify-center font-medium transition-colors mx-auto cursor-pointer ';

              if (isSelected) {
                buttonClass +=
                  'bg-emerald-600 text-white font-bold shadow-xs hover:bg-emerald-700';
              } else if (isCurrentDay) {
                buttonClass +=
                  'border border-emerald-500 text-emerald-700 bg-emerald-50 font-semibold hover:bg-emerald-100';
              } else if (!slot.isCurrentMonth) {
                buttonClass +=
                  'text-slate-300 hover:text-slate-600 hover:bg-slate-50';
              } else {
                buttonClass +=
                  'text-slate-700 hover:bg-slate-100 hover:text-slate-900';
              }

              return (
                <button
                  key={index}
                  type="button"
                  onClick={() => handleSelectDay(slot.date)}
                  className={buttonClass}
                >
                  {slot.dayNumber}
                </button>
              );
            })}
          </div>

          {/* Footer with Today & Clear Buttons */}
          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between">
            <button
              type="button"
              onClick={handleSelectToday}
              className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 px-2.5 py-1 rounded-md transition-colors"
            >
              Today
            </button>

            {allowClear && (
              <button
                type="button"
                onClick={() => handleClear()}
                className="text-xs font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-100 px-2.5 py-1 rounded-md transition-colors"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
