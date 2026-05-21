import React, { useState, useMemo, useEffect } from 'react';
import { 
  Calendar, ChevronLeft, ChevronRight, Zap, Target, TrendingUp, Info, 
  CheckCircle2, Circle, Flame, Feather, Dumbbell, Shield, Sparkles, AlertTriangle, Settings, Save, Trash2
} from 'lucide-react';
import { generateWeeklyMesocyclePlan, getBestWorkoutVdotAndPaces } from '../utils/calculators';

export default function TrainingPlanner({ workouts = [], onUpdatePlans, plans = [], profile = {} }) {
  const [currentWeekStart, setCurrentWeekStart] = useState(() => {
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1); // Monday
    const monday = new Date(today.setDate(diff));
    monday.setHours(0, 0, 0, 0);
    return monday.toISOString().split('T')[0];
  });

  const [weeklyGoal, setWeeklyGoal] = useState(() => {
    return localStorage.getItem('fitanalytics_weekly_km_goal') || '40';
  });

  // Extract config_mesocycle from plans
  const mesocycleConfig = useMemo(() => {
    const configRecord = plans.find(p => p.date === 'config_mesocycle');
    if (configRecord) {
      try {
        const metadata = JSON.parse(configRecord.note);
        return {
          weeks: Number(configRecord.distance) || 12,
          phase: configRecord.sessionType || 'Base',
          startDate: metadata.startDate || '',
          eventName: metadata.eventName || 'Mi Maratón Objetivo',
          eventDistance: Number(metadata.eventDistance) || 21.1,
          weeklyGoal: Number(metadata.weeklyGoal) || Number(weeklyGoal) || 40
        };
      } catch (e) {
        console.error("Error parsing config_mesocycle", e);
      }
    }
    return {
      weeks: 12,
      phase: 'Base',
      startDate: '',
      eventName: 'Mi Maratón Objetivo',
      eventDistance: 21.1,
      weeklyGoal: Number(weeklyGoal) || 40
    };
  }, [plans, weeklyGoal]);

  // Editor states for daily plans
  const [editingDay, setEditingDay] = useState(null); // date string
  const [plannedDist, setPlannedDist] = useState('0');
  const [sessionType, setSessionType] = useState('Regenerativo'); // Fondo, Tempo, Intervalos, Regenerativo, Fuerza, Descanso
  const [plannedNote, setPlannedNote] = useState('');

  // Macrocycle config edit panel states
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [tempWeeks, setTempWeeks] = useState(mesocycleConfig.weeks);
  const [tempEventName, setTempEventName] = useState(mesocycleConfig.eventName);
  const [tempEventDistance, setTempEventDistance] = useState(mesocycleConfig.eventDistance);
  const [tempStartDate, setTempStartDate] = useState(mesocycleConfig.startDate);

  // Sync temp values when mesocycleConfig changes
  useEffect(() => {
    setTempWeeks(mesocycleConfig.weeks);
    setTempEventName(mesocycleConfig.eventName);
    setTempEventDistance(mesocycleConfig.eventDistance);
    setTempStartDate(mesocycleConfig.startDate);
  }, [mesocycleConfig]);

  // Cambiar meta de volumen
  const handleSaveGoal = (val) => {
    setWeeklyGoal(val);
    localStorage.setItem('fitanalytics_weekly_km_goal', val);
    
    handleSaveMesocycleConfig({
      ...mesocycleConfig,
      weeklyGoal: Number(val) || 40
    });
  };

  const handleSaveMesocycleConfig = (updatedConfig) => {
    const newConfigRecord = {
      date: 'config_mesocycle',
      distance: Number(updatedConfig.weeks) || 12,
      sessionType: updatedConfig.phase,
      note: JSON.stringify({
        startDate: updatedConfig.startDate || '',
        eventName: updatedConfig.eventName || 'Mi Maratón Objetivo',
        eventDistance: Number(updatedConfig.eventDistance) || 21.1,
        weeklyGoal: Number(updatedConfig.weeklyGoal) || Number(weeklyGoal) || 40
      })
    };

    let updatedPlans;
    if (plans.some(p => p.date === 'config_mesocycle')) {
      updatedPlans = plans.map(p => p.date === 'config_mesocycle' ? newConfigRecord : p);
    } else {
      updatedPlans = [...plans, newConfigRecord];
    }

    onUpdatePlans(updatedPlans);
    setIsConfigOpen(false);
  };

  const handleSelectPhase = (phaseName) => {
    handleSaveMesocycleConfig({
      ...mesocycleConfig,
      phase: phaseName
    });
  };

  // Autogenerar los planes para la semana actual
  const handleAutogenerateWeek = () => {
    const generatedDays = generateWeeklyMesocyclePlan(
      mesocycleConfig.phase,
      weeklyGoal,
      workouts,
      profile
    );

    const weekDates = weekDays.map(d => d.dateStr);
    
    // Filtrar otros planes, reteniendo el registro de config y planes de otras semanas
    let filteredPlans = plans.filter(p => p.date === 'config_mesocycle' || !weekDates.includes(p.date));

    // Agregar nuevos planes autogenerados
    const newWeeklyPlans = generatedDays.map(gd => {
      const dateStr = weekDays[gd.dayIndex].dateStr;
      return {
        date: dateStr,
        distance: gd.distance,
        sessionType: gd.sessionType,
        note: gd.note
      };
    });

    onUpdatePlans([...filteredPlans, ...newWeeklyPlans]);
  };

  // Calcular número de semana en el macrociclo
  const computedWeekNum = useMemo(() => {
    if (!mesocycleConfig.startDate) return null;
    const start = new Date(mesocycleConfig.startDate + 'T00:00:00');
    const current = new Date(currentWeekStart + 'T00:00:00');
    const diffTime = current.getTime() - start.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const weekIdx = Math.floor(diffDays / 7) + 1;
    if (weekIdx < 1 || weekIdx > mesocycleConfig.weeks) return null;
    return weekIdx;
  }, [mesocycleConfig.startDate, currentWeekStart, mesocycleConfig.weeks]);

  // Obtener ritmos recomendados basados en VDOT real para mostrar en el asistente
  const pacesDetails = useMemo(() => {
    const { vdot, paces } = getBestWorkoutVdotAndPaces(workouts, profile);
    const easyPace = paces.find(p => p.name.includes("Easy")) || { paceMin: "5:30", paceMax: "6:15" };
    const tempoPace = paces.find(p => p.name.includes("Umbral")) || { paceMin: "4:45", paceMax: "5:00" };
    const intervalPace = paces.find(p => p.name.includes("Intervalos")) || { paceMin: "4:15", paceMax: "4:30" };
    
    return {
      vdot,
      easyStr: `${easyPace.paceMin} - ${easyPace.paceMax}/km`,
      tempoStr: `${tempoPace.paceMin} - ${tempoPace.paceMax}/km`,
      intervalStr: `${intervalPace.paceMin} - ${intervalPace.paceMax}/km`
    };
  }, [workouts, profile]);

  // Obtener los 7 días de la semana actual
  const weekDays = useMemo(() => {
    const start = new Date(currentWeekStart + 'T00:00:00');
    const days = [];
    const dayNames = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
    
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const dStr = d.toISOString().split('T')[0];
      
      const dayPlan = plans.find(p => p.date === dStr);
      
      const dayWorkouts = workouts.filter(w => w.date === dStr);
      const actualDistance = dayWorkouts
        .filter(w => w.type === 'running')
        .reduce((sum, w) => sum + (Number(w.distance) || 0), 0);
      
      const hasActualGym = dayWorkouts.some(w => w.type === 'gym');

      days.push({
        dateStr: dStr,
        name: dayNames[i],
        shortName: dayNames[i].substring(0, 2),
        plan: dayPlan || null,
        actualDistance: Math.round(actualDistance * 10) / 10,
        hasActualGym,
        isToday: d.toDateString() === new Date().toDateString()
      });
    }
    return days;
  }, [currentWeekStart, plans, workouts]);

  // Estadísticas semanales
  const weekStats = useMemo(() => {
    const totalPlanned = weekDays.reduce((sum, d) => sum + (Number(d.plan?.distance) || 0), 0);
    const totalActual = weekDays.reduce((sum, d) => sum + d.actualDistance, 0);
    const goal = Number(weeklyGoal) || 40;
    
    const goalProgress = goal > 0 ? Math.min(100, Math.round((totalActual / goal) * 100)) : 0;
    const planAdherence = totalPlanned > 0 ? Math.min(100, Math.round((totalActual / totalPlanned) * 100)) : 100;

    return {
      totalPlanned: Math.round(totalPlanned * 10) / 10,
      totalActual: Math.round(totalActual * 10) / 10,
      goal,
      goalProgress,
      planAdherence
    };
  }, [weekDays, weeklyGoal]);

  // Guardar un plan para un día específico
  const handleSavePlan = (dateStr) => {
    const dist = Number(plannedDist) || 0;
    
    const newPlan = {
      date: dateStr,
      distance: dist,
      sessionType,
      note: plannedNote.trim()
    };

    let updated;
    if (plans.some(p => p.date === dateStr)) {
      updated = plans.map(p => p.date === dateStr ? newPlan : p);
    } else {
      updated = [...plans, newPlan];
    }

    onUpdatePlans(updated);
    setEditingDay(null);
    setPlannedDist('0');
    setPlannedNote('');
  };

  const handleClearPlan = (dateStr) => {
    const updated = plans.filter(p => p.date !== dateStr);
    onUpdatePlans(updated);
    setEditingDay(null);
  };

  // Moverse entre semanas
  const handlePrevWeek = () => {
    const d = new Date(currentWeekStart + 'T00:00:00');
    d.setDate(d.getDate() - 7);
    setCurrentWeekStart(d.toISOString().split('T')[0]);
  };

  const handleNextWeek = () => {
    const d = new Date(currentWeekStart + 'T00:00:00');
    d.setDate(d.getDate() + 7);
    setCurrentWeekStart(d.toISOString().split('T')[0]);
  };

  // Consejos fisiológicos dinámicos por fase
  const getPhaseDetails = (phaseName) => {
    switch (phaseName) {
      case 'Base':
        return {
          title: 'Fase de Base Aeróbica',
          color: 'var(--color-primary)',
          icon: Shield,
          gradient: 'linear-gradient(135deg, rgba(99,102,241,0.15) 0%, rgba(139,92,246,0.05) 100%)',
          border: 'rgba(99,102,241,0.25)',
          textGlow: '0 0 10px rgba(99,102,241,0.4)',
          goalText: 'Construir resistencia general, capilarización periférica y adaptaciones mitocondriales sólidas.',
          distribution: '85-90% de volumen fácil en Zona 2. 0% pasadas anaeróbicas.',
          focusPace: `Trote Suave (Z2): ${pacesDetails.easyStr}`,
          coachingAdvice: 'Foco exclusivo en el kilometraje cómodo. Mantén la respiración nasal holgada. En el gimnasio, trabaja fuerza máxima con cargas altas y amplias pausas.'
        };
      case 'Build':
        return {
          title: 'Fase de Construcción (Build)',
          color: '#10b981',
          icon: Dumbbell,
          gradient: 'linear-gradient(135deg, rgba(16,185,129,0.15) 0%, rgba(52,211,153,0.05) 100%)',
          border: 'rgba(16,185,129,0.25)',
          textGlow: '0 0 10px rgba(16,185,129,0.4)',
          goalText: 'Mejorar el aclaramiento de lactato y la fuerza específica de empuje en carrera.',
          distribution: 'Volumen alto constante. Introducción de 1-2 sesiones de Umbral/Tempo a la semana.',
          focusPace: `Ritmo Umbral/Tempo (Z3): ${pacesDetails.tempoStr}`,
          coachingAdvice: 'Las sesiones de Tempo deben sentirse "exigentes pero estables". No entres en zona de sprint. En el gimnasio, trabaja potencia muscular y pliometría reactiva.'
        };
      case 'Peak':
        return {
          title: 'Fase de Pico (Peak)',
          color: '#ef4444',
          icon: Flame,
          gradient: 'linear-gradient(135deg, rgba(239,68,68,0.15) 0%, rgba(248,113,113,0.05) 100%)',
          border: 'rgba(239,68,68,0.25)',
          textGlow: '0 0 10px rgba(239,68,68,0.4)',
          goalText: 'Maximizar el consumo de oxígeno (VO2máx) y consolidar el ritmo específico de carrera.',
          distribution: 'Volumen total ligeramente decreciente (-10%). Pasadas duras anaeróbicas y simulaciones ritmo meta.',
          focusPace: `Intervalos VO2máx (Z4-Z5): ${pacesDetails.intervalStr}`,
          coachingAdvice: 'La fase más intensa de la preparación. Respeta escrupulosamente los descansos de las pasadas. Entrena la mente para tolerar la fatiga del paso específico de carrera.'
        };
      case 'Taper':
        return {
          title: 'Fase de Descarga (Tapering)',
          color: '#f59e0b',
          icon: Feather,
          gradient: 'linear-gradient(135deg, rgba(245,158,11,0.15) 0%, rgba(251,191,36,0.05) 100%)',
          border: 'rgba(245,158,11,0.25)',
          textGlow: '0 0 10px rgba(245,158,11,0.4)',
          goalText: 'Disipar toda la fatiga acumulada, sobrecargar los depósitos de glucógeno y ganar frescura.',
          distribution: 'Volumen total reducido un 40-50% semanal. Mantener ritmo de carrera en tramos muy cortos.',
          focusPace: `Activación Corta: ${pacesDetails.easyStr}`,
          coachingAdvice: 'Menos kilómetros NO significa falta de forma física. Tu cuerpo está asimilando todo el macrociclo. Hidrata abundantemente y realiza rectas de activación muy cortas y relajadas.'
        };
      default:
        return {};
    }
  };

  const activePhaseDetails = getPhaseDetails(mesocycleConfig.phase);
  const PhaseIcon = activePhaseDetails.icon;

  // Evaluar advertencias dinámicas en base a la fase activa
  const checkSessionWarning = (dayPlan) => {
    if (!dayPlan) return null;
    const { sessionType: sType } = dayPlan;
    const activePhase = mesocycleConfig.phase;

    if (activePhase === 'Base') {
      if (sType === 'Intervalos') {
        return "Alerta: El entrenamiento anaeróbico (Intervalos) sobreestresa el sistema neuromuscular antes de desarrollar la base mitocondrial adecuada en Fase de Base.";
      }
      if (sType === 'Tempo') {
        return "Advertencia: Acumular ritmos de Umbral reduce la asimilación del volumen aeróbico puro si no se posee una base previa sólida.";
      }
    } else if (activePhase === 'Taper') {
      if (sType === 'Fondo' && Number(dayPlan.distance) > (weeklyGoal * 0.25)) {
        return "Cuidado: Fondos prolongados en descarga retrasan la disipación de fatiga. Limítalos a distancias de activación muy breves.";
      }
    }
    return null;
  };

  return (
    <div className="training-planner-container animate-fade-in" style={{ padding: '0 0.5rem' }}>
      
      {/* Cabecera Principal */}
      <div className="glass-card card-identity" style={{ padding: '1.25rem', marginBottom: '1.25rem', borderLeft: '4px solid var(--color-running)' }}>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginBottom: '0.5rem' }}>
          <Target className="text-running-glow" size={20} style={{ color: 'var(--color-running)' }} />
          <h3 className="card-title" style={{ margin: 0, fontSize: '1.1rem' }}>Planificador de Bloques y Mesociclos</h3>
        </div>
        <p className="card-subtitle" style={{ fontSize: '0.85rem', lineHeight: '1.4', margin: 0 }}>
          Organiza preparaciones completas de 12 a 16 semanas. Estructurar tu volumen en mesociclos progresivos maximiza tu supercompensación aeróbica reduciendo a cero el riesgo de fatiga crónica o lesiones.
        </p>
      </div>

      {/* 1. SECCIÓN: CONSOLA DE MACROCICLO (Configuración y Progreso) */}
      <div className="glass-card" style={{ padding: '1.25rem', marginBottom: '1.25rem', position: 'relative', overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.95rem', margin: 0 }}>
            <Calendar size={18} style={{ color: 'var(--color-primary)' }} />
            Periodización del Macrociclo
          </h3>
          
          <button 
            onClick={() => setIsConfigOpen(!isConfigOpen)}
            className="action-btn-secondary"
            style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
          >
            <Settings size={14} />
            {isConfigOpen ? 'Cerrar Ajustes' : 'Configurar Plan'}
          </button>
        </div>

        {/* Panel de Ajustes del Macrociclo (Desplegable) */}
        {isConfigOpen ? (
          <div className="animate-fade-in" style={{ padding: '1rem', background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '12px', marginBottom: '1rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
            <div>
              <label className="input-label" style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Nombre de la Carrera Objetivo</label>
              <input 
                type="text" 
                value={tempEventName} 
                onChange={(e) => setTempEventName(e.target.value)}
                placeholder="ej: Maratón de Buenos Aires"
                className="premium-input"
                style={{ width: '100%', padding: '0.4rem' }}
              />
            </div>
            <div>
              <label className="input-label" style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Distancia de Carrera (km)</label>
              <input 
                type="number" 
                step="0.1"
                value={tempEventDistance} 
                onChange={(e) => setTempEventDistance(Number(e.target.value))}
                className="premium-input"
                style={{ width: '100%', padding: '0.4rem' }}
              />
            </div>
            <div>
              <label className="input-label" style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Duración de Preparación (Semanas)</label>
              <select 
                value={tempWeeks} 
                onChange={(e) => setTempWeeks(Number(e.target.value))}
                className="premium-select"
                style={{ width: '100%', padding: '0.4rem' }}
              >
                <option value={8}>8 Semanas (Corto/Mantención)</option>
                <option value={12}>12 Semanas (Recomendado estándar)</option>
                <option value={16}>16 Semanas (Óptimo para Maratón)</option>
              </select>
            </div>
            <div>
              <label className="input-label" style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Fecha de Inicio de Plan</label>
              <input 
                type="date" 
                value={tempStartDate} 
                onChange={(e) => setTempStartDate(e.target.value)}
                className="premium-input"
                style={{ width: '100%', padding: '0.4rem' }}
              />
            </div>
            <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', marginTop: '0.25rem' }}>
              <button
                onClick={() => handleSaveMesocycleConfig({
                  ...mesocycleConfig,
                  weeks: tempWeeks,
                  eventName: tempEventName,
                  eventDistance: tempEventDistance,
                  startDate: tempStartDate
                })}
                className="action-btn-primary"
                style={{ padding: '0.45rem 1rem', fontSize: '0.75rem', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
              >
                <Save size={14} />
                Guardar Configuración
              </button>
            </div>
          </div>
        ) : null}

        {/* Dashboard de Progreso Real */}
        {mesocycleConfig.startDate ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)', padding: '0.85rem', borderRadius: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.8rem', color: '#fff', fontWeight: '600' }}>
                Preparación para <strong style={{ color: 'var(--color-primary)' }}>{mesocycleConfig.eventName}</strong> ({mesocycleConfig.eventDistance}k)
              </span>
              <span className="badge" style={{ background: 'rgba(139,92,246,0.15)', color: 'var(--color-primary)', fontSize: '0.7rem' }}>
                {computedWeekNum ? `Semana ${computedWeekNum} de ${mesocycleConfig.weeks}` : 'Fuera de rango de semanas'}
              </span>
            </div>

            {computedWeekNum && (
              <div>
                <div style={{ display: 'flex', justify: 'space-between', fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>
                  <span>Progreso del Plan: {Math.round((computedWeekNum / mesocycleConfig.weeks) * 100)}% completado</span>
                  <span style={{ fontStyle: 'italic' }}>
                    {computedWeekNum <= Math.floor(mesocycleConfig.weeks * 0.35) ? 'Fase Sugerida: Base' : 
                     computedWeekNum <= Math.floor(mesocycleConfig.weeks * 0.70) ? 'Fase Sugerida: Build' : 
                     computedWeekNum <= Math.floor(mesocycleConfig.weeks * 0.88) ? 'Fase Sugerida: Pico' : 'Fase Sugerida: Descarga'}
                  </span>
                </div>
                <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ 
                    width: `${(computedWeekNum / mesocycleConfig.weeks) * 100}%`, 
                    height: '100%', 
                    background: 'linear-gradient(90deg, var(--color-primary) 0%, var(--color-running) 100%)',
                    boxShadow: '0 0 10px rgba(139,92,246,0.3)',
                    transition: 'width 0.4s ease'
                  }} />
                </div>
              </div>
            )}
          </div>
        ) : (
          <div style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)', borderRadius: '10px', fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center' }}>
            Aún no has configurado la fecha de inicio del macrociclo. Haz clic en "Configurar Plan" para calendarizar tu carrera objetivo.
          </div>
        )}
      </div>

      {/* 2. SECCIÓN: SELECTOR DE FASES / MESOCICLOS */}
      <h4 style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', margin: '0 0 0.5rem 0.2rem' }}>Selector de Fases del Mesociclo</h4>
      <div 
        className="phase-selector-grid" 
        style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 150px), 1fr))', 
          gap: '0.75rem', 
          marginBottom: '1.25rem' 
        }}
      >
        {[
          { id: 'Base', label: 'Base', icon: Shield, col: '#818cf8', bgGlow: 'rgba(129,140,248,0.1)' },
          { id: 'Build', label: 'Construcción', icon: Dumbbell, col: '#34d399', bgGlow: 'rgba(52,211,153,0.1)' },
          { id: 'Peak', label: 'Pico (Peak)', icon: Flame, col: '#f87171', bgGlow: 'rgba(248,113,113,0.1)' },
          { id: 'Taper', label: 'Descarga', icon: Feather, col: '#fbbf24', bgGlow: 'rgba(251,191,36,0.1)' }
        ].map((item) => {
          const Icon = item.icon;
          const isSelected = mesocycleConfig.phase === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => handleSelectPhase(item.id)}
              className="glass-card active-card-hover"
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justify: 'center',
                padding: '0.85rem 0.5rem',
                border: `1px solid ${isSelected ? item.col : 'rgba(255,255,255,0.05)'}`,
                background: isSelected ? item.bgGlow : 'transparent',
                boxShadow: isSelected ? `0 0 15px ${item.bgGlow}` : 'none',
                cursor: 'pointer',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                borderRadius: '12px'
              }}
            >
              <Icon size={22} style={{ color: isSelected ? item.col : 'var(--text-muted)', marginBottom: '0.35rem' }} />
              <span style={{ fontSize: '0.8rem', fontWeight: isSelected ? '700' : '500', color: isSelected ? '#fff' : 'var(--text-muted)' }}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* 3. SECCIÓN: ASISTENTE FISIOLÓGICO ACTIVO */}
      {activePhaseDetails.title && (
        <div 
          className="glass-card animate-fade-in" 
          style={{ 
            padding: '1.25rem', 
            marginBottom: '1.25rem', 
            background: activePhaseDetails.gradient, 
            border: `1px solid ${activePhaseDetails.border}`,
            position: 'relative'
          }}
        >
          <div className="toast-glow" style={{ background: `radial-gradient(circle, ${activePhaseDetails.border} 0%, transparent 70%)`, position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'none', opacity: 0.3 }}></div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <PhaseIcon size={18} style={{ color: activePhaseDetails.color }} />
            <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: '700', color: '#fff', textShadow: activePhaseDetails.textGlow }}>
              Diagnóstico Fisiológico: {activePhaseDetails.title}
            </h4>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem', fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: '1.3' }}>
            <div>
              <span style={{ display: 'block', fontSize: '0.65rem', color: '#fff', fontWeight: '600', marginBottom: '0.15rem' }}>Objetivo Celular</span>
              {activePhaseDetails.goalText}
            </div>
            <div>
              <span style={{ display: 'block', fontSize: '0.65rem', color: '#fff', fontWeight: '600', marginBottom: '0.15rem' }}>Distribución de Carga</span>
              {activePhaseDetails.distribution}
            </div>
            <div>
              <span style={{ display: 'block', fontSize: '0.65rem', color: '#fff', fontWeight: '600', marginBottom: '0.15rem' }}>Velocidades Jack Daniels VDOT</span>
              <strong style={{ color: 'var(--color-running)', display: 'block', marginTop: '0.1rem' }}>{activePhaseDetails.focusPace}</strong>
            </div>
            <div style={{ gridColumn: '1 / -1', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '0.5rem', fontStyle: 'italic', fontSize: '0.7rem' }}>
              <span style={{ color: activePhaseDetails.color, fontWeight: '700', notStyle: 'normal' }}>Consejo Técnico: </span>
              {activePhaseDetails.coachingAdvice}
            </div>
          </div>
        </div>
      )}

      {/* Navegador de Semanas & Meta de Volumen */}
      <div className="grid-2col-layout" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))', gap: '1.25rem', marginBottom: '1.25rem' }}>
        
        {/* Selector de Fecha y Autogeneración */}
        <div className="glass-card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', justify: 'space-between', gap: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', margin: 0 }}>
              <Calendar size={16} style={{ color: 'var(--color-primary)' }} />
              Semana Actual
            </h3>
            
            {/* Botón premium de Autogeneración de Semana completa */}
            <button
              onClick={handleAutogenerateWeek}
              className="action-btn-primary animate-pulse-slow"
              style={{
                padding: '0.35rem 0.6rem',
                fontSize: '0.7rem',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                border: '1px solid rgba(255,255,255,0.1)'
              }}
              title={`Rellenar automáticamente los 7 días con la periodización de la Fase de ${mesocycleConfig.phase}`}
            >
              <Sparkles size={12} />
              Autogenerar Semana
            </button>
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.01)', padding: '0.5rem 0.75rem', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.03)' }}>
            <button onClick={handlePrevWeek} className="mobile-header-btn" style={{ padding: '0.35rem' }}><ChevronLeft size={16} /></button>
            <span style={{ fontSize: '0.8rem', fontWeight: '700', color: '#fff' }}>
              Lun {new Date(currentWeekStart + 'T00:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })} - Dom {new Date(new Date(currentWeekStart + 'T00:00:00').getTime() + 6 * 24 * 60 * 60 * 1000).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
            </span>
            <button onClick={handleNextWeek} className="mobile-header-btn" style={{ padding: '0.35rem' }}><ChevronRight size={16} /></button>
          </div>

          <div>
            <label className="input-label" style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.3' }}>Meta de Volumen Semanal (km)</label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input 
                type="number"
                value={weeklyGoal}
                onChange={(e) => handleSaveGoal(e.target.value)}
                className="premium-input"
                style={{ flex: 1, padding: '0.35rem 0.5rem', fontSize: '0.8rem' }}
              />
              <span className="badge" style={{ background: 'rgba(139,92,246,0.1)', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '60px', fontSize: '0.75rem' }}>km</span>
            </div>
          </div>
        </div>

        {/* Resumen Semanal de Progreso */}
        <div className="glass-card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', justify: 'center' }}>
          <h3 className="card-title" style={{ fontSize: '0.9rem', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <TrendingUp size={16} style={{ color: 'var(--color-running)' }} />
            Progreso de Carga Semanal
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            {/* Realizado vs Meta */}
            <div>
              <div style={{ display: 'flex', justify: 'space-between', fontSize: '0.75rem', marginBottom: '0.2rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Meta de Volumen:</span>
                <span><strong style={{ color: 'var(--color-running)' }}>{weekStats.totalActual} km</strong> / {weekStats.goal} km</span>
              </div>
              <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ 
                  width: `${weekStats.goalProgress}%`, 
                  height: '100%', 
                  background: 'var(--color-running)',
                  boxShadow: '0 0 10px rgba(16, 185, 129, 0.4)',
                  transition: 'width 0.4s ease'
                }} />
              </div>
            </div>

            {/* Realizado vs Planificado */}
            <div>
              <div style={{ display: 'flex', justify: 'space-between', fontSize: '0.75rem', marginBottom: '0.2rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Adherencia al Bloque:</span>
                <span><strong>{weekStats.totalActual} km</strong> / {weekStats.totalPlanned} km planificados</span>
              </div>
              <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ 
                  width: `${weekStats.totalPlanned > 0 ? Math.min(100, (weekStats.totalActual / weekStats.totalPlanned) * 100) : 0}%`, 
                  height: '100%', 
                  background: 'var(--color-primary)',
                  boxShadow: '0 0 10px rgba(139, 92, 246, 0.4)',
                  transition: 'width 0.4s ease'
                }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Días de la Semana */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
        {weekDays.map((day) => {
          const isEditing = editingDay === day.dateStr;
          const warning = checkSessionWarning(day.plan);
          
          return (
            <div 
              key={day.dateStr}
              className={`glass-card ${day.isToday ? 'planner-today-card' : ''}`}
              style={{ 
                padding: '0.85rem 1rem', 
                borderLeft: day.isToday ? '3px solid var(--color-running)' : '1px solid rgba(255,255,255,0.04)',
                background: day.isToday ? 'rgba(16, 185, 129, 0.02)' : 'transparent',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.4rem'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                
                {/* Nombre del Día */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ 
                    fontSize: '0.85rem', 
                    fontWeight: '700', 
                    color: day.isToday ? 'var(--color-running)' : '#fff',
                    minWidth: '65px'
                  }}>
                    {day.name}
                  </span>
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                    {new Date(day.dateStr + 'T00:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                  </span>
                  {day.isToday && (
                    <span className="badge" style={{ background: 'rgba(16, 185, 129, 0.15)', color: 'var(--color-running)', border: '1px solid rgba(16, 185, 129, 0.3)', fontSize: '0.55rem', padding: '0.05rem 0.3rem' }}>HOY</span>
                  )}
                </div>

                {/* Plan vs Real Info */}
                <div style={{ display: 'flex', gap: '0.85rem', alignItems: 'center', flexWrap: 'wrap' }}>
                  {/* Planificado */}
                  {day.plan ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', fontSize: '0.7rem' }}>
                      <span className="badge" style={{ 
                        background: day.plan.distance === 0 ? 'rgba(255,255,255,0.04)' : 'rgba(139,92,246,0.1)', 
                        color: day.plan.distance === 0 ? 'var(--text-muted)' : 'var(--color-primary)', 
                        fontSize: '0.65rem',
                        fontWeight: '700'
                      }}>
                        {day.plan.sessionType}: {day.plan.distance}k
                      </span>
                      {day.plan.note && <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontStyle: 'italic', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={day.plan.note}>"{day.plan.note}"</span>}
                    </div>
                  ) : (
                    <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>Sin plan</span>
                  )}

                  {/* Realizado */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.7rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Real:</span>
                    <strong style={{ color: day.actualDistance > 0 ? 'var(--color-running)' : 'var(--text-muted)' }}>
                      {day.actualDistance} km
                    </strong>
                    {day.hasActualGym && (
                      <span className="badge" style={{ background: 'rgba(59,130,246,0.1)', color: '#60a5fa', fontSize: '0.55rem', padding: '0.05rem 0.2' }}>Gimnasio</span>
                    )}
                  </div>

                  {/* Botón Acción Planificar */}
                  <button 
                    onClick={() => {
                      if (isEditing) {
                        setEditingDay(null);
                      } else {
                        setEditingDay(day.dateStr);
                        setPlannedDist(day.plan?.distance.toString() || '0');
                        setSessionType(day.plan?.sessionType || 'Regenerativo');
                        setPlannedNote(day.plan?.note || '');
                      }
                    }}
                    className="action-btn-secondary"
                    style={{ padding: '0.25rem 0.5rem', fontSize: '0.65rem', borderRadius: '6px' }}
                  >
                    {day.plan ? 'Editar' : 'Planificar'}
                  </button>
                </div>
              </div>

              {/* Advertencias de periodización en caso de error de carga */}
              {warning && (
                <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.12)', padding: '0.35rem 0.5rem', borderRadius: '6px', fontSize: '0.65rem', color: '#f87171' }}>
                  <AlertTriangle size={12} style={{ flexShrink: 0 }} />
                  <span>{warning}</span>
                </div>
              )}

              {/* Editor Inline */}
              {isEditing && (
                <div 
                  className="animate-fade-in"
                  style={{ 
                    marginTop: '0.5rem', 
                    paddingTop: '0.5rem', 
                    borderTop: '1px solid rgba(255,255,255,0.03)',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
                    gap: '0.5rem',
                    alignItems: 'end'
                  }}
                >
                  <div>
                    <label className="input-label" style={{ display: 'block', fontSize: '0.6rem', color: 'var(--text-muted)', marginBottom: '0.15rem' }}>Distancia (km)</label>
                    <input 
                      type="number" 
                      step="0.5" 
                      value={plannedDist} 
                      onChange={(e) => setPlannedDist(e.target.value)}
                      className="premium-input"
                      style={{ width: '100%', padding: '0.3rem', fontSize: '0.75rem' }}
                    />
                  </div>

                  <div>
                    <label className="input-label" style={{ display: 'block', fontSize: '0.6rem', color: 'var(--text-muted)', marginBottom: '0.15rem' }}>Tipo de Sesión</label>
                    <select 
                      value={sessionType} 
                      onChange={(e) => setSessionType(e.target.value)}
                      className="premium-select"
                      style={{ width: '100%', padding: '0.3rem', fontSize: '0.75rem' }}
                    >
                      <option value="Fondo">Fondo (Easy/Z2)</option>
                      <option value="Tempo">Tempo (Threshold/Z3)</option>
                      <option value="Intervalos">Intervalos (VO2max/Z4-Z5)</option>
                      <option value="Regenerativo">Regenerativo (Z1/Easy)</option>
                      <option value="Fuerza">Gimnasio / Fuerza</option>
                      <option value="Descanso">Descanso Activo/Total</option>
                    </select>
                  </div>

                  <div>
                    <label className="input-label" style={{ display: 'block', fontSize: '0.6rem', color: 'var(--text-muted)', marginBottom: '0.15rem' }}>Nota rápida</label>
                    <input 
                      type="text" 
                      value={plannedNote} 
                      onChange={(e) => setPlannedNote(e.target.value)}
                      placeholder="ej: Trote suave en ayunas"
                      className="premium-input"
                      style={{ width: '100%', padding: '0.3rem', fontSize: '0.75rem' }}
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '0.3rem', justifyContent: 'flex-end', gridColumn: '1 / -1', marginTop: '0.25rem' }}>
                    {day.plan && (
                      <button 
                        type="button" 
                        onClick={() => handleClearPlan(day.dateStr)}
                        className="action-btn-secondary"
                        style={{ padding: '0.35rem 0.5rem', fontSize: '0.65rem', borderRadius: '6px', color: '#f87171', border: '1px solid rgba(239,68,68,0.15)' }}
                      >
                        <Trash2 size={12} style={{ marginRight: '0.15rem', display: 'inline' }} />
                        Limpiar
                      </button>
                    )}
                    <button 
                      type="button" 
                      onClick={() => setEditingDay(null)}
                      className="action-btn-secondary"
                      style={{ padding: '0.35rem 0.5rem', fontSize: '0.65rem', borderRadius: '6px' }}
                    >
                      Cancelar
                    </button>
                    <button 
                      type="button" 
                      onClick={() => handleSavePlan(day.dateStr)}
                      className="action-btn-primary"
                      style={{ padding: '0.35rem 0.5rem', fontSize: '0.65rem', borderRadius: '6px' }}
                    >
                      Guardar
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
