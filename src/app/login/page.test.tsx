// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import LoginPage from "./page";

const { signIn } = vi.hoisted(() => ({ signIn: vi.fn() }));
vi.mock("next-auth/react", () => ({ signIn }));
vi.mock("./Neoburie", () => ({ default: () => null }));

afterEach(() => {
  cleanup();
  signIn.mockReset();
});

it("starts Google sign-in through the Auth.js client action", () => {
  render(<LoginPage />);
  fireEvent.click(screen.getByRole("button", { name: "Google로 로그인" }));

  expect(signIn).toHaveBeenCalledWith("google", { redirectTo: "/" });
});
