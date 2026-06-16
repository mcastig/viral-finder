import Link from "next/link";
import { ThemeToggle } from "@/components/ThemeToggle/ThemeToggle";
import "./Header.css";

export function Header() {
  return (
    <header className="header">
      <div className="header__inner">
        <Link className="header__brand" href="/">
          <span className="header__logo" aria-hidden="true">
            📈
          </span>
          <span className="header__title">
            Viral<span className="header__title-accent">Finder</span>
          </span>
        </Link>

        <div className="header__actions">
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
