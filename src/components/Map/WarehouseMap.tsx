/**
 * Warehouse Map - Leaflet-based coordinate visualization
 *
 * Uses Leaflet's CRS.Simple for x/y coordinate system (not geographic).
 * Coordinates stored in meters, displayed in feet.
 * Renders product positions as colored circles.
 */

import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { ProductLocationForMap, GenesisPoint } from '@/types/map';
import { useTheme } from '@/components/theme-provider';
import { Button } from '@/components/ui/button';
import { Minus, Plus } from 'lucide-react';

interface WarehouseMapProps {
  locations: ProductLocationForMap[];
  genesis: GenesisPoint;
}

export function WarehouseMap({ locations, genesis }: WarehouseMapProps) {
  const { theme } = useTheme();
  const MAX_ZOOM = 12;
  const MIN_ZOOM = -2;
  const mapKey = `map-${MAX_ZOOM}`;
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const gridOverlayRef = useRef<L.ImageOverlay | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [zoomState, setZoomState] = useState<{ zoom: number; min: number; max: number } | null>(null);

  // Detect if we're in dark mode
  const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  // Helper function to generate grid canvas based on theme
  const generateGridCanvas = (): string => {
    const canvas = document.createElement('canvas');
    canvas.width = 2000;
    canvas.height = 2000;
    const ctx = canvas.getContext('2d');

    if (ctx) {
      // Get actual app background color by creating a temporary element
      const tempDiv = document.createElement('div');
      tempDiv.className = 'bg-background';
      tempDiv.style.display = 'none';
      document.body.appendChild(tempDiv);
      const bgColor = getComputedStyle(tempDiv).backgroundColor;
      document.body.removeChild(tempDiv);

      // Fill background
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, 2000, 2000);
    }

    return canvas.toDataURL();
  };

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || mapInstance.current) return;

    // Create map with simple coordinate system (not geographic)
    const map = L.map(mapContainer.current, {
      crs: L.CRS.Simple,
      center: [0, 0],
      zoom: 1,
      minZoom: MIN_ZOOM,
      maxZoom: MAX_ZOOM,
      zoomSnap: 1,
      zoomDelta: 1,
      zoomControl: false,
      attributionControl: false,
    });

    const markerPane = map.getPane('markerPane');
    if (markerPane) markerPane.style.zIndex = '400';
    const popupPane = map.getPane('popupPane');
    if (popupPane) popupPane.style.zIndex = '1000';

    // Add scale control (shows distance, auto-adjusts to zoom)
    L.control.scale({
      position: 'bottomright',
      metric: false,
      imperial: true,
      maxWidth: 150,
    }).addTo(map);

    // Add grid background
    const imageUrl = generateGridCanvas();
    const bounds = L.latLngBounds([[-1000, -1000], [1000, 1000]]);

    gridOverlayRef.current = L.imageOverlay(imageUrl, bounds).addTo(map);

    // Create markers layer
    markersLayerRef.current = L.layerGroup().addTo(map);

    mapInstance.current = map;
    setMapReady(true);
    const syncZoomState = () => {
      setZoomState({ zoom: map.getZoom(), min: map.getMinZoom(), max: map.getMaxZoom() });
    };
    syncZoomState();
    map.on('zoomend zoomlevelschange', syncZoomState);

    return () => {
      map.off('zoomend zoomlevelschange', syncZoomState);
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, []);

  // Keep zoom constraints in sync (helps during fast refresh)
  useEffect(() => {
    if (!mapInstance.current) return;
    mapInstance.current.options.maxZoom = MAX_ZOOM;
    mapInstance.current.options.minZoom = MIN_ZOOM;
    mapInstance.current.setMaxZoom(MAX_ZOOM);
    mapInstance.current.setMinZoom(MIN_ZOOM);
    (mapInstance.current as any)._updateZoomLevels?.();
    mapInstance.current.fire('zoomlevelschange');
    mapInstance.current.invalidateSize({ animate: false });
  }, [MAX_ZOOM, MIN_ZOOM]);

  // Update grid when theme changes
  useEffect(() => {
    if (!mapInstance.current || !gridOverlayRef.current) return;

    const imageUrl = generateGridCanvas();
    gridOverlayRef.current.setUrl(imageUrl);
  }, [isDark]);

  // Update markers when locations change
  useEffect(() => {
    if (!mapReady || !mapInstance.current || !markersLayerRef.current) return;

    const map = mapInstance.current;
    const markersLayer = markersLayerRef.current;

    // Clear existing markers
    markersLayer.clearLayers();

    if (locations.length === 0) return;

    // Add genesis marker (origin point)
    const borderColor = isDark ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255, 255, 255, 0.95)'; // background color

      const genesisIcon = L.divIcon({
        html: `
        <div style="
          width: 16px;
          height: 16px;
          background: ${borderColor};
          border: 3px solid #3b82f6;
          border-radius: 50%;
          box-shadow: none;
        "></div>
      `,
        className: 'genesis-marker',
        iconSize: [16, 16],
      iconAnchor: [8, 8],
    });

    L.marker([0, 0], { icon: genesisIcon })
      .bindPopup(
        `<div class="map-popup-content map-popup-center">
          <div class="map-popup-title">Genesis Point</div>
          <div class="map-popup-sub">Origin (0, 0)</div>
          <div class="map-popup-sub map-popup-mono">
            ${genesis.genesis_lat.toFixed(6)}, ${genesis.genesis_lng.toFixed(6)}
          </div>
        </div>`,
        { className: 'map-popup-shell' }
      )
      .addTo(markersLayer);

    // Add product location markers
    locations.forEach((location) => {
      // In Leaflet's CRS.Simple, y is flipped (north is positive)
      // Our coordinate system has y positive = north, which matches Leaflet
      const latLng: L.LatLngExpression = [location.position_y, location.position_x];

      const markerIcon = L.divIcon({
        html: `
          <div style="
            width: 12px;
            height: 12px;
            background: ${location.load_color};
            border: none;
            border-radius: 0;
            box-shadow: none;
          "></div>
        `,
        className: 'product-marker',
        iconSize: [12, 12],
        iconAnchor: [6, 6],
      });

      const marker = L.marker(latLng, { icon: markerIcon });

      // Create popup content
      // Convert meters to feet for display
      const xFeet = (location.position_x * 3.28084).toFixed(1);
      const yFeet = (location.position_y * 3.28084).toFixed(1);
      const accuracyFeet = location.accuracy ? Math.round(location.accuracy * 3.28084) : null;

      const title = location.model || location.product_type || 'Unknown';
      const serialValue = location.serial || '—';
      const loadLabel = location.load_friendly_name || location.sub_inventory || 'No Load';
      const scannedAt = location.created_at
        ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(
            new Date(location.created_at)
          )
        : '—';

      const popupContent = `
        <div class="map-popup-content">
          <div class="map-popup-title">${title}</div>
          <div class="map-popup-sub">Serial: ${serialValue}</div>
          <div class="map-popup-sub map-popup-load">
            <span class="map-popup-color" style="background: ${location.load_color};"></span>
            ${loadLabel}
          </div>
          <div class="map-popup-sub map-popup-sub-sm">Last scanned: ${scannedAt}</div>
          <div class="map-popup-sub map-popup-mono">
            x: ${xFeet}ft<br/>
            y: ${yFeet}ft
          </div>
          ${
            accuracyFeet
              ? `<div class="map-popup-sub map-popup-sub-sm">GPS ±${accuracyFeet}ft</div>`
              : ''
          }
        </div>
      `;

      marker.bindPopup(popupContent, { className: 'map-popup-shell' });
      marker.addTo(markersLayer);
    });

    // Fit map to show all markers
    if (locations.length > 0) {
      const allPoints = locations.map((l) => [l.position_y, l.position_x] as L.LatLngExpression);
      allPoints.push([0, 0]); // Include genesis

      const bounds = L.latLngBounds(allPoints);
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: MAX_ZOOM });
    }
  }, [locations, genesis, mapReady, isDark]);

  return (
    <div className="relative w-full z-0">
      <div
        ref={mapContainer}
        key={mapKey}
        className="w-full bg-background relative z-0"
        style={{ height: 'clamp(450px, 70vh, 600px)' }}
      />
      <div className="absolute top-2 right-2 sm:top-4 sm:right-4 z-[100] flex flex-col gap-1">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-8 w-8 bg-card/95 backdrop-blur"
          onClick={() => mapInstance.current?.zoomIn()}
          disabled={zoomState ? zoomState.zoom >= zoomState.max : false}
          aria-label="Zoom in"
        >
          <Plus className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-8 w-8 bg-card/95 backdrop-blur"
          onClick={() => mapInstance.current?.zoomOut()}
          disabled={zoomState ? zoomState.zoom <= zoomState.min : false}
          aria-label="Zoom out"
        >
          <Minus className="h-4 w-4" />
        </Button>
      </div>
      <div className="absolute bottom-2 left-2 sm:bottom-4 sm:left-4 z-[100] bg-card/95 backdrop-blur border border-border p-1.5 sm:p-3 rounded text-[9px] sm:text-xs shadow-lg">
        <div className="flex items-center gap-1 sm:gap-2 mb-0.5 sm:mb-1.5">
          <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-blue-500 border border-background" />
          <span className="text-foreground font-medium">Genesis</span>
        </div>
        <div className="flex items-center gap-1 sm:gap-2">
          <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-emerald-500 border border-background" />
          <span className="text-foreground font-medium">Scans</span>
        </div>
        <div className="text-muted-foreground mt-1 sm:mt-2 pt-1 sm:pt-2 border-t border-border text-[8px] sm:text-[10px]">
          {locations.length}
        </div>
      </div>
    </div>
  );
}
