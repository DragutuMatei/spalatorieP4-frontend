import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../utils/AuthContext";
import Logo from "./Logo";
import ThemeToggle from "./ThemeToggle";
import "../assets/styles/components/Navbar.scss";

function Navbar() {
  const { user, loading, signUserOut } = useAuth();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="navbar">
      <div className="navbar__container">
        {/* Logo */}
        <Link to={user ? "/dashboard" : "/"} className="navbar__logo" onClick={closeMobileMenu}>
          <Logo />
          <span className="navbar__brand">Spălătorie P4</span>
        </Link>

        {/* Desktop Navigation */}
        {!loading && user && (
          <div className="navbar__nav d-mobile-none">
            <Link 
              to="/dashboard" 
              className={`navbar__link ${isActive('/dashboard') ? 'navbar__link--active' : ''}`}
            >
              Programări
            </Link>
            <Link 
              to="/my-books" 
              className={`navbar__link ${isActive('/my-books') ? 'navbar__link--active' : ''}`}
            >
              Programările mele
            </Link>
            <Link 
              to="/profile" 
              className={`navbar__link ${isActive('/profile') ? 'navbar__link--active' : ''}`}
            >
              Profil
            </Link>
            <a 
              href="https://google.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="navbar__link navbar__link--external"
            >
              Regulamente
              <svg className="external-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <polyline points="15,3 21,3 21,9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
            </a>
            {user.role === 'admin' && (
              <Link 
                to="/admin" 
                className={`navbar__link navbar__link--admin ${isActive('/admin') ? 'navbar__link--active' : ''}`}
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
                  <span className="navbar__status navbar__status--pending">Pending</span>
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
                <span className={`navbar__hamburger ${isMobileMenuOpen ? 'navbar__hamburger--open' : ''}`}>
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
        <div className={`navbar__mobile ${isMobileMenuOpen ? 'navbar__mobile--open' : ''}`}>
          <div className="navbar__mobile-header">
            <img 
              src={user.google?.photoURL} 
              alt={user.numeComplet}
              className="navbar__avatar"
            />
            <div className="navbar__user-info">
              <span className="navbar__username">{user.numeComplet}</span>
              {!user.validate && (
                <span className="navbar__status navbar__status--pending">Pending Approval</span>
              )}
            </div>
          </div>
          
          <div className="navbar__mobile-nav">
            <Link 
              to="/dashboard" 
              className={`navbar__mobile-link ${isActive('/dashboard') ? 'navbar__mobile-link--active' : ''}`}
              onClick={closeMobileMenu}
            >
              Programări
            </Link>
            <Link 
              to="/my-books" 
              className={`navbar__mobile-link ${isActive('/my-books') ? 'navbar__mobile-link--active' : ''}`}
              onClick={closeMobileMenu}
            >
              Programările mele
            </Link>
            <Link 
              to="/profile" 
              className={`navbar__mobile-link ${isActive('/profile') ? 'navbar__mobile-link--active' : ''}`}
              onClick={closeMobileMenu}
            >
              Profil
            </Link>
            <a 
              href="https://google.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="navbar__mobile-link navbar__mobile-link--external"
              onClick={closeMobileMenu}
            >
              Regulamente
              <svg className="external-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <polyline points="15,3 21,3 21,9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
            </a>
            {user.role === 'admin' && (
              <Link 
                to="/admin" 
                className={`navbar__mobile-link navbar__mobile-link--admin ${isActive('/admin') ? 'navbar__mobile-link--active' : ''}`}
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
        <div 
          className="navbar__overlay"
          onClick={closeMobileMenu}
        />
      )}
    </nav>
  );
}

export default Navbar;
