import { MapContainer, TileLayer, Marker, Popup, ZoomControl, Polyline } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import './Map.css'
import { useEffect, useState } from 'react'
import { get_route_geometry } from './services/api' // UPDATED IMPORT

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
  const MAX_RETRIES = 5

  useEffect(() => {
    if (retryCount >= MAX_RETRIES) {
      console.log('Max retry attempts reached. Stopping route fetching.')
      return
    }

    const fetchRoutes = async () => {
      const newRoutes = []
      let hasError = false

      // Loop through all busy ambulances to draw their paths
      for (const ambulance of ambulances) {
        if (ambulance.status === "Busy") {
          
          // 1. Find the Incident assigned to this ambulance
          const assignedIncident = incidents.find(
            inc => inc.assigned_unit === ambulance.id && inc.status === "Assigned"
          )

          if (assignedIncident) {
            try {
              // --- SEGMENT 1: Ambulance -> Incident (RED) ---
              // We calculate route from Ambulance Current Location to Incident Location
              const routeToIncident = await get_route_geometry(
                ambulance.lat, ambulance.lon,
                assignedIncident.lat, assignedIncident.lon
              );

              if (routeToIncident?.route_geometry) {
                newRoutes.push({
                  id: `inc-${ambulance.id}`,
                  // Swap [Lon, Lat] -> [Lat, Lon]
                  route: routeToIncident.route_geometry.map(c => [c[1], c[0]]), 
                  type: 'to_incident'
                })
              }

              // 2. Find the Hospital assigned to this incident
              const assignedHospital = hospitals.find(
                h => h.id === assignedIncident.assigned_hospital
              );

              if (assignedHospital) {
                // --- SEGMENT 2: Incident -> Hospital (BLUE) ---
                const routeToHospital = await get_route_geometry(
                  assignedIncident.lat, assignedIncident.lon,
                  assignedHospital.lat, assignedHospital.lon
                );

                if (routeToHospital?.route_geometry) {
                  newRoutes.push({
                    id: `hos-${ambulance.id}`,
                    route: routeToHospital.route_geometry.map(c => [c[1], c[0]]),
                    type: 'to_hospital'
                  })
                }
                // --- SEGMENT 3: Hospital -> Base (GREEN) ---
                const baseLat = ambulance.default_lat || ambulance.lat;
                const baseLon = ambulance.default_lon || ambulance.lon;

                const routeToBase = await get_route_geometry(
                  assignedHospital.lat, assignedHospital.lon,
                  baseLat, baseLon
                );

                if (routeToBase?.route_geometry) {
                  newRoutes.push({
                    id: `base-${ambulance.id}`,
                    route: routeToBase.route_geometry.map(c => [c[1], c[0]]),
                    type: 'to_base'
                  })
                }
              }

            } catch (error) {
              console.error(`Error fetching routes for ambulance ${ambulance.id}:`, error)
              hasError = true
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

  const getRouteStyle = (type) => {
    switch (type) {
      case 'to_incident':
        return { color: '#ff2222', weight: 5, opacity: 0.8, dashArray: null }; // Red
      case 'to_hospital':
        return { color: '#2244ff', weight: 5, opacity: 0.8, dashArray: null }; // Blue
      case 'to_base':
        return { color: '#22aa44', weight: 4, opacity: 0.6, dashArray: '10, 10' }; // Green Dashed
      default:
        return { color: 'gray', weight: 3 };
    }
  }

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
      
      <ZoomControl position="topright" />

      {/* Render Markers */}
      {incidents.map(incident => (
        <Marker key={`incident-${incident.id}`} position={[incident.lat, incident.lon]}>
          <Popup>
            <strong>Incident #{incident.id}</strong><br />
            Severity: {incident.severity}<br />
            Status: {incident.status}
          </Popup>
        </Marker>
      ))}

      {ambulances.map(amb => (
        <Marker key={`ambulance-${amb.id}`} position={[amb.lat, amb.lon]}>
          <Popup>
            <strong>Ambulance #{amb.id}</strong><br />
            Status: {amb.status}
          </Popup>
        </Marker>
      ))}

      {hospitals.map(hospital => (
        <Marker key={`hospital-${hospital.id}`} position={[hospital.lat, hospital.lon]}>
          <Popup><strong>{hospital.name}</strong></Popup>
        </Marker>
      ))}

      {/* Render Routes */}
      {routes.map((routeData, index) => {
        const style = getRouteStyle(routeData.type);
        return (
          <Polyline
            key={`route-${routeData.id}-${index}`}
            positions={routeData.route}
            color={style.color}
            weight={style.weight}
            opacity={style.opacity}
            dashArray={style.dashArray}
          />
        )
      })}

    </MapContainer>
  )
}