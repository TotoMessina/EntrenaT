import React, { useState, useRef } from 'react';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { timeStringToSeconds, secondsToTimeString, calculate1RM } from '../utils/calculators';
import { TrendingUp, Dumbbell, PieChart, BarChart2, Trophy, Award, Crown, Zap, ChevronRight } from 'lucide-react';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export default function AnalyticsView({ workouts, theme }) {
  const runningWorkouts = workouts
    .filter(w => w.type === 'running')
    .sort((a, b) => new Date(a.date + 'T00:00:00') - new Date(b.date + 'T00:00:00'));
    
  const gymWorkouts = workouts
    .filter(w => w.type === 'gym')
    .sort((a, b) => new Date(a.date + 'T00:00:00') - new Date(b.date + 'T00:00:00'));

  // --- CONFIGURING THEME-RESPONSIVE COLORS ---
  const isLight = theme === 'light';
  const gridColor = isLight ? 'rgba(15, 23, 42, 0.06)' : 'rgba(255, 255, 255, 0.05)';
  const textColor = isLight ? '#475569' : '#9ca3af'; // Slate 600 or Gray 400
  const legendColor = isLight ? '#1e293b' : '#e5e7eb'; // Slate 800 or Gray 200
  const doughnutBorderColor = isLight ? '#ffffff' : 'rgba(255, 255, 255, 0.1)';

  // --- 1. RUNNING PACE CHART DATA ---
  const runningDates = runningWorkouts.map(w => {
    return new Date(w.date + 'T00:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
  });

  const runningPacesDecimal = runningWorkouts.map(w => {
    const paceSecs = timeStringToSeconds(w.duration) / Number(w.distance);
    return Math.round((paceSecs / 60) * 100) / 100; // minutes as decimal (e.g. 5.5 = 5:30)
  });

  const runningChartData = {
    labels: runningDates,
    datasets: [
      {
        label: 'Ritmo Medio (min/km)',
        data: runningPacesDecimal,
        borderColor: '#10b981',
        backgroundColor: isLight ? 'rgba(16, 185, 129, 0.05)' : 'rgba(16, 185, 129, 0.1)',
        borderWidth: 3,
        pointBackgroundColor: '#10b981',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 1.5,
        pointHoverRadius: 6,
        fill: true,
        tension: 0.35,
      }
    ]
  };

  const runningChartOptions = {
    responsive: true,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (context) => {
            const decimalMins = context.raw;
            const mins = Math.floor(decimalMins);
            const secs = Math.round((decimalMins - mins) * 60);
            return ` Ritmo: ${mins}:${String(secs).padStart(2, '0')} min/km`;
          }
        }
      }
    },
    scales: {
      y: {
        grid: { color: gridColor },
        ticks: {
          color: textColor,
          callback: (value) => {
            const mins = Math.floor(value);
            const secs = Math.round((value - mins) * 60);
            return `${mins}:${String(secs).padStart(2, '0')}`;
          }
        },
        title: { display: true, text: 'Minutos / km', color: textColor }
      },
      x: {
        grid: { display: false },
        ticks: { color: textColor }
      }
    }
  };

  // --- 2. GYM SESSION VOLUME CHART DATA ---
  const gymDates = gymWorkouts.map(w => {
    return new Date(w.date + 'T00:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
  });

  const gymVolumes = gymWorkouts.map(w => {
    return w.exercises?.reduce((sum, ex) => sum + (ex.sets * ex.reps * ex.weight), 0) || 0;
  });

  const gymVolumeData = {
    labels: gymDates,
    datasets: [
      {
        label: 'Volumen Levantado (kg)',
        data: gymVolumes,
        backgroundColor: isLight ? 'rgba(236, 72, 153, 0.2)' : 'rgba(236, 72, 153, 0.3)',
        borderColor: '#ec4899',
        borderWidth: 2,
        borderRadius: 6,
      }
    ]
  };

  const gymVolumeOptions = {
    responsive: true,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (context) => ` Volumen: ${context.raw.toLocaleString('es-ES')} kg`
        }
      }
    },
    scales: {
      y: {
        grid: { color: gridColor },
        ticks: { color: textColor },
        title: { display: true, text: 'Carga Acumulada (kg)', color: textColor }
      },
      x: {
        grid: { display: false },
        ticks: { color: textColor }
      }
    }
  };

  // --- 3. MUSCLE GROUP SETS DOUGHNUT CHART ---
  const computeMuscleGroupDistribution = () => {
    const counts = {
      Pectoral: 0,
      Espalda: 0,
      Pierna: 0,
      Hombros: 0,
      Brazos: 0,
      Core: 0,
      'Full Body': 0
    };

    workouts.forEach(w => {
      if (w.type === 'gym') {
        const group = w.muscleGroup || 'Full Body';
        const totalSets = w.exercises?.reduce((sum, ex) => sum + (Number(ex.sets) || 0), 0) || 0;
        if (counts[group] !== undefined) {
          counts[group] += totalSets;
        } else {
          counts[group] = totalSets;
        }
      }
    });

    return counts;
  };

  const muscleCounts = computeMuscleGroupDistribution();
  const muscleLabels = Object.keys(muscleCounts).filter(k => muscleCounts[k] > 0);
  const muscleValues = muscleLabels.map(k => muscleCounts[k]);

  const muscleColors = [
    'rgba(236, 72, 153, 0.65)',  // Pectoral (Pink)
    'rgba(59, 130, 246, 0.65)',  // Espalda (Blue)
    'rgba(16, 185, 129, 0.65)',  // Pierna (Green)
    'rgba(245, 158, 11, 0.65)',  // Hombros (Orange)
    'rgba(139, 92, 246, 0.65)',  // Brazos (Violet)
    'rgba(239, 68, 68, 0.65)',    // Core (Red)
    'rgba(107, 114, 128, 0.65)'   // Full Body (Gray)
  ];

  const muscleDoughnutData = {
    labels: muscleLabels,
    datasets: [
      {
        data: muscleValues,
        backgroundColor: muscleColors.slice(0, muscleLabels.length),
        borderColor: doughnutBorderColor,
        borderWidth: 1.5,
        hoverOffset: 4,
      }
    ]
  };

  const muscleDoughnutOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'right',
        labels: {
          color: legendColor,
          font: { family: 'Outfit', size: 12 }
        }
      },
      tooltip: {
        callbacks: {
          label: (context) => ` ${context.label}: ${context.raw} series`
        }
      }
    }
  };

  // --- 4. 1RM PROGRESSION PER EXERCISE ---
  const getAllExerciseNames = () => {
    const names = new Set();
    workouts.forEach(w => {
      if (w.type === 'gym' && w.exercises) {
        w.exercises.forEach(ex => {
          if (ex.name) names.add(ex.name.trim());
        });
      }
    });
    return Array.from(names);
  };

  const allExercises = getAllExerciseNames();
  
  const getInitialExercise = (list) => {
    if (list.includes("Press de Banca Plano")) return "Press de Banca Plano";
    if (list.includes("Press de Banca")) return "Press de Banca";
    return list[0] || "";
  };

  const [selectedExercise, setSelectedExercise] = useState(getInitialExercise(allExercises));
  const chartRef = useRef(null);

  // Helper function to dynamically locate the peak historical 1RM lifting record
  const getBest1RMRecord = (exerciseKeywords) => {
    let bestRecord = null;
    
    workouts.forEach(w => {
      if (w.type === 'gym' && w.exercises) {
        w.exercises.forEach(ex => {
          if (ex.name) {
            const matchesKeyword = exerciseKeywords.some(keyword => 
              ex.name.toLowerCase().includes(keyword.toLowerCase())
            );
            
            if (matchesKeyword) {
              const oneRepMax = calculate1RM(ex.weight, ex.reps);
              if (oneRepMax > 0) {
                if (!bestRecord || oneRepMax > bestRecord.oneRepMax) {
                  bestRecord = {
                    exerciseName: ex.name,
                    oneRepMax: Math.round(oneRepMax * 10) / 10,
                    weight: ex.weight,
                    reps: ex.reps,
                    rpe: ex.rpe,
                    date: new Date(w.date + 'T00:00:00').toLocaleDateString('es-ES', { 
                      day: 'numeric', 
                      month: 'short', 
                      year: 'numeric' 
                    })
                  };
                }
              }
            }
          }
        });
      }
    });
    
    return bestRecord;
  };

  // Compute records for three core strength milestones
  const benchPressPR = getBest1RMRecord(['banca', 'bench press']);
  const squatPR = getBest1RMRecord(['sentadilla', 'squat']);
  const deadliftPR = getBest1RMRecord(['peso muerto', 'deadlift']);

  // Compute Running PRs (Strava style)
  const getRunningPR = (targetDistanceKm) => {
    let bestRecord = null;
    let bestPace = Infinity; // seconds per km
    
    runningWorkouts.forEach(w => {
      const dist = Number(w.distance || 0);
      if (dist >= targetDistanceKm) {
        const paceSecs = timeStringToSeconds(w.duration) / dist;
        if (paceSecs < bestPace) {
          bestPace = paceSecs;
          // Projected time for the target distance
          const projectedTimeSecs = paceSecs * targetDistanceKm;
          
          bestRecord = {
            projectedTime: secondsToTimeString(projectedTimeSecs),
            actualPace: secondsToTimeString(paceSecs),
            date: new Date(w.date + 'T00:00:00').toLocaleDateString('es-ES', { 
              day: 'numeric', 
              month: 'short', 
              year: 'numeric' 
            }),
            sourceDistance: dist.toFixed(2),
            sourceDuration: w.duration
          };
        }
      }
    });
    return bestRecord;
  };

  const pr1K = getRunningPR(1);
  const pr5K = getRunningPR(5);
  const pr10K = getRunningPR(10);
  const pr21K = getRunningPR(21.1);

  const handleViewProgression = (exerciseName) => {
    setSelectedExercise(exerciseName);
    setTimeout(() => {
      chartRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  };

  const get1RMDataPoints = () => {
    if (!selectedExercise) return { dates: [], values: [] };
    
    const points = [];
    workouts
      .filter(w => w.type === 'gym' && w.exercises)
      .sort((a, b) => new Date(a.date + 'T00:00:00') - new Date(b.date + 'T00:00:00'))
      .forEach(w => {
        const matchingEx = w.exercises.find(ex => ex.name.trim() === selectedExercise);
        if (matchingEx) {
          const oneRepMax = calculate1RM(matchingEx.weight, matchingEx.reps);
          points.push({
            date: new Date(w.date + 'T00:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }),
            oneRepMax: Math.round(oneRepMax * 10) / 10
          });
        }
      });

    return {
      dates: points.map(pt => pt.date),
      values: points.map(pt => pt.oneRepMax)
    };
  };

  const progressPoints = get1RMDataPoints();

  const progressChartData = {
    labels: progressPoints.dates,
    datasets: [
      {
        label: `1RM Estimado de ${selectedExercise} (kg)`,
        data: progressPoints.values,
        borderColor: '#8b5cf6',
        backgroundColor: isLight ? 'rgba(139, 92, 246, 0.05)' : 'rgba(139, 92, 246, 0.1)',
        borderWidth: 3,
        pointBackgroundColor: '#8b5cf6',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 1.5,
        pointHoverRadius: 6,
        fill: true,
        tension: 0.25,
      }
    ]
  };

  const progressChartOptions = {
    responsive: true,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (context) => ` 1RM Estimado: ${context.raw} kg`
        }
      }
    },
    scales: {
      y: {
        grid: { color: gridColor },
        ticks: { color: textColor },
        title: { display: true, text: 'Peso Máximo Estimado (1RM - kg)', color: textColor }
      },
      x: {
        grid: { display: false },
        ticks: { color: textColor }
      }
    }
  };

  return (
    <div className="analytics-container fade-in">
      <header className="analytics-header">
        <div>
          <h1 className="gradient-text text-3xl font-extrabold">Estadísticas y Progreso</h1>
          <p className="text-secondary text-sm">Visualiza tus mejoras acumuladas, patrones de entrenamiento y sobrecarga progresiva.</p>
        </div>
      </header>

      {workouts.length === 0 ? (
        <div className="glass-card empty-state-analytics">
          <PieChart size={48} className="text-muted mb-3" />
          <h3>Sin suficientes datos</h3>
          <p className="text-secondary">Carga entrenamientos en la pestaña del historial o agregando una sesión para generar las analíticas.</p>
        </div>
      ) : (
        <>
          {/* Section: Fuerza y Récords Personales (Salón de la Fama) */}
          <section className="pr-section fade-in mb-6">
            <h2 className="section-subtitle flex-center mb-3">
              <Trophy size={20} style={{ color: 'var(--color-primary)' }} />
              Salón de la Fama de Fuerza (Récords Históricos 1RM)
            </h2>
            <p className="text-secondary text-xs mb-4">
              Estos son tus levantamientos máximos absolutos (1RM estimado) detectados automáticamente en tu historial para ejercicios emblemáticos de fuerza.
            </p>
            
            <div className="pr-cards-grid">
              {/* Card 1: Press de Banca */}
              <div className="glass-card pr-card pr-bench">
                <div className="pr-card-header-row">
                  <div className="pr-icon-glow flex-center">
                    <Crown size={20} />
                  </div>
                  <span className="pr-card-badge">Empuje</span>
                </div>
                <h3 className="pr-exercise-title">Press de Banca</h3>
                {benchPressPR ? (
                  <div className="pr-stats-area">
                    <div className="pr-1rm-value">{benchPressPR.oneRepMax} <span className="pr-unit">kg</span></div>
                    <div className="pr-detail-pill">{benchPressPR.weight} kg x {benchPressPR.reps} reps</div>
                    <div className="pr-date-row">
                      <Zap size={10} className="text-primary-glow" />
                      <span>Logrado el {benchPressPR.date}</span>
                    </div>
                    <button 
                      onClick={() => handleViewProgression(benchPressPR.exerciseName)}
                      className="btn btn-pr-action flex-center mt-3"
                    >
                      <span>Evolución Temporal</span>
                      <ChevronRight size={14} />
                    </button>
                  </div>
                ) : (
                  <div className="pr-stats-empty">
                    <p className="text-muted text-2xs mt-2 mb-3">Sin marcas registradas en Press de Banca aún.</p>
                    <div className="pr-detail-pill disabled">-- kg</div>
                  </div>
                )}
              </div>

              {/* Card 2: Sentadilla */}
              <div className="glass-card pr-card pr-squat">
                <div className="pr-card-header-row">
                  <div className="pr-icon-glow flex-center">
                    <Trophy size={20} />
                  </div>
                  <span className="pr-card-badge">Tren Inferior</span>
                </div>
                <h3 className="pr-exercise-title">Sentadilla</h3>
                {squatPR ? (
                  <div className="pr-stats-area">
                    <div className="pr-1rm-value">{squatPR.oneRepMax} <span className="pr-unit">kg</span></div>
                    <div className="pr-detail-pill">{squatPR.weight} kg x {squatPR.reps} reps</div>
                    <div className="pr-date-row">
                      <Zap size={10} className="text-primary-glow" />
                      <span>Logrado el {squatPR.date}</span>
                    </div>
                    <button 
                      onClick={() => handleViewProgression(squatPR.exerciseName)}
                      className="btn btn-pr-action flex-center mt-3"
                    >
                      <span>Evolución Temporal</span>
                      <ChevronRight size={14} />
                    </button>
                  </div>
                ) : (
                  <div className="pr-stats-empty">
                    <p className="text-muted text-2xs mt-2 mb-3">Sin marcas registradas en Sentadillas aún.</p>
                    <div className="pr-detail-pill disabled">-- kg</div>
                  </div>
                )}
              </div>

              {/* Card 3: Peso Muerto */}
              <div className="glass-card pr-card pr-deadlift">
                <div className="pr-card-header-row">
                  <div className="pr-icon-glow flex-center">
                    <Award size={20} />
                  </div>
                  <span className="pr-card-badge">Cadena Posterior</span>
                </div>
                <h3 className="pr-exercise-title">Peso Muerto</h3>
                {deadliftPR ? (
                  <div className="pr-stats-area">
                    <div className="pr-1rm-value">{deadliftPR.oneRepMax} <span className="pr-unit">kg</span></div>
                    <div className="pr-detail-pill">{deadliftPR.weight} kg x {deadliftPR.reps} reps</div>
                    <div className="pr-date-row">
                      <Zap size={10} className="text-primary-glow" />
                      <span>Logrado el {deadliftPR.date}</span>
                    </div>
                    <button 
                      onClick={() => handleViewProgression(deadliftPR.exerciseName)}
                      className="btn btn-pr-action flex-center mt-3"
                    >
                      <span>Evolución Temporal</span>
                      <ChevronRight size={14} />
                    </button>
                  </div>
                ) : (
                  <div className="pr-stats-empty">
                    <p className="text-muted text-2xs mt-2 mb-3">Sin marcas registradas en Peso Muerto aún.</p>
                    <div className="pr-detail-pill disabled">-- kg</div>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Section: Running Personal Bests (Strava Style) */}
          <section className="pr-section fade-in mb-6">
            <h2 className="section-subtitle flex-center mb-3">
              <Award size={20} style={{ color: 'var(--color-running)' }} />
              Mejores Tiempos Estimados (Running)
            </h2>
            <p className="text-secondary text-xs mb-4">
              Tus récords personales proyectados (PBs) basados en el ritmo medio de tus mejores carreras para distancias populares.
            </p>
            
            <div className="pr-cards-grid">
              {/* 5K Card */}
              <div className="glass-card pr-card pr-run" style={{ borderColor: 'rgba(16, 185, 129, 0.2)' }}>
                <div className="pr-card-header-row">
                  <div className="pr-icon-glow flex-center" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', borderColor: 'rgba(16, 185, 129, 0.3)' }}>
                    <Zap size={20} />
                  </div>
                  <span className="pr-card-badge" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>5 Kilómetros</span>
                </div>
                <h3 className="pr-exercise-title">Récord de 5K</h3>
                {pr5K ? (
                  <div className="pr-stats-area">
                    <div className="pr-1rm-value" style={{ color: '#10b981' }}>{pr5K.projectedTime} <span className="pr-unit" style={{ color: '#10b981', opacity: 0.7 }}>hh:mm:ss</span></div>
                    <div className="pr-detail-pill" style={{ color: '#10b981', background: 'rgba(16, 185, 129, 0.1)', borderColor: 'rgba(16, 185, 129, 0.2)' }}>Ritmo: {pr5K.actualPace} /km</div>
                    <div className="pr-date-row">
                      <Zap size={10} style={{ color: '#10b981' }} />
                      <span>Logrado el {pr5K.date}</span>
                    </div>
                  </div>
                ) : (
                   <div className="pr-stats-empty">
                     <p className="text-muted text-2xs mt-2 mb-3">Registra una carrera de al menos 5K.</p>
                     <div className="pr-detail-pill disabled">--:--:--</div>
                   </div>
                )}
              </div>

              {/* 10K Card */}
              <div className="glass-card pr-card pr-run" style={{ borderColor: 'rgba(59, 130, 246, 0.2)' }}>
                <div className="pr-card-header-row">
                  <div className="pr-icon-glow flex-center" style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', borderColor: 'rgba(59, 130, 246, 0.3)' }}>
                    <Trophy size={20} />
                  </div>
                  <span className="pr-card-badge" style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}>10 Kilómetros</span>
                </div>
                <h3 className="pr-exercise-title">Récord de 10K</h3>
                {pr10K ? (
                  <div className="pr-stats-area">
                    <div className="pr-1rm-value" style={{ color: '#3b82f6' }}>{pr10K.projectedTime} <span className="pr-unit" style={{ color: '#3b82f6', opacity: 0.7 }}>hh:mm:ss</span></div>
                    <div className="pr-detail-pill" style={{ color: '#3b82f6', background: 'rgba(59, 130, 246, 0.1)', borderColor: 'rgba(59, 130, 246, 0.2)' }}>Ritmo: {pr10K.actualPace} /km</div>
                    <div className="pr-date-row">
                      <Zap size={10} style={{ color: '#3b82f6' }} />
                      <span>Logrado el {pr10K.date}</span>
                    </div>
                  </div>
                ) : (
                   <div className="pr-stats-empty">
                     <p className="text-muted text-2xs mt-2 mb-3">Registra una carrera de al menos 10K.</p>
                     <div className="pr-detail-pill disabled">--:--:--</div>
                   </div>
                )}
              </div>

              {/* 21K Card */}
              <div className="glass-card pr-card pr-run" style={{ borderColor: 'rgba(139, 92, 246, 0.2)' }}>
                <div className="pr-card-header-row">
                  <div className="pr-icon-glow flex-center" style={{ background: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6', borderColor: 'rgba(139, 92, 246, 0.3)' }}>
                    <Crown size={20} />
                  </div>
                  <span className="pr-card-badge" style={{ background: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6' }}>Medio Maratón</span>
                </div>
                <h3 className="pr-exercise-title">Récord de 21K</h3>
                {pr21K ? (
                  <div className="pr-stats-area">
                    <div className="pr-1rm-value" style={{ color: '#8b5cf6' }}>{pr21K.projectedTime} <span className="pr-unit" style={{ color: '#8b5cf6', opacity: 0.7 }}>hh:mm:ss</span></div>
                    <div className="pr-detail-pill" style={{ color: '#8b5cf6', background: 'rgba(139, 92, 246, 0.1)', borderColor: 'rgba(139, 92, 246, 0.2)' }}>Ritmo: {pr21K.actualPace} /km</div>
                    <div className="pr-date-row">
                      <Zap size={10} style={{ color: '#8b5cf6' }} />
                      <span>Logrado el {pr21K.date}</span>
                    </div>
                  </div>
                ) : (
                   <div className="pr-stats-empty">
                     <p className="text-muted text-2xs mt-2 mb-3">Registra una carrera de al menos 21.1K.</p>
                     <div className="pr-detail-pill disabled">--:--:--</div>
                   </div>
                )}
              </div>
            </div>
          </section>

          <div className="analytics-grid">
          
          {/* Chart 1: Running Pace (Min/Km) */}
          <div className="glass-card chart-card">
            <div className="chart-card-header">
              <h3 className="chart-title flex-center">
                <TrendingUp size={18} className="running-text" /> 
                Progreso de Ritmo (Running)
              </h3>
              <span className="text-muted text-xs">Paso medio por corrida (menor es mejor)</span>
            </div>
            <div className="chart-wrapper-canvas">
              {runningWorkouts.length < 2 ? (
                <div className="empty-chart-notice">Registra al menos 2 corridas para trazar la curva de progresión.</div>
              ) : (
                <Line data={runningChartData} options={runningChartOptions} />
              )}
            </div>
          </div>

          {/* Chart 2: Gym Volume (Kg) */}
          <div className="glass-card chart-card">
            <div className="chart-card-header">
              <h3 className="chart-title flex-center">
                <BarChart2 size={18} className="gym-text" /> 
                Volumen Levantado por Sesión (Gimnasio)
              </h3>
              <span className="text-muted text-xs">Suma de: Series x Reps x Peso levantado</span>
            </div>
            <div className="chart-wrapper-canvas">
              {gymWorkouts.length < 2 ? (
                <div className="empty-chart-notice">Registra al menos 2 entrenamientos de gimnasio para evaluar tu volumen acumulado.</div>
              ) : (
                <Bar data={gymVolumeData} options={gymVolumeOptions} />
              )}
            </div>
          </div>

          {/* Chart 3: Muscle groups doughnut */}
          <div className="glass-card chart-card">
            <div className="chart-card-header">
              <h3 className="chart-title flex-center">
                <PieChart size={18} style={{ color: 'var(--color-primary)' }} /> 
                Volumen de Trabajo por Grupo Muscular
              </h3>
              <span className="text-muted text-xs">Porcentaje de series totales completadas por zona</span>
            </div>
            <div className="chart-wrapper-canvas flex-center-content">
              {muscleLabels.length === 0 ? (
                <div className="empty-chart-notice">Carga entrenamientos en gimnasio con grupos musculares especificados.</div>
              ) : (
                <div className="doughnut-sizing">
                  <Doughnut data={muscleDoughnutData} options={muscleDoughnutOptions} />
                </div>
              )}
            </div>
          </div>

          {/* Chart 4: 1RM progress of selected exercise */}
          <div ref={chartRef} className="glass-card chart-card">
            <div className="chart-card-header flex-between-row">
              <div>
                <h3 className="chart-title flex-center">
                  <Dumbbell size={18} style={{ color: 'var(--color-primary)' }} /> 
                  Progresión de Fuerza (1RM)
                </h3>
                <span className="text-muted text-xs">Historial de carga máxima teórica (Epley)</span>
              </div>
              
              {allExercises.length > 0 && (
                <select
                  value={selectedExercise}
                  onChange={(e) => setSelectedExercise(e.target.value)}
                  className="exercise-chart-select"
                >
                  {allExercises.map(ex => (
                    <option key={ex} value={ex}>{ex}</option>
                  ))}
                </select>
              )}
            </div>
            
            <div className="chart-wrapper-canvas">
              {!selectedExercise ? (
                <div className="empty-chart-notice">No se encontraron ejercicios en tu historial de gimnasio.</div>
              ) : progressPoints.values.length < 2 ? (
                <div className="empty-chart-notice">Registra al menos 2 sesiones con el ejercicio '{selectedExercise}' para graficar el avance.</div>
              ) : (
                <Line data={progressChartData} options={progressChartOptions} />
              )}
            </div>
          </div>

        </div>
      </>
      )}

      <style>{`
        .analytics-container {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .analytics-header {
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

        .mb-3 {
          margin-bottom: 0.75rem;
        }

        /* Chart card styling */
        .chart-card {
          padding: 1.5rem;
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
          min-height: 380px;
        }

        .chart-card-header {
          display: flex;
          flex-direction: column;
          gap: 0.15rem;
        }

        .flex-between-row {
          flex-direction: row;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 0.5rem;
        }

        .chart-title {
          font-size: 1.05rem;
          font-weight: 700;
          color: var(--text-primary);
          gap: 0.4rem;
        }

        .chart-wrapper-canvas {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          min-height: 250px;
        }

        .flex-center-content {
          justify-content: center;
        }

        .doughnut-sizing {
          width: 80%;
          max-width: 280px;
        }

        .empty-chart-notice {
          font-size: 0.85rem;
          color: var(--text-muted);
          text-align: center;
          padding: 2rem;
          border: 1px dashed var(--border-light);
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.01);
          width: 100%;
        }

        .empty-state-analytics {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 5rem 2rem;
          text-align: center;
          color: var(--text-muted);
        }

        .empty-state-analytics h3 {
          font-size: 1.2rem;
          font-weight: 700;
          color: var(--text-primary);
          margin-bottom: 0.25rem;
        }

        /* Personal Records (PR) Hall of Fame styles */
        .pr-section {
          width: 100%;
        }

        .pr-cards-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 1.25rem;
          margin-top: 1rem;
        }

        .pr-card {
          padding: 1.5rem;
          border-radius: 20px;
          display: flex;
          flex-direction: column;
          position: relative;
          overflow: hidden;
          transition: all var(--transition-medium);
          background: rgba(255, 255, 255, 0.015);
          border: 1px solid var(--border-light);
          min-height: 250px;
        }

        .pr-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 12px 30px rgba(0, 0, 0, 0.4);
        }

        /* Specific card variants and glow effects */
        .pr-bench {
          border-color: rgba(236, 72, 153, 0.12);
        }
        .pr-bench:hover {
          border-color: rgba(236, 72, 153, 0.35);
          box-shadow: 0 12px 30px rgba(0, 0, 0, 0.4), 0 0 20px rgba(236, 72, 153, 0.15);
        }
        .pr-bench .pr-icon-glow {
          background: rgba(236, 72, 153, 0.1);
          color: #ec4899;
          border: 1px solid rgba(236, 72, 153, 0.25);
        }
        .pr-bench .pr-card-badge {
          background: rgba(236, 72, 153, 0.1);
          color: #ec4899;
        }

        .pr-squat {
          border-color: rgba(16, 185, 129, 0.12);
        }
        .pr-squat:hover {
          border-color: rgba(16, 185, 129, 0.35);
          box-shadow: 0 12px 30px rgba(0, 0, 0, 0.4), 0 0 20px rgba(16, 185, 129, 0.15);
        }
        .pr-squat .pr-icon-glow {
          background: rgba(16, 185, 129, 0.1);
          color: #10b981;
          border: 1px solid rgba(16, 185, 129, 0.25);
        }
        .pr-squat .pr-card-badge {
          background: rgba(16, 185, 129, 0.1);
          color: #10b981;
        }

        .pr-deadlift {
          border-color: rgba(139, 92, 246, 0.12);
        }
        .pr-deadlift:hover {
          border-color: rgba(139, 92, 246, 0.35);
          box-shadow: 0 12px 30px rgba(0, 0, 0, 0.4), 0 0 20px rgba(139, 92, 246, 0.15);
        }
        .pr-deadlift .pr-icon-glow {
          background: rgba(139, 92, 246, 0.1);
          color: #8b5cf6;
          border: 1px solid rgba(139, 92, 246, 0.25);
        }
        .pr-deadlift .pr-card-badge {
          background: rgba(139, 92, 246, 0.1);
          color: #8b5cf6;
        }

        .pr-run:hover {
          transform: translateY(-5px);
          box-shadow: 0 12px 30px rgba(0, 0, 0, 0.2);
        }

        /* Elements styling */
        .pr-card-header-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.25rem;
        }

        .pr-icon-glow {
          width: 42px;
          height: 42px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .pr-card-badge {
          font-size: 0.65rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          padding: 0.25rem 0.65rem;
          border-radius: 6px;
        }

        .pr-exercise-title {
          font-size: 1.2rem;
          font-weight: 800;
          color: var(--text-primary);
          margin-bottom: 0.75rem;
          letter-spacing: -0.01em;
          margin-top: 0;
        }

        .pr-stats-area {
          display: flex;
          flex-direction: column;
          flex: 1;
        }

        .pr-1rm-value {
          font-family: var(--font-sans);
          font-size: 2.15rem;
          font-weight: 900;
          color: var(--text-primary);
          line-height: 1;
          margin-bottom: 0.5rem;
          display: flex;
          align-items: baseline;
        }

        .pr-unit {
          font-size: 1rem;
          font-weight: 500;
          color: var(--text-muted);
          margin-left: 0.25rem;
        }

        .pr-detail-pill {
          display: inline-block;
          font-size: 0.75rem;
          font-weight: 600;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid var(--border-light);
          padding: 0.3rem 0.65rem;
          border-radius: 8px;
          color: var(--text-secondary);
          width: fit-content;
          margin-bottom: 0.75rem;
        }

        .pr-detail-pill.disabled {
          background: transparent;
          border-style: dashed;
          color: var(--text-muted);
        }

        .pr-date-row {
          display: flex;
          align-items: center;
          gap: 0.35rem;
          font-size: 0.7rem;
          color: var(--text-muted);
          margin-bottom: auto;
        }

        .btn-pr-action {
          width: 100%;
          justify-content: space-between;
          padding: 0.5rem 0.85rem;
          font-size: 0.75rem;
          font-weight: 600;
          border-radius: 10px;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid var(--border-light);
          color: var(--text-primary);
          transition: all var(--transition-fast);
          cursor: pointer;
        }

        .btn-pr-action:hover {
          background: var(--color-primary);
          border-color: var(--color-primary);
          color: #ffffff;
          box-shadow: 0 4px 12px rgba(139, 92, 246, 0.25);
        }

        .pr-stats-empty {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          justify-content: center;
          flex: 1;
        }

        .text-2xs {
          font-size: 0.7rem;
        }

        /* Exercise Select inside Chart header */
        .exercise-chart-select {
          padding: 0.4rem 0.75rem;
          background-color: rgba(9, 10, 15, 0.8);
          border: 1px solid var(--border-light);
          border-radius: 8px;
          color: var(--text-primary);
          font-family: var(--font-sans);
          font-size: 0.8rem;
          font-weight: 600;
          cursor: pointer;
          transition: all var(--transition-fast);
          max-width: 180px;
        }

        .exercise-chart-select:focus {
          outline: none;
          border-color: var(--color-primary);
        }
      `}</style>
    </div>
  );
}
