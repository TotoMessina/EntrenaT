/**
 * GPX Telemetry Compressor & Decompressor (V1)
 *
 * Utiliza codificación Polyline de Google (VLQ Base32) para pares lat/lon
 * y codificación delta en Base32 VLQ para elevaciones y marcas de tiempo.
 *
 * Reduce el tamaño de los datos GPX en un ~95%, previniendo fallos por límite
 * de almacenamiento en localStorage y optimizando el ancho de banda con Supabase.
 */

// 1. CODIFICADORES BÁSICOS VLQ BASE32 (Estilo Polyline)
function encodeNumber(num) {
  let s = num < 0 ? ~(num << 1) : num << 1;
  let chars = '';
  while (s >= 0x20) {
    chars += String.fromCharCode(((s & 0x1f) | 0x20) + 63);
    s >>= 5;
  }
  chars += String.fromCharCode(s + 63);
  return chars;
}

function decodeNumber(str, indexRef) {
  let result = 0;
  let shift = 0;
  let b;
  do {
    if (indexRef.idx >= str.length) {
      throw new Error('Fin inesperado de cadena al decodificar número.');
    }
    b = str.charCodeAt(indexRef.idx++) - 63;
    result |= (b & 0x1f) << shift;
    shift += 5;
  } while (b >= 0x20);
  const num = (result & 1) ? ~(result >> 1) : (result >> 1);
  return num;
}

// 2. CODIFICADORES DE COMPONENTES DE RUTA
function encodePolyline(points) {
  let chars = '';
  let prevLat = 0;
  let prevLon = 0;
  for (let i = 0; i < points.length; i++) {
    const lat = Math.round(points[i][0] * 1e5);
    const lon = Math.round(points[i][1] * 1e5);
    const dLat = lat - prevLat;
    const dLon = lon - prevLon;
    chars += encodeNumber(dLat);
    chars += encodeNumber(dLon);
    prevLat = lat;
    prevLon = lon;
  }
  return chars;
}

function decodePolyline(str) {
  const points = [];
  const indexRef = { idx: 0 };
  let lat = 0;
  let lon = 0;
  while (indexRef.idx < str.length) {
    const dLat = decodeNumber(str, indexRef);
    const dLon = decodeNumber(str, indexRef);
    lat += dLat;
    lon += dLon;
    points.push([lat / 1e5, lon / 1e5]);
  }
  return points;
}

function encodeElevations(elevations) {
  let chars = '';
  let prevEle = 0;
  for (let i = 0; i < elevations.length; i++) {
    const ele = Math.round((elevations[i] || 0) * 10);
    const dEle = ele - prevEle;
    chars += encodeNumber(dEle);
    prevEle = ele;
  }
  return chars;
}

function decodeElevations(str, count) {
  const elevations = [];
  const indexRef = { idx: 0 };
  let ele = 0;
  for (let i = 0; i < count; i++) {
    if (indexRef.idx >= str.length) {
      elevations.push(ele / 10);
      continue;
    }
    const dEle = decodeNumber(str, indexRef);
    ele += dEle;
    elevations.push(ele / 10);
  }
  return elevations;
}

function encodeTimes(times) {
  if (times.length === 0) return { startTime: null, timesStr: '' };
  
  const startTime = times[0];
  let chars = '';
  let prevTimeMs = new Date(startTime).getTime();
  
  for (let i = 1; i < times.length; i++) {
    if (!times[i]) {
      chars += encodeNumber(0);
      continue;
    }
    const currTimeMs = new Date(times[i]).getTime();
    const dSecs = Math.round((currTimeMs - prevTimeMs) / 1000);
    chars += encodeNumber(dSecs);
    prevTimeMs = currTimeMs;
  }
  
  return {
    startTime,
    timesStr: chars
  };
}

function decodeTimes(startTime, timesStr, count) {
  if (!startTime) return Array(count).fill(null);
  
  const times = [startTime];
  let prevTimeMs = new Date(startTime).getTime();
  const indexRef = { idx: 0 };
  
  for (let i = 1; i < count; i++) {
    if (indexRef.idx >= timesStr.length) {
      prevTimeMs += 5000; // Incremento genérico
      times.push(new Date(prevTimeMs).toISOString());
      continue;
    }
    const dSecs = decodeNumber(timesStr, indexRef);
    prevTimeMs += dSecs * 1000;
    times.push(new Date(prevTimeMs).toISOString());
  }
  
  return times;
}

function encodeHeartRates(hrs) {
  let chars = '';
  let prevHr = 0;
  let hasHr = false;
  for (let i = 0; i < hrs.length; i++) {
    const hr = hrs[i] ? Math.round(hrs[i]) : 0;
    if (hr > 0) hasHr = true;
    const dHr = hr - prevHr;
    chars += encodeNumber(dHr);
    prevHr = hr;
  }
  return hasHr ? chars : '';
}

function decodeHeartRates(str, count) {
  if (!str) return Array(count).fill(null);
  const hrs = [];
  const indexRef = { idx: 0 };
  let hr = 0;
  for (let i = 0; i < count; i++) {
    if (indexRef.idx >= str.length) {
      hrs.push(null);
      continue;
    }
    const dHr = decodeNumber(str, indexRef);
    hr += dHr;
    hrs.push(hr > 0 ? hr : null);
  }
  return hrs;
}

