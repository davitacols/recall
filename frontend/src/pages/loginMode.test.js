import { resolveLoginMode } from "./loginMode";

describe("resolveLoginMode", () => {
  test("opens workspace creation when requested by a public CTA", () => {
    expect(resolveLoginMode({ requestedMode: "signup" })).toBe("signup");
  });

  test("opens signup for invitation links", () => {
    expect(resolveLoginMode({ inviteToken: "invite-token" })).toBe("signup");
  });

  test("defaults ordinary visits to sign in", () => {
    expect(resolveLoginMode()).toBe("login");
  });
});
