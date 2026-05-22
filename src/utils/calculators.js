/**
 * Utilidades matemáticas para predicción de running y gimnasio
 */

// --- UTILITIES PARA TIEMPO ---

/**
 * Convierte un string de tiempo "HH:MM:SS" o "MM:SS" a segundos
 */
export const timeStringToSeconds = (timeStr) => {
  if (!timeStr) return 0;
  const parts = timeStr.split(':').map(Number);
  if (parts.length === 3) {
    // HH:MM:SS
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  } else if (parts.length === 2) {
    // MM:SS
    return parts[0] * 60 + parts[1];
  }
  return Number(timeStr) || 0;
};

/**
 * Convierte segundos a string "HH:MM:SS"
 */
export const secondsToTimeString = (secs) => {
  if (isNaN(secs) || secs < 0) return "00:00:00";
  const hours = Math.floor(secs / 3600);
  const minutes = Math.floor((secs % 3600) / 60);
  const seconds = Math.round(secs % 60);
  
  const pad = (num) => String(num).padStart(2, '0');
  
  if (hours > 0) {
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  }
  return `00:${pad(minutes)}:${pad(seconds)}`;
};

/**
 * Formatea segundos a ritmo "MM:SS /km"
 */
export const formatPace = (secsPerKm) => {
  if (isNaN(secsPerKm) || secsPerKm === Infinity || secsPerKm <= 0) return "--:--";
  const minutes = Math.floor(secsPerKm / 60);
  const seconds = Math.round(secsPerKm % 60);
  return `${minutes}:${String(seconds).padStart(2, '0')} min/km`;
};

// --- RUNNING: MOTOR FISIOLÓGICO DE TRES VARIABLES DE DANIELS VDOT ---

/**
 * Calcula VDOT de Jack Daniels para una distancia y duración dadas.
 */
export const calculateVDOT = (distanceKm, durationSecs) => {
  if (distanceKm <= 0 || durationSecs <= 0) return 0;
  const tMins = durationSecs / 60;
  const v = (distanceKm * 1000) / tMins; // m/min
  const vo2 = -4.60 + 0.182258 * v + 0.000104 * v * v;
  const pct = 0.2989558 * Math.exp(-0.1932605 * tMins) + 0.1894393 * Math.exp(-0.012778 * tMins) + 0.8;
  return vo2 / pct;
};

/**
 * Encuentra el mejor esfuerzo (tiempo mínimo en segundos) para recorrer
 * una distancia objetivo basándose en parciales contiguos (laps/splits).
 * splits: Array de { splitNumber: Number, distance: Number (en metros), time: String ("HH:MM:SS" o "MM:SS") }
 */
export const getBestEffortFromSplits = (splits = [], targetDistanceKm) => {
  if (!Array.isArray(splits) || splits.length === 0 || targetDistanceKm <= 0) return null;
  const targetMeters = targetDistanceKm * 1000;
  
  // Limpiar y parsear splits
  const cleanSplits = splits.map(s => ({
    distance: Number(s.distance) || 0,
    seconds: timeStringToSeconds(s.time)
  })).filter(s => s.distance > 0 && s.seconds > 0);
  
  if (cleanSplits.length === 0) return null;
  
  let bestTime = Infinity;
  
  // Evaluar todas las ventanas contiguas de splits
  for (let i = 0; i < cleanSplits.length; i++) {
    let currentDistance = 0;
    let currentSeconds = 0;
    
    for (let j = i; j < cleanSplits.length; j++) {
      currentDistance += cleanSplits[j].distance;
      currentSeconds += cleanSplits[j].seconds;
      
      if (currentDistance >= targetMeters) {
        // Encontramos una ventana que cubre la distancia objetivo.
        // Estimamos el tiempo exacto por interpolación lineal / paso promedio de la ventana
        const estimatedTime = (targetMeters / currentDistance) * currentSeconds;
        if (estimatedTime < bestTime) {
          bestTime = estimatedTime;
        }
        break; // Pasamos a la siguiente ventana de inicio i
      }
    }
  }
  
  return bestTime === Infinity ? null : bestTime;
};


/**
 * Resuelve la velocidad correspondiente a un consumo de oxígeno (VO2)
 * a través de la ecuación cuadrática inversa de Daniels.
 * VO2 = -4.60 + 0.182258 * v + 0.000104 * v^2
 * Reordenando: 0.000104 * v^2 + 0.182258 * v - (4.60 + VO2) = 0
 */
const solveVelocityForVO2 = (vo2) => {
  const a = 0.000104;
  const b = 0.182258;
  const c = -(4.60 + vo2);
  const discriminant = b * b - 4 * a * c;
  if (discriminant < 0) return 0;
  return (-b + Math.sqrt(discriminant)) / (2 * a);
};

/**
 * Resuelve el tiempo (duración en segundos) para recorrer una distancia objetivo dada
 * basándose en el VDOT asignado mediante búsqueda binaria de alta velocidad.
 * Convergencia garantizada a un épsilon de 1e-5.
 */
export const solveVDOTTime = (distance, vdot) => {
  if (distance <= 0 || vdot <= 0) return 0;
  let low = 0.5; // 30 segundos
  let high = 1440.0; // 24 horas (en minutos)
  let t = 0;
  
  for (let iter = 0; iter < 100; iter++) {
    t = (low + high) / 2;
    const v = (distance * 1000) / t; // m/min
    const vo2 = -4.60 + 0.182258 * v + 0.000104 * v * v;
    const pct = 0.2989558 * Math.exp(-0.1932605 * t) + 0.1894393 * Math.exp(-0.012778 * t) + 0.8;
    const estimatedVDOT = vo2 / pct;
    
    if (Math.abs(estimatedVDOT - vdot) < 0.00001) {
      break;
    }
    
    // Si el VDOT estimado es mayor que el real, significa que el tiempo fue muy corto (velocidad demasiado alta)
    // por lo que debemos ampliar el tiempo de búsqueda (bajar la velocidad).
    if (estimatedVDOT > vdot) {
      low = t;
    } else {
      high = t;
    }
  }
  
  return t * 60; // Retornar en segundos
};

/**
 * Analiza el historial de entrenamientos para extraer récords personales en distancias clave
 * y calcular el exponente de decaimiento aeróbico real de Riegel.
 */
export const calculateRecordBasedExponent = (workouts = []) => {
  if (!workouts || workouts.length === 0) {
    return {
      hasCalculatedFromRecords: false,
      recordExponent: 1.06,
      recordsUsed: []
    };
  }

  // Filtrar entrenamientos running con datos válidos
  const runs = workouts.filter(w => {
    if (w.type !== 'running' || !w.distance || !w.duration) return false;
    const secs = timeStringToSeconds(w.duration);
    return secs > 0 && Number(w.distance) >= 0.8;
  });

  if (runs.length === 0) {
    return {
      hasCalculatedFromRecords: false,
      recordExponent: 1.06,
      recordsUsed: []
    };
  }

  // Categorías estándar: [minDist, maxDist, label]
  const categories = [
    { name: "1K", min: 0.8, max: 2.5, targetDist: 1.0 },
    { name: "5K", min: 4.0, max: 7.5, targetDist: 5.0 },
    { name: "10K", min: 8.5, max: 14.0, targetDist: 10.0 },
    { name: "21K", min: 18.0, max: 26.0, targetDist: 21.097 },
    { name: "42K", min: 35.0, max: 50.0, targetDist: 42.195 }
  ];

  // Encontrar el mejor tiempo por categoría (1K, 5K, 10K, 21K, 42K)
  const records = {};
  runs.forEach(run => {
    const dist = Number(run.distance);
    const secs = timeStringToSeconds(run.duration);
    const overallPace = secs / dist; // segs/km
    const workoutSplits = run.splits || run.advanced_metrics?.splits;

    categories.forEach(cat => {
      // 1. Evaluar si la corrida tiene parciales y si de ahí se extrae un mejor tiempo para el target exacto
      if (Array.isArray(workoutSplits) && workoutSplits.length > 0) {
        const splitTimeSecs = getBestEffortFromSplits(workoutSplits, cat.targetDist);
        if (splitTimeSecs !== null) {
          const splitPace = splitTimeSecs / cat.targetDist;
          if (!records[cat.name] || splitPace < records[cat.name].pace) {
            records[cat.name] = {
              distance: cat.targetDist,
              duration: splitTimeSecs,
              pace: splitPace,
              workoutDate: run.date,
              name: cat.name,
              isFromSplits: true
            };
          }
        }
      }

      // 2. Evaluar de forma global (comportamiento clásico) si el volumen total cae en el rango
      if (dist >= cat.min && dist <= cat.max) {
        if (!records[cat.name] || overallPace < records[cat.name].pace) {
          records[cat.name] = {
            distance: dist,
            duration: secs,
            pace: overallPace,
            workoutDate: run.date,
            name: cat.name,
            isFromSplits: false
          };
        }
      }
    });
  });

  const recordsUsed = Object.values(records).sort((a, b) => a.distance - b.distance);

  // Si tenemos menos de 2 marcas independientes, no podemos calcular el decaimiento real
  if (recordsUsed.length < 2) {
    return {
      hasCalculatedFromRecords: false,
      recordExponent: 1.06,
      recordsUsed
    };
  }

  // Realizar comparaciones pareadas entre categorías
  let sumExponents = 0;
  let countComparisons = 0;
  const computedExponents = [];

  for (let i = 0; i < recordsUsed.length; i++) {
    for (let j = i + 1; j < recordsUsed.length; j++) {
      const p1 = recordsUsed[i];
      const p2 = recordsUsed[j];

      // Exigir una diferencia de distancia significativa (ratio de al menos 1.8)
      // para evitar oscilaciones por ruido de GPS en distancias muy similares
      if (p2.distance / p1.distance >= 1.8) {
        // Riegel: T2 = T1 * (D2 / D1)^d => d = ln(T2 / T1) / ln(D2 / D1)
        const dVal = Math.log(p2.duration / p1.duration) / Math.log(p2.distance / p1.distance);

        // Descartar anomalías fisiológicas (ritmos donde la distancia larga es más rápida que la corta)
        if (dVal >= 0.95 && dVal <= 1.30) {
          sumExponents += dVal;
          countComparisons++;
          computedExponents.push({
            from: p1.name,
            to: p2.name,
            exponent: dVal
          });
        }
      }
    }
  }

  if (countComparisons === 0) {
    return {
      hasCalculatedFromRecords: false,
      recordExponent: 1.06,
      recordsUsed
    };
  }

  // Promediar los exponentes calculados y acotarlos en un rango fisiológico real seguro (1.02 a 1.12)
  const averageExponent = sumExponents / countComparisons;
  const recordExponent = Math.max(1.02, Math.min(1.12, averageExponent));

  return {
    hasCalculatedFromRecords: true,
    recordExponent,
    recordsUsed,
    computedExponents
  };
};

