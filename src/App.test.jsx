import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import App from "./App.jsx";

describe("App", () => {
  it("renders the CI/CD demo app title", () => {
    render(<App />);

    expect(screen.getByText(/CI\/CD Demo App/i)).toBeInTheDocument();
  });

  it("shows running status", () => {
    render(<App />);

    expect(screen.getByText(/Status: Running/i)).toBeInTheDocument();
  });
});