import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  TrendingUp, 
  Dumbbell, 
  Award, 
  Info, 
  Zap, 
  Heart, 
  Activity,
  Brain,
  Cpu,
  ShieldAlert
} from 'lucide-react';
import { 
  getRacePredictions, 
  getRunningPaceZones, 
  getRecommendedGymWeights, 
  calculate1RM,
  calculateHRZones,
  getRunningExponentDetails,
  calculateDecayedHistoricalRunningMetrics,
  solveVDOTTime,
  getForceVelocityProfile,
  calculateACWRData
} from '../utils/calculators';

export default function Predictors({ workouts = [], profile = {} }) {
  const [activeCalculator, setActiveCalculator] = useState('running'); // running, gym, heartrate, ai_coach

  // --- RUNNING PREDICTOR STATE ---
  const [runningMode, setRunningMode] = useState('history'); // history, manual
  const [refDistance, setRefDistance] = useState('5'); // km
  const [refHH, setRefHH] = useState('00');
  const [refMM, setRefMM] = useState('24');
  const [refSS, setRefSS] = useState('30');
  
  const [racePredictions, setRacePredictions] = useState([]);
  const [paceZones, setPaceZones] = useState([]);

  // --- GYM PREDICTOR STATE ---
  const [refWeight, setRefWeight] = useState(() => localStorage.getItem('fitanalytics_profile_weight') || '80'); // kg
  const [refReps, setRefReps] = useState('8');
  const [refRpe, setRefRpe] = useState('10'); // Borg effort scale (1-10)
  
  const [estimated1RM, setEstimated1RM] = useState(0);
  const [gymRecommendations, setGymRecommendations] = useState([]);
  
  // Custom Gym Slider Percentage
  const [customPct, setCustomPct] = useState(80);

  // --- CUSTOM DYNAMIC SPORTS INTEL STATES ---
  const [activeGymExercise, setActiveGymExercise] = useState('bench_press'); // bench_press, squat, deadlift
  const [hoveredGymPoint, setHoveredGymPoint] = useState(null);
  const [hoveredFitnessPoint, setHoveredFitnessPoint] = useState(null);
  const [hoveredWorkout, setHoveredWorkout] = useState(null);
  const [hoveredACWRPoint, setHoveredACWRPoint] = useState(null);

  // --- HEART RATE ZONE PREDICTOR STATE ---
  const [age, setAge] = useState(() => Number(localStorage.getItem('fitanalytics_age')) || 25);
  const [hrZones, setHrZones] = useState([]);

  // Sync age to local storage and recalculate zones
  useEffect(() => {
    if (age > 0) {
      localStorage.setItem('fitanalytics_age', age.toString());
      setHrZones(calculateHRZones(age));
    }
  }, [age]);

  const historicalMetrics = React.useMemo(() => {
    return calculateDecayedHistoricalRunningMetrics(workouts, profile);
  }, [workouts, profile]);

  const acwrData = React.useMemo(() => {
    return calculateACWRData(workouts);
  }, [workouts]);

  const activeRunningParams = React.useMemo(() => {
    if (runningMode === 'history') {
      const vdot = historicalMetrics.weightedVdot;
      const eqSecs = solveVDOTTime(5.0, vdot);
      const hh = Math.floor(eqSecs / 3600);
      const mm = Math.floor((eqSecs % 3600) / 60);
      const ss = Math.round(eqSecs % 60);
      const timeStr = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
      return {
        distance: 5.0,
        timeStr,
        vdot,
        hh: String(hh).padStart(2, '0'),
        mm: String(mm).padStart(2, '0'),
        ss: String(ss).padStart(2, '0')
      };
    } else {
      const d1 = parseFloat(refDistance) || 5;
      const h = parseInt(refHH) || 0;
      const m = parseInt(refMM) || 24;
      const s = parseInt(refSS) || 30;
      const timeStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
      
      // Calculate manual VDOT
      const totalMinutes = h * 60 + m + s / 60;
      const v = (d1 * 1000) / totalMinutes; // m/min
      const vo2 = -4.60 + 0.182258 * v + 0.000104 * v * v;
      const pct = 0.2989558 * Math.exp(-0.1932605 * totalMinutes) + 0.1894393 * Math.exp(-0.012778 * totalMinutes) + 0.8;
      const vdot = vo2 / pct || 37.0;

      return {
        distance: d1,
        timeStr,
        vdot,
        hh: String(h).padStart(2, '0'),
        mm: String(m).padStart(2, '0'),
        ss: String(s).padStart(2, '0')
      };
    }
  }, [runningMode, historicalMetrics, refDistance, refHH, refMM, refSS]);

  // Recalculate running predictions
  useEffect(() => {
    const { distance, timeStr } = activeRunningParams;
    const preds = getRacePredictions(distance, timeStr, profile, workouts);
    const zones = getRunningPaceZones(distance, timeStr, profile, workouts);
    setRacePredictions(preds);
    setPaceZones(zones);
  }, [activeRunningParams, profile, workouts]);

  // Compute physiological running exponent details
  const exponentDetails = React.useMemo(() => {
    return getRunningExponentDetails(profile, workouts);
  }, [profile, workouts]);

  const vdotReference = activeRunningParams.vdot;

  // Recalculate gym predictions
  const handleCalculateGym = () => {
    const w = parseFloat(refWeight);
    const r = parseInt(refReps);
    if (w > 0 && r > 0) {
      const computed1RM = calculate1RM(w, r, refRpe);
      setEstimated1RM(computed1RM);
      const recs = getRecommendedGymWeights(w, r);
      setGymRecommendations(recs);
    }
  };

  useEffect(() => {
    handleCalculateGym();
  }, [refWeight, refReps, refRpe]);

  // Compute manual custom weight
  const getCustomWeight = () => {
    const weight = estimated1RM * (customPct / 100);
    return (Math.round(weight * 2) / 2).toFixed(1);
  };

  // --- STRENGTH HISTORY EXTRACTION (1RM PROGRESSION) ---
  const strengthHistory = React.useMemo(() => {
    const exercisesToTrack = [
      { key: 'bench_press', label: 'Press de Banca Plano', keywords: ['banca', 'pecho plano', 'bench press'] },
      { key: 'squat', label: 'Sentadilla Libre', keywords: ['sentadilla', 'squat'] },
      { key: 'deadlift', label: 'Peso Muerto', keywords: ['peso muerto', 'deadlift'] }
    ];

    const history = {
      bench_press: [],
      squat: [],
      deadlift: []
    };

    if (!workouts || workouts.length === 0) return history;

    // Filter and sort workouts chronologically
    const gymWorkouts = workouts
      .filter(w => w.type === 'gym' && w.date && Array.isArray(w.exercises))
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    gymWorkouts.forEach(w => {
      const dateStr = w.date;
      exercisesToTrack.forEach(trackEx => {
        let max1RM = 0;
        let matchedWeight = 0;
        let matchedReps = 0;
        let matchedRpe = 10;
        let matchedName = '';

        w.exercises.forEach(ex => {
          const exName = (ex.name || '').toLowerCase();
          const matches = trackEx.keywords.some(kw => exName.includes(kw));
          if (matches) {
            if (Array.isArray(ex.sets)) {
              ex.sets.forEach(s => {
                if (s.done !== false) {
                  const weight = parseFloat(s.weight) || 0;
                  const reps = parseFloat(s.reps) || 0;
                  const rpe = s.rpe;
                  if (weight > 0 && reps > 0) {
                    const oneRepMax = calculate1RM(weight, reps, rpe);
                    if (oneRepMax > max1RM) {
                      max1RM = oneRepMax;
                      matchedWeight = weight;
                      matchedReps = reps;
                      matchedRpe = rpe !== undefined && rpe !== null && rpe !== '' ? parseFloat(rpe) : 10;
                      matchedName = ex.name;
                    }
                  }
                }
              });
            } else {
              const weight = Number(ex.weight) || 0;
              const reps = Number(ex.reps) || 0;
              const rpe = ex.rpe;
              if (weight > 0 && reps > 0) {
                const oneRepMax = calculate1RM(weight, reps, rpe);
                if (oneRepMax > max1RM) {
                  max1RM = oneRepMax;
                  matchedWeight = weight;
                  matchedReps = reps;
                  matchedRpe = rpe !== undefined && rpe !== null && rpe !== '' ? parseFloat(rpe) : 10;
                  matchedName = ex.name;
                }
              }
            }
          }
        });

        if (max1RM > 0) {
          history[trackEx.key].push({
            date: dateStr,
            oneRepMax: Math.round(max1RM * 10) / 10,
            weight: matchedWeight,
            reps: matchedReps,
            rpe: matchedRpe,
            exName: matchedName
          });
        }
      });
    });

    return history;
  }, [workouts]);

  // --- TENDENCIA NEUROMUSCULAR Y DETECTOR DE ESTANCAMIENTO ---
  const neuromuscularAdaptation = React.useMemo(() => {
    const currentHistory = strengthHistory[activeGymExercise] || [];
    if (currentHistory.length < 2) {
      return {
        status: 'Necesita Más Datos',
        badge: '⚡ REGISTROS INSUFICIENTES',
        color: '#3b82f6', // blue
        borderColor: 'rgba(59, 130, 246, 0.4)',
        glowColor: 'rgba(59, 130, 246, 0.15)',
        trendPct: 0,
        advice: 'Registra al menos 2 sesiones de este ejercicio en diferentes fechas en la Bitácora para calcular tu tendencia neuromuscular y diagnosticar adaptaciones o estancamientos científicos.'
      };
    }

    // Compare recent 1RM (average of last 2 entries) vs baseline (average of first 2 entries)
    const sorted = [...currentHistory].sort((a, b) => new Date(a.date) - new Date(b.date));
    
    // Recent 1RM (average of up to 2 latest points)
    const recentPoints = sorted.slice(-2);
    const recentAvg = recentPoints.reduce((sum, p) => sum + p.oneRepMax, 0) / recentPoints.length;

    // Baseline 1RM (average of up to 2 oldest points from earlier weeks)
    const basePoints = sorted.slice(0, Math.min(2, sorted.length - 1 || 1));
    const baseAvg = basePoints.reduce((sum, p) => sum + p.oneRepMax, 0) / basePoints.length;

    const diff = recentAvg - baseAvg;
    const trendPct = baseAvg > 0 ? (diff / baseAvg) * 100 : 0;

    let status = 'Supercompensación';
    let badge = '⚡ SUPERCOMPENSACIÓN ACTIVA';
    let color = '#10b981'; // Green
    let borderColor = 'rgba(16, 185, 129, 0.4)';
    let glowColor = 'rgba(16, 185, 129, 0.15)';
    let advice = 'Tu sistema neuromuscular se está adaptando de forma excepcional. Continúa con tu progresión lineal de cargas (+1-2kg por semana o intenta añadir 1 repetición más con el mismo peso). ¡Mantén la constancia!';

    if (trendPct >= -1.0 && trendPct <= 3.0) {
      status = 'Estancamiento';
      badge = '⚠️ MESETA DE FUERZA (ESTANCADO)';
      color = '#fbbf24'; // Amber
      borderColor = 'rgba(251, 191, 36, 0.4)';
      glowColor = 'rgba(251, 191, 36, 0.15)';
      advice = 'Has alcanzado una meseta de fuerza neuromuscular. Para romper este estancamiento, se recomienda pasar a un modelo de Doble Progresión (fija el peso actual hasta lograr las repeticiones meta en todas las series antes de incrementarlo) o introduce Periodización Ondulante, alternando una sesión pesada de fuerza con una ligera de potencia dinámica al 60% de tu 1RM.';
    } else if (trendPct < -1.0) {
      status = 'Descarga Recomendada';
      badge = '🛑 COMPROMISO DE RECUPERACIÓN (DESCARGA)';
      color = '#f87171'; // Red
      borderColor = 'rgba(248, 113, 113, 0.4)';
      glowColor = 'rgba(248, 113, 113, 0.15)';
      advice = 'Tu fuerza máxima estimada ha decrecido en las últimas semanas. Esto suele indicar fatiga sistémica acumulada o interferencia del entrenamiento cardiovascular recurrente. Se recomienda realizar una Semana de Descarga (Deload) reduciendo el volumen de series al 50% y bajando el peso un 10-15% para permitir la supercompensación de las fibras musculares.';
    }

    return {
      status,
      badge,
      color,
      borderColor,
      glowColor,
      trendPct: Math.round(trendPct * 10) / 10,
      advice
    };
  }, [strengthHistory, activeGymExercise]);

  // --- TSS & CTL/ATL/TSB CALCULATIONS (BANISTER ENGINE) ---
  const fitnessFatigueData = React.useMemo(() => {
    const userAge = age || 25;
    const maxHR = Math.round(208 - 0.7 * userAge);

    const calculateTSS = (w) => {
      const durationStr = w.duration || "00:00:00";
      const parts = durationStr.split(':');
      let mins = 0;
      if (parts.length === 3) {
        mins = (parseInt(parts[0]) || 0) * 60 + (parseInt(parts[1]) || 0) + (parseInt(parts[2]) || 0) / 60;
      } else if (parts.length === 2) {
        mins = (parseInt(parts[0]) || 0) + (parseInt(parts[1]) || 0) / 60;
      } else {
        mins = parseInt(durationStr) || 0;
      }

      if (mins <= 0) mins = 30; // fallback standard 30 min

      const rpe = Number(w.rpe) || 7;
      const hr = Number(w.heartRate) || 0;

      let tss = 0;
      if (w.type === 'gym') {
        const intensityFactor = rpe / 10;
        tss = mins * intensityFactor * 1.0;
      } else {
        if (hr > 0 && maxHR > 0) {
          const intensityFactor = hr / maxHR;
          tss = (mins * intensityFactor * intensityFactor * 100) / 60;
        } else {
          const intensityFactor = rpe / 10;
          tss = (mins * intensityFactor * intensityFactor * 100) / 60;
        }
      }
      return Math.round(tss * 10) / 10;
    };

    const today = new Date();
    today.setHours(23, 59, 59, 999);

    const dailyTssMap = {};
    workouts.forEach(w => {
      if (!w.date) return;
      const dateKey = w.date;
      const tss = calculateTSS(w);
      dailyTssMap[dateKey] = (dailyTssMap[dateKey] || 0) + tss;
    });

    const timeline = [];
    const warmupDays = 80;
    let ctl = 0;
    let atl = 0;

    for (let i = warmupDays; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];

      const todaysTSS = dailyTssMap[dateStr] || 0;

      // CTL (Fitness): 42-day rolling constant
      ctl = ctl + (todaysTSS - ctl) / 42;
      // ATL (Fatigue): 7-day rolling constant
      atl = atl + (todaysTSS - atl) / 7;
      const tsb = ctl - atl;

      timeline.push({
        date: dateStr,
        tss: todaysTSS,
        ctl: Math.round(ctl * 10) / 10,
        atl: Math.round(atl * 10) / 10,
        tsb: Math.round(tsb * 10) / 10
      });
    }

    // Slice last 30 days for plotting
    return timeline.slice(-30);
  }, [workouts, age]);

  const todayFitnessMetrics = React.useMemo(() => {
    if (fitnessFatigueData.length === 0) return { ctl: 0, atl: 0, tsb: 0 };
    return fitnessFatigueData[fitnessFatigueData.length - 1];
  }, [fitnessFatigueData]);

  // Chart hover helpers
  const handleGymMouseMove = (e, points) => {
    if (!points || points.length === 0) return;
    const svgRect = e.currentTarget.getBoundingClientRect();
    const mouseX = ((e.clientX - svgRect.left) / svgRect.width) * 800;
    
    let closestIdx = 0;
    let minDiff = Infinity;
    points.forEach((p, idx) => {
      const diff = Math.abs(p.x - mouseX);
      if (diff < minDiff) {
        minDiff = diff;
        closestIdx = idx;
      }
    });
    setHoveredGymPoint(closestIdx);
  };

  const handleFFMouseMove = (e, points) => {
    if (!points || points.length === 0) return;
    const svgRect = e.currentTarget.getBoundingClientRect();
    const mouseX = ((e.clientX - svgRect.left) / svgRect.width) * 800;
    
    let closestIdx = 0;
    let minDiff = Infinity;
    points.forEach((p, idx) => {
      const diff = Math.abs(p.x - mouseX);
      if (diff < minDiff) {
        minDiff = diff;
        closestIdx = idx;
      }
    });
    setHoveredFitnessPoint(closestIdx);
  };

  // --- AI COACH SCIENTIFIC TELEMETRY ENGINE ---
  // HIGH-05: usa acwrData.current (calculado por calculateACWRData) en lugar de
  // reimplementar la lógica ACWR localmente. Elimina la duplicación entre tabs.
  const aiCoachTelemetry = React.useMemo(() => {
    // Leer ACWRs por disciplina desde el motor ACWR unificado
    const cardioACWR   = acwrData.current.runningAcwr;
    const strengthACWR = acwrData.current.gymAcwr;

    const today = new Date();
    today.setHours(23, 59, 59, 999);
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(today.getDate() - 30);
    thirtyDaysAgo.setHours(0, 0, 0, 0);

    const recentWorkouts = workouts.filter(w => {
      if (!w.date) return false;
      const wDate = new Date(w.date + 'T00:00:00');
      return wDate >= thirtyDaysAgo && wDate <= today;
    });

    // Muscle recency tracking
    const muscleRecency = {
      pectoral: { name: 'Pectoral / Empuje', lastTrainedDays: Infinity, status: 'Listo', color: '#10b981' },
      espalda: { name: 'Espalda / Tirón', lastTrainedDays: Infinity, status: 'Listo', color: '#10b981' },
      piernas: { name: 'Piernas / Tren Inferior', lastTrainedDays: Infinity, status: 'Listo', color: '#10b981' },
      hombros: { name: 'Hombros / Deltoides', lastTrainedDays: Infinity, status: 'Listo', color: '#10b981' },
      brazos: { name: 'Brazos / Extremidades', lastTrainedDays: Infinity, status: 'Listo', color: '#10b981' }
    };

    workouts.forEach(w => {
      if (w.type === 'gym' && w.date) {
        const wDate = new Date(w.date + 'T00:00:00');
        const diffTime = Math.abs(today - wDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        const musclesInSession = [];
        if (w.muscleGroup) musclesInSession.push(w.muscleGroup.toLowerCase());
        if (w.trainedMuscles && Array.isArray(w.trainedMuscles)) {
          w.trainedMuscles.forEach(m => musclesInSession.push(m.toLowerCase()));
        }
        if (w.exercises && Array.isArray(w.exercises)) {
          w.exercises.forEach(ex => {
            if (ex.muscleGroup) musclesInSession.push(ex.muscleGroup.toLowerCase());
            const name = (ex.name || '').toLowerCase();
            if (name.includes('banca') || name.includes('pecho') || name.includes('press db') || name.includes('aperturas')) musclesInSession.push('pectoral');
            if (name.includes('peso muerto') || name.includes('remo') || name.includes('jalón') || name.includes('dominadas')) musclesInSession.push('espalda');
            if (name.includes('sentadilla') || name.includes('prensa') || name.includes('zancadas') || name.includes('pierna') || name.includes('quad')) musclesInSession.push('piernas');
            if (name.includes('militar') || name.includes('hombro') || name.includes('lateral') || name.includes('deltoide')) musclesInSession.push('hombros');
            if (name.includes('curl') || name.includes('tríceps') || name.includes('bíceps') || name.includes('brazo')) musclesInSession.push('brazos');
          });
        }

        musclesInSession.forEach(m => {
          let key = '';
          if (m.includes('pectoral') || m.includes('pecho') || m.includes('empuje')) key = 'pectoral';
          else if (m.includes('espalda') || m.includes('remo') || m.includes('tirón')) key = 'espalda';
          else if (m.includes('pierna') || m.includes('sentadilla') || m.includes('femoral') || m.includes('cuad') || m.includes('cuádriceps') || m.includes('isquiotibiales') || m.includes('gemelo') || m.includes('glúteo') || m.includes('gluteo')) key = 'piernas';
          else if (m.includes('hombro') || m.includes('deltoide') || m.includes('cuello')) key = 'hombros';
          else if (m.includes('brazo') || m.includes('curl') || m.includes('bicep') || m.includes('tricep') || m.includes('bíceps') || m.includes('tríceps') || m.includes('antebrazo')) key = 'brazos';

          if (key && diffDays < muscleRecency[key].lastTrainedDays) {
            muscleRecency[key].lastTrainedDays = diffDays;
          }
        });
      }
    });

    Object.keys(muscleRecency).forEach(key => {
      const days = muscleRecency[key].lastTrainedDays;
      if (days <= 2) {
        muscleRecency[key].status = 'Agotado (Recuperando Fibras)';
        muscleRecency[key].color = '#ef4444'; // Red
      } else if (days <= 4) {
        muscleRecency[key].status = 'Fase de Súpercompensación (Óptimo)';
        muscleRecency[key].color = '#3b82f6'; // Blue
      } else if (days === Infinity) {
        muscleRecency[key].status = 'Listo (Requiere Estímulo)';
        muscleRecency[key].color = '#10b981'; // Green
      } else {
        muscleRecency[key].status = 'Listo (Nivel de Fuerza Descendiendo)';
        muscleRecency[key].color = '#eab308'; // Yellow
      }
    });

    // Base Recommendation
    let recommendation = {
      action: 'Fuerza e Hipertrofia (Tren Superior/Inferior)',
      badgeClass: 'badge-strength',
      reason: 'Tus sistemas cardiovascular y muscular están completamente recuperados. Hoy es un excelente día para estimular la síntesis de proteínas musculares mediante sobrecarga progresiva.',
      scientificDetail: 'Tu ACWR Cardiovascular es de ' + cardioACWR.toFixed(2) + ' (Óptimo) y tu ACWR Muscular es de ' + strengthACWR.toFixed(2) + '. La ausencia de fatiga acumulada te permite realizar una sesión de fuerza exigente sin riesgo de sobreentrenamiento.',
      routine: [
        { name: 'Sentadilla con Barra (o Prensa)', sets: '4', reps: '6-8', intensity: '80% 1RM (RPE 8 / RIR 2)' },
        { name: 'Press de Banca Plano con Barra', sets: '4', reps: '8', intensity: '75% 1RM (RPE 8 / RIR 2)' },
        { name: 'Remo con Mancuerna para Espalda', sets: '3', reps: '10', intensity: '70% 1RM (RPE 7 / RIR 3)' },
        { name: 'Press Militar de Hombros', sets: '3', reps: '10', intensity: '70% 1RM (RPE 7 / RIR 3)' }
      ]
    };

    // Find the muscle trained least recently
    let targetMuscleKey = 'piernas';
    let maxDays = -1;
    Object.keys(muscleRecency).forEach(key => {
      if (muscleRecency[key].lastTrainedDays === Infinity) {
        maxDays = 9999;
        targetMuscleKey = key;
      } else if (muscleRecency[key].lastTrainedDays > maxDays) {
        maxDays = muscleRecency[key].lastTrainedDays;
        targetMuscleKey = key;
      }
    });

    const targetMuscleName = muscleRecency[targetMuscleKey].name;

    if (cardioACWR > 1.5 || strengthACWR > 1.5) {
      recommendation = {
        action: 'Recuperación Activa / Descanso Total',
        badgeClass: 'badge-recovery',
        reason: '¡Alerta de Fatiga Excesiva! Tu relación de carga de trabajo aguda a crónica (ACWR) está en la Zona de Riesgo. Continuar entrenando intensamente dispararía exponencialmente el peligro de sufrir microdesgarros o fatiga del sistema nervioso central.',
        scientificDetail: `Tu ACWR Cardiovascular es de ${cardioACWR.toFixed(2)} y tu ACWR Muscular es de ${strengthACWR.toFixed(2)}. Un ratio superior a 1.5 se correlaciona estadísticamente con un incremento sustancial de lesiones musculares. Tu cuerpo requiere regenerar glucógeno y desinflamar articulaciones hoy.`,
        routine: [
          { name: 'Estiramientos Pasivos de Cuerpo Completo', sets: '1', reps: '20 min', intensity: 'Baja tensión muscular' },
          { name: 'Caminata Ligera al Aire Libre', sets: '1', reps: '30 min', intensity: 'Zona 1 Cardíaca (< 115 bpm)' },
          { name: 'Liberación Miofascial (Foam Roller)', sets: '1', reps: '15 min', intensity: 'Zonas cargadas' },
          { name: 'Respiración Diafragmática (Bajar Cortisol)', sets: '1', reps: '10 min', intensity: 'Relajación profunda' }
        ]
      };
    } else if (cardioACWR > 1.3 && strengthACWR < 0.9) {
      recommendation = {
        action: 'Fuerza Muscular: Enfocado en ' + targetMuscleName,
        badgeClass: 'badge-strength',
        reason: 'Tu motor cardiovascular acumula fatiga moderada de tus sesiones de running recientes. Sin embargo, tus músculos esqueléticos se encuentran recuperados y listos para sobrecarga progresiva en el gimnasio.',
        scientificDetail: `Tu ACWR Cardio es de ${cardioACWR.toFixed(2)} (ligeramente elevado), mientras que tu ACWR Muscular está en ${strengthACWR.toFixed(2)} (bajo entrenamiento). Daremos descanso a tu corazón desviando el esfuerzo a contracciones anaeróbicas controladas.`,
        routine: targetMuscleKey === 'piernas' ? [
          { name: 'Sentadilla Goblet o con Barra', sets: '4', reps: '8', intensity: '75% 1RM (RPE 8)' },
          { name: 'Prensa Inclinada de Piernas', sets: '3', reps: '10', intensity: '70% 1RM (RPE 7)' },
          { name: 'Peso Muerto Rumano (Isquiotibiales)', sets: '3', reps: '10', intensity: '65% 1RM (RPE 7)' },
          { name: 'Elevación de Gemelos de pie', sets: '3', reps: '15', intensity: 'Esfuerzo Alto (RIR 1)' }
        ] : targetMuscleKey === 'pectoral' ? [
          { name: 'Press de Banca Plano con Barra', sets: '4', reps: '8', intensity: '75% 1RM (RPE 8)' },
          { name: 'Press de Pecho Inclinado con DB', sets: '3', reps: '10', intensity: '70% 1RM (RPE 7)' },
          { name: 'Fondos en Paralelas (Pecho/Tríceps)', sets: '3', reps: 'Fallo-2', intensity: 'Peso Corporal / Lastrado' },
          { name: 'Aperturas Inclinadas en Polea', sets: '3', reps: '12', intensity: 'RPE 8' }
        ] : targetMuscleKey === 'espalda' ? [
          { name: 'Peso Muerto Convencional', sets: '3', reps: '5', intensity: '80% 1RM (RPE 8)' },
          { name: 'Dominadas Pronas o Jalón al Pecho', sets: '4', reps: '8-10', intensity: 'Peso Corporal (RIR 2)' },
          { name: 'Remo con Mancuerna Unilateral', sets: '3', reps: '10', intensity: '75% 1RM (RPE 7)' },
          { name: 'Pull-Over en Polea Alta (Dorsales)', sets: '3', reps: '12', intensity: 'RPE 8' }
        ] : [
          { name: 'Press Militar de Hombros con Barra', sets: '4', reps: '8', intensity: '75% 1RM (RPE 8)' },
          { name: 'Elevaciones Laterales con Mancuerna', sets: '4', reps: '12-15', intensity: 'RPE 8 (Quemazón)' },
          { name: 'Curl de Bíceps Alterno con DB', sets: '3', reps: '10', intensity: 'RPE 8' },
          { name: 'Rompecráneos en Banco Plano (Tríceps)', sets: '3', reps: '10', intensity: 'RPE 8' }
        ]
      };
    } else if (strengthACWR > 1.3 && cardioACWR < 0.9) {
      recommendation = {
        action: 'Running: Fondo de Resistencia Aeróbica (Zona 2)',
        badgeClass: 'badge-cardio',
        reason: 'Tus músculos esqueléticos están agotados y en proceso de reconstrucción celular de tus sesiones pesadas de gimnasio. Es el día perfecto para estimular el volumen mitocondrial mediante cardio suave en Zona 2.',
        scientificDetail: `Tu ACWR Muscular es de ${strengthACWR.toFixed(2)} (fatiga de fuerza acumulada), mientras que tu ACWR Cardio está en ${cardioACWR.toFixed(2)} (completamente recuperado). El trote ligero facilitará el retorno venoso, acelerando la remoción de metabolitos sin generar impacto lesivo en tus fibras musculares inflamadas.`,
        routine: [
          { name: 'Carrera Continua Suave en Zona 2', sets: '1', reps: '45-60 min', intensity: 'Trote conversacional a 120-140 bpm' },
          { name: 'Movilidad articular dinámica previa', sets: '1', reps: '5 min', intensity: 'Bajo impacto' },
          { name: 'Estiramientos estáticos ligeros post-corrida', sets: '1', reps: '10 min', intensity: 'Descompresión de tren inferior' }
        ]
      };
    } else if (cardioACWR < 0.8 && strengthACWR < 0.8) {
      recommendation = {
        action: 'Entrenamiento Híbrido: Acondicionamiento Total',
        badgeClass: 'badge-hybrid',
        reason: 'Te encuentras en una fase de bajo volumen de entrenamiento. Ambos sistemas están al 100% de su capacidad. Aprovecharemos esta ventana metabólica para una sesión híbrida de fuerza y potencia cardiovascular.',
        scientificDetail: `Tus ACWR están por debajo del umbral óptimo (Cardio: ${cardioACWR.toFixed(2)}, Fuerza: ${strengthACWR.toFixed(2)}). Esto indica que no hay fatiga y tu cuerpo absorberá perfectamente una carga de estímulo mixto.`,
        routine: [
          { name: 'Sentadilla Goblet o con Barra', sets: '3', reps: '6', intensity: '80% 1RM (RPE 8)' },
          { name: 'Dominadas Pronas o Remo Alto', sets: '3', reps: '8', intensity: 'RPE 8' },
          { name: 'Intervalos HIIT (Cinta o Calle)', sets: '5 sets', reps: '3 min', intensity: 'Pulsaciones en Zona 5 (90% FCmáx) / 2 min suave' },
          { name: 'Trote regenerativo de enfriamiento', sets: '1', reps: '5 min', intensity: 'Zona 1 (< 120 bpm)' }
        ]
      };
    } else if (workouts.length > 0 && workouts[0].type === 'gym') {
      recommendation = {
        action: 'Running: Intervalos o Umbral de Lactato',
        badgeClass: 'badge-cardio',
        reason: 'Ayer entrenaste fuerza en el gimnasio. Corresponde un estímulo cardiovascular para mejorar tu ritmo de umbral anaeróbico sin sobrecargar los mismos grupos musculares.',
        scientificDetail: `Tu ACWR Cardiovascular está en ${cardioACWR.toFixed(2)} (sweet spot óptimo). Estimularemos el sistema aeróbico con un trabajo de umbral que mejore tu capacidad pulmonar y VO2 Máx.`,
        routine: [
          { name: 'Calentamiento: Trote suave en Zona 2', sets: '1', reps: '10 min', intensity: 'Ritmo progresivo' },
          { name: 'Carrera a Ritmo de Tempo (Umbral)', sets: '1', reps: '20 min', intensity: 'Pulsaciones al 85% de tu FCmáx (Ritmo alegre)' },
          { name: 'Trote suave de recuperación final', sets: '1', reps: '5 min', intensity: 'Zona 1 (< 115 bpm)' }
        ]
      };
    }

    return {
      cardioACWR,
      strengthACWR,
      muscleRecency,
      recommendation
    };
  }, [workouts, acwrData]);

  return (
    <div className="predictors-container fade-in">
      <header className="predictors-header">
        <div>
          <h1 className="gradient-text text-3xl font-extrabold flex-center">
            <Sparkles size={26} className="text-primary animate-pulse" />
            Calculadoras de Rendimiento
          </h1>
          <p className="text-secondary text-sm">Simuladores deportivos para estimar marcas competitivas y pesos de entrenamiento ideales.</p>
        </div>
      </header>

      <div className="tab-switcher mb-5">
        <button
          type="button"
          onClick={() => setActiveCalculator('running')}
          className={`tab-btn ${activeCalculator === 'running' ? 'active-run' : ''}`}
        >
          🏃 Ritmos y VDOT (Daniels)
        </button>
        <button
          type="button"
          onClick={() => setActiveCalculator('gym')}
          className={`tab-btn ${activeCalculator === 'gym' ? 'active-gym' : ''}`}
        >
          🏋️ Fuerza (1RM)
        </button>
        <button
          type="button"
          onClick={() => setActiveCalculator('heartrate')}
          className={`tab-btn ${activeCalculator === 'heartrate' ? 'active-hr' : ''}`}
        >
          ❤️ Cardio (Tanaka)
        </button>
        <button
          type="button"
          onClick={() => setActiveCalculator('acwr')}
          className={`tab-btn ${activeCalculator === 'acwr' ? 'active-acwr' : ''}`}
        >
          📊 Carga Trabajo (ACWR)
        </button>
        <button
          type="button"
          onClick={() => setActiveCalculator('ai_coach')}
          className={`tab-btn ${activeCalculator === 'ai_coach' ? 'active-ai-coach' : ''}`}
        >
          🤖 Entrenador IA
        </button>
      </div>

      {/* RUNNING CALCULATIONS */}
      {activeCalculator === 'running' && (
        <div className="grid-panels">
          {/* Inputs Section */}
          <div className="glass-card panel-left" style={{ position: 'relative' }}>
            <h3 className="panel-title flex-center">
              <TrendingUp className="running-text" size={18} />
              Motor Predictor Fisiológico
            </h3>
            <p className="text-muted text-xs mb-3">Elige entre la estimación dinámica basada en tu historial de la base de datos o simula marcas ingresándolas manualmente.</p>
            
            {/* TOGGLE MODO PREDICCIÓN */}
            <div className="mode-toggle-container" style={{ display: 'flex', gap: '0.4rem', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', padding: '0.2rem', borderRadius: '10px', marginBottom: '1rem' }}>
              <button
                type="button"
                onClick={() => setRunningMode('history')}
                className={`mode-btn ${runningMode === 'history' ? 'active-history' : ''}`}
                style={{
                  flex: 1,
                  padding: '0.45rem',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '0.72rem',
                  fontWeight: '700',
                  cursor: 'pointer',
                  background: runningMode === 'history' ? 'rgba(16,185,129,0.12)' : 'transparent',
                  border: `1px solid ${runningMode === 'history' ? 'rgba(16,185,129,0.2)' : 'transparent'}`,
                  color: runningMode === 'history' ? '#10b981' : 'var(--text-muted)',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.35rem'
                }}
              >
                <Sparkles size={12} />
                Historial Sincronizado
              </button>
              <button
                type="button"
                onClick={() => setRunningMode('manual')}
                className={`mode-btn ${runningMode === 'manual' ? 'active-manual' : ''}`}
                style={{
                  flex: 1,
                  padding: '0.45rem',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '0.72rem',
                  fontWeight: '700',
                  cursor: 'pointer',
                  background: runningMode === 'manual' ? 'rgba(139,92,246,0.12)' : 'transparent',
                  border: `1px solid ${runningMode === 'manual' ? 'rgba(139,92,246,0.2)' : 'transparent'}`,
                  color: runningMode === 'manual' ? 'var(--color-primary)' : 'var(--text-muted)',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.35rem'
                }}
              >
                <TrendingUp size={12} />
                Simulador Manual
              </button>
            </div>

            {runningMode === 'manual' ? (
              <div className="animate-fade-in">
                <div className="form-group">
                  <label className="form-label">Distancia Recorrida (km)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={refDistance}
                    onChange={(e) => setRefDistance(e.target.value)}
                    className="form-input"
                    placeholder="Ej: 5"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Tiempo Logrado (HH : MM : SS)</label>
                  <div className="time-inputs-group">
                    <input
                      type="number"
                      min="0"
                      max="23"
                      placeholder="HH"
                      value={refHH}
                      onChange={(e) => setRefHH(e.target.value)}
                      className="form-input text-center"
                    />
                    <span className="time-separator">:</span>
                    <input
                      type="number"
                      min="0"
                      max="59"
                      placeholder="MM"
                      value={refMM}
                      onChange={(e) => setRefMM(e.target.value)}
                      className="form-input text-center"
                    />
                    <span className="time-separator">:</span>
                    <input
                      type="number"
                      min="0"
                      max="59"
                      placeholder="SS"
                      value={refSS}
                      onChange={(e) => setRefSS(e.target.value)}
                      className="form-input text-center"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="animate-fade-in">
                {historicalMetrics.totalRuns > 0 ? (
                  <div>
                    {/* Tarjetas de Métricas Consolidadas */}
                    <div className="dynamic-telemetry-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem', marginBottom: '0.85rem' }}>
                      <div className="telemetry-stat-card glass-card" style={{ padding: '0.65rem', textAlign: 'center', background: 'rgba(139,92,246,0.03)', border: '1px solid rgba(139,92,246,0.12)', borderRadius: '10px' }}>
                        <span style={{ fontSize: '0.6rem', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em', display: 'block' }}>VDOT Mecánico</span>
                        <h3 style={{ fontSize: '1.5rem', fontWeight: '800', margin: '0.1rem 0', color: '#fff', textShadow: '0 0 6px rgba(139,92,246,0.3)' }}>
                          {historicalMetrics.weightedVdot.toFixed(1)}
                        </h3>
                        <span style={{ fontSize: '0.55rem', color: 'var(--text-muted)' }}>Ponderación de Ritmos</span>
                      </div>
                      
                      <div className="telemetry-stat-card glass-card" style={{ padding: '0.65rem', textAlign: 'center', background: 'rgba(16,185,129,0.03)', border: '1px solid rgba(16,185,129,0.12)', borderRadius: '10px' }}>
                        <span style={{ fontSize: '0.6rem', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em', display: 'block' }}>VO2máx Cardíaco</span>
                        <h3 style={{ fontSize: '1.5rem', fontWeight: '800', margin: '0.1rem 0', color: '#fff', textShadow: '0 0 6px rgba(16,185,129,0.3)' }}>
                          {historicalMetrics.hasHRData ? historicalMetrics.weightedVo2MaxHR.toFixed(1) : 'N/A'}
                        </h3>
                        <span style={{ fontSize: '0.55rem', color: 'var(--text-muted)' }}>Eficiencia Cardíaca</span>
                      </div>
                    </div>

                    {/* Explicación de Fisiología e Insight */}
                    <div className="glass-card" style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '10px', marginBottom: '0.85rem' }}>
                      <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', marginBottom: '0.25rem' }}>
                        <Brain size={14} style={{ color: 'var(--color-running)' }} />
                        <span style={{ fontSize: '0.72rem', fontWeight: '700', color: '#fff' }}>Análisis Científico del Corredor</span>
                      </div>
                      <p style={{ margin: 0, fontSize: '0.65rem', color: 'var(--text-muted)', lineHeight: '1.35' }}>
                        {(() => {
                          const vdot = historicalMetrics.weightedVdot;
                          const vo2 = historicalMetrics.weightedVo2MaxHR;
                          if (!historicalMetrics.hasHRData) {
                            return "Tu VDOT histórico ponderado está calibrado en base a tus ritmos y duraciones de carrera en la base de datos, ponderando los últimos 30 días exponencialmente más fuerte. ¡Añade pulso cardíaco a tus sesiones running para activar el análisis cardiovascular dual!";
                          }
                          const diff = vo2 - vdot;
                          if (diff > 2.2) {
                            return `¡Excelente Eficiencia Cardiovascular! Tu VO2máx cardíaco (${vo2.toFixed(1)}) es notablemente superior a tu VDOT mecánico (${vdot.toFixed(1)}). Esto indica una base aeróbica sobresaliente, pero tu sistema neuromuscular tiene margen de mejora para transferir esa energía en velocidad pura. Añadir series de Zona 5 aumentará tu potencia.`;
                          } else if (diff < -2.2) {
                            return `¡Excelente Economía de Carrera! Tu VDOT de paso (${vdot.toFixed(1)}) supera significativamente tu VO2máx cardíaco (${vo2.toFixed(1)}). Corres rápido con bajo gasto, pero tus pulsaciones son elevadas. Entrenar más trotes en Zona 2 expandirá tu volumen sistólico y bajará tus pulsaciones base.`;
                          } else {
                            return `¡Perfil Simétrico Equilibrado! Tu VO2máx cardiovascular (${vo2.toFixed(1)}) y tu VDOT mecánico (${vdot.toFixed(1)}) están en perfecta armonía. Tu corazón y tus piernas progresan en sincronía absoluta. Sigue con el bloque actual.`;
                          }
                        })()}
                      </p>
                    </div>

                    {/* Gráfico SVG Burbujas Recencia */}
                    <div style={{ marginBottom: '0.5rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                        <span style={{ fontSize: '0.68rem', fontWeight: '700', color: '#fff', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <Cpu size={12} style={{ color: 'var(--color-primary)' }} />
                          Evolución VO2máx/VDOT (Últimos 12 Trotes)
                        </span>
                        <span style={{ fontSize: '0.55rem', color: 'var(--text-muted)' }}>Burbuja grande = Mayor peso</span>
                      </div>
                      
                      {(() => {
                        const chartRuns = (historicalMetrics.detailedRuns || []).slice(-12);
                        if (chartRuns.length === 0) return null;
                        
                        const allYVals = chartRuns.flatMap(r => [r.vdot, r.vo2MaxHR].filter(v => v !== null));
                        const minY = allYVals.length > 0 ? Math.min(...allYVals) - 1.5 : 30;
                        const maxY = allYVals.length > 0 ? Math.max(...allYVals) + 1.5 : 50;
                        const rangeY = maxY - minY || 5;

                        const getX = (idx) => 25 + (idx * (265 / (chartRuns.length - 1 || 1)));
                        const getY = (val) => 80 - ((val - minY) / rangeY) * 65;

                        return (
                          <div style={{ background: 'rgba(0,0,0,0.15)', padding: '0.5rem', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.03)' }}>
                            <svg viewBox="0 0 300 95" style={{ width: '100%', height: 'auto', display: 'block' }}>
                              {/* Líneas horizontales de cuadrícula */}
                              {[0.25, 0.5, 0.75].map((pct, i) => {
                                const valY = minY + rangeY * pct;
                                const yPos = getY(valY);
                                return (
                                  <g key={i}>
                                    <line x1="20" y1={yPos} x2="295" y2={yPos} stroke="rgba(255,255,255,0.04)" strokeDasharray="3" />
                                    <text x="5" y={yPos + 2.5} fill="rgba(255,255,255,0.25)" fontSize="5.5" fontFamily="monospace">{valY.toFixed(0)}</text>
                                  </g>
                                );
                              })}

                              {/* Dibujar Conexión / Tendencia */}
                              {chartRuns.length > 1 && (
                                <path
                                  d={chartRuns.map((r, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(r.vdot)}`).join(' ')}
                                  fill="none"
                                  stroke="rgba(139,92,246,0.15)"
                                  strokeWidth="1.5"
                                />
                              )}

                              {/* Dibujar Puntos/Burbujas */}
                              {chartRuns.map((r, i) => {
                                const xPos = getX(i);
                                return (
                                  <g key={r.id}>
                                    {/* Grid vertical */}
                                    <line x1={xPos} y1="10" x2={xPos} y2="82" stroke="rgba(255,255,255,0.02)" />
                                    
                                    {/* VDOT Mecánico (Violeta) */}
                                    <circle
                                      cx={xPos}
                                      cy={getY(r.vdot)}
                                      r={2.5 + 4.5 * r.weight}
                                      fill="#8b5cf6"
                                      opacity={0.3 + 0.7 * r.weight}
                                      stroke={hoveredWorkout?.id === r.id && hoveredWorkout?.activeType === 'vdot' ? '#fff' : 'rgba(139,92,246,0.6)'}
                                      strokeWidth={hoveredWorkout?.id === r.id && hoveredWorkout?.activeType === 'vdot' ? 1.5 : 0.5}
                                      style={{ cursor: 'pointer' }}
                                      onMouseEnter={() => setHoveredWorkout({ ...r, activeType: 'vdot', val: r.vdot })}
                                      onMouseLeave={() => setHoveredWorkout(null)}
                                    />

                                    {/* VO2Max Cardiovascular (Esmeralda) */}
                                    {r.vo2MaxHR !== null && (
                                      <circle
                                        cx={xPos}
                                        cy={getY(r.vo2MaxHR)}
                                        r={2.5 + 4.5 * r.weight}
                                        fill="#10b981"
                                        opacity={0.3 + 0.7 * r.weight}
                                        stroke={hoveredWorkout?.id === r.id && hoveredWorkout?.activeType === 'vo2max' ? '#fff' : 'rgba(16,185,129,0.6)'}
                                        strokeWidth={hoveredWorkout?.id === r.id && hoveredWorkout?.activeType === 'vo2max' ? 1.5 : 0.5}
                                        style={{ cursor: 'pointer' }}
                                        onMouseEnter={() => setHoveredWorkout({ ...r, activeType: 'vo2max', val: r.vo2MaxHR })}
                                        onMouseLeave={() => setHoveredWorkout(null)}
                                      />
                                    )}
                                  </g>
                                );
                              })}
                            </svg>

                            {/* Detalle interactivo en hover */}
                            {hoveredWorkout ? (
                              <div className="animate-fade-in" style={{ marginTop: '0.4rem', padding: '0.4rem', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '6px', fontSize: '0.62rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                  <strong style={{ color: '#fff' }}>Sesión {hoveredWorkout.date}</strong>: {hoveredWorkout.distance}k @ {hoveredWorkout.pace}
                                </div>
                                <div style={{ color: hoveredWorkout.activeType === 'vdot' ? '#c084fc' : '#34d399', fontWeight: 'bold' }}>
                                  {hoveredWorkout.activeType === 'vdot' ? 'VDOT' : 'VO2máx'}: {hoveredWorkout.val.toFixed(1)} (Peso: {(hoveredWorkout.weight * 100).toFixed(0)}%)
                                </div>
                              </div>
                            ) : (
                              <div style={{ marginTop: '0.4rem', fontSize: '0.55rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                                Pasa el cursor sobre los círculos para ver la telemetría del entrenamiento.
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                ) : (
                  <div className="calculator-info-box text-center" style={{ padding: '1rem', border: '1px dashed rgba(255,255,255,0.1)' }}>
                    <ShieldAlert size={18} style={{ color: 'var(--color-primary)', margin: '0 auto 0.5rem auto' }} />
                    <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                      No se encontraron entrenamientos running sincronizados en tu cuenta de Supabase. Añade algunos en tu diario de carrera para activar el análisis predictivo ponderado automático.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* VDOT DIAL CARD */}
            {vdotReference > 0 && (
              <div className="vdot-dial-box mt-3 mb-1">
                <div className="vdot-dial-circle">
                  <svg className="vdot-svg" viewBox="0 0 100 100">
                    <defs>
                      <linearGradient id="vdotGrad" x1="0%" y1="100%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#10b981" />
                        <stop offset="100%" stopColor="#3b82f6" />
                      </linearGradient>
                    </defs>
                    <circle className="vdot-track" cx="50" cy="50" r="40" />
                    <circle 
                      className="vdot-indicator" 
                      cx="50" 
                      cy="50" 
                      r="40" 
                      style={{
                        strokeDasharray: '251.2',
                        strokeDashoffset: `${251.2 - (251.2 * Math.min(100, Math.max(0, (vdotReference - 30) / 45)) / 100)}`
                      }}
                    />
                  </svg>
                  <div className="vdot-dial-value-container">
                    <span className="vdot-dial-label">{runningMode === 'history' ? 'VDOT Ponderado' : 'VDOT Manual'}</span>
                    <h2 className="vdot-dial-value font-extrabold">{vdotReference.toFixed(1)}</h2>
                    <span className="vdot-dial-unit">ml/kg/min</span>
                  </div>
                </div>

                {/* Élite Benchmarking Scale */}
                <div className="vdot-elite-scale mt-3">
                  <div className="flex justify-between items-center text-xs mb-1" style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                    <span className="font-semibold text-secondary" style={{ fontSize: '0.72rem' }}>Nivel Fisiológico:</span>
                    <span className="font-bold text-primary" style={{ fontSize: '0.72rem', color: '#10b981' }}>
                      {vdotReference < 35 ? 'Principiante' 
                       : vdotReference < 45 ? 'Recreacional' 
                       : vdotReference < 55 ? 'Entrenado' 
                       : vdotReference < 65 ? 'Avanzado' 
                       : vdotReference < 75 ? 'Élite Nacional' 
                       : 'Élite Internacional'}
                    </span>
                  </div>
                  <div className="dial-bar-track" style={{ height: '8px', background: 'rgba(255,255,255,0.06)' }}>
                    <div 
                      className="dial-bar-fill" 
                      style={{ 
                        width: `${Math.min(100, Math.max(0, ((vdotReference - 30) / 45) * 100))}%`,
                        background: 'linear-gradient(90deg, #10b981 0%, #3b82f6 50%, #8b5cf6 100%)',
                        boxShadow: '0 0 8px rgba(59, 130, 246, 0.4)'
                      }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-muted text-xs mt-1" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.62rem', width: '100%' }}>
                    <span>Recreacional (30)</span>
                    <span>Avanzado (55)</span>
                    <span>Olímpico (75+)</span>
                  </div>
                </div>
              </div>
            )}

            <div className="calculator-info-box">
              <Info size={16} className="text-primary-glow" style={{ flexShrink: 0, marginTop: '2px' }} />
              <p className="text-xs text-secondary leading-relaxed">
                <strong>¿Qué es VDOT?</strong> Es el índice de capacidad aeróbica máxima (VO2Máx efectivo) desarrollado por Jack Daniels. Determina tus ritmos óptimos de entrenamiento y predice marcas con una precisión científica impecable.
              </p>
            </div>
          </div>

          {/* Outputs Section */}
          <div className="panel-right-group">
            {/* Predictions Table */}
            <div className="glass-card">
              <h3 className="panel-title flex-center mb-3">
                <Award size={18} className="running-text" />
                Comparador Científico de Predicciones Running
              </h3>
              <p className="text-muted text-xs mb-3">Comparativa lado a lado entre la <strong>Fórmula Riegel Personalizada</strong> (que usa tu exponente de fatiga real) y el modelo <strong>Jack Daniels VDOT</strong>.</p>
              
              <table className="calculator-table">
                <thead>
                  <tr>
                    <th>Distancia Objetivo</th>
                    <th className="right">Riegel (Tu Fatiga)</th>
                    <th className="right">Daniels (VDOT)</th>
                  </tr>
                </thead>
                <tbody>
                  {racePredictions.map((pred, idx) => (
                    <tr key={idx} className={pred.distance.toString() === refDistance ? 'reference-row' : ''}>
                      <td>
                        <strong>{pred.name}</strong> ({pred.distance}k)
                        {pred.vdotLossPct > 0 && (
                          <div style={{ fontSize: '0.62rem', color: '#c084fc', marginTop: '2px', fontWeight: 600 }}>
                            {pred.vdotLossPct}% pérdida VDOT
                          </div>
                        )}
                      </td>
                      <td className="right">
                        <div className="flex flex-col items-end" style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                          <span className="text-primary font-bold animate-pulse" style={{ color: 'var(--color-primary)', fontSize: '0.95rem' }}>{pred.riegelTime}</span>
                          <span className="text-secondary text-xs" style={{ fontSize: '0.68rem', opacity: 0.85 }}>{pred.riegelPace}</span>
                        </div>
                      </td>
                      <td className="right text-secondary">
                        <div className="flex flex-col items-end" style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                          <span className="font-bold" style={{ color: '#10b981', fontSize: '0.95rem' }}>{pred.time}</span>
                          <span className="text-muted text-xs" style={{ fontSize: '0.65rem', opacity: 0.7 }}>{pred.pace}</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pace Zones Cards */}
            <div className="glass-card">
              <h3 className="panel-title flex-center mb-3">
                <Zap size={18} className="running-text" />
                Zonas de Ritmo Científicas de Jack Daniels
              </h3>
              
              <div className="zones-card-grid">
                {paceZones.map((zone, idx) => (
                  <div key={idx} className="zone-card" style={{ gap: '0.25rem' }}>
                    <div className="zone-card-header">
                      <span className="zone-name" style={{ fontSize: '0.85rem' }}>{zone.name}</span>
                      <span className="zone-percentage" style={{ fontSize: '0.7rem', color: '#10b981' }}>{zone.range}</span>
                    </div>
                    <div className="zone-pace-range" style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--color-running)' }}>
                      {zone.paceMin} - {zone.paceMax}
                    </div>
                    <div className="zone-hr-range font-bold text-xs" style={{ color: '#f87171', fontSize: '0.72rem', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      ❤️ Rango Cardíaco: {zone.hrRange}
                    </div>
                    <p className="zone-desc mt-1" style={{ fontSize: '0.72rem', color: 'var(--text-muted)', lineHeight: '1.3' }}>{zone.description}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Holographic Physiological Realism Analysis Panel */}
            <div className="glass-card physiological-realism-card">
              <div className="flex justify-between items-start mb-3" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <span className={`ai-recommendation-badge mb-2 ${exponentDetails.hasCalculatedFromRecords ? 'bg-green-glow' : 'bg-purple-glow'}`}>
                    {exponentDetails.hasCalculatedFromRecords ? '🏆 CALIBRADO DE RÉCORDS REALES' : '🔬 ESTIMADO POR BIOMETRÍA & VOLUMEN'}
                  </span>
                  <h3 className="gradient-text font-extrabold text-xl mt-1" style={{ fontSize: '1.4rem', margin: '0.25rem 0 0 0' }}>
                    Análisis de Realismo Fisiológico
                  </h3>
                </div>
                <Cpu className="ai-coach-glow-text animate-pulse" style={{ color: 'var(--color-primary)' }} size={24} />
              </div>
              
              <p className="text-secondary text-sm mb-4 leading-relaxed">
                {exponentDetails.hasCalculatedFromRecords ? (
                  <>
                    ¡Éxito! Hemos autocalibrado tu **Exponente de Fatiga Aeróbica de Riegel** real a <strong className="text-primary-glow" style={{ color: 'var(--color-primary)' }}>{exponentDetails.finalExponent}</strong> analizando tus mejores marcas históricas logradas en: <strong className="text-primary-glow" style={{ color: '#10b981' }}>{exponentDetails.recordsUsed.map(r => `${r.name} (${(r.distance).toFixed(1)}k)`).join(', ')}</strong>.
                  </>
                ) : (
                  <>
                    Tu exponente clásico de fatiga de Riegel de <strong>1.06</strong> ha sido estimado fisiológicamente a <strong className="text-primary-glow" style={{ color: 'var(--color-primary)' }}>{exponentDetails.finalExponent}</strong> basándose en tu volumen acumulado en los últimos 30 días, IMC y salud cardíaca.
                  </>
                )}
              </p>

              {/* Exponent Comparison Meter */}
              <div className="exponent-comparison-container mb-4">
                <div className="comparison-bar-track">
                  <div className="comparison-bar-fill-base" style={{ width: '40%' }}></div>
                  <div 
                    className="comparison-bar-fill-custom" 
                    style={{ 
                      width: `${Math.min(100, Math.max(0, ((exponentDetails.finalExponent - 1.0) / 0.25) * 100))}%` 
                    }}
                  ></div>
                </div>
                <div className="flex justify-between text-xs font-bold mt-1" style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                  <span className="text-secondary" style={{ fontSize: '0.72rem' }}>Resistencia Élite (1.01)</span>
                  <span className="text-primary font-bold" style={{ fontSize: '0.72rem', color: 'var(--color-primary)' }}>Tu Exponente ({exponentDetails.finalExponent})</span>
                  <span className="text-muted" style={{ fontSize: '0.72rem' }}>Déficit Aeróbico (1.18+)</span>
                </div>
              </div>

              {/* Telemetry Progress Bars */}
              <div className="telemetry-bars-grid mb-4">
                {/* 1. Volume (30d Runs) */}
                <div className="telemetry-bar-item">
                  <div className="flex justify-between items-center text-xs mb-1" style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span className="font-semibold text-secondary">Volumen Running (30d)</span>
                    <span className="font-bold" style={{ color: exponentDetails.totalKm30d >= 40 ? '#10b981' : '#eab308' }}>
                      {exponentDetails.totalKm30d} km ({exponentDetails.volumePenalty > 0 ? `+${exponentDetails.volumePenalty.toFixed(2)}` : 'Óptimo'})
                    </span>
                  </div>
                  <div className="dial-bar-track">
                    <div 
                      className="dial-bar-fill" 
                      style={{ 
                        width: `${Math.min(100, (exponentDetails.totalKm30d / 80) * 100)}%`,
                        backgroundColor: exponentDetails.totalKm30d >= 80 ? '#10b981' : exponentDetails.totalKm30d >= 40 ? '#06b6d4' : exponentDetails.totalKm30d >= 15 ? '#eab308' : '#ef4444'
                      }}
                    ></div>
                  </div>
                </div>

                {/* 2. BMI */}
                <div className="telemetry-bar-item">
                  <div className="flex justify-between items-center text-xs mb-1" style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span className="font-semibold text-secondary">Masa Fisiológica (IMC)</span>
                    <span className="font-bold" style={{ color: exponentDetails.bmi <= 25 ? '#10b981' : '#ec4899' }}>
                      {exponentDetails.bmi} ({exponentDetails.bmiPenalty > 0 ? `+${exponentDetails.bmiPenalty.toFixed(3)}` : 'Óptimo'})
                    </span>
                  </div>
                  <div className="dial-bar-track">
                    <div 
                      className="dial-bar-fill" 
                      style={{ 
                        width: `${Math.min(100, (exponentDetails.bmi / 35) * 100)}%`,
                        backgroundColor: exponentDetails.bmi <= 25 ? '#10b981' : exponentDetails.bmi <= 29.9 ? '#eab308' : '#ec4899'
                      }}
                    ></div>
                  </div>
                </div>

                {/* 3. Resting HR */}
                <div className="telemetry-bar-item">
                  <div className="flex justify-between items-center text-xs mb-1" style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span className="font-semibold text-secondary">Cardio Reposo (FC reposo)</span>
                    <span className="font-bold" style={{ color: exponentDetails.restingHR <= 55 ? '#10b981' : '#06b6d4' }}>
                      {exponentDetails.restingHR} bpm ({exponentDetails.hrPenalty > 0 ? `+${exponentDetails.hrPenalty.toFixed(3)}` : exponentDetails.hrPenalty < 0 ? `-${Math.abs(exponentDetails.hrPenalty).toFixed(2)}` : 'Óptimo'})
                    </span>
                  </div>
                  <div className="dial-bar-track">
                    <div 
                      className="dial-bar-fill" 
                      style={{ 
                        width: `${Math.min(100, (exponentDetails.restingHR / 100) * 100)}%`,
                        backgroundColor: exponentDetails.restingHR <= 55 ? '#10b981' : exponentDetails.restingHR <= 70 ? '#06b6d4' : '#eab308'
                      }}
                    ></div>
                  </div>
                </div>

                {/* 4. Age & Gender */}
                <div className="telemetry-bar-item">
                  <div className="flex justify-between items-center text-xs mb-1" style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span className="font-semibold text-secondary">Estimado Biométrico</span>
                    <span className="font-bold" style={{ color: '#a855f7' }}>
                      {exponentDetails.biometricExponent} exponente
                    </span>
                  </div>
                  <div className="dial-bar-track">
                    <div 
                      className="dial-bar-fill" 
                      style={{ 
                        width: `${Math.min(100, ((exponentDetails.biometricExponent - 1.0) / 0.25) * 100)}%`,
                        backgroundColor: '#a855f7'
                      }}
                    ></div>
                  </div>
                </div>
              </div>

              {/* Sports-Medicine Diagnostics Box */}
              <div className="ai-science-alert">
                <div className="alert-glow"></div>
                <div className="flex gap-2" style={{ display: 'flex', gap: '0.5rem' }}>
                  <Brain size={18} className="ai-coach-glow-text" style={{ flexShrink: 0, marginTop: '2px', color: 'var(--color-primary)' }} />
                  <p className="text-xs text-secondary leading-relaxed" style={{ margin: 0 }}>
                    <strong>Prescripción Científica VDOT & Riegel:</strong> {exponentDetails.recommendation}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* GYM CALCULATIONS */}
      {activeCalculator === 'gym' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%' }}>
          <div className="grid-panels">
            {/* Inputs Section */}
            <div className="glass-card panel-left">
              <h3 className="panel-title flex-center">
                <Dumbbell className="gym-text" size={18} />
                Carga Máxima de Referencia
              </h3>
              <p className="text-muted text-xs mb-4">Ingresa tu peso levantado y repeticiones al fallo técnico para proyectar tu fuerza máxima.</p>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '1rem' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Peso (kg)</label>
                  <input
                    type="number"
                    value={refWeight}
                    onChange={(e) => setRefWeight(e.target.value)}
                    className="form-input"
                    placeholder="Ej: 80"
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Repeticiones</label>
                  <input
                    type="number"
                    min="1"
                    max="30"
                    value={refReps}
                    onChange={(e) => setRefReps(e.target.value)}
                    className="form-input"
                    placeholder="Ej: 8"
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Esfuerzo (RPE)</label>
                  <select
                    value={refRpe}
                    onChange={(e) => setRefRpe(e.target.value)}
                    className="form-input"
                    style={{ background: 'rgba(15,15,22,0.8)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', color: '#fff', height: '100%', fontSize: '0.75rem' }}
                  >
                    <option value="10">RPE 10 (0 RIR)</option>
                    <option value="9.5">RPE 9.5</option>
                    <option value="9">RPE 9 (1 RIR)</option>
                    <option value="8.5">RPE 8.5</option>
                    <option value="8">RPE 8 (2 RIR)</option>
                    <option value="7.5">RPE 7.5</option>
                    <option value="7">RPE 7 (3 RIR)</option>
                    <option value="6">RPE 6 (4 RIR)</option>
                    <option value="5">RPE 5 (5 RIR)</option>
                  </select>
                </div>
              </div>

              <div className="calculated-1rm-box mb-4">
                <span className="label text-muted">1RM Máximo Estimado</span>
                <h2 className="value gym-text font-extrabold">{estimated1RM.toFixed(1)} <span className="unit">kg</span></h2>
                <span className="subtext">Fórmula Científica Epley & Brzycki Ponderada</span>
              </div>

              {/* Slider custom weight simulator */}
              <div className="custom-slider-card">
                <div className="slider-header">
                  <span className="slider-title font-bold text-sm">Simulador de Porcentaje</span>
                  <span className="slider-value text-primary font-bold">{customPct}% 1RM</span>
                </div>
                <input
                  type="range"
                  min="40"
                  max="100"
                  step="5"
                  value={customPct}
                  onChange={(e) => setCustomPct(parseInt(e.target.value))}
                  className="custom-range-slider"
                  style={{
                    '--slider-thumb-color': 'var(--color-gym)',
                    '--slider-thumb-shadow': 'rgba(236, 72, 153, 0.5)'
                  }}
                />
                <div className="slider-result">
                  <span>Peso Objetivo:</span>
                  <strong className="gym-text">{getCustomWeight()} kg</strong>
                </div>
              </div>
              
              <div className="calculator-info-box mt-3">
                <Info size={16} className="text-primary-glow" style={{ flexShrink: 0, marginTop: '2px' }} />
                <p className="text-xs text-secondary leading-relaxed">
                  <strong>¿Cómo entrenar con 1RM?</strong> Conocer tu 1RM estimado te permite programar tus series de forma científica sin arriesgarte al fallo lesivo en series reales de 1 repetición.
                </p>
              </div>
            </div>

            {/* Outputs Section */}
            <div className="glass-card panel-right">
              <h3 className="panel-title flex-center mb-3">
                <Award size={18} className="gym-text" />
                Pesos de Entrenamiento Recomendados
              </h3>
              
              <table className="calculator-table">
                <thead>
                  <tr>
                    <th>Meta de Entrenamiento</th>
                    <th className="center">Carga %</th>
                    <th>Repeticiones</th>
                    <th className="right">Peso Sugerido</th>
                  </tr>
                </thead>
                <tbody>
                  {gymRecommendations.map((rec, idx) => (
                    <tr key={idx}>
                      <td>
                        <div className="rec-goal-name"><strong>{rec.name}</strong></div>
                        <div className="rec-goal-desc text-muted text-xs">{rec.purpose}</div>
                      </td>
                      <td className="center text-secondary">{rec.pctMin}% - {rec.pctMax}%</td>
                      <td>{rec.reps}</td>
                      <td className="right text-primary font-bold">{rec.weightRange}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* DYNAMIC STRENGTH PROGRESSION CHART (1RM) */}
          <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="flex justify-between items-center" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <span className="ai-recommendation-badge mb-1 bg-gym-badge">📈 HISTORIAL DE FUERZA DEPORTIVA</span>
                <h3 className="gradient-text font-extrabold text-xl" style={{ fontSize: '1.4rem', margin: '0.2rem 0' }}>
                  Progresión Histórica de 1RM
                </h3>
                <p className="text-secondary text-xs">Récords personales calculados mediante la fórmula de Epley a lo largo de tu historial de entrenamiento.</p>
              </div>

              {/* Selector de ejercicio pills */}
              <div className="gym-exercise-selector" style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => { setActiveGymExercise('bench_press'); setHoveredGymPoint(null); }}
                  className={`gym-pill-btn ${activeGymExercise === 'bench_press' ? 'active-bench' : ''}`}
                >
                  Press de Banca
                </button>
                <button
                  type="button"
                  onClick={() => { setActiveGymExercise('squat'); setHoveredGymPoint(null); }}
                  className={`gym-pill-btn ${activeGymExercise === 'squat' ? 'active-squat' : ''}`}
                >
                  Sentadilla Libre
                </button>
                <button
                  type="button"
                  onClick={() => { setActiveGymExercise('deadlift'); setHoveredGymPoint(null); }}
                  className={`gym-pill-btn ${activeGymExercise === 'deadlift' ? 'active-deadlift' : ''}`}
                >
                  Peso Muerto
                </button>
              </div>
            </div>

            {(() => {
              const currentHistory = strengthHistory[activeGymExercise] || [];
              const isMock = currentHistory.length === 0;

              // If mock, generate beautiful synthetic data points to wow the user!
              const displayHistory = !isMock ? currentHistory : [
                { date: 'Hace 5 semanas', oneRepMax: activeGymExercise === 'bench_press' ? 60 : activeGymExercise === 'squat' ? 70 : 80, weight: activeGymExercise === 'bench_press' ? 45 : activeGymExercise === 'squat' ? 50 : 60, reps: 10, isSynthetic: true },
                { date: 'Hace 4 semanas', oneRepMax: activeGymExercise === 'bench_press' ? 64 : activeGymExercise === 'squat' ? 76 : 88, weight: activeGymExercise === 'bench_press' ? 48 : activeGymExercise === 'squat' ? 57 : 66, reps: 10, isSynthetic: true },
                { date: 'Hace 3 semanas', oneRepMax: activeGymExercise === 'bench_press' ? 68 : activeGymExercise === 'squat' ? 82 : 95, weight: activeGymExercise === 'bench_press' ? 55 : activeGymExercise === 'squat' ? 65 : 75, reps: 8, isSynthetic: true },
                { date: 'Hace 2 semanas', oneRepMax: activeGymExercise === 'bench_press' ? 72 : activeGymExercise === 'squat' ? 88 : 101, weight: activeGymExercise === 'bench_press' ? 60 : activeGymExercise === 'squat' ? 70 : 80, reps: 8, isSynthetic: true },
                { date: 'Hoy', oneRepMax: activeGymExercise === 'bench_press' ? 76 : activeGymExercise === 'squat' ? 95 : 110, weight: activeGymExercise === 'bench_press' ? 65 : activeGymExercise === 'squat' ? 80 : 95, reps: 6, isSynthetic: true }
              ];

              // SVG layout sizing
              const width = 800;
              const height = 280;
              const margin = { top: 30, right: 40, bottom: 40, left: 60 };
              const chartWidth = width - margin.left - margin.right;
              const chartHeight = height - margin.top - margin.bottom;

              const values = displayHistory.map(d => d.oneRepMax);
              const maxVal = Math.max(...values, 80);
              const minVal = Math.min(...values, 0);
              const padVal = (maxVal - minVal) * 0.15 || 10;
              const yMax = maxVal + padVal;
              const yMin = Math.max(0, minVal - padVal);

              // Calculate point coordinates
              const points = displayHistory.map((pt, i) => {
                const x = margin.left + (i * chartWidth) / (displayHistory.length - 1 || 1);
                const y = margin.top + chartHeight - ((pt.oneRepMax - yMin) * chartHeight) / (yMax - yMin || 1);
                return { ...pt, x, y };
              });

              // Construct path
              const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
              const areaPath = points.length > 0 ? `${linePath} L ${points[points.length - 1].x} ${margin.top + chartHeight} L ${points[0].x} ${margin.top + chartHeight} Z` : '';

              const activePoint = hoveredGymPoint !== null ? points[hoveredGymPoint] : null;

              return (
                <div style={{ position: 'relative', width: '100%' }}>
                  {isMock && (
                    <div className="gym-mock-warning" style={{ 
                      position: 'absolute', 
                      top: '12px', 
                      left: '50%', 
                      transform: 'translateX(-50%)', 
                      zIndex: 10,
                      background: 'rgba(236, 72, 153, 0.08)',
                      border: '1px solid rgba(236, 72, 153, 0.3)',
                      borderRadius: '8px',
                      padding: '6px 16px',
                      fontSize: '0.75rem',
                      color: '#f472b6',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      backdropFilter: 'blur(8px)',
                      pointerEvents: 'none'
                    }}>
                      <Info size={14} />
                      <span>Mostrando curva proyectada de ejemplo. ¡Registra tus entrenamientos de gimnasio en la Bitácora para ver tus datos reales!</span>
                    </div>
                  )}

                  {/* SVG Canvas */}
                  <svg 
                    viewBox={`0 0 ${width} ${height}`} 
                    style={{ width: '100%', height: 'auto', background: 'rgba(0,0,0,0.1)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.02)' }}
                    onMouseMove={(e) => handleGymMouseMove(e, points)}
                    onMouseLeave={() => setHoveredGymPoint(null)}
                  >
                    <defs>
                      <linearGradient id="gymLineGrad" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#ec4899" />
                        <stop offset="100%" stopColor="#8b5cf6" />
                      </linearGradient>
                      <linearGradient id="gymAreaGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#ec4899" stopOpacity="0.25" />
                        <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.00" />
                      </linearGradient>
                    </defs>

                    {/* Horizontal Gridlines */}
                    {[0, 1, 2, 3].map((val) => {
                      const gridYValue = yMin + (val * (yMax - yMin)) / 3;
                      const y = margin.top + chartHeight - ((gridYValue - yMin) * chartHeight) / (yMax - yMin || 1);
                      return (
                        <g key={val}>
                          <line 
                            x1={margin.left} 
                            y1={y} 
                            x2={width - margin.right} 
                            y2={y} 
                            stroke="rgba(255,255,255,0.05)" 
                            strokeDasharray={val === 0 ? "0" : "4 4"}
                          />
                          <text 
                            x={margin.left - 10} 
                            y={y + 4} 
                            fill="rgba(255,255,255,0.4)" 
                            fontSize="10" 
                            textAnchor="end"
                            fontFamily="monospace"
                          >
                            {Math.round(gridYValue)} kg
                          </text>
                        </g>
                      );
                    })}

                    {/* Shaded Area Under Curve */}
                    {points.length > 0 && (
                      <path d={areaPath} fill="url(#gymAreaGrad)" />
                    )}

                    {/* Active hover vertical line */}
                    {activePoint && (
                      <line 
                        x1={activePoint.x} 
                        y1={margin.top} 
                        x2={activePoint.x} 
                        y2={margin.top + chartHeight} 
                        stroke="rgba(236, 72, 153, 0.25)" 
                        strokeWidth="1.5" 
                        strokeDasharray="3 3"
                      />
                    )}

                    {/* Main Line Curve */}
                    {points.length > 0 && (
                      <path 
                        d={linePath} 
                        fill="none" 
                        stroke="url(#gymLineGrad)" 
                        strokeWidth="3.5" 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                      />
                    )}

                    {/* Data Points */}
                    {points.map((p, i) => (
                      <circle 
                        key={i} 
                        cx={p.x} 
                        cy={p.y} 
                        r={activePoint && activePoint.x === p.x ? 7 : 4} 
                        fill={activePoint && activePoint.x === p.x ? '#ffffff' : '#ec4899'} 
                        stroke="#0f0f16" 
                        strokeWidth="2.5" 
                        style={{ transition: 'r 0.1s ease, fill 0.1s ease', cursor: 'pointer' }}
                      />
                    ))}

                    {/* X-axis labels (Dates) */}
                    {points.map((p, i) => {
                      if (points.length > 8 && i % 2 !== 0 && i !== points.length - 1) return null;
                      return (
                        <text 
                          key={i} 
                          x={p.x} 
                          y={height - margin.bottom + 20} 
                          fill="rgba(255,255,255,0.4)" 
                          fontSize="9" 
                          textAnchor="middle"
                          fontFamily="sans-serif"
                        >
                          {p.date}
                        </text>
                      );
                    })}
                  </svg>

                  {/* Glassmorphic Interactive Tooltip */}
                  {activePoint && (
                    <div className="gym-tooltip-card" style={{
                      position: 'absolute',
                      left: `${(activePoint.x / width) * 100}%`,
                      top: `${Math.max(10, (activePoint.y / height) * 100 - 45)}%`,
                      transform: 'translate(-50%, -100%)',
                      pointerEvents: 'none',
                      zIndex: 100,
                      background: 'rgba(15, 15, 22, 0.85)',
                      border: '1px solid rgba(236, 72, 153, 0.4)',
                      borderRadius: '10px',
                      padding: '10px 14px',
                      color: '#ffffff',
                      fontSize: '0.75rem',
                      minWidth: '150px',
                      boxShadow: '0 8px 24px rgba(236, 72, 153, 0.15)',
                      backdropFilter: 'blur(10px)',
                      transition: 'left 0.1s ease, top 0.1s ease'
                    }}>
                      <div className="font-bold flex-center justify-between" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '4px' }}>
                        <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.65rem' }}>{activePoint.date}</span>
                        {activePoint.isSynthetic && <span style={{ color: '#ec4899', fontSize: '0.6', background: 'rgba(236, 72, 153, 0.12)', padding: '1px 4px', borderRadius: '4px' }}>Simulado</span>}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#f472b6' }}>{activePoint.exName || (activeGymExercise === 'bench_press' ? 'Press de Banca' : activeGymExercise === 'squat' ? 'Sentadilla' : 'Peso Muerto')}</span>
                        <span style={{ color: 'rgba(255,255,255,0.85)' }}>
                          Entrenamiento: <strong>{activePoint.weight} kg</strong> × <strong>{activePoint.reps} reps</strong>
                        </span>
                        <span style={{ color: '#a855f7', fontWeight: 'bold', marginTop: '2px' }}>
                          1RM Máximo: <span style={{ fontSize: '0.9rem' }}>{activePoint.oneRepMax} kg</span>
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>

          {/* TENDENCIA NEUROMUSCULAR & DETECTOR DE ESTANCAMIENTO */}
          <div className="glass-card" style={{ 
            padding: '1.5rem', 
            border: `1px solid ${neuromuscularAdaptation.borderColor}`, 
            boxShadow: `0 0 15px ${neuromuscularAdaptation.glowColor}`,
            position: 'relative',
            overflow: 'hidden'
          }}>
            <div className="flex justify-between items-start mb-3" style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div>
                <span className="ai-recommendation-badge mb-1" style={{ 
                  backgroundColor: neuromuscularAdaptation.borderColor, 
                  color: neuromuscularAdaptation.color, 
                  border: `1px solid ${neuromuscularAdaptation.color}`,
                  padding: '2px 8px',
                  borderRadius: '6px',
                  fontSize: '9px',
                  fontWeight: 'bold',
                  display: 'inline-block'
                }}>
                  {neuromuscularAdaptation.badge}
                </span>
                <h3 className="gradient-text font-extrabold text-lg style-none" style={{ fontSize: '1.25rem', margin: '0.2rem 0' }}>
                  Asistente de Adaptación Neuromuscular
                </h3>
              </div>
              {neuromuscularAdaptation.status !== 'Necesita Más Datos' && (
                <div className="text-right" style={{ textAlign: 'right' }}>
                  <span className="text-muted text-xs block" style={{ display: 'block', fontSize: '10px' }}>Tendencia (Últimas semanas)</span>
                  <strong style={{ 
                    color: neuromuscularAdaptation.trendPct >= 0 ? '#10b981' : '#f87171', 
                    fontSize: '1.2rem', 
                    fontWeight: 800 
                  }}>
                    {neuromuscularAdaptation.trendPct >= 0 ? `+${neuromuscularAdaptation.trendPct}` : neuromuscularAdaptation.trendPct}%
                  </strong>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', padding: '12px', border: '1px solid rgba(255,255,255,0.04)' }}>
              <Brain size={20} style={{ color: neuromuscularAdaptation.color, flexShrink: 0, marginTop: '2px' }} />
              <p className="text-xs text-secondary leading-relaxed" style={{ margin: 0 }}>
                {neuromuscularAdaptation.advice}
              </p>
            </div>
            
            {/* Stats Comparativas */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
              {(() => {
                const currentHistory = strengthHistory[activeGymExercise] || [];
                const realMax1RM = currentHistory.length > 0 ? Math.max(...currentHistory.map(p => p.oneRepMax)) : 0;
                const reference1RM = realMax1RM > 0 ? realMax1RM : estimated1RM;
                
                return (
                  <>
                    <div style={{ background: 'rgba(0,0,0,0.15)', borderRadius: '8px', padding: '10px', border: '1px solid rgba(255,255,255,0.02)' }}>
                      <span className="text-muted text-xxs block uppercase tracking-wider" style={{ display: 'block', fontSize: '9px', letterSpacing: '0.05em', color: 'rgba(255,255,255,0.4)' }}>Récord 1RM Histórico</span>
                      <strong className="gym-text text-sm block" style={{ fontSize: '1.1rem', marginTop: '2px', display: 'block' }}>
                        {realMax1RM > 0 ? `${realMax1RM.toFixed(1)} kg` : 'Sin registros reales'}
                      </strong>
                    </div>
                    <div style={{ background: 'rgba(0,0,0,0.15)', borderRadius: '8px', padding: '10px', border: '1px solid rgba(255,255,255,0.02)' }}>
                      <span className="text-muted text-xxs block uppercase tracking-wider" style={{ display: 'block', fontSize: '9px', letterSpacing: '0.05em', color: 'rgba(255,255,255,0.4)' }}>1RM Referencia Activo</span>
                      <strong className="text-primary text-sm block" style={{ fontSize: '1.1rem', marginTop: '2px', display: 'block' }}>
                        {reference1RM.toFixed(1)} kg
                      </strong>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>

          {/* CURVA DE FUERZA-VELOCIDAD Y PERFIL DE POTENCIA */}
          <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div>
              <span className="ai-recommendation-badge mb-1 bg-gym-badge">⚡ PERFIL DE FUERZA-VELOCIDAD y POTENCIA</span>
              <h3 className="gradient-text font-extrabold text-xl" style={{ fontSize: '1.4rem', margin: '0.2rem 0' }}>
                Curva de Fuerza-Velocidad
              </h3>
              <p className="text-secondary text-xs leading-relaxed">
                Modelado biomecánico de velocidad media propulsiva (MPV) y potencia teórica estimada sobre tu 1RM de referencia.
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
              {(() => {
                const currentHistory = strengthHistory[activeGymExercise] || [];
                const realMax1RM = currentHistory.length > 0 ? Math.max(...currentHistory.map(p => p.oneRepMax)) : 0;
                const reference1RM = realMax1RM > 0 ? realMax1RM : estimated1RM;
                const fvProfile = getForceVelocityProfile(reference1RM);
                
                // Filtrar perfil a repeticiones clave (1, 3, 5, 8, 10, 12) para simpleza y legibilidad
                const keyReps = [1, 3, 5, 8, 10, 12];
                const displayProfile = fvProfile.filter(p => keyReps.includes(p.reps));

                return displayProfile.map((p, idx) => (
                  <div 
                    key={idx} 
                    style={{ 
                      background: p.isPeakPowerZone ? 'rgba(236,72,153,0.05)' : 'rgba(255,255,255,0.01)',
                      border: p.isPeakPowerZone ? '1px solid rgba(236, 72, 153, 0.25)' : '1px solid rgba(255,255,255,0.03)',
                      borderRadius: '10px',
                      padding: '12px 14px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                      position: 'relative',
                      boxShadow: p.isPeakPowerZone ? '0 0 10px rgba(236,72,153,0.05)' : 'none',
                      transition: 'transform 0.2s ease, border-color 0.2s ease',
                      cursor: 'default'
                    }}
                    className="fv-profile-card"
                  >
                    {p.isPeakPowerZone && (
                      <span style={{ 
                        position: 'absolute', 
                        top: '8px', 
                        right: '8px', 
                        fontSize: '8px', 
                        background: 'rgba(236, 72, 153, 0.15)', 
                        color: '#f472b6', 
                        border: '1px solid rgba(236, 72, 153, 0.3)',
                        borderRadius: '4px',
                        padding: '1px 5px',
                        fontWeight: 'bold'
                      }}>
                        PICO POTENCIA 💥
                      </span>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <strong style={{ fontSize: '0.9rem', color: p.isPeakPowerZone ? '#f472b6' : 'rgba(255,255,255,0.85)' }}>
                        {p.reps} {p.reps === 1 ? 'Repetición' : 'Repeticiones'}
                      </strong>
                      <span className="text-muted text-xxs font-bold" style={{ fontSize: '9px', color: 'rgba(255,255,255,0.45)' }}>{p.pct}% 1RM</span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                      <span className="text-secondary text-xs" style={{ fontSize: '11px' }}>Carga teórica:</span>
                      <strong className="gym-text" style={{ fontSize: '1.05rem' }}>{p.weight.toFixed(1)} kg</strong>
                    </div>

                    {/* Velocity bar */}
                    <div>
                      <div className="flex justify-between items-center text-xxs mb-1" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px' }}>
                        <span className="text-muted" style={{ color: 'rgba(255,255,255,0.4)' }}>Velocidad (MPV)</span>
                        <strong style={{ color: '#06b6d4' }}>{p.mpv.toFixed(2)} m/s</strong>
                      </div>
                      <div className="dial-bar-track" style={{ height: '4px', background: 'rgba(255,255,255,0.03)', borderRadius: '2px' }}>
                        <div 
                          className="dial-bar-fill" 
                          style={{ 
                            width: `${Math.min(100, (p.mpv / 1.5) * 100)}%`,
                            backgroundColor: '#06b6d4',
                            height: '100%',
                            borderRadius: '2px'
                          }}
                        ></div>
                      </div>
                    </div>

                    {/* Power bar */}
                    <div>
                      <div className="flex justify-between items-center text-xxs mb-1" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px' }}>
                        <span className="text-muted" style={{ color: 'rgba(255,255,255,0.4)' }}>Potencia Estimada</span>
                        <strong style={{ color: '#a855f7' }}>{p.powerWatts} W</strong>
                      </div>
                      <div className="dial-bar-track" style={{ height: '4px', background: 'rgba(255,255,255,0.03)', borderRadius: '2px' }}>
                        <div 
                          className="dial-bar-fill" 
                          style={{ 
                            width: `${Math.min(100, (p.powerWatts / (reference1RM * 12 || 1)) * 100)}%`,
                            backgroundColor: p.isPeakPowerZone ? '#ec4899' : '#a855f7',
                            boxShadow: p.isPeakPowerZone ? '0 0 6px rgba(236,72,153,0.5)' : 'none',
                            height: '100%',
                            borderRadius: '2px'
                          }}
                        ></div>
                      </div>
                    </div>
                  </div>
                ));
              })()}
            </div>
            
            {(() => {
              const currentHistory = strengthHistory[activeGymExercise] || [];
              const realMax1RM = currentHistory.length > 0 ? Math.max(...currentHistory.map(p => p.oneRepMax)) : 0;
              const reference1RM = realMax1RM > 0 ? realMax1RM : estimated1RM;
              const fvProfile = getForceVelocityProfile(reference1RM);
              const peaks = fvProfile.filter(p => p.isPeakPowerZone);
              const peaksReps = peaks.map(p => `${p.reps} reps`).join(' o ');
              const peaksPcts = peaks.map(p => `${p.pct}%`).join('-');

              return (
                <div className="calculator-info-box" style={{ marginTop: '0.25rem', display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                  <Zap size={14} className="text-secondary-glow" style={{ color: '#ec4899', flexShrink: 0, marginTop: '2px' }} />
                  <p className="text-xxs text-secondary leading-relaxed" style={{ margin: 0, fontSize: '10px' }}>
                    <strong>Metodología de Transferencia:</strong> El entrenamiento con cargas que maximizan la potencia mecánica ({peaksReps} al {peaksPcts}) desarrolla la tasa de reclutamiento neuromuscular rápida. Esto tiene transferencia directa para mejorar el sprint final en running y aumentar la economía de zancada.
                  </p>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* HEART RATE CALCULATIONS */}
      {activeCalculator === 'heartrate' && (
        <div className="grid-panels">
          {/* Inputs Section */}
          <div className="glass-card panel-left">
            <h3 className="panel-title flex-center">
              <Heart className="text-danger animate-pulse" size={18} style={{ color: '#ef4444' }} />
              Configuración de Edad
            </h3>
            <p className="text-muted text-xs mb-4">Ingresa tu edad para calcular automáticamente tus zonas cardíacas personalizadas mediante la fórmula de Tanaka.</p>
            
            <div className="form-group">
              <div className="flex justify-between items-center mb-2" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <label className="form-label mb-0" style={{ margin: 0 }}>Edad del Atleta</label>
                <span className="font-bold text-primary" style={{ fontSize: '1.1rem', fontWeight: 800 }}>{age} años</span>
              </div>
              <div className="flex gap-3 items-center" style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                <input
                  type="range"
                  min="5"
                  max="100"
                  step="1"
                  value={age}
                  onChange={(e) => setAge(Number(e.target.value))}
                  className="custom-range-slider"
                  style={{
                    '--slider-thumb-color': '#ef4444',
                    '--slider-thumb-shadow': 'rgba(239, 68, 68, 0.5)'
                  }}
                />
                <input
                  type="number"
                  min="5"
                  max="100"
                  value={age}
                  onChange={(e) => setAge(Math.min(100, Math.max(5, Number(e.target.value) || 25)))}
                  className="form-input text-center"
                  style={{ width: '70px', padding: '0.5rem' }}
                />
              </div>
            </div>

            <div className="calculated-1rm-box mb-4" style={{ background: 'rgba(239, 68, 68, 0.04)', borderColor: 'rgba(239, 68, 68, 0.2)' }}>
              <span className="label text-muted" style={{ color: 'var(--text-secondary)' }}>Frecuencia Cardíaca Máxima (FCmáx)</span>
              <h2 className="value font-extrabold" style={{ color: '#ef4444', fontSize: '2.2rem', margin: '0.25rem 0' }}>
                {Math.round(208 - 0.7 * age)} <span className="unit" style={{ fontSize: '1.1rem', color: 'var(--text-secondary)' }}>bpm</span>
              </h2>
              <span className="subtext" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Fórmula de Tanaka: 208 - (0.7 × edad)</span>
            </div>
            
            <div className="calculator-info-box">
              <Info size={16} className="text-primary-glow" style={{ flexShrink: 0, marginTop: '2px' }} />
              <p className="text-xs text-secondary leading-relaxed">
                <strong>¿Por qué Tanaka?</strong> Tradicionalmente se usaba la fórmula de Fox (220 - edad), pero la ciencia deportiva moderna prefiere la de Tanaka por su mayor precisión matemática en adultos y atletas de fondo.
              </p>
            </div>
          </div>

          {/* Outputs Section */}
          <div className="glass-card panel-right">
            <h3 className="panel-title flex-center mb-3">
              <Activity size={18} className="text-danger" style={{ color: '#ef4444' }} />
              Zonas de Entrenamiento Cardiovascular
            </h3>
            
            <p className="text-muted text-xs mb-4">Usa estos rangos de pulsaciones para planificar la intensidad de tus corridas y entrenamientos aeróbicos.</p>
            
            <div className="hr-zones-list">
              {hrZones.map((zone) => (
                <div key={zone.level} className="hr-zone-item" style={{ borderLeft: `4px solid ${zone.color}` }}>
                  <div className="hr-zone-header">
                    <div className="hr-zone-title-group">
                      <span className="hr-zone-badge" style={{ backgroundColor: `rgba(${zone.colorRgb}, 0.15)`, color: zone.color }}>
                        Z{zone.level}
                      </span>
                      <strong className="hr-zone-name">{zone.name}</strong>
                    </div>
                    <span className="hr-zone-bpm font-bold text-primary">{zone.range}</span>
                  </div>
                  
                  <div className="hr-zone-details">
                    <p className="hr-zone-desc">{zone.description}</p>
                    <p className="hr-zone-benefit"><strong>Beneficios:</strong> {zone.benefit}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* AI COACH CALCULATOR */}
      {activeCalculator === 'ai_coach' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%' }}>
          
          {/* FITNESS & FATIGUE BANISTER CHART PANEL (FULL WIDTH) */}
          <div className="glass-card animate-fade-in" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div className="flex justify-between items-center" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <span className="ai-recommendation-badge mb-1" style={{ background: 'rgba(168, 85, 247, 0.12)', borderColor: 'rgba(168, 85, 247, 0.4)', color: '#c084fc' }}>📉 TELEMETRÍA CARDIOVASCULAR CRÓNICA</span>
                <h3 className="gradient-text font-extrabold text-xl" style={{ fontSize: '1.4rem', margin: '0.2rem 0' }}>
                  Curvas de Carga, Fatiga y Forma (Modelo de Banister)
                </h3>
                <p className="text-secondary text-xs">Monitoreo acumulativo de Fitness (CTL, 42 días) y Fatiga (ATL, 7 días) para calibrar tu supercompensación de entrenamiento.</p>
              </div>

              {/* Legends */}
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: '#10b981', fontWeight: 'bold' }}>
                  <span style={{ width: '12px', height: '3px', background: '#10b981', display: 'inline-block', borderRadius: '2px' }}></span>
                  Fitness (CTL)
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: '#a855f7', fontWeight: 'bold' }}>
                  <span style={{ width: '12px', height: '3px', background: '#a855f7', display: 'inline-block', borderRadius: '2px' }}></span>
                  Fatiga (ATL)
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: '#3b82f6', fontWeight: 'bold' }}>
                  <span style={{ width: '12px', height: '3px', borderTop: '2px dashed #3b82f6', display: 'inline-block' }}></span>
                  Forma (TSB)
                </span>
              </div>
            </div>

            {(() => {
              const displayHistory = fitnessFatigueData || [];
              const width = 800;
              const height = 280;
              const margin = { top: 30, right: 40, bottom: 40, left: 60 };
              const chartWidth = width - margin.left - margin.right;
              const chartHeight = height - margin.top - margin.bottom;

              const ctlVals = displayHistory.map(d => d.ctl);
              const atlVals = displayHistory.map(d => d.atl);
              const tsbVals = displayHistory.map(d => d.tsb);
              const allVals = [...ctlVals, ...atlVals, ...tsbVals];
              
              const maxFF = Math.max(...allVals, 40);
              const minFF = Math.min(...allVals, -20);
              const padVal = (maxFF - minFF) * 0.15 || 10;
              const yMax = maxFF + padVal;
              const yMin = minFF - padVal;

              const points = displayHistory.map((pt, i) => {
                const x = margin.left + (i * chartWidth) / (displayHistory.length - 1 || 1);
                const yCtl = margin.top + chartHeight - ((pt.ctl - yMin) * chartHeight) / (yMax - yMin || 1);
                const yAtl = margin.top + chartHeight - ((pt.atl - yMin) * chartHeight) / (yMax - yMin || 1);
                const yTsb = margin.top + chartHeight - ((pt.tsb - yMin) * chartHeight) / (yMax - yMin || 1);
                return { ...pt, x, yCtl, yAtl, yTsb };
              });

              // CTL path
              const ctlPath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.yCtl}`).join(' ');
              // ATL path
              const atlPath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.yAtl}`).join(' ');
              // TSB path
              const tsbPath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.yTsb}`).join(' ');

              const activePoint = hoveredFitnessPoint !== null ? points[hoveredFitnessPoint] : null;

              return (
                <div style={{ position: 'relative', width: '100%' }}>
                  {/* SVG Canvas */}
                  <svg 
                    viewBox={`0 0 ${width} ${height}`} 
                    style={{ width: '100%', height: 'auto', background: 'rgba(0,0,0,0.1)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.02)' }}
                    onMouseMove={(e) => handleFFMouseMove(e, points)}
                    onMouseLeave={() => setHoveredFitnessPoint(null)}
                  >
                    {/* Horizontal Gridlines */}
                    {[-1, 0, 1, 2, 3].map((val, idx) => {
                      const gridYValue = yMin + (idx * (yMax - yMin)) / 4;
                      const y = margin.top + chartHeight - ((gridYValue - yMin) * chartHeight) / (yMax - yMin || 1);
                      return (
                        <g key={idx}>
                          <line 
                            x1={margin.left} 
                            y1={y} 
                            x2={width - margin.right} 
                            y2={y} 
                            stroke={Math.abs(gridYValue) < 2 ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.04)"} 
                            strokeWidth={Math.abs(gridYValue) < 2 ? "1" : "0.5"}
                            strokeDasharray={Math.abs(gridYValue) < 2 ? "0" : "4 4"}
                          />
                          <text 
                            x={margin.left - 10} 
                            y={y + 4} 
                            fill={Math.abs(gridYValue) < 2 ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.4)"} 
                            fontSize="10" 
                            textAnchor="end"
                            fontFamily="monospace"
                          >
                            {Math.round(gridYValue)}
                          </text>
                        </g>
                      );
                    })}

                    {/* Active hover vertical line */}
                    {activePoint && (
                      <line 
                        x1={activePoint.x} 
                        y1={margin.top} 
                        x2={activePoint.x} 
                        y2={margin.top + chartHeight} 
                        stroke="rgba(168, 85, 247, 0.25)" 
                        strokeWidth="1.5" 
                        strokeDasharray="3 3"
                      />
                    )}

                    {/* CTL (Fitness) Line */}
                    {points.length > 0 && (
                      <path 
                        d={ctlPath} 
                        fill="none" 
                        stroke="#10b981" 
                        strokeWidth="3" 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                        style={{ filter: 'drop-shadow(0 0 4px rgba(16, 185, 129, 0.4))' }}
                      />
                    )}

                    {/* ATL (Fatigue) Line */}
                    {points.length > 0 && (
                      <path 
                        d={atlPath} 
                        fill="none" 
                        stroke="#a855f7" 
                        strokeWidth="3" 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                        style={{ filter: 'drop-shadow(0 0 4px rgba(168, 85, 247, 0.4))' }}
                      />
                    )}

                    {/* TSB (Forma) Line */}
                    {points.length > 0 && (
                      <path 
                        d={tsbPath} 
                        fill="none" 
                        stroke="#3b82f6" 
                        strokeWidth="1.5" 
                        strokeDasharray="4 4" 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                      />
                    )}

                    {/* Active Points Highlights */}
                    {activePoint && (
                      <g>
                        <circle cx={activePoint.x} cy={activePoint.yCtl} r="6" fill="#10b981" stroke="#0f0f16" strokeWidth="2" />
                        <circle cx={activePoint.x} cy={activePoint.yAtl} r="6" fill="#a855f7" stroke="#0f0f16" strokeWidth="2" />
                        <circle cx={activePoint.x} cy={activePoint.yTsb} r="5" fill="#3b82f6" stroke="#0f0f16" strokeWidth="1.5" />
                      </g>
                    )}

                    {/* X-axis labels (Dates) */}
                    {points.map((p, i) => {
                      if (i % 5 !== 0 && i !== points.length - 1) return null;
                      const shortDate = p.date.substring(5); // MM-DD
                      return (
                        <text 
                          key={i} 
                          x={p.x} 
                          y={height - margin.bottom + 20} 
                          fill="rgba(255,255,255,0.4)" 
                          fontSize="9" 
                          textAnchor="middle"
                          fontFamily="sans-serif"
                        >
                          {shortDate}
                        </text>
                      );
                    })}
                  </svg>

                  {/* Glassmorphic Interactive Tooltip */}
                  {activePoint && (
                    <div className="fitness-tooltip-card" style={{
                      position: 'absolute',
                      left: `${(activePoint.x / width) * 100}%`,
                      top: `${Math.max(10, (Math.min(activePoint.yCtl, activePoint.yAtl) / height) * 100 - 45)}%`,
                      transform: 'translate(-50%, -100%)',
                      pointerEvents: 'none',
                      zIndex: 100,
                      background: 'rgba(15, 15, 22, 0.85)',
                      border: '1px solid rgba(168, 85, 247, 0.4)',
                      borderRadius: '10px',
                      padding: '10px 14px',
                      color: '#ffffff',
                      fontSize: '0.75rem',
                      minWidth: '160px',
                      boxShadow: '0 8px 24px rgba(168, 85, 247, 0.15)',
                      backdropFilter: 'blur(10px)',
                      transition: 'left 0.1s ease, top 0.1s ease'
                    }}>
                      <div className="font-bold flex-center justify-between" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '4px' }}>
                        <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.65rem' }}>{activePoint.date}</span>
                        {activePoint.tss > 0 && <span style={{ color: '#a855f7', fontSize: '0.65rem', fontWeight: 800 }}>TSS: {activePoint.tss}</span>}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                        <span style={{ color: '#10b981', display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem' }}>
                          Fitness (CTL): <strong>{activePoint.ctl}</strong>
                        </span>
                        <span style={{ color: '#f472b6', display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem' }}>
                          Fatiga (ATL): <strong>{activePoint.atl}</strong>
                        </span>
                        <span style={{ color: '#60a5fa', display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '0.72rem' }}>
                          Forma (TSB): <strong>{activePoint.tsb}</strong>
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* DIAGNOSTIC PANEL FOR TODAY */}
            {(() => {
              const tsb = todayFitnessMetrics.tsb;
              const ctl = todayFitnessMetrics.ctl;
              const atl = todayFitnessMetrics.atl;
              
              let title = "";
              let badgeColor = "";
              let badgeBg = "";
              let shadow = "";
              let desc = "";
              let advice = "";
              
              if (tsb < -30) {
                title = "SOBREENTRENAMIENTO (Riesgo Crítico de Lesión)";
                badgeColor = "#ef4444";
                badgeBg = "rgba(239, 68, 68, 0.12)";
                shadow = "rgba(239, 68, 68, 0.15)";
                desc = "Tu carga de entrenamiento a corto plazo (Fatiga/ATL) ha superado drásticamente tu adaptación crónica (Fitness/CTL). El sistema nervioso central, articulaciones y depósitos de glucógeno están severamente exhaustos.";
                advice = "¡Alerta Roja! Detén cualquier sesión de alta intensidad hoy. Prescribe descanso pasivo absoluto de 24 a 48 horas, estiramientos pasivos, masajes miofasciales y sueño reparador profundo para evitar microdesgarros musculares o fatiga crónica.";
              } else if (tsb >= -30 && tsb < -10) {
                title = "ZONA DULCE DE MEJORA (Sweet Spot Fisiológico)";
                badgeColor = "#10b981";
                badgeBg = "rgba(16, 185, 129, 0.12)";
                shadow = "rgba(16, 185, 129, 0.15)";
                desc = "Te encuentras en la zona de máximo estímulo adaptativo productivo. Tu cuerpo está asimilando la carga de entrenamiento acumulada para potenciar la síntesis proteica de fuerza y elevar el volumen mitocondrial aeróbico.";
                advice = "Día ideal para entrenamientos exigentes programados de sobrecarga progresiva en el gimnasio (RPE 8-9) o trabajos tempo de umbral láctico en running. Mantén tu nutrición equilibrada en macronutrientes para sostener la demanda energética.";
              } else if (tsb >= -10 && tsb <= 5) {
                title = "ZONA NEUTRA / TRANSICIÓN FISIOLÓGICA";
                badgeColor = "#eab308";
                badgeBg = "rgba(234, 179, 8, 0.12)";
                shadow = "rgba(234, 179, 8, 0.15)";
                desc = "Tu estado de forma actual está balanceado. La fatiga acumulada de los días previos se ha disipado moderadamente, equilibrando tu balance de estrés crónico a niveles ideales de mantenimiento.";
                advice = "Día propicio para trabajos aeróbicos en Zona 2 (trote cómodo) y rutinas de gimnasio de intensidad intermedia. Excelente ventana para evaluar tu técnica de levantamiento sin sobrecargar tus sistemas energéticos.";
              } else {
                title = "PUESTA A PUNTO / FRESHNESS CRÍTICA (Listo para Competir)";
                badgeColor = "#3b82f6";
                badgeBg = "rgba(59, 130, 246, 0.12)";
                shadow = "rgba(59, 130, 246, 0.15)";
                desc = "¡Supercompensación Fisiológica lograda! Tus sistemas muscular y cardiovascular están al 100% de su capacidad. Los depósitos de glucógeno y fibras musculares se encuentran regenerados y libres de fatiga residual.";
                advice = "¡Ventana Óptima de Rendimiento Máximo! Es el momento perfecto para batir una marca personal (PR) en Press de Banca, Peso Muerto o una carrera de velocidad de 5K. Tus tiempos de reacción neuromuscular están al máximo. ¡Sal a por todo!";
              }

              return (
                <div style={{ 
                  marginTop: '0.25rem',
                  padding: '1rem', 
                  background: 'rgba(255,255,255,0.01)', 
                  border: '1px solid rgba(255,255,255,0.03)', 
                  borderRadius: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Cpu size={16} style={{ color: badgeColor }} />
                      <strong style={{ fontSize: '0.85rem', color: '#ffffff' }}>Diagnóstico Biomédico de Forma (TSB)</strong>
                    </div>
                    <span style={{ 
                      fontSize: '0.72rem', 
                      fontWeight: 800, 
                      color: badgeColor, 
                      background: badgeBg, 
                      padding: '3px 10px', 
                      borderRadius: '20px', 
                      border: `1px solid ${badgeColor}40`,
                      boxShadow: `0 0 8px ${shadow}`
                    }}>
                      {title}
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 2.5fr', gap: '1rem', alignItems: 'center' }} className="tsb-grid-mobile">
                    {/* TSB bar indicators */}
                    <div style={{ 
                      background: 'rgba(0,0,0,0.2)', 
                      padding: '12px', 
                      borderRadius: '10px', 
                      textAlign: 'center',
                      border: '1px solid rgba(255,255,255,0.02)',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center'
                    }}>
                      <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' }}>Tu Forma (TSB)</span>
                      <h3 style={{ fontSize: '1.8rem', fontWeight: 900, color: badgeColor, margin: '2px 0' }}>{tsb}</h3>
                      <span style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.4)' }}>
                        CTL {ctl} / ATL {atl}
                      </span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.7)', margin: 0, lineHeight: '1.4' }}>
                        {desc}
                      </p>
                      <p style={{ fontSize: '0.72rem', color: badgeColor, margin: 0, lineHeight: '1.4', fontWeight: 500 }}>
                        👉 <strong>Prescripción IA:</strong> {advice}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>

          <div className="grid-panels fade-in">
            {/* Left Column: AI Core & Telemetry Dials */}
            <div className="panel-left-group">
              {/* AI Core Visualizer */}
              <div className="ai-core-visualizer glass-card">
                <div className="ai-core-pulse"></div>
                <div className="ai-core-brain">
                  <Brain className="ai-brain-icon" size={32} />
                </div>
                <div className="ai-core-status">NÚCLEO DE INTELIGENCIA DEPORTIVA</div>
                <p className="ai-core-telemetry text-muted">
                  ACWR Engine v1.2 // Escaneando {workouts.length} entrenamientos...
                </p>
              </div>

              {/* Dials Concéntricos / Fatiga Bars */}
              <div className="glass-card panel-left" style={{ padding: '1.25rem' }}>
                <h3 className="panel-title flex-center mb-3" style={{ fontSize: '1rem' }}>
                  <Activity size={18} className="ai-coach-glow-text" />
                  Cargas Agudas vs Crónicas (ACWR)
                </h3>
                
                <div className="ai-coach-dials-section">
                  {/* Cardio Load */}
                  <div className="dial-stat-item">
                    <div className="dial-header">
                      <span className="dial-label text-xs font-bold flex-center">
                        <Heart size={14} className="text-secondary mr-1" style={{ color: '#10b981' }} />
                        ACWR Cardiovascular (Cardio)
                      </span>
                      <span className="font-bold" style={{ color: aiCoachTelemetry.cardioACWR > 1.5 ? '#ef4444' : aiCoachTelemetry.cardioACWR >= 0.8 && aiCoachTelemetry.cardioACWR <= 1.3 ? '#10b981' : '#eab308' }}>
                        {aiCoachTelemetry.cardioACWR.toFixed(2)}
                      </span>
                    </div>
                    <div className="dial-bar-track">
                      <div 
                        className="dial-bar-fill fill-cardio" 
                        style={{ 
                          width: `${Math.min(100, (aiCoachTelemetry.cardioACWR / 2) * 100)}%`,
                          backgroundColor: aiCoachTelemetry.cardioACWR > 1.5 ? '#ef4444' : aiCoachTelemetry.cardioACWR >= 0.8 && aiCoachTelemetry.cardioACWR <= 1.3 ? '#10b981' : '#eab308'
                        }}
                      ></div>
                    </div>
                    <div className="flex justify-between text-muted" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem' }}>
                      <span>Bajo (&lt;0.8)</span>
                      <span style={{ color: '#10b981', fontWeight: 'bold' }}>Óptimo (0.8 - 1.3)</span>
                      <span>Riesgo (&gt;1.5)</span>
                    </div>
                  </div>

                  {/* Strength Load */}
                  <div className="dial-stat-item">
                    <div className="dial-header">
                      <span className="dial-label text-xs font-bold flex-center">
                        <Dumbbell size={14} className="text-secondary mr-1" style={{ color: '#ec4899' }} />
                        ACWR Muscular (Fuerza)
                      </span>
                      <span className="font-bold" style={{ color: aiCoachTelemetry.strengthACWR > 1.5 ? '#ef4444' : aiCoachTelemetry.strengthACWR >= 0.8 && aiCoachTelemetry.strengthACWR <= 1.3 ? '#ec4899' : '#eab308' }}>
                        {aiCoachTelemetry.strengthACWR.toFixed(2)}
                      </span>
                    </div>
                    <div className="dial-bar-track">
                      <div 
                        className="dial-bar-fill fill-strength" 
                        style={{ 
                          width: `${Math.min(100, (aiCoachTelemetry.strengthACWR / 2) * 100)}%`,
                          backgroundColor: aiCoachTelemetry.strengthACWR > 1.5 ? '#ef4444' : aiCoachTelemetry.strengthACWR >= 0.8 && aiCoachTelemetry.strengthACWR <= 1.3 ? '#ec4899' : '#eab308'
                        }}
                      ></div>
                    </div>
                    <div className="flex justify-between text-muted" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem' }}>
                      <span>Bajo (&lt;0.8)</span>
                      <span style={{ color: '#ec4899', fontWeight: 'bold' }}>Óptimo (0.8 - 1.3)</span>
                      <span>Riesgo (&gt;1.5)</span>
                    </div>
                  </div>

                  {/* Injury Risk Indicator */}
                  <div className="dial-stat-item" style={{ border: '1px solid rgba(255,255,255,0.03)', background: 'rgba(255,255,255,0.005)' }}>
                    <div className="flex justify-between items-center" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span className="text-xs text-secondary font-bold">Riesgo Acumulado de Lesión</span>
                      <span className="font-bold text-xs px-2 py-0.5 rounded" style={{ 
                        backgroundColor: Math.max(aiCoachTelemetry.cardioACWR, aiCoachTelemetry.strengthACWR) > 1.5 ? 'rgba(239, 68, 68, 0.15)' : Math.max(aiCoachTelemetry.cardioACWR, aiCoachTelemetry.strengthACWR) > 1.3 ? 'rgba(234, 179, 8, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                        color: Math.max(aiCoachTelemetry.cardioACWR, aiCoachTelemetry.strengthACWR) > 1.5 ? '#ef4444' : Math.max(aiCoachTelemetry.cardioACWR, aiCoachTelemetry.strengthACWR) > 1.3 ? '#eab308' : '#10b981',
                        border: `1px solid ${Math.max(aiCoachTelemetry.cardioACWR, aiCoachTelemetry.strengthACWR) > 1.5 ? 'rgba(239, 68, 68, 0.3)' : Math.max(aiCoachTelemetry.cardioACWR, aiCoachTelemetry.strengthACWR) > 1.3 ? 'rgba(234, 179, 8, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`
                      }}>
                        {Math.max(aiCoachTelemetry.cardioACWR, aiCoachTelemetry.strengthACWR) > 1.5 ? 'ALTO (Riesgo)' : Math.max(aiCoachTelemetry.cardioACWR, aiCoachTelemetry.strengthACWR) > 1.3 ? 'MODERADO' : 'BAJO (Óptimo)'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: AI Prescription & Muscle Recovery */}
            <div className="panel-right-group">
              {/* AI Prescription Card */}
              <div className="glass-card ai-prescription-card">
                <div className="flex justify-between items-start mb-3" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <span className="ai-recommendation-badge mb-2">RECOMENDACIÓN METABÓLICA</span>
                    <h2 className="gradient-text font-extrabold text-xl mt-1" style={{ fontSize: '1.4rem', margin: '0.25rem 0 0 0' }}>
                      {aiCoachTelemetry.recommendation.action}
                    </h2>
                  </div>
                  <Cpu className="ai-coach-glow-text animate-pulse" size={24} />
                </div>

                <p className="text-secondary text-sm leading-relaxed mb-4">
                  {aiCoachTelemetry.recommendation.reason}
                </p>

                {/* Scientific Detail Box */}
                <div className="ai-science-alert mb-4">
                  <div className="alert-glow"></div>
                  <div className="flex gap-2" style={{ display: 'flex', gap: '0.5rem' }}>
                    <Info size={16} className="ai-coach-glow-text" style={{ flexShrink: 0, marginTop: '2px' }} />
                    <p className="text-xs text-secondary leading-relaxed" style={{ margin: 0 }}>
                      <strong>Análisis Biométrico:</strong> {aiCoachTelemetry.recommendation.scientificDetail}
                    </p>
                  </div>
                </div>

                {/* Recommended Routine Exercises */}
                <h4 className="text-xs font-extrabold text-primary mb-2 tracking-wider uppercase flex-center">
                  <Dumbbell size={14} className="mr-1" /> RUTINA DE ENTRENAMIENTO PRESCRITA
                </h4>
                <table className="calculator-table">
                  <thead>
                    <tr>
                      <th>Ejercicio Sugerido</th>
                      <th className="center">Sets</th>
                      <th className="center">Reps</th>
                      <th className="right">Intensidad / RPE</th>
                    </tr>
                  </thead>
                  <tbody>
                    {aiCoachTelemetry.recommendation.routine.map((ex, idx) => (
                      <tr key={idx}>
                        <td><strong>{ex.name}</strong></td>
                        <td className="center text-primary font-bold">{ex.sets}</td>
                        <td className="center text-secondary">{ex.reps}</td>
                        <td className="right text-muted text-xs">{ex.intensity}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Muscle Recency Map */}
              <div className="glass-card">
                <h3 className="panel-title flex-center mb-3">
                  <Sparkles size={18} className="ai-coach-glow-text" />
                  Mapa de Recuperación y Estímulo Muscular
                </h3>
                <p className="text-muted text-xs mb-4">
                  Monitoreo continuo de microdesgarros y supercompensación por grupos musculares principales (últimos 30 días).
                </p>
                
                <div className="muscle-status-grid">
                  {Object.keys(aiCoachTelemetry.muscleRecency).map((key) => {
                    const m = aiCoachTelemetry.muscleRecency[key];
                    return (
                      <div key={key} className="muscle-status-card" style={{ borderLeft: `3px solid ${m.color}` }}>
                        <div className="muscle-card-header mb-1">
                          <span className="muscle-name text-xs">{m.name}</span>
                          <span className="text-xs font-bold" style={{ color: m.color, fontSize: '0.7rem' }}>
                            {m.lastTrainedDays === Infinity ? 'Listo' : `${m.lastTrainedDays}d`}
                          </span>
                        </div>
                        <p className="muscle-desc text-xs font-medium" style={{ color: m.color, margin: 0 }}>
                          {m.status}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ACWR WORKLOAD MONITOR VIEW */}
      {activeCalculator === 'acwr' && (
        <div className="grid-panels fade-in">
          {/* Left Column: Interactive Graph & Stats */}
          <div className="panel-left-group" style={{ gridColumn: 'span 2' }}>
            
            {/* Live Telemetry KPI Cards */}
            <div className="kpi-acwr-grid">
              
              <div className="glass-card" style={{ padding: '1.25rem', borderLeft: '4px solid #38bdf8' }}>
                <div className="text-secondary text-xs font-bold" style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>Carga Aguda (7d)</div>
                <h3 className="text-2xl font-black mt-1 flex-center" style={{ gap: '6px', justifyContent: 'flex-start', margin: '0.25rem 0', fontSize: '1.8rem' }}>
                  <Zap size={18} style={{ color: '#38bdf8' }} />
                  {acwrData.current.acute.toFixed(1)}
                </h3>
                <p className="text-muted text-xs">Fatiga a corto plazo. Promedio diario de estrés.</p>
              </div>

              <div className="glass-card" style={{ padding: '1.25rem', borderLeft: '4px solid #10b981' }}>
                <div className="text-secondary text-xs font-bold" style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>Carga Crónica (28d)</div>
                <h3 className="text-2xl font-black mt-1 flex-center" style={{ gap: '6px', justifyContent: 'flex-start', margin: '0.25rem 0', fontSize: '1.8rem' }}>
                  <Activity size={18} style={{ color: '#10b981' }} />
                  {acwrData.current.chronic.toFixed(1)}
                </h3>
                <p className="text-muted text-xs">Acondicionamiento a largo plazo (adaptación).</p>
              </div>

              {(() => {
                const ratio = acwrData.current.acwr;
                let zoneColor = '#38bdf8'; // Celeste
                let zoneName = 'Subentrenamiento';
                let zoneBg = 'rgba(56, 189, 248, 0.1)';
                let borderGlow = 'rgba(56, 189, 248, 0.25)';

                if (ratio >= 0.8 && ratio <= 1.3) {
                  zoneColor = '#10b981'; // Green
                  zoneName = 'Sweet Spot (Óptimo)';
                  zoneBg = 'rgba(16, 185, 129, 0.1)';
                  borderGlow = 'rgba(16, 185, 129, 0.25)';
                } else if (ratio > 1.3 && ratio <= 1.5) {
                  zoneColor = '#f59e0b'; // Orange
                  zoneName = 'Alerta de Carga';
                  zoneBg = 'rgba(245, 158, 11, 0.1)';
                  borderGlow = 'rgba(245, 158, 11, 0.25)';
                } else if (ratio > 1.5) {
                  zoneColor = '#ef4444'; // Red
                  zoneName = 'Peligro (Sobreuso)';
                  zoneBg = 'rgba(239, 68, 68, 0.1)';
                  borderGlow = 'rgba(239, 68, 68, 0.25)';
                }

                return (
                  <div className="glass-card" style={{ padding: '1.25rem', borderLeft: `4px solid ${zoneColor}`, background: zoneBg, borderColor: borderGlow }}>
                    <div className="text-secondary text-xs font-bold" style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>Índice ACWR</div>
                    <h3 className="text-2xl font-black mt-1 flex-center" style={{ gap: '6px', justifyContent: 'flex-start', margin: '0.25rem 0', color: zoneColor, textShadow: `0 0 10px ${zoneColor}60`, fontSize: '1.8rem' }}>
                      <Award size={18} />
                      {ratio.toFixed(2)}
                    </h3>
                    <span style={{ fontSize: '0.72rem', fontWeight: 800, color: zoneColor }}>{zoneName}</span>
                  </div>
                );
              })()}

            </div>

            {/* Interactive SVG Graph */}
            <div className="glass-card" style={{ padding: '1.5rem', width: '100%', position: 'relative' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div>
                  <h3 className="panel-title flex-center">
                    <Activity size={18} style={{ color: '#38bdf8' }} />
                    Cronología de Carga Aguda:Crónica (Últimos 30 días)
                  </h3>
                  <p className="text-muted text-xs">Pasa el cursor por encima del gráfico neón para ver la telemetría diaria.</p>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }} className="acwr-legend">
                  <span className="flex-center" style={{ fontSize: '0.7rem', gap: '4px' }}><span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#38bdf8' }}></span> &lt;0.8 Celeste</span>
                  <span className="flex-center" style={{ fontSize: '0.7rem', gap: '4px' }}><span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }}></span> 0.8-1.3 Verde</span>
                  <span className="flex-center" style={{ fontSize: '0.7rem', gap: '4px' }}><span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#f59e0b' }}></span> 1.3-1.5 Naranja</span>
                  <span className="flex-center" style={{ fontSize: '0.7rem', gap: '4px' }}><span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444' }}></span> &gt;1.5 Rojo</span>
                </div>
              </div>

              {/* Graphic container */}
              <div style={{ position: 'relative', width: '100%', height: '320px', background: 'rgba(0,0,0,0.15)', borderRadius: '12px', overflow: 'visible', border: '1px solid rgba(255,255,255,0.02)' }}>
                {acwrData.timeline.length < 2 ? (
                  <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    Registra entrenamientos en Supabase en los últimos 30 días para trazar tu curva ACWR.
                  </div>
                ) : (() => {
                  const width = 800;
                  const height = 320;
                  const paddingLeft = 40;
                  const paddingRight = 20;
                  const paddingTop = 20;
                  const paddingBottom = 30;

                  const chartWidth = width - paddingLeft - paddingRight;
                  const chartHeight = height - paddingTop - paddingBottom;

                  const yMax = 2.2;
                  const yMin = 0.0;

                  const getX = (index) => paddingLeft + (index / 29) * chartWidth;
                  const getY = (val) => {
                    const cappedVal = Math.max(yMin, Math.min(yMax, val));
                    return paddingTop + chartHeight - ((cappedVal - yMin) / (yMax - yMin)) * chartHeight;
                  };

                  const y0_8 = getY(0.8);
                  const y1_3 = getY(1.3);
                  const y1_5 = getY(1.5);
                  const y2_2 = getY(2.2);
                  const y0_0 = getY(0.0);

                  let linePath = '';
                  acwrData.timeline.forEach((pt, idx) => {
                    const x = getX(idx);
                    const y = getY(pt.acwr);
                    if (idx === 0) {
                      linePath += `M ${x} ${y}`;
                    } else {
                      linePath += ` L ${x} ${y}`;
                    }
                  });

                  const handleMouseMove = (e) => {
                    const svgRect = e.currentTarget.getBoundingClientRect();
                    const mouseX = ((e.clientX - svgRect.left) / svgRect.width) * width;
                    let closestIdx = 0;
                    let minDiff = Infinity;
                    acwrData.timeline.forEach((pt, idx) => {
                      const x = getX(idx);
                      const diff = Math.abs(x - mouseX);
                      if (diff < minDiff) {
                        minDiff = diff;
                        closestIdx = idx;
                      }
                    });
                    setHoveredACWRPoint(closestIdx);
                  };

                  const handleMouseLeave = () => {
                    setHoveredACWRPoint(null);
                  };

                  const currentHoverPoint = hoveredACWRPoint !== null ? acwrData.timeline[hoveredACWRPoint] : null;

                  return (
                    <>
                      <svg 
                        viewBox={`0 0 ${width} ${height}`} 
                        style={{ width: '100%', height: '100%' }}
                        onMouseMove={handleMouseMove}
                        onMouseLeave={handleMouseLeave}
                      >
                        <defs>
                          <linearGradient id="subGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.08" />
                            <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.02" />
                          </linearGradient>
                          <linearGradient id="sweetGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#10b981" stopOpacity="0.08" />
                            <stop offset="100%" stopColor="#10b981" stopOpacity="0.02" />
                          </linearGradient>
                          <linearGradient id="alertGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.08" />
                            <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.02" />
                          </linearGradient>
                          <linearGradient id="dangerGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#ef4444" stopOpacity="0.08" />
                            <stop offset="100%" stopColor="#ef4444" stopOpacity="0.02" />
                          </linearGradient>

                          <filter id="glow-acwr" x="-20%" y="-20%" width="140%" height="140%">
                            <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="#38bdf8" floodOpacity="0.7" />
                          </filter>
                        </defs>

                        <rect x={paddingLeft} y={y2_2} width={chartWidth} height={y1_5 - y2_2} fill="url(#dangerGrad)" />
                        <rect x={paddingLeft} y={y1_5} width={chartWidth} height={y1_3 - y1_5} fill="url(#alertGrad)" />
                        <rect x={paddingLeft} y={y1_3} width={chartWidth} height={y0_8 - y1_3} fill="url(#sweetGrad)" />
                        <rect x={paddingLeft} y={y0_8} width={chartWidth} height={y0_0 - y0_8} fill="url(#subGrad)" />

                        <line x1={paddingLeft} y1={y0_8} x2={width - paddingRight} y2={y0_8} stroke="rgba(56, 189, 248, 0.15)" strokeWidth="1" strokeDasharray="3,3" />
                        <line x1={paddingLeft} y1={y1_3} x2={width - paddingRight} y2={y1_3} stroke="rgba(16, 185, 129, 0.2)" strokeWidth="1" strokeDasharray="3,3" />
                        <line x1={paddingLeft} y1={y1_5} x2={width - paddingRight} y2={y1_5} stroke="rgba(245, 158, 11, 0.2)" strokeWidth="1" strokeDasharray="3,3" />

                        <line x1={paddingLeft} y1={paddingTop} x2={paddingLeft} y2={height - paddingBottom} stroke="rgba(255,255,255,0.1)" strokeWidth="1.5" />
                        <line x1={paddingLeft} y1={height - paddingBottom} x2={width - paddingRight} y2={height - paddingBottom} stroke="rgba(255,255,255,0.1)" strokeWidth="1.5" />

                        <text x={paddingLeft - 8} y={y0_0 + 4} fill="rgba(255,255,255,0.4)" fontSize="9" textAnchor="end">0.0</text>
                        <text x={paddingLeft - 8} y={y0_8 + 4} fill="#38bdf8" fontSize="9" fontWeight="bold" textAnchor="end">0.8</text>
                        <text x={paddingLeft - 8} y={y1_3 + 4} fill="#10b981" fontSize="9" fontWeight="bold" textAnchor="end">1.3</text>
                        <text x={paddingLeft - 8} y={y1_5 + 4} fill="#f59e0b" fontSize="9" fontWeight="bold" textAnchor="end">1.5</text>
                        <text x={paddingLeft - 8} y={y2_2 + 4} fill="#ef4444" fontSize="9" fontWeight="bold" textAnchor="end">2.2</text>

                        {acwrData.timeline.length > 0 && (
                          <>
                            <text x={getX(0)} y={height - paddingBottom + 16} fill="rgba(255,255,255,0.4)" fontSize="9" textAnchor="middle">
                              {(() => {
                                const parts = acwrData.timeline[0].date.split('-');
                                return `${parts[2]}/${parts[1]}`;
                              })()}
                            </text>
                            <text x={getX(14)} y={height - paddingBottom + 16} fill="rgba(255,255,255,0.4)" fontSize="9" textAnchor="middle">
                              {(() => {
                                const parts = acwrData.timeline[14].date.split('-');
                                return `${parts[2]}/${parts[1]}`;
                              })()}
                            </text>
                            <text x={getX(29)} y={height - paddingBottom + 16} fill="rgba(255,255,255,0.6)" fontSize="9" fontWeight="bold" textAnchor="middle">
                              Hoy
                            </text>
                          </>
                        )}

                        <path 
                          d={linePath} 
                          fill="none" 
                          stroke="#38bdf8" 
                          strokeWidth="3.5" 
                          strokeLinecap="round" 
                          strokeLinejoin="round" 
                          filter="url(#glow-acwr)" 
                        />

                        {acwrData.timeline.map((pt, idx) => {
                          const x = getX(idx);
                          const y = getY(pt.acwr);
                          const isHovered = hoveredACWRPoint === idx;

                          let circleColor = '#38bdf8';
                          if (pt.acwr >= 0.8 && pt.acwr <= 1.3) circleColor = '#10b981';
                          else if (pt.acwr > 1.3 && pt.acwr <= 1.5) circleColor = '#f59e0b';
                          else if (pt.acwr > 1.5) circleColor = '#ef4444';

                          return (
                            <circle 
                              key={idx}
                              cx={x} 
                              cy={y} 
                              r={isHovered ? 6 : 2} 
                              fill={circleColor} 
                              stroke="#ffffff"
                              strokeWidth={isHovered ? 2 : 0}
                              style={{ transition: 'r 0.1s ease, stroke-width 0.1s ease' }}
                            />
                          );
                        })}

                        {hoveredACWRPoint !== null && (
                          <line 
                            x1={getX(hoveredACWRPoint)} 
                            y1={paddingTop} 
                            x2={getX(hoveredACWRPoint)} 
                            y2={height - paddingBottom} 
                            stroke="rgba(255,255,255,0.15)" 
                            strokeWidth="1" 
                            strokeDasharray="2,2" 
                          />
                        )}

                      </svg>

                      {currentHoverPoint && (
                        <div 
                          className="gym-tooltip-card" 
                          style={{
                            position: 'absolute',
                            left: `${(getX(hoveredACWRPoint) / width) * 100}%`,
                            top: `${(getY(currentHoverPoint.acwr) / height) * 100 - 15}%`,
                            transform: 'translate(-50%, -100%)',
                            background: 'rgba(9, 10, 15, 0.95)',
                            border: '1px solid var(--border-light)',
                            padding: '0.75rem 1rem',
                            borderRadius: '12px',
                            boxShadow: '0 10px 25px rgba(0,0,0,0.5), 0 0 10px rgba(56, 189, 248, 0.15)',
                            pointerEvents: 'none',
                            zIndex: 10,
                            minWidth: '200px'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '0.25rem', marginBottom: '0.4rem' }}>
                            <span style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.4)', fontWeight: 'bold' }}>
                              {(() => {
                                const parts = currentHoverPoint.date.split('-');
                                return `${parts[2]}/${parts[1]}/${parts[0]}`;
                              })()}
                            </span>
                            <span style={{ 
                              fontSize: '0.65rem', 
                              fontWeight: 800, 
                              color: currentHoverPoint.acwr >= 0.8 && currentHoverPoint.acwr <= 1.3 ? '#10b981' : currentHoverPoint.acwr > 1.3 && currentHoverPoint.acwr <= 1.5 ? '#f59e0b' : currentHoverPoint.acwr > 1.5 ? '#ef4444' : '#38bdf8' 
                            }}>
                              {currentHoverPoint.acwr >= 0.8 && currentHoverPoint.acwr <= 1.3 ? 'SWEET SPOT' : currentHoverPoint.acwr > 1.3 && currentHoverPoint.acwr <= 1.5 ? 'ALERTA' : currentHoverPoint.acwr > 1.5 ? 'PELIGRO' : 'SUBENTRENADO'}
                            </span>
                          </div>
                          
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                              <span style={{ color: 'rgba(255,255,255,0.6)' }}>Carga Trabajo:</span>
                              <strong style={{ color: '#ffffff' }}>{currentHoverPoint.workload.toFixed(1)}</strong>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem' }}>
                              <span style={{ color: 'rgba(255,255,255,0.4)', paddingLeft: '8px' }}>• Running:</span>
                              <span style={{ color: 'rgba(255,255,255,0.7)' }}>{currentHoverPoint.runningLoad.toFixed(1)}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem' }}>
                              <span style={{ color: 'rgba(255,255,255,0.4)', paddingLeft: '8px' }}>• Fuerza:</span>
                              <span style={{ color: 'rgba(255,255,255,0.7)' }}>{currentHoverPoint.gymLoad.toFixed(1)}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginTop: '4px', borderTop: '1px dashed rgba(255,255,255,0.06)', paddingTop: '4px' }}>
                              <span style={{ color: 'rgba(255,255,255,0.6)' }}>Carga Aguda (7d):</span>
                              <strong style={{ color: '#38bdf8' }}>{currentHoverPoint.acute.toFixed(1)}</strong>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                              <span style={{ color: 'rgba(255,255,255,0.6)' }}>Carga Crónica (28d):</span>
                              <strong style={{ color: '#10b981' }}>{currentHoverPoint.chronic.toFixed(1)}</strong>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '4px', marginTop: '2px' }}>
                              <span style={{ color: '#ffffff', fontWeight: 'bold' }}>ACWR Ratio:</span>
                              <strong style={{ 
                                color: currentHoverPoint.acwr >= 0.8 && currentHoverPoint.acwr <= 1.3 ? '#10b981' : currentHoverPoint.acwr > 1.3 && currentHoverPoint.acwr <= 1.5 ? '#f59e0b' : currentHoverPoint.acwr > 1.5 ? '#ef4444' : '#38bdf8', 
                                fontSize: '0.9rem' 
                              }}>{currentHoverPoint.acwr.toFixed(2)}</strong>
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  )();
                })()}
              </div>

            </div>

            {/* Sports Medicine Coaching Box */}
            {(() => {
              const activePt = hoveredACWRPoint !== null ? acwrData.timeline[hoveredACWRPoint] : acwrData.timeline[acwrData.timeline.length - 1];
              if (!activePt) return null;

              const ratio = activePt.acwr;
              let title = 'SUBENTRENAMIENTO (Pérdida de Adaptaciones)';
              let badgeColor = '#38bdf8';
              let badgeBg = 'rgba(56, 189, 248, 0.12)';
              let shadow = 'rgba(56, 189, 248, 0.15)';
              let desc = 'Tu estímulo agudo reciente es inferior a tu condición adaptativa previa. Esto suele ocurrir tras un periodo vacacional, descarga muy prolongada o abandono transitorio. Consecuencia fisiológica: pérdida gradual de densidad mitocondrial, capilarización esquelética y reclutamiento neuromuscular rápido.';
              let advice = 'Es seguro y necesario reincorporar volumen paulatinamente. Incrementa tu kilometraje semanal no más de un 10% por mesociclo y reintroduce sesiones de fuerza media en gimnasio para revertir el desentrenamiento.';

              if (ratio >= 0.8 && ratio <= 1.3) {
                title = 'SWEET SPOT (Estímulo Fisiológico Óptimo)';
                badgeColor = '#10b981';
                badgeBg = 'rgba(16, 185, 129, 0.12)';
                shadow = 'rgba(16, 185, 129, 0.15)';
                desc = '¡Felicidades! Te encuentras en la zona perfecta de adaptación deportiva y progresión de cargas. El balance entre el estrés acumulado de 7 días y la aclimatación de 28 días es sumamente balanceado. La síntesis de proteínas contráctiles y la biogénesis mitocondrial se desarrollan a máxima velocidad con riesgo de lesión minimizado al extremo.';
                advice = 'Mantén la regularidad. Es una ventana propicia para asimilar entrenamientos duros planificados, pasadas intensas y levantamientos de fuerza principal. La regeneración celular es óptima.';
              } else if (ratio > 1.3 && ratio <= 1.5) {
                title = 'ZONA DE ALERTA DE FATIGA (Riesgo Moderado)';
                badgeColor = '#f59e0b';
                badgeBg = 'rgba(245, 158, 11, 0.12)';
                shadow = 'rgba(245, 158, 11, 0.15)';
                desc = 'Tu carga de trabajo aguda a corto plazo está escalando de forma agresiva en comparación con tu base crónica. Esto genera fatiga residual en tendones y acumulación de cortisol. Aunque la adaptación continúa, te encuentras en un punto de equilibrio inestable donde cualquier exceso desencadenará lesiones.';
                advice = 'Prescribe una estabilización del volumen o ligera reducción de intensidad. Evita añadir distancias adicionales o series al fallo en los próximos 3-5 días para permitir la amortiguación del estrés.';
              } else if (ratio > 1.5) {
                title = 'ZONA DE PELIGRO DE LESIÓN (Riesgo Exponencial)';
                badgeColor = '#ef4444';
                badgeBg = 'rgba(239, 68, 68, 0.12)';
                shadow = 'rgba(239, 68, 68, 0.15)';
                desc = '¡Alerta Biomédica de Sobrecarga Aguda! Tu estrés acumulado supera por más del 50% tu base de acondicionamiento histórico. El riesgo de sufrir microdesgarros fibrilares, tendinitis por impacto cardiovascular (como periostitis tibial o fascitis) y fatiga simpática central es estadísticamente extremo. El cuerpo está sobrepasado.';
                advice = '🛑 REDUCCIÓN INMEDIATA Y DESCARGA ACTIVA. Se prescribe un reposo pasivo de 24 a 48 horas seguido por sesiones regenerativas al 50% de volumen. Aplica masajes de liberación miofascial, duplica tu hidratación y garantiza 8 horas de sueño profundo.';
              }

              return (
                <div className="glass-card" style={{ padding: '1.5rem', border: '1px solid rgba(255,255,255,0.05)', background: 'linear-gradient(135deg, rgba(255,255,255,0.015) 0%, rgba(255,255,255,0.005) 100%)', width: '100%' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '0.75rem', marginBottom: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Brain size={18} style={{ color: badgeColor }} />
                      <strong style={{ fontSize: '0.9rem', color: '#ffffff' }}>
                        {hoveredACWRPoint !== null ? `Diagnóstico Clínico Kinesiológico (${activePt.date})` : 'Diagnóstico Clínico Kinesiológico Actual'}
                      </strong>
                    </div>
                    <span style={{ 
                      fontSize: '0.7rem', 
                      fontWeight: 800, 
                      color: badgeColor, 
                      background: badgeBg, 
                      padding: '3px 12px', 
                      borderRadius: '20px', 
                      border: `1px solid ${badgeColor}30`,
                      boxShadow: `0 0 8px ${shadow}`
                    }}>
                      {title}
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 3fr', gap: '1.5rem', alignItems: 'start' }} className="tsb-grid-mobile">
                    {/* Dial gauge */}
                    <div style={{ 
                      background: 'rgba(0,0,0,0.25)', 
                      padding: '16px', 
                      borderRadius: '12px', 
                      textAlign: 'center',
                      border: '1px solid rgba(255,255,255,0.03)',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center',
                      alignItems: 'center'
                    }}>
                      <span style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Ratio ACWR</span>
                      <h2 style={{ fontSize: '2rem', fontWeight: 950, color: badgeColor, margin: '4px 0', textShadow: `0 0 8px ${badgeColor}50` }}>{ratio.toFixed(2)}</h2>
                      <span style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.4)' }}>
                        Aguda {activePt.acute.toFixed(1)} / Crónica {activePt.chronic.toFixed(1)}
                      </span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.7)', margin: 0, lineHeight: '1.45' }}>
                        {desc}
                      </p>
                      <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'start', marginTop: '4px' }}>
                        <ShieldAlert size={14} style={{ color: badgeColor, flexShrink: 0, marginTop: '2px' }} />
                        <p style={{ fontSize: '0.78rem', color: badgeColor, margin: 0, lineHeight: '1.45', fontWeight: 600 }}>
                          Prescripción Kinesiológica: {advice}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

          </div>
        </div>
      )}


    </div>
  );
}
