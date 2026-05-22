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
import { TrendingUp, Dumbbell, PieChart, BarChart2, Trophy, Award, Crown, Zap, ChevronRight, Flame, ShieldCheck, Lock, Activity, Calendar, Timer, Sparkles } from 'lucide-react';

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
    return w.exercises?.reduce((sum, ex) => {
      if (Array.isArray(ex.sets)) {
        return sum + ex.sets.reduce((exSum, s) => {
          if (s.done !== false) {
            const weightVal = parseFloat(s.weight) || 0;
            const repsVal = parseFloat(s.reps) || 0;
            return exSum + (weightVal * repsVal);
          }
          return exSum;
        }, 0);
      } else {
        const setsVal = Number(ex.sets) || 0;
        const repsVal = Number(ex.reps) || 0;
        const weightVal = Number(ex.weight) || 0;
        return sum + (setsVal * repsVal * weightVal);
      }
    }, 0) || 0;
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
      Hombros: 0,
      Bíceps: 0,
      Tríceps: 0,
      Antebrazo: 0,
      Core: 0,
      Cuádriceps: 0,
      Isquiotibiales: 0,
      Gemelos: 0,
      Glúteos: 0,
      Cuello: 0,
      // Legacy groups for backwards compatibility
      Pierna: 0,
      Brazos: 0,
      'Full Body': 0
    };

    workouts.forEach(w => {
      if (w.type === 'gym') {
        const totalSets = w.exercises?.reduce((sum, ex) => {
          if (Array.isArray(ex.sets)) {
            return sum + ex.sets.length;
          }
          return sum + (Number(ex.sets) || 0);
        }, 0) || 0;

        if (w.trainedMuscles && w.trainedMuscles.length > 0) {
          w.trainedMuscles.forEach(m => {
            if (counts[m] !== undefined) {
              counts[m] += totalSets;
            } else {
              counts[m] = totalSets;
            }
          });
        } else {
          const group = w.muscleGroup || 'Full Body';
          if (counts[group] !== undefined) {
            counts[group] += totalSets;
          } else {
            counts[group] = totalSets;
          }
        }
      }
    });

    return counts;
  };

  const muscleCounts = computeMuscleGroupDistribution();
  const muscleLabels = Object.keys(muscleCounts).filter(k => muscleCounts[k] > 0);
  const muscleValues = muscleLabels.map(k => muscleCounts[k]);

  const muscleColorsMap = {
    Pectoral: 'rgba(244, 63, 94, 0.7)',        // Rose/Neon Red-Pink
    Espalda: 'rgba(59, 130, 246, 0.7)',         // Blue
    Hombros: 'rgba(245, 158, 11, 0.7)',         // Orange
    Bíceps: 'rgba(168, 85, 247, 0.7)',          // Purple
    Tríceps: 'rgba(236, 72, 153, 0.7)',         // Pink
    Antebrazo: 'rgba(139, 92, 246, 0.7)',        // Violet
    Core: 'rgba(239, 68, 68, 0.7)',             // Red
    Cuádriceps: 'rgba(16, 185, 129, 0.7)',      // Emerald Green
    Isquiotibiales: 'rgba(20, 184, 166, 0.7)',  // Teal
    Gemelos: 'rgba(45, 212, 191, 0.7)',         // Light Teal/Cyan
    Glúteos: 'rgba(251, 113, 133, 0.7)',        // Light Rose
    Cuello: 'rgba(251, 191, 36, 0.7)',          // Amber/Yellow
    // Legacy mapping support
    Pierna: 'rgba(5, 150, 105, 0.7)',           // Dark Green
    Brazos: 'rgba(124, 58, 237, 0.7)',          // Dark Violet
    'Full Body': 'rgba(107, 114, 128, 0.7)'     // Gray
  };

  const muscleColors = muscleLabels.map(label => muscleColorsMap[label] || 'rgba(156, 163, 175, 0.7)');

  const muscleDoughnutData = {
    labels: muscleLabels,
    datasets: [
      {
        data: muscleValues,
        backgroundColor: muscleColors,
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
              if (Array.isArray(ex.sets)) {
                ex.sets.forEach(s => {
                  if (s.done !== false) {
                    const weightVal = parseFloat(s.weight) || 0;
                    const repsVal = parseFloat(s.reps) || 0;
                    const oneRepMax = calculate1RM(weightVal, repsVal, s.rpe || ex.rpe);
                    if (oneRepMax > 0) {
                      if (!bestRecord || oneRepMax > bestRecord.oneRepMax) {
                        bestRecord = {
                          exerciseName: ex.name,
                          oneRepMax: Math.round(oneRepMax * 10) / 10,
                          weight: weightVal,
                          reps: repsVal,
                          rpe: s.rpe || ex.rpe,
                          date: new Date(w.date + 'T00:00:00').toLocaleDateString('es-ES', { 
                            day: 'numeric', 
                            month: 'short', 
                            year: 'numeric' 
                          })
                        };
                      }
                    }
                  }
                });
              } else {
                const oneRepMax = calculate1RM(ex.weight, ex.reps, ex.rpe || w.rpe);
                if (oneRepMax > 0) {
                  if (!bestRecord || oneRepMax > bestRecord.oneRepMax) {
                    bestRecord = {
                      exerciseName: ex.name,
                      oneRepMax: Math.round(oneRepMax * 10) / 10,
                      weight: ex.weight,
                      reps: ex.reps,
                      rpe: ex.rpe || w.rpe,
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
          let oneRepMax = 0;
          if (Array.isArray(matchingEx.sets)) {
            matchingEx.sets.forEach(s => {
              if (s.done !== false) {
                const calculated1RM = calculate1RM(parseFloat(s.weight) || 0, parseFloat(s.reps) || 0, s.rpe || matchingEx.rpe);
                if (calculated1RM > oneRepMax) {
                  oneRepMax = calculated1RM;
                }
              }
            });
          } else {
            oneRepMax = calculate1RM(matchingEx.weight, matchingEx.reps, matchingEx.rpe || w.rpe);
          }
          
          if (oneRepMax > 0) {
            points.push({
              date: new Date(w.date + 'T00:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }),
              oneRepMax: Math.round(oneRepMax * 10) / 10
            });
          }
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

  // --- 5. LIFETIME STATS ---
  const totalRunningKm = Math.round(runningWorkouts.reduce((sum, w) => sum + Number(w.distance || 0), 0) * 10) / 10;
  const totalGymVolumeKg = gymVolumes.reduce((sum, vol) => sum + vol, 0);
  const totalGymTonnageTons = Math.round((totalGymVolumeKg / 1000) * 10) / 10;
  
  const totalCardioSeconds = runningWorkouts.reduce((sum, w) => sum + timeStringToSeconds(w.duration), 0);
  const totalCardioHours = Math.floor(totalCardioSeconds / 3600);
  const totalCardioMinutes = Math.floor((totalCardioSeconds % 3600) / 60);
  const totalCardioFormatted = `${totalCardioHours}h ${totalCardioMinutes}m`;
  
  let avgWorkoutsPerWeek = 0;
  if (workouts.length > 0) {
    const dates = workouts.map(w => new Date(w.date + 'T00:00:00')).sort((a, b) => a - b);
    const firstDate = dates[0];
    const lastDate = dates[dates.length - 1];
    const diffTime = Math.abs(lastDate - firstDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;
    const diffWeeks = Math.max(1, diffDays / 7);
    avgWorkoutsPerWeek = Math.round((workouts.length / diffWeeks) * 10) / 10;
  }

  // --- 6. SECOND-TIER STRENGTH RECORDS ---
  const overheadPressPR = getBest1RMRecord(['militar', 'overhead', 'shoulder press', 'press militar']);
  const pullupsPR = getBest1RMRecord(['dominada', 'pull-up', 'pullup', 'chin-up']);
  const bicepsCurlPR = getBest1RMRecord(['curl de biceps', 'curl de bíceps', 'biceps curl', 'curl biceps']);

  // --- 7. CARDIOVASCULAR EFFICIENCY INDEX CHART ---
  const runningWithHR = runningWorkouts.filter(w => {
    const dist = Number(w.distance || 0);
    const hrs = w.heartRate ? Number(w.heartRate) : 0;
    const secs = timeStringToSeconds(w.duration);
    return dist > 0 && hrs > 0 && secs > 0;
  });

  const efficiencyDates = runningWithHR.map(w => {
    return new Date(w.date + 'T00:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
  });

  const efficiencyValues = runningWithHR.map(w => {
    const distMeters = Number(w.distance) * 1000;
    const secs = timeStringToSeconds(w.duration);
    const speedMps = distMeters / secs;
    const hr = Number(w.heartRate);
    const eff = (speedMps / hr) * 1000;
    return Math.round(eff * 100) / 100;
  });

  const efficiencyChartData = {
    labels: efficiencyDates,
    datasets: [
      {
        label: 'Índice de Eficiencia (m/s por latido * 1000)',
        data: efficiencyValues,
        borderColor: '#06b6d4',
        backgroundColor: isLight ? 'rgba(6, 182, 212, 0.05)' : 'rgba(6, 182, 212, 0.1)',
        borderWidth: 3,
        pointBackgroundColor: '#06b6d4',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 1.5,
        pointHoverRadius: 6,
        fill: true,
        tension: 0.3,
      }
    ]
  };

  const efficiencyChartOptions = {
    responsive: true,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (context) => ` Eficiencia: ${context.raw} pts`
        }
      }
    },
    scales: {
      y: {
        grid: { color: gridColor },
        ticks: { color: textColor },
        title: { display: true, text: 'Eficiencia Fisiológica', color: textColor }
      },
      x: {
        grid: { display: false },
        ticks: { color: textColor }
      }
    }
  };

  // --- 8. GAMIFIED CYBERPUNK MILESTONES ---
  const hasRayoVerde = runningWorkouts.some(w => {
    const dist = Number(w.distance || 0);
    if (dist >= 5) {
      const paceSecs = timeStringToSeconds(w.duration) / dist;
      return paceSecs <= 300; // <= 5:00 min/km
    }
    return false;
  });

  const hasEspirituErrante = runningWorkouts.some(w => Number(w.distance || 0) >= 12);
  const hasHerculesAcero = gymVolumes.some(vol => vol >= 3000);
  const hasMonarcaPesoMuerto = deadliftPR && deadliftPR.oneRepMax >= 100;
  const hasAbsorbenteHierro = totalGymVolumeKg >= 15000;
  const hasCorazonTitanio = totalRunningKm >= 80;

  const milestones = [
    {
      id: 'rayo-verde',
      title: 'Rayo Verde',
      desc: 'Correr 5K o más a un ritmo promedio inferior a 5:00 min/km.',
      unlocked: hasRayoVerde,
      icon: Flame,
      color: '#10b981',
      glowColor: 'rgba(16, 185, 129, 0.35)',
    },
    {
      id: 'espiritu-errante',
      title: 'Espíritu Errante',
      desc: 'Completar una carrera de fondo de al menos 12 kilómetros.',
      unlocked: hasEspirituErrante,
      icon: Sparkles,
      color: '#3b82f6',
      glowColor: 'rgba(59, 130, 246, 0.35)',
    },
    {
      id: 'hercules-acero',
      title: 'Hércules de Acero',
      desc: 'Levantar un volumen de al menos 3,000 kg en una sola sesión de gimnasio.',
      unlocked: hasHerculesAcero,
      icon: Trophy,
      color: '#ec4899',
      glowColor: 'rgba(236, 72, 153, 0.35)',
    },
    {
      id: 'monarca-peso-muerto',
      title: 'Monarca del Peso Muerto',
      desc: 'Alcanzar un 1RM estimado en Peso Muerto de 100 kg o superior.',
      unlocked: hasMonarcaPesoMuerto,
      icon: Crown,
      color: '#8b5cf6',
      glowColor: 'rgba(139, 92, 246, 0.35)',
    },
    {
      id: 'absorbente-hierro',
      title: 'Absorbente de Hierro',
      desc: 'Acumular un volumen total de gimnasio de 15,000 kg o más.',
      unlocked: hasAbsorbenteHierro,
      icon: Dumbbell,
      color: '#f59e0b',
      glowColor: 'rgba(245, 158, 11, 0.35)',
    },
    {
      id: 'corazon-titanio',
      title: 'Corazón de Titanio',
      desc: 'Acumular una distancia total de running de 80 kilómetros o más.',
      unlocked: hasCorazonTitanio,
      icon: Activity,
      color: '#06b6d4',
      glowColor: 'rgba(6, 182, 212, 0.35)',
    }
  ];

  return (
    <div className="analytics-container fade-in">
      <header className="analytics-header">
        <div>
          <h1 className="gradient-text text-3xl font-extrabold">Estadísticas y Progreso</h1>
          <p className="text-secondary text-sm">Visualiza tus mejoras acumuladas, patrones de entrenamiento y sobrecarga progresiva.</p>
        </div>
      </header>

      {workouts.length > 0 && (
        <section className="lifetime-stats-section fade-in mb-6">
          <div className="lifetime-stats-grid">
            <div className="glass-card stats-mini-card km-run">
              <div className="stats-mini-header">
                <span className="stats-mini-label">Distancia Running Acumulada</span>
                <Activity size={16} style={{ color: 'var(--color-running)' }} />
              </div>
              <div className="stats-mini-value">{totalRunningKm} <span className="stats-mini-unit">km</span></div>
              <p className="stats-mini-desc">Kilómetros totales recorridos a pie</p>
            </div>

            <div className="glass-card stats-mini-card gym-ton">
              <div className="stats-mini-header">
                <span className="stats-mini-label">Tonelaje Gimnasio Acumulado</span>
                <Flame size={16} style={{ color: 'var(--color-gym)' }} />
              </div>
              <div className="stats-mini-value">{totalGymTonnageTons} <span className="stats-mini-unit">Tn</span></div>
              <p className="stats-mini-desc">Carga de entrenamiento total levantada</p>
            </div>

            <div className="glass-card stats-mini-card hours-card">
              <div className="stats-mini-header">
                <span className="stats-mini-label">Tiempo Total de Cardio</span>
                <Timer size={16} style={{ color: 'var(--color-running)' }} />
              </div>
              <div className="stats-mini-value">{totalCardioFormatted}</div>
              <p className="stats-mini-desc">Tiempo acumulado en suela de carrera</p>
            </div>

            <div className="glass-card stats-mini-card consistency-card">
              <div className="stats-mini-header">
                <span className="stats-mini-label">Consistencia Global</span>
                <Calendar size={16} className="text-primary-glow" />
              </div>
              <div className="stats-mini-value">{avgWorkoutsPerWeek} <span className="stats-mini-unit">ses/sem</span></div>
              <p className="stats-mini-desc">Frecuencia de entrenamiento semanal</p>
            </div>
          </div>
        </section>
      )}

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

            <h3 className="section-subtitle-secondary flex-center mt-6 mb-3" style={{ fontSize: '1rem', color: 'var(--text-secondary)', fontWeight: 600, gap: '0.4rem', marginTop: '1.75rem' }}>
              <Dumbbell size={16} style={{ color: 'var(--color-primary)' }} />
              Récords Secundarios de Fuerza (Aislamiento y Accesorios)
            </h3>
            
            <div className="pr-cards-grid secondary-pr-grid mb-6">
              {/* Card 4: Press Militar */}
              <div className="glass-card pr-card pr-military" style={{ minHeight: '220px' }}>
                <div className="pr-card-header-row">
                  <div className="pr-icon-glow flex-center" style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', border: '1px solid rgba(245, 158, 11, 0.25)' }}>
                    <Flame size={18} />
                  </div>
                  <span className="pr-card-badge" style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }}>Hombros</span>
                </div>
                <h3 className="pr-exercise-title">Press Militar</h3>
                {overheadPressPR ? (
                  <div className="pr-stats-area">
                    <div className="pr-1rm-value" style={{ fontSize: '1.85rem' }}>{overheadPressPR.oneRepMax} <span className="pr-unit">kg</span></div>
                    <div className="pr-detail-pill">{overheadPressPR.weight} kg x {overheadPressPR.reps} reps</div>
                    <div className="pr-date-row">
                      <Zap size={10} className="text-primary-glow" />
                      <span>Logrado el {overheadPressPR.date}</span>
                    </div>
                    <button 
                      onClick={() => handleViewProgression(overheadPressPR.exerciseName)}
                      className="btn btn-pr-action flex-center mt-3"
                    >
                      <span>Evolución Temporal</span>
                      <ChevronRight size={14} />
                    </button>
                  </div>
                ) : (
                  <div className="pr-stats-empty">
                    <p className="text-muted text-2xs mt-2 mb-3">Sin marcas registradas aún.</p>
                    <div className="pr-detail-pill disabled">-- kg</div>
                  </div>
                )}
              </div>

              {/* Card 5: Dominadas */}
              <div className="glass-card pr-card pr-pullups" style={{ minHeight: '220px' }}>
                <div className="pr-card-header-row">
                  <div className="pr-icon-glow flex-center" style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', border: '1px solid rgba(59, 130, 246, 0.25)' }}>
                    <Crown size={18} />
                  </div>
                  <span className="pr-card-badge" style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}>Espalda / Tirón</span>
                </div>
                <h3 className="pr-exercise-title">Dominadas</h3>
                {pullupsPR ? (
                  <div className="pr-stats-area">
                    <div className="pr-1rm-value" style={{ fontSize: '1.85rem' }}>{pullupsPR.oneRepMax} <span className="pr-unit">kg</span></div>
                    <div className="pr-detail-pill">{pullupsPR.weight} kg x {pullupsPR.reps} reps</div>
                    <div className="pr-date-row">
                      <Zap size={10} className="text-primary-glow" />
                      <span>Logrado el {pullupsPR.date}</span>
                    </div>
                    <button 
                      onClick={() => handleViewProgression(pullupsPR.exerciseName)}
                      className="btn btn-pr-action flex-center mt-3"
                    >
                      <span>Evolución Temporal</span>
                      <ChevronRight size={14} />
                    </button>
                  </div>
                ) : (
                  <div className="pr-stats-empty">
                    <p className="text-muted text-2xs mt-2 mb-3">Sin marcas registradas aún.</p>
                    <div className="pr-detail-pill disabled">-- kg</div>
                  </div>
                )}
              </div>

              {/* Card 6: Curl de Bíceps */}
              <div className="glass-card pr-card pr-biceps" style={{ minHeight: '220px' }}>
                <div className="pr-card-header-row">
                  <div className="pr-icon-glow flex-center" style={{ background: 'rgba(168, 85, 247, 0.1)', color: '#a855f7', border: '1px solid rgba(168, 85, 247, 0.25)' }}>
                    <Sparkles size={18} />
                  </div>
                  <span className="pr-card-badge" style={{ background: 'rgba(168, 85, 247, 0.1)', color: '#a855f7' }}>Brazos</span>
                </div>
                <h3 className="pr-exercise-title">Curl de Bíceps</h3>
                {bicepsCurlPR ? (
                  <div className="pr-stats-area">
                    <div className="pr-1rm-value" style={{ fontSize: '1.85rem' }}>{bicepsCurlPR.oneRepMax} <span className="pr-unit">kg</span></div>
                    <div className="pr-detail-pill">{bicepsCurlPR.weight} kg x {bicepsCurlPR.reps} reps</div>
                    <div className="pr-date-row">
                      <Zap size={10} className="text-primary-glow" />
                      <span>Logrado el {bicepsCurlPR.date}</span>
                    </div>
                    <button 
                      onClick={() => handleViewProgression(bicepsCurlPR.exerciseName)}
                      className="btn btn-pr-action flex-center mt-3"
                    >
                      <span>Evolución Temporal</span>
                      <ChevronRight size={14} />
                    </button>
                  </div>
                ) : (
                  <div className="pr-stats-empty">
                    <p className="text-muted text-2xs mt-2 mb-3">Sin marcas registradas aún.</p>
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

          {/* Chart 5: Cardiovascular Efficiency Index */}
          <div className="glass-card chart-card">
            <div className="chart-card-header">
              <h3 className="chart-title flex-center">
                <Activity size={18} style={{ color: '#06b6d4' }} /> 
                Índice de Eficiencia Cardiovascular (Carrera)
              </h3>
              <span className="text-muted text-xs">Fórmula: Velocidad (m/s) / Pulso medio × 1000 (mayor es mejor)</span>
            </div>
            <div className="chart-wrapper-canvas">
              {runningWithHR.length < 2 ? (
                <div className="empty-chart-notice">Registra al menos 2 corridas con sensor de pulso para evaluar tu eficiencia.</div>
              ) : (
                <Line data={efficiencyChartData} options={efficiencyChartOptions} />
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

        {/* Section: Hitos y Logros de Rendimiento */}
        <section className="milestones-section fade-in mt-6" style={{ marginTop: '2rem' }}>
          <h2 className="section-subtitle flex-center mb-3">
            <Award size={20} style={{ color: 'var(--color-primary)' }} />
            Hitos y Logros de Rendimiento (Gamificación)
          </h2>
          <p className="text-secondary text-xs mb-4">
            Desbloquea insignias holográficas de élite completando hazañas reales de entrenamiento registradas en tu historial.
          </p>

          <div className="milestones-grid">
            {milestones.map(m => {
              const IconComponent = m.icon;
              return (
                <div 
                  key={m.id} 
                  className={`glass-card milestone-badge-card ${m.unlocked ? 'unlocked' : 'locked'}`}
                  style={{ 
                    '--milestone-color': m.color,
                    '--milestone-glow': m.glowColor
                  }}
                >
                  <div className="milestone-badge-glow-effect"></div>
                  <div className="milestone-card-inner">
                    <div className="milestone-icon-wrapper">
                      {m.unlocked ? (
                        <IconComponent size={24} className="milestone-icon" />
                      ) : (
                        <Lock size={20} className="milestone-lock-icon" />
                      )}
                    </div>
                    <div className="milestone-info">
                      <h4 className="milestone-title flex-center">
                        {m.title}
                        {m.unlocked && <span className="milestone-unlocked-tag">Desbloqueado</span>}
                      </h4>
                      <p className="milestone-desc">{m.desc}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
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

        /* Lifetime Stats Grid */
        .lifetime-stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 1.25rem;
          margin-bottom: 1.5rem;
        }

        .stats-mini-card {
          padding: 1.25rem;
          border-radius: 16px;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          position: relative;
          overflow: hidden;
          background: rgba(255, 255, 255, 0.015);
          border: 1px solid var(--border-light);
          transition: all var(--transition-medium);
        }

        .stats-mini-card:hover {
          transform: translateY(-3px);
          background: rgba(255, 255, 255, 0.025);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
        }

        .km-run:hover {
          border-color: rgba(16, 185, 129, 0.3);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3), 0 0 15px rgba(16, 185, 129, 0.1);
        }

        .gym-ton:hover {
          border-color: rgba(236, 72, 153, 0.3);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3), 0 0 15px rgba(236, 72, 153, 0.1);
        }

        .hours-card:hover {
          border-color: rgba(14, 165, 233, 0.3);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3), 0 0 15px rgba(14, 165, 233, 0.1);
        }

        .consistency-card:hover {
          border-color: rgba(139, 92, 246, 0.3);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3), 0 0 15px rgba(139, 92, 246, 0.1);
        }

        .stats-mini-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .stats-mini-label {
          font-size: 0.7rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--text-muted);
        }

        .stats-mini-value {
          font-size: 1.85rem;
          font-weight: 900;
          color: var(--text-primary);
          font-family: var(--font-sans);
          line-height: 1;
        }

        .stats-mini-unit {
          font-size: 0.9rem;
          font-weight: 500;
          color: var(--text-muted);
          margin-left: 0.15rem;
        }

        .stats-mini-desc {
          font-size: 0.65rem;
          color: var(--text-muted);
          margin: 0;
        }

        /* Secondary PR Cards hover effects */
        .pr-military {
          border-color: rgba(245, 158, 11, 0.12);
        }
        .pr-military:hover {
          border-color: rgba(245, 158, 11, 0.35);
          box-shadow: 0 12px 30px rgba(0, 0, 0, 0.4), 0 0 20px rgba(245, 158, 11, 0.15);
        }
        .pr-pullups {
          border-color: rgba(59, 130, 246, 0.12);
        }
        .pr-pullups:hover {
          border-color: rgba(59, 130, 246, 0.35);
          box-shadow: 0 12px 30px rgba(0, 0, 0, 0.4), 0 0 20px rgba(59, 130, 246, 0.15);
        }
        .pr-biceps {
          border-color: rgba(168, 85, 247, 0.12);
        }
        .pr-biceps:hover {
          border-color: rgba(168, 85, 247, 0.35);
          box-shadow: 0 12px 30px rgba(0, 0, 0, 0.4), 0 0 20px rgba(168, 85, 247, 0.15);
        }

        /* Milestones Section */
        .milestones-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 1.25rem;
          margin-top: 1rem;
        }

        .milestone-badge-card {
          padding: 1.25rem;
          border-radius: 20px;
          position: relative;
          overflow: hidden;
          background: rgba(255, 255, 255, 0.015);
          border: 1px solid var(--border-light);
          transition: all var(--transition-medium);
        }

        .milestone-badge-card.unlocked {
          border-color: rgba(255, 255, 255, 0.1);
        }

        .milestone-badge-card.unlocked:hover {
          transform: translateY(-5px) scale(1.01);
          border-color: var(--milestone-color);
          box-shadow: 0 12px 30px rgba(0, 0, 0, 0.4), 0 0 20px var(--milestone-glow);
        }

        .milestone-badge-card.locked {
          filter: grayscale(0.8) opacity(0.55);
          background: rgba(0, 0, 0, 0.15);
          border-style: dashed;
        }

        .milestone-badge-glow-effect {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: radial-gradient(circle at 10% 10%, var(--milestone-glow) 0%, transparent 60%);
          opacity: 0;
          transition: opacity var(--transition-medium);
          pointer-events: none;
        }

        .milestone-badge-card.unlocked:hover .milestone-badge-glow-effect {
          opacity: 0.6;
        }

        .milestone-card-inner {
          display: flex;
          align-items: center;
          gap: 1rem;
          position: relative;
          z-index: 2;
        }

        .milestone-icon-wrapper {
          width: 50px;
          height: 50px;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid var(--border-light);
          transition: all var(--transition-medium);
        }

        .milestone-badge-card.unlocked .milestone-icon-wrapper {
          color: var(--milestone-color);
          background: rgba(255, 255, 255, 0.05);
          border-color: rgba(255, 255, 255, 0.15);
          box-shadow: 0 0 10px var(--milestone-glow);
        }

        .milestone-badge-card.unlocked:hover .milestone-icon-wrapper {
          transform: rotate(8deg) scale(1.1);
        }

        .milestone-lock-icon {
          color: var(--text-muted);
        }

        .milestone-info {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
          flex: 1;
        }

        .milestone-title {
          font-size: 0.95rem;
          font-weight: 800;
          color: var(--text-primary);
          margin: 0;
          gap: 0.5rem;
        }

        .milestone-unlocked-tag {
          font-size: 0.6rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.02em;
          background: rgba(16, 185, 129, 0.12);
          color: #10b981;
          padding: 0.15rem 0.4rem;
          border-radius: 4px;
          border: 1px solid rgba(16, 185, 129, 0.2);
        }

        .milestone-desc {
          font-size: 0.7rem;
          color: var(--text-secondary);
          margin: 0;
          line-height: 1.35;
        }
      `}</style>
    </div>
  );
}
