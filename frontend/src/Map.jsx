import { MapContainer, TileLayer, Marker, Popup, ZoomControl } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import './Map.css'

// Fix default marker icons
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

export default function Map({ sidebarOpen, incidents, ambulances}) {
  const position = [47.657, 23.590] // Baia Mare, Romania

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
      <Marker position={position}>
        <Popup>
          Baia Mare, Romania <br /> Emergency Dispatch Center
        </Popup>
      </Marker>

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
    </MapContainer>
  )
}