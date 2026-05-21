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


const EXERCISE_SUGGESTIONS = {
  'Pectoral': ['Press de Banca', 'Press Inclinado con Mancuernas', 'Aperturas en Polea', 'Fondos en Paralelas', 'Lagartijas (Push-ups)'],
  'Espalda': ['Dominadas', 'Remo con Barra', 'Jalón al Pecho', 'Remo en Polea Baja', 'Peso Muerto', 'Hiperextensiones'],
  'Pierna': ['Sentadilla Trasera con Barra', 'Prensa de Piernas', 'Desplantes (Lunges)', 'Curl de Pierna Acostado', 'Extensión de Cuádriceps', 'Elevación de Talones'],
  'Hombros': ['Press Militar con Barra', 'Elevaciones Laterales', 'Press Arnold', 'Pájaros (Vuelos Posteriores)', 'Paseo del Granjero'],
  'Brazos': ['Curl de Bíceps con Barra', 'Curl de Bíceps Martillo', 'Curl Concentrado', 'Curl en Banco Scott', 'Fondos de Tríceps', 'Extensiones en Polea Alta', 'Press Francés', 'Copa de Tríceps'],
  'Core': ['Plancha Abdominal (Plank)', 'Crunch en Polea', 'Elevación de Piernas Colgado', 'Giros Rusos (Russian Twists)']
};

const getRpeDescription = (rpe) => {
  const num = Number(rpe) || 8;
  if (num === 10) return 'RIR 0 (Fallo absoluto)';
  if (num === 9) return 'RIR 1 (1 repe en recámara)';
  if (num === 8) return 'RIR 2 (2 repes en recámara)';
  if (num === 7) return 'RIR 3 (3 repes en recámara)';
  if (num === 6) return 'RIR 4 (Esfuerzo moderado)';
  return '';
};