/**
 * Calcula el exponente de Riegel-Cooper clásico residual (mantenido para retrocompatibilidad estructural)
 */
export const calculateRunningExponent = (profile = {}, workouts = []) => {
  const age       = Number(profile?.age)       || 25;
  const weight    = Number(profile?.weight)    || 75;
  const height    = Number(profile?.height)    || 175;
  const restingHR = Number(profile?.restingHR) || 60;
  const gender    = profile?.gender            || 'male';

  const today = new Date();
  today.setHours(23, 59, 59, 999);
  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(today.getDate() - 30);
  thirtyDaysAgo.setHours(0, 0, 0, 0);

  const runningWorkouts30d = (workouts || []).filter(w => {
    if (w.type !== 'running' || !w.date) return false;
    const wDate = new Date(w.date + 'T00:00:00');
    return wDate >= thirtyDaysAgo && wDate <= today;
  });
  const totalKm30d = runningWorkouts30d.reduce((sum, w) => sum + (Number(w.distance) || 0), 0);

  let volumePenalty = 0.04;
  if (totalKm30d >= 80) volumePenalty = 0.00;
  else if (totalKm30d >= 40) volumePenalty = 0.01;
  else if (totalKm30d >= 15) volumePenalty = 0.02;

  const heightInM = height / 100;
  const bmi = heightInM > 0 ? weight / (heightInM * heightInM) : 24;
  const bmiPenalty = bmi > 25 ? (bmi - 25) * 0.002 : 0;

  let hrPenalty = 0;
  if (restingHR > 70) {
    hrPenalty = (restingHR - 70) * 0.0005;
  } else if (restingHR < 55) {
    hrPenalty = -0.003;
  }

  const agePenalty = age > 40 ? Math.min(0.015, (age - 40) * 0.0005) : 0;
  const genderBonus = gender === 'female' ? -0.003 : 0;

  const r = 1.06 + volumePenalty + bmiPenalty + hrPenalty + agePenalty + genderBonus;
  return Math.min(1.12, Math.max(1.03, r));
};

/**
 * Obtiene los detalles desglosados del motor de predicción, incorporando
 * el VDOT de Referencia y el factor de decaimiento aeróbico real.
 */
export const getRunningExponentDetails = (profile = {}, workouts = []) => {
  const age       = Number(profile?.age)       || 25;
  const weight    = Number(profile?.weight)    || 75;
  const height    = Number(profile?.height)    || 175;
  const restingHR = Number(profile?.restingHR) || 60;
  const gender    = profile?.gender            || 'male';

  const today = new Date();
  today.setHours(23, 59, 59, 999);
  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(today.getDate() - 30);
  thirtyDaysAgo.setHours(0, 0, 0, 0);

  const runningWorkouts30d = (workouts || []).filter(w => {
    if (w.type !== 'running' || !w.date) return false;
    const wDate = new Date(w.date + 'T00:00:00');
    return wDate >= thirtyDaysAgo && wDate <= today;
  });
  const totalKm30d = runningWorkouts30d.reduce((sum, w) => sum + (Number(w.distance) || 0), 0);

  // Penalizaciones VDOT
  let volumePenalty = 0.02;
  if (totalKm30d >= 80) volumePenalty = 0.00;
  else if (totalKm30d >= 40) volumePenalty = 0.005;
  else if (totalKm30d >= 15) volumePenalty = 0.01;

  const heightInM = height / 100;
  const bmi = heightInM > 0 ? weight / (heightInM * heightInM) : 24;
  const bmiPenalty = bmi > 25 ? (bmi - 25) * 0.001 : 0;

  let hrPenalty = 0;
  if (restingHR > 70) {
    hrPenalty = (restingHR - 70) * 0.0003;
  } else if (restingHR < 55) {
    hrPenalty = -0.001;
  }

  const agePenalty = age > 40 ? Math.min(0.005, (age - 40) * 0.0002) : 0;
  const genderBonus = gender === 'female' ? -0.001 : 0;

  const basePenalty = 0.005;
  const decayPenalty = Math.max(0.002, Math.min(0.025, (basePenalty + volumePenalty + bmiPenalty + hrPenalty + agePenalty + genderBonus) * 0.2));

  // --- NUEVO: Obtener exponente dinámico por récords o caer en biometría ---
  const recordExpDetails = calculateRecordBasedExponent(workouts);
  const biometricExponent = calculateRunningExponent(profile, workouts);
  const finalExponent = recordExpDetails.hasCalculatedFromRecords 
    ? recordExpDetails.recordExponent 
    : biometricExponent;

  // Diagnóstico del motor
  let recommendation = "";
  if (recordExpDetails.hasCalculatedFromRecords) {
    const roundedExp = Math.round(finalExponent * 100) / 100;
    if (finalExponent > 1.08) {
      recommendation = `[Exponente de Fatiga de Récords: ${roundedExp}] Presentas un Perfil de Velocista con Déficit Aeróbico Base. Tu velocidad decae notoriamente al incrementar la distancia (pierdes demasiada eficiencia al duplicar o triplicar kilómetros). Para metas de fondo inteligente, se recomienda aumentar gradualmente el volumen semanal total en Zona 2 (trote conversacional muy cómodo) y añadir un fondo largo de fin de semana.`;
    } else if (finalExponent < 1.03) {
      recommendation = `[Exponente de Fatiga de Récords: ${roundedExp}] Presentas un Perfil de Corredor de Fondo Puro / Alta Economía Aeróbica. Sostienes de forma sobresaliente tus ritmos a medida que incrementas la distancia, mostrando fatiga residual mínima. Tu limitante principal es la velocidad absoluta (VO2máx). Se sugiere incorporar pasadas cortas e intensas en Zona 5 (de 2 a 4 minutos) y trabajo de fuerza reactiva en gimnasio para elevar tu techo de velocidad pura.`;
    } else {
      recommendation = `[Exponente de Fatiga de Récords: ${roundedExp}] Presentas un Perfil Híbrido Equilibrado. Muestras una excelente relación entre velocidad base y resistencia aeróbica sostenida, alineada con las proporciones ideales de la fisiología del running. Continúa combinando fondos suaves de Zona 2 con series a la semana y sesiones de tempo.`;
    }

    // Agregar comparación con biometría
    const diff = finalExponent - biometricExponent;
    if (diff > 0.02) {
      recommendation += " Tu decaimiento de fatiga en récords reales es mayor al esperado por tu volumen actual de entrenamiento, sugiriendo que tu musculatura acumula fatiga acelerada; prioriza la recuperación y la densidad de entrenamientos aeróbicos.";
    } else if (diff < -0.02) {
      recommendation += " Increíblemente, tu resistencia real en carrera supera lo estimado para tu volumen acumulado, demostrando una economía de carrera excepcionalmente eficiente y adaptada.";
    }
  } else {
    // Diagnóstico por volumen clásico (sin récords suficientes)
    recommendation = "Estimación por Biometría & Volumen: Carga al menos 2 marcas de running de distintas distancias (ej: un test de 1K/5K y una carrera de 10K/21K) para calibrar con precisión tu exponente real de fatiga por récords. ";
    if (totalKm30d < 15) {
      recommendation += "Tu base de volumen aeróbico es baja en los últimos 30 días, lo que provocará fatiga prematura y un decaimiento notable de VDOT en fondos largos. Incrementa tus trotes suaves semanales en Zona 2 para optimizar la densidad de capilares musculares.";
    } else if (totalKm30d < 40) {
      recommendation += "Tienes una base de trote moderada. Tu resistencia está bien adaptada para distancias de hasta 10K, pero tu eficiencia bajará si planeas correr distancias mayores. Añadir un fondo semanal largo de 12km a 15km te ayudará a minimizar el desvanecimiento aeróbico.";
    } else if (totalKm30d < 80) {
      recommendation += "¡Excelente volumen de entrenamiento! Estás asimilando un gran volumen crónico que mejora significativamente tu volumen sistólico y reduce tu decaimiento de VDOT en largas distancias. Mantener la regularidad elevará tu rendimiento aeróbico.";
    } else {
      recommendation += "¡Volumen de Élite Mundial! Tu resistencia aeróbica es sobresaliente y tu decaimiento de VDOT es mínimo, permitiendo predecir marcas de maratón sumamente cercanas a tu ritmo ideal teórico de umbral.";
    }

    if (bmi > 25) {
      recommendation += " Tu masa corporal demanda un costo de oxígeno ligeramente mayor al correr fondos largos; complementar con sesiones de fuerza reactiva optimizará tu economía de carrera.";
    }

    if (restingHR > 70) {
      recommendation += " Las pulsaciones en reposo sugieren margen de mejora en el volumen sistólico del ventrículo izquierdo; priorizar carreras lentas en Zona 2 bajará tu frecuencia cardíaca base.";
    }
  }

  return {
    baseExponent: 1.06,
    totalKm30d: Math.round(totalKm30d * 10) / 10,
    volumePenalty,
    bmi: Math.round(bmi * 10) / 10,
    bmiPenalty,
    restingHR,
    hrPenalty,
    age,
    agePenalty,
    gender,
    genderBonus,
    finalExponent: Math.round(finalExponent * 100) / 100,
    decayPenalty: Math.round(decayPenalty * 1000) / 1000,
    biometricExponent: Math.round(biometricExponent * 100) / 100,
    hasCalculatedFromRecords: recordExpDetails.hasCalculatedFromRecords,
    recordsUsed: recordExpDetails.recordsUsed,
    recommendation
  };
};

