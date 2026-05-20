import React, { useState, useEffect, useRef } from 'react';
import { 
  MapPin, 
  TrendingUp, 
  Clock, 
  Heart, 
  UploadCloud, 
  FileCode, 
  Activity,
  Maximize2
} from 'lucide-react';

export default function GpxVisualizer({ gpxData, onGpxLoaded, readOnly = false, theme = 'dark' }) {
  const [isLeafletLoaded, setIsLeafletLoaded] = useState(false);
  const [hoveredPointIdx, setHoveredPointIdx] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [mapMetric, setMapMetric] = useState('pace');
  const [alertMsg, setAlertMsg] = useState('');

  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const segmentsGroup = useRef(null);
  const hoverMarker = useRef(null);
  const startMarker = useRef(null);
  const endMarker = useRef(null);

  // Extract structured points array from gpxData
  const points = Array.isArray(gpxData) ? gpxData : (gpxData?.points || []);
  const hasRoute = points.length > 0;
  const hasHRTelemetry = points.some(p => p.hr !== null && p.hr !== undefined && p.hr > 0);

  // Trigger redraw of segments when mapMetric changes
  useEffect(() => {
    if (isLeafletLoaded && mapInstance.current && window.L) {
      drawPaceHeatmap(window.L);
    }
  }, [mapMetric, isLeafletLoaded]);

  // --- 1. DYNAMIC LEAFLET LOADER ---
  useEffect(() => {
    if (!hasRoute) return;

    if (window.L) {
      setIsLeafletLoaded(true);
      return;
    }

    // Append Leaflet CSS
    const css = document.createElement('link');
    css.rel = 'stylesheet';
    css.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    css.id = 'leaflet-css';
    document.head.appendChild(css);

    // Append Leaflet JS
    const js = document.createElement('script');
    js.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    js.id = 'leaflet-js';
    js.async = true;
    js.onload = () => {
      setIsLeafletLoaded(true);
    };
    document.head.appendChild(js);

    return () => {
      // Keep Leaflet in memory once loaded to avoid duplicate requests when toggling tabs
    };
  }, [hasRoute]);

  // --- 2. LEAFLET MAP INITIALIZATION & RENDERING ---
  useEffect(() => {
    if (!isLeafletLoaded || !hasRoute || !mapRef.current) return;

    const L = window.L;

    // Clean up previous map instance if it exists
    if (mapInstance.current) {
      mapInstance.current.remove();
      mapInstance.current = null;
    }

    // Initialize Map
    mapInstance.current = L.map(mapRef.current, {
      zoomControl: true,
      scrollWheelZoom: true
    });

    // Dark base layer vs Light base layer depending on active theme
    const isLight = theme === 'light';
    const tileUrl = isLight 
      ? 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png'
      : 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
    
    const attribution = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>';

    L.tileLayer(tileUrl, { attribution, maxZoom: 20 }).addTo(mapInstance.current);

    // Create a feature group for track polylines
    segmentsGroup.current = L.featureGroup().addTo(mapInstance.current);

    // Draw track colored by pace
    drawPaceHeatmap(L);

    // Add Start and End custom glowing indicators
    if (points.length > 0) {
      const startPt = points[0];
      const endPt = points[points.length - 1];

      // Custom Green glowing marker for start
      const startIcon = L.divIcon({
        className: 'gps-custom-pin start-pin',
        html: `<div class="pin-core" style="background: #10b981; box-shadow: 0 0 10px #10b981;"></div>`,
        iconSize: [12, 12],
        iconAnchor: [6, 6]
      });

      startMarker.current = L.marker([startPt.lat, startPt.lon], { icon: startIcon, title: 'Inicio' })
        .addTo(mapInstance.current)
        .bindPopup('<b>Inicio del Recorrido</b>');

      // Custom Pink glowing marker for end
      const endIcon = L.divIcon({
        className: 'gps-custom-pin end-pin',
        html: `<div class="pin-core" style="background: #ec4899; box-shadow: 0 0 10px #ec4899;"></div>`,
        iconSize: [12, 12],
        iconAnchor: [6, 6]
      });

      endMarker.current = L.marker([endPt.lat, endPt.lon], { icon: endIcon, title: 'Final' })
        .addTo(mapInstance.current)
        .bindPopup(`<b>Fin del Recorrido</b><br>Distancia total: ${endPt.distance?.toFixed(2)} km`);

      // Fit map view bounds with padding
      const latLngs = points.map(p => [p.lat, p.lon]);
      const bounds = L.latLngBounds(latLngs);
      mapInstance.current.fitBounds(bounds, { padding: [30, 30] });
    }

    // Set up hover marker
    const hoverIcon = L.divIcon({
      className: 'gps-custom-pin hover-pin',
      html: `<div class="pin-core-hover animate-pulse" style="background: #06b6d4; box-shadow: 0 0 15px #06b6d4, 0 0 5px #fff; width: 12px; height: 12px; border: 2px solid white; border-radius: 50%;"></div>`,
      iconSize: [12, 12],
      iconAnchor: [6, 6]
    });
    hoverMarker.current = L.marker([0, 0], { icon: hoverIcon });

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, [isLeafletLoaded, gpxData, theme]);

  // --- 3. SYNCHRONIZE MAP INDICATOR ON HOVER ---
  useEffect(() => {
    if (!mapInstance.current || !hoverMarker.current || hoveredPointIdx === null || !points[hoveredPointIdx]) {
      if (hoverMarker.current && mapInstance.current) {
        hoverMarker.current.remove();
      }
      return;
    }

    const targetPt = points[hoveredPointIdx];
    hoverMarker.current.setLatLng([targetPt.lat, targetPt.lon]);
    
    if (!mapInstance.current.hasLayer(hoverMarker.current)) {
      hoverMarker.current.addTo(mapInstance.current);
    }
  }, [hoveredPointIdx, points]);

  // --- 4. SEGMENT DRAWING WITH MULTIPLE METRICS & HOVER INTERACTiveness ---
  const drawPaceHeatmap = (L) => {
    if (!segmentsGroup.current || points.length < 2) return;

    // Clear previous layers
    segmentsGroup.current.clearLayers();

    const age = Number(localStorage.getItem('fitanalytics_profile_age') || localStorage.getItem('fitanalytics_age')) || 25;
    const maxHR = Math.round(208 - 0.7 * age);

    for (let i = 1; i < points.length; i++) {
      const p1 = points[i - 1];
      const p2 = points[i];

      let color = '#a855f7'; // Purple (standard fallback)

      if (mapMetric === 'pace') {
        const pace = p2.pace || 300; // fallback
        if (pace < 270) {
          color = '#06b6d4'; // Cyan neon (Fast, under 4:30/km)
        } else if (pace > 345) {
          color = '#ec4899'; // Pink/Magenta neon (Slow, over 5:45/km)
        } else {
          color = '#a855f7'; // Purple neon (Medium, 4:30 - 5:45/km)
        }
      } else if (mapMetric === 'hr') {
        if (p2.hr && p2.hr > 0) {
          const pct = p2.hr / maxHR;
          if (pct < 0.60) {
            color = '#3b82f6'; // Z1: Azul
          } else if (pct < 0.70) {
            color = '#10b981'; // Z2: Verde
          } else if (pct < 0.80) {
            color = '#f59e0b'; // Z3: Ámbar
          } else if (pct < 0.90) {
            color = '#f97316'; // Z4: Naranja
          } else {
            color = '#ef4444'; // Z5: Rojo
          }
        } else {
          color = '#a855f7'; // Fallback morado para puntos sin telemetría HR
        }
      }

      // Draw glowing shadow line behind primary line
      L.polyline([[p1.lat, p1.lon], [p2.lat, p2.lon]], {
        color: color,
        weight: 7,
        opacity: 0.22,
        lineCap: 'round',
        lineJoin: 'round'
      }).addTo(segmentsGroup.current);

      // Draw primary crisp front line
      const polyline = L.polyline([[p1.lat, p1.lon], [p2.lat, p2.lon]], {
        color: color,
        weight: 3.5,
        opacity: 0.95,
        lineCap: 'round',
        lineJoin: 'round'
      }).addTo(segmentsGroup.current);

      // Bidirectional Leaflet -> SVG hover interaction
      polyline.on('mouseover', () => {
        setHoveredPointIdx(i);
      });
      polyline.on('mouseout', () => {
        setHoveredPointIdx((prev) => (prev === i ? null : prev));
      });
    }
  };

  // --- 5. GPX XML PARSING & INTELLECTUAL DOWNSAMPLING ---
  const parseGpxText = (text) => {
    try {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(text, 'application/xml');
      
      const parserError = xmlDoc.querySelector('parsererror');
      if (parserError) {
        throw new Error('El archivo no tiene un formato XML/GPX válido.');
      }

      const trackpoints = xmlDoc.querySelectorAll('trkpt');
      if (trackpoints.length === 0) {
        throw new Error('No se encontraron puntos de ruta (<trkpt>) en este archivo GPX.');
      }

      // Extract raw points
      const rawPoints = [];
      trackpoints.forEach((tp) => {
        const lat = parseFloat(tp.getAttribute('lat'));
        const lon = parseFloat(tp.getAttribute('lon'));
        const ele = tp.querySelector('ele') ? parseFloat(tp.querySelector('ele').textContent) : 0;
        const time = tp.querySelector('time') ? tp.querySelector('time').textContent : null;
        
        const hrEl = tp.getElementsByTagName('hr')[0] || tp.getElementsByTagName('gpxtpx:hr')[0] || tp.querySelector('hr');
        const hr = hrEl ? parseInt(hrEl.textContent) : null;
        
        if (!isNaN(lat) && !isNaN(lon)) {
          rawPoints.push({ lat, lon, ele, time, hr });
        }
      });

      if (rawPoints.length < 2) {
        throw new Error('El archivo GPX debe contener al menos 2 puntos de geolocalización válidos.');
      }

      // Haversine Distance helper (km)
      const haversineDist = (pt1, pt2) => {
        const R = 6371; // Earth radius
        const dLat = (pt2.lat - pt1.lat) * Math.PI / 180;
        const dLon = (pt2.lon - pt1.lon) * Math.PI / 180;
        const a = 
          Math.sin(dLat/2) * Math.sin(dLat/2) +
          Math.cos(pt1.lat * Math.PI / 180) * Math.cos(pt2.lat * Math.PI / 180) * 
          Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
      };

      // Perform Downsampling if route is very large to prevent localstorage limit crash
      // Max points: 800
      const limit = 800;
      const step = Math.ceil(rawPoints.length / limit);
      const sampledRawPoints = [];
      
      if (step > 1) {
        for (let i = 0; i < rawPoints.length; i += step) {
          sampledRawPoints.push(rawPoints[i]);
        }
        // Ensure last point is always included to match exact end coordinate
        if ((rawPoints.length - 1) % step !== 0) {
          sampledRawPoints.push(rawPoints[rawPoints.length - 1]);
        }
      } else {
        sampledRawPoints.push(...rawPoints);
      }

      // Compute telemetries (distance accum, speed, smoothed pace)
      let accumDist = 0;
      const computedPoints = [];

      for (let i = 0; i < sampledRawPoints.length; i++) {
        const curr = sampledRawPoints[i];
        
        if (i === 0) {
          computedPoints.push({
            ...curr,
            distance: 0,
            pace: 0,
            speed: 0
          });
          continue;
        }

        const prev = sampledRawPoints[i - 1];
        const stepDist = haversineDist(prev, curr);
        accumDist += stepDist;

        let paceInSeconds = 300; // default 5:00/km fallback
        let speed = 12; // default 12 km/h fallback

        if (curr.time && prev.time) {
          const timeDiffSecs = (new Date(curr.time) - new Date(prev.time)) / 1000;
          if (timeDiffSecs > 0 && stepDist > 0) {
            speed = (stepDist / (timeDiffSecs / 3600)); // km/h
            paceInSeconds = timeDiffSecs / stepDist; // secs per km
            
            // Clamp pace to avoid infinity spikes when stopped
            if (paceInSeconds > 900) paceInSeconds = 900; // max 15:00/km
            if (paceInSeconds < 120) paceInSeconds = 120; // min 2:00/km
          }
        }

        computedPoints.push({
          ...curr,
          distance: accumDist,
          pace: paceInSeconds,
          speed: speed
        });
      }

      // Apply simple moving average smoothing to pace values to prevent extreme GPS noise spikes
      const smoothWindow = 3;
      for (let i = 0; i < computedPoints.length; i++) {
        if (i < smoothWindow || i >= computedPoints.length - smoothWindow) continue;
        
        let sum = 0;
        for (let w = -smoothWindow; w <= smoothWindow; w++) {
          sum += computedPoints[i + w].pace;
        }
        computedPoints[i].pace = Math.round(sum / (smoothWindow * 2 + 1));
      }

      // Extract global variables for callback
      const totalDist = accumDist;
      let totalDurationStr = '00:00:00';
      let dateIso = new Date().toISOString().split('T')[0];

      if (computedPoints[0].time && computedPoints[computedPoints.length - 1].time) {
        const startT = new Date(computedPoints[0].time);
        const endT = new Date(computedPoints[computedPoints.length - 1].time);
        
        // Populate workout date
        dateIso = startT.toISOString().split('T')[0];

        const durationSecs = Math.max(0, Math.round((endT - startT) / 1000));
        const hours = Math.floor(durationSecs / 3600);
        const mins = Math.floor((durationSecs % 3600) / 60);
        const secs = durationSecs % 60;
        totalDurationStr = [
          hours.toString().padStart(2, '0'),
          mins.toString().padStart(2, '0'),
          secs.toString().padStart(2, '0')
        ].join(':');
      }

      // Prepare final struct
      const parsedStruct = {
        points: computedPoints,
        summary: {
          distance: totalDist,
          duration: totalDurationStr,
          date: dateIso,
          maxElevation: Math.max(...computedPoints.map(p => p.ele || 0)),
          minElevation: Math.min(...computedPoints.map(p => p.ele || 0))
        }
      };

      setErrorMsg('');
      if (onGpxLoaded) {
        onGpxLoaded(parsedStruct);
      }
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || 'Error al procesar el archivo GPX.');
    }
  };

  // --- 6. DRAG & DROP INTERACTION HANDLERS ---
  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    
    const file = e.dataTransfer.files[0];
    if (file) {
      if (!file.name.toLowerCase().endsWith('.gpx')) {
        setErrorMsg('El archivo debe tener formato .gpx para poder mapearse.');
        return;
      }
      
      const reader = new FileReader();
      reader.onload = (event) => {
        parseGpxText(event.target.result);
      };
      reader.readAsText(file);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        parseGpxText(event.target.result);
      };
      reader.readAsText(file);
    }
  };

  // --- 7. SVG ELEVATION CHART VECTOR GENERATORS ---
  const getElevationChartData = () => {
    if (points.length < 2) return null;

    const elevations = points.map(p => p.ele || 0);
    const maxEle = Math.max(...elevations);
    const minEle = Math.min(...elevations);
    const totalD = points[points.length - 1].distance || 0;

    // Small boundary margin so plot does not sit flat
    const eleDiff = maxEle - minEle;
    const lowerEleLimit = Math.max(0, minEle - (eleDiff * 0.1 || 5));
    const upperEleLimit = maxEle + (eleDiff * 0.1 || 5);
    const spanEle = upperEleLimit - lowerEleLimit;

    // Map to width=500, height=90 SVG dimensions
    const width = 500;
    const height = 80;

    const mappedCoords = points.map((p) => {
      const x = totalD > 0 ? (p.distance / totalD) * width : 0;
      const val = p.ele || 0;
      const y = height - ((val - lowerEleLimit) / (spanEle || 1)) * height;
      return { x, y, ele: val, distance: p.distance };
    });

    // Generate Path for SVG line
    const linePath = 'M ' + mappedCoords.map(c => `${c.x.toFixed(1)} ${c.y.toFixed(1)}`).join(' L ');
    
    // Generate Path for filled area
    const areaPath = linePath + ` L ${width} ${height} L 0 ${height} Z`;

    return {
      coords: mappedCoords,
      linePath,
      areaPath,
      width,
      height,
      maxEle,
      minEle,
      totalD,
      lowerEleLimit,
      upperEleLimit
    };
  };

  const elevChart = getElevationChartData();

  // Handle Mouse hovering on SVG
  const handleSvgMouseMove = (e) => {
    if (!elevChart || points.length === 0) return;
    
    const svgNode = e.currentTarget;
    const rect = svgNode.getBoundingClientRect();
    const hoverX = e.clientX - rect.left; // relative X coordinate
    
    // Normalize X ratio to distance
    const widthRatio = Math.min(1, Math.max(0, hoverX / rect.width));
    const targetDistance = widthRatio * elevChart.totalD;

    // Find the point index closest to the hovered distance
    let closestIdx = 0;
    let minDiff = Infinity;
    
    for (let i = 0; i < points.length; i++) {
      const diff = Math.abs((points[i].distance || 0) - targetDistance);
      if (diff < minDiff) {
        minDiff = diff;
        closestIdx = i;
      }
    }

    setHoveredPointIdx(closestIdx);
  };

  const handleSvgMouseLeave = () => {
    setHoveredPointIdx(null);
  };

  // Pace format formatter: converts seconds to MM:SS
  const formatPaceMMSS = (paceSecs) => {
    if (!paceSecs || isNaN(paceSecs)) return '0:00';
    const m = Math.floor(paceSecs / 60);
    const s = Math.round(paceSecs % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const age = Number(localStorage.getItem('fitanalytics_profile_age') || localStorage.getItem('fitanalytics_age')) || 25;
  const maxHR = Math.round(208 - 0.7 * age);

  return (
    <div className="gpx-visualizer-container mb-4">
      {/* 8. DROP ZONE UPLOAD FOR OFF-LINE REGISTRIES */}
      {!hasRoute ? (
        <div 
          className={`gpx-drop-zone glass-card text-center ${dragOver ? 'drag-active' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <input 
            type="file" 
            accept=".gpx" 
            id="gpxFileInput" 
            onChange={handleFileSelect} 
            style={{ display: 'none' }} 
          />
          <UploadCloud size={40} className="gpx-upload-icon animate-bounce text-primary mb-2" />
          <h4 className="font-bold text-sm text-primary mb-1">Visor e Importador GPX</h4>
          <p className="text-secondary text-xs leading-relaxed max-w-sm mx-auto mb-3">
            Arrastra y suelta tu archivo <strong>.GPX</strong> (Garmin, Strava, Apple Watch) aquí, o haz clic para buscarlo en tu disco.
          </p>
          <label htmlFor="gpxFileInput" className="btn btn-secondary py-1.5 px-4 cursor-pointer text-xs font-semibold">
            Seleccionar Archivo .gpx
          </label>
          
          {errorMsg && (
            <p className="text-danger text-xs mt-3 flex-center gap-1 font-semibold">
              ⚠️ {errorMsg}
            </p>
          )}
        </div>
      ) : (
        <div className="gpx-visualizer-active fade-in">
          {/* Dashboard telemetry bars */}
          <div className="gpx-telemetry-header flex flex-wrap gap-4 justify-between items-center mb-2 px-1">
            <span className="flex-center gap-1.5 text-xs font-bold text-primary" style={{ color: 'var(--color-running)' }}>
              <Activity size={15} /> Telemetría Cartográfica GPS
            </span>
            {mapMetric === 'pace' ? (
              <div className="flex gap-3 text-3xs text-secondary">
                <span className="legend-item"><span className="legend-color" style={{ background: '#06b6d4' }}></span> &lt; 4:30 min/km (Rápido)</span>
                <span className="legend-item"><span className="legend-color" style={{ background: '#a855f7' }}></span> 4:30 - 5:45 min/km (Ritmo)</span>
                <span className="legend-item"><span className="legend-color" style={{ background: '#ec4899' }}></span> &gt; 5:45 min/km (Suave)</span>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2 text-3xs text-secondary">
                <span className="legend-item"><span className="legend-color" style={{ background: '#3b82f6' }}></span> Z1 (&lt;{Math.round(maxHR * 0.6)} ppm)</span>
                <span className="legend-item"><span className="legend-color" style={{ background: '#10b981' }}></span> Z2 ({Math.round(maxHR * 0.6)}-{Math.round(maxHR * 0.7 - 1)} ppm)</span>
                <span className="legend-item"><span className="legend-color" style={{ background: '#f59e0b' }}></span> Z3 ({Math.round(maxHR * 0.7)}-{Math.round(maxHR * 0.8 - 1)} ppm)</span>
                <span className="legend-item"><span className="legend-color" style={{ background: '#f97316' }}></span> Z4 ({Math.round(maxHR * 0.8)}-{Math.round(maxHR * 0.9 - 1)} ppm)</span>
                <span className="legend-item"><span className="legend-color" style={{ background: '#ef4444' }}></span> Z5 (&gt;={Math.round(maxHR * 0.9)} ppm)</span>
              </div>
            )}
          </div>

          <div className="gpx-map-wrapper relative mb-3">
            {/* Elegant Floating Metric Selector */}
            {isLeafletLoaded && hasRoute && (
              <div 
                className="absolute right-3 top-3 flex gap-1 p-1"
                style={{ 
                  zIndex: 10, 
                  background: 'rgba(18, 22, 33, 0.85)', 
                  backdropFilter: 'blur(8px)',
                  border: '1px solid rgba(255, 255, 255, 0.08)', 
                  borderRadius: '12px',
                  boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)'
                }}
              >
                <button 
                  onClick={() => setMapMetric('pace')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${mapMetric === 'pace' ? 'text-white' : 'text-slate-400 hover:text-white'}`}
                  style={{
                    background: mapMetric === 'pace' ? 'rgba(6, 182, 212, 0.2)' : 'transparent',
                    border: mapMetric === 'pace' ? '1px solid rgba(6, 182, 212, 0.3)' : '1px solid transparent',
                    boxShadow: mapMetric === 'pace' ? '0 0 10px rgba(6, 182, 212, 0.15)' : 'none',
                    cursor: 'pointer'
                  }}
                >
                  <Clock size={13} /> Ritmo
                </button>
                <button 
                  onClick={() => {
                    if (hasHRTelemetry) {
                      setMapMetric('hr');
                    } else {
                      setAlertMsg('Este entrenamiento no posee telemetría de ritmo cardíaco.');
                      setTimeout(() => setAlertMsg(''), 4000);
                    }
                  }}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${!hasHRTelemetry ? 'opacity-40 cursor-not-allowed' : ''} ${mapMetric === 'hr' ? 'text-white' : 'text-slate-400 hover:text-white'}`}
                  style={{
                    background: mapMetric === 'hr' ? 'rgba(239, 68, 68, 0.2)' : 'transparent',
                    border: mapMetric === 'hr' ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid transparent',
                    boxShadow: mapMetric === 'hr' ? '0 0 10px rgba(239, 68, 68, 0.15)' : 'none',
                    cursor: hasHRTelemetry ? 'pointer' : 'not-allowed'
                  }}
                  title={!hasHRTelemetry ? 'Sin telemetría de Frecuencia Cardíaca disponible' : 'Frecuencia Cardíaca'}
                >
                  <Heart size={13} /> Frecuencia Cardíaca
                </button>
              </div>
            )}

            {/* Custom Floating Cyberpunk Alert Popup */}
            {alertMsg && (
              <div 
                className="absolute left-1/2 top-4 transform -translate-x-1/2 px-4 py-2 border text-xs font-bold rounded-lg shadow-lg flex items-center gap-2 animate-bounce"
                style={{ 
                  zIndex: 20, 
                  background: 'rgba(28, 20, 20, 0.95)', 
                  borderColor: 'rgba(239, 68, 68, 0.4)',
                  color: '#fca5a5',
                  backdropFilter: 'blur(8px)',
                  boxShadow: '0 0 20px rgba(239, 68, 68, 0.25)',
                  borderRadius: '10px'
                }}
              >
                ⚠️ {alertMsg}
              </div>
            )}

            {/* The actual Leaflet DOM Element */}
            <div 
              ref={mapRef} 
              className="gpx-leaflet-map glass-card"
              style={{ height: '320px', borderRadius: '16px', zIndex: 1 }}
            >
              {!isLeafletLoaded && (
                <div className="absolute inset-0 flex-center flex-col gap-2 bg-slate-900/50 backdrop-blur-md" style={{ borderRadius: '16px', zIndex: 10 }}>
                  <div className="map-spinner animate-spin"></div>
                  <span className="text-secondary text-xs">Descargando capas cartográficas Leaflet...</span>
                </div>
              )}
            </div>
          </div>

          {/* Interactive Elevation profile */}
          {elevChart && (
            <div className="gpx-elevation-profile-card glass-card p-3 text-left">
              <h5 className="altimetry-title flex-center gap-2 mb-3 text-xs font-bold text-primary">
                <TrendingUp size={15} /> Perfil de Altimetría e Interactividad de Ritmo
              </h5>

              <div className="elevation-svg-wrapper relative">
                <svg 
                  viewBox={`0 0 ${elevChart.width} 100`} 
                  className="w-full elevation-svg cursor-crosshair"
                  onMouseMove={handleSvgMouseMove}
                  onMouseLeave={handleSvgMouseLeave}
                  style={{ overflow: 'visible' }}
                >
                  <defs>
                    <linearGradient id="eleFillGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.3" />
                      <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0" />
                    </linearGradient>
                  </defs>

                  {/* Horizontal background grid guides */}
                  <line x1="0" y1="0" x2={elevChart.width} y2="0" stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" />
                  <line x1="0" y1="40" x2={elevChart.width} y2="40" stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" />
                  <line x1="0" y1="80" x2={elevChart.width} y2="80" stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" />

                  {/* Gradient Area filled path */}
                  <path d={elevChart.areaPath} fill="url(#eleFillGrad)" />

                  {/* Main bold glowing line path */}
                  <path 
                    d={elevChart.linePath} 
                    fill="none" 
                    stroke="var(--color-primary)" 
                    strokeWidth="2" 
                    filter="drop-shadow(0 0 3px rgba(139,92,246,0.3))"
                  />

                  {/* Live Vertical Interactive Hover Cursor Guide */}
                  {hoveredPointIdx !== null && elevChart.coords[hoveredPointIdx] && (
                    <>
                      <line 
                        x1={elevChart.coords[hoveredPointIdx].x} 
                        y1="0" 
                        x2={elevChart.coords[hoveredPointIdx].x} 
                        y2="80" 
                        stroke="#06b6d4" 
                        strokeWidth="1" 
                        strokeDasharray="2,2" 
                      />
                      <circle 
                        cx={elevChart.coords[hoveredPointIdx].x} 
                        cy={elevChart.coords[hoveredPointIdx].y} 
                        r="4" 
                        fill="#06b6d4" 
                        stroke="white" 
                        strokeWidth="1.5" 
                      />
                    </>
                  )}
                </svg>

                {/* Live Tooltip Overlay during Hover */}
                {hoveredPointIdx !== null && points[hoveredPointIdx] && (
                  <div 
                    className="gpx-tooltip-hover glass-card absolute"
                    style={{
                      left: `${Math.min(80, Math.max(1, (hoveredPointIdx / points.length) * 100))}%`,
                      top: '-32px',
                      transform: 'translateX(-50%)',
                      padding: '0.35rem 0.6rem',
                      borderRadius: '8px',
                      fontSize: '0.65rem',
                      whiteSpace: 'nowrap',
                      display: 'flex',
                      gap: '0.5rem',
                      background: 'rgba(9, 10, 15, 0.95)',
                      border: '1px solid rgba(6, 182, 212, 0.5)',
                      boxShadow: '0 0 10px rgba(6, 182, 212, 0.2)',
                      pointerEvents: 'none',
                      zIndex: 10
                    }}
                  >
                    <span>🎯 Altitud: <strong>{points[hoveredPointIdx].ele?.toFixed(0)}m</strong></span>
                    <span>📈 Distancia: <strong>{points[hoveredPointIdx].distance?.toFixed(2)}km</strong></span>
                    {points[hoveredPointIdx].pace > 0 && (
                      <span>⚡ Ritmo: <strong>{formatPaceMMSS(points[hoveredPointIdx].pace)}/km</strong></span>
                    )}
                    {points[hoveredPointIdx].hr > 0 && (
                      <span className="flex items-center gap-0.5" style={{ color: '#f87171' }}>❤️ <strong>{points[hoveredPointIdx].hr} ppm</strong></span>
                    )}
                  </div>
                )}
              </div>

              {/* Altitudes stats footer */}
              <div className="flex justify-between items-center mt-3 pt-2 text-3xs text-secondary border-t border-dashed border-white/5">
                <span>Distancia: <strong>0.0 km</strong></span>
                <span>Mín: <strong>{elevChart.minEle?.toFixed(0)} m</strong></span>
                <span className="text-primary-glow font-bold">Máx: {elevChart.maxEle?.toFixed(0)} m</span>
                <span>Distancia Total: <strong>{elevChart.totalD?.toFixed(2)} km</strong></span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Styled element injections to prevent separate styles file cluttering */}
      <style>{`
        .gpx-drop-zone {
          border: 2px dashed rgba(139, 92, 246, 0.35);
          background: rgba(139, 92, 246, 0.01);
          padding: 2.2rem 1.5rem;
          border-radius: 16px;
          transition: all var(--transition-fast);
        }

        .gpx-drop-zone:hover, .gpx-drop-zone.drag-active {
          border-color: var(--color-primary);
          background: rgba(139, 92, 246, 0.04);
          box-shadow: 0 0 15px rgba(139, 92, 246, 0.1);
        }

        .gpx-upload-icon {
          stroke-width: 1.5px;
        }

        .gps-custom-pin {
          display: flex;
          align-items: center;
          justify-content: center;
          background: transparent !important;
          border: none !important;
        }

        .pin-core {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          border: 1.5px solid white;
        }

        .legend-item {
          display: inline-flex;
          align-items: center;
          gap: 0.25rem;
          margin-left: 0.5rem;
        }

        .legend-color {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          display: inline-block;
        }

        .elevation-svg {
          width: 100%;
          height: 85px;
          display: block;
        }

        .map-spinner {
          width: 24px;
          height: 24px;
          border: 2.5px solid rgba(255, 255, 255, 0.1);
          border-top-color: var(--color-primary);
          border-radius: 50%;
        }

        /* Fix Leaflet attribution positioning in dark maps */
        .leaflet-container .leaflet-control-attribution {
          background: rgba(0, 0, 0, 0.6) !important;
          color: rgba(255, 255, 255, 0.4) !important;
          font-size: 0.6rem !important;
          backdrop-filter: blur(4px);
          border-top-left-radius: 6px;
          border: 1px solid rgba(255, 255, 255, 0.05);
        }

        .leaflet-container .leaflet-control-attribution a {
          color: var(--color-primary) !important;
        }

        .leaflet-bar {
          border: 1px solid var(--border-light) !important;
          box-shadow: 0 4px 15px rgba(0,0,0,0.4) !important;
          border-radius: 8px !important;
          overflow: hidden;
        }

        .leaflet-bar a {
          background-color: rgba(18, 19, 26, 0.85) !important;
          color: var(--text-primary) !important;
          border-bottom: 1px solid var(--border-light) !important;
          backdrop-filter: blur(8px);
        }

        .leaflet-bar a:hover {
          background-color: var(--color-primary) !important;
          color: white !important;
        }
      `}</style>
    </div>
  );
}
