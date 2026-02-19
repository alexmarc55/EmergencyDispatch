import { MapContainer, TileLayer, Marker, Popup, ZoomControl, Polyline } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import './Map.css'
import SmoothMarker from './components/SmoothMarker'
import { useEffect, useState } from 'react'
import { useMemo } from 'react'



const ambulanceIcon = new L.Icon({
    iconUrl: 'public/images/ambulance_marker.png',
    iconSize: [45, 45],
    iconAnchor: [22, 22],
    popupAnchor: [0, -20],
    className: 'ambulance-marker-icon'
});

const incidentIcon = new L.Icon({
    iconUrl: 'https://cdn-icons-png.flaticon.com/512/564/564619.png', 
    iconSize: [35, 35],
    iconAnchor: [17, 35],
    popupAnchor: [0, -35],
});

const hospitalIcon = new L.Icon({
    iconUrl: 'https://cdn-icons-png.flaticon.com/512/4320/4320371.png', 
    iconSize: [35, 35],
    iconAnchor: [17, 17],
    popupAnchor: [0, -15],
});

export default function Map({ sidebarOpen, incidents, ambulances, hospitals }) {
  const position = [47.657, 23.590]

  const getProgressiveRoute = (fullRoute, currentLat, currentLon) => {

    if(!fullRoute || fullRoute.length === 0) return [];

    const leafletRoute = fullRoute.map(c => [c[1], c[0]]); // Convert to [lat, lon]
    
    // We find the closest point to current location, so we can slice the route
    let closestIndex = 0;
    let minDistance = Infinity;

    for (let i = 0; i < leafletRoute.length; i++) {
      const dist = Math.sqrt(
        Math.pow(leafletRoute[i][0] - currentLat, 2) +
        Math.pow(leafletRoute[i][1] - currentLon, 2)
      );

      if (dist < minDistance) {
        minDistance = dist;
        closestIndex = i;
      }
    }
    return leafletRoute.slice(closestIndex);
  }

  const activeRoutes = useMemo(() => {
    const lines = [];

    incidents.forEach(incident => {
      const assignedAmb = ambulances.find(a => a.id === incident.assigned_unit);
      
      if (assignedAmb && incident.status === "Assigned") {
        const distanceToIncident = Math.sqrt(
          Math.pow(assignedAmb.lat - incident.lat, 2) +
          Math.pow(assignedAmb.lon - incident.lon, 2)
        );

        const hasArrivedAtIncident = distanceToIncident < 0.001; // 100 meters

        if (incident.route_to_incident && !hasArrivedAtIncident) {
          const remainingToInc = getProgressiveRoute(
            incident.route_to_incident, 
            assignedAmb.lat, 
            assignedAmb.lon
          );
          
          if (remainingToInc.length > 2) {
            lines.push({
              id: `inc-${incident.id}`,
              positions: remainingToInc,
              color: '#ff2222',
              weight: 5,
              opacity: 0.7
            });
          }
        }

        // 2. Logic for Route to Hospital (Blue Line)
        if (incident.route_to_hospital && hasArrivedAtIncident) {
          
          const distToIncidentStart = incident.route_to_incident?.length > 0 ? 
            Math.sqrt(Math.pow(assignedAmb.lat - incident.lat, 2) + Math.pow(assignedAmb.lon - incident.lon, 2)) 
            : 0;

          let hospitalPath;
          if (distToIncidentStart > 0.001) { 
             // Too far from incident, keep full blue line
             hospitalPath = incident.route_to_hospital.map(c => [c[1], c[0]]);
          } else {
             // Close to or past incident, start shortening the blue line
             hospitalPath = getProgressiveRoute(incident.route_to_hospital, assignedAmb.lat, assignedAmb.lon);
          }

          lines.push({
            id: `hos-${incident.id}`,
            positions: hospitalPath,
            color: '#2244ff',
            weight: 5,
            opacity: 0.7
          });
        }
      }
    });

    return lines;
  }, [incidents, ambulances]);

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
        <Marker key={`incident-${incident.id}`} 
        position={[incident.lat, incident.lon]}
        icon={incidentIcon}
        >
          <Popup>
            <strong>Incident #{incident.id}</strong><br />
            Severity: {incident.severity}<br />
            Status: {incident.status}
          </Popup>
        </Marker>
      ))}

{ambulances.map(amb => (
  <SmoothMarker 
    key={`amb-${amb.id}`} 
    position={[amb.lat, amb.lon]} 
    icon={ambulanceIcon}
  >
    <Popup><strong>Ambulance #{amb.id}</strong><br />Status: {amb.status}</Popup>
  </SmoothMarker>
))}

      {hospitals.map(hospital => (
        <Marker key={`hospital-${hospital.id}`}
         position={[hospital.lat, hospital.lon]}
         icon={hospitalIcon}
        >
          <Popup><strong>{hospital.name}</strong></Popup>
        </Marker>
      ))}

      {activeRoutes.map(route => (
        <Polyline
          key={route.id}
          positions={route.positions}
          color={route.color}
          weight={route.weight}
          opacity={route.opacity}
        />
      ))}
    </MapContainer>
  )
}