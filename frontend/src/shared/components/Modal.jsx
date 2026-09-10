import React, { useEffect } from "react";
import { X } from "lucide-react";
import Button from "./Button";

export function Modal({ isOpen, onClose, title, children, footer, maxWidth = "520px" }) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && isOpen && onClose) {
        onClose();
      }
    };
    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="hrms-modal-backdrop" onClick={onClose}>
      <div
        className="hrms-modal"
        style={{ maxWidth: `min(${maxWidth}, calc(100vw - 2rem))` }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="hrms-modal-header">
          <h3 style={{ margin: 0, fontSize: "1.125rem", fontWeight: 700, color: "var(--text-primary)" }}>
            {title}
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="hrms-btn hrms-btn-ghost hrms-btn-sm"
            style={{ padding: "0.25rem 0.5rem", display: "inline-flex", alignItems: "center", justifyContent: "center" }}
          >
            <X size={18} />
          </button>
        </div>
        <div className="hrms-modal-body">{children}</div>
        {footer && <div className="hrms-modal-footer">{footer}</div>}
      </div>
    </div>
  );
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title = "Confirm Action",
  message = "Are you sure you want to proceed?",
  confirmText = "Confirm",
  confirmVariant = "danger",
  loading = false,
}) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button variant={confirmVariant} onClick={onConfirm} loading={loading}>
            {confirmText}
          </Button>
        </>
      }
    >
      <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: "0.9375rem" }}>{message}</p>
    </Modal>
  );
}

export default Modal;
