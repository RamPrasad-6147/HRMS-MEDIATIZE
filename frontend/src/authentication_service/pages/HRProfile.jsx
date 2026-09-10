import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
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
  ShieldCheck,
  Loader2,
  Briefcase,
  Pencil,
} from "lucide-react";
import AppLayout from "../../shared/components/AppLayout";
import BackToDashboard from "../../shared/components/BackToDashboard";
import { useAuth } from "../hooks/useAuth";
import {
  getHRProfile,
  updateHRProfile,
  uploadHRProfilePhoto,
  deleteHRProfilePhoto,
} from "../services/authApi";

export default function HRProfile({ editMode = false }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, refreshUser } = useAuth();

  const isEditing = editMode || location.pathname === "/hr/profile/edit";

  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Form State
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [address, setAddress] = useState("");

  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // Profile Photo Preview State
  const [photoPreviewOpen, setPhotoPreviewOpen] = useState(false);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const res = await getHRProfile();
      const data = res.data;
      setProfileData(data);
      setFirstName(data.first_name || "");
      setLastName(data.last_name || "");
      setAddress(data.address || "");
    } catch (err) {
      console.error("Failed to load HR profile:", err);
      toast.error(
        err.response?.data?.detail || "Failed to load HR profile."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [location.pathname]);

  // Close photo preview when Escape is pressed
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape") {
        setPhotoPreviewOpen(false);
      }
    };

    if (photoPreviewOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [photoPreviewOpen]);

  const handleSaveProfile = async (e) => {
    e.preventDefault();

    if (!firstName.trim()) {
      toast.error("First name is required.");
      return;
    }

    setSaving(true);

    try {
      const payload = {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        address: address.trim() || null,
      };

      const res = await updateHRProfile(payload);
      setProfileData(res.data);

      if (refreshUser) {
        await refreshUser();
      }

      toast.success("HR Profile updated successfully!");
      navigate("/hr/profile");
    } catch (err) {
      toast.error(
        err.response?.data?.detail || "Failed to update profile."
      );
    } finally {
      setSaving(false);
    }
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image file size must be less than 5 MB.");
      return;
    }

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/jpg",
    ];

    if (!allowedTypes.includes(file.type.toLowerCase())) {
      toast.error("Invalid file format. Please upload JPG, PNG, or WebP.");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    setUploadingPhoto(true);

    try {
      const res = await uploadHRProfilePhoto(formData);
      setProfileData(res.data);

      if (refreshUser) {
        await refreshUser();
      }

      toast.success("Profile photo updated!");
    } catch (err) {
      toast.error(
        err.response?.data?.detail || "Photo upload failed."
      );
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleRemovePhoto = async () => {
    try {
      const res = await deleteHRProfilePhoto();
      setProfileData(res.data);

      if (refreshUser) {
        await refreshUser();
      }

      toast.info("Profile photo removed.");
    } catch (err) {
      toast.error(
        err.response?.data?.detail || "Photo removal failed."
      );
    }
  };

  const getFullName = () => {
    const fn = (
      profileData?.first_name ||
      firstName ||
      ""
    ).trim();

    const ln = (
      profileData?.last_name ||
      lastName ||
      ""
    ).trim();

    const full = [fn, ln].filter(Boolean).join(" ");

    return full || "HR Administrator";
  };

  const getInitials = () => {
    const fn = (
      profileData?.first_name ||
      firstName ||
      ""
    ).trim();

    const ln = (
      profileData?.last_name ||
      lastName ||
      ""
    ).trim();

    if (fn && ln) {
      return `${fn.charAt(0)}${ln.charAt(0)}`.toUpperCase();
    }

    if (fn) {
      return fn.slice(0, 2).toUpperCase();
    }

    if (ln) {
      return ln.slice(0, 2).toUpperCase();
    }

    return "HR";
  };

  const displayEmail = profileData?.email || user?.email || "";
  const displayRole = profileData?.role || user?.role || "HR";

  if (loading) {
    return (
      <AppLayout title="HR Profile">
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
              style={{ color: "var(--primary-color)" }}
            />

            <p
              style={{
                color: "var(--text-secondary)",
                fontSize: "0.9375rem",
                margin: 0,
              }}
            >
              Retrieving HR administrator profile...
            </p>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!profileData) return null;

  return (
    <AppLayout title={isEditing ? "Edit HR Profile" : "HR Profile"}>
      <div
        className="hrms-page-container"
        style={{
          maxWidth: "860px",
          margin: "0 auto",
        }}
      >
        <BackToDashboard
          to="/hr/dashboard"
          role="HR"
        />

        {/* =====================================================
            PAGE TOP HEADER
            ===================================================== */}

        <div className="hrms-page-header">
          <div>
            <h1 className="hrms-page-title">
              HR Administrator Profile
            </h1>

            <p className="hrms-page-subtitle">
              Executive credentials and personnel management permissions
            </p>
          </div>

          {!isEditing && (
            <div className="hrms-page-actions">
              <button
                type="button"
                onClick={() => navigate("/hr/profile/edit")}
                className="hrms-btn hrms-btn-primary"
              >
                <Pencil size={15} />
                Edit Profile
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
            <div
              style={{
                position: "relative",
              }}
            >
              {/* =================================================
                  PROFILE PHOTO
                  Click photo to open larger preview
                  ================================================= */}

              <div
                role={
                  profileData.profile_photo_url
                    ? "button"
                    : undefined
                }
                tabIndex={
                  profileData.profile_photo_url
                    ? 0
                    : undefined
                }
                aria-label={
                  profileData.profile_photo_url
                    ? "View profile photo"
                    : undefined
                }
                onClick={() => {
                  if (profileData.profile_photo_url) {
                    setPhotoPreviewOpen(true);
                  }
                }}
                onKeyDown={(e) => {
                  if (
                    profileData.profile_photo_url &&
                    (e.key === "Enter" || e.key === " ")
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
                  border: "3px solid var(--primary-border)",
                  boxShadow: "var(--shadow-md)",
                  backgroundColor: "var(--primary-color)",
                  color: "var(--text-on-primary)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "2rem",
                  fontWeight: 800,

                  /* Hand cursor only when an actual photo exists */
                  cursor: profileData.profile_photo_url
                    ? "pointer"
                    : "default",

                  /* Subtle interaction */
                  transition:
                    "transform 0.22s ease, box-shadow 0.22s ease, border-color 0.22s ease",

                  position: "relative",
                }}
                onMouseEnter={(e) => {
                  if (profileData.profile_photo_url) {
                    e.currentTarget.style.transform =
                      "scale(1.04)";
                    e.currentTarget.style.boxShadow =
                      "0 8px 24px rgba(16, 185, 129, 0.20)";
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
                {profileData.profile_photo_url ? (
                  <img
                    src={profileData.profile_photo_url}
                    alt={getFullName()}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      display: "block",
                    }}
                  />
                ) : (
                  <span>{getInitials()}</span>
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
                  {getFullName()}
                </h2>

                <span className="hrms-badge hrms-badge-info">
                  <ShieldCheck size={12} />
                  {displayRole}
                </span>

                <span className="hrms-badge hrms-badge-success">
                  <span className="hrms-status-dot" />
                  ACTIVE
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
                    fontSize: "0.875rem",
                    color: "var(--text-secondary)",
                  }}
                >
                  {displayEmail}
                </span>
              </div>

              {/* =================================================
                  PHOTO CONTROLS — EDIT MODE
                  ================================================= */}

              {isEditing && (
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
                      uploadingPhoto ? "disabled" : ""
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
                      : "Change Photo"}

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

                  {profileData.profile_photo_url && (
                    <button
                      type="button"
                      onClick={handleRemovePhoto}
                      className="hrms-btn hrms-btn-ghost hrms-btn-sm"
                      style={{
                        color: "var(--danger-color)",
                      }}
                    >
                      <Trash2 size={14} />
                      Remove Photo
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* =====================================================
            PROFILE PHOTO LARGE PREVIEW
            ===================================================== */}

        {photoPreviewOpen &&
          profileData.profile_photo_url && (
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
                WebkitBackdropFilter: "blur(8px)",

                animation:
                  "hrmsPhotoOverlayIn 0.2s ease-out",
              }}
            >
              {/* Close Button */}

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

              {/* Large Photo */}

              <div
                onClick={(e) => e.stopPropagation()}
                style={{
                  position: "relative",

                  width: "min(520px, 85vw)",
                  height: "min(520px, 70vh)",

                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",

                  animation:
                    "hrmsPhotoImageIn 0.25s ease-out",
                }}
              >
                <img
                  src={profileData.profile_photo_url}
                  alt={`${getFullName()} profile`}
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

              {/* Name below photo */}

              <div
                style={{
                  position: "absolute",
                  bottom: "1.5rem",
                  left: "50%",
                  transform: "translateX(-50%)",

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
                }}
              >
                {getFullName()}
              </div>

              {/* Photo Preview Animations */}

              <style>
                {`
                  @keyframes hrmsPhotoOverlayIn {
                    from {
                      opacity: 0;
                    }

                    to {
                      opacity: 1;
                    }
                  }

                  @keyframes hrmsPhotoImageIn {
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
                    .hrms-photo-preview-image {
                      width: 90vw;
                    }
                  }

                  @media (prefers-reduced-motion: reduce) {
                    @keyframes hrmsPhotoOverlayIn {
                      from,
                      to {
                        opacity: 1;
                      }
                    }

                    @keyframes hrmsPhotoImageIn {
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
            VIEW MODE / EDIT MODE
            ===================================================== */}

        {!isEditing ? (
          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(min(100%, 380px), 1fr))",
              gap: "1.5rem",
            }}
          >
            {/* =================================================
                ACCOUNT & CONTACT
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
                    borderRadius: "var(--radius-md)",
                    backgroundColor:
                      "rgba(14, 165, 233, 0.12)",
                    color: "var(--info-color)",
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
                    color: "var(--text-primary)",
                  }}
                >
                  Account & Contact
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
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: "1rem",
                  }}
                >
                  <span
                    style={{
                      fontSize: "0.8125rem",
                      color: "var(--text-muted)",
                      fontWeight: 600,
                    }}
                  >
                    Full Name
                  </span>

                  <span
                    style={{
                      fontSize: "0.875rem",
                      color: "var(--text-primary)",
                      fontWeight: 600,
                    }}
                  >
                    {getFullName()}
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
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: "1rem",
                  }}
                >
                  <span
                    style={{
                      fontSize: "0.8125rem",
                      color: "var(--text-muted)",
                      fontWeight: 600,
                    }}
                  >
                    Admin Email
                  </span>

                  <span
                    style={{
                      fontSize: "0.875rem",
                      color: "var(--text-primary)",
                      fontWeight: 600,
                    }}
                  >
                    {displayEmail}
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
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    gap: "1rem",
                  }}
                >
                  <span
                    style={{
                      fontSize: "0.8125rem",
                      color: "var(--text-muted)",
                      fontWeight: 600,
                    }}
                  >
                    Address
                  </span>

                  <span
                    style={{
                      fontSize: "0.875rem",
                      color: "var(--text-primary)",
                      textAlign: "right",
                      maxWidth: "240px",
                    }}
                  >
                    {profileData.address ||
                      "Not provided"}
                  </span>
                </div>
              </div>
            </div>

            {/* =================================================
                SECURITY & ROLE
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
                    borderRadius: "var(--radius-md)",
                    backgroundColor:
                      "rgba(16, 185, 129, 0.12)",
                    color: "var(--success-color)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <ShieldCheck size={18} />
                </div>

                <h3
                  style={{
                    margin: 0,
                    fontSize: "1.0625rem",
                    fontWeight: 700,
                    color: "var(--text-primary)",
                  }}
                >
                  Security & Role
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
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: "1rem",
                  }}
                >
                  <span
                    style={{
                      fontSize: "0.8125rem",
                      color: "var(--text-muted)",
                      fontWeight: 600,
                    }}
                  >
                    System Role
                  </span>

                  <span
                    style={{
                      fontSize: "0.875rem",
                      color: "var(--primary-color)",
                      fontWeight: 700,
                    }}
                  >
                    Human Resources Administrator
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
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: "1rem",
                  }}
                >
                  <span
                    style={{
                      fontSize: "0.8125rem",
                      color: "var(--text-muted)",
                      fontWeight: 600,
                    }}
                  >
                    Access Tier
                  </span>

                  <span
                    style={{
                      fontSize: "0.875rem",
                      color: "var(--text-primary)",
                      fontWeight: 600,
                    }}
                  >
                    Full Management & Compliance
                  </span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* =================================================
             EDIT FORM CARD
             ================================================= */

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
                justifyContent: "space-between",
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
                    color: "var(--text-primary)",
                  }}
                >
                  Update HR Profile
                </h3>

                <p
                  style={{
                    margin:
                      "0.25rem 0 0 0",
                    fontSize: "0.8125rem",
                    color: "var(--text-secondary)",
                  }}
                >
                  Update your administrative profile details
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  navigate("/hr/profile")
                }
                className="hrms-btn hrms-btn-ghost hrms-btn-sm"
              >
                <X size={16} />
                Cancel
              </button>
            </div>

            <form
              onSubmit={handleSaveProfile}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "1.25rem",
              }}
            >
              <div className="hrms-form-grid-2">
                <div>
                  <label
                    htmlFor="hr_first_name"
                    className="hrms-label"
                  >
                    First Name{" "}
                    <span
                      style={{
                        color:
                          "var(--danger-color)",
                      }}
                    >
                      *
                    </span>
                  </label>

                  <input
                    id="hr_first_name"
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) =>
                      setFirstName(e.target.value)
                    }
                    className="hrms-input"
                    placeholder="First Name"
                  />
                </div>

                <div>
                  <label
                    htmlFor="hr_last_name"
                    className="hrms-label"
                  >
                    Last Name
                  </label>

                  <input
                    id="hr_last_name"
                    type="text"
                    value={lastName}
                    onChange={(e) =>
                      setLastName(e.target.value)
                    }
                    className="hrms-input"
                    placeholder="Last Name"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="hr_address"
                  className="hrms-label"
                >
                  Address (Optional)
                </label>

                <textarea
                  id="hr_address"
                  rows="3"
                  value={address}
                  onChange={(e) =>
                    setAddress(e.target.value)
                  }
                  className="hrms-textarea"
                  placeholder="Enter your administrative office or residential address"
                />
              </div>

              <div
                className="hrms-form-grid-2"
                style={{
                  opacity: 0.85,
                }}
              >
                <div>
                  <label className="hrms-label">
                    Email Address (System Managed)
                  </label>

                  <input
                    type="email"
                    value={displayEmail}
                    disabled
                    className="hrms-input"
                    style={{
                      backgroundColor:
                        "var(--bg-surface-elevated)",
                      cursor: "not-allowed",
                      color:
                        "var(--text-muted)",
                    }}
                  />
                </div>

                <div>
                  <label className="hrms-label">
                    Role (System Managed)
                  </label>

                  <input
                    type="text"
                    value={displayRole}
                    disabled
                    className="hrms-input"
                    style={{
                      backgroundColor:
                        "var(--bg-surface-elevated)",
                      cursor: "not-allowed",
                      color:
                        "var(--text-muted)",
                    }}
                  />
                </div>
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
                    navigate("/hr/profile")
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
                    "Saving Profile..."
                  ) : (
                    <>
                      <Save size={15} />
                      Save Changes
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