/**
 * Fórmula de Riegel (Mantenida por compatibilidad de firma)
 */
export const calculateRiegelTime = (d1, t1, d2, r = 1.06) => {
  if (!d1 || !t1 || !d2) return 0;
  return t1 * Math.pow(d2 / d1, r);
};

/**
 * Genera predicciones de carrera completas basadas en el MODELO VDOT DE JACK DANIELS
 */
export const getRacePredictions = (d1, timeStr, profile = {}, workouts = []) => {
  const t1 = timeStringToSeconds(timeStr);
  if (d1 <= 0 || t1 <= 0) return [];
  
  const details = getRunningExponentDetails(profile, workouts);
  const decayPenalty = details.decayPenalty;

  const T1 = t1 / 60;
  const v = (d1 * 1000) / T1;
  const vo2 = -4.60 + 0.182258 * v + 0.000104 * v * v;
  const pct = 0.2989558 * Math.exp(-0.1932605 * T1) + 0.1894393 * Math.exp(-0.012778 * T1) + 0.8;
  const baseVDOT = vo2 / pct;

  const targets = [
    { name: "1 Kilómetro", distance: 1.0 },
    { name: "5 Kilómetros", distance: 5.0 },
    { name: "10 Kilómetros", distance: 10.0 },
    { name: "Medio Maratón", distance: 21.097 },
    { name: "Maratón", distance: 42.195 }
  ];
  
  return targets.map(target => {
    let targetVDOT = baseVDOT;
    if (target.distance > d1) {
      // Aplicar decaimiento logarítmico fisiológico de VDOT
      targetVDOT = baseVDOT * (1.0 - decayPenalty * Math.log(target.distance / d1));
    }
    const predictedSeconds = solveVDOTTime(target.distance, targetVDOT);
    const pace = predictedSeconds / target.distance;
    const vdotLossPct = target.distance > d1 ? Math.round(decayPenalty * Math.log(target.distance / d1) * 100) : 0;

    // --- NUEVO: Predicción Riegel Personalizada con finalExponent ---
    const riegelSeconds = calculateRiegelTime(d1, t1, target.distance, details.finalExponent);
    const riegelPace = riegelSeconds / target.distance;

    return {
      name: target.name,
      distance: target.distance,
      time: secondsToTimeString(predictedSeconds),
      pace: formatPace(pace),
      riegelTime: secondsToTimeString(riegelSeconds),
      riegelPace: formatPace(riegelPace),
      vdotEffective: targetVDOT.toFixed(1),
      vdotLossPct
    };
  });
};

/**
 * Calcula zonas de ritmo de entrenamiento basadas en el MODELO VDOT DE JACK DANIELS
 */
export const getRunningPaceZones = (d1, timeStr, profile = {}, workouts = []) => {
  const t1 = timeStringToSeconds(timeStr);
  if (d1 <= 0 || t1 <= 0) return [];
  
  const age = Number(profile?.age) || 25;
  const maxHR = Math.round(208 - 0.7 * age);
  
  const T1 = t1 / 60;
  const v = (d1 * 1000) / T1;
  const vo2 = -4.60 + 0.182258 * v + 0.000104 * v * v;
  const pct = 0.2989558 * Math.exp(-0.1932605 * T1) + 0.1894393 * Math.exp(-0.012778 * T1) + 0.8;
  const vdot = vo2 / pct;

  const getPaceRange = (pctLow, pctHigh) => {
    const vLow = solveVelocityForVO2(pctLow * vdot);
    const vHigh = solveVelocityForVO2(pctHigh * vdot);
    return {
      paceMin: formatPace(60000 / vHigh),
      paceMax: formatPace(60000 / vLow)
    };
  };

  const easy = getPaceRange(0.62, 0.70);
  const marathon = getPaceRange(0.75, 0.84);
  const threshold = getPaceRange(0.83, 0.88);
  const interval = getPaceRange(0.95, 1.00);
  const repetition = getPaceRange(1.05, 1.10);

  return [
    {
      name: "Trote Suave (Easy Run)",
      range: "62% - 70% VDOT",
      paceMin: easy.paceMin,
      paceMax: easy.paceMax,
      hrRange: `${Math.round(maxHR * 0.65)} - ${Math.round(maxHR * 0.79)} bpm`,
      description: "Trote regenerativo, sumamente cómodo. Desarrolla volumen mitocondrial, capilarización periférica y base aeróbica sólida."
    },
    {
      name: "Ritmo de Maratón (Marathon Pace)",
      range: "75% - 84% VDOT",
      paceMin: marathon.paceMin,
      paceMax: marathon.paceMax,
      hrRange: `${Math.round(maxHR * 0.80)} - ${Math.round(maxHR * 0.90)} bpm`,
      description: "Esfuerzo aeróbico sostenido. Enseña a las fibras musculares a dosificar glucógeno y tolera fatiga prolongada."
    },
    {
      name: "Ritmo Umbral / Tempo Run (Threshold)",
      range: "83% - 88% VDOT",
      paceMin: threshold.paceMin,
      paceMax: threshold.paceMax,
      hrRange: `${Math.round(maxHR * 0.88)} - ${Math.round(maxHR * 0.92)} bpm`,
      description: "Ritmo exigente pero estable. Optimiza el aclaramiento y remoción del ácido láctico acumulado en sangre."
    },
    {
      name: "Intervalos VO2 Máx (Intervals)",
      range: "95% - 100% VDOT",
      paceMin: interval.paceMin,
      paceMax: interval.paceMax,
      hrRange: `${Math.round(maxHR * 0.97)} - ${Math.round(maxHR * 1.00)} bpm`,
      description: "Pasadas duras de 2 a 5 minutos. Maximiza el gasto cardíaco y estimula la capacidad pulmonar aeróbica máxima."
    },
    {
      name: "Repeticiones de Potencia (Repetitions)",
      range: "105% - 110% VDOT",
      paceMin: repetition.paceMin,
      paceMax: repetition.paceMax,
      hrRange: "Esfuerzo de Sprints / RPE 10",
      description: "Sprints cortos y rápidos de 200m a 400m con pausas largas. Incrementa la economía de carrera y el reclutamiento neuromuscular rápido."
    }
  ];
};

