// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react";
import { createElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { NewsletterForm } from "./newsletter-form";

vi.mock("@/i18n", () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock("@/components/security/turnstile", () => ({
  Turnstile: () => createElement("div", { "data-testid": "turnstile" }),
  turnstileEnabled: true,
}));

describe("NewsletterForm", () => {
  afterEach(() => vi.restoreAllMocks());

  it("does not render or request subscription controls before the user expands it", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    render(createElement(NewsletterForm));

    expect(screen.queryByRole("textbox", { name: "emailLabel" })).toBeNull();
    expect(screen.queryByTestId("turnstile")).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "submit" }));

    expect(await screen.findByRole("textbox", { name: "emailLabel" })).toBeTruthy();
    expect(screen.getByText("description")).toBeTruthy();
    expect(screen.getByTestId("turnstile")).toBeTruthy();
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
