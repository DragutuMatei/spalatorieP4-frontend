import React, { useEffect, useState, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import ThemeToggle from "./ThemeToggle";
import { useAuth } from "../utils/AuthContext";
import Logo from "./Logo";
import "../assets/styles/components/Navbar.scss";
import "./NavbarDropdown.scss";

function Navbar() {
  const { user, loading, signUserOut } = useAuth();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const mobileMenuRef = useRef(null);
  const dropdownRef = useRef(null);

  // Lista de documente disponibile
  const documents = [
    {
      name: "Curatarea sitelor",
      file: "Curatarea sitelor.pdf",
    },
    {
      name: "Ghid de utilizare a platformei de programari",
      file: "Ghid de utilizare a platformei de programari.pdf",
    },
    { name: "Ghid uscator", file: "Ghid uscator.pdf" },
    { name: "Ghidul ciclurilor de spalare", file: "Ghidul ciclurilor de spalare.pdf" },
    { name: "Manual Uscator", file: "Manual Uscator.pdf" },
    {
      name: "Regulament de utilizare a spalatoriei",
      file: "Regulament de utilizare a spalatoriei.pdf",
    },
  ];

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  const toggleDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };

  const closeDropdown = () => {
    setIsDropdownOpen(false);
  };

  const downloadDocument = (filename) => {
    try {
      const publicUrl = process.env.PUBLIC_URL || "";
      const documentUrl = `${publicUrl}/assets/docs/${filename}`;

      const link = document.createElement("a");
      link.href = documentUrl;
      link.setAttribute("download", filename);
      link.setAttribute("rel", "noopener noreferrer");

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      closeDropdown();
    } catch (error) {
      console.error("Failed to download document", error);
      window.open(
        `${process.env.PUBLIC_URL || ""}/assets/docs/${filename}`,
        "_blank",
        "noopener,noreferrer"
      );
    }
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        closeDropdown();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="navbar">
      <div className="navbar__container">
        {/* Logo */}
        <Link
          to={user ? "/dashboard" : "/"}
          className="navbar__logo"
          onClick={closeMobileMenu}
        >
          <Logo />
          <span className="navbar__brand">Spălătorie P4</span>
        </Link>

        {/* Desktop Navigation */}
        {!loading && user && (
          <div className="navbar__nav d-mobile-none">
            <Link
              to="/dashboard"
              className={`navbar__link ${
                isActive("/dashboard") ? "navbar__link--active" : ""
              }`}
            >
              Programări
            </Link>
            <Link
              to="/my-books"
              className={`navbar__link ${
                isActive("/my-books") ? "navbar__link--active" : ""
              }`}
            >
              Programările mele
            </Link>
            <Link
              to="/profile"
              className={`navbar__link ${
                isActive("/profile") ? "navbar__link--active" : ""
              }`}
            >
              Profil
            </Link>
            <div className="navbar__dropdown" ref={dropdownRef}>
              <button
                className="navbar__link navbar__link--dropdown"
                onClick={toggleDropdown}
                aria-expanded={isDropdownOpen}
              >
                Regulamente
                <svg
                  className={`dropdown-icon ${
                    isDropdownOpen ? "dropdown-icon--open" : ""
                  }`}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                >
                  <polyline points="6,9 12,15 18,9" />
                </svg>
              </button>

              {isDropdownOpen && (
                <div className="navbar__dropdown-menu">
                  {documents.map((doc, index) => (
                    <button
                      key={index}
                      className="navbar__dropdown-item"
                      onClick={() => downloadDocument(doc.file)}
                    >
                      <svg
                        className="download-icon"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                      >
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="7,10 12,15 17,10" />
                        <line x1="12" y1="15" x2="12" y2="3" />
                      </svg>
                      {doc.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {user.role === "admin" && (
              <Link
                to="/admin"
                className={`navbar__link navbar__link--admin ${
                  isActive("/admin") ? "navbar__link--active" : ""
                }`}
              >
                Admin
              </Link>
            )}
          </div>
        )}

        {/* Right side actions */}
        <div className="navbar__actions">
          <ThemeToggle />

          {!loading && user ? (
            <>
              {/* User info */}
              <div className="navbar__user d-mobile-none">
                <img
                  src={user.google?.photoURL}
                  alt={user.numeComplet}
                  className="navbar__avatar"
                />
                <span className="navbar__username">{user.numeComplet}</span>
                {!user.validate && (
                  <span className="navbar__status navbar__status--pending">
                    Pending
                  </span>
                )}
              </div>

              {/* Logout button */}
              <button
                className="btn btn-secondary d-mobile-none"
                onClick={async () => await signUserOut()}
              >
                Logout
              </button>

              {/* Mobile menu button */}
              <button
                className="navbar__mobile-toggle d-desktop-none"
                onClick={toggleMobileMenu}
                aria-label="Toggle mobile menu"
              >
                <span
                  className={`navbar__hamburger ${
                    isMobileMenuOpen ? "navbar__hamburger--open" : ""
                  }`}
                >
                  <span></span>
                  <span></span>
                  <span></span>
                </span>
              </button>
            </>
          ) : null}
        </div>
      </div>

      {/* Mobile Menu */}
      {!loading && user && (
        <div
          className={`navbar__mobile ${
            isMobileMenuOpen ? "navbar__mobile--open" : ""
          }`}
        >
          <div className="navbar__mobile-header">
            <img
              src={user.google?.photoURL}
              alt={user.numeComplet}
              className="navbar__avatar"
            />
            <div className="navbar__user-info">
              <span className="navbar__username">{user.numeComplet}</span>
              {!user.validate && (
                <span className="navbar__status navbar__status--pending">
                  Pending Approval
                </span>
              )}
            </div>
          </div>

          <div className="navbar__mobile-nav">
            <Link
              to="/dashboard"
              className={`navbar__mobile-link ${
                isActive("/dashboard") ? "navbar__mobile-link--active" : ""
              }`}
              onClick={closeMobileMenu}
            >
              Programări
            </Link>
            <Link
              to="/my-books"
              className={`navbar__mobile-link ${
                isActive("/my-books") ? "navbar__mobile-link--active" : ""
              }`}
              onClick={closeMobileMenu}
            >
              Programările mele
            </Link>
            <Link
              to="/profile"
              className={`navbar__mobile-link ${
                isActive("/profile") ? "navbar__mobile-link--active" : ""
              }`}
              onClick={closeMobileMenu}
            >
              Profil
            </Link>
            <div className="navbar__mobile-dropdown">
              <button
                className="navbar__mobile-link navbar__mobile-link--dropdown"
                onClick={toggleDropdown}
                aria-expanded={isDropdownOpen}
              >
                Regulamente
                <svg
                  className={`dropdown-icon ${
                    isDropdownOpen ? "dropdown-icon--open" : ""
                  }`}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                >
                  <polyline points="6,9 12,15 18,9" />
                </svg>
              </button>

              {isDropdownOpen && (
                <div className="navbar__mobile-dropdown-menu">
                  {documents.map((doc, index) => (
                    <button
                      key={index}
                      className="navbar__mobile-dropdown-item"
                      onClick={() => {
                        downloadDocument(doc.file);
                        closeMobileMenu();
                      }}
                    >
                      <svg
                        className="download-icon"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                      >
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="7,10 12,15 17,10" />
                        <line x1="12" y1="15" x2="12" y2="3" />
                      </svg>
                      {doc.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {user.role === "admin" && (
              <Link
                to="/admin"
                className={`navbar__mobile-link navbar__mobile-link--admin ${
                  isActive("/admin") ? "navbar__mobile-link--active" : ""
                }`}
                onClick={closeMobileMenu}
              >
                Admin
              </Link>
            )}
          </div>

          <button
            className="btn btn-secondary navbar__mobile-logout"
            onClick={async () => {
              await signUserOut();
              closeMobileMenu();
            }}
          >
            Logout
          </button>
        </div>
      )}

      {/* Mobile menu overlay */}
      {isMobileMenuOpen && (
        <div className="navbar__overlay" onClick={closeMobileMenu} />
      )}
    </nav>
  );
}

export default Navbar;
