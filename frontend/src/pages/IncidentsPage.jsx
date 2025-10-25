import { useState } from 'react'
import Navbar from './components/Navbar'
import Sidebar from './components/Sidebar'
import '/IncidentPage.css'

export default function IncidentsPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
    const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen)
    }
    return (
            <div className="app-container">
              <Navbar onToggleSidebar={toggleSidebar} />
              <div className="main-content">
                <Sidebar isOpen={sidebarOpen} />
            </div>
                <div className="incidents-page">
                  <h1>Incidents</h1>
                  <table className="incidents-table"> </table>
              </div>
            </div>


          )

        }