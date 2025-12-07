import { useState, useEffect } from 'react'
import Navbar from '../components/Navbar'
import Sidebar from '../components/Sidebar'
import SearchBar from '../components/Searchbar'
import './PatientsPage.css'
import { get_patients } from '../services/api'

export default function PatientsPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [patients, setPatients] = useState([])
  const [filteredPatients, setFilteredPatients] = useState([])
  
  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen)
  }
  
  useEffect(() => {
    get_patients().then(data => {

      setPatients(data)
      setFilteredPatients(data)
    })
  }, [])
  
  const handleSearch = (filtered, query) => {
    setFilteredPatients(filtered)
  }
  
  return (
    <div className="app-container">
      <Navbar onToggleSidebar={toggleSidebar} />
      <div className="main-content">
        <Sidebar isOpen={sidebarOpen} />
        <div className={`patients-page ${sidebarOpen ? 'sidebar-open' : ''}`}>
          <div className="header">
            <h1>Patients</h1>
            <SearchBar 
              items={patients}
              onSearch={handleSearch}
              placeholder="Search patients..."
              searchKeys={["id", "name", "phone_number", "medical_history"]}
            />
          </div>
          <div className="patients-list">
            {filteredPatients.map((patient) => (
              <div key={patient.id} className="patients-card">
                <h2>Patient ID: {patient.id}</h2>
                <p>Name: {patient.name}</p>
                <p>Age: {patient.age}</p>
                <p>Phone Number: {patient.phone_number}</p>
                <p>Medical History: {patient.medical_history}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}