"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

type Typhoon = {
  Name: string;
  Category: string;
  Latitude: number;
  Longitude: number;
  WindSpeedKPH: number;
  ETA: string;
};

type TyphoonMapProps = {
  typhoons: Typhoon[];
};

export default function TyphoonMap({ typhoons }: TyphoonMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Clean up existing map instance if it exists
    if (mapRef.current) {
      mapRef.current.remove();
    }

    // Create a custom typhoon icon
    const typhoonIcon = L.divIcon({
      className: "typhoon-marker",
      html: `<div class="typhoon-icon">🌀</div>`,
      iconSize: [40, 40],
      iconAnchor: [20, 20],
    });

    // Initialize the map
    const map = L.map(mapContainerRef.current).setView([20.0, 120.0], 5);
    mapRef.current = map;

    // Add the tile layer
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);

    // Add markers for each typhoon
    typhoons.forEach((typhoon) => {
      const marker = L.marker([typhoon.Latitude, typhoon.Longitude], {
        icon: typhoonIcon,
      }).addTo(map);

      // Create popup content
      const popupContent = `
        <div class="typhoon-popup">
          <h3 class="font-bold text-lg">${typhoon.Name}</h3>
          <p><strong>Category:</strong> ${typhoon.Category}</p>
          <p><strong>Wind Speed:</strong> ${typhoon.WindSpeedKPH} km/h</p>
          <p><strong>ETA:</strong> ${typhoon.ETA}</p>
        </div>
      `;

      marker.bindPopup(popupContent);
    });

    // Fit bounds to show all typhoons
    if (typhoons.length > 0) {
      const bounds = L.latLngBounds(typhoons.map(t => [t.Latitude, t.Longitude]));
      map.fitBounds(bounds, { padding: [50, 50] });
    }

    // Cleanup function
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [typhoons]);

  return (
    <div className="w-full h-[400px] rounded-lg overflow-hidden">
      <div ref={mapContainerRef} className="w-full h-full" />
      <style jsx global>{`
        .typhoon-marker {
          display: flex;
          justify-content: center;
          align-items: center;
          background: transparent;
          border: none;
        }
        .typhoon-icon {
          font-size: 32px;
          animation: spin 2s linear infinite;
          filter: drop-shadow(0 0 2px rgba(0,0,0,0.3));
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .typhoon-popup {
          padding: 12px;
          min-width: 200px;
        }
        .typhoon-popup h3 {
          margin-bottom: 8px;
          color: #1a365d;
        }
        .typhoon-popup p {
          margin: 4px 0;
          color: #4a5568;
        }
        .typhoon-popup strong {
          color: #2d3748;
        }
      `}</style>
    </div>
  );
} 