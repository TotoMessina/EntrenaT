import React, { useState, useMemo } from 'react';
import { Activity, Clock, Heart, Award, ShieldAlert, Sparkles, Smile, MessageSquareCheck, Check } from 'lucide-react';

export default function ReadinessDashboard({ profile = {}, onUpdateReadinessLogs, readinessLogs = [] }) {
  const todayStr = new Date().toISOString().split('T')[0];
  
  // Daily check-in state
  const [sleep, setSleep] = useState(4); // 1-5
  const [soreness, setSoreness] = useState(2); // 1-5
  const [restingHr, setRestingHr] = useState(() => (profile.restingHR || 60).toString());
  const [hrv, setHrv] = useState(''); // ms (opcional)
  const [notes, setNotes] = useState('');

  // Check if today's log already exists
  const todayLog = useMemo(() => {
    return readinessLogs.find(log => log.date === todayStr);
  }, [readinessLogs, todayStr]);

  // Historial de logs ordenados cronológicamente descendiente
  const sortedLogs = useMemo(() => {
    return [...readinessLogs].sort((a, b) => new Date(b.date + 'T00:00:00') - new Date(a.date + 'T00:00:00'));
  }, [readinessLogs]);

  // Calcular score de disposición
  const calculateScore = (sVal, soreVal, rHrVal, hrvVal) => {
    const s = Number(sVal) || 4;
    const sore = Number(soreVal) || 2;
    const rHr = Number(rHrVal) || (profile.restingHR || 60);
    const baselineHR = profile.restingHR || 60;
    
    // Pilares
    // 1. Sueño (Max 35 pts)
    const sleepScore = (s / 5) * 35;

    // 2. Dolor Muscular (Max 25 pts - 1 es mejor, 5 es peor)
    const sorenessScore = ((6 - sore) / 5) * 25;

    // 3. Frecuencia Cardíaca en Reposo (Max 15 pts)
    const hrDiff = rHr - baselineHR;
    let hrScore = 15;
    if (hrDiff > 3) {
      hrScore = Math.max(0, 15 - (hrDiff - 3) * 1.5);
    } else if (hrDiff < -5) {
      hrScore = 15; // pulsaciones más bajas es señal de adaptación aeróbica excelente
    }

    // 4. HRV (Max 25 pts - Opcional)
    let hrvScore = 25;
    let hasHrv = false;
    if (hrvVal && Number(hrvVal) > 0) {
      hasHrv = true;
      const hVal = Number(hrvVal);
      // Supongamos un baseline promedio de 55ms
      if (hVal >= 50 && hVal <= 75) {
        hrvScore = 25;
      } else if (hVal < 45) {
        hrvScore = Math.max(5, 25 - (45 - hVal) * 1.2);
      }
    }

    // Si no hay HRV, redistribuimos el peso de 25% entre los otros 3
    if (!hasHrv) {
      // Ajuste de pesos: Sueño (45%), Dolor (35%), FCR (20%)
      const adjSleep = (s / 5) * 45;
      const adjSore = ((6 - sore) / 5) * 35;
      let adjHr = 20;
      if (hrDiff > 3) {
        adjHr = Math.max(0, 20 - (hrDiff - 3) * 2.0);
      }
      return Math.round(adjSleep + adjSore + adjHr);
    }

    return Math.round(sleepScore + sorenessScore + hrScore + hrvScore);
  };

  // Calcular score en base a logs para renderizado
  const getLogDetails = (log) => {
    const score = calculateScore(log.sleep, log.soreness, log.restingHr, log.hrv);
    
    let color = '#10b981'; // Green
    let statusText = '¡ÓPTIMO RITMO!';
    let recommendation = 'Tus sistemas neuromuscular y cardiovascular están listos. Es el día perfecto para series de velocidad (Intervalos), tempo o fondos largos.';
    
    if (score < 50) {
      color = '#ef4444'; // Red
      statusText = 'DESCANSO RECOMENDADO';
      recommendation = 'Fatiga acumulada severa. Tu riesgo de lesión muscular o desgarro es alto. Prioriza descanso completo, hidratación profunda y estiramientos suaves hoy.';
    } else if (score < 80) {
      color = '#f59e0b'; // Amber
      statusText = 'CARGA SUBMÁXIMA';
      recommendation = 'Fatiga moderada detectada. Se sugiere entrenamiento aeróbico suave (Zona 2), carrera regenerativa ligera o rutina de fuerza moderada.';
    }

    return { score, color, statusText, recommendation };
  };

  const handleSaveLog = (e) => {
    e.preventDefault();
    const newLog = {
      date: todayStr,
      sleep: Number(sleep),
      soreness: Number(soreness),
      restingHr: Number(restingHr) || (profile.restingHR || 60),
      hrv: hrv ? Number(hrv) : null,
      notes: notes.trim()
    };

    // Update list: replace if exists or append
    let updated;
    if (todayLog) {
      updated = readinessLogs.map(l => l.date === todayStr ? newLog : l);
    } else {
      updated = [...readinessLogs, newLog];
    }
    onUpdateReadinessLogs(updated);

    // Reset notes
    setNotes('');
  };

  // Datos de hoy calculados al vuelo
  const activeCheckInData = useMemo(() => {
    if (todayLog) return getLogDetails(todayLog);
    return getLogDetails({ sleep, soreness, restingHr, hrv });
  }, [todayLog, sleep, soreness, restingHr, hrv]);

  return (
    <div className="readiness-container animate-fade-in" style={{ padding: '0 0.5rem' }}>
      {/* Cabecera */}
      <div className="glass-card card-identity" style={{ padding: '1.25rem', marginBottom: '1.5rem', borderLeft: '4px solid var(--color-primary)' }}>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginBottom: '0.5rem' }}>
          <Activity className="text-primary-glow" size={20} style={{ color: 'var(--color-primary)' }} />
          <h3 className="card-title" style={{ margin: 0, fontSize: '1.1rem' }}>Métricas de Disposición Diaria (Readiness)</h3>
        </div>
        <p className="card-subtitle" style={{ fontSize: '0.85rem', lineHeight: '1.4', margin: 0 }}>
          La autorregulación es el secreto de los atletas élite. Evalúa diariamente las señales fisiológicas de fatiga para entrenar en la intensidad exacta que tu cuerpo asimilará hoy, maximizando tu adaptación y anulando el riesgo de sobreentrenamiento.
        </p>
      </div>

      <div className="grid-2col-layout" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
        {/* Formulario de Entrada */}
        <div className="glass-card" style={{ padding: '1.25rem' }}>
          <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.0rem', marginBottom: '1rem' }}>
            <Smile size={18} style={{ color: 'var(--color-primary)' }} />
            {todayLog ? 'Tu Chequeo de Hoy' : 'Registrar Estado de Hoy'}
          </h3>

          {todayLog ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem', background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '8px' }}>
                <Check size={16} style={{ color: '#10b981' }} />
                <span style={{ fontSize: '0.8rem', color: '#fff' }}>¡Ya registraste tu estado para el día de hoy!</span>
              </div>
              
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.35rem 0', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                  <span>Sueño:</span>
                  <strong style={{ color: '#fff' }}>{todayLog.sleep} / 5</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.35rem 0', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                  <span>Dolor Muscular:</span>
                  <strong style={{ color: '#fff' }}>{todayLog.soreness} / 5</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.35rem 0', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                  <span>Pulsaciones en Reposo:</span>
                  <strong style={{ color: '#fff' }}>{todayLog.restingHr} lpm</strong>
                </div>
                {todayLog.hrv && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.35rem 0', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                    <span>HRV:</span>
                    <strong style={{ color: '#fff' }}>{todayLog.hrv} ms</strong>
                  </div>
                )}
                {todayLog.notes && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem', paddingTop: '0.5rem' }}>
                    <span>Notas:</span>
                    <span style={{ color: '#fff', fontStyle: 'italic' }}>"{todayLog.notes}"</span>
                  </div>
                )}
              </div>

              <button 
                onClick={() => {
                  setSleep(todayLog.sleep);
                  setSoreness(todayLog.soreness);
                  setRestingHr(todayLog.restingHr.toString());
                  setHrv(todayLog.hrv ? todayLog.hrv.toString() : '');
                  setNotes(todayLog.notes || '');
                  // Forzar que pueda volver a editar al borrar el log temporalmente de la vista reactiva
                  onUpdateReadinessLogs(readinessLogs.filter(l => l.date !== todayStr));
                }}
                className="action-btn-secondary"
                style={{ padding: '0.5rem', fontSize: '0.75rem', borderRadius: '8px', marginTop: '0.5rem' }}
              >
                Volver a Registrar / Editar
              </button>
            </div>
          ) : (
            <form onSubmit={handleSaveLog} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Sueño */}
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>Calidad de Sueño (1-5)</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {[1, 2, 3, 4, 5].map(star => (
                    <button 
                      key={star}
                      type="button"
                      onClick={() => setSleep(star)}
                      style={{ 
                        flex: 1, 
                        padding: '0.5rem', 
                        borderRadius: '8px', 
                        background: sleep === star ? 'rgba(139,92,246,0.15)' : 'rgba(255,255,255,0.02)',
                        border: `1px solid ${sleep === star ? 'var(--color-primary)' : 'rgba(255,255,255,0.05)'}`,
                        color: sleep >= star ? 'var(--color-primary)' : 'var(--text-muted)',
                        cursor: 'pointer',
                        fontWeight: '700',
                        fontSize: '0.85rem',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {star}
                    </button>
                  ))}
                </div>
              </div>

              {/* Dolor Muscular */}
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>Nivel de Dolor/Fatiga Muscular (1-5)</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {[1, 2, 3, 4, 5].map(star => (
                    <button 
                      key={star}
                      type="button"
                      onClick={() => setSoreness(star)}
                      style={{ 
                        flex: 1, 
                        padding: '0.5rem', 
                        borderRadius: '8px', 
                        background: soreness === star ? 'rgba(239,68,68,0.12)' : 'rgba(255,255,255,0.02)',
                        border: `1px solid ${soreness === star ? '#f87171' : 'rgba(255,255,255,0.05)'}`,
                        color: soreness >= star ? '#f87171' : 'var(--text-muted)',
                        cursor: 'pointer',
                        fontWeight: '700',
                        fontSize: '0.85rem',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {star}
                    </button>
                  ))}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.6rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                  <span>Sin dolor (1)</span>
                  <span>Dolor extremo (5)</span>
                </div>
              </div>

              {/* FCR y HRV */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label className="input-label" style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>FCR de Hoy (lpm)</label>
                  <input 
                    type="number"
                    value={restingHr}
                    onChange={(e) => setRestingHr(e.target.value)}
                    className="premium-input"
                    style={{ width: '100%' }}
                    required
                  />
                </div>
                <div>
                  <label className="input-label" style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>HRV (ms, opcional)</label>
                  <input 
                    type="number"
                    value={hrv}
                    onChange={(e) => setHrv(e.target.value)}
                    className="premium-input"
                    style={{ width: '100%' }}
                    placeholder="ej: 55"
                  />
                </div>
              </div>

              {/* Notas */}
              <div>
                <label className="input-label" style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>Notas de Recuperación</label>
                <input 
                  type="text" 
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="premium-input"
                  style={{ width: '100%' }}
                  placeholder="ej: Piernas un poco pesadas, dormí 8 horas"
                />
              </div>

              <button 
                type="submit"
                className="action-btn-primary"
                style={{ padding: '0.6rem', fontSize: '0.8rem', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }}
              >
                Guardar Chequeo Diario
              </button>
            </form>
          )}
        </div>

        {/* Círculo de Puntuación de Disposición */}
        <div className="glass-card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
          <div className="toast-glow" style={{ background: `radial-gradient(circle, ${activeCheckInData.color}15 0%, transparent 70%)`, position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'none' }}></div>
          
          {/* Circular Gauge */}
          <div style={{ position: 'relative', width: '130px', height: '130px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.75rem' }}>
            <svg style={{ transform: 'rotate(-90deg)', width: '120px', height: '120px' }}>
              <circle 
                cx="60" 
                cy="60" 
                r="50" 
                stroke="rgba(255,255,255,0.03)" 
                strokeWidth="10" 
                fill="transparent" 
              />
              <circle 
                cx="60" 
                cy="60" 
                r="50" 
                stroke={activeCheckInData.color} 
                strokeWidth="10" 
                fill="transparent" 
                strokeDasharray="314.15" 
                strokeDashoffset={314.15 - (314.15 * activeCheckInData.score) / 100}
                strokeLinecap="round"
                style={{ transition: 'stroke-dashoffset 0.6s ease' }}
              />
            </svg>
            <div style={{ position: 'absolute', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <span style={{ fontSize: '2rem', fontWeight: '800', color: '#fff' }}>{activeCheckInData.score}%</span>
              <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em' }}>Readiness</span>
            </div>
          </div>

          <span className="badge" style={{ background: `${activeCheckInData.color}15`, color: activeCheckInData.color, border: `1px solid ${activeCheckInData.color}35`, fontSize: '0.7rem', padding: '0.25rem 0.6rem', marginBottom: '0.5rem' }}>
            {activeCheckInData.statusText}
          </span>
          <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: '1.4', maxWidth: '280px' }}>
            {activeCheckInData.recommendation}
          </p>
        </div>
      </div>

      {/* Historial de Recuperación */}
      <div className="glass-card" style={{ padding: '1.25rem' }}>
        <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.95rem', marginBottom: '1rem' }}>
          <Clock size={16} style={{ color: 'var(--color-primary)' }} />
          Historial Reciente de Disposición
        </h3>

        {sortedLogs.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {sortedLogs.slice(0, 7).map((log, index) => {
              const details = getLogDetails(log);
              return (
                <div 
                  key={index}
                  style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    padding: '0.6rem 0.85rem', 
                    background: 'rgba(255,255,255,0.01)', 
                    border: '1px solid rgba(255,255,255,0.03)', 
                    borderRadius: '8px',
                    fontSize: '0.75rem'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ 
                      width: '6px', 
                      height: '6px', 
                      borderRadius: '50%', 
                      background: details.color,
                      boxShadow: `0 0 6px ${details.color}`
                    }} />
                    <span style={{ fontWeight: '600', color: '#fff' }}>
                      {new Date(log.date + 'T00:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                    </span>
                    {log.notes && (
                      <span style={{ color: 'var(--text-muted)', fontStyle: 'italic', maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={log.notes}>
                        - "{log.notes}"
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                    <span style={{ color: 'var(--text-muted)' }}>FCR: {log.restingHr} lpm</span>
                    <span style={{ color: details.color, fontWeight: '700' }}>{details.score}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
            No hay registros de disposición guardados. Realiza tu primer chequeo diario arriba.
          </div>
        )}
      </div>
    </div>
  );
}
