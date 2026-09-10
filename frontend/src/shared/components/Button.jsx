import React from "react";
import { Loader2 } from "lucide-react";

export default function Button({
  children,
  variant = "primary", // primary, secondary, danger, outline, ghost
  size = "md", // sm, md, lg
  loading = false,
  disabled = false,
  icon,
  type = "button",
  onClick,
  className = "",
  style = {},
  ...props
}) {
  const variantClass = `hrms-btn-${variant}`;
  const sizeClass = size !== "md" ? `hrms-btn-${size}` : "";

  const renderIcon = () => {
    if (!icon) return null;
    if (React.isValidElement(icon)) {
      return icon;
    }
    const IconComponent = icon;
    return <IconComponent size={16} />;
  };

  return (
    <button
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      className={`hrms-btn ${variantClass} ${sizeClass} ${className}`}
      style={style}
      {...props}
    >
      {loading ? (
        <span style={spinnerStyle}>
          <Loader2 size={16} />
        </span>
      ) : icon ? (
        <span style={{ display: "inline-flex", alignItems: "center" }}>{renderIcon()}</span>
      ) : null}
      {children}
    </button>
  );
}

const spinnerStyle = {
  animation: "spin 1s linear infinite",
  display: "inline-block",
};
