import { render, screen } from "@testing-library/react";
import { LoadingState } from "./LoadingState";

describe("LoadingState", () => {
  it("announces progress to assistive tech", () => {
    render(<LoadingState />);
    expect(screen.getByRole("status")).toHaveTextContent(/Scanning YouTube/i);
  });
});
