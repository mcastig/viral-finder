import { render, screen, fireEvent } from "@testing-library/react";
import { ThemeToggle } from "./ThemeToggle";
import { ThemeProvider } from "@/context/ThemeContext";

function renderWithProvider() {
  return render(
    <ThemeProvider>
      <ThemeToggle />
    </ThemeProvider>,
  );
}

describe("ThemeToggle", () => {
  it("renders the light theme label by default", () => {
    renderWithProvider();
    expect(screen.getByRole("button")).toHaveTextContent("Light");
  });

  it("toggles to dark theme on click", () => {
    renderWithProvider();
    const button = screen.getByRole("button");
    fireEvent.click(button);
    expect(button).toHaveTextContent("Dark");
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
  });
});
