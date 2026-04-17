import React, { useState } from "react";

export function Field({ label, hint, children, darkMode }) {
  return (
    <div>
      <label className={`mb-2 block text-sm font-medium ${darkMode ? "text-stone-100" : "text-stone-900"}`}>{label}</label>
      {children}
      {hint ? <p className={`mt-1 text-xs ${darkMode ? "text-stone-400" : "text-stone-500"}`}>{hint}</p> : null}
    </div>
  );
}

export function TextInput({ darkMode, ...props }) {
  return (
    <input
      {...props}
      className={`w-full rounded-lg border px-3 py-2 text-sm outline-none ${
        darkMode
          ? "border-stone-600 bg-stone-800 text-stone-100 focus:border-stone-400"
          : "border-stone-300 bg-white text-stone-900 focus:border-stone-500"
      }`}
    />
  );
}

export function ClipboardInput({ darkMode, onPasteValue, pasteLabel = "Paste", ...props }) {
  const [clipboardState, setClipboardState] = useState("");

  const handlePaste = async () => {
    if (!navigator?.clipboard?.readText) {
      setClipboardState("unsupported");
      return;
    }
    try {
      const pasted = await navigator.clipboard.readText();
      if (!pasted) {
        setClipboardState("empty");
        return;
      }
      onPasteValue?.(pasted.trim());
      setClipboardState("pasted");
      window.setTimeout(() => {
        setClipboardState((current) => (current === "pasted" ? "" : current));
      }, 1500);
    } catch {
      setClipboardState("error");
    }
  };

  return (
    <div className="space-y-2">
      <TextInput darkMode={darkMode} {...props} />
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={handlePaste}
          className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-semibold ${
            darkMode
              ? "border-stone-600 bg-stone-900 text-stone-200 hover:border-stone-400"
              : "border-stone-300 bg-white text-stone-700 hover:border-stone-500"
          }`}
        >
          {clipboardState === "pasted" ? "Pasted" : pasteLabel}
        </button>
        {clipboardState === "unsupported" ? (
          <span className={`text-[11px] ${darkMode ? "text-amber-300" : "text-amber-700"}`}>
            Clipboard paste is unavailable in this browser.
          </span>
        ) : null}
        {clipboardState === "empty" ? (
          <span className={`text-[11px] ${darkMode ? "text-amber-300" : "text-amber-700"}`}>Clipboard is empty.</span>
        ) : null}
        {clipboardState === "error" ? (
          <span className={`text-[11px] ${darkMode ? "text-rose-300" : "text-rose-700"}`}>Could not read the clipboard.</span>
        ) : null}
      </div>
    </div>
  );
}

export function Check({ checked, onChange, label, darkMode }) {
  return (
    <label
      className={`flex items-center gap-3 rounded-lg border px-3 py-2 ${
        darkMode ? "border-stone-700 bg-stone-800" : "border-stone-200"
      }`}
    >
      <input type="checkbox" checked={checked} onChange={onChange} className="h-4 w-4" />
      <span className={`text-sm ${darkMode ? "text-stone-200" : "text-stone-800"}`}>{label}</span>
    </label>
  );
}
