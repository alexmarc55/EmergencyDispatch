import { useEffect, useState } from "react";
import { Marker } from "react-leaflet";
import { useMap } from "react-leaflet";

export default function SmoothMarker({ position, icon, children }) {
  return (
    <Marker
      position={position}
      icon={icon}
      eventHandlers={{
        add: (e) => {
          const iconElement = e.target._icon;
          if (iconElement) {
            // This CSS makes the marker slide to new positions
            iconElement.style.transition = "transform 1s linear";
          }
        },
      }}
    >
      {children}
    </Marker>
  );
}
