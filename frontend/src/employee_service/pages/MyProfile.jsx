import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import {
  User,
  Mail,
  Phone,
  Calendar,
  MapPin,
  Camera,
  Trash2,
  Edit2,
  Save,
  X,
  Briefcase,
  ShieldCheck,
  Loader2,
} from "lucide-react";
import AppLayout from "../../shared/components/AppLayout";
import BackToDashboard from "../../shared/components/BackToDashboard";
import {
  getMyProfile,
  updateMyProfile,
  uploadProfilePhoto,
  deleteProfilePhoto,
} from "../services/employeeApi";

export default function MyProfile() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [saving, setSaving] = useState(false);

  // Profile photo preview
  const [photoPreviewOpen, setPhotoPreviewOpen] = useState(false);

  const fetchProfile = async () => {
    try {
      const res = await getMyProfile();
      const emp = res.data;
      setProfile(emp);
      setPhone(emp.phone || "");
      setAddress(emp.address || "");
    } catch (err) {
      toast.error(
        err.response?.data?.detail ||
          "Failed to load self profile."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  // Close enlarged photo with Escape
  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setPhotoPreviewOpen(false);
      }
    };

    if (photoPreviewOpen) {
      document.addEventListener(
        "keydown",
        handleEscape
      );

      // Prevent background page scrolling while preview is open
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener(
        "keydown",
        handleEscape
      );

      document.body.style.overflow = "";
    };
  }, [photoPreviewOpen]);

  const handleUpdateSelf = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      await updateMyProfile({ phone, address });

      toast.success("Profile updated successfully!");

      setEditing(false);
      fetchProfile();
    } catch (err) {
      toast.error(
        err.response?.data?.detail ||
          "Failed to update profile."
      );
    } finally {
      setSaving(false);
    }
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error(
        "Image file size must be less than 5 MB."
      );
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    setUploadingPhoto(true);

    try {
      await uploadProfilePhoto(formData);

      toast.success("Profile photo updated!");

      fetchProfile();
    } catch (err) {
      toast.error(
        err.response?.data?.detail ||
          "Photo upload failed."
      );
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleRemovePhoto = async () => {
    try {
      await deleteProfilePhoto();

      toast.info("Profile photo removed.");

      fetchProfile();
    } catch (err) {
      toast.error(
        err.response?.data?.detail ||
          "Photo removal failed."
      );
    }
  };

  if (loading) {
    return (
      <AppLayout title="My Profile">
        <div
          className="hrms-page-container"
          style={{
            maxWidth: "860px",
            margin: "0 auto",
            textAlign: "center",
            padding: "5rem 1rem",
          }}
        >
          <div
            style={{
              display: "inline-flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "1rem",
            }}
          >
            <Loader2
              size={36}
              className="hrms-spin"
              style={{
                color: "var(--primary-color)",
              }}
            />

            <p
              style={{
                color: "var(--text-secondary)",
                fontSize: "0.9375rem",
                margin: 0,
              }}
            >
              Retrieving your profile details...
            </p>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!profile) return null;

  return (
    <AppLayout title="My Profile">
      <div
        className="hrms-page-container"
        style={{
          maxWidth: "860px",
          margin: "0 auto",
        }}
      >
        <BackToDashboard
          to="/employee/dashboard"
          role="EMPLOYEE"
        />

        {/* =====================================================
            PAGE TOP HEADER
            ===================================================== */}

        <div className="hrms-page-header">
          <div>
            <h1 className="hrms-page-title">
              Employee Profile & Settings
            </h1>

            <p className="hrms-page-subtitle">
              Manage your personal credentials, profile picture,
              and contact details
            </p>
          </div>

          {!editing && (
            <div className="hrms-page-actions">
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="hrms-btn hrms-btn-primary"
              >
                <Edit2 size={15} />
                Edit Contact Details
              </button>
            </div>
          )}
        </div>

        {/* =====================================================
            PROFILE HERO CARD
            ===================================================== */}

        <div
          className="hrms-card"
          style={{
            padding: "2rem",
            marginBottom: "1.5rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "1.5rem",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "1.5rem",
              flexWrap: "wrap",
            }}
          >
            {/* =================================================
                EMPLOYEE PROFILE PHOTO
                ================================================= */}

            <div
              style={{
                position: "relative",
              }}
            >
              <div
                role={
                  profile.profile_photo_url
                    ? "button"
                    : undefined
                }
                tabIndex={
                  profile.profile_photo_url ? 0 : undefined
                }
                aria-label={
                  profile.profile_photo_url
                    ? "View profile photo"
                    : undefined
                }
                onClick={() => {
                  if (profile.profile_photo_url) {
                    setPhotoPreviewOpen(true);
                  }
                }}
                onKeyDown={(e) => {
                  if (
                    profile.profile_photo_url &&
                    (e.key === "Enter" ||
                      e.key === " ")
                  ) {
                    e.preventDefault();
                    setPhotoPreviewOpen(true);
                  }
                }}
                style={{
                  width: 92,
                  height: 92,
                  borderRadius: "var(--radius-full)",
                  overflow: "hidden",
                  border:
                    "3px solid var(--primary-border)",
                  boxShadow: "var(--shadow-md)",
                  backgroundColor:
                    "var(--primary-color)",
                  color:
                    "var(--text-on-primary)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "2rem",
                  fontWeight: 800,

                  /* Hand cursor when photo exists */
                  cursor: profile.profile_photo_url
                    ? "pointer"
                    : "default",

                  transition:
                    "transform 0.22s ease, box-shadow 0.22s ease, border-color 0.22s ease",

                  position: "relative",
                }}
                onMouseEnter={(e) => {
                  if (profile.profile_photo_url) {
                    e.currentTarget.style.transform =
                      "scale(1.04)";

                    e.currentTarget.style.boxShadow =
                      "0 8px 24px rgba(16, 185, 129, 0.22)";

                    e.currentTarget.style.borderColor =
                      "var(--primary-color)";
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform =
                    "scale(1)";

                  e.currentTarget.style.boxShadow =
                    "var(--shadow-md)";

                  e.currentTarget.style.borderColor =
                    "var(--primary-border)";
                }}
              >
                {profile.profile_photo_url ? (
                  <img
                    src={profile.profile_photo_url}
                    alt={profile.first_name}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      display: "block",
                    }}
                  />
                ) : (
                  <span>
                    {profile.first_name?.[0]}
                    {profile.last_name?.[0]}
                  </span>
                )}
              </div>
            </div>

            <div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                  flexWrap: "wrap",
                }}
              >
                <h2
                  style={{
                    fontSize: "1.625rem",
                    fontWeight: 800,
                    color: "var(--text-primary)",
                    margin: 0,
                    letterSpacing: "-0.02em",
                  }}
                >
                  {profile.first_name}{" "}
                  {profile.last_name}
                </h2>

                <span className="hrms-badge hrms-badge-success">
                  <span className="hrms-status-dot" />
                  {profile.employment_status ||
                    "ACTIVE"}
                </span>
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                  marginTop: "0.5rem",
                  flexWrap: "wrap",
                }}
              >
                <span
                  style={{
                    fontFamily:
                      "var(--font-mono)",
                    fontSize: "0.8125rem",
                    fontWeight: 700,
                    padding: "0.2rem 0.55rem",
                    borderRadius:
                      "var(--radius-sm)",
                    backgroundColor:
                      "var(--bg-surface-elevated)",
                    color:
                      "var(--primary-color)",
                    border:
                      "1px solid var(--border-color)",
                  }}
                >
                  {profile.employee_code}
                </span>

                <span
                  style={{
                    fontSize: "0.875rem",
                    color:
                      "var(--text-secondary)",
                  }}
                >
                  {profile.email}
                </span>
              </div>

              {/* =================================================
                  PHOTO CONTROLS
                  ================================================= */}

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.625rem",
                  marginTop: "0.875rem",
                  flexWrap: "wrap",
                }}
              >
                <label
                  className={`hrms-btn hrms-btn-secondary hrms-btn-sm ${
                    uploadingPhoto
                      ? "disabled"
                      : ""
                  }`}
                  style={{
                    cursor: uploadingPhoto
                      ? "not-allowed"
                      : "pointer",
                  }}
                >
                  <Camera size={14} />

                  {uploadingPhoto
                    ? "Uploading..."
                    : "Update Photo"}

                  <input
                    type="file"
                    accept="image/png, image/jpeg, image/jpg, image/webp"
                    onChange={handlePhotoUpload}
                    disabled={uploadingPhoto}
                    style={{
                      display: "none",
                    }}
                  />
                </label>

                {profile.profile_photo_url && (
                  <button
                    type="button"
                    onClick={handleRemovePhoto}
                    className="hrms-btn hrms-btn-ghost hrms-btn-sm"
                    style={{
                      color:
                        "var(--danger-color)",
                    }}
                  >
                    <Trash2 size={14} />
                    Remove Photo
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* =====================================================
            LARGE PROFILE PHOTO PREVIEW
            ===================================================== */}

        {photoPreviewOpen &&
          profile.profile_photo_url && (
            <div
              role="dialog"
              aria-modal="true"
              aria-label="Profile photo preview"
              onClick={() =>
                setPhotoPreviewOpen(false)
              }
              style={{
                position: "fixed",
                inset: 0,
                zIndex: 9999,

                display: "flex",
                alignItems: "center",
                justifyContent: "center",

                padding: "1.5rem",

                backgroundColor:
                  "rgba(0, 0, 0, 0.78)",

                backdropFilter: "blur(8px)",
                WebkitBackdropFilter:
                  "blur(8px)",

                animation:
                  "employeePhotoOverlayIn 0.2s ease-out",
              }}
            >
              {/* =================================================
                  CLOSE BUTTON
                  ================================================= */}

              <button
                type="button"
                aria-label="Close profile photo preview"
                onClick={(e) => {
                  e.stopPropagation();
                  setPhotoPreviewOpen(false);
                }}
                style={{
                  position: "absolute",
                  top: "1.25rem",
                  right: "1.25rem",

                  width: "42px",
                  height: "42px",

                  borderRadius: "50%",

                  border:
                    "1px solid rgba(255,255,255,0.20)",

                  background:
                    "rgba(0, 0, 0, 0.45)",

                  color: "#ffffff",

                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",

                  cursor: "pointer",

                  transition:
                    "background 0.2s ease, transform 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background =
                    "rgba(16, 185, 129, 0.85)";

                  e.currentTarget.style.transform =
                    "scale(1.05)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background =
                    "rgba(0, 0, 0, 0.45)";

                  e.currentTarget.style.transform =
                    "scale(1)";
                }}
              >
                <X size={22} />
              </button>

              {/* =================================================
                  LARGE PROFILE IMAGE
                  ================================================= */}

              <div
                onClick={(e) =>
                  e.stopPropagation()
                }
                style={{
                  position: "relative",

                  width:
                    "min(520px, 85vw)",

                  height:
                    "min(520px, 70vh)",

                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",

                  animation:
                    "employeePhotoImageIn 0.25s ease-out",
                }}
              >
                <img
                  src={profile.profile_photo_url}
                  alt={`${profile.first_name} ${profile.last_name} profile`}
                  style={{
                    maxWidth: "100%",
                    maxHeight: "100%",

                    width: "auto",
                    height: "auto",

                    objectFit: "contain",

                    borderRadius: "20px",

                    border:
                      "3px solid rgba(52, 211, 153, 0.85)",

                    boxShadow:
                      "0 25px 70px rgba(0, 0, 0, 0.55), 0 0 35px rgba(16, 185, 129, 0.18)",

                    display: "block",
                  }}
                />
              </div>

              {/* =================================================
                  EMPLOYEE NAME
                  ================================================= */}

              <div
                style={{
                  position: "absolute",
                  bottom: "1.5rem",
                  left: "50%",
                  transform:
                    "translateX(-50%)",

                  color: "#ffffff",

                  background:
                    "rgba(0, 0, 0, 0.48)",

                  border:
                    "1px solid rgba(52, 211, 153, 0.25)",

                  borderRadius: "999px",

                  padding:
                    "0.5rem 1rem",

                  fontSize: "0.875rem",
                  fontWeight: 700,

                  whiteSpace: "nowrap",

                  backdropFilter: "blur(8px)",

                  maxWidth: "calc(100vw - 2rem)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {profile.first_name}{" "}
                {profile.last_name}
              </div>

              {/* =================================================
                  PREVIEW ANIMATIONS
                  ================================================= */}

              <style>
                {`
                  @keyframes employeePhotoOverlayIn {
                    from {
                      opacity: 0;
                    }

                    to {
                      opacity: 1;
                    }
                  }

                  @keyframes employeePhotoImageIn {
                    from {
                      opacity: 0;
                      transform: scale(0.92);
                    }

                    to {
                      opacity: 1;
                      transform: scale(1);
                    }
                  }

                  @media (max-width: 600px) {
                    .employee-photo-preview {
                      width: 90vw;
                    }
                  }

                  @media (max-width: 420px) {
                    .employee-photo-preview {
                      width: 94vw;
                    }
                  }

                  @media (prefers-reduced-motion: reduce) {
                    @keyframes employeePhotoOverlayIn {
                      from,
                      to {
                        opacity: 1;
                      }
                    }

                    @keyframes employeePhotoImageIn {
                      from,
                      to {
                        opacity: 1;
                        transform: scale(1);
                      }
                    }
                  }
                `}
              </style>
            </div>
          )}

        {/* =====================================================
            VIEW DETAILS / EDIT MODE
            ===================================================== */}

        {!editing ? (
          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(min(100%, 380px), 1fr))",
              gap: "1.5rem",
            }}
          >
            {/* =================================================
                CONTACT INFORMATION
                ================================================= */}

            <div
              className="hrms-card"
              style={{
                padding: "1.75rem",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.625rem",
                  marginBottom: "1.5rem",
                }}
              >
                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius:
                      "var(--radius-md)",
                    backgroundColor:
                      "rgba(14, 165, 233, 0.12)",
                    color:
                      "var(--info-color)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Mail size={18} />
                </div>

                <h3
                  style={{
                    margin: 0,
                    fontSize: "1.0625rem",
                    fontWeight: 700,
                    color:
                      "var(--text-primary)",
                  }}
                >
                  Contact Information
                </h3>
              </div>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "1.25rem",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent:
                      "space-between",
                    alignItems: "center",
                    gap: "1rem",
                  }}
                >
                  <span
                    style={{
                      fontSize: "0.8125rem",
                      color:
                        "var(--text-muted)",
                      fontWeight: 600,
                    }}
                  >
                    Work Email
                  </span>

                  <span
                    style={{
                      fontSize: "0.875rem",
                      color:
                        "var(--text-primary)",
                      fontWeight: 600,
                    }}
                  >
                    {profile.email}
                  </span>
                </div>

                <div
                  style={{
                    height: "1px",
                    backgroundColor:
                      "var(--border-color)",
                  }}
                />

                <div
                  style={{
                    display: "flex",
                    justifyContent:
                      "space-between",
                    alignItems: "center",
                    gap: "1rem",
                  }}
                >
                  <span
                    style={{
                      fontSize: "0.8125rem",
                      color:
                        "var(--text-muted)",
                      fontWeight: 600,
                    }}
                  >
                    Phone Number
                  </span>

                  <span
                    style={{
                      fontSize: "0.875rem",
                      color:
                        "var(--text-primary)",
                      fontWeight: 600,
                    }}
                  >
                    {profile.phone || "—"}
                  </span>
                </div>

                <div
                  style={{
                    height: "1px",
                    backgroundColor:
                      "var(--border-color)",
                  }}
                />

                <div
                  style={{
                    display: "flex",
                    justifyContent:
                      "space-between",
                    alignItems:
                      "flex-start",
                    gap: "1rem",
                  }}
                >
                  <span
                    style={{
                      fontSize: "0.8125rem",
                      color:
                        "var(--text-muted)",
                      fontWeight: 600,
                    }}
                  >
                    Address
                  </span>

                  <span
                    style={{
                      fontSize: "0.875rem",
                      color:
                        "var(--text-primary)",
                      textAlign: "right",
                      maxWidth: "240px",
                    }}
                  >
                    {profile.address || "—"}
                  </span>
                </div>
              </div>
            </div>

            {/* =================================================
                EMPLOYMENT DETAILS
                ================================================= */}

            <div
              className="hrms-card"
              style={{
                padding: "1.75rem",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.625rem",
                  marginBottom: "1.5rem",
                }}
              >
                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius:
                      "var(--radius-md)",
                    backgroundColor:
                      "rgba(16, 185, 129, 0.12)",
                    color:
                      "var(--success-color)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Briefcase size={18} />
                </div>

                <h3
                  style={{
                    margin: 0,
                    fontSize: "1.0625rem",
                    fontWeight: 700,
                    color:
                      "var(--text-primary)",
                  }}
                >
                  Employment Details
                </h3>
              </div>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "1.25rem",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent:
                      "space-between",
                    alignItems: "center",
                    gap: "1rem",
                  }}
                >
                  <span
                    style={{
                      fontSize: "0.8125rem",
                      color:
                        "var(--text-muted)",
                      fontWeight: 600,
                    }}
                  >
                    Employee ID
                  </span>

                  <span
                    style={{
                      fontFamily:
                        "var(--font-mono)",
                      fontSize: "0.875rem",
                      color:
                        "var(--primary-color)",
                      fontWeight: 700,
                    }}
                  >
                    {profile.employee_code}
                  </span>
                </div>

                <div
                  style={{
                    height: "1px",
                    backgroundColor:
                      "var(--border-color)",
                  }}
                />

                <div
                  style={{
                    display: "flex",
                    justifyContent:
                      "space-between",
                    alignItems: "center",
                    gap: "1rem",
                  }}
                >
                  <span
                    style={{
                      fontSize: "0.8125rem",
                      color:
                        "var(--text-muted)",
                      fontWeight: 600,
                    }}
                  >
                    Joining Date
                  </span>

                  <span
                    style={{
                      fontSize: "0.875rem",
                      color:
                        "var(--text-primary)",
                      fontWeight: 600,
                    }}
                  >
                    {profile.joining_date ||
                      "—"}
                  </span>
                </div>

                <div
                  style={{
                    height: "1px",
                    backgroundColor:
                      "var(--border-color)",
                  }}
                />

                <div
                  style={{
                    display: "flex",
                    justifyContent:
                      "space-between",
                    alignItems: "center",
                    gap: "1rem",
                  }}
                >
                  <span
                    style={{
                      fontSize: "0.8125rem",
                      color:
                        "var(--text-muted)",
                      fontWeight: 600,
                    }}
                  >
                    Date of Birth
                  </span>

                  <span
                    style={{
                      fontSize: "0.875rem",
                      color:
                        "var(--text-primary)",
                      fontWeight: 600,
                    }}
                  >
                    {profile.date_of_birth ||
                      "—"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* =====================================================
             EDIT FORM
             ===================================================== */

          <div
            className="hrms-card"
            style={{
              padding: "2rem",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent:
                  "space-between",
                marginBottom: "1.5rem",
                borderBottom:
                  "1px solid var(--border-color)",
                paddingBottom: "1rem",
              }}
            >
              <div>
                <h3
                  style={{
                    margin: 0,
                    fontSize: "1.125rem",
                    fontWeight: 700,
                    color:
                      "var(--text-primary)",
                  }}
                >
                  Update Contact Information
                </h3>

                <p
                  style={{
                    margin:
                      "0.25rem 0 0 0",
                    fontSize: "0.8125rem",
                    color:
                      "var(--text-secondary)",
                  }}
                >
                  Changes will be saved to your
                  personnel record
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setEditing(false)
                }
                className="hrms-btn hrms-btn-ghost hrms-btn-sm"
              >
                <X size={16} />
                Cancel
              </button>
            </div>

            <form
              onSubmit={handleUpdateSelf}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "1.25rem",
              }}
            >
              <div>
                <label
                  htmlFor="phone"
                  className="hrms-label"
                >
                  Phone Number
                </label>

                <input
                  id="phone"
                  type="text"
                  value={phone}
                  onChange={(e) =>
                    setPhone(e.target.value)
                  }
                  className="hrms-input"
                  placeholder="+91 9876543210"
                />
              </div>

              <div>
                <label
                  htmlFor="address"
                  className="hrms-label"
                >
                  Residential Address
                </label>

                <textarea
                  id="address"
                  rows="3"
                  value={address}
                  onChange={(e) =>
                    setAddress(e.target.value)
                  }
                  className="hrms-textarea"
                  placeholder="Enter your current residential address"
                />
              </div>

              <div
                className="hrms-modal-footer-actions"
                style={{
                  marginTop: "0.5rem",
                  paddingTop: "1.25rem",
                  borderTop:
                    "1px solid var(--border-color)",
                }}
              >
                <button
                  type="button"
                  onClick={() =>
                    setEditing(false)
                  }
                  className="hrms-btn hrms-btn-secondary"
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="hrms-btn hrms-btn-primary"
                >
                  {saving ? (
                    "Saving Changes..."
                  ) : (
                    <>
                      <Save size={15} />
                      Save Contact Details
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </AppLayout>
  );
}