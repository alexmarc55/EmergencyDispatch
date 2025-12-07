import { useState, useEffect } from 'react'
import Navbar from '../components/Navbar'
import Sidebar from '../components/Sidebar'
import SearchBar from '../components/Searchbar'
import './HospitalsPage.css'
import { get_hospitals } from '../services/api'

export default function HospitalsPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [hospitals, setHospitals] = useState([])
  const [filteredHospitals, setFilteredHospitals] = useState([])
  
  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen)
  }
  
  useEffect(() => {
    get_hospitals().then(data => {

      setHospitals(data)
      setFilteredHospitals(data)
    })
  }, [])
  
  const handleSearch = (filtered, query) => {
    setFilteredHospitals(filtered)
  }
  
  return (
    <div className="app-container">
      <Navbar onToggleSidebar={toggleSidebar} />
      <div className="main-content">
        <Sidebar isOpen={sidebarOpen} />
        <div className={`hospitals-page ${sidebarOpen ? 'sidebar-open' : ''}`}>
          <div className="header">
            <h1>Hospitals</h1>
            <SearchBar 
              items={hospitals}
              onSearch={handleSearch}
              placeholder="Search hospitals..."
              searchKeys={["id", "name", "type"]}
            />
          </div>
          <div className="hospitals-list">
            {filteredHospitals.map((hospital) => (
              <div key={hospital.id} className="hospitals-card">
                <h2>Hospital ID: {hospital.id}</h2>
                <p>Name: {hospital.name}</p>
                <p>Type: {hospital.type}</p>
                <p>Location: ({hospital.lat}, {hospital.lon})</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}