import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  ZoomControl,
  Polyline,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "./Map.css";
import SmoothMarker from "./components/SmoothMarker";
import { useEffect, useState } from "react";
import { useMemo } from "react";

const ambulanceIcon = new L.Icon({
  iconUrl: "public/images/ambulance_marker.png",
  iconSize: [45, 45],
  iconAnchor: [22, 22],
  popupAnchor: [0, -20],
  className: "ambulance-marker-icon",
});

const incidentIcon = new L.Icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/564/564619.png",
  iconSize: [35, 35],
  iconAnchor: [17, 35],
  popupAnchor: [0, -35],
});

const hospitalIcon = new L.Icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/4320/4320371.png",
  iconSize: [35, 35],
  iconAnchor: [17, 17],
  popupAnchor: [0, -15],
});

export default function Map({ sidebarOpen, incidents, ambulances, hospitals }) {
  const position = [47.657, 23.59];

  const getProgressiveRoute = (fullRoute, currentLat, currentLon) => {
    if (!fullRoute || fullRoute.length === 0) return [];
    const leafletRoute = fullRoute.map((c) => [c[1], c[0]]);

    let closestIndex = 0;
    let minDistance = Infinity;

    for (let i = 0; i < leafletRoute.length; i++) {
      const dist = Math.hypot(
        leafletRoute[i][0] - currentLat,
        leafletRoute[i][1] - currentLon,
      );
      if (dist < minDistance) {
        minDistance = dist;
        closestIndex = i;
      }
    }

    // If the closest point is the very last point, the route is finished
    if (closestIndex === leafletRoute.length - 1 && minDistance < 0.0005) {
      return [];
    }

    return leafletRoute.slice(closestIndex);
  };

  const activeRoutes = useMemo(() => {
    const lines = [];

    incidents.forEach((incident) => {
      const assignedIds = incident.assigned_units || [];

      assignedIds.forEach((ambId) => {
        const assignedAmb = ambulances.find((a) => a.id === ambId);
        if (!assignedAmb) return;

        // Only draw lines for active dispatch states
        if (incident.status === "Assigned" || incident.status === "Queued") {
          const ambKey = String(ambId);
          const routeInc = incident.route_to_incident?.[ambKey];
          const routeHosp = incident.route_to_hospital?.[ambKey];

          // 1. Calculate progress on the incident route
          const remainingToInc = getProgressiveRoute(
            routeInc,
            assignedAmb.lat,
            assignedAmb.lon,
          );

          // 2. Determine if we should show the Incident route or Hospital route
          // We are "At Incident" if we have reached the end of the incident route
          // or if we have already started moving along the hospital route.
          const finishedIncRoute =
            !remainingToInc || remainingToInc.length <= 1;

          if (!finishedIncRoute) {
            // STILL GOING TO INCIDENT
            lines.push({
              id: `inc-${incident.id}-amb-${ambId}`,
              positions: remainingToInc,
              color: "#ff2222",
              weight: 4,
              opacity: 0.7,
            });
          } else if (routeHosp) {
            // AT INCIDENT OR MOVING TO HOSPITAL
            const hospitalPath = getProgressiveRoute(
              routeHosp,
              assignedAmb.lat,
              assignedAmb.lon,
            );

            if (hospitalPath.length > 1) {
              lines.push({
                id: `hos-${incident.id}-amb-${ambId}`,
                positions: hospitalPath,
                color: "#2244ff",
                weight: 4,
                opacity: 0.7,
              });
            }
          }
        }
      });
    });

    return lines;
  }, [incidents, ambulances]);

  return (
    <MapContainer
      center={position}
      zoom={13}
      style={{ height: "100vh", width: "100%" }}
      zoomControl={false}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <ZoomControl position="topright" />

      {/* Render Markers */}
      {incidents.map((incident) => (
        <Marker
          key={`incident-${incident.id}`}
          position={[incident.lat, incident.lon]}
          icon={incidentIcon}
        >
          <Popup>
            <strong>Incident #{incident.id}</strong>
            <br />
            Severity: {incident.severity}
            <br />
            Status: {incident.status}
          </Popup>
        </Marker>
      ))}

      {ambulances.map((amb) => (
        <SmoothMarker
          key={`amb-${amb.id}`}
          position={[amb.lat, amb.lon]}
          icon={ambulanceIcon}
        >
          <Popup>
            <strong>Ambulance #{amb.id}</strong>
            <br />
            Status: {amb.status}
          </Popup>
        </SmoothMarker>
      ))}

      {hospitals.map((hospital) => (
        <Marker
          key={`hospital-${hospital.id}`}
          position={[hospital.lat, hospital.lon]}
          icon={hospitalIcon}
        >
          <Popup>
            <strong>{hospital.name}</strong>
          </Popup>
        </Marker>
      ))}

      {activeRoutes.map((route) => (
        <Polyline
          key={route.id}
          positions={route.positions}
          color={route.color}
          weight={route.weight}
          opacity={route.opacity}
        />
      ))}
    </MapContainer>
  );
}
