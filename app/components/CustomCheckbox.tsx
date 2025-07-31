"use client";
import React, { useState, useEffect } from "react";


interface CustomToggleProps {
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  label?: string;
  className?: string;
}

export default function CustomToggle({
  checked = false,
  onChange,
  label,
  className = "",
}: CustomToggleProps) {
    const [isChecked, setIsChecked] = useState(checked);

  useEffect(() => {
    setIsChecked(checked);
  }, [checked]);

  const handleClick = () => {
    const newValue = !isChecked;
    setIsChecked(newValue);
    onChange?.(newValue);
  };

  return (
    <div
      className={`flex items-center gap-2 cursor-pointer ${className}`}
      
      onClick={handleClick}
    >
      <div className="relative">
        <div
          className={`w-6 h-4 rounded-full transition-all duration-200 ${
            isChecked ? "bg-[#5288FF]" : "bg-gray-300"
          }`}
        >
          <div
            className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all duration-200 ${
              isChecked ? "translate-x-2" : "translate-x-0"
            }`}
          ></div>
        </div>
      </div>
      {label && (
        <span className="text-sm text-gray-700 select-none">{label}</span>
      )}
    </div>
  );
}