// --- GIMNASIO: 1RM Y PESOS RECOMENDADOS ---

/**
 * Fórmula de 1RM Refinada: Combina Epley y Brzycki e incorpora RPE (Repeticiones en Reserva)
 * w: peso levantado
 * r: repeticiones logradas
 * rpe: escala de esfuerzo percibido (Borg de 1 a 10)
 */
export const calculate1RM = (weight, reps, rpe) => {
  if (!weight || !reps) return 0;
  
  const w = parseFloat(weight);
  const r = parseFloat(reps);
  if (w <= 0 || r <= 0) return 0;
  
  // Calcular Repeticiones en Reserva (RIR) si hay un RPE válido
  let rEff = r;
  if (rpe !== undefined && rpe !== null && rpe !== '') {
    const rpeNum = parseFloat(rpe);
    if (rpeNum >= 1 && rpeNum <= 10) {
      const rir = 10 - rpeNum;
      rEff = r + rir;
    }
  }
  
  // Si al fallo técnico teórico se calcula exactamente 1 repetición, el peso es el 1RM
  if (rEff === 1) return w;
  
  // Fórmula de Epley: 1RM = w * (1 + rEff / 30)
  const epley = w * (1 + rEff / 30);
  
  // Fórmula de Brzycki: 1RM = w / (1.0278 - 0.0278 * rEff)
  // Válida principalmente para rEff <= 10 reps.
  if (rEff <= 10) {
    const brzycki = w / (1.0278 - 0.0278 * rEff);
    // Promediamos ambas fórmulas para precisión quirúrgica
    return Math.round(((epley + brzycki) / 2) * 10) / 10;
  }
  
  return Math.round(epley * 10) / 10;
};

/**
 * Genera el perfil de Fuerza-Velocidad y Curva de Potencia para repeticiones de 1 a 12
 * basado en el 1RM teórico estimado.
 */
export const getForceVelocityProfile = (oneRepMax) => {
  if (!oneRepMax || oneRepMax <= 0) return [];
  
  // Mapeo estándar de repeticiones a porcentaje de 1RM
  // Basado en tablas de intensidad neuromuscular clásicas
  const repPctMap = {
    1: 1.00,
    2: 0.95,
    3: 0.90,
    4: 0.86,
    5: 0.82,
    6: 0.78,
    7: 0.74,
    8: 0.70,
    9: 0.67,
    10: 0.64,
    11: 0.62,
    12: 0.60
  };
  
  return Object.keys(repPctMap).map(repStr => {
    const reps = parseInt(repStr);
    const pct = repPctMap[reps];
    const weight = Math.round((oneRepMax * pct) * 10) / 10;
    
    // Velocidad Media Propulsiva (MPV en m/s) estimada por el porcentaje del 1RM
    // Modelo clásico de González-Badillo & Sánchez-Medina (2010)
    // MPV decrece de forma lineal/logarítmica a medida que nos acercamos al 100% (1RM)
    const mpv = parseFloat((1.25 - 0.0115 * (pct * 100)).toFixed(2));
    
    // Potencia Mecánica Relativa (Watts teóricos) = Fuerza (Newtons) * Velocidad (m/s)
    // Fuerza = masa * gravedad (9.81 m/s^2)
    const forceNewtons = weight * 9.81;
    const powerWatts = Math.round(forceNewtons * mpv);
    
    // Zona de Pico de Potencia: típicamente se da en cargas de 45% a 65% del 1RM
    // En términos de reps, esto corresponde al rango de 10-12 repeticiones a máxima velocidad voluntaria
    const isPeakPowerZone = pct >= 0.45 && pct <= 0.65;
    
    return {
      reps,
      pct: Math.round(pct * 100),
      weight,
      mpv,
      powerWatts,
      isPeakPowerZone
    };
  });
};

/**
 * Genera la tabla de pesos recomendados para gimnasio basado en el 1RM estimado
 */
export const getRecommendedGymWeights = (weight, reps) => {
  const oneRepMax = calculate1RM(weight, reps);
  if (oneRepMax <= 0) return [];
  
  const zones = [
    {
      name: "Fuerza Absoluta (Strength)",
      pctMin: 85,
      pctMax: 90,
      reps: "3 - 5 repeticiones",
      purpose: "Incrementar reclutamiento de fibras rápidas y fuerza del sistema nervioso."
    },
    {
      name: "Hipertrofia Funcional / Crecimiento",
      pctMin: 75,
      pctMax: 82,
      reps: "6 - 8 repeticiones",
      purpose: "Metabolismo muscular equilibrado, estimula la tensión mecánica y daño miofibrilar."
    },
    {
      name: "Hipertrofia Estructural / Estética",
      pctMin: 68,
      pctMax: 74,
      reps: "9 - 12 repeticiones",
      purpose: "Maximiza el estrés metabólico e hipertrofia del sarcoplasma muscular."
    },
    {
      name: "Resistencia Muscular (Endurance)",
      pctMin: 55,
      pctMax: 65,
      reps: "15 - 20 repeticiones",
      purpose: "Mejorar la capilarización, densidad mitocondrial y tolerancia al ácido láctico."
    },
    {
      name: "Potencia / Explosividad (Power)",
      pctMin: 45,
      pctMax: 55,
      reps: "3 - 5 repeticiones (explosivas)",
      purpose: "Desarrollo de tasa de desarrollo de fuerza (RFD). Movimientos veloces."
    }
  ];
  
  return zones.map(zone => {
    const wMin = Math.round(oneRepMax * (zone.pctMin / 100) * 2) / 2; // Redondea al 0.5kg más cercano
    const wMax = Math.round(oneRepMax * (zone.pctMax / 100) * 2) / 2;
    return {
      ...zone,
      estimated1RM: oneRepMax.toFixed(1),
      weightRange: `${wMin.toFixed(1)} kg - ${wMax.toFixed(1)} kg`
    };
  });
};

/**
 * Calcula las 5 zonas de entrenamiento cardíaco basadas en la fórmula de Tanaka (208 - 0.7 * edad)
 */
export const calculateHRZones = (age) => {
  if (!age || age <= 0) return [];
  const maxHR = Math.round(208 - 0.7 * age);
  
  const zoneDefinitions = [
    {
      level: 1,
      name: "Zona 1: Recuperación",
      pctMin: 50,
      pctMax: 60,
      color: "#3b82f6", // Blue
      colorRgb: "59, 130, 246",
      description: "Esfuerzo muy suave. Ideal para calentamiento, vuelta a la calma y trotes regenerativos activos.",
      benefit: "Ayuda a la recuperación muscular y prepara el cuerpo para intensidades mayores."
    },
    {
      level: 2,
      name: "Zona 2: Resistencia / Quema Grasa",
      pctMin: 60,
      pctMax: 70,
      color: "#10b981", // Emerald
      colorRgb: "16, 185, 129",
      description: "Trote cómodo y conversacional. El ritmo base de resistencia donde se acumula la mayoría del volumen.",
      benefit: "Optimiza la eficiencia metabólica celular (uso de grasas como combustible) y base de resistencia."
    },
    {
      level: 3,
      name: "Zona 3: Tempo / Ritmo",
      pctMin: 70,
      pctMax: 80,
      color: "#f59e0b", // Amber
      colorRgb: "245, 158, 11",
      description: "Esfuerzo moderadamente duro. Se siente una respiración más profunda pero aún controlada.",
      benefit: "Aumenta la fuerza cardiovascular media y te acostumbra a correr rápido por períodos prolongados."
    },
    {
      level: 4,
      name: "Zona 4: Umbral Anaeróbico",
      pctMin: 80,
      pctMax: 90,
      color: "#f97316", // Orange
      colorRgb: "249, 115, 22",
      description: "Intensidad exigente, respiración agitada. Cerca de tu ritmo máximo de 10K. Difícil sostener conversaciones.",
      benefit: "Mejora drásticamente tu umbral de lactato, permitiendo sostener ritmos rápidos sin quemarte."
    },
    {
      level: 5,
      name: "Zona 5: VO2 Máx",
      pctMin: 90,
      pctMax: 100,
      color: "#ef4444", // Red
      colorRgb: "239, 68, 68",
      description: "Esfuerzo máximo absoluto. Respiración muy jadeante. Reservado para pasadas de sprint cortas o intervalos.",
      benefit: "Desarrolla la potencia aeróbica máxima (capacidad máxima de absorción y transporte de oxígeno)."
    }
  ];

  return zoneDefinitions.map(zone => {
    const hrMin = Math.round(maxHR * (zone.pctMin / 100));
    const hrMax = Math.round(maxHR * (zone.pctMax / 100));
    return {
      ...zone,
      maxHR,
      hrMin,
      hrMax,
      range: `${hrMin} - ${hrMax} bpm`
    };
  });
};

