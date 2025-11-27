import { useState, useEffect } from 'react'
import Navbar from '../components/Navbar'
import Sidebar from '../components/Sidebar'
import SearchBar from '../components/Searchbar'
import './AmbulancesPage.css'
import { get_ambulances } from '../services/api'

export default function IncidentsPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [ambulances, setAmbulances] = useState([])
  
  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen)
  }
  
  useEffect(() => {
    get_ambulances().then(data => setAmbulances(data))
  }, [])
  
  return (
    <div className="app-container">
      <Navbar onToggleSidebar={toggleSidebar} />
      <div className="main-content">
        <Sidebar isOpen={sidebarOpen} />
        <div className={`ambulances-page ${sidebarOpen ? 'sidebar-open' : ''}`}>
          <div className="header">
            <h1>Ambulances</h1>
            <SearchBar />
          </div>
          <div className="ambulances-list">
            {ambulances.map((ambulance) => (
              <div key={ambulance.id} className="ambulances-card">
                <h2>Ambulance {ambulance.id}</h2>
                <p>Status: {ambulance.status}</p>
                <p>Location: ({ambulance.lat}, {ambulance.lon})</p>
                <p>Default Location: ({ambulance.default_lat}, {ambulance.default_lon})</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}