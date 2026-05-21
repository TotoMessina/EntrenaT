import React, { useState, useMemo } from 'react';
import { Target, Activity, Flame, Clock, Award, Info, Sparkles, TrendingUp } from 'lucide-react';
import { timeStringToSeconds, secondsToTimeString, formatPace } from '../utils/calculators';

export default function IntervalBuilder({ workouts = [] }) {
  // Buscar todas las corridas con pasadas/splits
  const workoutsWithSplits = useMemo(() => {
    return workouts
      .filter(w => w.type === 'running' && Array.isArray(w.advanced_metrics?.splits) && w.advanced_metrics.splits.length > 0)
      .sort((a, b) => new Date(b.date + 'T00:00:00') - new Date(a.date + 'T00:00:00'));
  }, [workouts]);

  const [selectedWorkoutId, setSelectedWorkoutId] = useState(() => {
    return workoutsWithSplits.length > 0 ? workoutsWithSplits[0].id : '';
  });

  const activeWorkout = useMemo(() => {
    return workoutsWithSplits.find(w => w.id === selectedWorkoutId) || null;
  }, [workoutsWithSplits, selectedWorkoutId]);

  // Estadísticas del entrenamiento de pasadas seleccionado
  const splitStats = useMemo(() => {
    if (!activeWorkout) return null;
    const splits = activeWorkout.advanced_metrics.splits;
    
    const hasIntervals = splits.some(s => s.type === 'interval');
    let totalSeconds = 0;
    let totalDistance = 0;
    let fastestSeconds = Infinity;
    let slowestSeconds = 0;
    let intervalSecondsSum = 0;
    let intervalCount = 0;
    
    const parsedSplits = splits.map((s, idx) => {
      const secs = timeStringToSeconds(s.time);
      totalDistance += Number(s.distance || 0);
      
      const isIntervalTarget = !hasIntervals || s.type === 'interval';
      if (isIntervalTarget) {
        intervalSecondsSum += secs;
        intervalCount++;
        if (secs < fastestSeconds) fastestSeconds = secs;
        if (secs > slowestSeconds) slowestSeconds = secs;
      }
      
      return {
        splitNumber: s.splitNumber || (idx + 1),
        distance: Number(s.distance || 0),
        timeStr: s.time,
        seconds: secs,
        type: s.type,
        repNumber: s.repNumber
      };
    });

    const avgSeconds = intervalCount > 0 ? intervalSecondsSum / intervalCount : 0;

    // Calcular desviación estándar para medir consistencia
    let varianceSum = 0;
    parsedSplits.forEach(s => {
      const isIntervalTarget = !hasIntervals || s.type === 'interval';
      if (isIntervalTarget) {
        varianceSum += Math.pow(s.seconds - avgSeconds, 2);
      }
    });
    const variance = intervalCount > 0 ? varianceSum / intervalCount : 0;
    const stdDev = Math.sqrt(variance);
    
    // Score de consistencia (100 - Coeficiente de Variación %)
    // Coeficiente de variación = (Desviación estándar / Media) * 100
    const cv = avgSeconds > 0 ? (stdDev / avgSeconds) * 100 : 0;
    const consistencyScore = Math.max(0, Math.min(100, Math.round(100 - cv)));

    // Recomendación táctica
    let advice = "";
    if (consistencyScore >= 96) {
      advice = "¡Consistencia de nivel Elite! Dosificaste la energía con precisión de reloj suizo. Mantener los splits estables recluta fibras aeróbicas eficientemente y reduce la fatiga metabólica temprana.";
    } else if (consistencyScore >= 90) {
      advice = "¡Excelente ritmo homogéneo! Muy buena dosificación. La ligera variación de segundos es natural. Mantén esta estrategia de paso uniforme en tus próximas carreras de umbral.";
    } else if (consistencyScore >= 80) {
      advice = "Consistencia moderada. Empezaste a decaer un poco sobre las series finales o tuviste variaciones notables. Trabaja en regular el esfuerzo de la primera mitad para no acumular deuda de oxígeno.";
    } else {
      advice = "Consistencia baja (Efecto Quemado). Tu paso osciló demasiado. Típicamente indica que iniciaste las primeras series a un ritmo muy superior al real, acumulando ácido láctico prematuro. En tu próximo entrenamiento, corre la primera pasada un 5% más lento del objetivo.";
    }

    return {
      parsedSplits,
      numSplits: intervalCount,
      totalSeconds: intervalSecondsSum,
      totalDistance: Math.round((totalDistance / 1000) * 100) / 100,
      avgSeconds,
      fastestSeconds,
      slowestSeconds,
      consistencyScore,
      advice,
      hasIntervals
    };
  }, [activeWorkout]);

  return (
    <div className="interval-builder-container animate-fade-in" style={{ padding: '0 0.5rem' }}>
      {/* Cabecera */}
      <div className="glass-card card-identity" style={{ padding: '1.25rem', marginBottom: '1.5rem', borderLeft: '4px solid var(--color-running)' }}>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginBottom: '0.5rem' }}>
          <Target className="text-running-glow" size={20} style={{ color: 'var(--color-running)' }} />
          <h3 className="card-title" style={{ margin: 0, fontSize: '1.1rem' }}>Analizador de Pasadas y Consistencia</h3>
        </div>
        <p className="card-subtitle" style={{ fontSize: '0.85rem', lineHeight: '1.4', margin: 0 }}>
          Registra tus series de velocidad en el historial y analízalas aquí. El ritmo estable y controlado es la clave para expandir tu potencia aeróbica máxima (VO2 máx) sin desgastar tus reservas de glucógeno tempranamente.
        </p>
      </div>

      {workoutsWithSplits.length === 0 ? (
        <div className="glass-card" style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          <Info size={32} style={{ color: 'var(--text-muted)', margin: '0 auto 0.75rem auto', display: 'block', opacity: 0.5 }} />
          <p style={{ margin: 0, fontSize: 0.85 }}>No se han detectado entrenamientos con pasadas registradas.</p>
          <p style={{ margin: '0.25rem 0 0 0', fontSize: 0.75 }}>
            Registra una carrera de running en la bitácora y activa la casilla <strong>"Registrar Pasadas/Splits"</strong> en el formulario de carga para ver las métricas de consistencia aquí.
          </p>
        </div>
      ) : (
        <div>
          {/* Selector de Entrenamiento */}
          <div className="glass-card" style={{ padding: '1.25rem', marginBottom: '1.5rem' }}>
            <label className="input-label" style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>Seleccionar Sesión de Series</label>
            <select
              value={selectedWorkoutId}
              onChange={(e) => setSelectedWorkoutId(e.target.value)}
              className="premium-select"
              style={{ width: '100%' }}
            >
              {workoutsWithSplits.map(w => (
                <option key={w.id} value={w.id}>
                  {new Date(w.date + 'T00:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })} - {w.sessionName || 'Entrenamiento de Carrera'} ({w.advanced_metrics.splits.length} splits)
                </option>
              ))}
            </select>
          </div>

          {activeWorkout && splitStats && (
            <div className="grid-2col-layout" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
              {/* Consistencia y Recomendación */}
              <div className="glass-card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', justify: 'center', alignItems: 'center', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
                <div className="toast-glow" style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.1) 0%, transparent 70%)', position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'none' }}></div>
                
                <div style={{ position: 'relative', width: '110px', height: '110px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.75rem' }}>
                  <svg style={{ transform: 'rotate(-90deg)', width: '100px', height: '100px' }}>
                    <circle cx="50" cy="50" r="42" stroke="rgba(255,255,255,0.03)" strokeWidth="8" fill="transparent" />
                    <circle 
                      cx="50" 
                      cy="50" 
                      r="42" 
                      stroke="var(--color-primary)" 
                      strokeWidth="8" 
                      fill="transparent" 
                      strokeDasharray="263.89" 
                      strokeDashoffset={263.89 - (263.89 * splitStats.consistencyScore) / 100}
                      strokeLinecap="round"
                      style={{ transition: 'stroke-dashoffset 0.6s ease' }}
                    />
                  </svg>
                  <div style={{ position: 'absolute', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <span style={{ fontSize: '1.6rem', fontWeight: '800', color: '#fff' }}>{splitStats.consistencyScore}%</span>
                    <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Consistencia</span>
                  </div>
                </div>

                <span className="badge" style={{ background: 'rgba(139,92,246,0.12)', color: 'var(--color-primary)', border: '1px solid rgba(139,92,246,0.3)', fontSize: '0.65rem', marginBottom: '0.5rem' }}>
                  Estrategia de Paso: {splitStats.consistencyScore > 90 ? 'Excelente' : splitStats.consistencyScore > 80 ? 'Regular' : 'Inconsistente'}
                </span>
                <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: '1.4', maxWidth: '280px' }}>
                  {splitStats.advice}
                </p>
              </div>

              {/* Estadísticas Generales */}
              <div className="glass-card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', justify: 'center', gap: '0.75rem' }}>
                <h3 className="card-title" style={{ fontSize: '0.95rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <TrendingUp size={16} style={{ color: 'var(--color-running)' }} />
                  Métricas de la Sesión
                </h3>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontSize: '0.8rem' }}>
                  <div style={{ background: 'rgba(255,255,255,0.01)', padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.03)' }}>
                    <span style={{ display: 'block', fontSize: '0.65rem', color: 'var(--text-muted)' }}>Total Pasadas</span>
                    <strong style={{ fontSize: '1rem', color: '#fff' }}>{splitStats.numSplits} series</strong>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.01)', padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.03)' }}>
                    <span style={{ display: 'block', fontSize: '0.65rem', color: 'var(--text-muted)' }}>Paso Promedio</span>
                    <strong style={{ fontSize: '1rem', color: 'var(--color-running)' }}>{formatPace(splitStats.avgSeconds)}</strong>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.01)', padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.03)' }}>
                    <span style={{ display: 'block', fontSize: '0.65rem', color: 'var(--text-muted)' }}>Serie Más Rápida</span>
                    <strong style={{ fontSize: '1rem', color: '#10b981' }}>{splitStats.fastestSeconds !== Infinity ? secondsToTimeString(splitStats.fastestSeconds).substring(3) : '--:--'}</strong>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.01)', padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.03)' }}>
                    <span style={{ display: 'block', fontSize: '0.65rem', color: 'var(--text-muted)' }}>Serie Más Lenta</span>
                    <strong style={{ fontSize: '1rem', color: '#ef4444' }}>{splitStats.slowestSeconds > 0 ? secondsToTimeString(splitStats.slowestSeconds).substring(3) : '--:--'}</strong>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Lista de Splits Detallada y Gráfico Visual */}
          {splitStats && (
            <div className="glass-card" style={{ padding: '1.25rem' }}>
              <h3 className="card-title" style={{ fontSize: '0.95rem', marginBottom: '1rem' }}>Desglose de Series y Desviaciones</h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {splitStats.parsedSplits.map((split, index) => {
                  const isInterval = !splitStats.hasIntervals || split.type === 'interval';
                  const pace = split.distance > 0 ? split.seconds / (split.distance / 1000) : 0;
                  
                  let label = `#${split.splitNumber}`;
                  let badgeColor = 'rgba(255,255,255,0.05)';
                  let badgeText = '';
                  let borderLeftStyle = '1px solid rgba(255,255,255,0.03)';
                  
                  if (split.type === 'warmup') {
                    label = `🔥 Entrada en Calor`;
                    badgeColor = 'rgba(59, 130, 246, 0.12)';
                    badgeText = 'Calentamiento';
                    borderLeftStyle = '3px solid #3b82f6';
                  } else if (split.type === 'cooldown') {
                    label = `❄️ Enfriamiento`;
                    badgeColor = 'rgba(168, 85, 247, 0.12)';
                    badgeText = 'Enfriamiento';
                    borderLeftStyle = '3px solid #a855f7';
                  } else if (split.type === 'rest') {
                    label = `⏱️ Descanso`;
                    badgeColor = 'rgba(234, 179, 8, 0.12)';
                    badgeText = 'Descanso';
                    borderLeftStyle = '3px solid #eab308';
                  } else if (split.type === 'interval') {
                    label = `🏃 Pasada #${split.repNumber || split.splitNumber}`;
                    badgeColor = 'rgba(16, 185, 129, 0.12)';
                    badgeText = 'Pasada';
                    borderLeftStyle = '3px solid var(--color-running)';
                  }

                  const diffSeconds = split.seconds - splitStats.avgSeconds;
                  const diffColor = diffSeconds <= 0 ? '#10b981' : '#ef4444'; // Rápido = verde, Lento = rojo
                  const diffText = diffSeconds === 0 ? 'Media' : `${diffSeconds > 0 ? '+' : ''}${Math.round(diffSeconds * 10) / 10}s`;

                  // Porcentaje para gráfico de barras
                  // La barra base mide el 100% para el promedio.
                  const maxDev = Math.max(5, splitStats.slowestSeconds - splitStats.avgSeconds, splitStats.avgSeconds - splitStats.fastestSeconds);
                  const barOffset = maxDev > 0 ? (diffSeconds / maxDev) * 50 : 0; // max +50% o -50%
                  const barWidth = 50 + barOffset;

                  return (
                    <div 
                      key={index}
                      style={{ 
                        background: 'rgba(255,255,255,0.01)', 
                        border: '1px solid rgba(255,255,255,0.03)', 
                        borderLeft: borderLeftStyle,
                        borderRadius: '10px', 
                        padding: '0.75rem',
                        fontSize: '0.75rem'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ fontWeight: '700', color: '#fff', fontSize: '0.8rem' }}>
                            {label}
                          </span>
                          <span style={{ color: 'var(--text-muted)' }}>
                            {split.distance >= 1000 ? `${(split.distance / 1000).toFixed(2)} km` : `${split.distance} m`}
                          </span>
                        </div>

                        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                          <strong style={{ color: '#fff', fontSize: '0.85rem' }}>{split.timeStr.substring(3)}</strong>
                          <span style={{ color: 'var(--color-running)', fontWeight: '600' }}>{pace > 0 ? formatPace(pace).replace(' min/km', '/k') : 'Parado'}</span>
                          {isInterval ? (
                            <span className="badge" style={{ background: `${diffColor}10`, color: diffColor, border: `1px solid ${diffColor}20`, fontSize: '0.65rem' }}>
                              {diffText}
                            </span>
                          ) : (
                            <span className="badge" style={{ background: badgeColor, color: split.type === 'warmup' ? '#3b82f6' : split.type === 'cooldown' ? '#a855f7' : '#eab308', border: '1px solid rgba(255,255,255,0.05)', fontSize: '0.65rem' }}>
                              {badgeText}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Visual Bar Chart Indicator */}
                      {isInterval ? (
                        <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.03)', borderRadius: '3px', overflow: 'hidden', position: 'relative' }}>
                          {/* Average Marker Line (Center) */}
                          <div style={{ position: 'absolute', left: '50%', width: '1px', height: '100%', background: 'rgba(255,255,255,0.25)', zIndex: 2 }}></div>
                          
                          {/* Bar */}
                          <div style={{ 
                            position: 'absolute',
                            left: barWidth >= 50 ? '50%' : `${barWidth}%`,
                            width: `${Math.abs(barOffset)}%`,
                            height: '100%',
                            background: diffSeconds <= 0 ? '#10b981' : '#ef4444',
                            boxShadow: `0 0 6px ${diffSeconds <= 0 ? '#10b981' : '#ef4444'}50`,
                            zIndex: 1
                          }} />
                        </div>
                      ) : (
                        <div style={{ width: '100%', height: '2px', background: 'rgba(255,255,255,0.01)', borderRadius: '1px' }}></div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