/**
 * Determina el posicionamiento y retroalimentación fisiológica para un promedio cardíaco dado
 */
export const getHRZonePlacement = (age, avgHR) => {
  if (!age || !avgHR || age <= 0 || avgHR <= 0) return null;
  const zones = calculateHRZones(age);
  const maxHR = Math.round(208 - 0.7 * age);
  
  // Find which zone it belongs to
  let activeZone = null;
  if (avgHR < zones[0].hrMin) {
    activeZone = {
      level: 0,
      name: "Calentamiento Leve",
      color: "#9ca3af", // Gray
      colorRgb: "156, 163, 175",
      description: "Tus pulsaciones indican un esfuerzo de intensidad sumamente baja o reposo.",
      benefit: "Excelente para descanso absoluto o estiramientos iniciales.",
      hrMin: 0,
      hrMax: zones[0].hrMin - 1,
      range: `< ${zones[0].hrMin} bpm`
    };
  } else {
    activeZone = zones.find(z => avgHR >= z.hrMin && avgHR <= z.hrMax);
  }
  
  // Fallback for HR above MaxHR
  if (!activeZone && avgHR > maxHR) {
    activeZone = {
      level: 6,
      name: "Esfuerzo Extremo",
      color: "#b91c1c", // Dark Red
      colorRgb: "185, 28, 28",
      description: "Pulsaciones superiores a tu máximo estimado. ¡Ten extremo cuidado!",
      benefit: "Entrenamiento anaeróbico extremo. Sostenible únicamente por breves segundos.",
      hrMin: zones[4].hrMin,
      hrMax: avgHR,
      range: `> ${zones[4].hrMin} bpm`
    };
  }
  
  if (!activeZone) {
    // If not matched, fallback to Zone 5
    activeZone = zones[4];
  }

  // Calculate percentage placement relative to the active zone (or global max if extreme)
  let percentageInZone = 50; // default middle
  const rangeWidth = activeZone.hrMax - activeZone.hrMin;
  if (rangeWidth > 0) {
    percentageInZone = Math.min(100, Math.max(0, ((avgHR - activeZone.hrMin) / rangeWidth) * 100));
  }

  // Recommendations based on zone placement
  let recommendation = "";
  let intensityLevel = ""; // "suave", "optimo", "moderado", "fuerte", "extremo"
  
  switch (activeZone.level) {
    case 0:
      intensityLevel = "suave";
      recommendation = "Tu esfuerzo cardíaco promedio es extremadamente bajo. Si tu objetivo era una sesión regenerativa, está bien, pero para obtener adaptaciones aeróbicas reales, intenta elevar un poco más el ritmo en tu próxima corrida hasta entrar en Zona 2.";
      break;
    case 1:
      intensityLevel = "suave";
      recommendation = "Excelente para entrenar de forma regenerativa activa. Si estás recuperándote de un entrenamiento duro anterior, has elegido la zona ideal para depurar el lactato y relajar las piernas.";
      break;
    case 2:
      intensityLevel = "optimo";
      recommendation = "¡Zona Dulce de Resistencia! Este es el rango óptimo según la ciencia deportiva (el famoso entrenamiento Zona 2). Estás optimizando tu sistema oxidativo, enseñándole a tus células a quemar grasa eficientemente y construyendo una base aeróbica sólida y libre de lesiones.";
      break;
    case 3:
      intensityLevel = "moderado";
      recommendation = "Esfuerzo moderadamente alto. Estás en la 'zona gris': es demasiado exigente para ser una sesión de fondo regenerativa fácil, pero muy aeróbica para trabajar el umbral anaeróbico. Está genial para carreras tempo cortas, pero evita que todos tus entrenamientos terminen aquí.";
      break;
    case 4:
      intensityLevel = "fuerte";
      recommendation = "Esfuerzo de Alta Intensidad (Umbral de Lactato). Estás entrenando fuerte. Este rango ayuda drásticamente a sostener ritmos exigentes por más tiempo, pero es muy desgastante. Se recomienda limitar estas sesiones a 1 o 2 veces por semana y planificar buena recuperación posterior.";
      break;
    case 5:
    case 6:
    default:
      intensityLevel = "extremo";
      recommendation = "¡Esfuerzo Máximo Cardiovascular! Cuidado, estás entrenando al límite de tu capacidad cardíaca. Esto es excelente para pasadas de sprint hiper-intensas o entrenamientos HIIT, pero sumamente estresante para el corazón. Asegúrate de que represente menos del 5% de tu volumen semanal.";
      break;
  }

  return {
    activeZone,
    maxHR,
    avgHR,
    percentageInZone: Math.round(percentageInZone),
    intensityLevel,
    recommendation,
    zones
  };
};

/**
 * Escanea el historial y obtiene el VDOT de referencia junto a sus ritmos.
 */
export const getBestWorkoutVdotAndPaces = (workouts = [], profile = {}) => {
  const runs = workouts.filter(w => w.type === 'running' && w.distance > 0 && w.duration);
  
  // Valores por defecto (~37 VDOT, 5k en 26 mins)
  let d = 5;
  let timeStr = "00:26:00";
  
  if (runs.length > 0) {
    let bestRun = runs[0];
    let bestPace = Infinity;
    
    runs.forEach(w => {
      const secs = timeStringToSeconds(w.duration);
      if (secs > 0 && Number(w.distance) > 0) {
        const pace = secs / Number(w.distance);
        if (pace < bestPace) {
          bestPace = pace;
          bestRun = w;
        }
      }
    });
    
    d = Number(bestRun.distance);
    const secs = timeStringToSeconds(bestRun.duration);
    const hh = Math.floor(secs / 3600);
    const mm = Math.floor((secs % 3600) / 60);
    const ss = secs % 60;
    timeStr = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
  }
  
  const paces = getRunningPaceZones(d, timeStr, profile, workouts);
  
  // Calcular VDOT
  const timeSecs = timeStringToSeconds(timeStr);
  const totalMinutes = timeSecs / 60;
  const v = (d * 1000) / totalMinutes; // m/min
  const vo2 = -4.60 + 0.182258 * v + 0.000104 * v * v;
  const pct = 0.2989558 * Math.exp(-0.1932605 * totalMinutes) + 0.1894393 * Math.exp(-0.012778 * totalMinutes) + 0.8;
  const vdot = Math.round((vo2 / pct) * 10) / 10;
  
  return { vdot, paces };
};

/**
 * Generador científico de semanas de entrenamiento basadas en mesociclos running.
 */
