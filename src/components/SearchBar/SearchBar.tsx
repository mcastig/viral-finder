"use client";

import { useState, type FormEvent } from "react";
import "./SearchBar.css";

interface SearchBarProps {
  onSearch: (keyword: string) => void;
  loading?: boolean;
  initialValue?: string;
}

export function SearchBar({
  onSearch,
  loading = false,
  initialValue = "",
}: SearchBarProps) {
  const [value, setValue] = useState(initialValue);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = value.trim();
    if (!trimmed || loading) return;
    onSearch(trimmed);
  }

  return (
    <form className="search-bar" onSubmit={handleSubmit} role="search">
      <span className="search-bar__icon" aria-hidden="true">
        🔍
      </span>
      <input
        className="search-bar__input"
        type="text"
        name="keyword"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Search a topic, e.g. “home espresso”"
        aria-label="Search term"
        autoComplete="off"
        disabled={loading}
      />
      <button
        className="search-bar__button"
        type="submit"
        disabled={loading || value.trim().length === 0}
      >
        {loading ? "Scanning…" : "Find outliers"}
      </button>
    </form>
  );
}
