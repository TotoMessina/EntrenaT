import { timeStringToSeconds, formatPace, calculateHRZones } from './calculators';

/**
 * Carga de forma segura el perfil deportivo de localStorage con valores por defecto.
 */
export const getStoredProfile = () => {
  const age = Number(localStorage.getItem('fitanalytics_profile_age') || localStorage.getItem('fitanalytics_age')) || 25;
  const weight = Number(localStorage.getItem('fitanalytics_profile_weight')) || 75;
  const height = Number(localStorage.getItem('fitanalytics_profile_height')) || 175;
  const restingHR = Number(localStorage.getItem('fitanalytics_profile_resting_hr')) || 60;
  const gender = localStorage.getItem('fitanalytics_profile_gender') || 'male';
  
  return { age, weight, height, restingHR, gender };
};

/**
 * Guarda el perfil en localStorage.
 */
export const saveStoredProfile = (profile) => {
  if (!profile) return;
  localStorage.setItem('fitanalytics_profile_age', profile.age.toString());
  localStorage.setItem('fitanalytics_age', profile.age.toString()); // Sincronización con Calculadoras
  localStorage.setItem('fitanalytics_profile_weight', profile.weight.toString());
  localStorage.setItem('fitanalytics_profile_height', profile.height.toString());
  localStorage.setItem('fitanalytics_profile_resting_hr', profile.restingHR.toString());
  localStorage.setItem('fitanalytics_profile_gender', profile.gender);
};
export const calculateActiveStreak = (workouts) => {
  if (!workouts || workouts.length === 0) return 0;
  
  // Agrupar entrenamientos por semana (Lunes a Domingo)
  const getWeekKey = (dateStr) => {
    const d = new Date(dateStr);
    d.setHours(0, 0, 0, 0);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Lunes
    const monday = new Date(d.setDate(diff));
    return monday.toISOString().split('T')[0];
  };

  const workoutsPerWeek = {};
  workouts.forEach(w => {
    if (w.date) {
      const wk = getWeekKey(w.date);
      workoutsPerWeek[wk] = (workoutsPerWeek[wk] || 0) + 1;
    }
  });

  const now = new Date();
  let streak = 0;
  let weeksBack = 0;
  
  while (true) {
    const d = new Date(now);
    d.setDate(d.getDate() - (weeksBack * 7));
    const wk = getWeekKey(d.toISOString().split('T')[0]);
    
    const count = workoutsPerWeek[wk] || 0;
    
    if (weeksBack === 0) {
      if (count >= 3) {
        streak++;
      }
      // La semana actual no rompe la racha si tiene < 3 porque aún puede cumplir
    } else {
      if (count >= 3) {
        streak++;
      } else {
        break; // Rompe la racha hacia atrás
      }
    }
    weeksBack++;
  }
  
  return streak;
};

const evaluateTier = (value, bronze, silver, gold, isLowerBetter = false) => {
  let tier = 'none';
  let nextTier = 'bronze';
  let nextTarget = bronze;

  if (isLowerBetter) {
    if (value <= gold) { tier = 'gold'; nextTier = 'maxed'; nextTarget = gold; }
    else if (value <= silver) { tier = 'silver'; nextTier = 'gold'; nextTarget = gold; }
    else if (value <= bronze) { tier = 'bronze'; nextTier = 'silver'; nextTarget = silver; }
  } else {
    if (value >= gold) { tier = 'gold'; nextTier = 'maxed'; nextTarget = gold; }
    else if (value >= silver) { tier = 'silver'; nextTier = 'gold'; nextTarget = gold; }
    else if (value >= bronze) { tier = 'bronze'; nextTier = 'silver'; nextTarget = silver; }
  }

  let progressPct = 0;
  if (tier === 'gold') {
    progressPct = 100;
  } else {
    if (isLowerBetter) {
      progressPct = value === Infinity ? 0 : Math.min(99, Math.round((nextTarget / value) * 100));
    } else {
      progressPct = value === 0 ? 0 : Math.min(99, Math.round((value / nextTarget) * 100));
    }
  }

  return { tier, nextTier, nextTarget, progressPct };
};

/**
 * Evalúa dinámicamente los 8 logros avanzados basados en el historial y perfil.
 */