export const generateWeeklyMesocyclePlan = (phase, weeklyKmGoal, workouts = [], profile = {}) => {
  const goal = Number(weeklyKmGoal) || 40;
  
  // Obtener zonas y VDOT
  const { vdot, paces } = getBestWorkoutVdotAndPaces(workouts, profile);
  
  // Identificar ritmos clave
  const easyPace = paces.find(p => p.name.includes("Easy")) || { paceMin: "5:30", paceMax: "6:15" };
  const tempoPace = paces.find(p => p.name.includes("Umbral")) || { paceMin: "4:45", paceMax: "5:00" };
  const intervalPace = paces.find(p => p.name.includes("Intervalos")) || { paceMin: "4:15", paceMax: "4:30" };
  
  const easyStr = `${easyPace.paceMin}-${easyPace.paceMax}/km`;
  const tempoStr = `${tempoPace.paceMin}-${tempoPace.paceMax}/km`;
  const intervalStr = `${intervalPace.paceMin}-${intervalPace.paceMax}/km`;
  
  if (phase === 'Base') {
    // 85-90% Zona 2. Fondo representa ~35% de la semana
    const dSun = Math.round(goal * 0.35 * 10) / 10;
    const dWed = Math.round(goal * 0.25 * 10) / 10;
    const dTue = Math.round(goal * 0.22 * 10) / 10;
    const dFri = Math.round(goal * 0.18 * 10) / 10;
    
    return [
      {
        dayIndex: 0,
        sessionType: 'Fuerza',
        distance: 0,
        note: 'Gimnasio: Enfoque en fuerza general (cargas medias/altas, pocas reps, 3x6). Core y estabilidad de tobillos.'
      },
      {
        dayIndex: 1,
        sessionType: 'Regenerativo',
        distance: dTue,
        note: `Trote Regenerativo en Zona 2 a ritmo muy suave (${easyStr}). Placentero y relajado.`
      },
      {
        dayIndex: 2,
        sessionType: 'Regenerativo',
        distance: dWed,
        note: `Trote Suave continuo en Zona 2 (${easyStr}). Trabajo aeróbico puro para aumentar densidad mitocondrial.`
      },
      {
        dayIndex: 3,
        sessionType: 'Fuerza',
        distance: 0,
        note: 'Entrenamiento de Fuerza en Gimnasio: Fuerza máxima del tren inferior (Sentadillas, Peso Muerto, Prensas).'
      },
      {
        dayIndex: 4,
        sessionType: 'Regenerativo',
        distance: dFri,
        note: `Trote de desarrollo aeróbico en Zona 2 a ritmo (${easyStr}). Enfocarse en mantener cadencia cómoda.`
      },
      {
        dayIndex: 5,
        sessionType: 'Descanso',
        distance: 0,
        note: 'Descanso total. Hidratación y rodillo de espuma (foam roller) para liberar tensión de pantorrillas.'
      },
      {
        dayIndex: 6,
        sessionType: 'Fondo',
        distance: dSun,
        note: `Fondo Largo Aeróbico de Base (${easyStr}). La sesión clave de la semana para capilarización y volumen cardíaco.`
      }
    ];
  } else if (phase === 'Build') {
    // Sesiones de Tempo/Umbral + Fondo Largo
    const dSun = Math.round(goal * 0.35 * 10) / 10;
    const dTue = Math.round(goal * 0.20 * 10) / 10;
    const dWed = Math.round(goal * 0.18 * 10) / 10;
    const dFri = Math.round(goal * 0.15 * 10) / 10;
    const dSat = Math.round(goal * 0.12 * 10) / 10;
    
    const tempoBlock = Math.round(dTue * 0.6 * 10) / 10;
    
    return [
      {
        dayIndex: 0,
        sessionType: 'Descanso',
        distance: 0,
        note: 'Descanso Total. Recuperación de la semana anterior.'
      },
      {
        dayIndex: 1,
        sessionType: 'Tempo',
        distance: dTue,
        note: `Sesión de Umbral: Calentamiento + ${tempoBlock}k a ritmo Umbral/Tempo (${tempoStr}) + Enfriamiento. Ritmo exigente y controlado.`
      },
      {
        dayIndex: 2,
        sessionType: 'Regenerativo',
        distance: dWed,
        note: `Trote de asimilación aeróbica en Zona 2 (${easyStr}). Rodar suave para limpiar fatiga del día previo.`
      },
      {
        dayIndex: 3,
        sessionType: 'Fuerza',
        distance: 0,
        note: 'Gimnasio Específico: Pliometría, fuerza explosiva tren inferior, y ejercicios de empuje de cadera.'
      },
      {
        dayIndex: 4,
        sessionType: 'Regenerativo',
        distance: dFri,
        note: `Trote Suave (${easyStr}) + 5 rectas de 100m rápidas con pausa completa para reclutamiento rápido de fibras.`
      },
      {
        dayIndex: 5,
        sessionType: 'Regenerativo',
        distance: dSat,
        note: `Trote Regenerativo muy suave (${easyStr}). Piernas sueltas pre-fondo.`
      },
      {
        dayIndex: 6,
        sessionType: 'Fondo',
        distance: dSun,
        note: `Fondo Largo progresivo en Zona 2 (${easyStr}). Terminar los últimos 2 km a ritmo de Maratón para simular fatiga de carrera.`
      }
    ];
  } else if (phase === 'Peak') {
    // 1 VO2max + 1 Ritmo carrera específico
    const dSun = Math.round(goal * 0.35 * 10) / 10;
    const dTue = Math.round(goal * 0.20 * 10) / 10;
    const dWed = Math.round(goal * 0.15 * 10) / 10;
    const dFri = Math.round(goal * 0.20 * 10) / 10;
    const dSat = Math.round(goal * 0.10 * 10) / 10;
    
    const repCount = Math.max(3, Math.min(6, Math.floor((dTue * 0.5))));
    const repDist = vdot > 45 ? 1000 : 800;
    
    return [
      {
        dayIndex: 0,
        sessionType: 'Descanso',
        distance: 0,
        note: 'Descanso Total. Foco mental para la semana de máxima exigencia.'
      },
      {
        dayIndex: 1,
        sessionType: 'Intervalos',
        distance: dTue,
        note: `Intervalos VO2máx: Calentamiento + ${repCount}x${repDist}m a ritmo de Intervalo (${intervalStr}) con 3' de trote suave de pausa.`
      },
      {
        dayIndex: 2,
        sessionType: 'Regenerativo',
        distance: dWed,
        note: `Trote Regenerativo sumamente fácil (${easyStr}) para promover la circulación y recuperación muscular.`
      },
      {
        dayIndex: 3,
        sessionType: 'Descanso',
        distance: 0,
        note: 'Descanso Activo / Movilidad articular / Gimnasio ligero sin peso (estabilidad y técnica de carrera).'
      },
      {
        dayIndex: 4,
        sessionType: 'Tempo',
        distance: dFri,
        note: `Ritmo Específico: Trote suave + tramos a ritmo objetivo de carrera (simulando paso meta de tu distancia).`
      },
      {
        dayIndex: 5,
        sessionType: 'Regenerativo',
        distance: dSat,
        note: `Trote pre-fondo muy corto y cómodo (${easyStr}) para activar la musculatura.`
      },
      {
        dayIndex: 6,
        sessionType: 'Fondo',
        distance: dSun,
        note: `Fondo mixto: ${dSun}k total, incluyendo 3 bloques de 2k a tu ritmo objetivo de carrera separado por 1k trote suave.`
      }
    ];
  } else { // Tapering
    // Volumen reducido al 50%. Mantener intensidad
    const taperGoal = Math.round(goal * 0.5 * 10) / 10;
    const dSun = Math.round(taperGoal * 0.45 * 10) / 10;
    const dTue = Math.round(taperGoal * 0.20 * 10) / 10;
    const dWed = Math.round(taperGoal * 0.20 * 10) / 10;
    const dFri = Math.round(taperGoal * 0.15 * 10) / 10;
    
    return [
      {
        dayIndex: 0,
        sessionType: 'Descanso',
        distance: 0,
        note: 'Descanso Total. Las piernas acumulan frescura y recargan glucógeno.'
      },
      {
        dayIndex: 1,
        sessionType: 'Tempo',
        distance: dTue,
        note: `Activación de Taper: Calentamiento + 2x1000m a ritmo de carrera (recuperación total de 3') + Enfriamiento. Piernas sueltas e intensas sin fatiga.`
      },
      {
        dayIndex: 2,
        sessionType: 'Regenerativo',
        distance: dWed,
        note: `Trote suave regenerativo corto (${easyStr}) para desentumecer y mantener el cuerpo activo.`
      },
      {
        dayIndex: 3,
        sessionType: 'Descanso',
        distance: 0,
        note: 'Descanso. Masajes suaves o estiramientos ligeros.'
      },
      {
        dayIndex: 4,
        sessionType: 'Regenerativo',
        distance: dFri,
        note: `Trote regenerativo de 15-20 minutos súper fácil + 4 rectas rápidas y sueltas en césped.`
      },
      {
        dayIndex: 5,
        sessionType: 'Descanso',
        distance: 0,
        note: 'Descanso total antes del gran esfuerzo. Alimentación rica en carbohidratos complejos e hidratación abundante.'
      },
      {
        dayIndex: 6,
        sessionType: 'Fondo',
        distance: dSun,
        note: '¡DÍA DE COMPETENCIA! Sal con confianza, sigue tu ritmo planificado y disfruta del trabajo de semanas.'
      }
    ];
  }
};

/**
 * Analiza el historial de running aplicando decaimiento exponencial por recencia
 * y calcula el VDOT (Daniels) y el VO2máx (ACSM + Heart Rate Reserve).
 */
