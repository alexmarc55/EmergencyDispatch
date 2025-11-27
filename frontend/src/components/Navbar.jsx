import { useState } from 'react'
import './Navbar.css'

export default function Navbar({ onToggleSidebar }) {
  return (
    <nav className="navbar">
      <button className="hamburger-btn" onClick={onToggleSidebar}>
        <span></span>
        <span></span>
        <span></span>
      </button>
      
      <div className="logo">
        <a href="../">
        <img src="images/logo.png" alt="Emergency Dispatch System Logo" />
        </a>
      </div>
    </nav>
  )
}