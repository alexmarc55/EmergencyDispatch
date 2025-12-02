import './Sidebar.css'

export default function Sidebar({ isOpen }) {
  return (
    <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
      <ul>
        <li><a href="/incidents">Incidents</a></li>
        <li><a href="/ambulances">Ambulances</a></li>
        <li><a href="/patients">Patients</a></li>
        <li><a href="/hospitals">Hospitals</a></li>
        <li><a href="/emergency-centers">Emergency Centers</a></li>
        <li><a href="/settings">Settings</a></li>
        <li><a href="/logged-out"> Log Out</a></li>
      </ul>
    </aside>
  )
}