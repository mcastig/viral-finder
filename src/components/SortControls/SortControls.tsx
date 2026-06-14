"use client";

import "./SortControls.css";

export type SortKey = "factor" | "date";

interface SortControlsProps {
  value: SortKey;
  onChange: (value: SortKey) => void;
}

const OPTIONS: { key: SortKey; label: string }[] = [
  { key: "factor", label: "Outlier factor" },
  { key: "date", label: "Newest" },
];

export function SortControls({ value, onChange }: SortControlsProps) {
  return (
    <div className="sort-controls" role="group" aria-label="Sort videos">
      <span className="sort-controls__label">Sort by</span>
      {OPTIONS.map((option) => (
        <button
          key={option.key}
          type="button"
          className="sort-controls__button"
          aria-pressed={value === option.key}
          onClick={() => onChange(option.key)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