export const calculateAchievements = (workouts, customProfile = null) => {
  const profile = customProfile || getStoredProfile();
  const now = new Date();
  
  const runningWorkouts = workouts.filter(w => w.type === 'running');
  const gymWorkouts = workouts.filter(w => w.type === 'gym');
  
  // --- AUXILIAR: Mejor Ritmo de Running ---
  let bestPaceSecs = Infinity;
  let bestPaceWorkout = null;
  runningWorkouts.forEach(w => {
    const distance = Number(w.distance || 0);
    const secs = timeStringToSeconds(w.duration);
    if (distance > 0 && secs > 0) {
      const pace = secs / distance;
      if (pace < bestPaceSecs) {
        bestPaceSecs = pace;
        bestPaceWorkout = w;
      }
    }
  });

  // --- AUXILIAR: Mayor Peso Absoluto de Gimnasio ---
  let maxWeight = 0;
  let maxWeightExercise = "";
  gymWorkouts.forEach(w => {
    if (Array.isArray(w.exercises)) {
      w.exercises.forEach(ex => {
        const wt = Number(ex.weight || 0);
        if (wt > maxWeight) {
          maxWeight = wt;
          maxWeightExercise = ex.name;
        }
      });
    }
  });

  // ==========================================
  // --- 1. ROMPE-LÍMITES (Ritmo < 5:30, 5:00, 4:30 min/km) ---
  const evalRompeLimites = evaluateTier(bestPaceSecs, 330, 300, 270, true);
  
  // --- 2. VELOCISTA ÉLITE (Ritmo < 4:45, 4:15, 3:45 min/km) ---
  const evalVelocista = evaluateTier(bestPaceSecs, 285, 255, 225, true);

  // --- 3. TITÁN DE HIERRO (Lifting > 80, 100, 130 kg) ---
  const evalTitan = evaluateTier(maxWeight, 80, 100, 130, false);

  // --- 4. FUERZA PROPORCIONAL (Fuerza Relativa al Peso Corporal) ---
  let bestRelativeRatioAchieved = 0;
  let bestRelativeLiftName = "";
  let bestRelativeLiftKg = 0;
  let maxProportionalTier = 'none';
  let minProportionalProgress = 0;
  
  // Evaluamos individualmente para Banca, Sentadilla, PM y tomamos el mejor tier
  gymWorkouts.forEach(w => {
    if (Array.isArray(w.exercises)) {
      w.exercises.forEach(ex => {
        const wt = Number(ex.weight || 0);
        const name = ex.name.toLowerCase();
        if (wt > 0 && profile.weight > 0) {
          const ratio = wt / profile.weight;
          let tierEval = null;
          
          if (name.includes('banca') || name.includes('bench')) {
            tierEval = evaluateTier(ratio, 1.0, 1.2, 1.5, false);
          } else if (name.includes('sentadilla') || name.includes('squat')) {
            tierEval = evaluateTier(ratio, 1.2, 1.5, 2.0, false);
          } else if (name.includes('muerto') || name.includes('deadlift')) {
            tierEval = evaluateTier(ratio, 1.5, 2.0, 2.5, false);
          }
          
          if (tierEval) {
            // Actualizar si es un mejor ratio o mismo ratio pero más progreso
            if (ratio > bestRelativeRatioAchieved) {
              bestRelativeRatioAchieved = ratio;
              bestRelativeLiftName = ex.name;
              bestRelativeLiftKg = wt;
              maxProportionalTier = tierEval.tier;
              minProportionalProgress = tierEval.progressPct;
            }
          }
        }
      });
    }
  });

  const actualRatioVal = profile.weight > 0 ? (bestRelativeLiftKg / profile.weight).toFixed(2) : "0.0";
  // Usamos dummy target values for displaying since proportional works differently
  const evalFuerzaProp = { 
    tier: maxProportionalTier, 
    nextTier: maxProportionalTier === 'none' ? 'bronze' : maxProportionalTier === 'bronze' ? 'silver' : maxProportionalTier === 'silver' ? 'gold' : 'maxed',
    nextTarget: 'Mejorar Ratio',
    progressPct: minProportionalProgress
  };

  // --- 5. MARATONISTA DEL MES (20, 40, 80 km en 30 días) ---
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const recentRuns = runningWorkouts.filter(w => {
    const wDate = new Date(w.date);
    wDate.setHours(23, 59, 59, 999);
    return wDate >= thirtyDaysAgo && wDate <= now;
  });
  const totalDistance30Days = recentRuns.reduce((sum, w) => sum + Number(w.distance || 0), 0);
  const evalMaratonista = evaluateTier(totalDistance30Days, 20.0, 40.0, 80.0, false);

  // --- 6. GLADIADOR DE FONDO (Corrida única >= 10, 15, 21.1 km) ---
  let maxDistanceSingleRun = 0;
  let maxDistanceWorkout = null;
  runningWorkouts.forEach(w => {
    const d = Number(w.distance || 0);
    if (d > maxDistanceSingleRun) {
      maxDistanceSingleRun = d;
      maxDistanceWorkout = w;
    }
  });
  const evalGladiador = evaluateTier(maxDistanceSingleRun, 10.0, 15.0, 21.1, false);

  // --- 7. MOTOR DE ZONA 2 (>= 30, 45, 60 mins continuos en Zona 2) ---
  const zones = calculateHRZones(profile.age);
  const z2Min = zones[1]?.hrMin || 110;
  const z2Max = zones[1]?.hrMax || 135;
  let longestRunInZ2Secs = 0;
  let longestRunInZ2Workout = null;
  runningWorkouts.forEach(w => {
    const durationSecs = timeStringToSeconds(w.duration);
    const hr = Number(w.heartRate || 0);
    if (hr >= z2Min && hr <= z2Max) {
      if (durationSecs > longestRunInZ2Secs) {
        longestRunInZ2Secs = durationSecs;
        longestRunInZ2Workout = w;
      }
    }
  });
  // Evaluamos en minutos
  const evalMotorZ2 = evaluateTier(longestRunInZ2Secs / 60, 30, 45, 60, false);

  // --- 8. CONSISTENCIA INQUEBRANTABLE (10, 15, 22 sesiones en 30 días) ---
  const recentWorkoutsAll = workouts.filter(w => {
    const wDate = new Date(w.date);
    wDate.setHours(23, 59, 59, 999);
    return wDate >= thirtyDaysAgo && wDate <= now;
  });
  const totalRecentWorkoutsCount = recentWorkoutsAll.length;
  const evalConsistencia = evaluateTier(totalRecentWorkoutsCount, 10, 15, 22, false);

  // Funciones formateadoras
  const formatTarget = (t, unit) => t === 'Mejorar Ratio' ? 'Ratio Sup.' : `${t} ${unit}`;

  return [
    {
      id: 'rompe_limites',
      title: 'Rompe-límites',
      subtitle: '⚡ Velocidad Aeróbica',
      description: 'Supera tus barreras corriendo a ritmos promedio impresionantes.',
      targetValue: `< ${formatPace(evalRompeLimites.nextTarget)} /km`,
      currentValue: bestPaceSecs !== Infinity ? formatPace(bestPaceSecs) : '0:00',
      progressPct: evalRompeLimites.progressPct,
      tier: evalRompeLimites.tier,
      nextTier: evalRompeLimites.nextTier,
      isUnlocked: evalRompeLimites.tier !== 'none',
      colorTheme: 'running',
      iconName: 'Zap',
      detailText: bestPaceWorkout ? `Logrado el ${bestPaceWorkout.date}` : null
    },
    {
      id: 'velocista_elite',
      title: 'Velocista Élite',
      subtitle: '🚀 Velocidad de Carrera Avanzada',
      description: 'Lleva tu ritmo al extremo en cualquier sesión de running.',
      targetValue: `< ${formatPace(evalVelocista.nextTarget)} /km`,
      currentValue: bestPaceSecs !== Infinity ? formatPace(bestPaceSecs) : '0:00',
      progressPct: evalVelocista.progressPct,
      tier: evalVelocista.tier,
      nextTier: evalVelocista.nextTier,
      isUnlocked: evalVelocista.tier !== 'none',
      colorTheme: 'running',
      iconName: 'Zap',
      detailText: evalVelocista.tier !== 'none' && bestPaceWorkout ? `Récord el ${bestPaceWorkout.date}` : null
    },
    {
      id: 'titan_hierro',
      title: 'Titán de Hierro',
      subtitle: '🐘 Fuerza Bruta Absoluta',
      description: 'Demuestra tu poder levantando peso en el gimnasio.',
      targetValue: `> ${evalTitan.nextTarget} kg`,
      currentValue: `${maxWeight} kg`,
      progressPct: evalTitan.progressPct,
      tier: evalTitan.tier,
      nextTier: evalTitan.nextTier,
      isUnlocked: evalTitan.tier !== 'none',
      colorTheme: 'gym',
      iconName: 'Dumbbell',
      detailText: maxWeight > 0 ? `En "${maxWeightExercise}"` : null
    },
    {
      id: 'fuerza_proporcional',
      title: 'Fuerza Proporcional',
      subtitle: '🏋️‍♂️ Fuerza Relativa al Peso',
      description: 'Domina tu peso corporal multiplicándolo en Banca, Sentadilla o Peso Muerto.',
      targetValue: evalFuerzaProp.nextTarget,
      currentValue: bestRelativeLiftKg > 0 ? `${actualRatioVal}x corporal` : "0.0x",
      progressPct: evalFuerzaProp.progressPct,
      tier: evalFuerzaProp.tier,
      nextTier: evalFuerzaProp.nextTier,
      isUnlocked: evalFuerzaProp.tier !== 'none',
      colorTheme: 'gym',
      iconName: 'Dumbbell',
      detailText: bestRelativeLiftKg > 0 ? `Destacado en ${bestRelativeLiftName}` : null
    },
    {
      id: 'maratonista_mes',
      title: 'Maratonista del Mes',
      subtitle: '🏃‍♂️ Distancia Acumulada',
      description: 'Constancia e hipertrofia cardiovascular. Suma kilómetros corriendo cada mes.',
      targetValue: `> ${evalMaratonista.nextTarget} km`,
      currentValue: `${totalDistance30Days.toFixed(1)} km`,
      progressPct: evalMaratonista.progressPct,
      tier: evalMaratonista.tier,
      nextTier: evalMaratonista.nextTier,
      isUnlocked: evalMaratonista.tier !== 'none',
      colorTheme: 'primary',
      iconName: 'Trophy',
      detailText: `${recentRuns.length} corridas registradas este mes`
    },
    {
      id: 'gladiador_fondo',
      title: 'Gladiador de Fondo',
      subtitle: '🧭 Distancia Única',
      description: 'Resistencia pura para corredores. Completa sesiones largas de running ininterrumpido.',
      targetValue: `>= ${evalGladiador.nextTarget} km`,
      currentValue: `${maxDistanceSingleRun.toFixed(1)} km`,
      progressPct: evalGladiador.progressPct,
      tier: evalGladiador.tier,
      nextTier: evalGladiador.nextTier,
      isUnlocked: evalGladiador.tier !== 'none',
      colorTheme: 'primary',
      iconName: 'Trophy',
      detailText: evalGladiador.tier !== 'none' && maxDistanceWorkout ? `Récord de ${maxDistanceWorkout.date}` : null
    },
    {
      id: 'motor_zona2',
      title: 'Motor de Zona 2',
      subtitle: '❤️ Resistencia Aeróbica',
      description: 'Desarrolla tu base aeróbica corriendo manteniendo tus pulsaciones medias en Zona 2.',
      targetValue: `>= ${evalMotorZ2.nextTarget} min`,
      currentValue: `${Math.floor(longestRunInZ2Secs / 60)} min`,
      progressPct: evalMotorZ2.progressPct,
      tier: evalMotorZ2.tier,
      nextTier: evalMotorZ2.nextTier,
      isUnlocked: evalMotorZ2.tier !== 'none',
      colorTheme: 'running',
      iconName: 'Award',
      detailText: evalMotorZ2.tier !== 'none' && longestRunInZ2Workout ? `Logrado el ${longestRunInZ2Workout.date}` : null
    },
    {
      id: 'consistencia_inquebrantable',
      title: 'Consistencia Férrea',
      subtitle: '🔥 Entrenamientos Acumulados',
      description: 'Disciplina total completando sesiones de cualquier disciplina en los últimos 30 días.',
      targetValue: `>= ${evalConsistencia.nextTarget} ses.`,
      currentValue: `${totalRecentWorkoutsCount} ses.`,
      progressPct: evalConsistencia.progressPct,
      tier: evalConsistencia.tier,
      nextTier: evalConsistencia.nextTier,
      isUnlocked: evalConsistencia.tier !== 'none',
      colorTheme: 'primary',
      iconName: 'Award',
      detailText: `Actualmente en el mes: ${totalRecentWorkoutsCount} entrenamientos`
    }
  ];
};

