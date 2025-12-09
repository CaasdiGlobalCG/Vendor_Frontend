import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import '../styles/Header.css';

const Header = () => {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const isScrolled = window.scrollY > 10;
      setScrolled(isScrolled);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const toggleMenu = () => {
    setMenuOpen(!menuOpen);
  };

  return (
    <header className={`site-header ${scrolled ? 'scrolled' : ''}`}>
      <div className="header-container">
        <div className="logo">
          <div className="image" />
        </div>

        {/* Mobile Menu Button */}
        <div className="mobile-menu-button" onClick={toggleMenu}>
          <span></span>
          <span></span>
          <span></span>
        </div>

        {/* Navigation Menu */}
        <nav className={`main-nav ${menuOpen ? 'open' : ''}`}>
          {menuOpen && (
            <button className="close-menu-button" onClick={toggleMenu}>
              &times;
            </button>
          )}
          <ul>
            <li className="active"><a href="#home">Home</a></li>
            <li><a href="#about">About us</a></li>
            <li><a href="#expertise">Services</a></li>
            <li><a href="#industries-section">Industries</a></li>
            {/* <li><a href="#scroller">Expertise</a></li> */}
            <li><a href="https://www.linkedin.com/company/caasdi-global/posts/?feedView=all" target='_blank'>Blogs</a></li>
            <li><Link to="/signup">Login</Link></li>
          </ul>
        </nav>
      </div>
    </header>
  );
};

export default Header;
