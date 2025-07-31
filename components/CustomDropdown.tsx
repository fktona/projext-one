"use client";
import React, { useState, useRef, useEffect } from "react";
import DownArrowIcon from "../app/components/DownArrowIcon";

export interface DropdownOption {
  value: string;
  label: string;
  icon?: string;
}

interface CustomDropdownProps {
  options: DropdownOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  width?: string;
}

export default function CustomDropdown({
  options,
  value,
  onChange,
  placeholder = "Select an option",
  disabled = false,
  className = "",
  width = "w-full",
}: CustomDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Close dropdown on escape key
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  const selectedOption = options.find((option) => option.value === value);

  const handleSelect = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
  };

  return (
    <div className={`relative ${width} ${className}`} ref={dropdownRef}>
      {/* Dropdown Button */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`
          w-full flex items-center justify-between
          bg-white/10 border border-white/20 rounded-lg px-3 py-2
          text-white placeholder:text-white/50
          focus:outline-none focus:border-[#BFBBFF] 
          transition-all duration-200
          hover:bg-white/15 hover:border-white/30
          disabled:opacity-50 disabled:cursor-not-allowed
          ${isOpen ? "border-[#BFBBFF] bg-white/15" : ""}
        `}
      >
        <span className={`${selectedOption ? "text-white" : "text-white/50"}`}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <div
          className={`flex items-center transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        >
          <DownArrowIcon />
        </div>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 z-50">
          <div
            className="
            bg-black/90 backdrop-blur-sm border border-white/20 rounded-lg
            shadow-2xl shadow-black/50 overflow-hidden
            animate-in fade-in-0 zoom-in-95 duration-200
          "
          >
            <div className="max-h-60 overflow-y-auto custom-scrollbar">
              {options.map((option, index) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleSelect(option.value)}
                  className={`
                    w-full flex items-center px-3 py-2 text-left
                    transition-all duration-150
                    hover:bg-gradient-to-r hover:from-[#BFBBFF]/20 hover:to-[#A8A4FF]/20
                    active:bg-gradient-to-r active:from-[#BFBBFF]/30 active:to-[#A8A4FF]/30
                    ${
                      option.value === value
                        ? "bg-gradient-to-r from-[#BFBBFF]/30 to-[#A8A4FF]/30 text-[#BFBBFF]"
                        : "text-white/90 hover:text-white"
                    }
                    ${index === 0 ? "rounded-t-lg" : ""}
                    ${index === options.length - 1 ? "rounded-b-lg" : ""}
                  `}
                >
                  {option.icon && (
                    <span className="mr-2 text-lg">{option.icon}</span>
                  )}
                  <span className="font-medium">{option.label}</span>
                  {option.value === value && (
                    <div className="ml-auto w-2 h-2 bg-[#BFBBFF] rounded-full"></div>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
