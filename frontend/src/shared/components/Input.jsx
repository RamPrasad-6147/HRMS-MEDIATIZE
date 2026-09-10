import React from "react";

export function Input({
  label,
  error,
  helperText,
  id,
  className = "",
  containerStyle = {},
  ...props
}) {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem", ...containerStyle }}>
      {label && (
        <label htmlFor={inputId} className="hrms-label">
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={`hrms-input ${className}`}
        style={error ? { borderColor: "var(--danger-color)" } : {}}
        {...props}
      />
      {error && <span style={errorStyle}>{error}</span>}
      {helperText && !error && <span style={helperStyle}>{helperText}</span>}
    </div>
  );
}

export function Select({
  label,
  options = [],
  error,
  helperText,
  id,
  children,
  className = "",
  containerStyle = {},
  ...props
}) {
  const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem", ...containerStyle }}>
      {label && (
        <label htmlFor={selectId} className="hrms-label">
          {label}
        </label>
      )}
      <select
        id={selectId}
        className={`hrms-select ${className}`}
        style={error ? { borderColor: "var(--danger-color)" } : {}}
        {...props}
      >
        {children ||
          options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
      </select>
      {error && <span style={errorStyle}>{error}</span>}
      {helperText && !error && <span style={helperStyle}>{helperText}</span>}
    </div>
  );
}

export function TextArea({
  label,
  error,
  helperText,
  id,
  className = "",
  containerStyle = {},
  rows = 4,
  ...props
}) {
  const textareaId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem", width: "100%", ...containerStyle }}>
      {label && (
        <label htmlFor={textareaId} className="hrms-label">
          {label}
        </label>
      )}
      <textarea
        id={textareaId}
        rows={rows}
        className={`hrms-textarea ${className}`}
        style={{
          width: "100%",
          maxWidth: "100%",
          minWidth: "0",
          boxSizing: "border-box",
          resize: "vertical",
          minHeight: "110px",
          padding: "0.625rem 0.875rem",
          fontSize: "0.875rem",
          lineHeight: "1.4",
          ...(error ? { borderColor: "var(--danger-color)" } : {}),
        }}
        {...props}
      />
      {error && <span style={errorStyle}>{error}</span>}
      {helperText && !error && <span style={helperStyle}>{helperText}</span>}
    </div>
  );
}

const errorStyle = {
  fontSize: "0.75rem",
  color: "var(--danger-color)",
  fontWeight: "500",
};

const helperStyle = {
  fontSize: "0.75rem",
  color: "var(--text-muted)",
};

export default Input;
