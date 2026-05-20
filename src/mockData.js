// Datos semilla realistas para pre-poblar el FitAnalytics Dashboard
// Genera progresiones en running y gimnasio durante los últimos 2 meses

const getPastDateString = (daysAgo) => {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date.toISOString().split('T')[0];
};

export const MOCK_WORKOUTS = [
  // --- RUNNING WORKOUTS (Mejora progresiva de distancia y ritmo) ---
  {
    id: "run-1",
    type: "running",
    date: getPastDateString(58),
    distance: 5.0,
    duration: "00:28:45", // Ritmo: 5:45
    heartRate: 152,
    rpe: 8,
    terrain: "Asfalto",
    notes: "Primer trote después de mucho tiempo. Piernas pesadas."
  },
  {
    id: "run-2",
    type: "running",
    date: getPastDateString(54),
    distance: 5.0,
    duration: "00:27:50", // Ritmo: 5:34
    heartRate: 150,
    rpe: 7,
    terrain: "Asfalto",
    notes: "Mejor control de la respiración. Menos cansado."
  },
  {
    id: "run-3",
    type: "running",
    date: getPastDateString(50),
    distance: 6.2,
    duration: "00:34:10", // Ritmo: 5:31
    heartRate: 155,
    rpe: 7,
    terrain: "Pista",
    notes: "Sensación fluida en pista de atletismo."
  },
  {
    id: "run-4",
    type: "running",
    date: getPastDateString(44),
    distance: 5.0,
    duration: "00:26:15", // Ritmo: 5:15
    heartRate: 161,
    rpe: 8,
    notes: "Entrenamiento de ritmo alegre. Buenas sensaciones."
  },
  {
    id: "run-5",
    type: "running",
    date: getPastDateString(40),
    distance: 8.0,
    duration: "00:44:48", // Ritmo: 5:36
    heartRate: 148,
    rpe: 6,
    terrain: "Parque / Tierra",
    notes: "Fondo largo a ritmo cómodo. Clima fresco."
  },
  {
    id: "run-6",
    type: "running",
    date: getPastDateString(35),
    distance: 6.0,
    duration: "00:31:00", // Ritmo: 5:10
    heartRate: 158,
    rpe: 7,
    terrain: "Asfalto",
    notes: "Trote nocturno con aceleraciones al final."
  },
  {
    id: "run-7",
    type: "running",
    date: getPastDateString(30),
    distance: 10.0,
    duration: "00:52:30", // Ritmo: 5:15
    heartRate: 153,
    rpe: 8,
    terrain: "Asfalto",
    notes: "Primer fondo de 10K completado sin detenerse."
  },
  {
    id: "run-8",
    type: "running",
    date: getPastDateString(26),
    distance: 5.0,
    duration: "00:24:55", // Ritmo: 4:59
    heartRate: 164,
    rpe: 8,
    terrain: "Pista",
    notes: "Tirada corta rompiendo la barrera de 5 min/km en 5K."
  },
  {
    id: "run-9",
    type: "running",
    date: getPastDateString(20),
    distance: 8.5,
    duration: "00:43:05", // Ritmo: 5:04
    heartRate: 155,
    rpe: 7,
    terrain: "Tierra",
    notes: "Fondo aeróbico estable por el circuito del lago."
  },
  {
    id: "run-10",
    type: "running",
    date: getPastDateString(15),
    distance: 10.0,
    duration: "00:49:10", // Ritmo: 4:55
    heartRate: 160,
    rpe: 7,
    terrain: "Asfalto",
    notes: "10K buscando ritmo de carrera constante. Muy sólido."
  },
  {
    id: "run-11",
    type: "running",
    date: getPastDateString(10),
    distance: 12.0,
    duration: "01:00:24", // Ritmo: 5:02
    heartRate: 152,
    rpe: 7,
    terrain: "Mixto",
    notes: "Tirada larga de domingo preparatoria para medio maratón."
  },
  {
    id: "run-12",
    type: "running",
    date: getPastDateString(6),
    distance: 6.0,
    duration: "00:28:12", // Ritmo: 4:42
    heartRate: 168,
    rpe: 9,
    terrain: "Pista",
    notes: "Pasadas rápidas de 1000m. Exigente pero muy conforme."
  },
  {
    id: "run-13",
    type: "running",
    date: getPastDateString(2),
    distance: 10.0,
    duration: "00:47:30", // Ritmo: 4:45
    heartRate: 158,
    rpe: 7,
    terrain: "Asfalto",
    notes: "Mejor marca personal en 10K. Las piernas responden increíble."
  },

  // --- GYM WORKOUTS (Sobrecarga progresiva y variedad de volumen) ---
  {
    id: "gym-1",
    type: "gym",
    date: getPastDateString(56),
    sessionName: "Empuje A (Pecho/Tríceps)",
    muscleGroup: "Pectoral",
    exercises: [
      { name: "Press de Banca Plano", sets: 4, reps: 10, weight: 60, rpe: 8 },
      { name: "Press Inclinado con Mancuernas", sets: 3, reps: 12, weight: 20, rpe: 7 },
      { name: "Fondos de Pecho", sets: 3, reps: 8, weight: 0, rpe: 8 },
      { name: "Copas de Tríceps", sets: 3, reps: 12, weight: 14, rpe: 7 }
    ],
    notes: "Adaptación. Fuerza base estable."
  },
  {
    id: "gym-2",
    type: "gym",
    date: getPastDateString(53),
    sessionName: "Tirón A (Espalda/Bíceps)",
    muscleGroup: "Espalda",
    exercises: [
      { name: "Peso Muerto Convencional", sets: 4, reps: 8, weight: 80, rpe: 8 },
      { name: "Jalón al Pecho", sets: 3, reps: 10, weight: 50, rpe: 7 },
      { name: "Remo con Barra", sets: 3, reps: 10, weight: 45, rpe: 8 },
      { name: "Curl de Bíceps con Barra EZ", sets: 3, reps: 12, weight: 20, rpe: 7 }
    ],
    notes: "Concentración en la retracción escapular."
  },
  {
    id: "gym-3",
    type: "gym",
    date: getPastDateString(51),
    sessionName: "Fuerza Piernas (Sentadillas)",
    muscleGroup: "Pierna",
    exercises: [
      { name: "Sentadilla Libre Trasera", sets: 4, reps: 8, weight: 70, rpe: 8 },
      { name: "Prensa de Piernas 45°", sets: 3, reps: 10, weight: 120, rpe: 7 },
      { name: "Peso Muerto Rumano", sets: 3, reps: 10, weight: 55, rpe: 8 },
      { name: "Elevación de Pantorrillas", sets: 4, reps: 15, weight: 40, rpe: 6 }
    ],
    notes: "Profundidad de sentadilla cuidada."
  },
  {
    id: "gym-4",
    type: "gym",
    date: getPastDateString(46),
    sessionName: "Empuje A (Aumento de Peso)",
    muscleGroup: "Pectoral",
    exercises: [
      { name: "Press de Banca Plano", sets: 4, reps: 10, weight: 65, rpe: 8 }, // +5kg
      { name: "Press Inclinado con Mancuernas", sets: 3, reps: 10, weight: 22, rpe: 8 },
      { name: "Fondos de Pecho", sets: 3, reps: 9, weight: 0, rpe: 8 },
      { name: "Copas de Tríceps", sets: 3, reps: 10, weight: 16, rpe: 8 }
    ],
    notes: "Press de banca subió bien a 65kg."
  },
  {
    id: "gym-5",
    type: "gym",
    date: getPastDateString(42),
    sessionName: "Tirón A (Progreso Peso Muerto)",
    muscleGroup: "Espalda",
    exercises: [
      { name: "Peso Muerto Convencional", sets: 4, reps: 8, weight: 90, rpe: 8 }, // +10kg
      { name: "Jalón al Pecho", sets: 3, reps: 10, weight: 55, rpe: 7 },
      { name: "Remo con Barra", sets: 3, reps: 10, weight: 50, rpe: 8 },
      { name: "Curl de Bíceps con Barra EZ", sets: 3, reps: 10, weight: 22, rpe: 8 }
    ],
    notes: "Buenas sensaciones lumbares en peso muerto."
  },
  {
    id: "gym-6",
    type: "gym",
    date: getPastDateString(38),
    sessionName: "Hombros y Core",
    muscleGroup: "Hombros",
    exercises: [
      { name: "Press Militar de Hombros", sets: 4, reps: 8, weight: 35, rpe: 8 },
      { name: "Vuelos Laterales", sets: 4, reps: 12, weight: 8, rpe: 7 },
      { name: "Pájaros (Hombro Posterior)", sets: 3, reps: 12, weight: 6, rpe: 8 },
      { name: "Plancha Abdominal", sets: 3, reps: 60, weight: 0, rpe: 7 } // 60 segs
    ],
    notes: "Hombros quemando al final de los vuelos."
  },
  {
    id: "gym-7",
    type: "gym",
    date: getPastDateString(32),
    sessionName: "Sentadillas Progresión",
    muscleGroup: "Pierna",
    exercises: [
      { name: "Sentadilla Libre Trasera", sets: 4, reps: 8, weight: 80, rpe: 8 }, // +10kg
      { name: "Prensa de Piernas 45°", sets: 3, reps: 10, weight: 140, rpe: 8 },
      { name: "Peso Muerto Rumano", sets: 3, reps: 10, weight: 60, rpe: 8 },
      { name: "Sillón de Cuádriceps", sets: 3, reps: 12, weight: 45, rpe: 7 }
    ],
    notes: "Piernas muy congestionadas."
  },
  {
    id: "gym-8",
    type: "gym",
    date: getPastDateString(28),
    sessionName: "Empuje A (Carga Alta)",
    muscleGroup: "Pectoral",
    exercises: [
      { name: "Press de Banca Plano", sets: 4, reps: 8, weight: 70, rpe: 9 }, // +5kg, bajamos reps a 8
      { name: "Press Inclinado con Mancuernas", sets: 3, reps: 10, weight: 24, rpe: 8 },
      { name: "Cruces de Polea", sets: 3, reps: 12, weight: 15, rpe: 7 },
      { name: "Extensiones de Tríceps Polea", sets: 3, reps: 12, weight: 20, rpe: 8 }
    ],
    notes: "Press de banca demandante pero controlado."
  },
  {
    id: "gym-9",
    type: "gym",
    date: getPastDateString(22),
    sessionName: "Tirón A (Carga Alta)",
    muscleGroup: "Espalda",
    exercises: [
      { name: "Peso Muerto Convencional", sets: 3, reps: 5, weight: 100, rpe: 9 }, // Hito 100kg!
      { name: "Remo con Barra", sets: 4, reps: 8, weight: 55, rpe: 8 },
      { name: "Jalón al Pecho", sets: 3, reps: 10, weight: 60, rpe: 8 },
      { name: "Curl de Bíceps Alterno", sets: 3, reps: 12, weight: 12, rpe: 7 }
    ],
    notes: "Sensacional el peso muerto en 100kg por 5 repeticiones."
  },
  {
    id: "gym-10",
    type: "gym",
    date: getPastDateString(18),
    sessionName: "Piernas Volumen Alto",
    muscleGroup: "Pierna",
    exercises: [
      { name: "Sentadilla Libre Trasera", sets: 4, reps: 6, weight: 90, rpe: 9 }, // +10kg
      { name: "Prensa de Piernas 45°", sets: 3, reps: 10, weight: 160, rpe: 8 },
      { name: "Estocadas con Mancuernas", sets: 3, reps: 12, weight: 16, rpe: 8 },
      { name: "Elevación de Pantorrillas", sets: 4, reps: 15, weight: 50, rpe: 7 }
    ],
    notes: "Máximo peso en sentadillas hasta la fecha."
  },
  {
    id: "gym-11",
    type: "gym",
    date: getPastDateString(12),
    sessionName: "Empuje A (Fuerza Máxima)",
    muscleGroup: "Pectoral",
    exercises: [
      { name: "Press de Banca Plano", sets: 4, reps: 6, weight: 75, rpe: 9 }, // +5kg
      { name: "Press Inclinado con Mancuernas", sets: 3, reps: 8, weight: 26, rpe: 8 },
      { name: "Cruces de Polea", sets: 3, reps: 12, weight: 18, rpe: 8 },
      { name: "Extensiones de Tríceps Polea", sets: 3, reps: 10, weight: 25, rpe: 8 }
    ],
    notes: "Press de banca firme en 75kg."
  },
  {
    id: "gym-12",
    type: "gym",
    date: getPastDateString(8),
    sessionName: "Tirón A (Fuerza Espalda)",
    muscleGroup: "Espalda",
    exercises: [
      { name: "Peso Muerto Convencional", sets: 3, reps: 5, weight: 110, rpe: 9 }, // Progresión a 110kg
      { name: "Remo con Barra", sets: 4, reps: 8, weight: 60, rpe: 8 },
      { name: "Dominadas Asistidas", sets: 3, reps: 8, weight: -10, rpe: 8 },
      { name: "Curl de Bíceps con Barra EZ", sets: 3, reps: 10, weight: 26, rpe: 8 }
    ],
    notes: "Peso muerto sube limpio."
  },
  {
    id: "gym-13",
    type: "gym",
    date: getPastDateString(3),
    sessionName: "Pectoral & Brazos Premium",
    muscleGroup: "Pectoral",
    exercises: [
      { name: "Press de Banca Plano", sets: 4, reps: 5, weight: 80, rpe: 9 }, // ¡Llegamos a 80kg!
      { name: "Press Inclinado con Mancuernas", sets: 3, reps: 8, weight: 28, rpe: 8 },
      { name: "Fondos de Pecho", sets: 3, reps: 10, weight: 0, rpe: 8 },
      { name: "Curl de Bíceps Concentrado", sets: 3, reps: 12, weight: 14, rpe: 8 }
    ],
    notes: "¡Gran sesión! 80kg se sienten muy bien y estables."
  }
];
