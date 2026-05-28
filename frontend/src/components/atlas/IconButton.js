import React from "react";

/**
 * IconButton — square 32x32 transparent button with hover bg.
 */
export default function IconButton({
  icon,
  label,
  isSelected = false,
  size = 32,
  style,
  className = "",
  ...rest
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={isSelected || undefined}
      title={label}
      className={`atlas-icon-btn ${className}`}
      style={{ width: size, height: size, ...style }}
      {...rest}
    >
      {icon}
    </button>
  );
}
