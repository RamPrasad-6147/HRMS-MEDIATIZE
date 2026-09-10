import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Moon,
  Sun,
  ArrowLeft,
  ArrowRight,
  KeyRound,
  Mail,
  RefreshCw,
  Users,
  Calendar,
  BarChart3,
  Settings,
  Briefcase,
  Shield,
  Star,
} from "lucide-react";

import { useAuth } from "../hooks/useAuth";
import "./Login.css";

import { useTheme } from "../../shared/context/ThemeContext";
import { showSuccess, showError } from "../../shared/utils/toast";

function Login() {
  const navigate = useNavigate();
  const { requestOTP, login } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const darkMode = theme === "dark";

  // Stage 1: 'EMAIL', Stage 2: 'OTP'
  const [stage, setStage] = useState("EMAIL");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");

  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);

  // Expiration countdown (in seconds)
  const [countdown, setCountdown] = useState(0);

  // Resend cooldown (in seconds)
  const [resendCooldown, setResendCooldown] = useState(0);

  /*
   * Expiration Timer Effect
   */
  useEffect(() => {
    if (countdown <= 0) return;

    const timer = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(timer);
  }, [countdown]);

  /*
   * Resend Cooldown Effect
   */
  useEffect(() => {
    if (resendCooldown <= 0) return;

    const timer = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(timer);
  }, [resendCooldown]);

  const formatTime = (totalSeconds) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;

    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(
      2,
      "0"
    )}`;
  };

  /*
   * Stage 1: Request OTP
   */
  const handleRequestOTP = async (event) => {
    event?.preventDefault();

    if (!email || !email.trim()) {
      showError("Please enter your email address.");
      return;
    }

    setLoading(true);

    try {
      const response = await requestOTP(email.trim());

      showSuccess(
        response.message || "Verification code sent to your email."
      );

      setStage("OTP");
      setCountdown(response.expires_in_seconds || 600);
      setResendCooldown(60);
    } catch (error) {
      console.error("OTP Request Error:", error);

      if (error.response) {
        showError(
          error.response.data?.detail ||
            "Failed to request verification code."
        );
      } else {
        showError("Unable to connect to the authentication server.");
      }
    } finally {
      setLoading(false);
    }
  };

  /*
   * Resend OTP
   */
  const handleResendOTP = async () => {
    if (resendCooldown > 0) return;

    setResendLoading(true);

    try {
      const response = await requestOTP(email.trim());

      showSuccess(response.message || "New verification code sent.");

      setCountdown(response.expires_in_seconds || 600);
      setResendCooldown(60);
      setOtp("");
    } catch (error) {
      console.error("Resend OTP Error:", error);

      if (error.response) {
        showError(
          error.response.data?.detail ||
            "Failed to resend verification code."
        );
      } else {
        showError("Unable to connect to server.");
      }
    } finally {
      setResendLoading(false);
    }
  };

  /*
   * Stage 2: Verify OTP & Sign In
   */
  const handleVerifyOTP = async (event) => {
    event.preventDefault();

    const cleanOtp = otp.trim();

    if (
      !cleanOtp ||
      cleanOtp.length !== 6 ||
      !/^\d{6}$/.test(cleanOtp)
    ) {
      showError(
        "Please enter a valid 6-digit numeric verification code."
      );
      return;
    }

    setLoading(true);

    try {
      const user = await login(email.trim(), cleanOtp);

      showSuccess("Login successful!");

      /*
       * Role-based navigation based strictly on backend-derived user.role
       */
      if (user.role === "HR") {
        navigate("/hr/dashboard", { replace: true });
        return;
      }

      if (user.role === "EMPLOYEE") {
        navigate("/employee/dashboard", { replace: true });
        return;
      }

      showError(
        "Your account has an unassigned role. Please contact HR."
      );
    } catch (error) {
      console.error("OTP Verification Error:", error);

      if (error.response) {
        showError(
          error.response.data?.detail ||
            "Invalid or expired verification code."
        );
      } else {
        showError("Unable to connect to the authentication server.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (e) => {
    const val = e.target.value.replace(/\D/g, "").slice(0, 6);
    setOtp(val);
  };

  return (
    <main className={`login-page ${darkMode ? "dark" : "light"}`}>

      {/* =========================================================
          ANIMATED HRMS BACKGROUND
          BACKGROUND ONLY
          ========================================================= */}

      <div className="login-background" aria-hidden="true">

        {/* Soft moving gradient lights */}
        <div className="hrms-bg-gradient hrms-bg-gradient-one" />
        <div className="hrms-bg-gradient hrms-bg-gradient-two" />
        <div className="hrms-bg-gradient hrms-bg-gradient-three" />

        {/* Very subtle grid */}
        <div className="hrms-bg-grid" />

        {/* Large soft glows */}
        <div className="hrms-bg-glow hrms-bg-glow-one" />
        <div className="hrms-bg-glow hrms-bg-glow-two" />
        <div className="hrms-bg-glow hrms-bg-glow-three" />

        {/* Thin animated orbital lines */}
        <div className="hrms-bg-orbit hrms-bg-orbit-one" />
        <div className="hrms-bg-orbit hrms-bg-orbit-two" />
        <div className="hrms-bg-orbit hrms-bg-orbit-three" />

        {/* Floating HRMS icons */}

        <div className="hrms-bg-icon hrms-bg-icon-people">
          <Users size={30} />
        </div>

        <div className="hrms-bg-icon hrms-bg-icon-calendar">
          <Calendar size={28} />
        </div>

        <div className="hrms-bg-icon hrms-bg-icon-chart">
          <BarChart3 size={30} />
        </div>

        <div className="hrms-bg-icon hrms-bg-icon-settings">
          <Settings size={29} />
        </div>

        <div className="hrms-bg-icon hrms-bg-icon-briefcase">
          <Briefcase size={28} />
        </div>

        <div className="hrms-bg-icon hrms-bg-icon-security">
          <Shield size={27} />
        </div>

        <div className="hrms-bg-icon hrms-bg-icon-mail">
          <Mail size={27} />
        </div>

        {/* Small moving decorative icons */}

        <div className="hrms-bg-sparkle hrms-bg-sparkle-one">
          <Star size={20} />
        </div>

        <div className="hrms-bg-sparkle hrms-bg-sparkle-two">
          <Star size={16} />
        </div>

        <div className="hrms-bg-sparkle hrms-bg-sparkle-three">
          <Star size={19} />
        </div>

        <div className="hrms-bg-sparkle hrms-bg-sparkle-four">
          <Star size={14} />
        </div>

        {/* Small floating dots */}

        <span className="hrms-bg-dot hrms-bg-dot-one" />
        <span className="hrms-bg-dot hrms-bg-dot-two" />
        <span className="hrms-bg-dot hrms-bg-dot-three" />
        <span className="hrms-bg-dot hrms-bg-dot-four" />
        <span className="hrms-bg-dot hrms-bg-dot-five" />
        <span className="hrms-bg-dot hrms-bg-dot-six" />
        <span className="hrms-bg-dot hrms-bg-dot-seven" />
        <span className="hrms-bg-dot hrms-bg-dot-eight" />

        {/* Bottom flowing waves */}

        <div className="hrms-bg-wave hrms-bg-wave-one" />
        <div className="hrms-bg-wave hrms-bg-wave-two" />
        <div className="hrms-bg-wave hrms-bg-wave-three" />

      </div>

      {/* =========================================================
          HEADER
          EXISTING CODE — NOT CHANGED
          ========================================================= */}

      <header className="login-header">

        <button
          type="button"
          className="login-brand"
          onClick={() => navigate("/")}
        >
          <div className="login-brand-icon">
            <svg viewBox="0 0 64 64" fill="none">
              <circle
                cx="32"
                cy="18"
                r="9"
                stroke="currentColor"
                strokeWidth="4"
              />

              <path
                d="M15 48C15 38.6 22.6 31 32 31C41.4 31 49 38.6 49 48"
                stroke="currentColor"
                strokeWidth="4"
                strokeLinecap="round"
              />

              <path
                d="M11 28C7 29 4.5 32.5 4.5 37"
                stroke="currentColor"
                strokeWidth="3.5"
                strokeLinecap="round"
              />

              <path
                d="M53 28C57 29 59.5 32.5 59.5 37"
                stroke="currentColor"
                strokeWidth="3.5"
                strokeLinecap="round"
              />
            </svg>
          </div>

          <div className="login-brand-text">
            <h1>HRMS</h1>
            <p>Mediatize Tech Pvt Ltd</p>
          </div>
        </button>

        {/* Theme Toggle */}

        <div className="login-theme">

          <span className={darkMode ? "theme-active" : ""}>
            <span className="theme-symbol">
              <Moon size={14} />
            </span>

            <span className="theme-label">
              Dark
            </span>
          </span>

          <button
            type="button"
            className={`theme-toggle ${
              darkMode ? "theme-toggle-dark" : ""
            }`}
            onClick={toggleTheme}
            aria-label="Toggle dark and light mode"
          >
            <span />
          </button>

          <span className={!darkMode ? "theme-active" : ""}>
            <span className="theme-symbol">
              <Sun size={14} />
            </span>

            <span className="theme-label">
              Light
            </span>
          </span>

        </div>

      </header>

      {/* =========================================================
          CONTENT
          EXISTING CODE — NOT CHANGED
          ========================================================= */}

      <section className="login-content">

        <div className="login-wrapper">

          <div className="login-overline">
            <span />
            <p>PASSWORDLESS VERIFICATION</p>
            <span />
          </div>

          <div className="login-card">

            <div className="card-accent" />

            <div className="login-icon-wrapper">

              <div className="login-icon">
                {stage === "EMAIL" ? (
                  <Mail size={28} />
                ) : (
                  <KeyRound size={28} />
                )}
              </div>

            </div>

            <div className="login-heading">

              <h2>
                {stage === "EMAIL" ? (
                  <>
                    Welcome <span>Back</span>
                  </>
                ) : (
                  <>
                    OTP <span>Verification</span>
                  </>
                )}
              </h2>

              <p>
                {stage === "EMAIL"
                  ? "Sign in to access your HRMS workspace"
                  : "We sent a verification code to your registered email."}
              </p>

            </div>

            {/* =====================================================
                STAGE 1: EMAIL INPUT
                ===================================================== */}

            {stage === "EMAIL" && (
              <form
                className="login-form"
                onSubmit={handleRequestOTP}
              >

                <div className="form-group">

                  <label htmlFor="email">
                    Email Address
                  </label>

                  <div className="input-wrapper">

                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      className="input-icon"
                    >
                      <rect
                        x="3"
                        y="5"
                        width="18"
                        height="14"
                        rx="3"
                      />

                      <path d="M3 7L12 13L21 7" />
                    </svg>

                    <input
                      id="email"
                      type="email"
                      name="email"
                      value={email}
                      onChange={(e) =>
                        setEmail(e.target.value)
                      }
                      placeholder="you@mediatize.com"
                      autoComplete="email"
                      required
                    />

                  </div>

                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="login-submit"
                >

                  {loading ? (
                    <>
                      <span className="login-spinner" />
                      <span>Sending OTP...</span>
                    </>
                  ) : (
                    <>
                      <span>Get OTP</span>
                      <ArrowRight size={18} />
                    </>
                  )}

                </button>

              </form>
            )}

            {/* =====================================================
                STAGE 2: OTP VERIFICATION
                ===================================================== */}

            {stage === "OTP" && (
              <form
                className="login-form"
                onSubmit={handleVerifyOTP}
              >

                <div className="form-group">

                  <div className="password-label-row">

                    <label htmlFor="otp">
                      6-Digit Verification Code
                    </label>

                    <span
                      style={{
                        fontSize: "0.8125rem",
                        color:
                          countdown > 0
                            ? "var(--primary-color, #2563eb)"
                            : "var(--danger-color, #ef4444)",
                        fontWeight: 600,
                      }}
                    >
                      {countdown > 0
                        ? `Expires in ${formatTime(countdown)}`
                        : "Code Expired"}
                    </span>

                  </div>

                  <div className="otp-container">

                    <KeyRound
                      className="otp-main-icon"
                      size={18}
                    />

                    <div className="otp-inputs">

                      {Array.from({ length: 6 }).map(
                        (_, index) => (
                          <input
                            key={index}
                            id={`otp-${index}`}
                            className="otp-box"
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]"
                            maxLength={1}
                            value={otp[index] || ""}
                            onChange={(e) => {

                              const value =
                                e.target.value.replace(
                                  /\D/g,
                                  ""
                                );

                              if (!value) return;

                              const newOtp =
                                otp.split("");

                              newOtp[index] = value;

                              const updatedOtp =
                                newOtp
                                  .join("")
                                  .slice(0, 6);

                              handleOtpChange({
                                target: {
                                  value: updatedOtp,
                                },
                              });

                              if (index < 5) {
                                document
                                  .getElementById(
                                    `otp-${index + 1}`
                                  )
                                  ?.focus();
                              }
                            }}
                            onKeyDown={(e) => {

                              if (
                                e.key === "Backspace"
                              ) {

                                if (otp[index]) {

                                  const newOtp =
                                    otp.split("");

                                  newOtp[index] = "";

                                  handleOtpChange({
                                    target: {
                                      value:
                                        newOtp.join(""),
                                    },
                                  });

                                } else if (
                                  index > 0
                                ) {

                                  document
                                    .getElementById(
                                      `otp-${index - 1}`
                                    )
                                    ?.focus();

                                }
                              }
                            }}
                            onPaste={(e) => {

                              e.preventDefault();

                              const pastedOtp =
                                e.clipboardData
                                  .getData("text")
                                  .replace(/\D/g, "")
                                  .slice(0, 6);

                              if (!pastedOtp) return;

                              handleOtpChange({
                                target: {
                                  value: pastedOtp,
                                },
                              });

                              const focusIndex =
                                Math.min(
                                  pastedOtp.length,
                                  5
                                );

                              document
                                .getElementById(
                                  `otp-${focusIndex}`
                                )
                                ?.focus();
                            }}
                            autoComplete={
                              index === 0
                                ? "one-time-code"
                                : "off"
                            }
                            required
                          />
                        )
                      )}

                    </div>

                  </div>

                </div>

                <button
                  type="submit"
                  disabled={
                    loading || countdown <= 0
                  }
                  className="login-submit"
                >

                  {loading ? (
                    <>
                      <span className="login-spinner" />
                      <span>Verifying...</span>
                    </>
                  ) : (
                    <>
                      <span>
                        Verify &amp; Sign In
                      </span>

                      <ArrowRight size={18} />
                    </>
                  )}

                </button>

                <div
                  className="otp-actions"
                  style={{
                    display: "flex",
                    justifyContent:
                      "space-between",
                    alignItems: "center",
                    marginTop: "1rem",
                  }}
                >

                  <button
                    type="button"
                    className="forgot-button"
                    onClick={() => {
                      setStage("EMAIL");
                      setOtp("");
                    }}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "0.35rem",
                    }}
                  >
                    <ArrowLeft size={14} />
                    Change Email
                  </button>

                  <button
                    type="button"
                    className="forgot-button"
                    disabled={
                      resendCooldown > 0 ||
                      resendLoading
                    }
                    onClick={handleResendOTP}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "0.35rem",
                    }}
                  >
                    <RefreshCw
                      size={14}
                      className={
                        resendLoading
                          ? "spin"
                          : ""
                      }
                    />

                    {resendCooldown > 0
                      ? `Resend OTP (${resendCooldown}s)`
                      : "Resend OTP"}
                  </button>

                </div>

              </form>
            )}

            {/* Security message */}

            <div className="login-security">

              <svg viewBox="0 0 24 24" fill="none">

                <path
                  d="M12 3L20 6V11C20 16.2 16.7 20.4 12 22C7.3 20.4 4 16.2 4 11V6L12 3Z"
                />

                <path d="M9 12L11 14L15 10" />

              </svg>

              <span>
                Protected by enterprise-grade security
              </span>

            </div>

          </div>

          {/* Back button */}

          <button
            type="button"
            className="back-button"
            onClick={() => navigate("/")}
          >
            <ArrowLeft size={16} />
            Back to Welcome
          </button>

          {/* Footer */}

          <p className="login-footer">
            &copy; 2026 Mediatize Tech Pvt Ltd.
            All rights reserved.
          </p>

        </div>

      </section>

    </main>
  );
}

export default Login;