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

const emergencyCenterIcon = new L.Icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/128/11941/11941702.png",
  iconSize: [35, 35],
  iconAnchor: [17, 17],
  popupAnchor: [0, -15],
});

// ========================================================================
// SOLUȚIA SCHIMBĂRII DE RUTĂ: Cache global persistent pe parcursul sesiunii.
// Supraviețuiește demontării componentei React (unmount/remount/loading toggles).
// ========================================================================
const globalArrivalRegistry = {};

export default function Map({
  sidebarOpen,
  incidents,
  ambulances,
  hospitals,
  emergencyCenters,
}) {
  const position = [47.657, 23.59];

  const getProgressiveRoute = (fullRoute, currentLat, currentLon) => {
    if (!fullRoute || fullRoute.length === 0) {
      return { remaining: [], minDistance: Infinity, isAtEnd: false };
    }
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

    const isAtEnd = closestIndex === leafletRoute.length - 1;
    return {
      remaining: leafletRoute.slice(closestIndex),
      minDistance: minDistance,
      isAtEnd: isAtEnd,
    };
  };

  const activeRoutes = useMemo(() => {
    const lines = [];

    incidents.forEach((incident) => {
      if (incident.status === "Resolved") return;
      const assignedIds = incident.assigned_units || [];

      assignedIds.forEach((ambId) => {
        const arrivalKey = `${incident.id}-${ambId}`;

        if (incident.status === "Resolved") {
          delete globalArrivalRegistry[arrivalKey];
          return;
        }

        const assignedAmb = ambulances.find((a) => a.id === ambId);
        if (!assignedAmb) return;

        if (assignedAmb.status === "Available") {
          delete globalArrivalRegistry[arrivalKey];
          return;
        }

        const ambKey = String(ambId);
        const routeInc = incident.route_to_incident?.[ambKey];
        const routeHosp = incident.route_to_hospital?.[ambKey];

        const incInfo = getProgressiveRoute(
          routeInc,
          assignedAmb.lat,
          assignedAmb.lon,
        );
        const hospInfo = getProgressiveRoute(
          routeHosp,
          assignedAmb.lat,
          assignedAmb.lon,
        );

        if (incInfo.isAtEnd) {
          globalArrivalRegistry[arrivalKey] = true;
        }

        const headingToHospital = globalArrivalRegistry[arrivalKey] || false;

        if (!headingToHospital) {
          if (incInfo.remaining.length > 1) {
            lines.push({
              id: `inc-${incident.id}-amb-${ambId}`,
              positions: incInfo.remaining,
              color: "#ff2222",
              weight: 4,
            });
          }
        } else {
          if (hospInfo.remaining.length > 1 && !hospInfo.isAtEnd) {
            lines.push({
              id: `hos-${incident.id}-amb-${ambId}`,
              positions: hospInfo.remaining,
              color: "#2244ff",
              weight: 4,
            });
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
      {incidents
        .filter((incident) => incident.status !== "Resolved")
        .map((incident) => (
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

      {emergencyCenters.map((center) => (
        <Marker
          key={`center-${center.id}`}
          position={[center.lat, center.lon]}
          icon={emergencyCenterIcon}
        >
          <Popup>
            <strong>{center.name}</strong>
          </Popup>
        </Marker>
      ))}

      {activeRoutes.map((route) => (
        <Polyline
          key={route.id}
          positions={route.positions}
          color={route.color}
          weight={route.weight}
        />
      ))}
    </MapContainer>
  );
}