export default function AddWorkoutForm({ onSaveWorkout, onClose, preset, workouts, shoes = [] }) {
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
  const [splitsType, setSplitsType] = useState('auto'); // 'auto' (Km-by-Km continuous) vs 'manual' (repetitions/intervals)
  const [numSeries, setNumSeries] = useState(5);
  const [distanceSeries, setDistanceSeries] = useState('400');
  const [customDistanceSeries, setCustomDistanceSeries] = useState('600');

  // Auto-initialize shoeId using the active shoe
  useEffect(() => {
    if (shoes && shoes.length > 0) {
      const activeShoe = shoes.find(s => s.isActive);
      if (activeShoe) {
        setShoeId(activeShoe.id);
      } else {
        setShoeId(shoes[0].id);
      }
    }
  }, [shoes]);

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
    setSplits([...splits, { splitNumber: splits.length + 1, distance: 1000, time: '00:05:00' }]);
  };
  
  const handleRemoveSplit = (index) => {
    const newSplits = [...splits];
    newSplits.splice(index, 1);
    setSplits(newSplits.map((s, i) => ({ ...s, splitNumber: i + 1 })));
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
  };

  const generateAutoSplits = () => {
    const distVal = parseFloat(distance);
    if (!distVal || distVal <= 0) {
      alert("Por favor ingresa primero la distancia total del entrenamiento.");
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

  // Gym-specific states
  const [sessionName, setSessionName] = useState('');
  const [muscleGroup, setMuscleGroup] = useState('Pectoral');
  const [exercises, setExercises] = useState([
    { name: '', sets: '4', reps: '10', weight: '50', rpe: '8' }
  ]);

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
      if (preset.type) setWorkoutType(preset.type);
      if (preset.terrain) setTerrain(preset.terrain);
      if (preset.muscleGroup) setMuscleGroup(preset.muscleGroup);
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
        setExercises([{ name: defaultExName, sets: '4', reps: '10', weight: '50', rpe: '8' }]);
      }
    }
  }, [preset]);

  // Autofill running details from the last session in workouts list
  const handleAutoFillLastRun = () => {
    if (!workouts || workouts.length === 0) {
      alert("No hay entrenamientos previos en tu historial para auto-sugerir.");
      return;
    }
    const runs = workouts.filter(w => w.type === 'running');
    if (runs.length === 0) {
      alert("No se encontraron sesiones de running previas para auto-sugerir.");
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
      
      alert(`¡Formulario autocompletado con tu última corrida (${latestRun.date})!`);
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
      { name: '', sets: '4', reps: '10', weight: '50', rpe: '8' }
    ]);
  };

  const removeExerciseRow = (index) => {
    if (exercises.length === 1) {
      alert("Debes registrar al menos un ejercicio en la sesión de gimnasio.");
      return;
    }
    setExercises(exercises.filter((_, idx) => idx !== index));
  };

  const updateExerciseField = (index, field, value) => {
    const updated = [...exercises];
    updated[index][field] = value;
    setExercises(updated);
  };

  // Calculate live volume of session being recorded
  const getLiveSessionVolume = () => {
    return exercises.reduce((sum, ex) => {
      const sets = Number(ex.sets) || 0;
      const reps = Number(ex.reps) || 0;
      const weight = Number(ex.weight) || 0;
      return sum + (sets * reps * weight);
    }, 0);
  };

  // Form submit handler
  const handleSubmit = (e) => {
    e.preventDefault();

    if (workoutType === 'running') {
      // Validations
      if (!distance || Number(distance) <= 0) {
        alert("Por favor ingresa una distancia de carrera válida en kilómetros.");
        return;
      }
      
      const hh = String(durationHH).padStart(2, '0');
      const mm = String(durationMM).padStart(2, '0');
      const ss = String(durationSS).padStart(2, '0');
      
      const newWorkout = {
        id: `run-${Date.now()}`,
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
      
      onSaveWorkout(newWorkout);
    } else {
      // Gym validations
      if (!sessionName.trim()) {
        alert("Por favor ingresa el nombre de la sesión (ej: Fuerza de Empuje).");
        return;
      }

      const emptyExercise = exercises.some(ex => !ex.name.trim());
      if (emptyExercise) {
        alert("Por favor completa el nombre de todos los ejercicios agregados.");
        return;
      }

      const formattedExercises = exercises.map(ex => ({
        name: ex.name.trim(),
        sets: parseInt(ex.sets) || 0,
        reps: parseInt(ex.reps) || 0,
        weight: parseFloat(ex.weight) || 0,
        rpe: ex.rpe ? parseInt(ex.rpe) : null
      }));

      const newWorkout = {
        id: `gym-${Date.now()}`,
        type: 'gym',
        date,
        sessionName: sessionName.trim(),
        muscleGroup,
        exercises: formattedExercises,
        notes
      };

      onSaveWorkout(newWorkout);
    }
  };

  return (
    <div className="form-modal-overlay">
      <div className="glass-card form-modal-card fade-in">
        
        {/* Header */}
        <div className="modal-header">
          <h2 className="gradient-text font-extrabold text-2xl flex-center">
            {workoutType === 'running' ? <TrendingUp size={22} className="running-text" /> : <Dumbbell size={22} className="gym-text" />}
            Registrar Nuevo Entrenamiento
          </h2>
          <button className="btn-close-modal" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Tab Switcher */}
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
                  onChange={(e) => setMuscleGroup(e.target.value)}
                  className="form-select"
                >
                  <option value="Pectoral">Pectoral (Pecho)</option>
                  <option value="Espalda">Espalda</option>
                  <option value="Pierna">Pierna</option>
                  <option value="Hombros">Hombros</option>
                  <option value="Brazos">Brazos (Bíceps/Tríceps)</option>
                  <option value="Core">Core (Abdomen)</option>
                  <option value="Full Body">Cuerpo Completo (Full Body)</option>
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
                          <span>⚠️ <strong>Advertencia de Desgaste Crítico:</strong> Este calzado tiene {Math.round(totalKm * 10) / 10} km de uso ({Math.round(progressPct)}% de su límite). La suela ha perdido su capacidad óptima de amortiguación. Se sugiere reemplazarlo para prevenir lesiones.</span>
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

                    {/* TWO-MODE SPLITS EDITOR */}
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
                        </div>
                      </div>

                      {splitsType === 'auto' ? (
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
                      ) : (
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

                      {/* RENDERING DYNAMIC INPUT SPLITS LIST */}
                      {splits.length > 0 && (
                        <div className="splits-fields-list mt-3" style={{ maxHeight: '250px', overflowY: 'auto', paddingRight: '4px' }}>
                          <label className="form-label-custom text-xs mb-2 block" style={{ color: 'var(--color-running)', fontWeight: 'bold' }}>Tiempos de cada Split / Repetición (MM:SS)</label>
                          {splits.map((split, index) => (
                            <div key={index} className="flex-between-row mb-2 animate-fade-in" style={{ gap: '0.5rem', alignItems: 'center' }}>
                              <span className="text-secondary font-bold text-xs" style={{ width: '80px', flexShrink: 0 }}>
                                #{split.splitNumber} ({split.distance >= 1000 ? `${(split.distance / 1000).toFixed(1)}k` : `${split.distance}m`})
                              </span>
                              <input 
                                type="text" 
                                placeholder="MM:SS" 
                                value={getDisplayTime(split.time)}
                                onChange={(e) => handleSplitTimeChange(index, e.target.value)}
                                className="form-input text-xs"
                                style={{ padding: '0.35rem', flex: 1 }}
                              />
                              <button type="button" onClick={() => handleRemoveSplit(index)} className="btn" style={{ padding: '0.4rem', color: '#ef4444', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '6px' }}>
                                <Trash2 size={12} />
                              </button>
                            </div>
                          ))}
                          
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
              <div className="form-group">
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

              {/* Dynamic Exercise Grid List */}
              <div className="exercises-builder-container mb-4">
                <div className="builder-header">
                  <h4 className="builder-title text-secondary">Ejercicios Realizados</h4>
                  <button
                    type="button"
                    onClick={addExerciseRow}
                    className="btn btn-secondary py-1 px-3 flex-center text-xs"
                  >
                    <Plus size={14} /> Agregar Fila
                  </button>
                </div>

                <div className="exercises-rows-list">
                  {exercises.map((ex, idx) => (
                    <div key={idx} className="exercise-builder-row">
                      <div className="col-name">
                        <label className="form-label text-xs">Nombre Ejercicio</label>
                        <input
                          type="text"
                          placeholder="Ej: Press de Banca"
                          value={ex.name}
                          onChange={(e) => updateExerciseField(idx, 'name', e.target.value)}
                          required
                          className="form-input"
                          list={`exercise-suggestions-${muscleGroup}`}
                        />
                      </div>
                      
                      <div className="col-sets">
                        <label className="form-label text-xs">Series</label>
                        <input
                          type="number"
                          min="1"
                          placeholder="Series"
                          value={ex.sets}
                          onChange={(e) => updateExerciseField(idx, 'sets', e.target.value)}
                          required
                          className="form-input"
                        />
                      </div>

                      <div className="col-reps">
                        <label className="form-label text-xs">Reps</label>
                        <input
                          type="number"
                          min="1"
                          placeholder="Reps"
                          value={ex.reps}
                          onChange={(e) => updateExerciseField(idx, 'reps', e.target.value)}
                          required
                          className="form-input"
                        />
                      </div>

                      <div className="col-weight">
                        <label className="form-label text-xs">Peso (kg)</label>
                        <input
                          type="number"
                          min="0"
                          step="0.5"
                          placeholder="Peso"
                          value={ex.weight}
                          onChange={(e) => updateExerciseField(idx, 'weight', e.target.value)}
                          required
                          className="form-input"
                        />
                      </div>

                      <div className="col-rpe">
                        <label className="form-label text-xs">RPE</label>
                        <select
                          value={ex.rpe}
                          onChange={(e) => updateExerciseField(idx, 'rpe', e.target.value)}
                          className="form-select"
                        >
                          <option value="6">6 (RIR 4)</option>
                          <option value="7">7 (RIR 3)</option>
                          <option value="8">8 (RIR 2)</option>
                          <option value="9">9 (RIR 1)</option>
                          <option value="10">10 (RIR 0)</option>
                        </select>
                        <span className="rpe-rir-caption" style={{ fontSize: '0.65rem', color: 'var(--text-muted)', display: 'block', marginTop: '3px', whiteSpace: 'nowrap' }}>
                          {getRpeDescription(ex.rpe)}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeExerciseRow(idx)}
                        className="btn-remove-row"
                        title="Quitar ejercicio"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                  
                  {/* Dynamic Autocomplete datalist */}
                  <datalist id={`exercise-suggestions-${muscleGroup}`}>
                    {(EXERCISE_SUGGESTIONS[muscleGroup] || []).map(suggestion => (
                      <option key={suggestion} value={suggestion} />
                    ))}
                  </datalist>
                </div>

                <div className="builder-summary-line">
                  <span>Volumen acumulado de esta sesión: <strong>{getLiveSessionVolume().toLocaleString('es-ES')} kg</strong></span>
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
              <span>Guardar Sesión</span>
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
          }

          .form-modal-card {
            max-height: 90dvh;
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
      `}</style>

    </div>
  );
}
