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
import { useEffect, useState } from "react";
import { useMemo, useRef } from "react";
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
  console.log("New Ambulance Coords:", ambulance?.lat, ambulance?.lon);
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

  // console.log("DriverMap received props:", { incident, ambulance, hospital });

  const getProgressiveRoute = (fullRoute, currentLat, currentLon) => {
    if (!fullRoute || fullRoute.length === 0) return [];

    const leafletRoute = fullRoute.map((c) => [c[1], c[0]]);

    let closestIndex = 0;
    let minDistance = Infinity;

    for (let i = 0; i < leafletRoute.length; i++) {
      const dist = Math.sqrt(
        Math.pow(leafletRoute[i][0] - currentLat, 2) +
          Math.pow(leafletRoute[i][1] - currentLon, 2),
      );

      if (dist < minDistance) {
        minDistance = dist;
        closestIndex = i;
      }
    }
    return leafletRoute.slice(closestIndex);
  };

  const activeRoute = useMemo(() => {
    const lines = [];
    if (incident && ambulance && hospital) {
      if (ambulance && incident && incident.status === "Assigned") {
        const distanceToIncident = Math.sqrt(
          Math.pow(ambulance.lat - incident.lat, 2) +
            Math.pow(ambulance.lon - incident.lon, 2),
        );

        const routeEnd = incident.route_to_incident?.at(-1);

        const distanceToRouteEnd = routeEnd
          ? Math.sqrt(
              Math.pow(ambulance.lat - routeEnd[1], 2) +
                Math.pow(ambulance.lon - routeEnd[0], 2),
            )
          : distanceToIncident;
        const hasArrivedAtIncident = distanceToRouteEnd < 0.001; // 100 meters

        if (incident.route_to_incident && !hasArrivedAtIncident) {
          const remainingToInc = getProgressiveRoute(
            incident.route_to_incident,
            ambulance.lat,
            ambulance.lon,
          );

          if (remainingToInc.length > 2) {
            lines.push({
              id: `inc-${incident.id}`,
              positions: remainingToInc,
              color: "#ff2222",
              weight: 5,
              opacity: 0.7,
            });
          }
        }

        // 2. Logic for Route to Hospital (Blue Line)
        if (incident.route_to_hospital && hasArrivedAtIncident) {
          const hospitalPath = getProgressiveRoute(
            incident.route_to_hospital,
            ambulance.lat,
            ambulance.lon,
          );

          if (hospitalPath.length > 2) {
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
    }
    return [];
  }, [incident, ambulance]);

  const heading = useMemo(() => {
    const currentLine = activeRoute[0];
    if (!currentLine || currentLine.positions.length < 2) return 0;

    const curr = currentLine.positions[0];
    const next = currentLine.positions[1];

    const dLon = ((next[1] - curr[1]) * Math.PI) / 180;
    const y = Math.sin(dLon) * Math.cos((next[0] * Math.PI) / 180);
    const x =
      Math.cos((curr[0] * Math.PI) / 180) *
        Math.sin((next[0] * Math.PI) / 180) -
      Math.sin((curr[0] * Math.PI) / 180) *
        Math.cos((next[0] * Math.PI) / 180) *
        Math.cos(dLon);

    return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
  }, [activeRoute]);

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

      {activeRoute.length > 0 &&
        activeRoute.map((route) => (
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
