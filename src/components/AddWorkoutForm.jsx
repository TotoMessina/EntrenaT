import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, 
  Trash2, 
  Dumbbell, 
  TrendingUp, 
  X, 
  Save,
  Timer,
  Play,
  Square,
  RotateCcw,
  Volume2,
  VolumeX,
  ChevronDown,
  ChevronUp,
  Clock,
  Sparkles
} from 'lucide-react';
import GpxVisualizer from './GpxVisualizer';
import { compressGpxData, decompressGpxData } from '../utils/gpxCompressor';
import { timeStringToSeconds, secondsToTimeString } from '../utils/calculators';


const EXERCISE_DATABASE = [
  // Pectoral
  { name: 'Press de Banca', primary: 'Pectoral', secondary: ['Tríceps', 'Hombros'] },
  { name: 'Press Inclinado con Mancuernas', primary: 'Pectoral', secondary: ['Tríceps', 'Hombros'] },
  { name: 'Aperturas en Polea', primary: 'Pectoral', secondary: [] },
  { name: 'Fondos en Paralelas', primary: 'Pectoral', secondary: ['Tríceps', 'Hombros'] },
  { name: 'Lagartijas (Push-ups)', primary: 'Pectoral', secondary: ['Tríceps', 'Core'] },
  { name: 'Press de Banca con Mancuernas', primary: 'Pectoral', secondary: ['Tríceps', 'Hombros'] },
  { name: 'Cruce de Poleas Altas', primary: 'Pectoral', secondary: [] },
  { name: 'Aperturas Inclinadas con Mancuerna', primary: 'Pectoral', secondary: [] },
  { name: 'Press de Pecho en Máquina Hammer', primary: 'Pectoral', secondary: ['Tríceps'] },
  { name: 'Press Declinado con Barra', primary: 'Pectoral', secondary: ['Tríceps', 'Hombros'] },
  { name: 'Flexiones con Manos Juntas (Diamond Push-ups)', primary: 'Pectoral', secondary: ['Tríceps', 'Core'] },
  { name: 'Pull-over con Mancuerna', primary: 'Pectoral', secondary: ['Espalda', 'Tríceps'] },

  // Espalda
  { name: 'Dominadas', primary: 'Espalda', secondary: ['Bíceps', 'Antebrazo', 'Core'] },
  { name: 'Remo con Barra', primary: 'Espalda', secondary: ['Bíceps', 'Core'] },
  { name: 'Jalón al Pecho', primary: 'Espalda', secondary: ['Bíceps'] },
  { name: 'Remo en Polea Baja', primary: 'Espalda', secondary: ['Bíceps'] },
  { name: 'Hiperextensiones', primary: 'Espalda', secondary: ['Glúteos', 'Isquiotibiales'] },
  { name: 'Pull-ups Lastradas', primary: 'Espalda', secondary: ['Bíceps', 'Antebrazo', 'Core'] },
  { name: 'Remo Gironda', primary: 'Espalda', secondary: ['Bíceps'] },
  { name: 'Remo con Soporte en Pecho', primary: 'Espalda', secondary: ['Bíceps'] },
  { name: 'Remo Unilateral con Mancuerna', primary: 'Espalda', secondary: ['Bíceps', 'Core'] },
  { name: 'Pull-over con Polea Alta', primary: 'Espalda', secondary: ['Tríceps'] },
  { name: 'Remo Pendlay', primary: 'Espalda', secondary: ['Core', 'Isquiotibiales'] },
  { name: 'Jalón al Pecho con Agarre Neutro (V-Bar)', primary: 'Espalda', secondary: ['Bíceps'] },
  { name: 'Remo con Barra T', primary: 'Espalda', secondary: ['Bíceps', 'Core'] },

  // Hombros
  { name: 'Press Militar con Barra', primary: 'Hombros', secondary: ['Tríceps', 'Core'] },
  { name: 'Elevaciones Laterales', primary: 'Hombros', secondary: [] },
  { name: 'Press Arnold', primary: 'Hombros', secondary: ['Tríceps'] },
  { name: 'Pájaros (Vuelos Posteriores)', primary: 'Hombros', secondary: ['Espalda'] },
  { name: 'Elevaciones Laterales en Polea', primary: 'Hombros', secondary: [] },
  { name: 'Y-Raises (Elevaciones en Y)', primary: 'Hombros', secondary: ['Espalda'] },
  { name: 'Face Pulls', primary: 'Hombros', secondary: ['Espalda'] },
  { name: 'Press Frontal con Mancuernas', primary: 'Hombros', secondary: ['Tríceps'] },
  { name: 'Elevaciones Posteriores en Máquina (Pec Deck Invertido)', primary: 'Hombros', secondary: ['Espalda'] },
  { name: 'Elevaciones Frontales con Disco', primary: 'Hombros', secondary: [] },
  { name: 'Paseo de Hombros (Carrying)', primary: 'Hombros', secondary: ['Antebrazo', 'Core'] },

  // Bíceps
  { name: 'Curl de Bíceps con Barra', primary: 'Bíceps', secondary: ['Antebrazo'] },
  { name: 'Curl de Bíceps Martillo', primary: 'Bíceps', secondary: ['Antebrazo'] },
  { name: 'Curl Concentrado', primary: 'Bíceps', secondary: [] },
  { name: 'Curl en Banco Scott', primary: 'Bíceps', secondary: [] },
  { name: 'Curl de Bíceps Inclinado con Mancuernas', primary: 'Bíceps', secondary: [] },
  { name: 'Curl de Bíceps en Polea', primary: 'Bíceps', secondary: [] },
  { name: 'Curl de Bíceps de Pie con Mancuernas', primary: 'Bíceps', secondary: ['Antebrazo'] },
  { name: 'Curl Araña (Spider Curl)', primary: 'Bíceps', secondary: [] },
  { name: 'Curl de Bíceps Zottman', primary: 'Bíceps', secondary: ['Antebrazo'] },
  { name: 'Curl de Bíceps 21s', primary: 'Bíceps', secondary: ['Antebrazo'] },

  // Tríceps
  { name: 'Fondos de Tríceps', primary: 'Tríceps', secondary: ['Pectoral', 'Hombros'] },
  { name: 'Extensiones en Polea Alta', primary: 'Tríceps', secondary: [] },
  { name: 'Press Francés', primary: 'Tríceps', secondary: [] },
  { name: 'Copa de Tríceps', primary: 'Tríceps', secondary: [] },
  { name: 'Patada de Tríceps en Polea', primary: 'Tríceps', secondary: [] },
  { name: 'Extensiones Tras la Cabeza con Polea', primary: 'Tríceps', secondary: [] },
  { name: 'Fondos de Tríceps/Pecho Lastrados', primary: 'Tríceps', secondary: ['Pectoral', 'Hombros'] },
  { name: 'Press de Banca con Agarre Cerrado', primary: 'Tríceps', secondary: ['Pectoral'] },
  { name: 'Rompecráneos con Mancuernas', primary: 'Tríceps', secondary: [] },
  { name: 'Flexiones de Tríceps (Diamond Push-ups)', primary: 'Tríceps', secondary: ['Pectoral', 'Core'] },

  // Antebrazo
  { name: 'Curl de Muñeca Pronado', primary: 'Antebrazo', secondary: [] },
  { name: 'Curl de Muñeca Supinado', primary: 'Antebrazo', secondary: [] },
  { name: 'Paseo del Granjero', primary: 'Antebrazo', secondary: ['Core', 'Espalda', 'Hombros'] },
  { name: 'Cuelgue Pasivo', primary: 'Antebrazo', secondary: ['Hombros'] },
  { name: 'Curl de Antebrazo Inverso con Barra', primary: 'Antebrazo', secondary: ['Bíceps'] },
  { name: 'Rodillo de Muñeca (Wrist Roller)', primary: 'Antebrazo', secondary: [] },
  { name: 'Flexores de Dedos con Mancuerna', primary: 'Antebrazo', secondary: [] },
  { name: 'Pinch Grip (Agarre de Placa)', primary: 'Antebrazo', secondary: [] },

  // Core
  { name: 'Plancha Abdominal (Plank)', primary: 'Core', secondary: ['Hombros', 'Glúteos'] },
  { name: 'Crunch en Polea', primary: 'Core', secondary: [] },
  { name: 'Elevación de Piernas Colgado', primary: 'Core', secondary: ['Glúteos'] },
  { name: 'Giros Rusos (Russian Twists)', primary: 'Core', secondary: [] },
  { name: 'Ab Wheel Rollouts (Rueda Abdominal)', primary: 'Core', secondary: ['Hombros', 'Tríceps'] },
  { name: 'Plancha Lateral con Rotación', primary: 'Core', secondary: ['Hombros'] },
  { name: 'Elevación de Piernas Inclinado', primary: 'Core', secondary: [] },
  { name: 'Bicho Muerto (Dead Bug)', primary: 'Core', secondary: [] },
  { name: 'Crunch de Abdomen en Suelo', primary: 'Core', secondary: [] },
  { name: 'Leñador en Polea (Cable Woodchoppers)', primary: 'Core', secondary: ['Hombros'] },
  { name: 'Toes to Bar (Pies a la Barra)', primary: 'Core', secondary: ['Antebrazo', 'Espalda'] },

  // Cuádriceps
  { name: 'Sentadilla Trasera con Barra', primary: 'Cuádriceps', secondary: ['Glúteos', 'Isquiotibiales', 'Core'] },
  { name: 'Prensa de Piernas', primary: 'Cuádriceps', secondary: ['Glúteos', 'Isquiotibiales'] },
  { name: 'Desplantes (Lunges)', primary: 'Cuádriceps', secondary: ['Glúteos', 'Isquiotibiales'] },
  { name: 'Extensión de Cuádriceps', primary: 'Cuádriceps', secondary: [] },
  { name: 'Sentadilla Hack', primary: 'Cuádriceps', secondary: ['Glúteos', 'Isquiotibiales'] },
  { name: 'Sentadilla Búlgara con Mancuernas', primary: 'Cuádriceps', secondary: ['Glúteos', 'Isquiotibiales', 'Core'] },
  { name: 'Goblet Squat (Sentadilla Goblet)', primary: 'Cuádriceps', secondary: ['Glúteos', 'Core'] },
  { name: 'Leg Extension en Máquina', primary: 'Cuádriceps', secondary: [] },
  { name: 'Sentadilla Frontal con Barra', primary: 'Cuádriceps', secondary: ['Glúteos', 'Core'] },
  { name: 'Zancadas Caminando con Mancuernas', primary: 'Cuádriceps', secondary: ['Glúteos', 'Isquiotibiales'] },

  // Isquiotibiales
  { name: 'Peso Muerto Rumano', primary: 'Isquiotibiales', secondary: ['Glúteos', 'Espalda', 'Core'] },
  { name: 'Curl de Pierna Sentado', primary: 'Isquiotibiales', secondary: [] },
  { name: 'Curl de Pierna Acostado', primary: 'Isquiotibiales', secondary: [] },
  { name: 'Peso Muerto', primary: 'Isquiotibiales', secondary: ['Glúteos', 'Espalda', 'Core', 'Cuádriceps', 'Antebrazo'] },
  { name: 'Peso Muerto Piernas Rígidas', primary: 'Isquiotibiales', secondary: ['Glúteos', 'Espalda'] },
  { name: 'Curl de Pierna de Pie', primary: 'Isquiotibiales', secondary: [] },
  { name: 'Buenos Días con Barra', primary: 'Isquiotibiales', secondary: ['Glúteos', 'Espalda'] },
  { name: 'Glute-Ham Raise (GHR)', primary: 'Isquiotibiales', secondary: ['Glúteos', 'Gemelos'] },
  { name: 'Peso Muerto Sumo', primary: 'Isquiotibiales', secondary: ['Glúteos', 'Cuádriceps', 'Espalda', 'Antebrazo'] },

  // Gemelos
  { name: 'Elevación de Talones de Pie', primary: 'Gemelos', secondary: [] },
  { name: 'Elevación de Talones Sentado', primary: 'Gemelos', secondary: [] },
  { name: 'Prensa de Gemelos (Calf Press in Leg Press)', primary: 'Gemelos', secondary: [] },
  { name: 'Elevación de Talones a una sola pierna', primary: 'Gemelos', secondary: [] },
  { name: 'Elevación de Talones en Máquina Smith', primary: 'Gemelos', secondary: [] },

  // Glúteos
  { name: 'Hip Thrust', primary: 'Glúteos', secondary: ['Isquiotibiales', 'Cuádriceps'] },
  { name: 'Puente de Glúteos', primary: 'Glúteos', secondary: ['Isquiotibiales'] },
  { name: 'Patada de Glúteo', primary: 'Glúteos', secondary: ['Isquiotibiales'] },
  { name: 'Patada de Glúteo en Polea', primary: 'Glúteos', secondary: [] },
  { name: 'Abducción de Cadera en Máquina', primary: 'Glúteos', secondary: [] },
  { name: 'Zancadas Deficitarias (Deficit Lunges)', primary: 'Glúteos', secondary: ['Cuádriceps', 'Isquiotibiales'] },
  { name: 'Sentadilla Búlgara con Enfoque en Glúteo', primary: 'Glúteos', secondary: ['Cuádriceps', 'Isquiotibiales'] },
  { name: 'Paseo del Monstruo con Banda (Monster Walk)', primary: 'Glúteos', secondary: [] },

  // Cuello
  { name: 'Encogimientos de Hombros', primary: 'Cuello', secondary: ['Hombros', 'Espalda'] },
  { name: 'Cuello con Arnés', primary: 'Cuello', secondary: [] },
  { name: 'Puente de Cuello', primary: 'Cuello', secondary: [] },
  { name: 'Encogimientos de Hombros con Mancuernas', primary: 'Cuello', secondary: ['Hombros', 'Espalda'] },
  { name: 'Encogimientos con Barra por Detrás', primary: 'Cuello', secondary: ['Hombros', 'Espalda'] },
  { name: 'Plancha de Cuello Isométrica', primary: 'Cuello', secondary: [] }
];

// Rebuild EXERCISE_SUGGESTIONS dynamically to keep compatibility with any legacy code
const EXERCISE_SUGGESTIONS = {};
EXERCISE_DATABASE.forEach(item => {
  if (!EXERCISE_SUGGESTIONS[item.primary]) {
    EXERCISE_SUGGESTIONS[item.primary] = [];
  }
  if (!EXERCISE_SUGGESTIONS[item.primary].includes(item.name)) {
    EXERCISE_SUGGESTIONS[item.primary].push(item.name);
  }
});

const getRpeDescription = (rpe) => {
  const num = Number(rpe) || 8;
  if (num === 10) return 'RIR 0 (Fallo absoluto)';
  if (num === 9) return 'RIR 1 (1 repe en recámara)';
  if (num === 8) return 'RIR 2 (2 repes en recámara)';
  if (num === 7) return 'RIR 3 (3 repes en recámara)';
  if (num === 6) return 'RIR 4 (Esfuerzo moderado)';
  return '';
};

