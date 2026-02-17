import React from "react";

/**
 * Switch component
 * Props:
 *  - checked: boolean
 *  - onChange: (checked: boolean) => void
 *  - label: string
 *  - id: string (optional)
 */
const Switch = ({ checked, onChange, label, id = "switch" }) => {
  return (
    <label
      htmlFor={id}
      className="flex items-center gap-2 cursor-pointer select-none"
    >
      <div className="relative">
        <input
          id={id}
          type="checkbox"
          className="sr-only"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
        />
        {/* Track */}
        <div
          className={`w-10 h-5 rounded-full transition-colors duration-200 ${
            checked ? "bg-blue-600" : "bg-gray-600"
          }`}
        />
        {/* Thumb */}
        <div
          className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${
            checked ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </div>
      {label && (
        <span className="text-sm text-gray-300 whitespace-nowrap">{label}</span>
      )}
    </label>
  );
};

export default Switch;