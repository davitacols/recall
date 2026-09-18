export function resolveLoginMode({ inviteToken = "", requestedMode = "" } = {}) {
  return inviteToken || requestedMode === "signup" ? "signup" : "login";
}
