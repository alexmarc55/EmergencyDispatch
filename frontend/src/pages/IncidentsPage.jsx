import { useState, useEffect } from 'react'
import Navbar from '../components/Navbar'
import Sidebar from '../components/Sidebar'
import SearchBar from '../components/Searchbar'
import './IncidentsPage.css'
import { get_incidents } from '../services/api'

export default function IncidentsPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [incidents, setIncidents] = useState([])
  const [filteredIncidents, setFilteredIncidents] = useState([])
  
  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen)
  }
  
  useEffect(() => {
    get_incidents().then(data => {

      setIncidents(data)
      setFilteredIncidents(data)
    })
  }, [])
  
  const handleSearch = (filtered, query) => {
    setFilteredIncidents(filtered)
  }
  
  return (
    <div className="app-container">
      <Navbar onToggleSidebar={toggleSidebar} />
      <div className="main-content">
        <Sidebar isOpen={sidebarOpen} />
        <div className={`incidents-page ${sidebarOpen ? 'sidebar-open' : ''}`}>
          <div className="header">
            <h1>Incidents</h1>
            <SearchBar 
              items={incidents}
              onSearch={handleSearch}
              placeholder="Search incidents..."
              searchKeys={["id", "status", "severity"]}
            />
          </div>
          <div className="incidents-list">
            {filteredIncidents.map((incident) => (
              <div key={incident.id} className="incidents-card">
                <h2>Incident ID: {incident.id}</h2>
                <p>Status: {incident.status}</p>
                <p>Severity: {incident.severity}</p>
                <p>Location: ({incident.lat}, {incident.lon})</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}