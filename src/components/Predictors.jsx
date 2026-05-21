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
  solveVDOTTime
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
  
  const [estimated1RM, setEstimated1RM] = useState(0);
  const [gymRecommendations, setGymRecommendations] = useState([]);
  
  // Custom Gym Slider Percentage
  const [customPct, setCustomPct] = useState(80);

  // --- CUSTOM DYNAMIC SPORTS INTEL STATES ---
  const [activeGymExercise, setActiveGymExercise] = useState('bench_press'); // bench_press, squat, deadlift
  const [hoveredGymPoint, setHoveredGymPoint] = useState(null);
  const [hoveredFitnessPoint, setHoveredFitnessPoint] = useState(null);
  const [hoveredWorkout, setHoveredWorkout] = useState(null);

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
      const computed1RM = calculate1RM(w, r);
      setEstimated1RM(computed1RM);
      const recs = getRecommendedGymWeights(w, r);
      setGymRecommendations(recs);
    }
  };

  useEffect(() => {
    handleCalculateGym();
  }, [refWeight, refReps]);

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
        let matchedName = '';

        w.exercises.forEach(ex => {
          const exName = (ex.name || '').toLowerCase();
          const matches = trackEx.keywords.some(kw => exName.includes(kw));
          if (matches) {
            const weight = Number(ex.weight) || 0;
            const reps = Number(ex.reps) || 0;
            if (weight > 0 && reps > 0) {
              const oneRepMax = reps === 1 ? weight : weight * (1 + reps / 30);
              if (oneRepMax > max1RM) {
                max1RM = oneRepMax;
                matchedWeight = weight;
                matchedReps = reps;
                matchedName = ex.name;
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
            exName: matchedName
          });
        }
      });
    });

    return history;
  }, [workouts]);

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
  const aiCoachTelemetry = React.useMemo(() => {
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(today.getDate() - 30);
    thirtyDaysAgo.setHours(0, 0, 0, 0);

    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(today.getDate() - 7);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const recentWorkouts = workouts.filter(w => {
      if (!w.date) return false;
      const wDate = new Date(w.date + 'T00:00:00');
      return wDate >= thirtyDaysAgo && wDate <= today;
    });

    const acuteWorkouts = recentWorkouts.filter(w => {
      const wDate = new Date(w.date + 'T00:00:00');
      return wDate >= sevenDaysAgo && wDate <= today;
    });

    // Cardiovascular Load (TRIMP equivalent = minutes * intensity)
    const getCardioLoad = (w) => {
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
      
      const intensity = w.heartRate ? (Number(w.heartRate) / 100) : (Number(w.rpe) || 6);
      return mins * intensity;
    };

    const acuteCardioLoads = acuteWorkouts.filter(w => w.type === 'running').map(getCardioLoad);
    const chronicCardioLoads = recentWorkouts.filter(w => w.type === 'running').map(getCardioLoad);

    const acuteCardioLoad = acuteCardioLoads.reduce((a, b) => a + b, 0);
    const chronicCardioLoad = chronicCardioLoads.reduce((a, b) => a + b, 0) / 4; // weekly average
    const cardioACWR = chronicCardioLoad > 0 ? (acuteCardioLoad / chronicCardioLoad) : 1.0;

    // Muscular Volume Carga (sets * reps * weight)
    const getGymVolume = (w) => {
      let vol = 0;
      if (w.exercises && Array.isArray(w.exercises)) {
        w.exercises.forEach(ex => {
          vol += (Number(ex.sets) || 0) * (Number(ex.reps) || 0) * (Number(ex.weight) || 0);
        });
      }
      return vol;
    };

    const acuteGymVolumes = acuteWorkouts.filter(w => w.type === 'gym').map(getGymVolume);
    const chronicGymVolumes = recentWorkouts.filter(w => w.type === 'gym').map(getGymVolume);

    const acuteGymLoad = acuteGymVolumes.reduce((a, b) => a + b, 0);
    const chronicGymLoad = chronicGymVolumes.reduce((a, b) => a + b, 0) / 4; // weekly average
    const strengthACWR = chronicGymLoad > 0 ? (acuteGymLoad / chronicGymLoad) : 1.0;

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
          else if (m.includes('pierna') || m.includes('sentadilla') || m.includes('femoral') || m.includes('cuad')) key = 'piernas';
          else if (m.includes('hombro') || m.includes('deltoide')) key = 'hombros';
          else if (m.includes('brazo') || m.includes('curl') || m.includes('bicep') || m.includes('tricep')) key = 'brazos';

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
      acuteCardioLoad,
      chronicCardioLoad,
      cardioACWR,
      acuteGymLoad,
      chronicGymLoad,
      strengthACWR,
      muscleRecency,
      recommendation
    };
  }, [workouts, profile]);

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

      {/* Switcher */}
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
              
              <div className="form-row-2">
                <div className="form-group">
                  <label className="form-label">Peso Levantado (kg)</label>
                  <input
                    type="number"
                    value={refWeight}
                    onChange={(e) => setRefWeight(e.target.value)}
                    className="form-input"
                    placeholder="Ej: 80"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Repeticiones Logradas</label>
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
              </div>

              <div className="calculated-1rm-box mb-4">
                <span className="label text-muted">1RM Máximo Estimado</span>
                <h2 className="value gym-text font-extrabold">{estimated1RM.toFixed(1)} <span className="unit">kg</span></h2>
                <span className="subtext">Fórmula de Epley</span>
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

      <style>{`
        .predictors-container {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .predictors-header {
          margin-bottom: 0.5rem;
        }

        .text-3xl {
          font-size: 1.85rem;
          font-weight: 800;
        }

        .text-secondary {
          color: var(--text-secondary);
        }

        .text-sm {
          font-size: 0.9rem;
          margin-top: 0.25rem;
        }

        .text-xs {
          font-size: 0.75rem;
        }

        .mb-5 { margin-bottom: 1.25rem; }
        .mb-4 { margin-bottom: 1rem; }
        .mb-3 { margin-bottom: 0.75rem; }
        .mt-3 { margin-top: 0.75rem; }

        /* Grid structures */
        .grid-panels {
          display: grid;
          grid-template-columns: 1fr 1.6fr;
          gap: 1.5rem;
          align-items: start;
        }

        @media (max-width: 900px) {
          .grid-panels {
            grid-template-columns: 1fr;
          }
        }

        .panel-left {
          padding: 1.5rem;
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }

        .panel-right {
          padding: 1.5rem;
        }

        .panel-right-group {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .panel-title {
          font-size: 1.1rem;
          font-weight: 700;
          color: var(--text-primary);
          gap: 0.4rem;
        }

        /* Time pickers */
        .time-inputs-group {
          display: flex;
          align-items: center;
          gap: 0.4rem;
        }

        .time-separator {
          font-weight: bold;
          color: var(--text-muted);
        }

        /* Info boxes */
        .calculator-info-box {
          display: flex;
          gap: 0.75rem;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid var(--border-light);
          padding: 0.75rem;
          border-radius: 10px;
        }

        .calculator-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.85rem;
          text-align: left;
        }

        .calculator-table th {
          color: var(--text-muted);
          font-weight: 600;
          padding: 0.6rem 0.75rem;
          border-bottom: 1px solid var(--border-light);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          font-size: 0.75rem;
        }

        .calculator-table td {
          padding: 0.85rem 0.75rem;
          border-bottom: 1px solid rgba(255, 255, 255, 0.03);
          color: var(--text-primary);
          vertical-align: middle;
        }

        .calculator-table tr:last-child td {
          border-bottom: none;
        }

        .reference-row {
          background-color: rgba(16, 185, 129, 0.05);
        }

        .center { text-align: center; }
        .right { text-align: right; }

        /* Running zones cards */
        .zones-card-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
          margin-top: 0.5rem;
        }

        @media (max-width: 600px) {
          .zones-card-grid {
            grid-template-columns: 1fr;
          }
        }

        .zone-card {
          padding: 0.85rem;
          background: rgba(255, 255, 255, 0.01);
          border: 1px solid var(--border-light);
          border-radius: 10px;
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
          transition: border-color var(--transition-fast);
        }

        .zone-card:hover {
          border-color: rgba(16, 185, 129, 0.25);
        }

        .zone-card-header {
          display: flex;
          justify-content: space-between;
          font-size: 0.75rem;
          font-weight: 600;
          color: var(--text-secondary);
        }

        .zone-name {
          font-weight: 700;
          color: var(--text-primary);
        }

        .zone-pace-range {
          font-size: 1.15rem;
          font-weight: 800;
          color: var(--color-running);
        }

        .zone-desc {
          font-size: 0.75rem;
          color: var(--text-muted);
          line-height: 1.3;
        }

        /* Gym 1RM Output */
        .calculated-1rm-box {
          padding: 1.25rem;
          background: rgba(236, 72, 153, 0.04);
          border: 1px dashed rgba(236, 72, 153, 0.2);
          border-radius: 12px;
          text-align: center;
          display: flex;
          flex-direction: column;
          gap: 0.15rem;
        }

        .calculated-1rm-box .value {
          font-size: 2.2rem;
          line-height: 1;
          margin: 0.25rem 0;
        }

        .calculated-1rm-box .unit {
          font-size: 1.1rem;
          font-weight: 500;
          color: var(--text-secondary);
        }

        /* Custom Gym weight slider */
        .custom-slider-card {
          padding: 1rem;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid var(--border-light);
          border-radius: 12px;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .slider-header {
          display: flex;
          justify-content: space-between;
        }

        .custom-range-slider {
          width: 100%;
          -webkit-appearance: none;
          background: rgba(255, 255, 255, 0.1);
          height: 6px;
          border-radius: 3px;
          outline: none;
        }

        .custom-range-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: var(--color-gym);
          cursor: pointer;
          box-shadow: 0 0 10px rgba(236, 72, 153, 0.5);
          transition: transform var(--transition-fast);
        }

        .custom-range-slider::-webkit-slider-thumb:hover {
          transform: scale(1.2);
        }

        .slider-result {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 0.85rem;
          color: var(--text-secondary);
        }

        .slider-result strong {
          font-size: 1.1rem;
        }

        .rec-goal-name {
          font-size: 0.85rem;
          font-weight: 700;
        }

        .rec-goal-desc {
          margin-top: 0.15rem;
          line-height: 1.3;
        }

        /* Tab switcher local styling */
        .tab-switcher {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 0.75rem;
          background-color: rgba(0, 0, 0, 0.2);
          padding: 0.35rem;
          border-radius: 12px;
          border: 1px solid var(--border-light);
        }

        @media (max-width: 900px) {
          .tab-switcher {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 500px) {
          .tab-switcher {
            grid-template-columns: 1fr;
          }
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
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
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

        .tab-btn.active-hr {
          background: linear-gradient(135deg, #ef4444 0%, #b91c1c 100%);
          color: #ffffff;
          box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
        }

        .hr-zones-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .hr-zone-item {
          background: rgba(255, 255, 255, 0.01);
          border: 1px solid var(--border-light);
          border-left-width: 4px;
          padding: 1rem;
          border-radius: 12px;
          transition: all var(--transition-normal);
        }

        .hr-zone-item:hover {
          background: rgba(255, 255, 255, 0.02);
          border-color: rgba(255, 255, 255, 0.1);
        }

        .hr-zone-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.5rem;
          flex-wrap: wrap;
          gap: 0.5rem;
        }

        .hr-zone-title-group {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .hr-zone-badge {
          padding: 0.2rem 0.5rem;
          border-radius: 6px;
          font-weight: 700;
          font-size: 0.75rem;
        }

        .hr-zone-name {
          font-size: 0.95rem;
          color: var(--text-primary);
        }

        .hr-zone-bpm {
          font-size: 1.05rem;
          font-weight: 700;
        }

        .hr-zone-details {
          font-size: 0.8rem;
          color: var(--text-secondary);
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
          line-height: 1.4;
        }

        .hr-zone-benefit {
          color: var(--text-muted);
          font-size: 0.75rem;
        }

        /* Custom range slider styling */
        .custom-range-slider {
          flex: 1;
          -webkit-appearance: none;
          background: rgba(255, 255, 255, 0.08);
          height: 8px;
          border-radius: 4px;
          outline: none;
          transition: background 0.3s;
        }
        
        .custom-range-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: ${activeCalculator === 'heartrate' ? '#ef4444' : 'var(--color-gym)'};
          cursor: pointer;
          box-shadow: 0 0 10px ${activeCalculator === 'heartrate' ? 'rgba(239, 68, 68, 0.5)' : 'rgba(236, 72, 153, 0.5)'};
          transition: transform var(--transition-fast);
        }
        
        .custom-range-slider::-webkit-slider-thumb:hover {
          transform: scale(1.2);
        }

        /* --- AI Entrenador Virtual por IA Local-Styles --- */
        .tab-btn.active-ai-coach {
          background: linear-gradient(135deg, #a855f7 0%, #6366f1 100%) !important;
          color: #ffffff !important;
          box-shadow: 0 4px 12px rgba(168, 85, 247, 0.4) !important;
        }

        .ai-coach-glow-text {
          color: #a855f7;
          filter: drop-shadow(0 0 4px rgba(168, 85, 247, 0.5));
        }

        /* AI Core Styling */
        .ai-core-visualizer {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 2.25rem 1.5rem;
          background: rgba(168, 85, 247, 0.02);
          border: 1px solid rgba(168, 85, 247, 0.15);
          border-radius: 16px;
          margin-bottom: 1.5rem;
          position: relative;
          overflow: hidden;
          text-align: center;
        }

        .ai-core-brain {
          width: 74px;
          height: 74px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(168, 85, 247, 0.25) 0%, rgba(99, 102, 241, 0.05) 70%);
          border: 2px solid rgba(168, 85, 247, 0.35);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 0 25px rgba(168, 85, 247, 0.35);
          position: relative;
          z-index: 2;
          margin-bottom: 1rem;
        }

        .ai-brain-icon {
          color: #a855f7;
          filter: drop-shadow(0 0 8px #a855f7);
          animation: float-ai-brain 3s ease-in-out infinite;
        }

        @keyframes float-ai-brain {
          0%, 100% { transform: translateY(0) scale(1); }
          50% { transform: translateY(-4px) scale(1.05); }
        }

        .ai-core-pulse {
          position: absolute;
          width: 90px;
          height: 90px;
          border-radius: 50%;
          border: 1px solid rgba(168, 85, 247, 0.25);
          animation: core-pulse-animate 3s infinite linear;
          pointer-events: none;
          z-index: 1;
        }

        @keyframes core-pulse-animate {
          0% { transform: scale(0.6); opacity: 1; }
          100% { transform: scale(1.6); opacity: 0; }
        }

        .ai-core-status {
          font-size: 0.72rem;
          font-weight: 800;
          letter-spacing: 0.15em;
          color: #a855f7;
          text-shadow: 0 0 8px rgba(168, 85, 247, 0.6);
          margin-bottom: 0.25rem;
        }

        .ai-core-telemetry {
          font-size: 0.65rem;
          letter-spacing: 0.05em;
        }

        /* AI dials section */
        .ai-coach-dials-section {
          display: flex;
          flex-direction: column;
          gap: 1.15rem;
        }

        .dial-stat-item {
          background: rgba(255, 255, 255, 0.015);
          border: 1px solid var(--border-light);
          padding: 0.85rem;
          border-radius: 12px;
        }

        .dial-header {
          display: flex;
          justify-content: space-between;
          margin-bottom: 0.5rem;
        }

        .dial-label {
          color: var(--text-secondary);
        }

        .dial-bar-track {
          width: 100%;
          height: 6px;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 10px;
          overflow: hidden;
          margin-bottom: 0.35rem;
        }

        .dial-bar-fill {
          height: 100%;
          border-radius: 10px;
          transition: width 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }

        .fill-cardio {
          box-shadow: 0 0 10px rgba(16, 185, 129, 0.4);
        }

        .fill-strength {
          box-shadow: 0 0 10px rgba(236, 72, 153, 0.4);
        }

        /* AI Prescription Card */
        .ai-prescription-card {
          padding: 1.75rem !important;
          background: linear-gradient(135deg, rgba(168, 85, 247, 0.04) 0%, rgba(99, 102, 241, 0.01) 100%);
          border: 1px solid rgba(168, 85, 247, 0.25) !important;
          box-shadow: 0 8px 32px rgba(168, 85, 247, 0.05), inset 0 0 12px rgba(168, 85, 247, 0.02);
        }

        .ai-recommendation-badge {
          padding: 0.3rem 0.75rem;
          font-size: 0.68rem;
          font-weight: 800;
          letter-spacing: 0.08em;
          border-radius: 20px;
          border: 1px solid rgba(168, 85, 247, 0.4);
          background: rgba(168, 85, 247, 0.12);
          color: #c084fc;
          display: inline-block;
          text-shadow: 0 0 4px rgba(168, 85, 247, 0.3);
        }

        .ai-science-alert {
          background: rgba(255, 255, 255, 0.015);
          border: 1px solid var(--border-light);
          padding: 0.85rem;
          border-radius: 10px;
          position: relative;
          overflow: hidden;
          margin-top: 1rem;
        }

        .alert-glow {
          position: absolute;
          top: 0;
          left: 0;
          width: 3px;
          height: 100%;
          background: #a855f7;
          box-shadow: 0 0 8px #a855f7;
        }

        /* Muscle state cards */
        .muscle-status-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 0.75rem;
        }

        @media (max-width: 600px) {
          .muscle-status-grid {
            grid-template-columns: 1fr;
          }
        }

        .muscle-status-card {
          background: rgba(255, 255, 255, 0.015);
          border: 1px solid var(--border-light);
          padding: 0.85rem;
          border-radius: 10px;
          transition: transform var(--transition-fast);
        }

        .muscle-status-card:hover {
          transform: translateY(-2px);
          background: rgba(255, 255, 255, 0.025);
        }

        .muscle-card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .muscle-name {
          color: var(--text-primary);
          font-weight: 700;
        }

        .muscle-desc {
          color: var(--text-secondary);
          line-height: 1.35;
        }

        /* --- ANALIZADOR RIEGEL-COOPER ELITE STYLES --- */
        .physiological-realism-card {
          padding: 1.75rem !important;
          background: linear-gradient(135deg, rgba(139, 92, 246, 0.04) 0%, rgba(6, 182, 212, 0.01) 100%);
          border: 1px solid rgba(139, 92, 246, 0.25) !important;
          box-shadow: 0 8px 32px rgba(139, 92, 246, 0.05), inset 0 0 12px rgba(139, 92, 246, 0.02);
          transition: transform var(--transition-normal), border-color var(--transition-normal);
        }

        .physiological-realism-card:hover {
          border-color: rgba(139, 92, 246, 0.4) !important;
          box-shadow: 0 12px 40px rgba(139, 92, 246, 0.08), inset 0 0 16px rgba(139, 92, 246, 0.04);
        }

        .bg-purple-glow {
          border: 1px solid rgba(139, 92, 246, 0.4) !important;
          background: rgba(139, 92, 246, 0.12) !important;
          color: #c084fc !important;
          text-shadow: 0 0 4px rgba(139, 92, 246, 0.3);
        }

        .bg-green-glow {
          border: 1px solid rgba(16, 185, 129, 0.4) !important;
          background: rgba(16, 185, 129, 0.12) !important;
          color: #34d399 !important;
          text-shadow: 0 0 4px rgba(16, 185, 129, 0.3);
        }

        .exponent-comparison-container {
          background: rgba(255, 255, 255, 0.015);
          border: 1px solid var(--border-light);
          padding: 1rem;
          border-radius: 12px;
        }

        .comparison-bar-track {
          width: 100%;
          height: 10px;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 10px;
          position: relative;
          overflow: hidden;
        }

        .comparison-bar-fill-base {
          position: absolute;
          left: 0;
          top: 0;
          height: 100%;
          width: 40%;
          background: #10b981;
          box-shadow: 0 0 8px rgba(16, 185, 129, 0.4);
          border-radius: 10px 0 0 10px;
          z-index: 1;
        }

        .comparison-bar-fill-custom {
          position: absolute;
          left: 0;
          top: 0;
          height: 100%;
          background: linear-gradient(90deg, #8b5cf6 0%, #a855f7 100%);
          box-shadow: 0 0 12px rgba(139, 92, 246, 0.6);
          border-radius: 10px;
          z-index: 2;
          transition: width 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }

        .telemetry-bars-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 1rem;
        }

        @media (max-width: 600px) {
          .telemetry-bars-grid {
            grid-template-columns: 1fr;
          }
        }

        .telemetry-bar-item {
          background: rgba(255, 255, 255, 0.01);
          border: 1px solid var(--border-light);
          padding: 0.75rem;
          border-radius: 10px;
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
        }

        /* --- Jack Daniels VDOT Dial & Scale --- */
        .vdot-dial-box {
          padding: 1.25rem;
          background: rgba(16, 185, 129, 0.03);
          border: 1px solid rgba(16, 185, 129, 0.15);
          border-radius: 16px;
          display: flex;
          flex-direction: column;
          align-items: center;
          position: relative;
          overflow: hidden;
        }

        .vdot-dial-circle {
          position: relative;
          width: 140px;
          height: 140px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .vdot-svg {
          transform: rotate(-90deg);
          width: 100%;
          height: 100%;
        }

        .vdot-track {
          fill: none;
          stroke: rgba(255, 255, 255, 0.05);
          stroke-width: 8;
        }

        .vdot-indicator {
          fill: none;
          stroke: url(#vdotGrad);
          stroke-width: 8;
          stroke-linecap: round;
          transition: stroke-dashoffset 1s ease-out;
        }

        .vdot-dial-value-container {
          position: absolute;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
        }

        .vdot-dial-label {
          font-size: 0.7rem;
          font-weight: 800;
          letter-spacing: 0.1rem;
          color: var(--text-muted);
          text-transform: uppercase;
        }

        .vdot-dial-value {
          font-size: 2.2rem;
          line-height: 1;
          margin: 0.15rem 0;
          color: var(--color-running);
          text-shadow: 0 0 10px rgba(16, 185, 129, 0.4);
        }

        .vdot-dial-unit {
          font-size: 0.65rem;
          color: var(--text-muted);
        }

        .vdot-elite-scale {
          width: 100%;
        }

        /* --- DYNAMIC STRENGTH & FITNESS INTEL ADDITIONS --- */
        .gym-exercise-selector {
          display: flex;
          gap: 0.5rem;
        }

        .gym-pill-btn {
          padding: 0.4rem 1rem;
          border: 1px solid rgba(255, 255, 255, 0.05);
          background: rgba(255, 255, 255, 0.01);
          color: var(--text-secondary);
          font-weight: 700;
          font-size: 0.78rem;
          border-radius: 20px;
          cursor: pointer;
          transition: all var(--transition-fast);
        }

        .gym-pill-btn:hover {
          color: var(--text-primary);
          background: rgba(255, 255, 255, 0.03);
          border-color: rgba(255, 255, 255, 0.15);
        }

        .gym-pill-btn.active-bench {
          background: rgba(236, 72, 153, 0.12) !important;
          border-color: rgba(236, 72, 153, 0.4) !important;
          color: #f472b6 !important;
          box-shadow: 0 0 10px rgba(236, 72, 153, 0.15);
        }

        .gym-pill-btn.active-squat {
          background: rgba(16, 185, 129, 0.12) !important;
          border-color: rgba(16, 185, 129, 0.4) !important;
          color: #34d399 !important;
          box-shadow: 0 0 10px rgba(16, 185, 129, 0.15);
        }

        .gym-pill-btn.active-deadlift {
          background: rgba(59, 130, 246, 0.12) !important;
          border-color: rgba(59, 130, 246, 0.4) !important;
          color: #60a5fa !important;
          box-shadow: 0 0 10px rgba(59, 130, 246, 0.15);
        }

        .bg-gym-badge {
          border: 1px solid rgba(236, 72, 153, 0.3) !important;
          background: rgba(236, 72, 153, 0.1) !important;
          color: #f472b6 !important;
        }

        .gym-tooltip-card, .fitness-tooltip-card {
          animation: tooltip-scale 0.15s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }

        @keyframes tooltip-scale {
          0% { transform: translate(-50%, -85%) scale(0.9); opacity: 0; }
          100% { transform: translate(-50%, -100%) scale(1); opacity: 1; }
        }

        @media (max-width: 768px) {
          .tsb-grid-mobile {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