export default function AddWorkoutForm({ onSaveWorkout, onUpdateWorkout, onClose, preset, workouts, shoes = [], showAlert, showConfirm }) {
  const isEditMode = !!(preset && preset.id);

  const triggerAlert = async (title, message) => {
    if (showAlert) {
      await showAlert(title, message);
    } else {
      alert(`${title ? title + ': ' : ''}${message}`);
    }
  };

  const [workoutType, setWorkoutType] = useState('running'); // running, gym
  
  // Common states
  // Localized date helper to prevent timezone shifts
  const getLocalDateString = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  const [date, setDate] = useState(getLocalDateString());
  const [notes, setNotes] = useState('');

  // Running-specific states
  const [gpxData, setGpxData] = useState(null);
  const [distance, setDistance] = useState('');
  const [durationHH, setDurationHH] = useState('00');
  const [durationMM, setDurationMM] = useState('30');
  const [durationSS, setDurationSS] = useState('00');
  const [heartRate, setHeartRate] = useState('');
  const [rpeRunning, setRpeRunning] = useState('7');
  const [terrain, setTerrain] = useState('Asfalto');

  // Advanced Running Metrics states
  const [maxSpeed, setMaxSpeed] = useState('');
  const [avgCadence, setAvgCadence] = useState('');
  const [maxCadence, setMaxCadence] = useState('');
  const [strideLength, setStrideLength] = useState('');
  const [elevationGain, setElevationGain] = useState('');
  const [elevationLoss, setElevationLoss] = useState('');
  const [splits, setSplits] = useState([]); // [{ km: 1, time: '05:30' }]
  const [showAdvancedMetrics, setShowAdvancedMetrics] = useState(false);

  // New Running and Splits states
  const [shoeId, setShoeId] = useState('');
  const [splitsType, setSplitsType] = useState('auto'); // 'auto' (Km-by-Km continuous) vs 'manual' (repetitions/intervals) vs 'structured'
  const [numSeries, setNumSeries] = useState(5);
  const [distanceSeries, setDistanceSeries] = useState('400');
  const [customDistanceSeries, setCustomDistanceSeries] = useState('600');

  // Structured Workout States
  const [hasWarmup, setHasWarmup] = useState(true);
  const [warmupType, setWarmupType] = useState('distance'); // 'distance', 'duration'
  const [warmupValue, setWarmupValue] = useState('2.0');
  const [intervalType, setIntervalType] = useState('distance'); // 'distance', 'duration'
  const [intervalValue, setIntervalValue] = useState('400');
  const [hasRest, setHasRest] = useState(true);
  const [restType, setRestType] = useState('duration'); // 'duration', 'distance'
  const [restValue, setRestValue] = useState('90');
  const [hasCooldown, setHasCooldown] = useState(true);
  const [cooldownType, setCooldownType] = useState('distance'); // 'distance', 'duration'
  const [cooldownValue, setCooldownValue] = useState('1.5');

  // Auto-initialize shoeId using the active shoe
  useEffect(() => {
    if (preset && preset.id && preset.shoeId) {
      setShoeId(preset.shoeId);
      return;
    }
    if (shoes && shoes.length > 0) {
      const activeShoe = shoes.find(s => s.isActive);
      if (activeShoe) {
        setShoeId(activeShoe.id);
      } else {
        setShoeId(shoes[0].id);
      }
    }
  }, [shoes, preset]);

  // Auto-calculated pace/speed for UI
  const [calculatedPace, setCalculatedPace] = useState('--:--');
  const [calculatedSpeed, setCalculatedSpeed] = useState('--');

  useEffect(() => {
    const dist = parseFloat(distance);
    const hrs = parseInt(durationHH) || 0;
    const mins = parseInt(durationMM) || 0;
    const secs = parseInt(durationSS) || 0;
    const totalSecs = (hrs * 3600) + (mins * 60) + secs;

    if (dist > 0 && totalSecs > 0) {
      // Speed in km/h
      const speedKmh = (dist / (totalSecs / 3600)).toFixed(2);
      setCalculatedSpeed(speedKmh);
      
      // Pace in min/km
      const paceSecs = Math.round(totalSecs / dist);
      const pMins = Math.floor(paceSecs / 60);
      const pSecs = paceSecs % 60;
      setCalculatedPace(`${String(pMins).padStart(2, '0')}:${String(pSecs).padStart(2, '0')}`);
    } else {
      setCalculatedPace('--:--');
      setCalculatedSpeed('--');
    }
  }, [distance, durationHH, durationMM, durationSS]);

  const handleAddSplit = () => {
    const newSplit = { splitNumber: splits.length + 1, distance: 1000, time: '00:05:00' };
    const nextSplits = [...splits, newSplit];
    setSplits(nextSplits);

    // Update total distance
    const totalDistM = nextSplits.reduce((sum, s) => sum + s.distance, 0);
    setDistance((Math.round((totalDistM / 1000) * 100) / 100).toString());

    // Update total duration
    let totalSeconds = 0;
    nextSplits.forEach((s) => {
      const secs = timeStringToSeconds(s.time);
      totalSeconds += secs;
    });
    const hh = Math.floor(totalSeconds / 3600);
    const mm = Math.floor((totalSeconds % 3600) / 60);
    const ss = totalSeconds % 60;
    setDurationHH(String(hh).padStart(2, '0'));
    setDurationMM(String(mm).padStart(2, '0'));
    setDurationSS(String(ss).padStart(2, '0'));
  };
  
  const handleRemoveSplit = (index) => {
    const newSplits = [...splits];
    newSplits.splice(index, 1);
    const mappedSplits = newSplits.map((s, i) => ({ ...s, splitNumber: i + 1 }));
    setSplits(mappedSplits);

    // Update total distance
    const totalDistM = mappedSplits.reduce((sum, s) => sum + s.distance, 0);
    setDistance((Math.round((totalDistM / 1000) * 100) / 100).toString());

    // Update total duration
    let totalSeconds = 0;
    mappedSplits.forEach((s) => {
      const secs = timeStringToSeconds(s.time);
      totalSeconds += secs;
    });
    const hh = Math.floor(totalSeconds / 3600);
    const mm = Math.floor((totalSeconds % 3600) / 60);
    const ss = totalSeconds % 60;
    setDurationHH(String(hh).padStart(2, '0'));
    setDurationMM(String(mm).padStart(2, '0'));
    setDurationSS(String(ss).padStart(2, '0'));
  };

  const getDisplayTime = (timeStr) => {
    if (!timeStr) return '';
    if (timeStr.startsWith('00:')) {
      return timeStr.substring(3);
    }
    return timeStr;
  };

  const handleSplitTimeChange = (index, val) => {
    const newSplits = [...splits];
    const parts = val.split(':');
    let formatted = val;
    if (parts.length === 2) {
      formatted = `00:${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`;
    } else if (parts.length === 3) {
      formatted = `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}:${parts[2].padStart(2, '0')}`;
    }
    newSplits[index].time = formatted;
    setSplits(newSplits);

    // Auto-update total duration for all split types to allow full customisation
    let totalSeconds = 0;
    newSplits.forEach((s) => {
      const secs = timeStringToSeconds(s.time);
      totalSeconds += secs;
    });
    const hh = Math.floor(totalSeconds / 3600);
    const mm = Math.floor((totalSeconds % 3600) / 60);
    const ss = totalSeconds % 60;
    setDurationHH(String(hh).padStart(2, '0'));
    setDurationMM(String(mm).padStart(2, '0'));
    setDurationSS(String(ss).padStart(2, '0'));
  };

  const getSplitPaceValue = (split) => {
    const secs = timeStringToSeconds(split.time);
    const distKm = split.distance / 1000;
    if (secs > 0 && distKm > 0) {
      const paceSecs = Math.round(secs / distKm);
      const mins = Math.floor(paceSecs / 60);
      const remainSecs = paceSecs % 60;
      return `${String(mins).padStart(2, '0')}:${String(remainSecs).padStart(2, '0')}`;
    }
    return '';
  };

  const handleSplitPaceChange = (index, paceStr) => {
    const newSplits = [...splits];
    const parts = paceStr.split(':');
    let paceSeconds = 0;
    if (parts.length === 2) {
      paceSeconds = (parseInt(parts[0]) || 0) * 60 + (parseInt(parts[1]) || 0);
    } else {
      paceSeconds = parseInt(paceStr) || 0;
    }

    if (paceSeconds > 0) {
      const distKm = newSplits[index].distance / 1000;
      const totalSecs = Math.round(paceSeconds * distKm);
      const hh = Math.floor(totalSecs / 3600);
      const mm = Math.floor((totalSecs % 3600) / 60);
      const ss = totalSecs % 60;
      newSplits[index].time = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
    } else {
      newSplits[index].time = '00:00:00';
    }

    setSplits(newSplits);

    // Auto-update total duration for all split types
    let totalSeconds = 0;
    newSplits.forEach((s) => {
      const secs = timeStringToSeconds(s.time);
      totalSeconds += secs;
    });
    const hh = Math.floor(totalSeconds / 3600);
    const mm = Math.floor((totalSeconds % 3600) / 60);
    const ss = totalSeconds % 60;
    setDurationHH(String(hh).padStart(2, '0'));
    setDurationMM(String(mm).padStart(2, '0'));
    setDurationSS(String(ss).padStart(2, '0'));
  };

  const generateAutoSplits = async () => {
    const distVal = parseFloat(distance);
    if (!distVal || distVal <= 0) {
      await triggerAlert("Falta Distancia", "Por favor ingresa primero la distancia total del entrenamiento.");
      return;
    }

    const hrs = parseInt(durationHH) || 0;
    const mins = parseInt(durationMM) || 0;
    const secs = parseInt(durationSS) || 0;
    const totalSecs = (hrs * 3600) + (mins * 60) + secs;

    const avgPaceSecs = totalSecs > 0 ? totalSecs / distVal : 300;

    const newSplits = [];
    let remainingDist = distVal;
    let index = 1;

    while (remainingDist > 0) {
      const splitDist = remainingDist >= 1.0 ? 1.0 : remainingDist;
      const splitDistMeters = Math.round(splitDist * 1000);
      const splitSecs = Math.round(avgPaceSecs * splitDist);

      const splitHrs = Math.floor(splitSecs / 3600);
      const splitMins = Math.floor((splitSecs % 3600) / 60);
      const splitS = Math.round(splitSecs % 60);

      const timeStr = `${String(splitHrs).padStart(2, '0')}:${String(splitMins).padStart(2, '0')}:${String(splitS).padStart(2, '0')}`;

      newSplits.push({
        splitNumber: index,
        distance: splitDistMeters,
        time: timeStr
      });

      remainingDist -= splitDist;
      index++;
    }

    setSplits(newSplits);
  };

  const generateIntervalSplits = () => {
    const count = parseInt(numSeries) || 5;
    let distMeters = 400;
    if (distanceSeries === 'custom') {
      distMeters = parseInt(customDistanceSeries) || 400;
    } else {
      distMeters = parseInt(distanceSeries) || 400;
    }

    const distVal = parseFloat(distance);
    const hrs = parseInt(durationHH) || 0;
    const mins = parseInt(durationMM) || 0;
    const secs = parseInt(durationSS) || 0;
    const totalSecs = (hrs * 3600) + (mins * 60) + secs;

    const avgPaceSecs = totalSecs > 0 && distVal > 0 ? totalSecs / distVal : 300;
    const splitSecs = Math.round((avgPaceSecs / 1000) * distMeters);

    const newSplits = [];
    for (let i = 1; i <= count; i++) {
      const splitHrs = Math.floor(splitSecs / 3600);
      const splitMins = Math.floor((splitSecs % 3600) / 60);
      const splitS = Math.round(splitSecs % 60);

      const timeStr = `${String(splitHrs).padStart(2, '0')}:${String(splitMins).padStart(2, '0')}:${String(splitS).padStart(2, '0')}`;

      newSplits.push({
        splitNumber: i,
        distance: distMeters,
        time: timeStr
      });
    }

    setSplits(newSplits);
  };

  const generateStructuredSplits = () => {
    const newSplits = [];
    let splitIdx = 1;
    let totalSecs = 0;
    let totalDistMeters = 0;

    // 1. Warm-up
    if (hasWarmup) {
      let wuDist = 0;
      let wuSecs = 0;
      if (warmupType === 'distance') {
        const val = parseFloat(warmupValue) || 2.0;
        wuDist = val * 1000;
        wuSecs = val * 360; // 6:00 min/km
      } else {
        const val = parseFloat(warmupValue) || 10;
        wuSecs = val * 60;
        wuDist = (wuSecs / 360) * 1000;
      }
      newSplits.push({
        splitNumber: splitIdx++,
        type: 'warmup',
        distance: Math.round(wuDist),
        time: secondsToTimeString(Math.round(wuSecs))
      });
      totalSecs += wuSecs;
      totalDistMeters += wuDist;
    }

    // 2. Intervals & Rests
    const count = parseInt(numSeries) || 5;
    const intervalValNum = parseFloat(intervalValue) || 400;

    for (let i = 1; i <= count; i++) {
      // Repetition
      let repDist = 0;
      let repSecs = 0;
      if (intervalType === 'distance') {
        repDist = intervalValNum;
        repSecs = (intervalValNum / 1000) * 240; // 4:00 min/km
      } else {
        repSecs = intervalValNum * 60;
        repDist = (repSecs / 240) * 1000;
      }

      newSplits.push({
        splitNumber: splitIdx++,
        type: 'interval',
        repNumber: i,
        distance: Math.round(repDist),
        time: secondsToTimeString(Math.round(repSecs))
      });
      totalSecs += repSecs;
      totalDistMeters += repDist;

      // Rest
      if (hasRest && i < count) {
        let rDist = 0;
        let rSecs = 0;
        if (restType === 'duration') {
          let valSecs = 90;
          if (String(restValue).includes(':')) {
            const parts = String(restValue).split(':');
            valSecs = (parseInt(parts[0]) || 0) * 60 + (parseInt(parts[1]) || 0);
          } else {
            valSecs = parseInt(restValue) || 90;
          }
          rSecs = valSecs;
          rDist = 0; // standing/walking rest
        } else {
          const val = parseFloat(restValue) || 200;
          rDist = val;
          rSecs = (val / 1000) * 450; // 7:30 min/km active jog
        }

        newSplits.push({
          splitNumber: splitIdx++,
          type: 'rest',
          distance: Math.round(rDist),
          time: secondsToTimeString(Math.round(rSecs))
        });
        totalSecs += rSecs;
        totalDistMeters += rDist;
      }
    }

    // 3. Cool-down
    if (hasCooldown) {
      let cdDist = 0;
      let cdSecs = 0;
      if (cooldownType === 'distance') {
        const val = parseFloat(cooldownValue) || 1.5;
        cdDist = val * 1000;
        cdSecs = val * 390; // 6:30 min/km
      } else {
        const val = parseFloat(cooldownValue) || 8;
        cdSecs = val * 60;
        cdDist = (cdSecs / 390) * 1000;
      }
      newSplits.push({
        splitNumber: splitIdx++,
        type: 'cooldown',
        distance: Math.round(cdDist),
        time: secondsToTimeString(Math.round(cdSecs))
      });
      totalSecs += cdSecs;
      totalDistMeters += cdDist;
    }

    setSplits(newSplits);

    // Auto-update totals
    setDistance((Math.round((totalDistMeters / 1000) * 100) / 100).toString());
    const hh = Math.floor(totalSecs / 3600);
    const mm = Math.floor((totalSecs % 3600) / 60);
    const ss = Math.round(totalSecs % 60);
    setDurationHH(String(hh).padStart(2, '0'));
    setDurationMM(String(mm).padStart(2, '0'));
    setDurationSS(String(ss).padStart(2, '0'));
  };

  // Gym-specific states
  const [sessionName, setSessionName] = useState(preset?.sessionName || '');
  const [muscleGroup, setMuscleGroup] = useState(() => {
    const val = preset?.muscleGroup;
    if (val === 'Pierna') return 'Cuádriceps';
    if (val === 'Brazos') return 'Bíceps';
    return val || 'Pectoral';
  });
  const [trainedMuscles, setTrainedMuscles] = useState(() => {
    const val = preset?.muscleGroup;
    if (val === 'Pierna') return ['Cuádriceps'];
    if (val === 'Brazos') return ['Bíceps'];
    return val ? [val] : ['Pectoral'];
  });
  const [exercises, setExercises] = useState([
    { 
      name: '', 
      sets: [
        { type: 'working', weight: '50', reps: '10', rpe: '8', rest: '90', done: true },
        { type: 'working', weight: '50', reps: '10', rpe: '8', rest: '90', done: true },
        { type: 'working', weight: '50', reps: '10', rpe: '8', rest: '90', done: true },
        { type: 'working', weight: '50', reps: '10', rpe: '8', rest: '90', done: true }
      ]
    }
  ]);
  const [activeDropdownIndex, setActiveDropdownIndex] = useState(-1);

  const getFilteredExercises = (searchQuery) => {
    const query = (searchQuery || '').toLowerCase().trim();
    if (!query) {
      return EXERCISE_DATABASE.filter(ex => 
        (trainedMuscles || []).includes(ex.primary) || 
        ((!trainedMuscles || trainedMuscles.length === 0) && ex.primary === muscleGroup)
      );
    }
    return EXERCISE_DATABASE.filter(ex => 
      ex.name.toLowerCase().includes(query) ||
      ex.primary.toLowerCase().includes(query) ||
      ex.secondary.some(sec => sec.toLowerCase().includes(query))
    );
  };

  // Exercise to Muscle Map Dictionary for Smart Autodetection
  const EXERCISE_TO_MUSCLE_MAP = {
    // Pectoral (Pecho)
    'pecho': 'Pectoral',
    'banca': 'Pectoral',
    'bench': 'Pectoral',
    'aperturas': 'Pectoral',
    'pectoral': 'Pectoral',
    'fondos en paralelas': 'Pectoral',
    'push-up': 'Pectoral',
    'flexiones': 'Pectoral',
    'lagartijas': 'Pectoral',
    'inclinado': 'Pectoral',
    'declinado': 'Pectoral',
    'fly': 'Pectoral',
    'flys': 'Pectoral',
    'cruce': 'Pectoral',
    
    // Espalda
    'dominadas': 'Espalda',
    'pull-up': 'Espalda',
    'pullup': 'Espalda',
    'chin-up': 'Espalda',
    'chinup': 'Espalda',
    'remo': 'Espalda',
    'row': 'Espalda',
    'jalon': 'Espalda',
    'jalón': 'Espalda',
    'lat pulldown': 'Espalda',
    'lumbares': 'Espalda',
    'hiperextensiones': 'Espalda',
    'pullover': 'Espalda',
    'pull over': 'Espalda',
    
    // Hombros
    'hombro': 'Hombros',
    'hombros': 'Hombros',
    'militar': 'Hombros',
    'press militar': 'Hombros',
    'overhead': 'Hombros',
    'shoulder': 'Hombros',
    'laterales': 'Hombros',
    'pajaros': 'Hombros',
    'pájaros': 'Hombros',
    'deltoides': 'Hombros',
    'arnold': 'Hombros',
    'frontales': 'Hombros',
    'vuelos': 'Hombros',
    
    // Bíceps
    'biceps': 'Bíceps',
    'bíceps': 'Bíceps',
    'curl de biceps': 'Bíceps',
    'curl de bíceps': 'Bíceps',
    'curl': 'Bíceps',
    'martillo': 'Bíceps',
    'hammer': 'Bíceps',
    'scott': 'Bíceps',
    'predicador': 'Bíceps',
    'concentrado': 'Bíceps',
    
    // Tríceps
    'triceps': 'Tríceps',
    'tríceps': 'Tríceps',
    'copa': 'Tríceps',
    'skullcrusher': 'Tríceps',
    'rompecraneos': 'Tríceps',
    'rompecráneos': 'Tríceps',
    'frances': 'Tríceps',
    'francés': 'Tríceps',
    'french press': 'Tríceps',
    'polea alta': 'Tríceps',
    'extension de triceps': 'Tríceps',
    'extensión de tríceps': 'Tríceps',
    'patada de triceps': 'Tríceps',
    'patada de tríceps': 'Tríceps',
    
    // Antebrazo
    'antebrazo': 'Antebrazo',
    'antebrazos': 'Antebrazo',
    'forearm': 'Antebrazo',
    'forearms': 'Antebrazo',
    'pronacion': 'Antebrazo',
    'pronación': 'Antebrazo',
    'supinacion': 'Antebrazo',
    'supinación': 'Antebrazo',
    'muñeca': 'Antebrazo',
    'muñecas': 'Antebrazo',
    'granjero': 'Antebrazo',
    'farmers': 'Antebrazo',
    'cuelgue': 'Antebrazo',
    
    // Core
    'core': 'Core',
    'abdominales': 'Core',
    'abdomen': 'Core',
    'crunch': 'Core',
    'plancha': 'Core',
    'plank': 'Core',
    'giros rusos': 'Core',
    'russian twist': 'Core',
    'elevacion de piernas': 'Core',
    'elevación de piernas': 'Core',
    'v-ups': 'Core',
    'isometria': 'Core',
    'oblicuos': 'Core',
    
    // Cuádriceps
    'cuadriceps': 'Cuádriceps',
    'cuádriceps': 'Cuádriceps',
    'sentadilla': 'Cuádriceps',
    'sentadillas': 'Cuádriceps',
    'squat': 'Cuádriceps',
    'squats': 'Cuádriceps',
    'prensa': 'Cuádriceps',
    'leg press': 'Cuádriceps',
    'desplantes': 'Cuádriceps',
    'lunges': 'Cuádriceps',
    'zancadas': 'Cuádriceps',
    'extensiones': 'Cuádriceps',
    'extensions': 'Cuádriceps',
    'hacks': 'Cuádriceps',
    'sissy': 'Cuádriceps',
    
    // Isquiotibiales
    'femoral': 'Isquiotibiales',
    'femorales': 'Isquiotibiales',
    'isquios': 'Isquiotibiales',
    'isquiotibiales': 'Isquiotibiales',
    'hamstring': 'Isquiotibiales',
    'hamstrings': 'Isquiotibiales',
    'muerto rumano': 'Isquiotibiales',
    'peso muerto rumano': 'Isquiotibiales',
    'peso muerto': 'Isquiotibiales',
    'deadlift': 'Isquiotibiales',
    
    // Glúteos
    'gluteo': 'Glúteos',
    'glúteo': 'Glúteos',
    'gluteos': 'Glúteos',
    'glúteos': 'Glúteos',
    'hip thrust': 'Glúteos',
    'hipthrust': 'Glúteos',
    'puente de gluteo': 'Glúteos',
    'puente de glúteo': 'Glúteos',
    'patada de gluteo': 'Glúteos',
    'patada de glúteo': 'Glúteos',
    'abductores': 'Glúteos',
    'aductores': 'Glúteos',
    
    // Gemelos
    'gemelo': 'Gemelos',
    'gemelos': 'Gemelos',
    'pantorrilla': 'Gemelos',
    'pantorrillas': 'Gemelos',
    'calf': 'Gemelos',
    'calves': 'Gemelos',
    'talones': 'Gemelos',
    
    // Cuello
    'cuello': 'Cuello',
    'neck': 'Cuello',
    'trapecio': 'Cuello',
    'trapecios': 'Cuello',
    'encogimiento': 'Cuello',
    'encogimientos': 'Cuello',
    'shrugs': 'Cuello'
  };

  // Toggle visual muscle group selection
  const toggleMuscle = (muscle) => {
    setTrainedMuscles(prev => {
      let next;
      if (prev.includes(muscle)) {
        next = prev.filter(m => m !== muscle);
      } else {
        next = [...prev, muscle];
      }
      if (next.length > 0) {
        setMuscleGroup(next[0]);
      }
      return next;
    });
  };

  const handleMuscleGroupChange = (val) => {
    setMuscleGroup(val);
    setTrainedMuscles(prev => {
      if (prev.includes(val)) {
        return [val, ...prev.filter(m => m !== val)];
      } else {
        return [val, ...prev];
      }
    });
  };

  // Effect to auto-detect muscles as the user types exercise names
  useEffect(() => {
    if (workoutType !== 'gym') return;
    const detectedMuscles = new Set();
    exercises.forEach(ex => {
      if (!ex.name) return;
      const lowerName = ex.name.toLowerCase();
      Object.keys(EXERCISE_TO_MUSCLE_MAP).forEach(keyword => {
        if (lowerName.includes(keyword)) {
          detectedMuscles.add(EXERCISE_TO_MUSCLE_MAP[keyword]);
        }
      });
    });

    if (detectedMuscles.size > 0) {
      setTrainedMuscles(prev => {
        const union = new Set([...prev, ...detectedMuscles]);
        const next = Array.from(union);
        if (next.length > 0 && !next.includes(muscleGroup)) {
          setMuscleGroup(next[0]);
        }
        const areEqual = prev.length === next.length && prev.every((v, i) => v === next[i]);
        return areEqual ? prev : next;
      });
    }
  }, [exercises, workoutType]);

  // ==========================================
  // METRONOME AND TEMPO ASSISTANT STATE & LOGIC
  // ==========================================
  const [showTempoPanel, setShowTempoPanel] = useState(false);
  const [isMetronomePlaying, setIsMetronomePlaying] = useState(false);
  const [soundMode, setSoundMode] = useState('synth'); // 'synth' (beeps), 'voice' (Speech count), 'silent'
  const [volume, setVolume] = useState(60); // 0 - 100

  // Running Mode (Cadence SPM Guide)
  const [cadenceSpm, setCadenceSpm] = useState(170);
  const [spmBeatActive, setSpmBeatActive] = useState(false);

  // Gym Mode (Tempo TUT Guide)
  const [tempoEccentric, setTempoEccentric] = useState(3);
  const [tempoIsometricBottom, setTempoIsometricBottom] = useState(0);
  const [tempoConcentric, setTempoConcentric] = useState(1);
  const [tempoIsometricTop, setTempoIsometricTop] = useState(0);
  const [currentTempoPhase, setCurrentTempoPhase] = useState('ready'); // eccentric, isometricBottom, concentric, isometricTop, ready
  const [tempoCount, setTempoCount] = useState(0);
  const [completedReps, setCompletedReps] = useState(0);

  // Stopwatch & Rest Timer
  const [stopwatchTime, setStopwatchTime] = useState(0);
  const [isStopwatchRunning, setIsStopwatchRunning] = useState(false);
  const [restTimeLeft, setRestTimeLeft] = useState(90);
  const [restDuration, setRestDuration] = useState(90);
  const [isRestTimerRunning, setIsRestTimerRunning] = useState(false);

  // Audio & Timing Refs
  const audioCtxRef = useRef(null);
  const cadenceIntervalRef = useRef(null);
  const gymIntervalRef = useRef(null);
  const stopwatchIntervalRef = useRef(null);
  const restIntervalRef = useRef(null);

  const phaseRef = useRef('eccentric');
  const countRef = useRef(0);
  const repsRef = useRef(0);

  // A. Lazy initialization of browser native AudioContext (compliance with user-interaction policies)
  const getAudioContext = () => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  };

  // B. Synthesize precise synth beep nodes locally via Web Audio API
  const playBeep = (freq = 800, dur = 0.08, vol = volume / 100) => {
    if (soundMode === 'silent') return;
    try {
      const ctx = getAudioContext();
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();

      osc.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gainNode.gain.setValueAtTime(vol * 0.15, ctx.currentTime); // Gentle scale
      gainNode.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);

      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + dur);
    } catch (e) {
      console.warn("Browser audio context blocked or not loaded: ", e);
    }
  };

  // C. Play a unique high-frequency triple beep when the rest interval concludes
  const playTripleAlarm = () => {
    const vol = volume / 100;
    playBeep(1000, 0.15, vol);
    setTimeout(() => playBeep(1000, 0.15, vol), 200);
    setTimeout(() => playBeep(1000, 0.25, vol), 400);
  };

  // D. Synthesize highly clear virtual trainer speech prompts in Spanish
  const speakText = (text) => {
    if (soundMode !== 'voice') return;
    try {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel(); // Stop any currently stacked utterances
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'es-ES';
        utterance.volume = volume / 100;
        utterance.rate = 1.35; // Rhythmic rate
        window.speechSynthesis.speak(utterance);
      }
    } catch (e) {
      console.warn("Speech synthesis failed: ", e);
    }
  };

  // E. Directs beep and vocal counts according to specific exercise phases
  const playVoiceOrBeep = (phase, count) => {
    const vol = volume / 100;
    if (soundMode === 'silent') return;

    if (soundMode === 'synth') {
      if (phase === 'eccentric') {
        if (count === 1) playBeep(700, 0.08, vol);
        else playBeep(500, 0.05, vol);
      } else if (phase === 'isometricBottom') {
        if (count === 1) playBeep(600, 0.08, vol);
        else playBeep(500, 0.05, vol);
      } else if (phase === 'concentric') {
        if (count === 1) playBeep(900, 0.1, vol);
        else playBeep(500, 0.05, vol);
      } else if (phase === 'isometricTop') {
        if (count === 1) playBeep(600, 0.08, vol);
        else playBeep(500, 0.05, vol);
      }
    } else if (soundMode === 'voice') {
      let word = "";
      if (phase === 'eccentric') {
        word = count === 1 ? "Baja" : String(count);
      } else if (phase === 'isometricBottom') {
        word = count === 1 ? "Pausa" : String(count);
      } else if (phase === 'concentric') {
        word = count === 1 ? "Sube" : String(count);
      } else if (phase === 'isometricTop') {
        word = count === 1 ? "Arriba" : String(count);
      }
      speakText(word);
    }
  };

  // F. Gym phase progression state machine tick
  const handleGymTick = () => {
    let nextPhase = phaseRef.current;
    let nextCount = countRef.current + 1;
    let nextReps = repsRef.current;

    let phaseDuration = 0;
    if (nextPhase === 'eccentric') phaseDuration = tempoEccentric;
    else if (nextPhase === 'isometricBottom') phaseDuration = tempoIsometricBottom;
    else if (nextPhase === 'concentric') phaseDuration = tempoConcentric;
    else if (nextPhase === 'isometricTop') phaseDuration = tempoIsometricTop;

    if (nextCount > phaseDuration) {
      nextCount = 1;
      if (nextPhase === 'eccentric') {
        nextPhase = 'isometricBottom';
      } else if (nextPhase === 'isometricBottom') {
        nextPhase = 'concentric';
      } else if (nextPhase === 'concentric') {
        nextPhase = 'isometricTop';
      } else if (nextPhase === 'isometricTop') {
        nextPhase = 'eccentric';
        nextReps += 1;
        repsRef.current = nextReps;
        setCompletedReps(nextReps);
      }

      // Skip phases with 0-second duration dynamically
      let loops = 0;
      while (loops < 4) {
        let dur = 0;
        if (nextPhase === 'eccentric') dur = tempoEccentric;
        else if (nextPhase === 'isometricBottom') dur = tempoIsometricBottom;
        else if (nextPhase === 'concentric') dur = tempoConcentric;
        else if (nextPhase === 'isometricTop') dur = tempoIsometricTop;

        if (dur > 0) {
          break;
        }

        if (nextPhase === 'eccentric') {
          nextPhase = 'isometricBottom';
        } else if (nextPhase === 'isometricBottom') {
          nextPhase = 'concentric';
        } else if (nextPhase === 'concentric') {
          nextPhase = 'isometricTop';
        } else if (nextPhase === 'isometricTop') {
          nextPhase = 'eccentric';
          nextReps += 1;
          repsRef.current = nextReps;
          setCompletedReps(nextReps);
        }
        loops++;
      }
    }

    phaseRef.current = nextPhase;
    countRef.current = nextCount;
    setCurrentTempoPhase(nextPhase);
    setTempoCount(nextCount);

    playVoiceOrBeep(nextPhase, nextCount);
  };

  // G. Running Cadence (SPM) loop effect
  useEffect(() => {
    if (isMetronomePlaying && workoutType === 'running') {
      const intervalMs = 60000 / cadenceSpm;
      
      // Emit first beat instantly
      playBeep(850, 0.05);
      setSpmBeatActive(true);
      const flashT = setTimeout(() => setSpmBeatActive(false), 80);

      cadenceIntervalRef.current = setInterval(() => {
        playBeep(850, 0.05);
        setSpmBeatActive(true);
        setTimeout(() => setSpmBeatActive(false), 80);
      }, intervalMs);
    } else {
      if (cadenceIntervalRef.current) {
        clearInterval(cadenceIntervalRef.current);
      }
      setSpmBeatActive(false);
    }

    return () => {
      if (cadenceIntervalRef.current) {
        clearInterval(cadenceIntervalRef.current);
      }
    };
  }, [isMetronomePlaying, cadenceSpm, soundMode, workoutType, volume]);

  // H. Gym Tempo (TUT) loop effect
  useEffect(() => {
    if (isMetronomePlaying && workoutType === 'gym') {
      phaseRef.current = 'eccentric';
      countRef.current = 0;
      
      // Determine actual starting phase (first phase > 0)
      let startingPhase = 'eccentric';
      let loops = 0;
      while (loops < 4) {
        let dur = 0;
        if (startingPhase === 'eccentric') dur = tempoEccentric;
        else if (startingPhase === 'isometricBottom') dur = tempoIsometricBottom;
        else if (startingPhase === 'concentric') dur = tempoConcentric;
        else if (startingPhase === 'isometricTop') dur = tempoIsometricTop;

        if (dur > 0) {
          break;
        }
        if (startingPhase === 'eccentric') startingPhase = 'isometricBottom';
        else if (startingPhase === 'isometricBottom') startingPhase = 'concentric';
        else if (startingPhase === 'concentric') startingPhase = 'isometricTop';
        else if (startingPhase === 'isometricTop') startingPhase = 'eccentric';
        loops++;
      }
      
      phaseRef.current = startingPhase;
      setCurrentTempoPhase(startingPhase);
      setTempoCount(0);

      // Run initial tick immediately
      handleGymTick();

      gymIntervalRef.current = setInterval(() => {
        handleGymTick();
      }, 1000);
    } else {
      if (gymIntervalRef.current) {
        clearInterval(gymIntervalRef.current);
      }
      setCurrentTempoPhase('ready');
      setTempoCount(0);
    }

    return () => {
      if (gymIntervalRef.current) {
        clearInterval(gymIntervalRef.current);
      }
    };
  }, [
    isMetronomePlaying,
    workoutType,
    soundMode,
    tempoEccentric,
    tempoIsometricBottom,
    tempoConcentric,
    tempoIsometricTop,
    volume
  ]);

  // I. Set Stopwatch timer effect
  useEffect(() => {
    if (isStopwatchRunning) {
      stopwatchIntervalRef.current = setInterval(() => {
        setStopwatchTime(prev => prev + 1);
      }, 1000);
    } else {
      if (stopwatchIntervalRef.current) {
        clearInterval(stopwatchIntervalRef.current);
      }
    }
    return () => {
      if (stopwatchIntervalRef.current) {
        clearInterval(stopwatchIntervalRef.current);
      }
    };
  }, [isStopwatchRunning]);

  // J. Set Rest Countdown effect with warnings and conclusion alerts
  useEffect(() => {
    if (isRestTimerRunning) {
      restIntervalRef.current = setInterval(() => {
        setRestTimeLeft(prev => {
          const nextTime = prev - 1;
          if (nextTime <= 0) {
            clearInterval(restIntervalRef.current);
            setIsRestTimerRunning(false);
            playTripleAlarm();
            return 0;
          }
          if (nextTime === 3 || nextTime === 2 || nextTime === 1) {
            playBeep(600, 0.1, volume / 100);
          }
          return nextTime;
        });
      }, 1000);
    } else {
      if (restIntervalRef.current) {
        clearInterval(restIntervalRef.current);
      }
    }
    return () => {
      if (restIntervalRef.current) {
        clearInterval(restIntervalRef.current);
      }
    };
  }, [isRestTimerRunning, volume]);

  // K. Background & Tab Visiblity lifecycle logic to cancel queued SpeechSynthesizer notifications
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        if ('speechSynthesis' in window) {
          window.speechSynthesis.cancel();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      
      // Cleanup all timing hooks
      if (cadenceIntervalRef.current) clearInterval(cadenceIntervalRef.current);
      if (gymIntervalRef.current) clearInterval(gymIntervalRef.current);
      if (stopwatchIntervalRef.current) clearInterval(stopwatchIntervalRef.current);
      if (restIntervalRef.current) clearInterval(restIntervalRef.current);
      
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      
      if (audioCtxRef.current) {
        audioCtxRef.current.close().catch(err => console.warn("Context cleanup error: ", err));
        audioCtxRef.current = null;
      }
    };
  }, []);

  // Timer format utilities
  const formatStopwatchTime = (totalSeconds) => {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const formatRestTime = (totalSeconds) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}:${String(secs).padStart(2, '0')}`;
  };

  const handleStartRestTimer = (seconds) => {
    setRestDuration(seconds);
    setRestTimeLeft(seconds);
    setIsRestTimerRunning(true);
    getAudioContext(); // Force initial user-gesture unlocks
  };

  // Load preset fields automatically if they are passed
  useEffect(() => {
    if (preset) {
      const isWorkoutEdit = !!preset.id;

      if (isWorkoutEdit) {
        if (preset.type) setWorkoutType(preset.type);
        if (preset.date) setDate(preset.date);
        if (preset.notes) setNotes(preset.notes);

        if (preset.type === 'gym') {
          if (preset.sessionName) setSessionName(preset.sessionName);
          if (preset.muscleGroup) setMuscleGroup(preset.muscleGroup);
          if (preset.trainedMuscles) setTrainedMuscles(preset.trainedMuscles);
          if (preset.exercises) setExercises(preset.exercises);
        } else {
          if (preset.distance) setDistance(String(preset.distance));
          if (preset.duration && preset.duration.includes(':')) {
            const parts = preset.duration.split(':');
            if (parts.length === 3) {
              setDurationHH(parts[0]);
              setDurationMM(parts[1]);
              setDurationSS(parts[2]);
            }
          }
          if (preset.heartRate) setHeartRate(String(preset.heartRate));
          if (preset.rpe) setRpeRunning(String(preset.rpe));
          if (preset.terrain) setTerrain(preset.terrain);
          if (preset.gpxData) setGpxData(preset.gpxData);
          if (preset.maxSpeed) setMaxSpeed(String(preset.maxSpeed));
          if (preset.avgCadence) setAvgCadence(String(preset.avgCadence));
          if (preset.maxCadence) setMaxCadence(String(preset.maxCadence));
          if (preset.strideLength) setStrideLength(String(preset.strideLength));
          if (preset.elevationGain) setElevationGain(String(preset.elevationGain));
          if (preset.elevationLoss) setElevationLoss(String(preset.elevationLoss));
          if (preset.shoeId) setShoeId(preset.shoeId);
          
          if (preset.splits && preset.splits.length > 0) {
            setSplits(preset.splits);
            const hasStructured = preset.splits.some(s => s.type === 'warmup' || s.type === 'interval' || s.type === 'rest' || s.type === 'cooldown');
            if (hasStructured) {
              setSplitsType('structured');
            } else {
              const hasInterval = preset.splits.some(s => s.distance !== 1000);
              if (hasInterval) {
                setSplitsType('manual');
              } else {
                setSplitsType('auto');
              }
            }
          } else {
            setSplits([]);
          }
        }
      } else {
        if (preset.type) setWorkoutType(preset.type);
        if (preset.terrain) setTerrain(preset.terrain);
        if (preset.muscleGroup) {
          setMuscleGroup(preset.muscleGroup);
          setTrainedMuscles([preset.muscleGroup]);
        }
        if (preset.sessionName) setSessionName(preset.sessionName);
        
        if (preset.type === 'gym' && preset.muscleGroup) {
          const exercisesByMuscle = {
            'Pectoral': 'Press de Banca',
            'Espalda': 'Dominadas',
            'Pierna': 'Sentadilla Trasera con Barra',
            'Hombros': 'Press Militar con Barra',
            'Brazos': 'Curl de Bíceps con Barra',
            'Core': 'Plancha Abdominal (Plank)'
          };
          const defaultExName = exercisesByMuscle[preset.muscleGroup] || '';
          setExercises([{
            name: defaultExName,
            sets: [
              { type: 'working', weight: '50', reps: '10', rpe: '8', rest: '90', done: true },
              { type: 'working', weight: '50', reps: '10', rpe: '8', rest: '90', done: true },
              { type: 'working', weight: '50', reps: '10', rpe: '8', rest: '90', done: true },
              { type: 'working', weight: '50', reps: '10', rpe: '8', rest: '90', done: true }
            ]
          }]);
        }
      }
    }
  }, [preset]);

  // Autofill running details from the last session in workouts list
  const handleAutoFillLastRun = async () => {
    if (!workouts || workouts.length === 0) {
      await triggerAlert("Sin Entrenamientos", "No hay entrenamientos previos en tu historial para auto-sugerir.");
      return;
    }
    const runs = workouts.filter(w => w.type === 'running');
    if (runs.length === 0) {
      await triggerAlert("Sin Corridas", "No se encontraron sesiones de running previas para auto-sugerir.");
      return;
    }
    
    // Sort runs by date descending to find the latest
    const latestRun = [...runs].sort((a, b) => new Date(b.date + 'T00:00:00') - new Date(a.date + 'T00:00:00'))[0];
    
    if (latestRun) {
      setDistance(latestRun.distance.toString());
      if (latestRun.heartRate) setHeartRate(latestRun.heartRate.toString());
      if (latestRun.rpe) setRpeRunning(latestRun.rpe.toString());
      if (latestRun.terrain) setTerrain(latestRun.terrain);
      
      // Parse duration HH:MM:SS
      if (latestRun.duration && latestRun.duration.includes(':')) {
        const parts = latestRun.duration.split(':');
        if (parts.length === 3) {
          setDurationHH(parts[0]);
          setDurationMM(parts[1]);
          setDurationSS(parts[2]);
        }
      }
      
      await triggerAlert("Éxito", `¡Formulario autocompletado con tu última corrida (${latestRun.date})!`);
    }
  };

  const handleGpxLoaded = (parsedStruct) => {
    const compressed = compressGpxData(parsedStruct);
    setGpxData(compressed);
    if (parsedStruct?.summary) {
      const { distance: d, duration: dur, date: dDate } = parsedStruct.summary;
      if (d) setDistance(d.toFixed(2));
      if (dDate) setDate(dDate);
      if (dur && dur.includes(':')) {
        const parts = dur.split(':');
        if (parts.length === 3) {
          setDurationHH(parts[0]);
          setDurationMM(parts[1]);
          setDurationSS(parts[2]);
        }
      }
    }
  };

  // Handle Gym exercise list actions
  const addExerciseRow = () => {
    setExercises([
      ...exercises,
      { 
        name: '', 
        sets: [
          { type: 'working', weight: '50', reps: '10', rpe: '8', rest: '90', done: true },
          { type: 'working', weight: '50', reps: '10', rpe: '8', rest: '90', done: true },
          { type: 'working', weight: '50', reps: '10', rpe: '8', rest: '90', done: true },
          { type: 'working', weight: '50', reps: '10', rpe: '8', rest: '90', done: true }
        ]
      }
    ]);
  };

  const removeExerciseRow = async (index) => {
    if (exercises.length === 1) {
      await triggerAlert("Error de Ejercicios", "Debes registrar al menos un ejercicio en la sesión de gimnasio.");
      return;
    }
    setExercises(exercises.filter((_, idx) => idx !== index));
  };

  const updateExerciseField = (index, field, value) => {
    const updated = [...exercises];
    updated[index][field] = value;
    setExercises(updated);
  };

  const addSetToExercise = (exIdx) => {
    const updated = [...exercises];
    const currentSets = updated[exIdx].sets || [];
    const lastSet = currentSets[currentSets.length - 1] || { type: 'working', weight: '50', reps: '10', rpe: '8', rest: '90', done: true };
    updated[exIdx].sets = [
      ...currentSets,
      { 
        type: lastSet.type, 
        weight: lastSet.weight, 
        reps: lastSet.reps, 
        rpe: lastSet.rpe, 
        rest: lastSet.rest, 
        done: true 
      }
    ];
    setExercises(updated);
  };

  const removeSetFromExercise = async (exIdx, setIdx) => {
    const updated = [...exercises];
    const currentSets = updated[exIdx].sets || [];
    if (currentSets.length === 1) {
      await triggerAlert("Error de Series", "Cada ejercicio debe tener al menos una serie.");
      return;
    }
    updated[exIdx].sets = currentSets.filter((_, idx) => idx !== setIdx);
    setExercises(updated);
  };

  const updateSetField = (exIdx, setIdx, field, value) => {
    const updated = [...exercises];
    updated[exIdx].sets = updated[exIdx].sets.map((s, idx) => {
      if (idx === setIdx) {
        return { ...s, [field]: value };
      }
      return s;
    });
    setExercises(updated);
  };

  // Calculate live volume of session being recorded (only includes done: true sets)
  const getLiveSessionVolume = () => {
    return exercises.reduce((sum, ex) => {
      if (Array.isArray(ex.sets)) {
        return sum + ex.sets.reduce((exSum, s) => {
          if (s.done) {
            const w = parseFloat(s.weight) || 0;
            const r = parseFloat(s.reps) || 0;
            return exSum + (w * r);
          }
          return exSum;
        }, 0);
      } else {
        const sets = Number(ex.sets) || 0;
        const reps = Number(ex.reps) || 0;
        const weight = Number(ex.weight) || 0;
        return sum + (sets * reps * weight);
      }
    }, 0);
  };

  // Form submit handler
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (workoutType === 'running') {
      // Validations
      if (!distance || Number(distance) <= 0) {
        await triggerAlert("Validación de Distancia", "Por favor ingresa una distancia de carrera válida en kilómetros.");
        return;
      }
      
      const hh = String(durationHH).padStart(2, '0');
      const mm = String(durationMM).padStart(2, '0');
      const ss = String(durationSS).padStart(2, '0');
      
      const newWorkout = {
        id: isEditMode ? preset.id : `run-${Date.now()}`,
        type: 'running',
        date,
        distance: parseFloat(distance),
        duration: `${hh}:${mm}:${ss}`,
        heartRate: heartRate ? parseInt(heartRate) : null,
        rpe: rpeRunning ? parseInt(rpeRunning) : null,
        terrain,
        notes,
        gpxData,
        maxSpeed: maxSpeed || null,
        avgCadence: avgCadence ? parseInt(avgCadence) : null,
        maxCadence: maxCadence ? parseInt(maxCadence) : null,
        strideLength: strideLength ? parseFloat(strideLength) : null,
        elevationGain: elevationGain ? parseInt(elevationGain) : null,
        elevationLoss: elevationLoss ? parseInt(elevationLoss) : null,
        splits: splits.length > 0 ? splits : null,
        shoeId: shoeId || null
      };
      
      if (isEditMode) {
        if (onUpdateWorkout) onUpdateWorkout(newWorkout);
      } else {
        onSaveWorkout(newWorkout);
      }
      if (onClose) onClose();
    } else {
      // Gym validations
      if (!sessionName.trim()) {
        await triggerAlert("Validación de Nombre", "Por favor ingresa el nombre de la sesión (ej: Fuerza de Empuje).");
        return;
      }

      const emptyExercise = exercises.some(ex => !ex.name.trim());
      if (emptyExercise) {
        await triggerAlert("Validación de Ejercicios", "Por favor completa el nombre de todos los ejercicios agregados.");
        return;
      }

      const formattedExercises = exercises.map(ex => {
        // Formatear cada serie
        const formattedSets = ex.sets.map(s => ({
          type: s.type || 'working',
          weight: parseFloat(s.weight) || 0,
          reps: parseInt(s.reps) || 0,
          rpe: s.rpe ? parseInt(s.rpe) : null,
          rest: s.rest ? parseInt(s.rest) : 90,
          done: s.done !== false
        }));

        // Buscar la primera serie efectiva (working) como fallback para campos planos retrocompatibles
        const workingSets = formattedSets.filter(s => s.type === 'working');
        const fallbackSet = workingSets.length > 0 ? workingSets[0] : formattedSets[0];

        return {
          name: ex.name.trim(),
          sets: formattedSets,
          reps: fallbackSet ? fallbackSet.reps : 0,
          weight: fallbackSet ? fallbackSet.weight : 0,
          rpe: fallbackSet ? fallbackSet.rpe : null
        };
      });

      const newWorkout = {
        id: isEditMode ? preset.id : `gym-${Date.now()}`,
        type: 'gym',
        date,
        sessionName: sessionName.trim(),
        muscleGroup,
        trainedMuscles, // Guardar la lista de músculos específicos entrenados
        exercises: formattedExercises,
        notes
      };

      if (isEditMode) {
        if (onUpdateWorkout) onUpdateWorkout(newWorkout);
      } else {
        onSaveWorkout(newWorkout);
      }
      if (onClose) onClose();
    }
  };

  const renderMuscleAnatomyMap = () => {
    const isTrained = (m) => trainedMuscles.includes(m);
    
    return (
      <div className="muscle-selector-wrapper">
        <div className="anatomy-map-container">
          <svg className="anatomy-svg" viewBox="0 0 240 220" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="gym-neon-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#ec4899" />
                <stop offset="100%" stopColor="#f43f5e" />
              </linearGradient>
              <filter id="glow-filter" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="2" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            
            {/* ANTERIOR VIEW (Left side, centered around X=60) */}
            <g id="anterior-view">
              <text x="60" y="215" fill="var(--text-muted)" fontSize="9" fontWeight="700" textAnchor="middle" letterSpacing="0.05em">ANTERIOR</text>
              <ellipse cx="60" cy="20" rx="9" ry="11" className="body-neutral" />
              <circle cx="15" cy="112" r="3" className="body-neutral" />
              <circle cx="105" cy="112" r="3" className="body-neutral" />
              <path d="M 23 210 L 35 210 L 33 214 L 20 214 Z" className="body-neutral" />
              <path d="M 85 210 L 97 210 L 100 214 L 87 214 Z" className="body-neutral" />

              {/* Cuello */}
              <path 
                d="M 56 31 L 64 31 L 62 40 L 58 40 Z" 
                className={`muscle-part ${isTrained('Cuello') ? 'active' : ''}`}
                onClick={() => toggleMuscle('Cuello')}
              />

              {/* Hombros */}
              <path 
                d="M 43 45 L 34 47 L 38 60 L 44 52 Z" 
                className={`muscle-part ${isTrained('Hombros') ? 'active' : ''}`}
                onClick={() => toggleMuscle('Hombros')}
              />
              <path 
                d="M 77 45 L 86 47 L 82 60 L 76 52 Z" 
                className={`muscle-part ${isTrained('Hombros') ? 'active' : ''}`}
                onClick={() => toggleMuscle('Hombros')}
              />

              {/* Pectoral */}
              <path 
                d="M 59 42 L 45 45 L 47 64 L 59 66 Z" 
                className={`muscle-part ${isTrained('Pectoral') ? 'active' : ''}`}
                onClick={() => toggleMuscle('Pectoral')}
              />
              <path 
                d="M 61 42 L 75 45 L 73 64 L 61 66 Z" 
                className={`muscle-part ${isTrained('Pectoral') ? 'active' : ''}`}
                onClick={() => toggleMuscle('Pectoral')}
              />

              {/* Bíceps (Upper Arm Anterior) */}
              <path 
                d="M 34 47 L 28 72 L 33 80 L 38 60 Z" 
                className={`muscle-part ${isTrained('Bíceps') ? 'active' : ''}`}
                onClick={() => toggleMuscle('Bíceps')}
              />
              <path 
                d="M 86 47 L 92 72 L 87 80 L 82 60 Z" 
                className={`muscle-part ${isTrained('Bíceps') ? 'active' : ''}`}
                onClick={() => toggleMuscle('Bíceps')}
              />

              {/* Antebrazo (Lower Arm Anterior) */}
              <path 
                d="M 28 72 L 20 106 L 25 106 L 33 80 Z" 
                className={`muscle-part ${isTrained('Antebrazo') ? 'active' : ''}`}
                onClick={() => toggleMuscle('Antebrazo')}
              />
              <path 
                d="M 92 72 L 100 106 L 95 106 L 87 80 Z" 
                className={`muscle-part ${isTrained('Antebrazo') ? 'active' : ''}`}
                onClick={() => toggleMuscle('Antebrazo')}
              />

              {/* Core */}
              <path 
                d="M 47 66 L 73 66 L 70 104 L 50 104 Z" 
                className={`muscle-part ${isTrained('Core') ? 'active' : ''}`}
                onClick={() => toggleMuscle('Core')}
              />

              {/* Cuádriceps (Upper Leg Anterior) */}
              <path 
                d="M 48 108 L 33 110 L 35 160 L 51 157 Z" 
                className={`muscle-part ${isTrained('Cuádriceps') ? 'active' : ''}`}
                onClick={() => toggleMuscle('Cuádriceps')}
              />
              <path 
                d="M 72 108 L 87 110 L 85 160 L 69 157 Z" 
                className={`muscle-part ${isTrained('Cuádriceps') ? 'active' : ''}`}
                onClick={() => toggleMuscle('Cuádriceps')}
              />

              {/* Gemelos (Anterior view maps to Gemelos for visual simplicity) */}
              <path 
                d="M 35 160 L 27 206 L 34 207 L 45 158 Z" 
                className={`muscle-part ${isTrained('Gemelos') ? 'active' : ''}`}
                onClick={() => toggleMuscle('Gemelos')}
              />
              <path 
                d="M 85 160 L 93 206 L 86 207 L 75 158 Z" 
                className={`muscle-part ${isTrained('Gemelos') ? 'active' : ''}`}
                onClick={() => toggleMuscle('Gemelos')}
              />
            </g>
            
            {/* POSTERIOR VIEW (Right side, centered around X=180) */}
            <g id="posterior-view">
              <text x="180" y="215" fill="var(--text-muted)" fontSize="9" fontWeight="700" textAnchor="middle" letterSpacing="0.05em">POSTERIOR</text>
              <ellipse cx="180" cy="20" rx="9" ry="11" className="body-neutral" />
              <circle cx="135" cy="112" r="3" className="body-neutral" />
              <circle cx="225" cy="112" r="3" className="body-neutral" />
              <path d="M 143 210 L 155 210 L 153 214 L 140 214 Z" className="body-neutral" />
              <path d="M 205 210 L 217 210 L 220 214 L 207 214 Z" className="body-neutral" />

              {/* Cuello */}
              <path 
                d="M 176 31 L 184 31 L 182 40 L 178 40 Z" 
                className={`muscle-part ${isTrained('Cuello') ? 'active' : ''}`}
                onClick={() => toggleMuscle('Cuello')}
              />

              {/* Hombros */}
              <path 
                d="M 163 45 L 154 47 L 158 60 L 164 52 Z" 
                className={`muscle-part ${isTrained('Hombros') ? 'active' : ''}`}
                onClick={() => toggleMuscle('Hombros')}
              />
              <path 
                d="M 197 45 L 206 47 L 202 60 L 196 52 Z" 
                className={`muscle-part ${isTrained('Hombros') ? 'active' : ''}`}
                onClick={() => toggleMuscle('Hombros')}
              />

              {/* Espalda */}
              <path 
                d="M 179 42 L 164 45 L 166 84 L 179 90 Z" 
                className={`muscle-part ${isTrained('Espalda') ? 'active' : ''}`}
                onClick={() => toggleMuscle('Espalda')}
              />
              <path 
                d="M 181 42 L 196 45 L 194 84 L 181 90 Z" 
                className={`muscle-part ${isTrained('Espalda') ? 'active' : ''}`}
                onClick={() => toggleMuscle('Espalda')}
              />
              <path 
                d="M 166 84 L 194 84 L 191 104 L 169 104 Z" 
                className={`muscle-part ${isTrained('Espalda') ? 'active' : ''}`}
                onClick={() => toggleMuscle('Espalda')}
              />

              {/* Tríceps (Upper Arm Posterior) */}
              <path 
                d="M 154 47 L 148 72 L 153 80 L 158 60 Z" 
                className={`muscle-part ${isTrained('Tríceps') ? 'active' : ''}`}
                onClick={() => toggleMuscle('Tríceps')}
              />
              <path 
                d="M 206 47 L 212 72 L 207 80 L 202 60 Z" 
                className={`muscle-part ${isTrained('Tríceps') ? 'active' : ''}`}
                onClick={() => toggleMuscle('Tríceps')}
              />

              {/* Antebrazo (Lower Arm Posterior) */}
              <path 
                d="M 148 72 L 140 106 L 145 106 L 153 80 Z" 
                className={`muscle-part ${isTrained('Antebrazo') ? 'active' : ''}`}
                onClick={() => toggleMuscle('Antebrazo')}
              />
              <path 
                d="M 212 72 L 220 106 L 215 106 L 207 80 Z" 
                className={`muscle-part ${isTrained('Antebrazo') ? 'active' : ''}`}
                onClick={() => toggleMuscle('Antebrazo')}
              />

              {/* Glúteos (Upper Leg Posterior Top) */}
              <path 
                d="M 168 108 L 153 110 L 154 130 L 170 128 Z" 
                className={`muscle-part ${isTrained('Glúteos') ? 'active' : ''}`}
                onClick={() => toggleMuscle('Glúteos')}
              />
              <path 
                d="M 192 108 L 207 110 L 206 130 L 190 128 Z" 
                className={`muscle-part ${isTrained('Glúteos') ? 'active' : ''}`}
                onClick={() => toggleMuscle('Glúteos')}
              />

              {/* Isquiotibiales (Upper Leg Posterior Bottom) */}
              <path 
                d="M 170 128 L 154 130 L 155 160 L 171 157 Z" 
                className={`muscle-part ${isTrained('Isquiotibiales') ? 'active' : ''}`}
                onClick={() => toggleMuscle('Isquiotibiales')}
              />
              <path 
                d="M 190 128 L 206 130 L 205 160 L 189 157 Z" 
                className={`muscle-part ${isTrained('Isquiotibiales') ? 'active' : ''}`}
                onClick={() => toggleMuscle('Isquiotibiales')}
              />

              {/* Gemelos (Lower Leg Posterior) */}
              <path 
                d="M 155 160 L 147 206 L 154 207 L 165 158 Z" 
                className={`muscle-part ${isTrained('Gemelos') ? 'active' : ''}`}
                onClick={() => toggleMuscle('Gemelos')}
              />
              <path 
                d="M 205 160 L 213 206 L 206 207 L 195 158 Z" 
                className={`muscle-part ${isTrained('Gemelos') ? 'active' : ''}`}
                onClick={() => toggleMuscle('Gemelos')}
              />
            </g>
          </svg>
        </div>

        <div className="muscle-chips-container">
          <label className="form-label" style={{ marginBottom: '4px' }}>Músculos Entrenados</label>
          <span className="text-secondary text-2xs mb-2" style={{ lineHeight: '1.2' }}>
            Selecciona en el mapa visual o activa manualmente. ¡Se auto-detectan al escribir tus ejercicios!
          </span>
          <div className="muscle-chips-grid">
            {['Pectoral', 'Espalda', 'Hombros', 'Bíceps', 'Tríceps', 'Antebrazo', 'Core', 'Cuádriceps', 'Isquiotibiales', 'Gemelos', 'Glúteos', 'Cuello'].map(muscle => (
              <button
                key={muscle}
                type="button"
                className={`muscle-chip ${isTrained(muscle) ? 'active' : ''}`}
                onClick={() => toggleMuscle(muscle)}
              >
                <span>{muscle}</span>
                <span className="muscle-chip-dot"></span>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="form-modal-overlay">
      <div className="glass-card form-modal-card fade-in">
        
        {/* Header */}
        <div className="modal-header">
          <h2 className="gradient-text font-extrabold text-2xl flex-center">
            {workoutType === 'running' ? <TrendingUp size={22} className="running-text" /> : <Dumbbell size={22} className="gym-text" />}
            {isEditMode ? 'Editar Entrenamiento' : 'Registrar Nuevo Entrenamiento'}
          </h2>
          <button className="btn-close-modal" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Tab Switcher */}
        {!isEditMode && (
          <div className="tab-switcher mb-5">
            <button
              type="button"
              onClick={() => setWorkoutType('running')}
              className={`tab-btn ${workoutType === 'running' ? 'active-run' : ''}`}
            >
              🏃 Running / Cardio
            </button>
            <button
              type="button"
              onClick={() => setWorkoutType('gym')}
              className={`tab-btn ${workoutType === 'gym' ? 'active-gym' : ''}`}
            >
              🏋️ Gimnasio / Fuerza
            </button>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="modal-form-content">
          
          {/* General Fields (Date & Muscle Group or Terrain) */}
          <div className="form-row-2">
            <div className="form-group">
              <label className="form-label">Fecha del Entrenamiento</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="form-input"
              />
            </div>

            {workoutType === 'running' ? (
              <div className="form-group">
                <label className="form-label">Superficie / Terreno</label>
                <select
                  value={terrain}
                  onChange={(e) => setTerrain(e.target.value)}
                  className="form-select"
                >
                  <option value="Asfalto">Asfalto / Calle</option>
                  <option value="Pista">Pista de Atletismo</option>
                  <option value="Parque / Tierra">Parque / Tierra</option>
                  <option value="Cinta">Cinta de Correr</option>
                  <option value="Trail">Sendero / Trail</option>
                </select>
              </div>
            ) : (
              <div className="form-group">
                <label className="form-label">Grupo Muscular Principal</label>
                <select
                  value={muscleGroup}
                  onChange={(e) => handleMuscleGroupChange(e.target.value)}
                  className="form-select"
                >
                  <option value="Pectoral">💪 Pectoral</option>
                  <option value="Espalda">👐 Espalda</option>
                  <option value="Hombros">🛡️ Hombros</option>
                  <option value="Bíceps">💪 Bíceps</option>
                  <option value="Tríceps">🔥 Tríceps</option>
                  <option value="Antebrazo">✊ Antebrazo</option>
                  <option value="Core">🧱 Core</option>
                  <option value="Cuádriceps">🦵 Cuádriceps</option>
                  <option value="Isquiotibiales">🦵 Isquiotibiales</option>
                  <option value="Gemelos">🦶 Gemelos</option>
                  <option value="Glúteos">🍑 Glúteos</option>
                  <option value="Cuello">🦒 Cuello</option>
                  <option value="Full Body">🌐 Cuerpo Completo</option>
                </select>
              </div>
            )}
          </div>

          {/* RUNNING FIELDS */}
          {workoutType === 'running' && (
            <div className="running-form-section">
              <div className="autofill-action-container mb-4" style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button
                  type="button"
                  onClick={handleAutoFillLastRun}
                  className="btn btn-secondary py-1.5 px-3 flex-center text-xs"
                  style={{ gap: '6px', color: 'var(--color-running)', borderColor: 'rgba(16, 185, 129, 0.3)' }}
                >
                  ⚡ Auto-completar según última corrida
                </button>
              </div>

              {/* SELECTOR DE ZAPATILLA */}
              <div className="form-group mb-4">
                <label className="form-label flex-center" style={{ gap: '6px' }}>
                  👟 Calzado Utilizado
                </label>
                <select
                  value={shoeId}
                  onChange={(e) => setShoeId(e.target.value)}
                  className="form-input"
                  style={{ borderColor: shoeId ? 'var(--color-running)' : 'rgba(255,255,255,0.1)', cursor: 'pointer' }}
                >
                  <option value="">-- Sin Calzado Registrado / Descalzo --</option>
                  {shoes.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.brand} {s.model} {s.isActive ? '(Activo)' : '(Archivado)'}
                    </option>
                  ))}
                </select>
                
                {/* Wear Safety Warning */}
                {(() => {
                  const selectedShoe = shoes.find(s => s.id === shoeId);
                  if (selectedShoe) {
                    const runningWorkouts = workouts.filter(w => {
                      if (w.type !== 'running') return false;
                      return (w.advanced_metrics?.shoeId === selectedShoe.id) || (w.shoeId === selectedShoe.id);
                    });
                    const accumulatedDistance = runningWorkouts.reduce((sum, w) => sum + (Number(w.distance) || 0), 0);
                    const totalKm = Number(selectedShoe.initialKm || 0) + accumulatedDistance;
                    const progressPct = Math.min(100, (totalKm / Number(selectedShoe.maxKm || 800)) * 100);

                    if (progressPct >= 85) {
                      return (
                        <div className="alert-wear mt-2" style={{ display: 'flex', gap: '0.5rem', padding: '0.65rem', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.25)', borderRadius: '8px', fontSize: '0.75rem', color: '#f87171', lineHeight: '1.3' }}>
                          <span>⚠️ <strong>Zapatilla con desgaste crítico</strong> ({Math.round(totalKm * 10) / 10} km de uso, {Math.round(progressPct)}% de su límite). Considera rotarla para evitar molestias articulares.</span>
                        </div>
                      );
                    } else if (progressPct >= 60) {
                      return (
                        <div className="alert-wear mt-2" style={{ display: 'flex', gap: '0.5rem', padding: '0.65rem', background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.25)', borderRadius: '8px', fontSize: '0.75rem', color: '#fbbf24', lineHeight: '1.3' }}>
                          <span>👟 <strong>Desgaste Moderado:</strong> Este calzado tiene {Math.round(totalKm * 10) / 10} km de uso. Aún está en buen estado, pero empieza a acumular fatiga mecánica.</span>
                        </div>
                      );
                    }
                  }
                  return null;
                })()}
              </div>

              {/* CALCULATED PACE AND SPEED BANNER */}
              <div className="mb-4 p-3 rounded-lg flex-between-row" style={{ background: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                <div>
                  <span className="text-xs text-secondary block">Ritmo Medio Calculado</span>
                  <span className="font-bold text-running text-lg">{calculatedPace} <small className="text-xs opacity-70">/km</small></span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span className="text-xs text-secondary block">Velocidad Media</span>
                  <span className="font-bold text-running text-lg">{calculatedSpeed} <small className="text-xs opacity-70">km/h</small></span>
                </div>
              </div>

              {/* ADVANCED RUNNING METRICS BUTTON */}
              <div className="advanced-metrics-section mb-4">
                <button 
                  type="button"
                  onClick={() => setShowAdvancedMetrics(!showAdvancedMetrics)}
                  className="btn btn-secondary w-full flex-center mb-2"
                  style={{ border: '1px dashed var(--color-running)' }}
                >
                  <TrendingUp size={16} className="text-running" />
                  <span>Métricas Avanzadas y Splits (Opcional)</span>
                  {showAdvancedMetrics ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
                
                {showAdvancedMetrics && (
                  <div className="scanner-panel glass-card p-4 rounded-xl mb-4" style={{ background: 'rgba(16, 185, 129, 0.02)', border: '1px solid rgba(16, 185, 129, 0.15)' }}>
                    
                    <div className="form-row-2 mb-3">
                      <div className="form-group-custom">
                        <label className="form-label-custom text-xs">Velocidad/Ritmo Max</label>
                        <input type="text" placeholder="ej: 3:45 o 15 km/h" value={maxSpeed} onChange={e => setMaxSpeed(e.target.value)} className="form-input" style={{ padding: '0.4rem' }} />
                      </div>
                      <div className="form-group-custom">
                        <label className="form-label-custom text-xs">Zancada Media (m)</label>
                        <input type="number" step="0.01" placeholder="ej: 1.15" value={strideLength} onChange={e => setStrideLength(e.target.value)} className="form-input" style={{ padding: '0.4rem' }} />
                      </div>
                    </div>

                    <div className="form-row-2 mb-3">
                      <div className="form-group-custom">
                        <label className="form-label-custom text-xs">Cadencia Media (SPM)</label>
                        <input type="number" placeholder="ej: 165" value={avgCadence} onChange={e => setAvgCadence(e.target.value)} className="form-input" style={{ padding: '0.4rem' }} />
                      </div>
                      <div className="form-group-custom">
                        <label className="form-label-custom text-xs">Cadencia Máx (SPM)</label>
                        <input type="number" placeholder="ej: 180" value={maxCadence} onChange={e => setMaxCadence(e.target.value)} className="form-input" style={{ padding: '0.4rem' }} />
                      </div>
                    </div>

                    <div className="form-row-2 mb-4">
                      <div className="form-group-custom">
                        <label className="form-label-custom text-xs" style={{ color: '#ef4444' }}>Elevación Ganada (m)</label>
                        <input type="number" placeholder="ej: 150" value={elevationGain} onChange={e => setElevationGain(e.target.value)} className="form-input" style={{ padding: '0.4rem' }} />
                      </div>
                      <div className="form-group-custom">
                        <label className="form-label-custom text-xs" style={{ color: '#3b82f6' }}>Elevación Perdida (m)</label>
                        <input type="number" placeholder="ej: 140" value={elevationLoss} onChange={e => setElevationLoss(e.target.value)} className="form-input" style={{ padding: '0.4rem' }} />
                      </div>
                    </div>

                    {/* THREE-MODE SPLITS EDITOR */}
                    <div className="splits-container" style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1rem' }}>
                      <div className="flex-between-row mb-3" style={{ flexWrap: 'wrap', gap: '0.5rem' }}>
                        <label className="form-label-custom font-bold text-xs" style={{ margin: 0 }}>Registro de Pasadas / Splits</label>
                        
                        {/* Tab mode switcher */}
                        <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', padding: '2px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }}>
                          <button
                            type="button"
                            onClick={() => { setSplitsType('auto'); setSplits([]); }}
                            className="px-2 py-1 text-xs rounded-md transition-all font-semibold"
                            style={{
                              background: splitsType === 'auto' ? 'var(--color-running)' : 'transparent',
                              color: splitsType === 'auto' ? '#000' : 'var(--text-secondary)',
                              border: 'none',
                              cursor: 'pointer'
                            }}
                          >
                            Km por Km
                          </button>
                          <button
                            type="button"
                            onClick={() => { setSplitsType('manual'); setSplits([]); }}
                            className="px-2 py-1 text-xs rounded-md transition-all font-semibold"
                            style={{
                              background: splitsType === 'manual' ? 'var(--color-running)' : 'transparent',
                              color: splitsType === 'manual' ? '#000' : 'var(--text-secondary)',
                              border: 'none',
                              cursor: 'pointer'
                            }}
                          >
                            Series / Intervalos
                          </button>
                          <button
                            type="button"
                            onClick={() => { setSplitsType('structured'); setSplits([]); }}
                            className="px-2 py-1 text-xs rounded-md transition-all font-semibold"
                            style={{
                              background: splitsType === 'structured' ? 'var(--color-running)' : 'transparent',
                              color: splitsType === 'structured' ? '#000' : 'var(--text-secondary)',
                              border: 'none',
                              cursor: 'pointer'
                            }}
                          >
                            Estructurado
                          </button>
                        </div>
                      </div>

                      {splitsType === 'auto' && (
                        <div className="auto-splits-generator mb-3">
                          <p className="text-xs text-muted mb-2">Genera splits automáticos de 1km (1000m) basados en la distancia y duración ingresadas.</p>
                          <button
                            type="button"
                            onClick={generateAutoSplits}
                            className="btn btn-secondary w-full py-1.5 flex-center text-xs animate-pulse"
                            style={{ color: 'var(--color-running)', borderColor: 'rgba(16, 185, 129, 0.3)', gap: '6px' }}
                          >
                            🔄 Generar Splits Km-por-Km
                          </button>
                        </div>
                      )}

                      {splitsType === 'manual' && (
                        <div className="manual-intervals-generator mb-4 p-3 rounded-lg" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                          <div className="grid grid-cols-2 gap-3 mb-3" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                            <div className="form-group-custom">
                              <label className="form-label-custom text-xs">N° de Series (Repeticiones)</label>
                              <input
                                type="number"
                                min="1"
                                value={numSeries}
                                onChange={(e) => setNumSeries(parseInt(e.target.value) || 1)}
                                className="form-input"
                                style={{ padding: '0.4rem' }}
                              />
                            </div>
                            <div className="form-group-custom">
                              <label className="form-label-custom text-xs">Distancia por Serie</label>
                              <select
                                value={distanceSeries}
                                onChange={(e) => setDistanceSeries(e.target.value)}
                                className="form-select"
                                style={{ padding: '0.4rem' }}
                              >
                                <option value="200">200m (Sprint)</option>
                                <option value="400">400m (Pista de atletismo)</option>
                                <option value="800">800m (Medio Fondo)</option>
                                <option value="1000">1000m (1 Km)</option>
                                <option value="custom">Personalizado (m)</option>
                              </select>
                            </div>
                          </div>

                          {distanceSeries === 'custom' && (
                            <div className="form-group-custom mb-3">
                              <label className="form-label-custom text-xs">Distancia Personalizada (Metros)</label>
                              <input
                                type="number"
                                min="1"
                                value={customDistanceSeries}
                                onChange={(e) => setCustomDistanceSeries(parseInt(e.target.value) || 400)}
                                className="form-input"
                                style={{ padding: '0.4rem' }}
                              />
                            </div>
                          )}

                          <button
                            type="button"
                            onClick={generateIntervalSplits}
                            className="btn btn-secondary w-full py-1.5 flex-center text-xs"
                            style={{ color: 'var(--color-running)', borderColor: 'rgba(16, 185, 129, 0.3)', gap: '6px' }}
                          >
                            ⚡ Generar Series de Velocidad
                          </button>
                        </div>
                      )}

                      {splitsType === 'structured' && (
                        <div className="structured-workout-generator mb-4 p-4 rounded-xl animate-fade-in" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                          <p className="text-xs text-muted">Configura una estructura de velocidad completa. Al finalizar, haz clic en el botón de abajo para generar los tramos y completar los totales.</p>
                          
                          {/* 1. Warmup Group */}
                          <div className="structured-group p-3 rounded-lg" style={{ background: 'rgba(59, 130, 246, 0.03)', border: '1px solid rgba(59, 130, 246, 0.15)' }}>
                            <div className="flex-between-row mb-2" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <label className="text-xs font-bold flex-center" style={{ color: '#3b82f6', gap: '4px', margin: 0, cursor: 'pointer' }}>
                                <input 
                                  type="checkbox" 
                                  checked={hasWarmup} 
                                  onChange={(e) => setHasWarmup(e.target.checked)} 
                                  style={{ marginRight: '6px', cursor: 'pointer' }}
                                />
                                🔥 Entrada en Calor (Calentamiento)
                              </label>
                            </div>
                            
                            {hasWarmup && (
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                <div className="form-group-custom">
                                  <label className="text-xs text-secondary block mb-1">Medir por</label>
                                  <select 
                                    value={warmupType} 
                                    onChange={(e) => setWarmupType(e.target.value)} 
                                    className="form-select text-xs" 
                                    style={{ padding: '0.35rem' }}
                                  >
                                    <option value="distance">Distancia (km)</option>
                                    <option value="duration">Tiempo (min)</option>
                                  </select>
                                </div>
                                <div className="form-group-custom">
                                  <label className="text-xs text-secondary block mb-1">Valor</label>
                                  <input 
                                    type="text" 
                                    value={warmupValue} 
                                    onChange={(e) => setWarmupValue(e.target.value)} 
                                    className="form-input text-xs" 
                                    style={{ padding: '0.35rem' }}
                                    placeholder={warmupType === 'distance' ? 'ej: 2.0' : 'ej: 10'}
                                  />
                                </div>
                              </div>
                            )}
                          </div>

                          {/* 2. Intervals Group */}
                          <div className="structured-group p-3 rounded-lg" style={{ background: 'rgba(16, 185, 129, 0.03)', border: '1px solid rgba(16, 185, 129, 0.15)' }}>
                            <label className="text-xs font-bold block mb-2" style={{ color: 'var(--color-running)' }}>🏃 Series de Velocidad / Pasadas</label>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
                              <div className="form-group-custom">
                                <label className="text-xs text-secondary block mb-1">Repeticiones</label>
                                <input 
                                  type="number" 
                                  min="1" 
                                  value={numSeries} 
                                  onChange={(e) => setNumSeries(parseInt(e.target.value) || 1)} 
                                  className="form-input text-xs" 
                                  style={{ padding: '0.35rem' }}
                                />
                              </div>
                              <div className="form-group-custom">
                                <label className="text-xs text-secondary block mb-1">Medir por</label>
                                <select 
                                  value={intervalType} 
                                  onChange={(e) => setIntervalType(e.target.value)} 
                                  className="form-select text-xs" 
                                  style={{ padding: '0.35rem' }}
                                >
                                  <option value="distance">Distancia (metros)</option>
                                  <option value="duration">Tiempo (min)</option>
                                </select>
                              </div>
                              <div className="form-group-custom">
                                <label className="text-xs text-secondary block mb-1">Valor</label>
                                <input 
                                  type="text" 
                                  value={intervalValue} 
                                  onChange={(e) => setIntervalValue(e.target.value)} 
                                  className="form-input text-xs" 
                                  style={{ padding: '0.35rem' }}
                                  placeholder={intervalType === 'distance' ? 'ej: 400' : 'ej: 2'}
                                />
                              </div>
                            </div>
                          </div>

                          {/* 3. Rest Group */}
                          <div className="structured-group p-3 rounded-lg" style={{ background: 'rgba(234, 179, 8, 0.03)', border: '1px solid rgba(234, 179, 8, 0.15)' }}>
                            <label className="text-xs font-bold block mb-2" style={{ color: '#eab308', cursor: 'pointer' }}>
                              <input 
                                type="checkbox" 
                                checked={hasRest} 
                                onChange={(e) => setHasRest(e.target.checked)} 
                                style={{ marginRight: '6px', cursor: 'pointer' }}
                              />
                              ⏱️ Recuperación / Descanso (Entre Series)
                            </label>
                            
                            {hasRest && (
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                <div className="form-group-custom">
                                  <label className="text-xs text-secondary block mb-1">Medir por</label>
                                  <select 
                                    value={restType} 
                                    onChange={(e) => setRestType(e.target.value)} 
                                    className="form-select text-xs" 
                                    style={{ padding: '0.35rem' }}
                                  >
                                    <option value="duration">Tiempo (segundos)</option>
                                    <option value="distance">Distancia (metros)</option>
                                  </select>
                                </div>
                                <div className="form-group-custom">
                                  <label className="text-xs text-secondary block mb-1">Valor</label>
                                  <input 
                                    type="text" 
                                    value={restValue} 
                                    onChange={(e) => setRestValue(e.target.value)} 
                                    className="form-input text-xs" 
                                    style={{ padding: '0.35rem' }}
                                    placeholder={restType === 'duration' ? 'ej: 90' : 'ej: 200'}
                                  />
                                </div>
                              </div>
                            )}
                          </div>

                          {/* 4. Cooldown Group */}
                          <div className="structured-group p-3 rounded-lg" style={{ background: 'rgba(168, 85, 247, 0.03)', border: '1px solid rgba(168, 85, 247, 0.15)' }}>
                            <label className="text-xs font-bold block mb-2" style={{ color: '#a855f7', cursor: 'pointer' }}>
                              <input 
                                type="checkbox" 
                                checked={hasCooldown} 
                                onChange={(e) => setHasCooldown(e.target.checked)} 
                                style={{ marginRight: '6px', cursor: 'pointer' }}
                              />
                              ❄️ Vuelta a la Calma / Enfriamiento
                            </label>
                            
                            {hasCooldown && (
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                <div className="form-group-custom">
                                  <label className="text-xs text-secondary block mb-1">Medir por</label>
                                  <select 
                                    value={cooldownType} 
                                    onChange={(e) => setCooldownType(e.target.value)} 
                                    className="form-select text-xs" 
                                    style={{ padding: '0.35rem' }}
                                  >
                                    <option value="distance">Distancia (km)</option>
                                    <option value="duration">Tiempo (min)</option>
                                  </select>
                                </div>
                                <div className="form-group-custom">
                                  <label className="text-xs text-secondary block mb-1">Valor</label>
                                  <input 
                                    type="text" 
                                    value={cooldownValue} 
                                    onChange={(e) => setCooldownValue(e.target.value)} 
                                    className="form-input text-xs" 
                                    style={{ padding: '0.35rem' }}
                                    placeholder={cooldownType === 'distance' ? 'ej: 1.5' : 'ej: 8'}
                                  />
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Action Button */}
                          <button
                            type="button"
                            onClick={generateStructuredSplits}
                            className="btn btn-secondary w-full py-2 flex-center text-xs"
                            style={{ color: 'var(--color-running)', borderColor: 'rgba(16, 185, 129, 0.3)', gap: '6px', fontWeight: 'bold' }}
                          >
                            ⚡ Generar Estructura y Calcular Totales
                          </button>
                        </div>
                      )}

                      {/* RENDERING DYNAMIC INPUT SPLITS LIST */}
                      {splits.length > 0 && (
                        <div className="splits-fields-list mt-3" style={{ maxHeight: '280px', overflowY: 'auto', paddingRight: '4px' }}>
                          <label className="form-label-custom text-xs mb-2 block" style={{ color: 'var(--color-running)', fontWeight: 'bold' }}>Splits / Tramos (Tiempo y Ritmo manual)</label>
                          {splits.map((split, index) => {
                            let label = `#${split.splitNumber}`;
                            let borderStyle = 'rgba(255,255,255,0.05)';
                            if (split.type === 'warmup') {
                              label = `🔥 Entrada Calor`;
                              borderStyle = '#3b82f6';
                            } else if (split.type === 'interval') {
                              label = `🏃 Pasada #${split.repNumber || split.splitNumber}`;
                              borderStyle = 'var(--color-running)';
                            } else if (split.type === 'rest') {
                              label = `⏱️ Descanso`;
                              borderStyle = '#eab308';
                            } else if (split.type === 'cooldown') {
                              label = `❄️ Enfriamiento`;
                              borderStyle = '#a855f7';
                            }

                            return (
                              <div key={index} className="flex-between-row mb-2 animate-fade-in split-row-card" style={{ 
                                gap: '0.5rem', 
                                alignItems: 'center',
                                borderLeft: `3px solid ${borderStyle}`,
                                background: 'rgba(255, 255, 255, 0.02)',
                                padding: '6px 10px',
                                borderRadius: '6px',
                                borderTop: '1px solid rgba(255,255,255,0.03)',
                                borderBottom: '1px solid rgba(255,255,255,0.03)',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
                              }}>
                                <span className="text-secondary font-bold text-xs" style={{ width: '120px', flexShrink: 0, color: 'var(--color-text-primary)' }}>
                                  {label} <span style={{ opacity: 0.6, fontSize: '10px', display: 'block', fontWeight: 'normal' }}>({split.distance >= 1000 ? `${(split.distance / 1000).toFixed(2)}k` : `${split.distance}m`})</span>
                                </span>
                                
                                <div style={{ display: 'flex', gap: '0.5rem', flex: 1 }}>
                                  {/* Time Input */}
                                  <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                                    <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.4)', marginBottom: '2px' }}>Tiempo</span>
                                    <input 
                                      type="text" 
                                      placeholder="MM:SS" 
                                      value={getDisplayTime(split.time)}
                                      onChange={(e) => handleSplitTimeChange(index, e.target.value)}
                                      className="form-input text-xs text-center"
                                      style={{ padding: '0.35rem', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '4px', color: '#fff' }}
                                    />
                                  </div>
                                  
                                  {/* Pace Input */}
                                  <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                                    <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.4)', marginBottom: '2px' }}>Ritmo (/km)</span>
                                    <input 
                                      type="text" 
                                      placeholder="MM:SS" 
                                      value={getSplitPaceValue(split)}
                                      onChange={(e) => handleSplitPaceChange(index, e.target.value)}
                                      className="form-input text-xs text-center"
                                      style={{ padding: '0.35rem', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '4px', color: 'var(--color-running)' }}
                                    />
                                  </div>
                                </div>

                                <button 
                                  type="button" 
                                  onClick={() => handleRemoveSplit(index)} 
                                  className="btn" 
                                  style={{ padding: '0.4rem', color: '#ef4444', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '6px', alignSelf: 'flex-end', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                  title="Eliminar Split"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            );
                          })}
                          
                          {splitsType === 'auto' && (
                            <button type="button" onClick={handleAddSplit} className="btn btn-secondary w-full flex-center mt-2 text-xs" style={{ padding: '0.4rem' }}>
                              <Plus size={12} /> <span>Añadir Kilómetro</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                  </div>
                )}
              </div>

              {/* Dynamic GPX Route Visualizer / Dropzone */}
              <GpxVisualizer 
                gpxData={decompressGpxData(gpxData)} 
                onGpxLoaded={handleGpxLoaded} 
                theme="dark" 
              />

              {gpxData && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem', marginTop: '-8px' }}>
                  <button
                    type="button"
                    onClick={() => setGpxData(null)}
                    className="btn text-xs font-semibold cursor-pointer"
                    style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#ef4444', borderRadius: '8px', padding: '0.35rem 0.85rem' }}
                  >
                    🗑️ Quitar GPX
                  </button>
                </div>
              )}
              <div className="form-row-3">
                <div className="form-group">
                  <label className="form-label">Distancia (Kilómetros)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Ej: 5.50"
                    value={distance}
                    onChange={(e) => setDistance(e.target.value)}
                    required
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Duración (HH : MM : SS)</label>
                  <div className="time-inputs-group">
                    <input
                      type="number"
                      min="0"
                      max="23"
                      placeholder="HH"
                      value={durationHH}
                      onChange={(e) => setDurationHH(e.target.value)}
                      className="form-input time-subinput"
                    />
                    <span className="time-separator">:</span>
                    <input
                      type="number"
                      min="0"
                      max="59"
                      placeholder="MM"
                      value={durationMM}
                      onChange={(e) => setDurationMM(e.target.value)}
                      className="form-input time-subinput"
                    />
                    <span className="time-separator">:</span>
                    <input
                      type="number"
                      min="0"
                      max="59"
                      placeholder="SS"
                      value={durationSS}
                      onChange={(e) => setDurationSS(e.target.value)}
                      className="form-input time-subinput"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Ritmo Estimado</label>
                  <div className="calculated-pace-box">
                    {(() => {
                      const distVal = parseFloat(distance);
                      if (!distVal || distVal <= 0) return "--:-- min/km";
                      const h = parseInt(durationHH) || 0;
                      const m = parseInt(durationMM) || 0;
                      const s = parseInt(durationSS) || 0;
                      const totalSecs = h * 3600 + m * 60 + s;
                      if (totalSecs <= 0) return "--:-- min/km";
                      
                      const paceSecs = totalSecs / distVal;
                      const paceMins = Math.floor(paceSecs / 60);
                      const paceS = Math.round(paceSecs % 60);
                      return `${paceMins}:${String(paceS).padStart(2, '0')} min/km`;
                    })()}
                  </div>
                </div>
              </div>

              <div className="form-row-2">
                <div className="form-group">
                  <label className="form-label">Pulsaciones Medias (bpm) - Opcional</label>
                  <input
                    type="number"
                    placeholder="Ej: 155"
                    value={heartRate}
                    onChange={(e) => setHeartRate(e.target.value)}
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Nivel de Esfuerzo (RPE 1-10)</label>
                  <select
                    value={rpeRunning}
                    onChange={(e) => setRpeRunning(e.target.value)}
                    className="form-select"
                  >
                    <option value="1">1 - Trivial / Muy Suave</option>
                    <option value="2">2 - Extremadamente Suave</option>
                    <option value="3">3 - Suave</option>
                    <option value="4">4 - Cómodo / Regenerativo</option>
                    <option value="5">5 - Moderado</option>
                    <option value="6">6 - Algo Duro</option>
                    <option value="7">7 - Exigente (Ritmo Carrera)</option>
                    <option value="8">8 - Muy Duro</option>
                    <option value="9">9 - Extenuante / Umbral Máx</option>
                    <option value="10">10 - Esfuerzo Máximo absoluto</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* GYM FIELDS */}
          {workoutType === 'gym' && (
            <div className="gym-form-section">
              <style dangerouslySetInnerHTML={{__html: `
                .custom-dropdown-item:hover {
                  background: rgba(236, 72, 153, 0.08) !important;
                  transform: translateX(4px);
                }
                .custom-exercise-dropdown::-webkit-scrollbar {
                  width: 6px;
                }
                .custom-exercise-dropdown::-webkit-scrollbar-track {
                  background: transparent;
                }
                .custom-exercise-dropdown::-webkit-scrollbar-thumb {
                  background: rgba(236, 72, 153, 0.35);
                  border-radius: 10px;
                }
                .custom-exercise-dropdown::-webkit-scrollbar-thumb:hover {
                  background: rgba(236, 72, 153, 0.6);
                }
              `}} />
              <div className="form-group mb-4">
                <label className="form-label">Nombre de la Sesión</label>
                <input
                  type="text"
                  placeholder="Ej: Torso A (Enfoque Fuerza) o Día de Pierna"
                  value={sessionName}
                  onChange={(e) => setSessionName(e.target.value)}
                  required
                  className="form-input"
                />
              </div>

              {/* Render Beautiful Cyberpunk Interactive Muscle Anatomy Selector */}
              {renderMuscleAnatomyMap()}

              {/* Dynamic Exercise Cards Builder */}
              <div className="exercises-builder-container mb-4">
                <div className="builder-header" style={{ marginBottom: '1.25rem' }}>
                  <h4 className="builder-title text-secondary" style={{ fontSize: '1rem', fontWeight: '700' }}>Ejercicios Realizados</h4>
                  <button
                    type="button"
                    onClick={addExerciseRow}
                    className="btn btn-secondary py-1 px-3 flex-center text-xs"
                    style={{ background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.08)' }}
                  >
                    <Plus size={14} style={{ marginRight: '4px' }} /> Agregar Ejercicio
                  </button>
                </div>

                <div className="exercises-cards-list">
                  {exercises.map((ex, exIdx) => (
                    <div key={exIdx} className="exercise-card">
                      <div className="exercise-card-header">
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, position: 'relative' }}>
                          <label className="form-label text-xs" style={{ color: 'var(--text-secondary)' }}>Ejercicio #{exIdx + 1}</label>
                          <input
                            type="text"
                            placeholder="Ej: Press de Banca"
                            value={ex.name}
                            onChange={(e) => updateExerciseField(exIdx, 'name', e.target.value)}
                            onFocus={() => setActiveDropdownIndex(exIdx)}
                            onBlur={() => setTimeout(() => setActiveDropdownIndex(-1), 200)}
                            required
                            className="form-input"
                            style={{ width: '100%', fontWeight: '600' }}
                            autoComplete="off"
                          />

                          {activeDropdownIndex === exIdx && (
                            <div 
                              className="custom-exercise-dropdown"
                              style={{
                                position: 'absolute',
                                top: '100%',
                                left: 0,
                                right: 0,
                                zIndex: 1000,
                                maxHeight: '240px',
                                overflowY: 'auto',
                                background: 'rgba(18, 18, 24, 0.98)',
                                backdropFilter: 'blur(16px)',
                                WebkitBackdropFilter: 'blur(16px)',
                                border: '1px solid rgba(236, 72, 153, 0.25)',
                                borderRadius: '10px',
                                marginTop: '4px',
                                boxShadow: '0 12px 30px -10px rgba(0, 0, 0, 0.8), 0 0 20px rgba(236, 72, 153, 0.12)',
                                padding: '6px'
                              }}
                            >
                              {(() => {
                                const filtered = getFilteredExercises(ex.name);
                                if (filtered.length === 0) {
                                  return (
                                    <div style={{ padding: '12px 10px', fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                                      No se encontraron ejercicios
                                    </div>
                                  );
                                }
                                return filtered.map(item => (
                                  <div
                                    key={item.name}
                                    onMouseDown={() => {
                                      updateExerciseField(exIdx, 'name', item.name);
                                      setActiveDropdownIndex(-1);
                                    }}
                                    style={{
                                      display: 'flex',
                                      justifyContent: 'space-between',
                                      alignItems: 'center',
                                      padding: '8px 10px',
                                      borderRadius: '6px',
                                      cursor: 'pointer',
                                      transition: 'background 0.2s ease, transform 0.1s ease',
                                      gap: '12px'
                                    }}
                                    className="custom-dropdown-item"
                                  >
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1 }}>
                                      <span style={{ color: 'var(--text-primary)', fontSize: '0.85rem', fontWeight: '600' }}>
                                        {item.name}
                                      </span>
                                      {item.secondary && item.secondary.length > 0 && (
                                        <span style={{ color: 'rgba(255, 255, 255, 0.45)', fontSize: '0.7rem' }}>
                                          + Involucra: {item.secondary.join(', ')}
                                        </span>
                                      )}
                                    </div>
                                    <span style={{
                                      fontSize: '0.65rem',
                                      fontWeight: '700',
                                      textTransform: 'uppercase',
                                      letterSpacing: '0.5px',
                                      background: 'rgba(236, 72, 153, 0.15)',
                                      color: 'var(--color-gym)',
                                      padding: '3px 8px',
                                      borderRadius: '4px',
                                      border: '1px solid rgba(236, 72, 153, 0.25)',
                                      whiteSpace: 'nowrap'
                                    }}>
                                      {item.primary}
                                    </span>
                                  </div>
                                ));
                              })()}
                            </div>
                          )}
                        </div>
                        
                        <button
                          type="button"
                          onClick={() => removeExerciseRow(exIdx)}
                          className="btn-set-action delete"
                          title="Eliminar este ejercicio"
                          style={{ marginTop: '1.5rem', width: '32px', height: '32px', borderRadius: '8px' }}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>

                      {/* Sets Table */}
                      <div className="sets-table-container">
                        <table className="sets-table">
                          <thead>
                            <tr>
                              <th className="set-number-col">#</th>
                              <th style={{ width: '100px' }}>Tipo</th>
                              <th>Peso (kg)</th>
                              <th>Reps</th>
                              <th>RPE / RIR</th>
                              <th>Descanso</th>
                              <th style={{ width: '50px', textAlign: 'center' }}>Listo</th>
                              <th style={{ width: '40px' }}></th>
                            </tr>
                          </thead>
                          <tbody>
                            {(ex.sets || []).map((set, setIdx) => (
                              <tr key={setIdx}>
                                <td className="set-number-col">{setIdx + 1}</td>
                                <td>
                                  <button
                                    type="button"
                                    className={`set-badge-btn ${set.type === 'warmup' ? 'warmup' : 'working'}`}
                                    onClick={() => updateSetField(exIdx, setIdx, 'type', set.type === 'warmup' ? 'working' : 'warmup')}
                                    title="Haz clic para alternar tipo de serie"
                                  >
                                    {set.type === 'warmup' ? 'Warmup' : 'Working'}
                                  </button>
                                </td>
                                <td>
                                  <input
                                    type="number"
                                    min="0"
                                    step="0.5"
                                    value={set.weight}
                                    onChange={(e) => updateSetField(exIdx, setIdx, 'weight', e.target.value)}
                                    required
                                    className="set-input-compact"
                                  />
                                </td>
                                <td>
                                  <input
                                    type="number"
                                    min="1"
                                    value={set.reps}
                                    onChange={(e) => updateSetField(exIdx, setIdx, 'reps', e.target.value)}
                                    required
                                    className="set-input-compact"
                                  />
                                </td>
                                <td>
                                  <select
                                    value={set.rpe}
                                    onChange={(e) => updateSetField(exIdx, setIdx, 'rpe', e.target.value)}
                                    className="set-select-compact"
                                  >
                                    <option value="10">10 (RIR 0)</option>
                                    <option value="9">9 (RIR 1)</option>
                                    <option value="8">8 (RIR 2)</option>
                                    <option value="7">7 (RIR 3)</option>
                                    <option value="6">6 (RIR 4)</option>
                                  </select>
                                </td>
                                <td>
                                  <div className="set-rest-wrapper">
                                    <input
                                      type="number"
                                      min="0"
                                      step="5"
                                      value={set.rest}
                                      onChange={(e) => updateSetField(exIdx, setIdx, 'rest', e.target.value)}
                                      required
                                      className="set-input-compact"
                                      style={{ maxWidth: '55px' }}
                                    />
                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>s</span>
                                    <button
                                      type="button"
                                      onClick={() => handleStartRestTimer(parseInt(set.rest) || 90)}
                                      className="btn-set-action"
                                      title="Iniciar cronómetro de descanso"
                                      style={{ color: 'var(--color-gym)' }}
                                    >
                                      <Timer size={14} />
                                    </button>
                                  </div>
                                </td>
                                <td style={{ textAlign: 'center' }}>
                                  <button
                                    type="button"
                                    className={`set-checkbox ${set.done ? 'checked' : ''}`}
                                    onClick={() => {
                                      const nextDone = !set.done;
                                      updateSetField(exIdx, setIdx, 'done', nextDone);
                                      if (nextDone) {
                                        handleStartRestTimer(parseInt(set.rest) || 90);
                                      }
                                    }}
                                  >
                                    {set.done && <span style={{ fontSize: '0.65rem', fontWeight: 'bold' }}>✓</span>}
                                  </button>
                                </td>
                                <td>
                                  <button
                                    type="button"
                                    onClick={() => removeSetFromExercise(exIdx, setIdx)}
                                    className="btn-set-action delete"
                                    title="Quitar serie"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Add Set Button */}
                      <button
                        type="button"
                        onClick={() => addSetToExercise(exIdx)}
                        className="btn btn-secondary py-1 px-3 text-xs flex-center"
                        style={{ background: 'rgba(236, 72, 153, 0.05)', borderColor: 'rgba(236, 72, 153, 0.1)', color: 'var(--color-gym)', marginTop: '0.5rem' }}
                      >
                        <Plus size={12} style={{ marginRight: '4px' }} /> Agregar Serie
                      </button>
                    </div>
                  ))}
                </div>

                <div className="builder-summary-line" style={{ marginTop: '1.25rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Volumen de series realizadas: <strong>{getLiveSessionVolume().toLocaleString('es-ES')} kg</strong></span>
                </div>
              </div>
            </div>
          )}

          {/* ========================================== */}
          {/* TEMPO ASSISTANT & INMERSIVE STOPWATCH PANEL */}
          {/* ========================================== */}
          <div className="tempo-assistant-panel">
            <div 
              className="tempo-assistant-header"
              onClick={() => {
                setShowTempoPanel(!showTempoPanel);
                getAudioContext(); // Unlock audio context on user click
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Timer size={18} className={workoutType === 'running' ? 'running-text tempo-active-icon' : 'gym-text tempo-active-icon'} />
                <span className="font-bold text-sm tracking-wider uppercase tempo-title-glow" style={{ color: 'var(--text-primary)' }}>
                  ⏱️ Asistente de Tempo y Cronómetro
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {isMetronomePlaying && (
                  <span className="pulse-text text-xs" style={{ color: workoutType === 'running' ? 'var(--color-running)' : 'var(--color-gym)', fontWeight: 600 }}>
                    ● ACTIVO
                  </span>
                )}
                {showTempoPanel ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </div>
            </div>

            {showTempoPanel && (
              <div className="tempo-assistant-content fade-in">
                {/* Column 1: Config */}
                <div className="tempo-config-column" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  
                  {/* Global Sound & Volume */}
                  <div className="control-card-sub" style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '0.85rem', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.04)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                      <span className="text-xs font-semibold text-secondary uppercase">Guía Sonora</span>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          type="button"
                          onClick={() => setSoundMode('synth')}
                          className={`preset-badge-btn ${soundMode === 'synth' ? (workoutType === 'running' ? 'active-running' : 'active-gym') : ''}`}
                        >
                          🔊 Beeps
                        </button>
                        {workoutType === 'gym' && (
                          <button
                            type="button"
                            onClick={() => setSoundMode('voice')}
                            className={`preset-badge-btn ${soundMode === 'voice' ? 'active-gym' : ''}`}
                          >
                            🤖 Entrenador IA
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setSoundMode('silent')}
                          className={`preset-badge-btn ${soundMode === 'silent' ? (workoutType === 'running' ? 'active-running' : 'active-gym') : ''}`}
                        >
                          🔇 Mudo
                        </button>
                      </div>
                    </div>
                    
                    {soundMode !== 'silent' && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        {volume === 0 ? <VolumeX size={16} className="text-muted" /> : <Volume2 size={16} className="text-secondary" />}
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={volume}
                          onChange={(e) => setVolume(Number(e.target.value))}
                          style={{ flex: 1, accentColor: workoutType === 'running' ? 'var(--color-running)' : 'var(--color-gym)' }}
                        />
                        <span className="text-xs text-muted" style={{ minWidth: '24px', textAlign: 'right' }}>{volume}%</span>
                      </div>
                    )}
                  </div>

                  {/* RUNNING INTERFACE (Cadence SPM Guide) */}
                  {workoutType === 'running' ? (
                    <div className="running-cadence-section" style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                      <div className="form-group mb-0">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <label className="form-label text-xs">Cadencia de Pasos (SPM - Steps Per Minute)</label>
                          <span className="text-sm font-bold running-text" style={{ textShadow: '0 0 8px rgba(16, 185, 129, 0.4)' }}>
                            {cadenceSpm} SPM
                          </span>
                        </div>
                        <input
                          type="range"
                          min="120"
                          max="220"
                          step="1"
                          value={cadenceSpm}
                          onChange={(e) => setCadenceSpm(Number(e.target.value))}
                          style={{ width: '100%', accentColor: 'var(--color-running)', marginTop: '0.5rem' }}
                        />
                      </div>

                      <div>
                        <span className="text-xs text-muted" style={{ display: 'block', marginBottom: '0.35rem' }}>Presets de Cadencia:</span>
                        <div className="preset-badges-grid">
                          {[140, 150, 160, 170, 180, 190, 200, 210].map(spm => (
                            <button
                              key={spm}
                              type="button"
                              onClick={() => setCadenceSpm(spm)}
                              className={`preset-badge-btn ${cadenceSpm === spm ? 'active-running' : ''}`}
                            >
                              {spm} SPM
                            </button>
                          ))}
                        </div>
                      </div>

                      <div style={{ marginTop: '0.5rem' }}>
                        <button
                          type="button"
                          onClick={() => {
                            getAudioContext();
                            setIsMetronomePlaying(!isMetronomePlaying);
                          }}
                          className={`btn w-full flex-center py-2.5 font-bold ${isMetronomePlaying ? 'btn-secondary' : 'btn-primary'}`}
                          style={{
                            borderColor: isMetronomePlaying ? '#ef4444' : 'var(--color-running)',
                            color: isMetronomePlaying ? '#ef4444' : '#ffffff',
                            background: isMetronomePlaying ? 'rgba(239, 68, 68, 0.08)' : 'var(--color-running-gradient)',
                            gap: '8px',
                            borderRadius: '10px'
                          }}
                        >
                          {isMetronomePlaying ? <Square size={16} /> : <Play size={16} />}
                          <span>{isMetronomePlaying ? "Detener Cadenciador" : "Iniciar Guía de Cadencia"}</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* GYM INTERFACE (Tempo TUT Guide) */
                    <div className="gym-tempo-section" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      
                      <div className="tempo-inputs-group-tut" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                        
                        <div style={{ textAlign: 'center' }}>
                          <label className="form-label text-xs" style={{ display: 'block', marginBottom: '4px', color: '#f43f5e' }}>Excéntrica</label>
                          <input
                            type="number"
                            min="1"
                            max="10"
                            value={tempoEccentric}
                            onChange={(e) => setTempoEccentric(Math.max(1, Number(e.target.value)))}
                            className="form-input text-center"
                            style={{ padding: '0.5rem 0.25rem', borderColor: 'rgba(244, 63, 94, 0.3)' }}
                          />
                          <span className="text-muted" style={{ fontSize: '0.65rem', display: 'block', marginTop: '2px' }}>Bajar (s)</span>
                        </div>

                        <div style={{ textAlign: 'center' }}>
                          <label className="form-label text-xs" style={{ display: 'block', marginBottom: '4px', color: '#3b82f6' }}>Pausa Abajo</label>
                          <input
                            type="number"
                            min="0"
                            max="10"
                            value={tempoIsometricBottom}
                            onChange={(e) => setTempoIsometricBottom(Math.max(0, Number(e.target.value)))}
                            className="form-input text-center"
                            style={{ padding: '0.5rem 0.25rem', borderColor: 'rgba(59, 130, 246, 0.3)' }}
                          />
                          <span className="text-muted" style={{ fontSize: '0.65rem', display: 'block', marginTop: '2px' }}>Pausa (s)</span>
                        </div>

                        <div style={{ textAlign: 'center' }}>
                          <label className="form-label text-xs" style={{ display: 'block', marginBottom: '4px', color: '#a855f7' }}>Concéntrica</label>
                          <input
                            type="number"
                            min="1"
                            max="10"
                            value={tempoConcentric}
                            onChange={(e) => setTempoConcentric(Math.max(1, Number(e.target.value)))}
                            className="form-input text-center"
                            style={{ padding: '0.5rem 0.25rem', borderColor: 'rgba(168, 85, 247, 0.3)' }}
                          />
                          <span className="text-muted" style={{ fontSize: '0.65rem', display: 'block', marginTop: '2px' }}>Subir (s)</span>
                        </div>

                        <div style={{ textAlign: 'center' }}>
                          <label className="form-label text-xs" style={{ display: 'block', marginBottom: '4px', color: '#eab308' }}>Pausa Arriba</label>
                          <input
                            type="number"
                            min="0"
                            max="10"
                            value={tempoIsometricTop}
                            onChange={(e) => setTempoIsometricTop(Math.max(0, Number(e.target.value)))}
                            className="form-input text-center"
                            style={{ padding: '0.5rem 0.25rem', borderColor: 'rgba(234, 179, 8, 0.3)' }}
                          />
                          <span className="text-muted" style={{ fontSize: '0.65rem', display: 'block', marginTop: '2px' }}>Contracción</span>
                        </div>

                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.15)', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px dashed rgba(255,255,255,0.03)' }}>
                        <span className="text-xs text-secondary font-semibold">Tempo de Ejecución:</span>
                        <span className="font-extrabold text-sm gym-text" style={{ letterSpacing: '0.1em' }}>
                          {tempoEccentric} - {tempoIsometricBottom} - {tempoConcentric} - {tempoIsometricTop}
                        </span>
                      </div>

                      <div>
                        <span className="text-xs text-muted" style={{ display: 'block', marginBottom: '0.35rem' }}>Ajuste Rápido de Ritmo:</span>
                        <div className="preset-badges-grid">
                          {[[3,0,1,0], [4,1,2,0], [2,0,1,0], [3,2,1,1]].map(([ecc, isoB, conc, isoT], idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => {
                                setTempoEccentric(ecc);
                                setTempoIsometricBottom(isoB);
                                setTempoConcentric(conc);
                                setTempoIsometricTop(isoT);
                              }}
                              className={`preset-badge-btn ${tempoEccentric === ecc && tempoIsometricBottom === isoB && tempoConcentric === conc && tempoIsometricTop === isoT ? 'active-gym' : ''}`}
                            >
                              {ecc}-{isoB}-{conc}-{isoT}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '8px', marginTop: '0.35rem' }}>
                        <button
                          type="button"
                          onClick={() => {
                            getAudioContext();
                            setIsMetronomePlaying(!isMetronomePlaying);
                          }}
                          className={`btn flex-center py-2.5 font-bold ${isMetronomePlaying ? 'btn-secondary' : 'btn-primary'}`}
                          style={{
                            flex: 2,
                            borderColor: isMetronomePlaying ? '#ef4444' : 'var(--color-gym)',
                            color: isMetronomePlaying ? '#ef4444' : '#ffffff',
                            background: isMetronomePlaying ? 'rgba(239, 68, 68, 0.08)' : 'var(--color-gym-gradient)',
                            gap: '8px',
                            borderRadius: '10px'
                          }}
                        >
                          {isMetronomePlaying ? <Square size={16} /> : <Play size={16} />}
                          <span>{isMetronomePlaying ? "Parar Metrónomo" : "Iniciar Tempo TUT"}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            repsRef.current = 0;
                            setCompletedReps(0);
                          }}
                          className="btn btn-secondary py-2.5 flex-center"
                          title="Reiniciar Repeticiones"
                          style={{ flex: 1, gap: '6px', color: 'var(--text-secondary)', borderRadius: '10px' }}
                        >
                          <RotateCcw size={14} />
                          <span className="text-xs">Reset</span>
                        </button>
                      </div>

                    </div>
                  )}

                </div>

                {/* Column 2: Status & Visualizer & Timers */}
                <div className="tempo-status-column" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', justifyContent: 'space-between' }}>
                  
                  {/* Dynamic Visual Ring */}
                  <div className="beat-indicator-container">
                    <div className={`beat-ring ${spmBeatActive ? 'active-running' : ''} ${isMetronomePlaying && workoutType === 'gym' && currentTempoPhase !== 'ready' ? 'active-gym' : ''}`}>
                      <div style={{ textAlign: 'center' }}>
                        {workoutType === 'running' ? (
                          <>
                            <Sparkles size={20} className={isMetronomePlaying ? "running-text animate-pulse" : "text-muted"} />
                            <div className="text-[10px] uppercase font-bold text-muted mt-1" style={{ fontSize: '0.65rem' }}>BEAT</div>
                          </>
                        ) : (
                          <>
                            <span className="text-2xl font-black" style={{ color: 'var(--text-primary)' }}>
                              {tempoCount > 0 ? tempoCount : "—"}
                            </span>
                            <div className="text-[9px] uppercase font-bold text-muted" style={{ fontSize: '0.6rem' }}>Segs</div>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Workout Phase for Strength */}
                    {workoutType === 'gym' && (
                      <div style={{ textAlign: 'center', marginTop: '0.85rem' }}>
                        <div className="text-[10px] text-muted uppercase font-bold tracking-wider" style={{ fontSize: '0.65rem' }}>Fase en Curso</div>
                        <div className={`phase-text phase-text-${currentTempoPhase}`}>
                          {currentTempoPhase === 'eccentric' && "Eccéntrica (Bajar)"}
                          {currentTempoPhase === 'isometricBottom' && "Pausa Abajo (Estirar)"}
                          {currentTempoPhase === 'concentric' && "Concéntrica (Subir)"}
                          {currentTempoPhase === 'isometricTop' && "Pausa Arriba (Apretar)"}
                          {currentTempoPhase === 'ready' && "Listo para Iniciar"}
                        </div>
                        <div className="text-xs font-semibold text-secondary mt-1.5" style={{ background: 'rgba(255,255,255,0.03)', padding: '0.25rem 0.75rem', borderRadius: '12px', display: 'inline-block' }}>
                          Reps Realizadas: <strong className="gym-text" style={{ fontSize: '0.9rem' }}>{completedReps}</strong>
                        </div>
                      </div>
                    )}

                    {workoutType === 'running' && (
                      <div style={{ textAlign: 'center', marginTop: '0.85rem' }}>
                        <div className="text-[10px] text-muted uppercase font-bold tracking-wider" style={{ fontSize: '0.65rem' }}>Paso de Carrera</div>
                        <div className="text-xs font-bold running-text mt-1">
                          {isMetronomePlaying ? "¡Sigue el pulso en cada zancada!" : "Asistente inactivo"}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* STRENGTH ONLY: Sets Stopwatch & Rest Countdown */}
                  {workoutType === 'gym' && (
                    <div className="timers-inner-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '10px' }}>
                      
                      {/* Series Stopwatch */}
                      <div className="control-card-sub" style={{ background: 'rgba(0,0,0,0.15)', padding: '0.75rem', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.03)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Clock size={12} className="gym-text" />
                          <span className="text-[10px] font-bold text-secondary uppercase" style={{ fontSize: '0.65rem' }}>Duración Serie</span>
                        </div>
                        <div className="font-mono text-center font-bold text-sm my-1.5" style={{ color: 'var(--text-primary)', textShadow: '0 0 6px rgba(255,255,255,0.1)' }}>
                          {formatStopwatchTime(stopwatchTime)}
                        </div>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <button
                            type="button"
                            onClick={() => setIsStopwatchRunning(!isStopwatchRunning)}
                            className="preset-badge-btn"
                            style={{ flex: 1, padding: '0.2rem 0', fontSize: '0.65rem' }}
                          >
                            {isStopwatchRunning ? "Pausa" : "Play"}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setIsStopwatchRunning(false);
                              setStopwatchTime(0);
                            }}
                            className="preset-badge-btn"
                            style={{ padding: '0.2rem 0.35rem', fontSize: '0.65rem' }}
                          >
                            <RotateCcw size={10} />
                          </button>
                        </div>
                      </div>

                      {/* Interactive Rest Countdown Timer */}
                      <div className="control-card-sub" style={{ background: 'rgba(0,0,0,0.15)', padding: '0.75rem', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.03)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span className="text-[10px] font-bold text-secondary uppercase" style={{ fontSize: '0.65rem' }}>Rest Timer</span>
                          {isRestTimerRunning && (
                            <span className="text-[9px] font-bold animate-pulse text-running" style={{ fontSize: '0.6rem' }}>T-MINUS</span>
                          )}
                        </div>
                        
                        <div className="font-mono text-center font-bold text-base my-1" style={{ color: isRestTimerRunning && restTimeLeft <= 10 ? '#ef4444' : 'var(--color-running)', textShadow: isRestTimerRunning && restTimeLeft <= 10 ? '0 0 8px rgba(239, 68, 68, 0.4)' : '0 0 6px rgba(16, 185, 129, 0.2)' }}>
                          {formatRestTime(restTimeLeft)}
                        </div>

                        {/* Presets Grid for Rest */}
                        {!isRestTimerRunning ? (
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '3px' }}>
                            {[45, 60, 90].map(secs => (
                              <button
                                key={secs}
                                type="button"
                                onClick={() => handleStartRestTimer(secs)}
                                className="preset-badge-btn text-center"
                                style={{ padding: '2px 0', fontSize: '0.6rem' }}
                              >
                                {secs}s
                              </button>
                            ))}
                            {[120, 180, 240].map(secs => (
                              <button
                                key={secs}
                                type="button"
                                onClick={() => handleStartRestTimer(secs)}
                                className="preset-badge-btn text-center"
                                style={{ padding: '2px 0', fontSize: '0.6rem' }}
                              >
                                {secs/60}m
                              </button>
                            ))}
                          </div>
                        ) : (
                          <div style={{ display: 'flex', gap: '4px' }}>
                            <button
                              type="button"
                              onClick={() => setIsRestTimerRunning(false)}
                              className="preset-badge-btn w-full"
                              style={{ padding: '0.2rem 0', fontSize: '0.65rem', color: '#f43f5e', borderColor: 'rgba(244,63,94,0.2)' }}
                            >
                              Parar
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setRestTimeLeft(restDuration);
                                setIsRestTimerRunning(true);
                              }}
                              className="preset-badge-btn"
                              style={{ padding: '0.2rem 0.35rem', fontSize: '0.65rem' }}
                              title="Reset Descanso"
                            >
                              <RotateCcw size={10} />
                            </button>
                          </div>
                        )}
                      </div>

                    </div>
                  )}

                </div>

              </div>
            )}
          </div>

          {/* Common Notes field */}
          <div className="form-group">
            <label className="form-label">Notas / Observaciones del día</label>
            <textarea
              placeholder="Escribe cómo te sentiste, el clima, sensaciones o metas para la próxima sesión..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows="3"
              className="form-textarea"
            />
          </div>

          {/* Footer Controls */}
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary flex-center">
              <Save size={18} />
              <span>{isEditMode ? 'Guardar Cambios' : 'Guardar Sesión'}</span>
            </button>
          </div>

        </form>
      </div>

      <style>{`
        .form-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(4, 5, 8, 0.85);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 2rem 1rem;
          overflow-y: auto;
        }

        .form-modal-card {
          width: 100%;
          max-width: 820px;
          margin: auto;
          background: var(--bg-surface-solid);
          border: 1px solid rgba(255, 255, 255, 0.1);
          padding: 2rem;
          border-radius: 20px;
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.8);
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
          border-bottom: 1px solid var(--border-light);
          padding-bottom: 1rem;
        }

        .text-2xl {
          font-size: 1.4rem;
        }

        .btn-close-modal {
          background: transparent;
          border: none;
          color: var(--text-secondary);
          cursor: pointer;
          transition: color var(--transition-fast);
        }

        .btn-close-modal:hover {
          color: #ef4444;
        }

        /* Tab switch buttons */
        .tab-switcher {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0.75rem;
          background-color: rgba(0, 0, 0, 0.2);
          padding: 0.35rem;
          border-radius: 12px;
          border: 1px solid var(--border-light);
        }

        .tab-btn {
          padding: 0.75rem;
          border: none;
          background: transparent;
          font-family: var(--font-sans);
          font-weight: 600;
          font-size: 0.9rem;
          color: var(--text-secondary);
          border-radius: 8px;
          cursor: pointer;
          transition: all var(--transition-fast);
        }

        .tab-btn:hover {
          color: var(--text-primary);
          background: rgba(255, 255, 255, 0.02);
        }

        .tab-btn.active-run {
          background: var(--color-running-gradient);
          color: #ffffff;
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
        }

        .tab-btn.active-gym {
          background: var(--color-gym-gradient);
          color: #ffffff;
          box-shadow: 0 4px 12px rgba(236, 72, 153, 0.3);
        }

        .modal-form-content {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }

        .form-row-2 {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1.25rem;
        }

        .form-row-3 {
          display: grid;
          grid-template-columns: 1fr 1.2fr 1fr;
          gap: 1.25rem;
        }

        @media (max-width: 768px) {
          .form-row-2, .form-row-3 {
            grid-template-columns: 1fr;
          }
        }

        /* Time picker inputs group */
        .time-inputs-group {
          display: flex;
          align-items: center;
          gap: 0.4rem;
        }

        .time-subinput {
          text-align: center;
          padding: 0.75rem 0.5rem;
        }

        .time-separator {
          font-weight: bold;
          color: var(--text-muted);
        }

        .calculated-pace-box {
          height: 44px;
          display: flex;
          align-items: center;
          padding: 0 1rem;
          background: rgba(16, 185, 129, 0.05);
          border: 1px dashed rgba(16, 185, 129, 0.25);
          color: var(--color-running);
          font-weight: 700;
          font-size: 1rem;
          border-radius: 10px;
        }

        /* Dynamic Exercises builder style */
        .exercises-builder-container {
          border: 1px solid var(--border-light);
          border-radius: 12px;
          padding: 1.25rem;
          background: rgba(0, 0, 0, 0.1);
        }

        .builder-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
          border-bottom: 1px dashed var(--border-light);
          padding-bottom: 0.75rem;
        }

        .builder-title {
          font-size: 0.85rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .exercises-rows-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          margin-bottom: 1rem;
          max-height: 250px;
          overflow-y: auto;
          padding-right: 0.5rem;
        }

        .exercise-builder-row {
          display: flex;
          gap: 0.85rem;
          align-items: flex-end;
        }

        @media (max-width: 600px) {
          .exercise-builder-row {
            flex-direction: column;
            align-items: stretch;
            padding: 1rem;
            background: rgba(255, 255, 255, 0.02);
            border-radius: 8px;
            border: 1px solid var(--border-light);
          }
        }

        .col-name { flex: 2; }
        .col-sets, .col-reps, .col-weight { flex: 0.8; }
        .col-rpe { flex: 0.8; }

        .btn-remove-row {
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.2);
          color: #ef4444;
          width: 44px;
          height: 44px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all var(--transition-fast);
          flex-shrink: 0;
        }

        .btn-remove-row:hover {
          background: rgba(239, 68, 68, 0.2);
          border-color: rgba(239, 68, 68, 0.4);
        }

        .builder-summary-line {
          text-align: right;
          font-size: 0.85rem;
          color: var(--text-secondary);
        }

        .builder-summary-line strong {
          color: var(--color-gym);
        }

        .modal-footer {
          display: flex;
          justify-content: flex-end;
          gap: 1rem;
          border-top: 1px solid var(--border-light);
          padding-top: 1.25rem;
          margin-top: 0.5rem;
        }

        .mb-5 { margin-bottom: 1.25rem; }
        .mb-4 { margin-bottom: 1rem; }

        /* ========================================== */
        /* METRONOME & CYBER TEMPO ASSISTANT STYLES   */
        /* ========================================== */
        .tempo-assistant-panel {
          background: rgba(255, 255, 255, 0.02);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 16px;
          overflow: hidden;
          margin-bottom: 1.5rem;
          box-shadow: inset 0 1px 1px rgba(255, 255, 255, 0.05), 0 10px 30px rgba(0, 0, 0, 0.4);
          transition: all var(--transition-normal);
        }

        .tempo-assistant-panel:hover {
          border-color: rgba(255, 255, 255, 0.1);
        }

        .tempo-assistant-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem 1.25rem;
          background: rgba(255, 255, 255, 0.01);
          cursor: pointer;
          user-select: none;
          border-bottom: 1px solid rgba(255, 255, 255, 0.04);
          transition: background var(--transition-fast);
        }

        .tempo-assistant-header:hover {
          background: rgba(255, 255, 255, 0.03);
        }

        .tempo-active-icon {
          animation: spin-slow 12s linear infinite;
        }

        .tempo-title-glow {
          text-shadow: 0 0 12px rgba(168, 85, 247, 0.2);
        }

        .tempo-assistant-content {
          padding: 1.25rem;
          display: grid;
          grid-template-columns: 1.1fr 0.9fr;
          gap: 1.5rem;
          background: rgba(0, 0, 0, 0.15);
        }

        @media (max-width: 768px) {
          .tempo-assistant-content {
            grid-template-columns: 1fr;
            gap: 1.25rem;
          }
        }

        .control-card-sub {
          background: rgba(255, 255, 255, 0.01);
          border: 1px solid rgba(255, 255, 255, 0.04);
          border-radius: 10px;
          padding: 0.75rem;
          transition: all var(--transition-fast);
        }

        /* Preset Badges */
        .preset-badges-grid {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin-top: 0.5rem;
        }

        .preset-badge-btn {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.06);
          color: var(--text-secondary);
          padding: 0.3rem 0.65rem;
          border-radius: 6px;
          font-size: 0.75rem;
          font-weight: 600;
          cursor: pointer;
          transition: all var(--transition-fast);
        }

        .preset-badge-btn:hover {
          background: rgba(255, 255, 255, 0.08);
          border-color: rgba(255, 255, 255, 0.12);
          color: var(--text-primary);
        }

        .preset-badge-btn.active-running {
          background: rgba(16, 185, 129, 0.15);
          border-color: var(--color-running);
          color: var(--color-running);
          box-shadow: 0 0 10px rgba(16, 185, 129, 0.15);
        }

        .preset-badge-btn.active-gym {
          background: rgba(236, 72, 153, 0.12);
          border-color: var(--color-gym);
          color: var(--color-gym);
          box-shadow: 0 0 10px rgba(236, 72, 153, 0.15);
        }

        /* Visual beat pulse ring indicators */
        .beat-indicator-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 1.25rem;
          background: rgba(0, 0, 0, 0.2);
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.02);
          position: relative;
          min-height: 180px;
        }

        .beat-ring {
          width: 86px;
          height: 86px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 3px solid rgba(255, 255, 255, 0.04);
          background: rgba(255, 255, 255, 0.01);
          position: relative;
          transition: all 0.08s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          box-shadow: inset 0 0 10px rgba(0,0,0,0.5);
        }

        .beat-ring.active-running {
          border-color: var(--color-running);
          background: rgba(16, 185, 129, 0.06);
          box-shadow: 0 0 25px rgba(16, 185, 129, 0.5), inset 0 0 15px rgba(16, 185, 129, 0.3);
          transform: scale(1.08);
        }

        .beat-ring.active-gym {
          border-color: var(--color-gym);
          background: rgba(236, 72, 153, 0.06);
          box-shadow: 0 0 25px rgba(236, 72, 153, 0.5), inset 0 0 15px rgba(236, 72, 153, 0.3);
          transform: scale(1.08);
        }

        /* Gym phase color cues styling */
        .phase-text {
          font-family: var(--font-sans);
          font-weight: 800;
          font-size: 0.95rem;
          letter-spacing: 0.02em;
          margin-top: 0.25rem;
          min-height: 20px;
          text-transform: uppercase;
        }

        .phase-text-eccentric {
          color: #f43f5e;
          text-shadow: 0 0 8px rgba(244, 63, 94, 0.4);
        }

        .phase-text-isometricBottom {
          color: #3b82f6;
          text-shadow: 0 0 8px rgba(59, 130, 246, 0.4);
        }

        .phase-text-concentric {
          color: #a855f7;
          text-shadow: 0 0 8px rgba(168, 85, 247, 0.4);
        }

        .phase-text-isometricTop {
          color: #eab308;
          text-shadow: 0 0 8px rgba(234, 179, 8, 0.4);
        }

        .phase-text-ready {
          color: var(--text-muted);
        }

        /* Internal Timers */
        .timers-inner-grid {
          display: grid;
          grid-template-columns: 1fr 1.2fr;
          gap: 10px;
          width: 100%;
        }

        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        /* ===== Mobile Overrides for AddWorkoutForm ===== */
        @media (max-width: 768px) {
          .form-modal-overlay {
            align-items: flex-end;
            padding: 0;
          }

          .form-modal-card {
            max-height: 85dvh;
            overflow-y: auto;
            border-radius: 24px 24px 0 0;
            padding: 1.25rem 1rem 1.5rem;
            width: 100%;
            max-width: 100%;
          }

          .timers-inner-grid {
            grid-template-columns: 1fr;
          }

          .time-inputs-group {
            flex-wrap: nowrap;
          }

          .time-subinput {
            padding: 0.65rem 0.35rem;
            font-size: 0.9rem;
          }
        }

        /* Visual Muscle Anatomy Selector Styles */
        .muscle-selector-wrapper {
          display: grid;
          grid-template-columns: 1fr 1.1fr;
          gap: 1.5rem;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 12px;
          padding: 1rem;
          margin-bottom: 1.5rem;
        }
        
        @media (max-width: 640px) {
          .muscle-selector-wrapper {
            grid-template-columns: 1fr;
            gap: 1rem;
          }
        }
        
        .anatomy-map-container {
          display: flex;
          justify-content: center;
          align-items: center;
          background: rgba(0, 0, 0, 0.25);
          border-radius: 8px;
          padding: 0.5rem;
          border: 1px solid rgba(255, 255, 255, 0.02);
          min-height: 230px;
        }
        
        .anatomy-svg {
          width: 100%;
          max-width: 240px;
          height: auto;
          user-select: none;
        }
        
        .muscle-part {
          fill: rgba(255, 255, 255, 0.06);
          stroke: rgba(255, 255, 255, 0.2);
          stroke-width: 1;
          transition: all var(--transition-fast);
          cursor: pointer;
        }
        
        .muscle-part:hover {
          fill: rgba(236, 72, 153, 0.2);
          stroke: var(--color-gym);
        }
        
        .muscle-part.active {
          fill: url(#gym-neon-gradient);
          stroke: var(--color-gym);
          stroke-width: 1.5;
          filter: drop-shadow(0 0 4px rgba(236, 72, 153, 0.6));
        }
        
        .body-neutral {
          fill: rgba(255, 255, 255, 0.12);
          stroke: none;
          pointer-events: none;
        }
        
        .muscle-chips-container {
          display: flex;
          flex-direction: column;
          justify-content: center;
          gap: 0.5rem;
        }
        
        .muscle-chips-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 8px;
        }
        
        .muscle-chip {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.5rem 0.75rem;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 8px;
          color: var(--text-secondary);
          font-size: 0.8rem;
          font-weight: 500;
          cursor: pointer;
          transition: all var(--transition-fast);
        }
        
        .muscle-chip:hover {
          background: rgba(255, 255, 255, 0.06);
          border-color: rgba(255, 255, 255, 0.1);
        }
        
        .muscle-chip.active {
          background: rgba(236, 72, 153, 0.12);
          border-color: var(--color-gym);
          color: var(--color-gym);
          box-shadow: 0 0 10px rgba(236, 72, 153, 0.1);
        }
        
        .muscle-chip-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.2);
          transition: all var(--transition-fast);
        }
        
        .muscle-chip.active .muscle-chip-dot {
          background: var(--color-gym);
          box-shadow: 0 0 6px var(--color-gym);
        }

        /* Structured Sets Builder Styles */
        .exercise-card {
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 12px;
          padding: 1.25rem;
          margin-bottom: 1.25rem;
          transition: all var(--transition-fast);
        }
        
        .exercise-card:hover {
          border-color: rgba(236, 72, 153, 0.2);
          background: rgba(255, 255, 255, 0.03);
        }
        
        .exercise-card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }
        
        .sets-table-container {
          overflow-x: auto;
          width: 100%;
          margin-bottom: 0.75rem;
        }
        
        .sets-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
          min-width: 480px;
        }
        
        .sets-table th {
          font-size: 0.7rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--text-muted);
          padding: 0.5rem;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
          font-weight: 600;
        }
        
        .sets-table td {
          padding: 0.4rem 0.5rem;
          vertical-align: middle;
          border-bottom: 1px solid rgba(255, 255, 255, 0.02);
        }
        
        .set-number-col {
          font-size: 0.8rem;
          font-weight: 700;
          color: var(--text-secondary);
          width: 30px;
        }
        
        .set-badge-btn {
          padding: 0.25rem 0.5rem;
          border-radius: 6px;
          font-size: 0.7rem;
          font-weight: 700;
          cursor: pointer;
          transition: all var(--transition-fast);
          border: 1px solid transparent;
          text-transform: uppercase;
        }
        
        .set-badge-btn.working {
          background: rgba(236, 72, 153, 0.1);
          border-color: rgba(236, 72, 153, 0.3);
          color: var(--color-gym);
        }
        
        .set-badge-btn.warmup {
          background: rgba(59, 130, 246, 0.1);
          border-color: rgba(59, 130, 246, 0.3);
          color: #60a5fa;
        }
        
        .set-input-compact {
          background: rgba(0, 0, 0, 0.25);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 6px;
          color: var(--text-primary);
          padding: 0.3rem 0.5rem;
          font-size: 0.8rem;
          width: 100%;
          max-width: 65px;
          text-align: center;
          transition: all var(--transition-fast);
        }
        
        .set-input-compact:focus {
          border-color: var(--color-gym);
          outline: none;
          box-shadow: 0 0 6px rgba(236, 72, 153, 0.2);
        }
        
        .set-select-compact {
          background: rgba(0, 0, 0, 0.25);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 6px;
          color: var(--text-primary);
          padding: 0.3rem 0.5rem;
          font-size: 0.8rem;
          width: 100%;
          max-width: 90px;
          transition: all var(--transition-fast);
        }
        
        .set-select-compact:focus {
          border-color: var(--color-gym);
          outline: none;
        }
        
        .set-rest-wrapper {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        
        .btn-set-action {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 24px;
          height: 24px;
          border-radius: 4px;
          background: transparent;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          transition: all var(--transition-fast);
        }
        
        .btn-set-action:hover {
          color: var(--color-gym);
          background: rgba(255, 255, 255, 0.05);
        }
        
        .btn-set-action.delete:hover {
          color: #ef4444;
          background: rgba(239, 68, 68, 0.1);
        }
        
        .set-checkbox {
          width: 20px;
          height: 20px;
          border-radius: 4px;
          border: 1px solid rgba(255, 255, 255, 0.2);
          background: rgba(0, 0, 0, 0.3);
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          transition: all var(--transition-fast);
          padding: 0;
        }
        
        .set-checkbox.checked {
          background: var(--color-gym);
          border-color: var(--color-gym);
          color: white;
          box-shadow: 0 0 6px var(--color-gym);
        }
      }
      `}</style>

    </div>
  );
}
