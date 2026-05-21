import React, { useMemo } from 'react';
import { Trophy, Calendar, Zap, Clock, Award, Medal, MapPin } from 'lucide-react';
import { timeStringToSeconds, secondsToTimeString, formatPace } from '../utils/calculators';

export default function PersonalBests({ workouts = [] }) {
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

      runs.forEach(run => {
        const dist = Number(run.distance);
        if (dist >= target.distance) {
          const totalSecs = timeStringToSeconds(run.duration);
          if (totalSecs > 0) {
            const avgPace = totalSecs / dist; // segundos por km
            const estimatedTime = target.distance * avgPace;

            if (estimatedTime < bestEstimatedSeconds) {
              bestEstimatedSeconds = estimatedTime;
              matchingWorkout = {
                ...run,
                estimatedTime,
                avgPace
              };
            }
          }
        }
      });

      return {
        ...target,
        bestTime: bestEstimatedSeconds === Infinity ? null : secondsToTimeString(bestEstimatedSeconds),
        bestPace: bestEstimatedSeconds === Infinity ? null : formatPace(matchingWorkout.avgPace),
        workout: matchingWorkout
      };
    });
  }, [workouts]);

  return (
    <div className="personal-bests-container animate-fade-in" style={{ padding: '0 0.5rem' }}>
      <div className="glass-card card-identity" style={{ padding: '1.25rem', marginBottom: '1.5rem', borderLeft: '4px solid var(--color-running)' }}>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginBottom: '0.5rem' }}>
          <Trophy className="text-running-glow" size={20} style={{ color: 'var(--color-running)' }} />
          <h3 className="card-title" style={{ margin: 0, fontSize: '1.1rem' }}>Cuadro de Honor y Récords Personales</h3>
        </div>
        <p className="card-subtitle" style={{ fontSize: '0.85rem', lineHeight: '1.4', margin: 0 }}>
          Este panel escanea automáticamente todo tu historial de carreras para detectar tus mejores marcas estimadas. ¡Esfuérzate al máximo en tus entrenamientos para desbloquear nuevas marcas!
        </p>
      </div>

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
              {/* Background Glow */}
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
                {/* Left: Medal and Title */}
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
                      justify: 'center',
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
                      {hasPR ? `Logrado el ${new Date(pr.workout.date + 'T00:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}` : 'Pendiente de registrar'}
                    </span>
                  </div>
                </div>

                {/* Right: Best Time */}
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

              {/* Bottom detail for unlocked PRs */}
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
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <MapPin size={12} style={{ color: 'var(--color-running)' }} />
                    Actividad de origen: {pr.workout.distance} km en {pr.workout.duration}
                  </span>
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
    </div>
  );
}
