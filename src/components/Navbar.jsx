import React, { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../utils/AuthContext";
import { useSocket } from "../utils/SocketContext";
import { useTheme } from "../contexts/ThemeContext";
import ThemeToggle from "./ThemeToggle";
import Logo from "./Logo";
import "./Navbar.scss";

function Navbar() {
  const { user, loading, signUserOut } = useAuth();
  const { theme } = useTheme();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDocsOpen, setIsDocsOpen] = useState(false);
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  
  const docsRef = useRef(null);
  const accountRef = useRef(null);

  const toggleMobileMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);
  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
    setIsDocsOpen(false);
  };

  const isActive = (path) => location.pathname === path;

  const documents = [
    { name: "Curatarea sitelor", file: "Curatarea sitelor.pdf" },
    { name: "Ghid programari", file: "Ghid programari.pdf" },
    { name: "Ghid uscator", file: "Ghid uscator.pdf" },
    { name: "Ghidul ciclurilor de spalare", file: "Ghidul ciclurilor de spalare.pdf" },
    { name: "Manual Uscator", file: "Manual Uscator.pdf" },
    { name: "Regulament de utilizare a spalatoriei", file: "Regulament de utilizare a spalatoriei.pdf" },
    { name: "Regulament uscator", file: "Regulament uscator.pdf" },
  ];

  const downloadDocument = (file) => {
    const encodedFile = encodeURIComponent(file);
    const link = document.createElement("a");
    link.href = `/assets/docs/${encodedFile}`;
    link.download = file;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (docsRef.current && !docsRef.current.contains(event.target)) {
        setIsDocsOpen(false);
      }
      if (accountRef.current && !accountRef.current.contains(event.target)) {
        setIsAccountOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (loading) return null;

  return (
    <nav className="navbar">
      <div className="navbar__container">
        <Link to={user ? "/dashboard" : "/"} className="navbar__logo" onClick={closeMobileMenu}>
          <Logo color={theme === "dark" ? "#FFFFFF" : "#050505"} />
          <span className="navbar__brand">Spălătorie P4</span>
        </Link>

        {user && (
          <>
            <div className="navbar__desktop-nav">
              <Link to="/dashboard" className={`navbar__link ${isActive("/dashboard") ? "navbar__link--active" : ""}`}>
                Programări
              </Link>
              <Link to="/my-books" className={`navbar__link ${isActive("/my-books") ? "navbar__link--active" : ""}`}>
                Rezervările mele
              </Link>
              
              <div className="navbar__dropdown" ref={docsRef}>
                <button className={`navbar__link navbar__link--dropdown ${isDocsOpen ? "navbar__link--open" : ""}`} onClick={() => setIsDocsOpen(!isDocsOpen)}>
                  Regulamente
                  <svg className="dropdown-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <polyline points="6 9 12 15 18 9"></polyline>
                  </svg>
                </button>
                {isDocsOpen && (
                  <div className="navbar__dropdown-menu">
                    {documents.map((doc, i) => (
                      <button key={i} className="navbar__dropdown-item" onClick={() => downloadDocument(doc.file)}>
                        <svg className="download-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" style={{width: '16px', marginRight: '8px'}}>
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                          <polyline points="7,10 12,15 17,10"></polyline>
                          <line x1="12" y1="15" x2="12" y2="3"></line>
                        </svg>
                        {doc.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {user.role === "admin" && (
                <Link to="/admin" className={`navbar__link navbar__link--admin ${isActive("/admin") ? "navbar__link--active" : ""}`}>
                  Admin
                </Link>
              )}
            </div>

            <div className="navbar__actions">
              <ThemeToggle />
              
              <div className="navbar__account-desktop" ref={accountRef}>
                <button className="navbar__account-trigger" onClick={() => setIsAccountOpen(!isAccountOpen)}>
                  <img src={user.google?.photoURL} alt="avatar" className="navbar__avatar" />
                  <span className="navbar__username">{user.numeComplet}</span>
                </button>
                {isAccountOpen && (
                  <div className="navbar__dropdown-menu navbar__dropdown-menu--right">
                    <Link to="/profile" className="navbar__dropdown-item" onClick={() => setIsAccountOpen(false)}>Profil</Link>
                    <button className="navbar__dropdown-item navbar__dropdown-item--logout" onClick={signUserOut}>Logout</button>
                  </div>
                )}
              </div>

              <button className="navbar__hamburger" onClick={toggleMobileMenu}>
                <div className={`hamburger-icon ${isMobileMenuOpen ? "hamburger-icon--open" : ""}`}>
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </button>
            </div>
          </>
        )}
      </div>

      {user && (
        <div className={`navbar__mobile-drawer ${isMobileMenuOpen ? "navbar__mobile-drawer--open" : ""}`}>
          <div className="navbar__mobile-content">
            <div className="navbar__mobile-user">
              <img src={user.google?.photoURL} alt="avatar" className="navbar__avatar-large" />
              <div className="navbar__mobile-user-info">
                <strong>{user.numeComplet}</strong>
                <span>{user.google?.email}</span>
              </div>
            </div>

            <div className="navbar__mobile-links">
              <Link to="/dashboard" onClick={closeMobileMenu}>Programări</Link>
              <Link to="/my-books" onClick={closeMobileMenu}>Rezervările mele</Link>
              <Link to="/profile" onClick={closeMobileMenu}>Profilul meu</Link>
              
              <div className="navbar__mobile-docs">
                <p>Regulamente:</p>
                {documents.map((doc, i) => (
                  <button key={i} onClick={() => downloadDocument(doc.file)}>
                    {doc.name}
                  </button>
                ))}
              </div>

              {user.role === "admin" && (
                <Link to="/admin" className="navbar__link--admin" onClick={closeMobileMenu}>Admin Panel</Link>
              )}

              <button className="navbar__logout-btn" onClick={signUserOut}>Logout</button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}

export default Navbar;
