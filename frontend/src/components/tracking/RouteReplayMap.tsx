import React, { useState, useEffect, useCallback } from "react";
import { GoogleMap, useJsApiLoader, Marker, Polyline, InfoWindow } from "@react-google-maps/api";

const containerStyle = {
  width: "100%",
  height: "100%",
};

interface Location {
  lat: number;
  lng: number;
}

interface Stop {
  id: string;
  name: string;
  location: string;
  coordinates?: Location;
  time?: string;
  status?: string;
  travelMode?: string; // Optional travel mode (e.g., 'DRIVING', 'WALKING')
}

interface RouteReplayMapProps {
  apiKey: string;
  routeStops: Stop[];
  currentLocation?: Location;
  isPlaying: boolean;
  replayProgress: number;
}

// Helper removed as travelMode is no longer used from API

export function RouteReplayMap({ apiKey, routeStops, currentLocation, isPlaying, replayProgress }: RouteReplayMapProps) {
  const { isLoaded } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: apiKey,
  });

  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [activeMarker, setActiveMarker] = useState<string | null>(null);
  const [etaText, setEtaText] = useState<string | null>(null);

  const defaultCenter = { lat: 20.5937, lng: 78.9629 }; // Center of India

  // Extract all valid coordinates from stops
  const validStops = routeStops.filter((s) => s.coordinates && typeof s.coordinates.lat === 'number');
  const pathCoordinates = validStops.map((s) => s.coordinates as Location);

  const onLoad = useCallback(function callback(map: google.maps.Map) {
    if (pathCoordinates.length > 0) {
      const bounds = new window.google.maps.LatLngBounds();
      pathCoordinates.forEach((coord) => bounds.extend(coord));
      if (currentLocation) {
        bounds.extend(currentLocation);
      }
      map.fitBounds(bounds);
    }
    setMap(map);
  }, [pathCoordinates, currentLocation]);

  const onUnmount = useCallback(function callback(map: google.maps.Map) {
    setMap(null);
  }, []);

  // Calculate rough ETA based on straight line distance (assuming ~30km/h average in city)
  useEffect(() => {
    if (!isLoaded || validStops.length < 2) {
      setEtaText(null);
      return;
    }

    // Very rough straight-line distance in km
    const getDistanceFromLatLonInKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
      const R = 6371; // Radius of the earth in km
      const dLat = (lat2 - lat1) * (Math.PI / 180);
      const dLon = (lon2 - lon1) * (Math.PI / 180);
      const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return R * c;
    };

    let totalDist = 0;
    const points = currentLocation ? [...pathCoordinates, currentLocation] : pathCoordinates;
    for (let i = 0; i < points.length - 1; i++) {
      totalDist += getDistanceFromLatLonInKm(points[i].lat, points[i].lng, points[i + 1].lat, points[i + 1].lng);
    }

    const speedKmh = 30; // avg city speed
    const mins = Math.round((totalDist / speedKmh) * 60);
    setEtaText(`~${mins} mins (straight-line)`);
  }, [isLoaded, currentLocation, pathCoordinates]);

  // Calculate moving marker position based on replayProgress (0 to 100) using the simple polyline array
  const getMovingPosition = (): Location | null => {
    const fullPath = currentLocation ? [...pathCoordinates, currentLocation] : pathCoordinates;
    if (fullPath.length < 2) return fullPath[0] || null;

    const totalSegments = fullPath.length - 1;
    const progressPerSegment = 100 / totalSegments;
    const currentSegmentIndex = Math.min(Math.floor(replayProgress / progressPerSegment), totalSegments - 1);

    const startCoord = fullPath[currentSegmentIndex];
    const endCoord = fullPath[currentSegmentIndex + 1];

    const segmentProgress = (replayProgress % progressPerSegment) / progressPerSegment;

    return {
      lat: startCoord.lat + (endCoord.lat - startCoord.lat) * segmentProgress,
      lng: startCoord.lng + (endCoord.lng - startCoord.lng) * segmentProgress,
    };
  };

  const movingPosition = getMovingPosition();

  if (!isLoaded) return <div className="w-full h-full flex items-center justify-center bg-muted/20">Loading Map...</div>;

  return (
    <div className="relative w-full h-full">
      {etaText && (
        <div className="absolute top-4 left-4 z-10 bg-card/90 backdrop-blur-md px-4 py-2 rounded-lg border border-border shadow-lg">
          <p className="text-sm font-semibold text-foreground">Est. Total Travel Time</p>
          <p className="text-xl font-bold text-primary">{etaText}</p>
        </div>
      )}
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={pathCoordinates.length > 0 ? pathCoordinates[0] : defaultCenter}
        zoom={10}
        onLoad={onLoad}
        onUnmount={onUnmount}
        options={{
          disableDefaultUI: false,
          zoomControl: true,
        }}
      >
        {/* Straight-line Polyline Route instead of Directions to save API costs */}
        {pathCoordinates.length > 1 && (
          <Polyline
            path={currentLocation ? [...pathCoordinates, currentLocation] : pathCoordinates}
            options={{
              strokeColor: "hsl(var(--primary))",
              strokeOpacity: 0.8,
              strokeWeight: 5,
            }}
          />
        )}

        {/* Static Markers for Stops */}
        {validStops.map((stop, index) => (
          <Marker
            key={stop.id || index}
            position={stop.coordinates as Location}
            title={stop.name}
            onClick={() => setActiveMarker(stop.id)}
            icon={{
              url: "http://maps.google.com/mapfiles/ms/icons/red-dot.png"
            }}
          >
            {activeMarker === stop.id && (
              <InfoWindow onCloseClick={() => setActiveMarker(null)}>
                <div className="text-sm p-1">
                  <p className="font-bold">{stop.name}</p>
                  <p className="text-muted-foreground">{stop.location}</p>
                  {stop.time && <p>Time: {stop.time}</p>}
                  {stop.travelMode && <p>Vehicle: <span className="font-semibold">{stop.travelMode}</span></p>}
                </div>
              </InfoWindow>
            )}
          </Marker>
        ))}

        {/* Moving Marker for Replay or Current Live Location */}
        {(isPlaying || currentLocation) && movingPosition && (
          <Marker
            position={isPlaying ? movingPosition : currentLocation!}
            icon={{
              url: "/employee-marker.png",
              scaledSize: new window.google.maps.Size(48, 48),
              anchor: new window.google.maps.Point(24, 48), // Bottom center anchor
            }}
            zIndex={999}
          />
        )}
      </GoogleMap>
    </div>
  );
}
