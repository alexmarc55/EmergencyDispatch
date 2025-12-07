import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { MENU_ITEMS } from '../config/menu_items'; 
import './Sidebar.css';

export default function Sidebar({ isOpen }) {
  const navigate = useNavigate();
  
  const rawRole = localStorage.getItem('user_role');
  
  const userRole = rawRole?.toLowerCase() || '';

  const visibleItems = MENU_ITEMS.filter(item => 
    item.allowedRoles.includes(userRole)
  );
  

  const handleLogout = (e) => {
    e.preventDefault();
    localStorage.clear();
    navigate('/login_page');
  };

  return (
    <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
      <div className="sidebar-user-info">
        Logged in as: <span style={{ color: '#3498db' }}>{userRole.toUpperCase() || 'GUEST'}</span>
      </div>

      <ul>
        {visibleItems.length === 0 && (
           <li>
             No menu items found for role: "{userRole}"
           </li>
        )}

        {visibleItems.map((item) => (
          <li key={item.path}>
            <NavLink 
              to={item.path}
              className={({ isActive }) => isActive ? "active" : ""}
            >
              {item.label}
            </NavLink>
          </li>
        ))}

        <li className="logout-item">
          <a href="/login_page" onClick={handleLogout}>
            Log Out
          </a>
        </li>
      </ul>
    </aside>
  );
}