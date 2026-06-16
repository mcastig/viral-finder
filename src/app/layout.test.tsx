import { renderToStaticMarkup } from "react-dom/server";
import RootLayout, { metadata } from "./layout";

describe("RootLayout", () => {
  it("exposes descriptive page metadata", () => {
    expect(String(metadata.title)).toMatch(/Viral Finder/);
    expect(metadata.description).toBeTruthy();
  });

  it("renders children inside the shell with the no-flash theme script", () => {
    // Render on the server so <html>/<body> are valid (no DOM-nesting warning).
    const html = renderToStaticMarkup(
      <RootLayout>
        <p>page content</p>
      </RootLayout>,
    );

    expect(html).toContain("page content");
    expect(html).toContain("data-theme");
  });
});