export const calculateDecayedHistoricalRunningMetrics = (workouts = [], profile = {}) => {
  const runs = (workouts || []).filter(w => {
    if (w.type !== 'running' || !w.distance || !w.duration || !w.date) return false;
    const secs = timeStringToSeconds(w.duration);
    return secs > 0 && Number(w.distance) > 0;
  });

  const restingHR = Number(profile?.restingHR) || 60;
  const age       = Number(profile?.age)       || 25;
  const maxHR = Math.round(208 - 0.7 * age);

  const lambda = Math.log(2) / 30; // 30 days half-life
  const now = new Date();
  now.setHours(23, 59, 59, 999);

  const detailedRuns = runs.map(run => {
    const d = Number(run.distance);
    const secs = timeStringToSeconds(run.duration);
    const t = secs / 60; // minutes
    const v = (d * 1000) / t; // m/min
    const pace = secs / d;

    // VDOT Daniels global
    const vo2Pace = -4.60 + 0.182258 * v + 0.000104 * v * v;
    const pct = 0.2989558 * Math.exp(-0.1932605 * t) + 0.1894393 * Math.exp(-0.012778 * t) + 0.8;
    const overallVdot = vo2Pace / pct;

    // Escanear parciales si existen para extraer el VDOT pico (esfuerzo aeróbico representativo >= 800m)
    const workoutSplits = run.splits || run.advanced_metrics?.splits;
    let peakSplitVdot = 0;
    if (Array.isArray(workoutSplits) && workoutSplits.length > 0) {
      workoutSplits.forEach(s => {
        const splitDist = Number(s.distance) || 0;
        const splitSecs = timeStringToSeconds(s.time);
        if (splitDist >= 800 && splitSecs > 0) {
          const splitVdot = calculateVDOT(splitDist / 1000, splitSecs);
          if (splitVdot > peakSplitVdot) {
            peakSplitVdot = splitVdot;
          }
        }
      });
    }

    const finalVdot = Math.max(overallVdot, peakSplitVdot);

    // VO2max HR (ACSM)
    let vo2MaxHRVal = null;
    const avgHR = Number(run.heartRate || run.avgHr || run.heart_rate || 0);
    if (avgHR > 0 && restingHR > 0 && maxHR > restingHR) {
      const hrrRange = maxHR - restingHR;
      const pctHRR = Math.max(0.35, Math.min(1.0, (avgHR - restingHR) / hrrRange));
      const vo2Cost = v * 0.2 + 3.5;
      vo2MaxHRVal = Math.round((vo2Cost / pctHRR) * 100) / 100;
    }

    // Decay weight
    const runDate = new Date(run.date + 'T00:00:00');
    const diffTime = Math.abs(now - runDate);
    const ageInDays = diffTime / (1000 * 60 * 60 * 24);
    const weight = Math.exp(-ageInDays * lambda);

    return {
      id: run.id || Math.random().toString(36).substr(2, 9),
      date: run.date,
      distance: d,
      duration: run.duration,
      pace: formatPace(pace),
      paceSecs: pace,
      vdot: Math.round(finalVdot * 10) / 10,
      vo2MaxHR: vo2MaxHRVal ? Math.round(vo2MaxHRVal * 10) / 10 : null,
      weight: Math.round(weight * 1000) / 1000,
      avgHR
    };
  }).sort((a, b) => new Date(a.date) - new Date(b.date));

  // --- FILTRADO DE RENDIMIENTO PICO (Evita que trotes suaves tiren abajo las métricas) ---
  // Filtramos por entrenamientos significativos (distancia >= 2.0 km) para evitar ruidos de GPS o trotes muy cortos
  const validRuns = detailedRuns.filter(r => r.distance >= 2.0);
  const runsToAnalyze = validRuns.length > 0 ? validRuns : detailedRuns;

  // 1. Calcular VDOT Mecánico Ponderado basado en las mejores sesiones (dentro del 12% de capacidad máxima histórica)
  let weightedVdot = 37.0;
  if (runsToAnalyze.length > 0) {
    let maxVdot = 0;
    runsToAnalyze.forEach(r => {
      if (r.vdot > maxVdot) maxVdot = r.vdot;
    });
    
    // Filtrar sesiones dentro del 12% de capacidad de pico
    const thresholdVdot = maxVdot * 0.88;
    const peakRuns = runsToAnalyze.filter(r => r.vdot >= thresholdVdot);
    
    let sumVdot = 0;
    let totalVdotWeight = 0;
    peakRuns.forEach(r => {
      sumVdot += r.vdot * r.weight;
      totalVdotWeight += r.weight;
    });
    weightedVdot = totalVdotWeight > 0 ? Math.round((sumVdot / totalVdotWeight) * 10) / 10 : 37.0;
  }

  // 2. Calcular VO2máx Cardiovascular Ponderado basado en las mejores sesiones cardíacas (dentro del 12% de capacidad máxima histórica)
  let weightedVo2MaxHR = 37.0;
  let hasHRData = false;
  const cardiacRuns = runsToAnalyze.filter(r => r.vo2MaxHR !== null);
  if (cardiacRuns.length > 0) {
    let maxVo2MaxHR = 0;
    cardiacRuns.forEach(r => {
      if (r.vo2MaxHR > maxVo2MaxHR) maxVo2MaxHR = r.vo2MaxHR;
    });
    
    const thresholdVo2MaxHR = maxVo2MaxHR * 0.88;
    const peakCardiacRuns = cardiacRuns.filter(r => r.vo2MaxHR >= thresholdVo2MaxHR);
    
    let sumVo2MaxHR = 0;
    let totalHRWeight = 0;
    peakCardiacRuns.forEach(r => {
      sumVo2MaxHR += r.vo2MaxHR * r.weight;
      totalHRWeight += r.weight;
    });
    weightedVo2MaxHR = totalHRWeight > 0 ? Math.round((sumVo2MaxHR / totalHRWeight) * 10) / 10 : 37.0;
    hasHRData = totalHRWeight > 0;
  }

  return {
    detailedRuns,
    weightedVdot,
    weightedVo2MaxHR,
    totalRuns: runs.length,
    hasHRData
  };
};

/**
 * Calcula la serie temporal de 30 días para el Índice de Carga Aguda:Crónica (ACWR)
 * del atleta, basándose en la suma de las cargas de trabajo de running y gimnasio.
 */