/**
 * Genera métricas deportivas avanzadas a nivel de perfil del usuario.
 */
export const getAdvancedAthleticStats = (workouts, customProfile = null) => {
  const profile = customProfile || getStoredProfile();
  
  // 1. VO2 Máx Estimado por Frecuencia Cardíaca (Uth-Sørensen formula)
  const maxHR = Math.round(208 - 0.7 * profile.age);
  const vo2MaxHR = profile.restingHR > 0 ? (15.3 * (maxHR / profile.restingHR)).toFixed(1) : "N/A";
  
  // 2. VO2 Máx Estimado por rendimiento (Pace de Cooper sobre la mejor corrida de 10K/5K)
  const runningWorkouts = workouts.filter(w => w.type === 'running');
  let bestPaceSecs = Infinity;
  runningWorkouts.forEach(w => {
    const d = Number(w.distance || 0);
    const secs = timeStringToSeconds(w.duration);
    if (d > 0 && secs > 0) {
      const pace = secs / d;
      if (pace < bestPaceSecs) bestPaceSecs = pace;
    }
  });

  let vo2MaxPerf = "N/A";
  if (bestPaceSecs !== Infinity) {
    // Estimación Cooper modificada: VO2 Max = (22.35 * velocidad_km_h) - 11.288
    const speedKmh = 3600 / bestPaceSecs;
    vo2MaxPerf = ((22.35 * speedKmh) - 11.288).toFixed(1);
  }

  // Clasificación del VO2 Máx (HR basis)
  let vo2MaxRating = "Bueno";
  const vo2Num = parseFloat(vo2MaxHR);
  if (!isNaN(vo2Num)) {
    if (vo2Num > 52) vo2MaxRating = "Excelente (Élite Amateur)";
    else if (vo2Num > 46) vo2MaxRating = "Superior";
    else if (vo2Num > 40) vo2MaxRating = "Bueno";
    else vo2MaxRating = "Aceptable";
  }

  // 3. Récord de Relación de Fuerza Relativa en Gimnasio
  let bestBench = 0;
  let bestSquat = 0;
  let bestDeadlift = 0;
  
  workouts.filter(w => w.type === 'gym').forEach(w => {
    if (Array.isArray(w.exercises)) {
      w.exercises.forEach(ex => {
        const wt = Number(ex.weight || 0);
        const name = ex.name.toLowerCase();
        if (wt > 0) {
          if (name.includes('banca') || name.includes('bench')) {
            if (wt > bestBench) bestBench = wt;
          } else if (name.includes('sentadilla') || name.includes('squat')) {
            if (wt > bestSquat) bestSquat = wt;
          } else if (name.includes('muerto') || name.includes('deadlift')) {
            if (wt > bestDeadlift) bestDeadlift = wt;
          }
        }
      });
    }
  });

  const benchRatio = profile.weight > 0 ? (bestBench / profile.weight).toFixed(2) : "0.00";
  const squatRatio = profile.weight > 0 ? (bestSquat / profile.weight).toFixed(2) : "0.00";
  const deadliftRatio = profile.weight > 0 ? (bestDeadlift / profile.weight).toFixed(2) : "0.00";

  return {
    maxHR,
    vo2MaxHR,
    vo2MaxPerf,
    vo2MaxRating,
    bestBench,
    bestSquat,
    bestDeadlift,
    benchRatio,
    squatRatio,
    deadliftRatio,
    profileWeight: profile.weight
  };
};