// Helper para calcular la duración acumulada total en formato HH:MM:SS
function getDurationString(times) {
  if (times.length < 2 || !times[0] || !times[times.length - 1]) return '00:00:00';
  const start = new Date(times[0]);
  const end = new Date(times[times.length - 1]);
  const durationSecs = Math.max(0, Math.round((end - start) / 1000));
  const hours = Math.floor(durationSecs / 3600);
  const mins = Math.floor((durationSecs % 3600) / 60);
  const secs = durationSecs % 60;
  return [
    hours.toString().padStart(2, '0'),
    mins.toString().padStart(2, '0'),
    secs.toString().padStart(2, '0')
  ].join(':');
}

// 3. RE-CALCULADOR DE MÉTRICAS DERIVADAS (Idéntico a GpxVisualizer.jsx)
export function recalculateGpxMetrics(points) {
  if (points.length === 0) return [];
  
  const haversineDist = (pt1, pt2) => {
    const R = 6371; // Radio terrestre en km
    const dLat = (pt2.lat - pt1.lat) * Math.PI / 180;
    const dLon = (pt2.lon - pt1.lon) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(pt1.lat * Math.PI / 180) * Math.cos(pt2.lat * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  let accumDist = 0;
  const computedPoints = [];

  for (let i = 0; i < points.length; i++) {
    const curr = points[i];
    
    if (i === 0) {
      computedPoints.push({
        ...curr,
        distance: 0,
        pace: 0,
        speed: 0
      });
      continue;
    }

    const prev = points[i - 1];
    const stepDist = haversineDist(prev, curr);
    accumDist += stepDist;

    let paceInSeconds = 300; // Por defecto 5:00/km
    let speed = 12; // Por defecto 12 km/h

    if (curr.time && prev.time) {
      const timeDiffSecs = (new Date(curr.time) - new Date(prev.time)) / 1000;
      if (timeDiffSecs > 0 && stepDist > 0) {
        speed = (stepDist / (timeDiffSecs / 3600)); // km/h
        paceInSeconds = timeDiffSecs / stepDist; // segs/km
        
        // Acotar ritmo para evitar picos infinitos por detención
        if (paceInSeconds > 900) paceInSeconds = 900; // Máximo 15:00/km
        if (paceInSeconds < 120) paceInSeconds = 120; // Mínimo 2:00/km
      }
    }

    computedPoints.push({
      ...curr,
      distance: accumDist,
      pace: paceInSeconds,
      speed: speed
    });
  }

  // Aplicar suavizado de ventana móvil (Moving Average) al ritmo para filtrar ruido GPS
  const smoothWindow = 3;
  for (let i = 0; i < computedPoints.length; i++) {
    if (i < smoothWindow || i >= computedPoints.length - smoothWindow) continue;
    
    let sum = 0;
    for (let w = -smoothWindow; w <= smoothWindow; w++) {
      sum += computedPoints[i + w].pace;
    }
    computedPoints[i].pace = Math.round(sum / (smoothWindow * 2 + 1));
  }

  return computedPoints;
}

// 4. API PÚBLICA DE COMPRESIÓN / DESCOMPRESIÓN
export function compressGpxData(gpxData) {
  if (!gpxData) return null;
  
  // Evitar re-comprimir
  if (gpxData._compressed || gpxData.coords) {
    return gpxData;
  }
  
  const points = Array.isArray(gpxData) ? gpxData : (gpxData.points || []);
  if (points.length === 0) return null;
  
  const coords = points.map(p => [p.lat, p.lon]);
  const elevations = points.map(p => p.ele || 0);
  const times = points.map(p => p.time);
  const hrs = points.map(p => p.hr || null);
  
  const coordsStr = encodePolyline(coords);
  const elevationsStr = encodeElevations(elevations);
  const { startTime, timesStr } = encodeTimes(times);
  const hrsStr = encodeHeartRates(hrs);
  
  const summary = gpxData.summary || {
    distance: points[points.length - 1]?.distance || 0,
    duration: getDurationString(times),
    date: times[0] ? new Date(times[0]).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    maxElevation: Math.max(...elevations),
    minElevation: Math.min(...elevations)
  };
  
  return {
    _compressed: true,
    startTime,
    coords: coordsStr,
    elevations: elevationsStr,
    times: timesStr,
    hrs: hrsStr || undefined,
    summary
  };
}

export function decompressGpxData(compressedStruct) {
  if (!compressedStruct) return null;
  
  // Si ya es un array o contiene array de puntos sin comprimir, lo devuelve intacto
  if (Array.isArray(compressedStruct)) {
    return { points: compressedStruct, summary: null };
  }
  if (compressedStruct.points && Array.isArray(compressedStruct.points)) {
    return compressedStruct;
  }
  
  const { startTime, coords, elevations, times, hrs, summary } = compressedStruct;
  if (!coords) return null;
  
  const decodedCoords = decodePolyline(coords);
  const count = decodedCoords.length;
  const decodedElevations = decodeElevations(elevations, count);
  const decodedTimes = decodeTimes(startTime, times, count);
  const decodedHrs = decodeHeartRates(hrs, count);
  
  const points = [];
  for (let i = 0; i < count; i++) {
    points.push({
      lat: decodedCoords[i][0],
      lon: decodedCoords[i][1],
      ele: decodedElevations[i],
      time: decodedTimes[i],
      hr: decodedHrs[i]
    });
  }
  
  const computedPoints = recalculateGpxMetrics(points);
  
  return {
    points: computedPoints,
    summary: summary || {
      distance: computedPoints[computedPoints.length - 1]?.distance || 0,
      duration: getDurationString(decodedTimes),
      date: decodedTimes[0] ? new Date(decodedTimes[0]).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      maxElevation: Math.max(...decodedElevations),
      minElevation: Math.min(...decodedElevations)
    }
  };
}
