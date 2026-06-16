import { render, screen } from "@testing-library/react";
import { Header } from "./Header";
import { ThemeProvider } from "@/context/ThemeContext";

describe("Header", () => {
  it("renders the brand name and theme toggle", () => {
    render(
      <ThemeProvider>
        <Header />
      </ThemeProvider>,
    );

    expect(screen.getByText(/Viral/)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /switch to/i }),
    ).toBeInTheDocument();
  });
});
