import './Sidebar.css'

export default function Sidebar({ isOpen }) {
  return (
    <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
      <ul>
        <li><a href="pages/IncidentsPage.jsx">Incidents</a></li>
        <li><a href="#ambulances">Ambulances</a></li>
        <li><a href="#dispatch">Dispatch</a></li>
        <li><a href="#settings">Settings</a></li>
      </ul>
    </aside>
  )
}