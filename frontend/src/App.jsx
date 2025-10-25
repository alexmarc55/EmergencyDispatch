import { useEffect, useState } from 'react'
import Navbar from './components/Navbar'
import Sidebar from './components/Sidebar'
import Map from './Map'
import './App.css'
import { getIncidents, getAmbulances } from './services/api'

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [incidents, setIncidents] = useState([])
  const [ambulances, setAmbulances] = useState([])
  const [loading, setLoading] = useState(true)

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen)
  }

  // Fetch data from backend
  useEffect(() => {
      fetchData()
      const interval = setInterval(fetchData, 3000) // Refresh every 3 seconds
      return () => clearInterval(interval)
    }, [] )

  const fetchData = async () => {
    try {
        const [incidentsData, ambulancesData] = await Promise.all([
          getIncidents(),
          getAmbulances()
        ])
        setIncidents(incidentsData)
        setAmbulances(ambulancesData)
      } catch (error) {
        console.error('Error fetching data:', error)
      } finally {
        setLoading(false)
      }
    }

  return (
    <div className="app-container">
      <Navbar onToggleSidebar={toggleSidebar} />
      <div className="main-content">
        <Sidebar isOpen={sidebarOpen} />
        <Map sidebarOpen={sidebarOpen}
            incidents={incidents}
            ambulances={ambulances}
            loading={loading}        
        />
      </div>
    </div>
  )
}