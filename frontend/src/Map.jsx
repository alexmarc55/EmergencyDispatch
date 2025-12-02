import { MapContainer, TileLayer, Marker, Popup, ZoomControl, Polyline } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import './Map.css'
import { useEffect, useState } from 'react'
import { get_route } from './services/api'

// Fix default marker icons
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

export default function Map({ sidebarOpen, incidents, ambulances, hospitals }) {
  const position = [47.657, 23.590] // Baia Mare, Romania
  const [routes, setRoutes] = useState([])
  const [retryCount, setRetryCount] = useState(0)
  const MAX_RETRIES = 3

  useEffect(() => {
    // Stop if max retries reached
    if (retryCount >= MAX_RETRIES) {
      console.log('Max retry attempts reached. Stopping route fetching.')
      return
    }

    const fetchRoutes = async () => {
      const newRoutes = []
      let hasError = false

      for (const ambulance of ambulances) {
          if(ambulance.status == "Busy") {
          const assignedIncident = incidents.find(
            inc => inc.assigned_unit === ambulance.id && inc.status === "Assigned"
          )

          if (assignedIncident) {
            try {
              const routeData = await get_route(ambulance.id, assignedIncident.id)

              console.log('Route data:', routeData)

              // Handle route_to_incident
              if (routeData.route_to_incident && Array.isArray(routeData.route_to_incident) && routeData.route_to_incident.length > 0) {
                // Convert from [lon, lat] to [lat, lon] for Leaflet
                const leafletRouteToIncident = routeData.route_to_incident.map(coord => [coord[1], coord[0]])

                newRoutes.push({
                  ambulanceId: ambulance.id,
                  incidentId: assignedIncident.id,
                  route: leafletRouteToIncident,
                  type: 'to_incident'
                })
              }

              // Handle route_to_hospital
              if (routeData.route_to_hospital && Array.isArray(routeData.route_to_hospital) && routeData.route_to_hospital.length > 0) {
                // Convert from [lon, lat] to [lat, lon] for Leaflet
                const leafletRouteToHospital = routeData.route_to_hospital.map(coord => [coord[1], coord[0]])

                newRoutes.push({
                  ambulanceId: ambulance.id,
                  incidentId: assignedIncident.id,
                  route: leafletRouteToHospital,
                  type: 'to_hospital'
                })
              }
            } catch (error) {
              console.error(`Error fetching route for ambulance ${ambulance.id}:`, error)
              hasError = true
              break
            }
          }
        }
      }

      if (hasError) {
        setRetryCount(prev => prev + 1)
      } else {
        setRoutes(newRoutes)
        setRetryCount(MAX_RETRIES)
      }
    }

    fetchRoutes()
  }, [ambulances, incidents, hospitals, retryCount])

  return (
    <MapContainer
      center={position}
      zoom={13}
      style={{ height: '100vh', width: '100%' }}
      zoomControl={false}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <ZoomControl position={sidebarOpen ? "bottomright" : "topleft"} />


      {/* Render incident markers */}
      {incidents.map(incident => (
        <Marker
          key={`incident-${incident.id}`}
          position={[incident.lat, incident.lon]}
        >
          <Popup className="popup-content">
            <strong>Incident #{incident.id}</strong><br />
            Severity: {incident.severity}<br />
            Status: {incident.status} <br />
          </Popup>
        </Marker>
      ))}

      {/* Render ambulance markers */}
      {ambulances.map(ambulance => (
        <Marker className="popup-content"
          key={`ambulance-${ambulance.id}`}
          position={[ambulance.lat, ambulance.lon]}
        >
          <Popup className="popup-content">
            <strong>Ambulance #{ambulance.id}</strong><br />
            Status: {ambulance.status}
          </Popup>
        </Marker>
      ))}

      {/* Render hospital markers */}
      {hospitals.map(hospital => (
        <Marker className="popup-content"
          key={`hospital-${hospital.id}`}
          position={[hospital.lat, hospital.lon]}
        >
          <Popup className="popup-content">
            <strong>{hospital.name}</strong><br/>
          </Popup>
        </Marker>
      ))}

      {/* Render routes for busy ambulances */}
      {routes.map((routeData, index) => (
        <Polyline
          key={`route-${routeData.ambulanceId}-${routeData.incidentId}-${routeData.type || index}`}
          positions={routeData.route}
          color={routeData.type === 'to_hospital' ? "#0000FF" : "#FF0000"} // Blue for hospital, Red for incident
          weight={4}
          opacity={0.7}
        />
      ))}

    </MapContainer>
  )
}