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
 * Calcula el exponente de Riegel-Cooper clásico residual (mantenido para retrocompatibilidad estructural)
 */
export const calculateRunningExponent = (profile = {}, workouts = []) => {
  const age = Number(profile.age) || Number(localStorage.getItem('fitanalytics_age')) || 25;
  const weight = Number(profile.weight) || Number(localStorage.getItem('fitanalytics_profile_weight')) || 75;
  const height = Number(profile.height) || Number(localStorage.getItem('fitanalytics_profile_height')) || 175;
  const restingHR = Number(profile.restingHR) || Number(localStorage.getItem('fitanalytics_profile_resting_hr')) || 60;
  const gender = profile.gender || localStorage.getItem('fitanalytics_profile_gender') || 'male';

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

  let volumePenalty = 0.12;
  if (totalKm30d >= 80) volumePenalty = 0.00;
  else if (totalKm30d >= 40) volumePenalty = 0.03;
  else if (totalKm30d >= 15) volumePenalty = 0.07;

  const heightInM = height / 100;
  const bmi = heightInM > 0 ? weight / (heightInM * heightInM) : 24;
  const bmiPenalty = bmi > 25 ? (bmi - 25) * 0.012 : 0;

  let hrPenalty = 0;
  if (restingHR > 70) {
    hrPenalty = (restingHR - 70) * 0.002;
  } else if (restingHR < 55) {
    hrPenalty = -0.01;
  }

  const agePenalty = age > 40 ? Math.min(0.04, (age - 40) * 0.002) : 0;
  const genderBonus = gender === 'female' ? -0.01 : 0;

  const r = 1.06 + volumePenalty + bmiPenalty + hrPenalty + agePenalty + genderBonus;
  return Math.min(1.25, Math.max(1.05, r));
};

/**
 * Obtiene los detalles desglosados del motor de predicción, incorporando
 * el VDOT de Referencia y el factor de decaimiento aeróbico real.
 */
export const getRunningExponentDetails = (profile = {}, workouts = []) => {
  const age = Number(profile.age) || Number(localStorage.getItem('fitanalytics_age')) || 25;
  const weight = Number(profile.weight) || Number(localStorage.getItem('fitanalytics_profile_weight')) || 75;
  const height = Number(profile.height) || Number(localStorage.getItem('fitanalytics_profile_height')) || 175;
  const restingHR = Number(profile.restingHR) || Number(localStorage.getItem('fitanalytics_profile_resting_hr')) || 60;
  const gender = profile.gender || localStorage.getItem('fitanalytics_profile_gender') || 'male';

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
  let volumePenalty = 0.06;
  if (totalKm30d >= 80) volumePenalty = 0.00;
  else if (totalKm30d >= 40) volumePenalty = 0.015;
  else if (totalKm30d >= 15) volumePenalty = 0.035;

  const heightInM = height / 100;
  const bmi = heightInM > 0 ? weight / (heightInM * heightInM) : 24;
  const bmiPenalty = bmi > 25 ? (bmi - 25) * 0.004 : 0;

  let hrPenalty = 0;
  if (restingHR > 70) {
    hrPenalty = (restingHR - 70) * 0.001;
  } else if (restingHR < 55) {
    hrPenalty = -0.003;
  }

  const agePenalty = age > 40 ? Math.min(0.02, (age - 40) * 0.001) : 0;
  const genderBonus = gender === 'female' ? -0.003 : 0;

  const basePenalty = 0.015;
  const decayPenalty = Math.max(0.005, Math.min(0.12, basePenalty + volumePenalty + bmiPenalty + hrPenalty + agePenalty + genderBonus));

  const finalExponent = calculateRunningExponent(profile, workouts);

  // Diagnóstico del motor
  let recommendation = "";
  if (totalKm30d < 15) {
    recommendation = "Tu base de volumen aeróbico es baja en los últimos 30 días, lo que provocará fatiga prematura y un decaimiento notable de VDOT en fondos largos. Incrementa tus trotes suaves semanales en Zona 2 para optimizar la densidad de capilares musculares.";
  } else if (totalKm30d < 40) {
    recommendation = "Tienes una base de trote moderada. Tu resistencia está bien adaptada para distancias de hasta 10K, pero tu eficiencia bajará si planeas correr distancias mayores. Añadir un fondo semanal largo de 12km a 15km te ayudará a minimizar el desvanecimiento aeróbico.";
  } else if (totalKm30d < 80) {
    recommendation = "¡Excelente volumen de entrenamiento! Estás asimilando un gran volumen crónico que mejora significativamente tu volumen sistólico y reduce tu decaimiento de VDOT en largas distancias. Mantener la regularidad elevará tu rendimiento aeróbico.";
  } else {
    recommendation = "¡Volumen de Élite Mundial! Tu resistencia aeróbica es sobresaliente y tu decaimiento de VDOT es mínimo, permitiendo predecir marcas de maratón sumamente cercanas a tu ritmo ideal teórico de umbral.";
  }

  if (bmi > 25) {
    recommendation += " Tu masa corporal demanda un costo de oxígeno ligeramente mayor al correr fondos largos; complementar con sesiones de fuerza reactiva optimizará tu economía de carrera.";
  }

  if (restingHR > 70) {
    recommendation += " Las pulsaciones en reposo sugieren margen de mejora en el volumen sistólico del ventrículo izquierdo; priorizar carreras lentas en Zona 2 bajará tu frecuencia cardíaca base.";
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

    return {
      name: target.name,
      distance: target.distance,
      time: secondsToTimeString(predictedSeconds),
      pace: formatPace(pace),
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
  
  const age = Number(profile.age) || Number(localStorage.getItem('fitanalytics_age')) || 25;
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
 * Fórmula de Epley: 1RM = w * (1 + r / 30)
 * w: peso levantado
 * r: repeticiones
 */
export const calculate1RM = (weight, reps) => {
  if (!weight || !reps) return 0;
  if (Number(reps) === 1) return Number(weight);
  return weight * (1 + reps / 30);
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

