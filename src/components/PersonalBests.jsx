import React, { useState, useMemo } from 'react';
import { Trophy, Calendar, Zap, Clock, Award, Medal, MapPin, Dumbbell, Search, Sparkles, Flame, Activity } from 'lucide-react';
import { 
  timeStringToSeconds, 
  secondsToTimeString, 
  formatPace, 
  getBestEffortFromSplits, 
  getGymSessionVolume, 
  getGymSessionMaxWeight, 
  getGlobalTop3Records,
  calculate1RM 
} from '../utils/calculators';

export default function PersonalBests({ workouts = [] }) {
  const [activeTab, setActiveTab] = useState('podiums'); // podiums, splits, strength
  const [searchQuery, setSearchQuery] = useState('');

  // 1. Podios globales (top-3 de todos los tiempos)
  const globalPodiums = useMemo(() => {
    return getGlobalTop3Records(workouts);
  }, [workouts]);

  // Helper para dar formato a ritmos de carrera
  const formatPaceFromSecs = (secsPerKm) => {
    if (!secsPerKm || isNaN(secsPerKm) || secsPerKm === Infinity) return '--:--';
    const mins = Math.floor(secsPerKm / 60);
    const secs = Math.round(secsPerKm % 60);
    return `${mins}:${String(secs).padStart(2, '0')} min/km`;
  };

  // 2. Récords estándar con Splits (Mejor 1K, 5K, 10K, 21K, 42K)
  const prs = useMemo(() => {
    const targets = [
      { id: '1k', label: 'Mejor 1K', distance: 1.0, icon: Medal, color: '#f59e0b', bgGlow: 'rgba(245, 158, 11, 0.15)' },
      { id: '5k', label: 'Mejor 5K', distance: 5.0, icon: Trophy, color: '#eab308', bgGlow: 'rgba(234, 179, 8, 0.15)' },
      { id: '10k', label: 'Mejor 10K', distance: 10.0, icon: Trophy, color: '#10b981', bgGlow: 'rgba(16, 185, 129, 0.15)' },
      { id: '21k', label: 'Medio Maratón (21.1k)', distance: 21.097, icon: Award, color: '#3b82f6', bgGlow: 'rgba(59, 130, 246, 0.15)' },
      { id: '42k', label: 'Maratón (42.2k)', distance: 42.195, icon: Award, color: '#a855f7', bgGlow: 'rgba(168, 85, 247, 0.15)' }
    ];

    const runs = workouts.filter(w => w.type === 'running' && w.distance > 0 && w.duration);

    return targets.map(target => {
      let bestEstimatedSeconds = Infinity;
      let matchingWorkout = null;
      let isFromSplits = false;

      runs.forEach(run => {
        const dist = Number(run.distance);
        const workoutSplits = run.splits || run.advanced_metrics?.splits;

        // A. Escanear parciales contiguos (splits)
        if (Array.isArray(workoutSplits) && workoutSplits.length > 0) {
          const splitTimeSecs = getBestEffortFromSplits(workoutSplits, target.distance);
          if (splitTimeSecs !== null && splitTimeSecs < bestEstimatedSeconds) {
            bestEstimatedSeconds = splitTimeSecs;
            matchingWorkout = {
              ...run,
              estimatedTime: splitTimeSecs,
              avgPace: splitTimeSecs / target.distance
            };
            isFromSplits = true;
          }
        }

        // B. Paso promedio global
        if (dist >= target.distance) {
          const totalSecs = timeStringToSeconds(run.duration);
          if (totalSecs > 0) {
            const avgPace = totalSecs / dist;
            const estimatedTime = target.distance * avgPace;

            if (estimatedTime < bestEstimatedSeconds) {
              bestEstimatedSeconds = estimatedTime;
              matchingWorkout = {
                ...run,
                estimatedTime,
                avgPace
              };
              isFromSplits = false;
            }
          }
        }
      });

      return {
        ...target,
        bestTime: bestEstimatedSeconds === Infinity ? null : secondsToTimeString(bestEstimatedSeconds),
        bestPace: bestEstimatedSeconds === Infinity ? null : formatPace(matchingWorkout.avgPace),
        workout: matchingWorkout,
        isFromSplits: bestEstimatedSeconds !== Infinity ? isFromSplits : false
      };
    });
  }, [workouts]);

  // 3. Récords individuales de gimnasio agrupados por ejercicio
  const gymExerciseBests = useMemo(() => {
    const bests = {};
    
    workouts.forEach(w => {
      if (w.type !== 'gym' || !Array.isArray(w.exercises)) return;
      
      w.exercises.forEach(ex => {
        const nameRaw = ex.name || ex.exerciseName || '';
        const nameNorm = nameRaw.trim().toLowerCase();
        if (!nameNorm) return;
        
        const displayName = nameRaw.trim();
        let maxWtThisSession = 0;
        let max1RMThisSession = 0;
        
        if (Array.isArray(ex.sets)) {
          ex.sets.forEach(s => {
            if (s.done === false) return;
            const wt = parseFloat(s.weight) || 0;
            const r = parseFloat(s.reps) || 0;
            if (wt > maxWtThisSession) maxWtThisSession = wt;
            
            const oneRM = calculate1RM(wt, r, s.rpe);
            if (oneRM > max1RMThisSession) max1RMThisSession = oneRM;
          });
        } else {
          const wt = parseFloat(ex.weight) || 0;
          const r = parseFloat(ex.reps) || 0;
          if (wt > maxWtThisSession) maxWtThisSession = wt;
          const oneRM = calculate1RM(wt, r, null);
          if (oneRM > max1RMThisSession) max1RMThisSession = oneRM;
        }
        
        if (!bests[nameNorm]) {
          bests[nameNorm] = {
            name: displayName,
            maxWeight: maxWtThisSession,
            max1RM: max1RMThisSession,
            date: w.date
          };
        } else {
          if (maxWtThisSession > bests[nameNorm].maxWeight) {
            bests[nameNorm].maxWeight = maxWtThisSession;
            bests[nameNorm].date = w.date;
          }
          if (max1RMThisSession > bests[nameNorm].max1RM) {
            bests[nameNorm].max1RM = max1RMThisSession;
          }
        }
      });
    });
    
    return Object.values(bests).sort((a, b) => b.maxWeight - a.maxWeight);
  }, [workouts]);

  // Filtrado de récords por ejercicio
  const filteredExercises = useMemo(() => {
    if (!searchQuery.trim()) return gymExerciseBests;
    const query = searchQuery.toLowerCase();
    return gymExerciseBests.filter(ex => ex.name.toLowerCase().includes(query));
  }, [gymExerciseBests, searchQuery]);

  // Estilo reactivo de los botones de pestañas
  const subTabStyle = (isActive) => ({
    display: 'flex',
    alignItems: 'center',
    gap: '0.45rem',
    padding: '0.65rem 1rem',
    border: 'none',
    borderRadius: '10px',
    background: isActive ? 'rgba(139,92,246,0.15)' : 'transparent',
    border: `1px solid ${isActive ? 'rgba(139,92,246,0.25)' : 'transparent'}`,
    color: isActive ? '#fff' : 'var(--text-muted)',
    cursor: 'pointer',
    fontSize: '0.8rem',
    fontWeight: isActive ? '700' : '500',
    transition: 'all 0.2s ease',
    flexShrink: 0
  });

  const getRankMedal = (rank) => {
    if (rank === 1) return { icon: '🥇', class: 'medal-gold', label: '1º Lugar' };
    if (rank === 2) return { icon: '🥈', class: 'medal-silver', label: '2º Lugar' };
    if (rank === 3) return { icon: '🥉', class: 'medal-bronze', label: '3º Lugar' };
    return null;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('es-ES', { 
      day: 'numeric', 
      month: 'short', 
      year: 'numeric' 
    });
  };

  return (
    <div className="personal-bests-container animate-fade-in" style={{ padding: '0 0.5rem' }}>
      
      {/* Cabecera Glassmorphic */}
      <div className="glass-card card-identity" style={{ padding: '1.25rem', marginBottom: '1.5rem', borderLeft: '4px solid var(--color-primary)' }}>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginBottom: '0.5rem' }}>
          <Trophy className="text-primary-glow" size={20} style={{ color: 'var(--color-primary)' }} />
          <h3 className="card-title" style={{ margin: 0, fontSize: '1.1rem' }}>Salón de la Fama y Récords Personales</h3>
        </div>
        <p className="card-subtitle" style={{ fontSize: '0.85rem', lineHeight: '1.4', margin: 0 }}>
          Explora tus máximos logros históricos. Analizamos tus entrenamientos, parciales (splits) de carrera y cargas máximas para construir tu perfil de rendimiento de élite.
        </p>
      </div>

      {/* Menú de Sub-Pestañas */}
      <div 
        className="performance-subtabs-nav glass-card" 
        style={{ 
          display: 'flex', 
          overflowX: 'auto', 
          whiteSpace: 'nowrap',
          padding: '0.35rem', 
          borderRadius: '14px', 
          gap: '0.25rem',
          marginBottom: '1.5rem',
          scrollbarWidth: 'none',
          WebkitOverflowScrolling: 'touch'
        }}
      >
        <button
          onClick={() => setActiveTab('podiums')}
          style={subTabStyle(activeTab === 'podiums')}
        >
          <Trophy size={15} style={{ color: activeTab === 'podiums' ? 'var(--color-primary)' : 'var(--text-muted)' }} />
          Cuadro de Honor (Podios)
        </button>
        <button
          onClick={() => setActiveTab('splits')}
          style={subTabStyle(activeTab === 'splits')}
        >
          <Award size={15} style={{ color: activeTab === 'splits' ? 'var(--color-primary)' : 'var(--text-muted)' }} />
          Carrera (Splits)
        </button>
        <button
          onClick={() => setActiveTab('strength')}
          style={subTabStyle(activeTab === 'strength')}
        >
          <Dumbbell size={15} style={{ color: activeTab === 'strength' ? 'var(--color-primary)' : 'var(--text-muted)' }} />
          Fuerza por Ejercicio
        </button>
      </div>

      {/* CONTENIDO DE PESTAÑAS */}
      
      {/* 1. PESTAÑA: CUADRO DE HONOR (PODIOS) */}
      {activeTab === 'podiums' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
          
          {/* A. DISTANCIA MÁXIMA */}
          <div className="glass-card" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.5rem' }}>
              <Activity size={18} style={{ color: 'var(--color-running)' }} />
              <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: '800' }}>Distancia Máxima (Running)</h4>
            </div>
            {globalPodiums.distance.length === 0 ? (
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic', margin: 0 }}>Sin registros de carrera aún.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {globalPodiums.distance.map((w, idx) => {
                  const medal = getRankMedal(idx + 1);
                  return (
                    <div key={w.id} className="podium-item" style={{ display: 'flex', alignItems: 'center', justify: 'space-between', gap: '0.5rem', padding: '0.5rem', borderRadius: '8px', background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontSize: '1.2rem' }}>{medal.icon}</span>
                        <div>
                          <span style={{ fontSize: '0.85rem', fontWeight: '700', display: 'block' }}>{Number(w.distance).toFixed(2)} km</span>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{formatDate(w.date)}</span>
                        </div>
                      </div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>{w.duration}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* B. MEJOR RITMO */}
          <div className="glass-card" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.5rem' }}>
              <Zap size={18} style={{ color: 'var(--color-running)' }} />
              <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: '800' }}>Mejor Ritmo (Running)</h4>
            </div>
            {globalPodiums.pace.length === 0 ? (
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic', margin: 0 }}>Sin registros de carrera aún.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {globalPodiums.pace.map((w, idx) => {
                  const medal = getRankMedal(idx + 1);
                  return (
                    <div key={w.id} className="podium-item" style={{ display: 'flex', alignItems: 'center', justify: 'space-between', gap: '0.5rem', padding: '0.5rem', borderRadius: '8px', background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontSize: '1.2rem' }}>{medal.icon}</span>
                        <div>
                          <span style={{ fontSize: '0.85rem', fontWeight: '700', display: 'block' }}>{formatPaceFromSecs(w.pace)}</span>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{formatDate(w.date)}</span>
                        </div>
                      </div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>({Number(w.distance).toFixed(1)}k)</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* C. VOLUMEN MÁXIMO DE SESIÓN */}
          <div className="glass-card" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.5rem' }}>
              <Dumbbell size={18} style={{ color: 'var(--color-gym)' }} />
              <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: '800' }}>Volumen de Sesión (Gym)</h4>
            </div>
            {globalPodiums.volume.length === 0 ? (
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic', margin: 0 }}>Sin registros de fuerza aún.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {globalPodiums.volume.map((w, idx) => {
                  const medal = getRankMedal(idx + 1);
                  return (
                    <div key={w.id} className="podium-item" style={{ display: 'flex', alignItems: 'center', justify: 'space-between', gap: '0.5rem', padding: '0.5rem', borderRadius: '8px', background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontSize: '1.2rem' }}>{medal.icon}</span>
                        <div>
                          <span style={{ fontSize: '0.85rem', fontWeight: '700', display: 'block' }}>{w.vol.toLocaleString('es-ES')} kg</span>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{formatDate(w.date)}</span>
                        </div>
                      </div>
                      <span style={{ fontSize: '0.72rem', color: 'var(--color-gym)', fontWeight: '700' }}>{w.muscleGroup || 'Full Body'}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* D. LEVANTAMIENTO MÁXIMO */}
          <div className="glass-card" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.5rem' }}>
              <Flame size={18} style={{ color: 'var(--color-gym)' }} />
              <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: '800' }}>Levantamiento Máximo</h4>
            </div>
            {globalPodiums.weight.length === 0 ? (
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic', margin: 0 }}>Sin registros de fuerza aún.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {globalPodiums.weight.map((w, idx) => {
                  const medal = getRankMedal(idx + 1);
                  return (
                    <div key={w.id} className="podium-item" style={{ display: 'flex', alignItems: 'center', justify: 'space-between', gap: '0.5rem', padding: '0.5rem', borderRadius: '8px', background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontSize: '1.2rem' }}>{medal.icon}</span>
                        <div>
                          <span style={{ fontSize: '0.85rem', fontWeight: '700', display: 'block' }}>{w.maxWt} kg</span>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{formatDate(w.date)}</span>
                        </div>
                      </div>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>Carga Pico</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      )}

      {/* 2. PESTAÑA: RÉCORDS DE DISTANCIA CON SPLITS */}
      {activeTab === 'splits' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {prs.map((pr) => {
            const Icon = pr.icon;
            const hasPR = pr.bestTime !== null;
            
            return (
              <div 
                key={pr.id} 
                className={`glass-card ${hasPR ? 'pr-unlocked' : 'pr-locked'}`}
                style={{ 
                  padding: '1.25rem', 
                  position: 'relative', 
                  overflow: 'hidden',
                  border: hasPR ? `1px solid ${pr.color}35` : '1px solid rgba(255,255,255,0.05)',
                  boxShadow: hasPR ? `0 8px 32px 0 rgba(0, 0, 0, 0.3), 0 0 15px ${pr.color}10` : 'none'
                }}
              >
                {/* Brillo de fondo */}
                {hasPR && (
                  <div 
                    style={{ 
                      position: 'absolute', 
                      top: '-20px', 
                      right: '-20px', 
                      width: '120px', 
                      height: '120px', 
                      borderRadius: '50%', 
                      background: pr.bgGlow,
                      filter: 'blur(30px)',
                      zIndex: 0,
                      pointerEvents: 'none'
                    }}
                  />
                )}

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', position: 'relative', zIndex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div 
                      style={{ 
                        width: '48px', 
                        height: '48px', 
                        borderRadius: '12px', 
                        background: hasPR ? `${pr.color}15` : 'rgba(255,255,255,0.02)', 
                        border: `1px solid ${hasPR ? pr.color + '50' : 'rgba(255,255,255,0.1)'}`, 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        color: hasPR ? pr.color : 'var(--text-muted)',
                        flexShrink: 0
                      }}
                    >
                      <Icon size={24} style={{ margin: 'auto' }} className={hasPR ? "animate-pulse" : ""} />
                    </div>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: '700', color: hasPR ? '#fff' : 'var(--text-muted)' }}>
                        {pr.label}
                      </h4>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {hasPR ? `Logrado el ${formatDate(pr.workout.date)}` : 'Pendiente de registrar'}
                      </span>
                    </div>
                  </div>

                  {hasPR ? (
                    <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                      <span style={{ fontSize: '1.4rem', fontWeight: '800', color: pr.color, fontFamily: 'monospace' }}>
                        {pr.bestTime}
                      </span>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.25rem' }}>
                        <Zap size={10} style={{ color: 'var(--color-running)' }} />
                        Paso: {pr.bestPace}
                      </span>
                    </div>
                  ) : (
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                        Corre {pr.distance}k+ para desbloquear
                      </span>
                    </div>
                  )}
                </div>

                {hasPR && (
                  <div 
                    style={{ 
                      marginTop: '0.85rem', 
                      paddingTop: '0.75rem', 
                      borderTop: '1px solid rgba(255,255,255,0.03)', 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center', 
                      fontSize: '0.7rem', 
                      color: 'var(--text-muted)',
                      position: 'relative',
                      zIndex: 1
                    }}
                  >
                    {pr.isFromSplits ? (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#38bdf8', fontWeight: '700', textShadow: '0 0 8px rgba(56,189,248,0.3)' }}>
                        <Zap size={12} className="animate-pulse" style={{ color: '#38bdf8' }} />
                        ⚡ Parcial óptimo: {pr.distance} km en {pr.bestTime} (de corrida de {pr.workout.distance} km)
                      </span>
                    ) : (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <MapPin size={12} style={{ color: 'var(--color-running)' }} />
                        Actividad de origen: {pr.workout.distance} km en {pr.workout.duration}
                      </span>
                    )}
                    {pr.workout.notes && (
                      <span style={{ maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontStyle: 'italic' }} title={pr.workout.notes}>
                        "{pr.workout.notes}"
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* 3. PESTAÑA: FUERZA POR EJERCICIO */}
      {activeTab === 'strength' && (
        <div className="glass-card" style={{ padding: '1.25rem' }}>
          
          {/* Buscador */}
          <div style={{ position: 'relative', marginBottom: '1.25rem' }}>
            <Search size={16} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Buscar ejercicio por nombre... (ej: Banca, Sentadilla)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '0.65rem 1rem 0.65rem 2.25rem',
                borderRadius: '10px',
                border: '1px solid rgba(255,255,255,0.08)',
                background: 'rgba(255,255,255,0.02)',
                color: '#fff',
                fontSize: '0.85rem',
                outline: 'none',
                transition: 'all 0.2s ease',
                boxSizing: 'border-box'
              }}
              className="gym-search-input"
            />
          </div>

          {filteredExercises.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-muted)' }}>
              <Dumbbell size={32} style={{ opacity: 0.2, marginBottom: '0.5rem', display: 'block', marginLeft: 'auto', marginRight: 'auto' }} />
              <p style={{ fontSize: '0.85rem', margin: 0, fontStyle: 'italic' }}>
                {gymExerciseBests.length === 0 
                  ? 'No hay registros de fuerza cargados aún.' 
                  : 'No se encontraron ejercicios coincidentes.'}
              </p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    <th style={{ padding: '0.75rem 0.5rem' }}>Ejercicio</th>
                    <th style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>Peso Máximo</th>
                    <th style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>1RM Estimado</th>
                    <th style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>Fecha del Logro</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredExercises.map((ex, idx) => (
                    <tr 
                      key={idx} 
                      style={{ 
                        borderBottom: '1px solid rgba(255,255,255,0.03)', 
                        transition: 'background 0.15s ease' 
                      }}
                      className="exercise-row-hover"
                    >
                      <td style={{ padding: '0.85rem 0.5rem', fontWeight: '700', color: '#fff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '24px', height: '24px', borderRadius: '6px', background: 'rgba(236,72,153,0.1)', color: 'var(--color-gym)', border: '1px solid rgba(236,72,153,0.15)' }}>
                          <Dumbbell size={12} />
                        </span>
                        {ex.name}
                      </td>
                      <td style={{ padding: '0.85rem 0.5rem', textAlign: 'right', fontWeight: '800', color: 'var(--color-gym)', fontFamily: 'monospace' }}>
                        {ex.maxWeight} <span style={{ fontSize: '0.7rem', fontWeight: '500', color: 'var(--text-muted)' }}>kg</span>
                      </td>
                      <td style={{ padding: '0.85rem 0.5rem', textAlign: 'right', fontWeight: '800', color: '#a855f7', fontFamily: 'monospace' }}>
                        {ex.max1RM > 0 ? `${ex.max1RM}` : '--'}{' '}
                        {ex.max1RM > 0 && <span style={{ fontSize: '0.7rem', fontWeight: '500', color: 'var(--text-muted)' }}>kg</span>}
                      </td>
                      <td style={{ padding: '0.85rem 0.5rem', textAlign: 'right', color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                        {formatDate(ex.date)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ESTILOS PREMIUM LOCALES */}
      <style>{`
        .exercise-row-hover:hover {
          background: rgba(255, 255, 255, 0.02);
        }
        .gym-search-input:focus {
          border-color: rgba(139, 92, 246, 0.4) !important;
          box-shadow: 0 0 10px rgba(139, 92, 246, 0.15);
          background: rgba(255,255,255,0.04) !important;
        }
        .podium-item {
          transition: all 0.2s ease;
        }
        .podium-item:hover {
          transform: translateX(3px);
          background: rgba(255, 255, 255, 0.02) !important;
          border-color: rgba(255, 255, 255, 0.05) !important;
        }
      `}</style>
    </div>
  );
}
