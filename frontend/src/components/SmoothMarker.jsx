import { useEffect, useState } from 'react';
import { Marker } from 'react-leaflet';

export default function SmoothMarker({ position, icon, children }) {
  const [currentPos, setCurrentPos] = useState(position);

  useEffect(() => {
    // When the position prop updates from the parent, 
    // we let the marker "slide" to the new spot.
    setCurrentPos(position);
  }, [position]);

  return (
    <Marker 
      position={currentPos} 
      icon={icon}
      eventHandlers={{
        add: (e) => {
          const iconElement = e.target._icon;
          if (iconElement) {
            iconElement.style.transition = "transform 1s linear"; 
          }
        }
      }}
    >
      {children}
    </Marker>
  );
}