export const calculateACWRData = (workouts = []) => {
  const today = new Date();
  today.setHours(23, 59, 59, 999);

  // Generar lista de días para los últimos 60 días (para tener datos crónicos al principio del gráfico)
  const timelineDays = 60;
  const dailyLoads = {};

  // Inicializar los últimos 60 días con carga 0
  for (let i = timelineDays; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    dailyLoads[dateStr] = {
      date: dateStr,
      runningLoad: 0,
      gymLoad: 0,
      totalLoad: 0,
      runningDetails: [],
      gymDetails: []
    };
  }

  // Calcular carga de cada entrenamiento y acumularla por fecha
  // (usa timeStringToSeconds, exportada al tope de este archivo — BUG-02 fix)
  (workouts || []).forEach(w => {
    if (!w.date) return;
    const dateStr = w.date;
    
    // Si el entrenamiento cae fuera de nuestro rango de 60 días, lo ignoramos para optimizar
    if (!dailyLoads[dateStr]) return;

    if (w.type === 'running') {
      const dist = Number(w.distance) || 0;
      const secs = timeStringToSeconds(w.duration);
      const rpe = w.rpe !== undefined && w.rpe !== null && w.rpe !== '' ? Number(w.rpe) : 6;
      
      if (dist > 0 && secs > 0) {
        // Pace in s/km = secs / dist
        // Workload = dist * (300 / pace) * 10 * (rpe / 6)
        // Simplificado: dist * (300 * dist / secs) * 10 * (rpe / 6) = 3000 * dist^2 / secs * (rpe / 6)
        const workload = (3000 * dist * dist / secs) * (rpe / 6);
        const roundedWorkload = Math.round(workload * 10) / 10;
        
        dailyLoads[dateStr].runningLoad += roundedWorkload;
        dailyLoads[dateStr].totalLoad += roundedWorkload;
        dailyLoads[dateStr].runningDetails.push({
          id: w.id,
          distance: dist,
          duration: w.duration,
          rpe,
          workload: roundedWorkload
        });
      }
    } else if (w.type === 'gym') {
      // Calcular volumen
      let volume = 0;
      let rpeSum = 0;
      let rpeCount = 0;

      if (Array.isArray(w.exercises)) {
        w.exercises.forEach(ex => {
          if (Array.isArray(ex.sets)) {
            ex.sets.forEach(s => {
              if (s.done !== false) {
                const weight = parseFloat(s.weight) || 0;
                const reps = parseFloat(s.reps) || 0;
                const rpe = s.rpe;
                if (weight > 0 && reps > 0) {
                  volume += weight * reps;
                  if (rpe !== undefined && rpe !== null && rpe !== '') {
                    rpeSum += parseFloat(rpe);
                    rpeCount++;
                  }
                }
              }
            });
          } else {
            const weight = Number(ex.weight) || 0;
            const reps = Number(ex.reps) || 0;
            const rpe = ex.rpe;
            if (weight > 0 && reps > 0) {
              const sets = Number(ex.sets) || 1;
              volume += weight * reps * sets;
              if (rpe !== undefined && rpe !== null && rpe !== '') {
                rpeSum += parseFloat(rpe);
                rpeCount++;
              }
            }
          }
        });
      }

      // RPE promedio de la sesión
      let sessionRpe = w.rpe !== undefined && w.rpe !== null && w.rpe !== '' ? parseFloat(w.rpe) : null;
      if (sessionRpe === null) {
        sessionRpe = rpeCount > 0 ? (rpeSum / rpeCount) : 7;
      }

      // Gym Workload = Volume / 100 * (rpe / 6)
      const workload = (volume / 100) * (sessionRpe / 6);
      const roundedWorkload = Math.round(workload * 10) / 10;

      dailyLoads[dateStr].gymLoad += roundedWorkload;
      dailyLoads[dateStr].totalLoad += roundedWorkload;
      dailyLoads[dateStr].gymDetails.push({
        id: w.id,
        volume,
        rpe: sessionRpe,
        workload: roundedWorkload
      });
    }
  });

  // Convertir el mapa a un array ordenado
  const sortedDates = Object.keys(dailyLoads).sort();
  const sortedData = sortedDates.map(d => dailyLoads[d]);

  // Calcular la ventana deslizante
  // Agudo: 7 días (día actual y 6 anteriores)
  // Crónico: 28 días (día actual y 27 anteriores)
  const timeline = [];

  for (let i = 28; i < sortedData.length; i++) {
    const currentDayData = sortedData[i];
    
    // Promedio agudo (7 días)
    let acuteSum = 0;
    for (let j = 0; j < 7; j++) {
      acuteSum += sortedData[i - j].totalLoad;
    }
    const acuteLoad = acuteSum / 7;

    // Promedio crónico (28 días)
    let chronicSum = 0;
    for (let j = 0; j < 28; j++) {
      chronicSum += sortedData[i - j].totalLoad;
    }
    const chronicLoad = chronicSum / 28;

    const acwr = chronicLoad > 0 ? (acuteLoad / chronicLoad) : 0;

    timeline.push({
      date: currentDayData.date,
      workload: Math.round(currentDayData.totalLoad * 10) / 10,
      runningLoad: Math.round(currentDayData.runningLoad * 10) / 10,
      gymLoad: Math.round(currentDayData.gymLoad * 10) / 10,
      acute: Math.round(acuteLoad * 10) / 10,
      chronic: Math.round(chronicLoad * 10) / 10,
      acwr: Math.round(acwr * 100) / 100,
      runningDetails: currentDayData.runningDetails,
      gymDetails: currentDayData.gymDetails
    });
  }

  // Filtrar los últimos 30 días para el gráfico
  const plotTimeline = timeline.slice(-30);
  const current = plotTimeline.length > 0 
    ? plotTimeline[plotTimeline.length - 1] 
    : { acute: 0, chronic: 0, acwr: 1.0, date: today.toISOString().split('T')[0] };

  // Calcular ACWRs separados para running y gimnasio (HIGH-05)
  // Permiten al AI Coach distinguir fatiga cardiovascular vs muscular sin re-calcular.
  let runningAcuteSum = 0, runningChronicSum = 0;
  let gymAcuteSum    = 0, gymChronicSum    = 0;
  const lastIdx = sortedData.length - 1;

  if (sortedData.length >= 28) {
    for (let j = 0; j < 7;  j++) { runningAcuteSum   += sortedData[lastIdx - j].runningLoad; gymAcuteSum   += sortedData[lastIdx - j].gymLoad; }
    for (let j = 0; j < 28; j++) { runningChronicSum += sortedData[lastIdx - j].runningLoad; gymChronicSum += sortedData[lastIdx - j].gymLoad; }
  }

  const runningAcute7   = runningAcuteSum  / 7;
  const runningChronic28 = runningChronicSum / 28;
  const gymAcute7        = gymAcuteSum      / 7;
  const gymChronic28     = gymChronicSum    / 28;

  // Si no hay crónico pero sí agudo, es una carga nueva sin base = ratio alto (1.5 como señal)
  const runningAcwr = runningChronic28 > 0
    ? Math.round((runningAcute7 / runningChronic28) * 100) / 100
    : (runningAcute7 > 0 ? 1.5 : 0);
  const gymAcwr = gymChronic28 > 0
    ? Math.round((gymAcute7 / gymChronic28) * 100) / 100
    : (gymAcute7 > 0 ? 1.5 : 0);

  return {
    timeline: plotTimeline,
    current: {
      acute: current.acute,
      chronic: current.chronic,
      acwr: current.acwr,
      date: current.date,
      // ACWRs por disciplina — consumidos por el AI Coach de Predictors.jsx
      runningAcwr,
      gymAcwr,
      runningAcute: Math.round(runningAcute7 * 10) / 10,
      gymAcute:     Math.round(gymAcute7     * 10) / 10,
    }
  };
};

/**
 * Calcula el volumen total de una sesión de gimnasio.
 * Soporta tanto la estructura de sets detallados (ex.sets) como el formato heredado/legacy.
 */
export const getGymSessionVolume = (workout) => {
  return workout.exercises?.reduce((sum, ex) => {
    if (Array.isArray(ex.sets)) {
      return sum + ex.sets.reduce((exSum, s) => {
        if (s.done !== false) {
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
  }, 0) || 0;
};

/**
 * Encuentra el levantamiento máximo (peso de una sola serie) en una sesión de gimnasio.
 * Soporta tanto la estructura de sets detallados (ex.sets) como el formato heredado/legacy.
 */
export const getGymSessionMaxWeight = (workout) => {
  let max = 0;
  workout.exercises?.forEach(ex => {
    if (Array.isArray(ex.sets)) {
      ex.sets.forEach(s => {
        const w = Number(s.weight) || 0;
        if (w > max) max = w;
      });
    } else {
      const w = Number(ex.weight) || 0;
      if (w > max) max = w;
    }
  });
  return max;
};

/**
 * Calcula los récords globales (los 3 mejores entrenamientos de todos los tiempos)
 * para cada una de las 4 categorías de rendimiento:
 * - Distancia Máxima Running
 * - Mejor Ritmo Running
 * - Volumen Máximo de Sesión Gym
 * - Levantamiento Máximo Gym
 */
export const getGlobalTop3Records = (workouts = []) => {
  if (!workouts || workouts.length === 0) {
    return { distance: [], pace: [], volume: [], weight: [] };
  }

  // 1. Filtrar y ordenar corridas por Distancia Máxima
  const runs = workouts.filter(w => w.type === 'running' && Number(w.distance) > 0 && w.duration);
  const distSorted = [...runs].sort((a, b) => {
    const diff = Number(b.distance) - Number(a.distance);
    if (diff !== 0) return diff;
    return b.date.localeCompare(a.date); // Más reciente primero si hay empate
  });

  // 2. Filtrar y ordenar corridas por Mejor Ritmo (segundos por km, menor es mejor)
  const runsWithPace = runs.map(w => {
    const secs = timeStringToSeconds(w.duration);
    const d = Number(w.distance);
    const pace = secs / d;
    return { ...w, pace };
  }).filter(w => w.pace > 0);

  const paceSorted = [...runsWithPace].sort((a, b) => {
    const diff = a.pace - b.pace;
    if (diff !== 0) return diff;
    return b.date.localeCompare(a.date);
  });

  // 3. Filtrar y ordenar entrenamientos de fuerza por Volumen Máximo de Sesión
  const gym = workouts.filter(w => w.type === 'gym');
  const gymWithVol = gym.map(w => ({ ...w, vol: getGymSessionVolume(w) })).filter(w => w.vol > 0);
  const volSorted = [...gymWithVol].sort((a, b) => {
    const diff = b.vol - a.vol;
    if (diff !== 0) return diff;
    return b.date.localeCompare(a.date);
  });

  // 4. Filtrar y ordenar entrenamientos de fuerza por Levantamiento Máximo
  const gymWithMaxWt = gym.map(w => ({ ...w, maxWt: getGymSessionMaxWeight(w) })).filter(w => w.maxWt > 0);
  const wtSorted = [...gymWithMaxWt].sort((a, b) => {
    const diff = b.maxWt - a.maxWt;
    if (diff !== 0) return diff;
    return b.date.localeCompare(a.date);
  });

  return {
    distance: distSorted.slice(0, 3),
    pace: paceSorted.slice(0, 3),
    volume: volSorted.slice(0, 3),
    weight: wtSorted.slice(0, 3)
  };
};



