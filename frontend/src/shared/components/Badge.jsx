import React from "react";

export function Badge({ children, variant = "neutral", className = "", style = {} }) {
  // variants: success, warning, danger, info, neutral
  return (
    <span className={`hrms-badge hrms-badge-${variant} ${className}`} style={style}>
      {children}
    </span>
  );
}

export function Avatar({ src, name = "", size = "md", className = "", style = {} }) {
  const getInitials = (n) => {
    if (!n) return "U";
    const parts = n.trim().split(" ");
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return n.slice(0, 2).toUpperCase();
  };

  const sizePx = size === "sm" ? "32px" : size === "lg" ? "56px" : size === "xl" ? "72px" : "40px";
  const fontSize = size === "sm" ? "0.75rem" : size === "lg" ? "1.25rem" : size === "xl" ? "1.5rem" : "0.875rem";

  const containerStyle = {
    width: sizePx,
    height: sizePx,
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "var(--primary-color)",
    color: "#ffffff",
    fontWeight: "700",
    fontSize,
    overflow: "hidden",
    border: "2px solid var(--border-color)",
    flexShrink: 0,
    ...style,
  };

  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className={className}
        style={{ ...containerStyle, objectFit: "cover" }}
      />
    );
  }

  return (
    <div className={className} style={containerStyle}>
      {getInitials(name)}
    </div>
  );
}
