import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import Sidebar from "./Sidebar";
import Header from "./Header";
import MobileMenu from "./MobileMenu";
import "./AppLayout.css";

export default function AppLayout({ children, title }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(() => {
    try {
      return localStorage.getItem("hrms_sidebar_collapsed") === "true";
    } catch {
      return false;
    }
  });

  const toggleSidebarCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("hrms_sidebar_collapsed", String(next));
      } catch (err) {
        console.error("Failed to save sidebar state to localStorage:", err);
      }
      return next;
    });
  };

  // Close mobile menu whenever location changes
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  return (
    <div className={`hrms-app-container ${isCollapsed ? "collapsed" : ""}`}>
      {/* Desktop Sidebar (hidden on screens < 1024px) */}
      <Sidebar
        isCollapsed={isCollapsed}
        onToggleCollapse={toggleSidebarCollapse}
      />

      {/* Mobile Navigation Drawer & Backdrop (< 1024px) */}
      <MobileMenu
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
      />

      {/* Main Content Area */}
      <div className="hrms-main-wrapper">
        <Header
          pageTitle={title}
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
        />
        <main className="hrms-main-content">{children}</main>
      </div>
    </div>
  );
}
