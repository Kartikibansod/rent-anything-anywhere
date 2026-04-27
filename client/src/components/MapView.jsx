import React from "react";
import L from "leaflet";
import { useEffect, useRef } from "react";

export function MapView({ listings = [] }) {
  const nodeRef = useRef(null);
  const mapRef = useRef(null);

  useEffect(() => {
    if (!nodeRef.current || mapRef.current) return;
    mapRef.current = L.map(nodeRef.current).setView([20.5937, 78.9629], 5);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors"
    }).addTo(mapRef.current);
  }, []);

  useEffect(() => {
    if (!mapRef.current) return;
    const markers = listings
      .filter((listing) => listing.location?.coordinates?.length === 2)
      .map((listing) => {
        const [lng, lat] = listing.location.coordinates;
        return L.marker([lat, lng]).addTo(mapRef.current).bindPopup(listing.title);
      });
    return () => markers.forEach((marker) => marker.remove());
  }, [listings]);

  return <div ref={nodeRef} className="h-80 overflow-hidden rounded-lg border border-slate-200 bg-white" />;
}

