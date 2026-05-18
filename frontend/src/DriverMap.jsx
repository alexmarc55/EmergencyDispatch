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
import "./DriverMap.css";
import SmoothMarker from "./components/SmoothMarker";
import { useEffect, useState, useMemo, useRef } from "react";
import { useMap } from "react-leaflet";
import "leaflet-rotate";

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

// Defined outside component — pure function, no hooks needed
function getProgressiveRoute(fullRoute, currentLat, currentLon) {
  if (!fullRoute || fullRoute.length === 0) return [];

  const leafletRoute = fullRoute.map((c) => [c[1], c[0]]); // [lon,lat] → [lat,lon]

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

  if (closestIndex === leafletRoute.length - 1 && minDistance < 0.0005) {
    return [];
  }

  return leafletRoute.slice(closestIndex);
}

function CameraFollower({ lat, lon, heading }) {
  const map = useMap();
  const [isUserDragging, setIsUserDragging] = useState(false);
  const timeoutRef = useRef(null);
  const currentBearing = useRef(0);
  const animFrameRef = useRef(null);

  useEffect(() => {
    const startDragging = () => {
      setIsUserDragging(true);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };

    const stopDragging = () => {
      timeoutRef.current = setTimeout(() => setIsUserDragging(false), 3000);
    };

    map.on("movestart", (e) => {
      if (!e.hard) startDragging();
    });
    map.on("moveend", (e) => {
      if (!e.hard) stopDragging();
    });

    return () => {
      map.off("movestart");
      map.off("moveend");
    };
  }, [map]);

  useEffect(() => {
    if (!lat || !lon || isUserDragging) return;

    map.setView([lat, lon], map.getZoom(), {
      animate: true,
      pan: { duration: 1.0, easeLinearity: 1.0, hard: true },
    });

    if (map.setBearing) {
      const target = -heading;
      const diff = ((target - currentBearing.current + 540) % 360) - 180;
      const targetBearing = ((currentBearing.current + diff + 180) % 360) - 180;

      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);

      const startBearing = currentBearing.current;
      const startTime = performance.now();
      const DURATION = 800;

      function animateBearing(now) {
        const t = Math.min((now - startTime) / DURATION, 1);
        const eased = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
        map.setBearing(startBearing + (targetBearing - startBearing) * eased);
        if (t < 1) {
          animFrameRef.current = requestAnimationFrame(animateBearing);
        } else {
          currentBearing.current = targetBearing;
        }
      }

      animFrameRef.current = requestAnimationFrame(animateBearing);
    }

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [lat, lon, heading, isUserDragging, map]);

  return null;
}

export default function DriverMap({
  sidebarOpen,
  incident,
  ambulance,
  hospital,
}) {
  // 1. Add state to latch the arrival
  const [hasArrived, setHasArrived] = useState(false);

  // 2. Latch logic: Once true, it stays true for this incident
  useEffect(() => {
    if (hasArrived || !ambulance || !incident) return;

    const ambKey = String(ambulance.id);
    const routeInc = incident.route_to_incident?.[ambKey];

    if (routeInc && routeInc.length > 0) {
      const [lastLon, lastLat] = routeInc[routeInc.length - 1];
      const dist = Math.hypot(ambulance.lat - lastLat, ambulance.lon - lastLon);

      // If within ~20-30 meters of the incident destination
      if (dist < 0.0003) {
        setHasArrived(true);
      }
    }
  }, [ambulance?.lat, ambulance?.lon, incident?.id, hasArrived]);

  // Reset arrival state if the incident changes or is resolved
  useEffect(() => {
    setHasArrived(false);
  }, [incident?.id]);

  const activeRoute = useMemo(() => {
    const lines = [];
    if (!incident || !ambulance?.id) return lines;

    // Only show routes for active dispatches
    if (incident.status !== "Assigned" && incident.status !== "Queued")
      return lines;

    const ambKey = String(ambulance.id);

    // 3. Use the latched state to decide which route to process
    if (!hasArrived) {
      // EN ROUTE TO INCIDENT
      const routeInc = incident.route_to_incident?.[ambKey];
      const remainingToInc = getProgressiveRoute(
        routeInc,
        ambulance.lat,
        ambulance.lon,
      );

      if (remainingToInc.length > 1) {
        lines.push({
          id: `inc-${incident.id}`,
          positions: remainingToInc,
          color: "#ff2222",
          weight: 5,
          opacity: 0.7,
        });
      }
    } else {
      // TRANSPORTING TO HOSPITAL
      const routeHosp = incident.route_to_hospital?.[ambKey];
      if (routeHosp) {
        const hospitalPath = getProgressiveRoute(
          routeHosp,
          ambulance.lat,
          ambulance.lon,
        );
        if (hospitalPath.length > 1) {
          lines.push({
            id: `hos-${incident.id}`,
            positions: hospitalPath,
            color: "#2244ff",
            weight: 5,
            opacity: 0.7,
          });
        }
      }
    }

    return lines;
  }, [incident, ambulance.lat, ambulance.lon, hasArrived]);

  const heading = useMemo(() => {
    const currentLine = activeRoute[0];
    if (!currentLine || currentLine.positions.length < 2) return 0;

    const positions = currentLine.positions;
    const LOOKAHEAD = Math.min(5, positions.length - 1);

    const fromLat = ambulance?.lat ?? positions[0][0];
    const fromLon = ambulance?.lon ?? positions[0][1];

    let sinSum = 0;
    let cosSum = 0;

    for (let i = 1; i <= LOOKAHEAD; i++) {
      const toLat = positions[i][0];
      const toLon = positions[i][1];

      const dLon = ((toLon - fromLon) * Math.PI) / 180;
      const lat1 = (fromLat * Math.PI) / 180;
      const lat2 = (toLat * Math.PI) / 180;

      const y = Math.sin(dLon) * Math.cos(lat2);
      const x =
        Math.cos(lat1) * Math.sin(lat2) -
        Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);

      const bearing = Math.atan2(y, x);
      sinSum += Math.sin(bearing);
      cosSum += Math.cos(bearing);
    }

    const avgBearing = Math.atan2(sinSum / LOOKAHEAD, cosSum / LOOKAHEAD);
    return ((avgBearing * 180) / Math.PI + 360) % 360;
  }, [activeRoute, ambulance]);

  if (!ambulance?.id) {
    return (
      <div className="driver-waiting">
        <p>
          Waiting for unit data... Ambulance should be passed! Contact
          administrator
        </p>
      </div>
    );
  }

  return (
    <MapContainer
      center={{ lat: ambulance.lat, lng: ambulance.lon }}
      zoom={17}
      style={{ height: "100vh", width: "100%" }}
      zoomControl={false}
      rotate={true}
      bearing={-heading}
      touchRotate={true}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <ZoomControl position="topright" />
      <CameraFollower
        lat={ambulance.lat}
        lon={ambulance.lon}
        heading={heading}
      />

      {incident?.id && (
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
      )}

      <SmoothMarker
        key={`amb-${ambulance.id}`}
        position={[ambulance.lat, ambulance.lon]}
        icon={ambulanceIcon}
      >
        <Popup>
          <strong>Ambulance #{ambulance.id}</strong>
          <br />
          Status: {ambulance.status}
        </Popup>
      </SmoothMarker>

      {hospital?.id && (
        <Marker
          key={`hospital-${hospital.id}`}
          position={[hospital.lat, hospital.lon]}
          icon={hospitalIcon}
        >
          <Popup>
            <strong>{hospital.name}</strong>
          </Popup>
        </Marker>
      )}

      {activeRoute.map((route) => (
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
