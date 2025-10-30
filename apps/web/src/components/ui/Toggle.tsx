import React, { useId } from 'react';

export interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
  id?: string;
  'aria-label'?: string;
}

export function Toggle({
  checked,
  onChange,
  label,
  disabled = false,
  id,
  'aria-label': ariaLabel,
}: ToggleProps) {
  const autoId = useId();
  const toggleId = id || `toggle-${autoId}`;

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        role="switch"
        id={toggleId}
        aria-checked={checked}
        aria-label={ariaLabel || label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`
          relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full
          transition-colors duration-200 ease-in-out
          focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500
          disabled:opacity-50 disabled:cursor-not-allowed
          ${checked ? 'bg-blue-500' : 'bg-gray-300'}
        `}
      >
        <span
          aria-hidden="true"
          className={`
            pointer-events-none inline-block h-6 w-6 transform rounded-full
            bg-white shadow-lg ring-0 transition duration-200 ease-in-out
            ${checked ? 'translate-x-5' : 'translate-x-0.5'}
            mt-0.5
          `}
        />
      </button>
      {label && (
        <label
          htmlFor={toggleId}
          className="text-sm font-medium text-gray-900 cursor-pointer"
          onClick={() => !disabled && onChange(!checked)}
        >
          {label}
        </label>
      )}
      <span
        className={`text-sm font-semibold ${
          checked ? 'text-blue-600' : 'text-gray-500'
        }`}
      >
        {checked ? 'ON' : 'OFF'}
      </span>
    </div>
  );
}
