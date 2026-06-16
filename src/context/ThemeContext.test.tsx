import { render, screen, fireEvent } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { ThemeProvider, useTheme } from "./ThemeContext";
import { ThemeToggle } from "@/components/ThemeToggle/ThemeToggle";

afterEach(() => {
  document.documentElement.removeAttribute("data-theme");
  localStorage.clear();
  jest.restoreAllMocks();
});

describe("ThemeContext", () => {
  it("throws when useTheme is used outside a provider", () => {
    const Boom = () => {
      useTheme();
      return null;
    };
    // The thrown error is expected; silence React's console noise.
    jest.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<Boom />)).toThrow(
      /useTheme must be used within a ThemeProvider/,
    );
  });

  it("falls back to the light snapshot during server rendering", () => {
    const html = renderToStaticMarkup(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>,
    );
    expect(html).toContain("Light");
  });

  it("toggles between light and dark and persists the choice", () => {
    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>,
    );
    const button = screen.getByRole("button");

    expect(button).toHaveTextContent("Light");

    fireEvent.click(button);
    expect(button).toHaveTextContent("Dark");
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
    expect(localStorage.getItem("theme")).toBe("dark");

    fireEvent.click(button);
    expect(button).toHaveTextContent("Light");
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
  });

  it("still applies the theme when localStorage writes fail", () => {
    jest.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });

    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>,
    );
    const button = screen.getByRole("button");

    expect(() => fireEvent.click(button)).not.toThrow();
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
  });
});
