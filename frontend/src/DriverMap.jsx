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

  // Handle user dragging to temporarily disable camera following
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
      // Calculate the shortest rotation direction
      const target = -heading;
      const startBearing = map.getBearing() || 0;
      const diff = ((((target - startBearing) % 360) + 540) % 360) - 180;
      const targetBearing = startBearing + diff;

      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);

      const startTime = performance.now();
      const DURATION = 800;

      function animateBearing(now) {
        const t = Math.min((now - startTime) / DURATION, 1);
        const eased = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
        const currentVal =
          startBearing + (targetBearing - startBearing) * eased;
        map.setBearing(currentVal);
        currentBearing.current = currentVal;
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
  const lastHeading = useRef(0);
  const arrivalKey =
    incident?.id && ambulance?.id
      ? `arrived-${incident.id}-${ambulance.id}`
      : null;

  const [hasArrived, setHasArrived] = useState(() => {
    if (arrivalKey) {
      return localStorage.getItem(arrivalKey) === "true";
    }
    return false;
  });

  useEffect(() => {
    if (arrivalKey) {
      setHasArrived(localStorage.getItem(arrivalKey) === "true");
    } else {
      setHasArrived(false);
    }
  }, [arrivalKey]);

  useEffect(() => {
    if (hasArrived || !ambulance || !incident || !arrivalKey) return;

    const ambKey = String(ambulance.id);
    const routeInc = incident.route_to_incident?.[ambKey];

    if (routeInc && routeInc.length > 0) {
      const [lastLon, lastLat] = routeInc[routeInc.length - 1];
      const dist = Math.hypot(ambulance.lat - lastLat, ambulance.lon - lastLon);

      if (dist < 0.0003) {
        setHasArrived(true);
        localStorage.setItem(arrivalKey, "true");
      }
    }
  }, [ambulance?.lat, ambulance?.lon, incident?.id, hasArrived, arrivalKey]);

  useEffect(() => {
    if (!ambulance?.id || !incident) return;
    if (incident.status === "Resolved" || ambulance.status === "Available") {
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (
          key &&
          key.startsWith("arrived-") &&
          key.endsWith(`-${ambulance.id}`)
        ) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach((key) => localStorage.removeItem(key));
      setHasArrived(false);
    }
  }, [incident, ambulance?.status, ambulance?.id]);

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
    if (!currentLine || currentLine.positions.length < 2) {
      return lastHeading.current;
    }

    // We look ahead 4 points because the backend sends every 3 points
    const positions = currentLine.positions;
    const LOOKAHEAD = Math.min(4, positions.length - 1);

    let sinSum = 0;
    let cosSum = 0;
    let count = 0;

    for (let i = 0; i < LOOKAHEAD; i++) {
      // We calculate the angle between the current point and the next point in the route
      const lat1 = positions[i][0];
      const lon1 = positions[i][1];
      const lat2 = positions[i + 1][0];
      const lon2 = positions[i + 1][1];

      const dLon = ((lon2 - lon1) * Math.PI) / 180;
      const rLat1 = (lat1 * Math.PI) / 180;
      const rLat2 = (lat2 * Math.PI) / 180;

      const y = Math.sin(dLon) * Math.cos(rLat2);
      const x =
        Math.cos(rLat1) * Math.sin(rLat2) -
        Math.sin(rLat1) * Math.cos(rLat2) * Math.cos(dLon);

      const bearing = Math.atan2(y, x);
      const weight = 1 / (i + 1);

      sinSum += Math.sin(bearing) * weight;
      cosSum += Math.cos(bearing) * weight;
      count += weight;
    }

    if (count === 0) return lastHeading.current;

    const avgBearing = Math.atan2(sinSum / count, cosSum / count);
    const newHeading = ((avgBearing * 180) / Math.PI + 360) % 360;
    lastHeading.current = newHeading;
    return newHeading;
  }, [activeRoute]);

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
      rotateControl={false}
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
