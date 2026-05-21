import React, { useState, useMemo } from 'react';
import { Calendar, ChevronLeft, ChevronRight, Zap, Target, TrendingUp, Info, CheckCircle2, Circle } from 'lucide-react';

export default function TrainingPlanner({ workouts = [], onUpdatePlans, plans = [] }) {
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

  // Editor states
  const [editingDay, setEditingDay] = useState(null); // date string
  const [plannedDist, setPlannedDist] = useState('0');
  const [sessionType, setSessionType] = useState('Regenerativo'); // Fondo, Tempo, Intervalos, Regenerativo, Fuerza, Descanso
  const [plannedNote, setPlannedNote] = useState('');

  // Cambiar meta de volumen
  const handleSaveGoal = (val) => {
    setWeeklyGoal(val);
    localStorage.setItem('fitanalytics_weekly_km_goal', val);
  };

  // Obtener los 7 días de la semana actual
  const weekDays = useMemo(() => {
    const start = new Date(currentWeekStart + 'T00:00:00');
    const days = [];
    const dayNames = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
    
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const dStr = d.toISOString().split('T')[0];
      
      // Buscar planes existentes
      const dayPlan = plans.find(p => p.date === dStr);
      
      // Buscar entrenamientos reales en esa fecha
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

  return (
    <div className="training-planner-container animate-fade-in" style={{ padding: '0 0.5rem' }}>
      {/* Cabecera */}
      <div className="glass-card card-identity" style={{ padding: '1.25rem', marginBottom: '1.5rem', borderLeft: '4px solid var(--color-running)' }}>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginBottom: '0.5rem' }}>
          <Target className="text-running-glow" size={20} style={{ color: 'var(--color-running)' }} />
          <h3 className="card-title" style={{ margin: 0, fontSize: '1.1rem' }}>Planificador Semanal de Carga</h3>
        </div>
        <p className="card-subtitle" style={{ fontSize: '0.85rem', lineHeight: '1.4', margin: 0 }}>
          Organiza tus distancias semanales. Planificar tus fondos y sesiones regenerativas con anticipación te ayuda a sostener una progresión del volumen de kilómetros libre de sobrecargas musculares.
        </p>
      </div>

      {/* Navegador de Semanas & Meta de Volumen */}
      <div className="grid-2col-layout" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
        {/* Selector de Fecha */}
        <div className="glass-card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '1rem' }}>
          <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.95rem', margin: 0 }}>
            <Calendar size={18} style={{ color: 'var(--color-primary)' }} />
            Semana de Entrenamiento
          </h3>
          
          <div style={{ display: 'flex', justify: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '0.5rem 0.75rem', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.05)' }}>
            <button onClick={handlePrevWeek} className="mobile-header-btn" style={{ padding: '0.35rem' }}><ChevronLeft size={18} /></button>
            <span style={{ fontSize: '0.85rem', fontWeight: '700', color: '#fff' }}>
              Lun {new Date(currentWeekStart + 'T00:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })} - Dom {new Date(new Date(currentWeekStart + 'T00:00:00').getTime() + 6 * 24 * 60 * 60 * 1000).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
            </span>
            <button onClick={handleNextWeek} className="mobile-header-btn" style={{ padding: '0.35rem' }}><ChevronRight size={18} /></button>
          </div>

          <div>
            <label className="input-label" style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>Meta de Volumen Semanal (km)</label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input 
                type="number"
                value={weeklyGoal}
                onChange={(e) => handleSaveGoal(e.target.value)}
                className="premium-input"
                style={{ flex: 1 }}
              />
              <span className="badge" style={{ background: 'rgba(139,92,246,0.1)', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '60px' }}>km</span>
            </div>
          </div>
        </div>

        {/* Resumen Semanal Circular o Barras */}
        <div className="glass-card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', justify: 'center' }}>
          <h3 className="card-title" style={{ fontSize: '0.95rem', marginBottom: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <TrendingUp size={16} style={{ color: 'var(--color-running)' }} />
            Progreso Semanal Realizado
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {/* Realizado vs Meta */}
            <div>
              <div style={{ display: 'flex', justify: 'space-between', fontSize: '0.8rem', marginBottom: '0.25rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Meta de Volumen:</span>
                <span><strong style={{ color: 'var(--color-running)' }}>{weekStats.totalActual} km</strong> / {weekStats.goal} km</span>
              </div>
              <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
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
              <div style={{ display: 'flex', justify: 'space-between', fontSize: '0.8rem', marginBottom: '0.25rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Adherencia al Plan:</span>
                <span><strong>{weekStats.totalActual} km</strong> / {weekStats.totalPlanned} km planificados</span>
              </div>
              <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
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
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {weekDays.map((day) => {
          const isEditing = editingDay === day.dateStr;
          
          return (
            <div 
              key={day.dateStr}
              className={`glass-card ${day.isToday ? 'planner-today-card' : ''}`}
              style={{ 
                padding: '1rem', 
                borderLeft: day.isToday ? '3px solid var(--color-running)' : '1px solid rgba(255,255,255,0.05)',
                background: day.isToday ? 'rgba(16, 185, 129, 0.02)' : 'transparent'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                {/* Nombre del Día */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={{ 
                    fontSize: '0.9rem', 
                    fontWeight: '700', 
                    color: day.isToday ? 'var(--color-running)' : '#fff',
                    minWidth: '70px'
                  }}>
                    {day.name}
                  </span>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    {new Date(day.dateStr + 'T00:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                  </span>
                  {day.isToday && (
                    <span className="badge" style={{ background: 'rgba(16, 185, 129, 0.15)', color: 'var(--color-running)', border: '1px solid rgba(16, 185, 129, 0.3)', fontSize: '0.6rem', padding: '0.1rem 0.35rem' }}>HOY</span>
                  )}
                </div>

                {/* Plan vs Real Info */}
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                  {/* Planificado */}
                  {day.plan ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', fontSize: '0.75rem' }}>
                      <span className="badge" style={{ 
                        background: day.plan.distance === 0 ? 'rgba(255,255,255,0.05)' : 'rgba(139,92,246,0.1)', 
                        color: day.plan.distance === 0 ? 'var(--text-muted)' : 'var(--color-primary)', 
                        fontSize: '0.65rem'
                      }}>
                        {day.plan.sessionType}: {day.plan.distance}k
                      </span>
                      {day.plan.note && <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontStyle: 'italic', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={day.plan.note}>"{day.plan.note}"</span>}
                    </div>
                  ) : (
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>Sin plan</span>
                  )}

                  {/* Realizado */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Real:</span>
                    <strong style={{ color: day.actualDistance > 0 ? 'var(--color-running)' : 'var(--text-muted)' }}>
                      {day.actualDistance} km
                    </strong>
                    {day.hasActualGym && (
                      <span className="badge" style={{ background: 'rgba(59,130,246,0.1)', color: '#60a5fa', fontSize: '0.6rem', padding: '0.05rem 0.25rem' }}>Gimnasio</span>
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
                    style={{ padding: '0.3rem 0.6rem', fontSize: '0.7rem', borderRadius: '6px' }}
                  >
                    {day.plan ? 'Editar Plan' : 'Planificar'}
                  </button>
                </div>
              </div>

              {/* Editor Inline */}
              {isEditing && (
                <div 
                  className="animate-fade-in"
                  style={{ 
                    marginTop: '0.75rem', 
                    paddingTop: '0.75rem', 
                    borderTop: '1px solid rgba(255,255,255,0.03)',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                    gap: '0.75rem',
                    alignItems: 'end'
                  }}
                >
                  <div>
                    <label className="input-label" style={{ display: 'block', fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>Distancia Planificada (km)</label>
                    <input 
                      type="number" 
                      step="0.5" 
                      value={plannedDist} 
                      onChange={(e) => setPlannedDist(e.target.value)}
                      className="premium-input"
                      style={{ width: '100%', padding: '0.35rem' }}
                    />
                  </div>

                  <div>
                    <label className="input-label" style={{ display: 'block', fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>Tipo de Sesión</label>
                    <select 
                      value={sessionType} 
                      onChange={(e) => setSessionType(e.target.value)}
                      className="premium-select"
                      style={{ width: '100%', padding: '0.35rem' }}
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
                    <label className="input-label" style={{ display: 'block', fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>Nota rápida</label>
                    <input 
                      type="text" 
                      value={plannedNote} 
                      onChange={(e) => setPlannedNote(e.target.value)}
                      placeholder="ej: En ayunas, trote llano"
                      className="premium-input"
                      style={{ width: '100%', padding: '0.35rem' }}
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '0.35rem', justifyContent: 'flex-end' }}>
                    {day.plan && (
                      <button 
                        type="button" 
                        onClick={() => handleClearPlan(day.dateStr)}
                        className="action-btn-secondary"
                        style={{ padding: '0.4rem 0.6rem', fontSize: '0.7rem', borderRadius: '6px', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)' }}
                      >
                        Limpiar
                      </button>
                    )}
                    <button 
                      type="button" 
                      onClick={() => setEditingDay(null)}
                      className="action-btn-secondary"
                      style={{ padding: '0.4rem 0.6rem', fontSize: '0.7rem', borderRadius: '6px' }}
                    >
                      Cancelar
                    </button>
                    <button 
                      type="button" 
                      onClick={() => handleSavePlan(day.dateStr)}
                      className="action-btn-primary"
                      style={{ padding: '0.4rem 0.6rem', fontSize: '0.7rem', borderRadius: '6px' }}
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
