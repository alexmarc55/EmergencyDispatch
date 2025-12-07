import { useState, useEffect } from 'react'
import Navbar from '../components/Navbar'
import Sidebar from '../components/Sidebar'
import SearchBar from '../components/Searchbar'
import './EmergencyCentersPage.css'
import { get_emergency_centers } from '../services/api'

export default function EmergencyCentersPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [emergency_centers, setEmergencyCenters] = useState([])
  const [filteredEmergencyCenters, setFilteredEmergencyCenters] = useState([])
  
  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen)
  }
  
  useEffect(() => {
    get_emergency_centers().then(data => {

      setEmergencyCenters(data)
      setFilteredEmergencyCenters(data)
    })
  }, [])
  
  const handleSearch = (filtered, query) => {
    setFilteredEmergencyCenters(filtered)
  }
  
  return (
    <div className="app-container">
      <Navbar onToggleSidebar={toggleSidebar} />
      <div className="main-content">
        <Sidebar isOpen={sidebarOpen} />
        <div className={`emergency-centers-page ${sidebarOpen ? 'sidebar-open' : ''}`}>
          <div className="header">
            <h1>Emergency Centers</h1>
            <SearchBar 
              items={emergency_centers}
              onSearch={handleSearch}
              placeholder="Search emergency centers..."
              searchKeys={["id", "name", "type"]}
            />
          </div>
          <div className="emergency-centers-list">
            {filteredEmergencyCenters.map((emergency_centers) => (
              <div key={emergency_center.id} className="emergency-centers-card">
                <h2>Emergency Center ID: {emergency_center.id}</h2>
                <p>Name: {emergency_center.name}</p>
                <p>Type: {emergency_center.type}</p>
                <p>Location: ({emergency_center.lat}, {emergency_center.lon})</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}