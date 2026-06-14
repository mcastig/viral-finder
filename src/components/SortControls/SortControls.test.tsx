import { render, screen, fireEvent } from "@testing-library/react";
import { SortControls } from "./SortControls";

describe("SortControls", () => {
  it("marks the active sort key as pressed", () => {
    render(<SortControls value="factor" onChange={jest.fn()} />);
    expect(
      screen.getByRole("button", { name: "Outlier factor" }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Newest" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("emits the selected sort key on click", () => {
    const onChange = jest.fn();
    render(<SortControls value="factor" onChange={onChange} />);
    fireEvent.click(screen.getByRole("button", { name: "Newest" }));
    expect(onChange).toHaveBeenCalledWith("date");
  });
});
