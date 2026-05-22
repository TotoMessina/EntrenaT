import React, { useState } from 'react';
import { 
  TrendingUp, 
  MapPin, 
  Clock, 
  Heart, 
  Dumbbell, 
  ChevronRight, 
  Flame, 
  Calendar,
  Sparkles,
  Printer
} from 'lucide-react';
import { secondsToTimeString, formatPace, timeStringToSeconds } from '../utils/calculators';

export default function Overview({ workouts, setActiveTab, onAddWorkoutClick, onOpenReport }) {
  
  // --- RACHA SEMANAL Y ESTADÍSTICAS ---
  const getWeeklyDaysStatus = () => {
    const today = new Date();
    const currentDayIndex = today.getDay(); // 0 = Domingo, 1 = Lunes, etc.
    const mondayDiff = currentDayIndex === 0 ? -6 : 1 - currentDayIndex;
    
    const monday = new Date(today);
    monday.setDate(today.getDate() + mondayDiff);
    monday.setHours(0, 0, 0, 0);

    const dayNames = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
    const weekDays = [];

    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const dStr = d.toISOString().split('T')[0];
      
      const dayWorkouts = workouts.filter(w => w.date === dStr);
      const isActive = dayWorkouts.length > 0;
      
      weekDays.push({
        name: dayNames[i],
        label: dayNames[i].substring(0, 2),
        dateStr: dStr,
        isActive,
        isToday: d.toDateString() === today.toDateString(),
        isPastOrToday: d <= today
      });
    }
    return weekDays;
  };

  const getConsecutiveActiveWeeksCount = () => {
    if (workouts.length === 0) return 0;
    
    const getWeekIdentifier = (dateObj) => {
      const d = typeof dateObj === 'string' ? new Date(dateObj + 'T00:00:00') : new Date(dateObj);
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(d.setDate(diff));
      monday.setHours(0, 0, 0, 0);
      return monday.toISOString().split('T')[0];
    };

    const activeWeeks = new Set(workouts.map(w => getWeekIdentifier(w.date)));
    
    let consecutiveWeeks = 0;
    const today = new Date();
    let checkDateStr = getWeekIdentifier(today);
    
    while (activeWeeks.has(checkDateStr)) {
      consecutiveWeeks++;
      const prevWeek = new Date(checkDateStr + 'T00:00:00');
      prevWeek.setDate(prevWeek.getDate() - 7);
      checkDateStr = prevWeek.toISOString().split('T')[0];
    }
    
    return consecutiveWeeks;
  };

  const weekDays = getWeeklyDaysStatus();
  const activeWeeksCount = getConsecutiveActiveWeeksCount();

  const today = new Date();
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(today.getDate() - 7);
  sevenDaysAgo.setHours(0, 0, 0, 0);
  
  const fourteenDaysAgo = new Date();
  fourteenDaysAgo.setDate(today.getDate() - 14);
  fourteenDaysAgo.setHours(0, 0, 0, 0);

  const workoutsLast7D = workouts.filter(w => {
    const wDate = new Date(w.date + 'T00:00:00');
    return wDate >= sevenDaysAgo && wDate <= today;
  }).length;

  const workoutsPrev7D = workouts.filter(w => {
    const wDate = new Date(w.date + 'T00:00:00');
    return wDate >= fourteenDaysAgo && wDate < sevenDaysAgo;
  }).length;

  // --- COACH CIENTÍFICO VIRTUAL ---
  const coachTips = [
    {
      icon: "❤️",
      title: "Frecuencia Cardíaca Zona 2",
      text: "Entrenar en Zona 2 (60%-70% de tu FCmáx) estimula la biogénesis mitocondrial y la eficiencia metabólica. Ideal para construir tu base aeróbica sin sobrecargar tu sistema nervioso."
    },
    {
      icon: "📊",
      title: "Autorregulación con RPE",
      text: "La escala RPE Borg te ayuda a evaluar la fatiga diaria. Un RPE 8 indica que dejaste exactamente 2 repeticiones en reserva (RIR 2). ¡Entrena inteligente, evita el sobreentrenamiento!"
    },
    {
      icon: "📈",
      title: "Sobrecarga Progresiva",
      text: "Para ganar masa muscular o fuerza, incrementa el volumen total (series × repeticiones × peso) entre un 2% y un 5% por semana. La consistencia gradual supera al esfuerzo esporádico."
    },
    {
      icon: "⚡",
      title: "Fórmula Cardíaca de Tanaka",
      text: "FCmáx = 208 - 0.7 × Edad. Es científicamente más precisa para deportistas aficionados y avanzados que la clásica fórmula de Astrand (220 - Edad)."
    },
    {
      icon: "🫁",
      title: "Importancia del VO2 Máx",
      text: "El VO2 Máx mide la capacidad de transportar y utilizar oxígeno durante el esfuerzo. Incrementar tu VO2 Máx mejora tu resistencia, velocidad de recuperación y longevidad celular."
    },
    {
      icon: "💤",
      title: "Hormona de Crecimiento & Descanso",
      text: "El músculo no crece en el gimnasio, sino durante la fase profunda del sueño. Duerme entre 7 y 8 horas diarias y deja un mínimo de 48 horas de recuperación para grupos musculares trabajados intensamente."
    }
  ];

  const [currentTipIndex, setCurrentTipIndex] = useState(0);
  const nextTip = () => {
    setCurrentTipIndex((prev) => (prev + 1) % coachTips.length);
  };
  
  // --- METRIC CALCULATIONS ---
  const runningWorkouts = workouts.filter(w => w.type === 'running');
  const gymWorkouts = workouts.filter(w => w.type === 'gym');

  // Running calculations
  const totalRuns = runningWorkouts.length;
  const totalDistance = runningWorkouts.reduce((sum, w) => sum + Number(w.distance), 0);
  
  // Total running seconds
  const totalRunningSeconds = runningWorkouts.reduce((sum, w) => sum + timeStringToSeconds(w.duration), 0);
  const avgPaceSecs = totalDistance > 0 ? totalRunningSeconds / totalDistance : 0;
  
  // Best pace (min secs/km)
  let bestPaceSecs = Infinity;
  runningWorkouts.forEach(w => {
    const pace = timeStringToSeconds(w.duration) / Number(w.distance);
    if (pace < bestPaceSecs) bestPaceSecs = pace;
  });
  if (bestPaceSecs === Infinity) bestPaceSecs = 0;

  // Gym calculations
  const totalGymSessions = gymWorkouts.length;
  let totalVolume = 0;
  let peakWeight = 0;

  gymWorkouts.forEach(w => {
    if (w.exercises && Array.isArray(w.exercises)) {
      w.exercises.forEach(ex => {
        if (Array.isArray(ex.sets)) {
          ex.sets.forEach(s => {
            if (s.done !== false) {
              const weightVal = parseFloat(s.weight) || 0;
              const repsVal = parseFloat(s.reps) || 0;
              totalVolume += weightVal * repsVal;
              if (weightVal > peakWeight) {
                peakWeight = weightVal;
              }
            }
          });
        } else {
          const setsVal = Number(ex.sets) || 0;
          const repsVal = Number(ex.reps) || 0;
          const weightVal = Number(ex.weight) || 0;
          totalVolume += setsVal * repsVal * weightVal;
          if (weightVal > peakWeight) {
            peakWeight = weightVal;
          }
        }
      });
    }
  });

  // Recent Workouts (Last 4)
  const recentWorkouts = [...workouts]
    .sort((a, b) => new Date(b.date + 'T00:00:00') - new Date(a.date + 'T00:00:00'))
    .slice(0, 4);

  // --- HEATMAP GENERATION (180 days = 26 weeks) ---
  const generateHeatmapData = () => {
    const cells = [];
    const today = new Date();
    
    // Generate 182 days (26 weeks) backwards
    for (let i = 181; i >= 0; i--) {
      const date = new Date();
      date.setDate(today.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const dayWorkouts = workouts.filter(w => w.date === dateStr);
      let level = '0';
      let type = 'none';
      let title = `${date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}: Sin entrenamientos`;
      
      if (dayWorkouts.length > 0) {
        const hasRun = dayWorkouts.some(w => w.type === 'running');
        const hasGym = dayWorkouts.some(w => w.type === 'gym');
        
        if (hasRun && hasGym) {
          type = 'both';
          level = '3';
          title = `${date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}: Corrido y Gimnasio (Doble sesión)`;
        } else if (hasRun) {
          type = 'running';
          const dist = dayWorkouts.reduce((sum, w) => sum + Number(w.distance), 0);
          level = dist > 10 ? '4' : dist > 6 ? '3' : dist > 4 ? '2' : '1';
          title = `${date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}: Corrida (${dist} km)`;
        } else if (hasGym) {
          type = 'gym';
          const vol = dayWorkouts.reduce((sum, w) => {
            return sum + (w.exercises?.reduce((s, ex) => {
              if (Array.isArray(ex.sets)) {
                return s + ex.sets.reduce((exSum, set) => {
                  if (set.done !== false) {
                    const weightVal = parseFloat(set.weight) || 0;
                    const repsVal = parseFloat(set.reps) || 0;
                    return exSum + (weightVal * repsVal);
                  }
                  return exSum;
                }, 0);
              } else {
                const setsVal = Number(ex.sets) || 0;
                const repsVal = Number(ex.reps) || 0;
                const weightVal = Number(ex.weight) || 0;
                return s + (setsVal * repsVal * weightVal);
              }
            }, 0) || 0);
          }, 0);
          level = vol > 4000 ? '4' : vol > 2500 ? '3' : vol > 1000 ? '2' : '1';
          title = `${date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}: Gimnasio (Volumen: ${vol} kg)`;
        }
      }
      
      cells.push({ dateStr, type, level, title });
    }
    return cells;
  };

  const heatmapCells = generateHeatmapData();

  return (
    <div className="overview-container fade-in">
      <header className="overview-header">
        <div>
          <h1 className="gradient-text text-3xl font-extrabold">Panel de Control</h1>
          <p className="text-secondary text-sm">Resumen de tus progresos, entrenamientos y rendimiento general.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn btn-secondary flex-center" onClick={onOpenReport} style={{ gap: '6px' }}>
            <Printer size={16} />
            <span>Reporte PDF</span>
          </button>
          <button className="btn btn-primary" onClick={() => onAddWorkoutClick()}>
            Registrar Sesión
          </button>
        </div>
      </header>

      {/* NUEVA SECCIÓN: ACCIONES RÁPIDAS Y CONSISTENCIA SEMANAL */}
      <div className="overview-top-row">
        {/* Acciones Rápidas */}
        <div className="glass-card quick-actions-panel">
          <div className="panel-header-simple">
            <h3 className="section-title flex-center" style={{ justifyContent: 'flex-start', gap: '6px', margin: 0 }}>
              <Sparkles size={16} className="text-primary animate-pulse" />
              Acciones Rápidas
            </h3>
            <span className="text-secondary text-xs">Registra entrenamientos comunes con 1 clic</span>
          </div>

          <div className="quick-actions-list">
            <button 
              className="quick-action-btn flex-center"
              onClick={() => onAddWorkoutClick({ type: 'running', terrain: 'Asfalto' })}
            >
              <span className="action-emoji">🏃</span>
              <div className="action-details">
                <span className="action-title">Running Calle</span>
                <span className="action-subtitle">Running + Asfalto</span>
              </div>
              <ChevronRight size={14} className="action-arrow" />
            </button>

            <button 
              className="quick-action-btn flex-center"
              onClick={() => onAddWorkoutClick({ type: 'running', terrain: 'Cinta' })}
            >
              <span className="action-emoji">👟</span>
              <div className="action-details">
                <span className="action-title">Running Cinta</span>
                <span className="action-subtitle">Running + Cinta</span>
              </div>
              <ChevronRight size={14} className="action-arrow" />
            </button>

            <button 
              className="quick-action-btn flex-center"
              onClick={() => onAddWorkoutClick({ type: 'gym', muscleGroup: 'Pierna', sessionName: 'Día de Piernas' })}
            >
              <span className="action-emoji">🏋️</span>
              <div className="action-details">
                <span className="action-title">Día de Piernas</span>
                <span className="action-subtitle">Gimnasio + Pierna</span>
              </div>
              <ChevronRight size={14} className="action-arrow" />
            </button>

            <button 
              className="quick-action-btn flex-center"
              onClick={() => onAddWorkoutClick({ type: 'gym', muscleGroup: 'Pectoral', sessionName: 'Pecho / Fuerza de Empuje' })}
            >
              <span className="action-emoji">💪</span>
              <div className="action-details">
                <span className="action-title">Fuerza Empuje</span>
                <span className="action-subtitle">Gimnasio + Pecho</span>
              </div>
              <ChevronRight size={14} className="action-arrow" />
            </button>
          </div>
        </div>

        {/* Consistencia Semanal */}
        <div className="glass-card consistency-panel">
          <div className="panel-header-simple">
            <h3 className="section-title flex-center" style={{ justifyContent: 'flex-start', gap: '6px', margin: 0 }}>
              <Calendar size={16} style={{ color: 'var(--color-primary)' }} />
              Racha Semanal
            </h3>
            <span className="text-secondary text-xs">Mantén la disciplina activa esta semana</span>
          </div>

          <div className="weekly-streak-tracker">
            <div className="weekly-days-grid">
              {weekDays.map((day, idx) => (
                <div 
                  key={idx} 
                  className={`weekly-day-cell ${day.isActive ? 'active' : ''} ${day.isToday ? 'today' : ''}`}
                  title={`${day.name}: ${day.isActive ? 'Entrenado' : 'Sin entrenamientos'}`}
                >
                  <span className="day-label">{day.label}</span>
                  <div className="day-status-circle">
                    {day.isActive ? (
                      <span className="check-mark">✓</span>
                    ) : (
                      <span className="dot"></span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="streak-stats-row">
              <div className="streak-stat-box">
                <span className="streak-stat-label">Semanas Seguidas</span>
                <span className="streak-stat-value text-primary-glow">
                  {activeWeeksCount} <span className="stat-unit">sem</span>
                </span>
              </div>
              
              <div className="streak-stat-box">
                <span className="streak-stat-label">Sesiones (7d)</span>
                <span className="streak-stat-value text-running">
                  {workoutsLast7D}
                  {workoutsLast7D > workoutsPrev7D && <span className="trend-arrow positive">↑</span>}
                  {workoutsLast7D < workoutsPrev7D && <span className="trend-arrow negative">↓</span>}
                  {workoutsLast7D === workoutsPrev7D && <span className="trend-arrow neutral">=</span>}
                </span>
              </div>

              <div className="streak-stat-box">
                <span className="streak-stat-label">Días Entrenados</span>
                <span className="streak-stat-value text-gym">
                  {weekDays.filter(d => d.isActive).length} <span className="stat-unit">/ 7</span>
                </span>
              </div>
            </div>
            
            <div className="weekly-motivational-banner">
              <span className="motivational-icon">🔥</span>
              <p className="motivational-text">
                {weekDays.filter(d => d.isActive).length >= 4 
                  ? "¡Nivel de consistencia excelente! Estás construyendo un motor deportivo real." 
                  : weekDays.filter(d => d.isActive).length >= 1
                  ? "Buen progreso semanal. ¡Cada sesión cuenta para consolidar tu rendimiento!"
                  : "Semana comenzando. ¡Da el primer paso hoy mismo!"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* PANEL DEL COACH CIENTÍFICO VIRTUAL */}
      <div className="glass-card coach-tip-card mb-6">
        <div className="coach-header">
          <div className="coach-identity-simple">
            <span className="coach-avatar-emoji">🧠</span>
            <div>
              <h3 className="coach-title font-extrabold text-primary" style={{ margin: 0 }}>Virtual Sport Coach</h3>
              <span className="text-secondary text-xs">Recomendaciones y ciencia del rendimiento deportivo</span>
            </div>
          </div>
          <button className="btn btn-secondary py-1 px-3 text-xs flex-center" onClick={nextTip}>
            Siguiente Consejo <ChevronRight size={14} />
          </button>
        </div>
        
        <div className="coach-content-body animate-fade-in" key={currentTipIndex}>
          <div className="tip-icon-glow">{coachTips[currentTipIndex].icon}</div>
          <div className="tip-text-block">
            <h4 className="tip-title" style={{ margin: 0 }}>{coachTips[currentTipIndex].title}</h4>
            <p className="tip-desc" style={{ margin: 0 }}>{coachTips[currentTipIndex].text}</p>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="kpi-grid">
        {/* KPI: Running Distance */}
        <div className="glass-card kpi-card running-border">
          <div className="kpi-icon-wrapper run-icon-bg">
            <Flame size={22} className="running-text" style={{ color: 'var(--color-running)' }} />
          </div>
          <div className="kpi-content">
            <span className="kpi-label">Distancia Running</span>
            <h3 className="kpi-value">{totalDistance.toFixed(1)} <span className="kpi-unit">km</span></h3>
            <span className="kpi-subtext">{totalRuns} corridas registradas</span>
          </div>
        </div>

        {/* KPI: Avg Run Pace */}
        <div className="glass-card kpi-card running-border">
          <div className="kpi-icon-wrapper run-icon-bg">
            <Clock size={22} className="running-text" style={{ color: 'var(--color-running)' }} />
          </div>
          <div className="kpi-content">
            <span className="kpi-label">Ritmo Promedio</span>
            <h3 className="kpi-value">{formatPace(avgPaceSecs)}</h3>
            <span className="kpi-subtext">Récord ritmo: {formatPace(bestPaceSecs)}</span>
          </div>
        </div>

        {/* KPI: Gym Volume */}
        <div className="glass-card kpi-card gym-border">
          <div className="kpi-icon-wrapper gym-icon-bg">
            <Dumbbell size={22} className="gym-text" style={{ color: 'var(--color-gym)' }} />
          </div>
          <div className="kpi-content">
            <span className="kpi-label">Volumen Gimnasio</span>
            <h3 className="kpi-value">{(totalVolume / 1000).toFixed(1)}k <span className="kpi-unit">kg</span></h3>
            <span className="kpi-subtext">{totalGymSessions} sesiones, Carga máx: {peakWeight} kg</span>
          </div>
        </div>

        {/* KPI: Total Trainings */}
        <div className="glass-card kpi-card primary-border">
          <div className="kpi-icon-wrapper primary-icon-bg">
            <Calendar size={22} style={{ color: 'var(--color-primary)' }} />
          </div>
          <div className="kpi-content">
            <span className="kpi-label">Total Entrenamientos</span>
            <h3 className="kpi-value">{workouts.length}</h3>
            <span className="kpi-subtext">Consistencia del historial</span>
          </div>
        </div>
      </div>

      {/* Grid de Actividad (Heatmap) */}
      <div className="glass-card activity-card mb-6">
        <div className="activity-card-header">
          <h2 className="section-title">Consistencia de Entrenamiento</h2>
          <span className="text-secondary text-xs">Intensidad de entrenamiento en los últimos 6 meses</span>
        </div>
        
        <div className="heatmap-wrapper">
          <div className="heatmap-grid">
            {heatmapCells.map((cell, idx) => (
              <div
                key={idx}
                className={`heatmap-cell heatmap-level-${cell.type === 'none' ? '0' : `${cell.type}-${cell.level}`}`}
              >
                <div className="tooltip-custom">
                  {cell.title}
                </div>
              </div>
            ))}
          </div>
          
          <div className="heatmap-legend">
            <span>Menos</span>
            <div className="legend-box heatmap-level-0"></div>
            <div className="legend-box heatmap-level-running-1"></div>
            <div className="legend-box heatmap-level-running-4"></div>
            <div className="legend-box heatmap-level-gym-1"></div>
            <div className="legend-box heatmap-level-gym-4"></div>
            <div className="legend-box heatmap-level-both-4"></div>
            <span>Más</span>
            <span className="legend-label">(Verde: Running | Rosa: Gym | Violeta: Ambos)</span>
          </div>
        </div>
      </div>

      {/* Split Grid: Recent Workouts & Performance Highlights */}
      <div className="overview-split">
        {/* Recent Activities */}
        <div className="glass-card split-panel">
          <div className="panel-header">
            <h2 className="section-title">Entrenamientos Recientes</h2>
            <button className="text-link" onClick={() => setActiveTab('workouts')}>
              Ver todos <ChevronRight size={14} />
            </button>
          </div>

          <div className="recent-list">
            {recentWorkouts.length === 0 ? (
              <div className="empty-state">
                <Dumbbell size={32} className="text-muted" />
                <p>No hay entrenamientos cargados. ¡Registra el primero!</p>
              </div>
            ) : (
              recentWorkouts.map(w => (
                <div key={w.id} className="recent-item">
                  <div className={`activity-avatar ${w.type === 'running' ? 'run-avatar' : 'gym-avatar'}`}>
                    {w.type === 'running' ? <TrendingUp size={18} /> : <Dumbbell size={18} />}
                  </div>
                  <div className="recent-item-info">
                    <span className="recent-item-title">
                      {w.type === 'running' 
                        ? `Corrida de ${w.distance} km` 
                        : (w.sessionName || `Sesión de ${w.muscleGroup}`)}
                    </span>
                    <span className="recent-item-date">
                      {new Date(w.date + 'T00:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                  <div className="recent-item-badge">
                    <span className={`badge ${w.type === 'running' ? 'badge-running' : 'badge-gym'}`}>
                      {w.type === 'running' ? 'Running' : 'Gym'}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Dynamic tips & insights */}
        <div className="glass-card split-panel highlight-panel">
          <div className="panel-header">
            <h2 className="section-title">Sugerencias del Analizador</h2>
          </div>
          
          <div className="insights-list">
            <div className="insight-item">
              <div className="insight-icon">🎯</div>
              <div className="insight-content">
                <h4>Predicción Maratón</h4>
                {totalRuns > 0 ? (
                  <p>Basado en tu última carrera, puedes estimar tu tiempo esperado de carrera de larga distancia en la pestaña de <strong>Calculadoras</strong>.</p>
                ) : (
                  <p>Registra al menos un entrenamiento de running para habilitar estimaciones precisas de tiempos.</p>
                )}
              </div>
            </div>

            <div className="insight-item">
              <div className="insight-icon">💪</div>
              <div className="insight-content">
                <h4>Sobrecarga Progresiva</h4>
                {totalGymSessions > 0 ? (
                  <p>Tu volumen semanal actual de gimnasio es de {(totalVolume / 1000).toFixed(1)}k kg. Para hipertrofia, intenta incrementar este volumen un 5% la próxima semana.</p>
                ) : (
                  <p>Agrega ejercicios en tus sesiones de gimnasio para evaluar la fatiga muscular y volumen acumulado.</p>
                )}
              </div>
            </div>

            <div className="insight-item">
              <div className="insight-icon">⚡</div>
              <div className="insight-content">
                <h4>Exportación Rápida</h4>
                <p>¿Quieres analizar tus datos en Excel? Puedes realizar una exportación completa a CSV o JSON en el módulo de <strong>Respaldos</strong>.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .overview-container {
          display: flex;
          flex-direction: column;
          gap: 2rem;
        }

        .overview-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 1rem;
        }

        .text-3xl {
          font-size: 1.85rem;
        }

        .font-extrabold {
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

        .mb-6 {
          margin-bottom: 1.5rem;
        }

        /* Card Borders */
        .running-border {
          border-left: 4px solid var(--color-running);
        }
        .gym-border {
          border-left: 4px solid var(--color-gym);
        }
        .primary-border {
          border-left: 4px solid var(--color-primary);
        }

        .kpi-card {
          display: flex;
          align-items: center;
          gap: 1.25rem;
          padding: 1.5rem;
        }

        .kpi-icon-wrapper {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 48px;
          height: 48px;
          border-radius: 12px;
          flex-shrink: 0;
        }

        .run-icon-bg {
          background-color: rgba(16, 185, 129, 0.1);
        }

        .gym-icon-bg {
          background-color: rgba(236, 72, 153, 0.1);
        }

        .primary-icon-bg {
          background-color: rgba(139, 92, 246, 0.1);
        }

        .kpi-content {
          display: flex;
          flex-direction: column;
        }

        .kpi-label {
          font-size: 0.8rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--text-secondary);
        }

        .kpi-value {
          font-size: 1.6rem;
          font-weight: 800;
          color: var(--text-primary);
          line-height: 1.2;
          margin: 0.15rem 0;
        }

        .kpi-unit {
          font-size: 0.95rem;
          font-weight: 500;
          color: var(--text-secondary);
        }

        .kpi-subtext {
          font-size: 0.75rem;
          color: var(--text-muted);
        }

        /* Activity Grid */
        .activity-card {
          padding: 1.5rem;
        }

        .activity-card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.25rem;
          flex-wrap: wrap;
          gap: 0.5rem;
        }

        .section-title {
          font-size: 1.1rem;
          font-weight: 700;
          color: var(--text-primary);
        }

        .heatmap-wrapper {
          overflow-x: auto;
          padding-bottom: 0.5rem;
        }

        .heatmap-legend {
          display: flex;
          align-items: center;
          gap: 0.35rem;
          margin-top: 1.25rem;
          font-size: 0.75rem;
          color: var(--text-muted);
          flex-wrap: wrap;
        }

        .legend-box {
          width: 12px;
          height: 12px;
          border-radius: 2px;
        }

        .legend-label {
          margin-left: 0.5rem;
          color: var(--text-secondary);
        }

        /* Split Panels */
        .overview-split {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1.5rem;
        }

        @media (max-width: 900px) {
          .overview-split {
            grid-template-columns: 1fr;
          }
        }

        .split-panel {
          padding: 1.5rem;
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
          min-height: 320px;
        }

        .panel-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .text-link {
          background: transparent;
          border: none;
          color: var(--color-primary);
          font-family: var(--font-sans);
          font-size: 0.85rem;
          font-weight: 600;
          display: inline-flex;
          align-items: center;
          gap: 0.15rem;
          cursor: pointer;
          transition: color var(--transition-fast);
        }

        .text-link:hover {
          color: #a78bfa;
        }

        .recent-list {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          flex: 1;
        }

        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 0.75rem;
          text-align: center;
          flex: 1;
          color: var(--text-muted);
          font-size: 0.9rem;
        }

        .recent-item {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 0.75rem 1rem;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid var(--border-light);
          border-radius: 12px;
          transition: background var(--transition-fast);
        }

        .recent-item:hover {
          background: rgba(255, 255, 255, 0.05);
        }

        .activity-avatar {
          width: 38px;
          height: 38px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .run-avatar {
          background: rgba(16, 185, 129, 0.1);
          color: var(--color-running);
          border: 1px solid rgba(16, 185, 129, 0.2);
        }

        .gym-avatar {
          background: rgba(236, 72, 153, 0.1);
          color: var(--color-gym);
          border: 1px solid rgba(236, 72, 153, 0.2);
        }

        .recent-item-info {
          display: flex;
          flex-direction: column;
          flex: 1;
        }

        .recent-item-title {
          font-size: 0.9rem;
          font-weight: 600;
          color: var(--text-primary);
        }

        .recent-item-date {
          font-size: 0.75rem;
          color: var(--text-muted);
        }

        .recent-item-badge {
          flex-shrink: 0;
        }

        /* Insights */
        .highlight-panel {
          background: linear-gradient(135deg, rgba(139, 92, 246, 0.05) 0%, rgba(14, 17, 26, 0.75) 100%);
        }

        .insights-list {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
          flex: 1;
          justify-content: center;
        }

        .insight-item {
          display: flex;
          gap: 1rem;
          padding: 0.75rem;
          border-radius: 12px;
          background: rgba(9, 10, 15, 0.4);
          border: 1px solid rgba(255, 255, 255, 0.02);
        }

        .insight-icon {
          font-size: 1.5rem;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .insight-content h4 {
          font-size: 0.9rem;
          font-weight: 700;
          color: var(--text-primary);
          margin-bottom: 0.15rem;
        }

        .insight-content p {
          font-size: 0.8rem;
          color: var(--text-secondary);
          line-height: 1.4;
        }

        .overview-top-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1.5rem;
          margin-bottom: 0.5rem;
        }

        @media (max-width: 900px) {
          .overview-top-row {
            grid-template-columns: 1fr;
          }
        }

        .panel-header-simple {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
          border-bottom: 1px dashed var(--border-light);
          padding-bottom: 0.5rem;
          flex-wrap: wrap;
          gap: 0.5rem;
        }

        /* Quick actions list */
        .quick-actions-list {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0.75rem;
        }

        @media (max-width: 480px) {
          .quick-actions-list {
            grid-template-columns: 1fr;
          }
        }

        .quick-action-btn {
          width: 100%;
          text-align: left;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid var(--border-light);
          padding: 0.75rem 1rem;
          border-radius: 12px;
          cursor: pointer;
          transition: all var(--transition-fast);
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .quick-action-btn:hover {
          background: rgba(139, 92, 246, 0.08);
          border-color: rgba(139, 92, 246, 0.3);
          transform: translateY(-2px);
        }

        .action-emoji {
          font-size: 1.4rem;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 36px;
          height: 36px;
          background: rgba(255, 255, 255, 0.03);
          border-radius: 8px;
        }

        .action-details {
          display: flex;
          flex-direction: column;
          flex: 1;
          min-width: 0;
        }

        .action-title {
          font-size: 0.85rem;
          font-weight: 700;
          color: var(--text-primary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .action-subtitle {
          font-size: 0.7rem;
          color: var(--text-muted);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .action-arrow {
          color: var(--text-muted);
          transition: transform var(--transition-fast), color var(--transition-fast);
        }

        .quick-action-btn:hover .action-arrow {
          transform: translateX(2px);
          color: var(--color-primary);
        }

        /* Weekly consistency tracker */
        .weekly-days-grid {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 0.4rem;
          margin-bottom: 1.25rem;
        }

        .weekly-day-cell {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.4rem;
          padding: 0.5rem 0.2rem;
          background: rgba(255, 255, 255, 0.01);
          border: 1px solid var(--border-light);
          border-radius: 10px;
          transition: all var(--transition-fast);
        }

        .weekly-day-cell.today {
          border-color: var(--color-primary);
          background: rgba(139, 92, 246, 0.04);
        }

        .weekly-day-cell.active {
          background: rgba(16, 185, 129, 0.06);
          border-color: rgba(16, 185, 129, 0.3);
        }

        .weekly-day-cell .day-label {
          font-size: 0.7rem;
          font-weight: 600;
          color: var(--text-muted);
          text-transform: uppercase;
        }

        .weekly-day-cell.today .day-label {
          color: var(--color-primary);
          font-weight: 800;
        }

        .day-status-circle {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          border: 1.5px solid var(--border-light);
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all var(--transition-fast);
        }

        .weekly-day-cell.active .day-status-circle {
          border-color: var(--color-running);
          background: var(--color-running);
          color: white;
          box-shadow: 0 0 6px rgba(16, 185, 129, 0.4);
        }

        .weekly-day-cell.today:not(.active) .day-status-circle {
          border-color: var(--color-primary);
        }

        .day-status-circle .check-mark {
          font-size: 0.65rem;
          font-weight: 800;
          line-height: 1;
        }

        .day-status-circle .dot {
          width: 4px;
          height: 4px;
          border-radius: 50%;
          background: transparent;
        }

        .weekly-day-cell.today:not(.active) .day-status-circle .dot {
          background: var(--color-primary);
          box-shadow: 0 0 4px var(--color-primary);
        }

        /* Streak statistics row */
        .streak-stats-row {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1rem;
          margin-bottom: 1rem;
        }

        .streak-stat-box {
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid var(--border-light);
          padding: 0.6rem 0.8rem;
          border-radius: 10px;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
        }

        .streak-stat-label {
          font-size: 0.65rem;
          font-weight: 600;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.02em;
        }

        .streak-stat-value {
          font-size: 1.25rem;
          font-weight: 800;
          color: var(--text-primary);
          margin-top: 0.15rem;
          display: flex;
          align-items: baseline;
          gap: 0.2rem;
        }

        .streak-stat-value .stat-unit {
          font-size: 0.75rem;
          font-weight: 500;
          color: var(--text-muted);
        }

        .trend-arrow {
          font-size: 0.95rem;
          font-weight: 800;
          margin-left: 0.15rem;
        }

        .trend-arrow.positive { color: var(--color-running); }
        .trend-arrow.negative { color: #ef4444; }
        .trend-arrow.neutral { color: var(--text-muted); }

        .weekly-motivational-banner {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          background: rgba(255, 255, 255, 0.02);
          border: 1px dashed var(--border-light);
          padding: 0.65rem 0.85rem;
          border-radius: 10px;
        }

        .motivational-icon {
          font-size: 1.15rem;
          flex-shrink: 0;
        }

        .motivational-text {
          font-size: 0.75rem;
          color: var(--text-secondary);
          line-height: 1.35;
          margin: 0;
        }

        /* Virtual Coach panel styling */
        .coach-tip-card {
          padding: 1.25rem 1.5rem !important;
          background: linear-gradient(135deg, rgba(139, 92, 246, 0.04) 0%, rgba(9, 10, 15, 0.5) 100%) !important;
          border-color: rgba(139, 92, 246, 0.15) !important;
        }

        .coach-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.85rem;
          border-bottom: 1px dashed rgba(255, 255, 255, 0.05);
          padding-bottom: 0.5rem;
        }

        .coach-identity-simple {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .coach-avatar-emoji {
          font-size: 1.6rem;
        }

        .coach-title {
          font-size: 1rem;
          margin: 0;
        }

        .coach-content-body {
          display: flex;
          align-items: center;
          gap: 1.25rem;
          padding: 0.25rem 0;
        }

        .tip-icon-glow {
          font-size: 2.2rem;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 54px;
          height: 54px;
          background: rgba(139, 92, 246, 0.08);
          border-radius: 14px;
          border: 1px solid rgba(139, 92, 246, 0.18);
          flex-shrink: 0;
          filter: drop-shadow(0 0 6px rgba(139, 92, 246, 0.15));
        }

        .tip-text-block {
          display: flex;
          flex-direction: column;
          gap: 0.15rem;
          flex: 1;
        }

        .tip-title {
          font-size: 0.9rem;
          font-weight: 700;
          color: var(--text-primary);
          margin: 0;
        }

        .tip-desc {
          font-size: 0.8rem;
          color: var(--text-secondary);
          line-height: 1.45;
          margin: 0;
        }
      `}</style>
    </div>
  );
}
