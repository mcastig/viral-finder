import { render, screen, fireEvent } from "@testing-library/react";
import { SearchBar } from "./SearchBar";

describe("SearchBar", () => {
  it("calls onSearch with the trimmed keyword on submit", () => {
    const onSearch = jest.fn();
    render(<SearchBar onSearch={onSearch} />);

    fireEvent.change(screen.getByLabelText("Search term"), {
      target: { value: "  drone footage  " },
    });
    fireEvent.click(screen.getByRole("button"));

    expect(onSearch).toHaveBeenCalledWith("drone footage");
  });

  it("does not submit an empty query", () => {
    const onSearch = jest.fn();
    render(<SearchBar onSearch={onSearch} />);

    fireEvent.submit(screen.getByRole("search"));
    expect(onSearch).not.toHaveBeenCalled();
  });

  it("disables input and button while loading", () => {
    render(<SearchBar onSearch={jest.fn()} loading />);
    expect(screen.getByLabelText("Search term")).toBeDisabled();
    expect(screen.getByRole("button")).toBeDisabled();
  });
});
