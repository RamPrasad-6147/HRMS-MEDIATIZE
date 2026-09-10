import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  BarChart3,
  BellRing,
  Building2,
  CalendarDays,
  Check,
  Moon,
  ShieldCheck,
  Sparkles,
  Sun,
  UsersRound,
  Workflow,
} from "lucide-react";
import { useTheme } from "../../shared/context/ThemeContext";

function Welcome() {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();

  const darkMode = theme === "dark";

  const handleGetStarted = () => {
    navigate("/login");
  };

  const capabilities = [
    {
      icon: UsersRound,
      title: "Employee Management",
      description:
        "Keep employee information organized and accessible throughout the employee lifecycle.",
    },
    {
      icon: BarChart3,
      title: "Workforce Insights",
      description:
        "Get a clearer view of workforce activity and make informed HR decisions.",
    },
    {
      icon: CalendarDays,
      title: "Leave & Attendance",
      description:
        "Manage everyday workforce schedules, leave requests and attendance with ease.",
    },
    {
      icon: Workflow,
      title: "Connected HR Workflows",
      description:
        "Bring essential HR processes together in one structured workspace.",
    },
  ];

  const trustPoints = [
    "Role-based access",
    "Centralized employee information",
    "Organized HR workflows",
  ];

  return (
    <main
      className={`min-h-screen w-full overflow-x-hidden ${
        darkMode
          ? "bg-[#07110f] text-white"
          : "bg-[#f3f8f6] text-slate-900"
      }`}
    >
      {/* =========================================================
          GLOBAL BACKGROUND
          BACKGROUND ONLY — DOES NOT AFFECT COMPONENT LOGIC
          ========================================================= */}

      <div
        className={`welcome-page-background ${
          darkMode
            ? "welcome-page-background-dark"
            : "welcome-page-background-light"
        }`}
        aria-hidden="true"
      >
        {/* Base background */}
        <div className="welcome-background-base" />

        {/* Technical grid */}
        <div className="welcome-background-grid" />

        {/* Soft atmospheric glows */}
        <div className="welcome-background-glow welcome-background-glow-one" />
        <div className="welcome-background-glow welcome-background-glow-two" />
        <div className="welcome-background-glow welcome-background-glow-three" />

        {/* Large orbital circles */}
        <div className="welcome-background-orbit welcome-background-orbit-one" />
        <div className="welcome-background-orbit welcome-background-orbit-two" />
        <div className="welcome-background-orbit welcome-background-orbit-three" />

        {/* Moving light fields */}
        <div className="welcome-background-light-field welcome-background-light-field-one" />
        <div className="welcome-background-light-field welcome-background-light-field-two" />

        {/* Floating dots */}
        <span className="welcome-background-dot welcome-background-dot-one" />
        <span className="welcome-background-dot welcome-background-dot-two" />
        <span className="welcome-background-dot welcome-background-dot-three" />
        <span className="welcome-background-dot welcome-background-dot-four" />
        <span className="welcome-background-dot welcome-background-dot-five" />
        <span className="welcome-background-dot welcome-background-dot-six" />
        <span className="welcome-background-dot welcome-background-dot-seven" />
        <span className="welcome-background-dot welcome-background-dot-eight" />
        <span className="welcome-background-dot welcome-background-dot-nine" />
        <span className="welcome-background-dot welcome-background-dot-ten" />

        {/* Small HR-style decorative symbols */}
        <span className="welcome-background-symbol welcome-background-symbol-one">
          ✦
        </span>

        <span className="welcome-background-symbol welcome-background-symbol-two">
          +
        </span>

        <span className="welcome-background-symbol welcome-background-symbol-three">
          ✦
        </span>

        <span className="welcome-background-symbol welcome-background-symbol-four">
          +
        </span>

        {/* Bottom flowing lines */}
        <div className="welcome-background-wave welcome-background-wave-one" />
        <div className="welcome-background-wave welcome-background-wave-two" />

        {/* Background-only CSS */}
        <style>{`
          /* =====================================================
             BACKGROUND CONTAINER
             ===================================================== */

          .welcome-page-background {
            position: fixed;
            inset: 0;
            width: 100%;
            height: 100%;
            overflow: hidden;
            pointer-events: none;
            z-index: 0;
            isolation: isolate;
          }

          /* =====================================================
             BASE
             ===================================================== */

          .welcome-background-base {
            position: absolute;
            inset: 0;
            width: 100%;
            height: 100%;
          }

          .welcome-page-background-dark
            .welcome-background-base {
            background:
              radial-gradient(
                circle at 80% 15%,
                rgba(16, 185, 129, 0.075),
                transparent 30%
              ),
              radial-gradient(
                circle at 15% 82%,
                rgba(20, 184, 166, 0.055),
                transparent 32%
              ),
              #07110f;
          }

          .welcome-page-background-light
            .welcome-background-base {
            background:
              radial-gradient(
                circle at 80% 15%,
                rgba(16, 185, 129, 0.10),
                transparent 30%
              ),
              radial-gradient(
                circle at 15% 82%,
                rgba(20, 184, 166, 0.065),
                transparent 32%
              ),
              #f3f8f6;
          }

          /* =====================================================
             TECHNICAL GRID
             ===================================================== */

          .welcome-background-grid {
            position: absolute;
            inset: 0;

            background-image:
              linear-gradient(
                rgba(52, 211, 153, 0.055) 1px,
                transparent 1px
              ),
              linear-gradient(
                90deg,
                rgba(52, 211, 153, 0.055) 1px,
                transparent 1px
              );

            background-size: 48px 48px;

            opacity: 0.8;

            mask-image:
              linear-gradient(
                to bottom,
                black 0%,
                rgba(0, 0, 0, 0.9) 55%,
                rgba(0, 0, 0, 0.55) 82%,
                transparent 100%
              );

            -webkit-mask-image:
              linear-gradient(
                to bottom,
                black 0%,
                rgba(0, 0, 0, 0.9) 55%,
                rgba(0, 0, 0, 0.55) 82%,
                transparent 100%
              );
          }

          .welcome-page-background-light
            .welcome-background-grid {
            opacity: 0.34;

            background-image:
              linear-gradient(
                rgba(16, 185, 129, 0.08) 1px,
                transparent 1px
              ),
              linear-gradient(
                90deg,
                rgba(16, 185, 129, 0.08) 1px,
                transparent 1px
              );
          }

          /* =====================================================
             LARGE GLOWS
             ===================================================== */

          .welcome-background-glow {
            position: absolute;
            border-radius: 50%;
            pointer-events: none;
            filter: blur(45px);
            will-change: transform;
          }

          .welcome-background-glow-one {
            width: 620px;
            height: 620px;

            top: -350px;
            right: -190px;

            background:
              radial-gradient(
                circle,
                rgba(16, 185, 129, 0.15) 0%,
                rgba(16, 185, 129, 0.04) 42%,
                transparent 72%
              );

            animation:
              welcomeBackgroundGlowOne
              18s
              ease-in-out
              infinite
              alternate;
          }

          .welcome-background-glow-two {
            width: 540px;
            height: 540px;

            left: -280px;
            bottom: -320px;

            background:
              radial-gradient(
                circle,
                rgba(20, 184, 166, 0.12) 0%,
                rgba(20, 184, 166, 0.035) 42%,
                transparent 72%
              );

            animation:
              welcomeBackgroundGlowTwo
              21s
              ease-in-out
              infinite
              alternate;
          }

          .welcome-background-glow-three {
            width: 430px;
            height: 430px;

            left: 38%;
            top: 36%;

            background:
              radial-gradient(
                circle,
                rgba(52, 211, 153, 0.045),
                transparent 72%
              );

            animation:
              welcomeBackgroundGlowThree
              16s
              ease-in-out
              infinite
              alternate;
          }

          @keyframes welcomeBackgroundGlowOne {
            0% {
              transform:
                translate3d(0, 0, 0)
                scale(1);
            }

            100% {
              transform:
                translate3d(-45px, 55px, 0)
                scale(1.09);
            }
          }

          @keyframes welcomeBackgroundGlowTwo {
            0% {
              transform:
                translate3d(0, 0, 0)
                scale(1);
            }

            100% {
              transform:
                translate3d(50px, -45px, 0)
                scale(1.1);
            }
          }

          @keyframes welcomeBackgroundGlowThree {
            0% {
              transform:
                translate3d(0, 0, 0)
                scale(0.92);

              opacity: 0.3;
            }

            50% {
              transform:
                translate3d(45px, -30px, 0)
                scale(1.08);

              opacity: 0.7;
            }

            100% {
              transform:
                translate3d(-35px, 35px, 0)
                scale(1);

              opacity: 0.4;
            }
          }

          /* =====================================================
             ORBITAL LINES
             ===================================================== */

          .welcome-background-orbit {
            position: absolute;

            border-radius: 50%;

            border:
              1px solid
              rgba(52, 211, 153, 0.075);

            pointer-events: none;
          }

          .welcome-background-orbit-one {
            width: 760px;
            height: 760px;

            right: -390px;
            top: -390px;

            animation:
              welcomeBackgroundOrbitOne
              34s
              linear
              infinite;
          }

          .welcome-background-orbit-two {
            width: 620px;
            height: 620px;

            left: -310px;
            bottom: -310px;

            border-color:
              rgba(20, 184, 166, 0.065);

            animation:
              welcomeBackgroundOrbitTwo
              40s
              linear
              infinite
              reverse;
          }

          .welcome-background-orbit-three {
            width: 1050px;
            height: 470px;

            left: 30%;
            top: 45%;

            transform: rotate(-20deg);

            border-color:
              rgba(52, 211, 153, 0.045);

            animation:
              welcomeBackgroundOrbitThree
              28s
              ease-in-out
              infinite
              alternate;
          }

          @keyframes welcomeBackgroundOrbitOne {
            from {
              transform: rotate(0deg);
            }

            to {
              transform: rotate(360deg);
            }
          }

          @keyframes welcomeBackgroundOrbitTwo {
            from {
              transform: rotate(0deg);
            }

            to {
              transform: rotate(360deg);
            }
          }

          @keyframes welcomeBackgroundOrbitThree {
            0% {
              transform:
                translate3d(-20px, 0, 0)
                rotate(-20deg);
            }

            50% {
              transform:
                translate3d(25px, -18px, 0)
                rotate(-16deg);
            }

            100% {
              transform:
                translate3d(-15px, 22px, 0)
                rotate(-24deg);
            }
          }

          /* =====================================================
             MOVING LIGHT FIELDS
             ===================================================== */

          .welcome-background-light-field {
            position: absolute;

            border-radius: 50%;

            filter: blur(55px);

            pointer-events: none;

            opacity: 0.4;
          }

          .welcome-background-light-field-one {
            width: 280px;
            height: 280px;

            left: 17%;
            top: 22%;

            background:
              rgba(16, 185, 129, 0.065);

            animation:
              welcomeLightFieldOne
              15s
              ease-in-out
              infinite;
          }

          .welcome-background-light-field-two {
            width: 330px;
            height: 330px;

            right: 17%;
            bottom: 17%;

            background:
              rgba(20, 184, 166, 0.055);

            animation:
              welcomeLightFieldTwo
              19s
              ease-in-out
              infinite;
          }

          @keyframes welcomeLightFieldOne {
            0%,
            100% {
              transform:
                translate3d(0, 0, 0);
            }

            50% {
              transform:
                translate3d(75px, -45px, 0);
            }
          }

          @keyframes welcomeLightFieldTwo {
            0%,
            100% {
              transform:
                translate3d(0, 0, 0);
            }

            50% {
              transform:
                translate3d(-70px, 45px, 0);
            }
          }

          /* =====================================================
             FLOATING DOTS
             ===================================================== */

          .welcome-background-dot {
            position: absolute;

            width: 4px;
            height: 4px;

            border-radius: 50%;

            background:
              rgba(110, 231, 183, 0.62);

            box-shadow:
              0 0 11px
              rgba(52, 211, 153, 0.4);

            animation:
              welcomeBackgroundDot
              7s
              ease-in-out
              infinite;
          }

          .welcome-background-dot-one {
            left: 5%;
            top: 17%;
            animation-delay: -1s;
          }

          .welcome-background-dot-two {
            left: 13%;
            top: 58%;
            animation-delay: -4s;
          }

          .welcome-background-dot-three {
            left: 24%;
            top: 30%;
            animation-delay: -2s;
          }

          .welcome-background-dot-four {
            left: 35%;
            top: 14%;
            animation-delay: -6s;
          }

          .welcome-background-dot-five {
            left: 48%;
            top: 70%;
            animation-delay: -3s;
          }

          .welcome-background-dot-six {
            left: 61%;
            top: 27%;
            animation-delay: -5s;
          }

          .welcome-background-dot-seven {
            left: 73%;
            top: 62%;
            animation-delay: -1.5s;
          }

          .welcome-background-dot-eight {
            left: 83%;
            top: 20%;
            animation-delay: -7s;
          }

          .welcome-background-dot-nine {
            left: 91%;
            top: 76%;
            animation-delay: -2.5s;
          }

          .welcome-background-dot-ten {
            left: 67%;
            top: 88%;
            animation-delay: -5.5s;
          }

          @keyframes welcomeBackgroundDot {
            0%,
            100% {
              transform:
                translate3d(0, 0, 0);

              opacity: 0.22;
            }

            50% {
              transform:
                translate3d(0, -18px, 0);

              opacity: 0.82;
            }
          }

          /* =====================================================
             DECORATIVE SYMBOLS
             ===================================================== */

          .welcome-background-symbol {
            position: absolute;

            color:
              rgba(110, 231, 183, 0.45);

            font-size: 18px;

            font-weight: 400;

            text-shadow:
              0 0 14px
              rgba(52, 211, 153, 0.3);

            animation:
              welcomeBackgroundSymbol
              8s
              ease-in-out
              infinite;
          }

          .welcome-background-symbol-one {
            left: 9%;
            top: 35%;
          }

          .welcome-background-symbol-two {
            left: 52%;
            top: 13%;
            animation-delay: -3s;
          }

          .welcome-background-symbol-three {
            right: 17%;
            bottom: 28%;
            animation-delay: -5s;
          }

          .welcome-background-symbol-four {
            right: 7%;
            top: 48%;
            animation-delay: -7s;
          }

          @keyframes welcomeBackgroundSymbol {
            0%,
            100% {
              transform:
                translate3d(0, 0, 0)
                rotate(0deg);

              opacity: 0.22;
            }

            50% {
              transform:
                translate3d(0, -13px, 0)
                rotate(45deg);

              opacity: 0.75;
            }
          }

          /* =====================================================
             BOTTOM FLOWING LINES
             ===================================================== */

          .welcome-background-wave {
            position: absolute;

            width: 82%;
            height: 200px;

            left: 9%;
            bottom: -155px;

            border-top:
              1px solid
              rgba(52, 211, 153, 0.08);

            border-radius: 50%;

            animation:
              welcomeBackgroundWave
              13s
              ease-in-out
              infinite;
          }

          .welcome-background-wave-one {
            transform: rotate(-4deg);
            opacity: 0.8;
          }

          .welcome-background-wave-two {
            width: 68%;

            left: 22%;
            bottom: -178px;

            transform: rotate(4deg);

            opacity: 0.35;

            animation-delay: -5s;
          }

          @keyframes welcomeBackgroundWave {
            0%,
            100% {
              transform:
                translate3d(0, 0, 0)
                rotate(-4deg);
            }

            50% {
              transform:
                translate3d(-30px, -14px, 0)
                rotate(-2deg);
            }
          }

          /* =====================================================
             LIGHT MODE
             ===================================================== */

          .welcome-page-background-light
            .welcome-background-orbit {
            border-color:
              rgba(16, 185, 129, 0.085);
          }

          .welcome-page-background-light
            .welcome-background-dot {
            background:
              rgba(5, 150, 105, 0.3);

            box-shadow:
              0 0 9px
              rgba(5, 150, 105, 0.18);
          }

          .welcome-page-background-light
            .welcome-background-symbol {
            color:
              rgba(5, 150, 105, 0.3);

            text-shadow:
              0 0 10px
              rgba(5, 150, 105, 0.14);
          }

          /* =====================================================
             TABLET
             ===================================================== */

          @media (max-width: 1024px) {
            .welcome-background-orbit-three {
              width: 800px;
            }

            .welcome-background-grid {
              background-size: 42px 42px;
            }

            .welcome-background-glow-one {
              width: 500px;
              height: 500px;
            }

            .welcome-background-glow-two {
              width: 440px;
              height: 440px;
            }
          }

          /* =====================================================
             MOBILE
             ===================================================== */

          @media (max-width: 640px) {
            .welcome-background-grid {
              background-size: 34px 34px;
            }

            .welcome-background-orbit-one {
              width: 500px;
              height: 500px;
            }

            .welcome-background-orbit-two {
              width: 420px;
              height: 420px;
            }

            .welcome-background-orbit-three {
              width: 580px;
              height: 300px;
            }

            .welcome-background-glow-one {
              width: 360px;
              height: 360px;
            }

            .welcome-background-glow-two {
              width: 330px;
              height: 330px;
            }

            .welcome-background-light-field {
              filter: blur(45px);
            }

            .welcome-background-dot {
              width: 3px;
              height: 3px;
            }
          }

          /* =====================================================
             REDUCED MOTION
             ===================================================== */

          @media (prefers-reduced-motion: reduce) {
            .welcome-background-glow,
            .welcome-background-orbit,
            .welcome-background-light-field,
            .welcome-background-dot,
            .welcome-background-symbol,
            .welcome-background-wave {
              animation: none !important;
            }
          }
        `}</style>
      </div>

      {/* =========================================================
          EXISTING PAGE CONTENT
          ========================================================= */}

      <div className="relative z-10 grid min-h-screen w-full grid-cols-1 lg:grid-cols-[48%_52%]">

        {/* =====================================================
            LEFT SIDE
            ===================================================== */}

        <section
          className={`relative flex min-h-[640px] flex-col overflow-hidden px-5 py-5 sm:px-8 sm:py-7 md:px-10 lg:h-screen lg:min-h-0 lg:px-10 xl:px-14 2xl:px-16 ${
            darkMode
              ? "bg-transparent"
              : "bg-[#0b2923]"
          }`}
        >

          {/* Header */}

          <header className="relative z-10 flex items-center justify-between gap-4">

            <div className="flex min-w-0 items-center gap-3">

              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-emerald-300/20 bg-emerald-400/10 sm:h-11 sm:w-11">

                <UsersRound
                  className="h-5 w-5 text-emerald-300"
                  strokeWidth={1.8}
                />

              </div>

              <div className="min-w-0">

                <p className="text-sm font-bold tracking-tight text-white sm:text-base">
                  HRMS
                </p>

                <p className="truncate text-[8px] font-medium uppercase tracking-[0.12em] text-emerald-100/50 sm:text-[9px]">
                  Human Resource Management System
                </p>

              </div>

            </div>

            <div className="hidden items-center gap-2 rounded-full border border-emerald-300/10 bg-emerald-300/[0.05] px-3 py-2 text-[9px] font-medium text-emerald-100/60 sm:flex">

              <ShieldCheck className="h-3.5 w-3.5 text-emerald-300" />

              Secure HR workspace

            </div>

          </header>

          {/* Main content */}

          <div className="relative z-10 flex flex-1 items-center py-10 sm:py-12 lg:py-8">

            <div className="w-full max-w-xl">

              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-emerald-300/15 bg-emerald-300/[0.06] px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.16em] text-emerald-200">

                <Sparkles className="h-3.5 w-3.5" />

                Smarter HR management

              </div>

              <h1 className="max-w-2xl text-[clamp(32px,8vw,58px)] font-extrabold leading-[1.06] tracking-[-0.045em] text-white sm:text-[clamp(40px,6vw,60px)] lg:text-[clamp(38px,4vw,58px)]">

                Put your people at the

                <span className="block text-emerald-300">
                  center of everything.
                </span>

              </h1>

              <p className="mt-5 max-w-xl text-xs leading-5 text-emerald-50/65 sm:text-sm sm:leading-6 lg:text-[13px] xl:text-[15px]">
                Manage employees, HR processes and workforce information
                through one clear and dependable platform built for modern
                teams.
              </p>

              {/* Capability cards */}

              <div className="mt-7 grid grid-cols-1 gap-3 sm:grid-cols-2">

                {capabilities.map(
                  ({ icon: Icon, title, description }) => (
                    <div
                      key={title}
                      className="rounded-xl border border-white/[0.08] bg-white/[0.035] p-3.5"
                    >

                      <div className="flex items-start gap-3">

                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-400/10 text-emerald-300">

                          <Icon
                            className="h-4 w-4"
                            strokeWidth={1.8}
                          />

                        </div>

                        <div className="min-w-0">

                          <h2 className="text-xs font-bold text-white sm:text-sm">
                            {title}
                          </h2>

                          <p className="mt-1 text-[10px] leading-4 text-emerald-50/45 sm:text-[11px]">
                            {description}
                          </p>

                        </div>

                      </div>

                    </div>
                  )
                )}

              </div>

            </div>

          </div>

          {/* Footer */}

          <footer className="relative z-10 flex shrink-0 flex-col gap-2 border-t border-white/[0.08] pt-4 sm:flex-row sm:items-center sm:justify-between">

            <div className="flex items-center gap-2 text-[10px] font-semibold text-white/75 sm:text-[11px]">

              <Building2 className="h-4 w-4 text-emerald-300" />

              Mediatize Tech Pvt Ltd

            </div>

            <p className="text-[8px] text-white/35 sm:text-[9px]">
              © 2026 Mediatize Tech Pvt Ltd. All rights reserved.
            </p>

          </footer>

        </section>

        {/* =====================================================
            RIGHT SIDE
            ===================================================== */}

        <section
          className={`relative flex min-h-[650px] flex-col overflow-hidden px-5 py-5 sm:px-8 sm:py-7 md:px-10 lg:h-screen lg:min-h-0 lg:px-10 xl:px-14 2xl:px-16 ${
            darkMode
              ? "bg-transparent"
              : "bg-white"
          }`}
        >

          {/* Theme toggle */}

          <div className="relative z-10 flex justify-end">

            <div
              className={`flex items-center gap-2 rounded-full border px-2.5 py-1.5 text-[9px] ${
                darkMode
                  ? "border-white/10 bg-white/[0.035] text-slate-400"
                  : "border-slate-200 bg-slate-50 text-slate-500"
              }`}
            >

              <Moon
                className={`h-3.5 w-3.5 ${
                  darkMode
                    ? "text-emerald-300"
                    : "text-slate-400"
                }`}
              />

              <button
                type="button"
                onClick={toggleTheme}
                aria-label="Switch between dark and light mode"
                className={`relative h-6 w-10 rounded-full border focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 ${
                  darkMode
                    ? "border-emerald-300/20 bg-emerald-400/15"
                    : "border-slate-200 bg-slate-200"
                }`}
              >

                <span
                  className={`absolute top-1 h-4 w-4 rounded-full shadow-sm ${
                    darkMode
                      ? "left-5 bg-emerald-300"
                      : "left-1 bg-slate-600"
                  }`}
                />

              </button>

              <Sun
                className={`h-3.5 w-3.5 ${
                  !darkMode
                    ? "text-amber-500"
                    : "text-slate-500"
                }`}
              />

            </div>

          </div>

          {/* Right content */}

          <div className="relative z-10 flex flex-1 items-center py-8 sm:py-10 lg:py-6">

            <div className="mx-auto w-full max-w-xl">

              {/* Welcome identity */}

              <div className="mb-7 flex items-center gap-4">

                <div
                  className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border ${
                    darkMode
                      ? "border-emerald-300/15 bg-emerald-400/10"
                      : "border-emerald-100 bg-emerald-50"
                  }`}
                >

                  <UsersRound
                    className="h-7 w-7 text-emerald-500"
                    strokeWidth={1.7}
                  />

                </div>

                <div className="min-w-0">

                  <p
                    className={`text-[9px] font-bold uppercase tracking-[0.18em] ${
                      darkMode
                        ? "text-emerald-400"
                        : "text-emerald-600"
                    }`}
                  >
                    Welcome to HRMS
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    Your centralized HR workspace
                  </p>

                </div>

              </div>

              {/* Main heading */}

              <h2
                className={`max-w-lg text-[clamp(32px,8vw,52px)] font-extrabold leading-[1.06] tracking-[-0.045em] sm:text-[clamp(40px,6vw,54px)] lg:text-[clamp(38px,4vw,52px)] ${
                  darkMode
                    ? "text-white"
                    : "text-slate-950"
                }`}
              >

                Everything HR needs,

                <span
                  className={`block ${
                    darkMode
                      ? "text-emerald-400"
                      : "text-emerald-600"
                  }`}
                >
                  in one place.
                </span>

              </h2>

              {/* Description */}

              <p
                className={`mt-5 max-w-lg text-xs leading-5 sm:text-sm sm:leading-6 md:text-[15px] ${
                  darkMode
                    ? "text-slate-400"
                    : "text-slate-500"
                }`}
              >
                Sign in to continue to your HRMS workspace and manage your
                everyday HR operations with clarity and confidence.
              </p>

              {/* Login button */}

              <button
                type="button"
                onClick={handleGetStarted}
                className={`mt-7 flex w-full items-center gap-4 rounded-2xl px-5 py-4 text-left text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 ${
                  darkMode
                    ? "bg-emerald-600"
                    : "bg-[#0b2923]"
                }`}
              >

                <span
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                    darkMode
                      ? "bg-white/10"
                      : "bg-emerald-400/10"
                  }`}
                >

                  <ArrowRight
                    className={`h-5 w-5 ${
                      darkMode
                        ? "text-white"
                        : "text-emerald-300"
                    }`}
                  />

                </span>

                <span className="flex min-w-0 flex-1 flex-col">

                  <span className="text-sm font-bold sm:text-base">
                    Sign in to your workspace
                  </span>

                  <span className="mt-0.5 text-[10px] text-white/55 sm:text-xs">
                    Continue securely to your HRMS account
                  </span>

                </span>

                <ArrowRight className="h-5 w-5 shrink-0 text-white/60" />

              </button>

              {/* Trust section */}

              <div
                className={`mt-6 rounded-2xl border p-4 ${
                  darkMode
                    ? "border-white/[0.08] bg-white/[0.025]"
                    : "border-slate-200 bg-slate-50/70"
                }`}
              >

                <div className="flex items-center gap-2">

                  <ShieldCheck className="h-4 w-4 text-emerald-500" />

                  <p
                    className={`text-xs font-bold ${
                      darkMode
                        ? "text-white"
                        : "text-slate-800"
                    }`}
                  >
                    Built for dependable HR operations
                  </p>

                </div>

                <div className="mt-3 grid gap-2 sm:grid-cols-3 sm:gap-x-8">

                  {trustPoints.map((point) => (
                    <div
                      key={point}
                      className={`flex items-start gap-2 text-[10px] leading-4 ${
                        darkMode
                          ? "text-slate-500"
                          : "text-slate-500"
                      }`}
                    >

                      <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />

                      <span>{point}</span>

                    </div>
                  ))}

                </div>

              </div>

              {/* Information card */}

              <div
                className={`mt-5 flex items-center gap-3 rounded-2xl border px-4 py-3 ${
                  darkMode
                    ? "border-white/[0.07] bg-white/[0.02]"
                    : "border-slate-200 bg-white"
                }`}
              >

                <div
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                    darkMode
                      ? "bg-emerald-400/10"
                      : "bg-emerald-50"
                  }`}
                >

                  <BellRing className="h-4 w-4 text-emerald-500" />

                </div>

                <div className="min-w-0">

                  <p
                    className={`text-[11px] font-semibold ${
                      darkMode
                        ? "text-white"
                        : "text-slate-800"
                    }`}
                  >
                    Stay connected
                  </p>

                  <p
                    className={`mt-0.5 text-[10px] leading-4 ${
                      darkMode
                        ? "text-slate-500"
                        : "text-slate-500"
                    }`}
                  >
                    Keep important employee and workplace updates organized.
                  </p>

                </div>

              </div>

            </div>

          </div>

          {/* Footer */}

          <footer
            className={`relative z-10 shrink-0 border-t pt-4 text-center text-[9px] ${
              darkMode
                ? "border-white/[0.07] text-slate-600"
                : "border-slate-100 text-slate-400"
            }`}
          >
            A simpler way to manage people, processes and HR operations.
          </footer>

        </section>

      </div>
    </main>
  );
}

export default Welcome;