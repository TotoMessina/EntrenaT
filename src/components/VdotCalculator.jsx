import React, { useState, useEffect } from 'react';
import { Sparkles, Trophy, Flame, Activity, Zap, TrendingUp, Clock, Info, ShieldAlert } from 'lucide-react';
import { getRacePredictions, getRunningPaceZones } from '../utils/calculators';

export default function VdotCalculator({ workouts = [], profile = {} }) {
  const [distance, setDistance] = useState('5'); // km
  const [hh, setHh] = useState('00');
  const [mm, setMm] = useState('24');
  const [ss, setSs] = useState('30');
  
  const [predictions, setPredictions] = useState([]);
  const [paceZones, setPaceZones] = useState([]);
  const [vdotValue, setVdotValue] = useState(0);

  // Recalcular ritmos y predicciones automáticamente
  useEffect(() => {
    const d = parseFloat(distance);
    const h = parseInt(hh) || 0;
    const m = parseInt(mm) || 0;
    const s = parseInt(ss) || 0;
    
    if (d > 0 && (h > 0 || m > 0 || s > 0)) {
      const timeStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
      const preds = getRacePredictions(d, timeStr, profile, workouts);
      const zones = getRunningPaceZones(d, timeStr, profile, workouts);
      
      setPredictions(preds);
      setPaceZones(zones);

      // Calcular VDOT de referencia
      const totalMinutes = h * 60 + m + s / 60;
      const v = (d * 1000) / totalMinutes; // m/min
      const vo2 = -4.60 + 0.182258 * v + 0.000104 * v * v;
      const pct = 0.2989558 * Math.exp(-0.1932605 * totalMinutes) + 0.1894393 * Math.exp(-0.012778 * totalMinutes) + 0.8;
      setVdotValue(Math.round((vo2 / pct) * 10) / 10);
    }
  }, [distance, hh, mm, ss, profile, workouts]);

  // Cargar una marca de demostración desde entrenamientos reales
  const loadBestWorkoutMark = () => {
    const runs = workouts.filter(w => w.type === 'running' && w.distance > 0 && w.duration);
    if (runs.length === 0) return;
    
    // Buscar el que tenga mejor paso
    let bestRun = runs[0];
    let bestPace = Infinity;
    
    runs.forEach(w => {
      const parts = w.duration.split(':').map(Number);
      let secs = 0;
      if (parts.length === 3) secs = parts[0] * 3600 + parts[1] * 60 + parts[2];
      else if (parts.length === 2) secs = parts[0] * 60 + parts[1];
      
      const pace = secs / w.distance;
      if (pace < bestPace) {
        bestPace = pace;
        bestRun = w;
      }
    });

    setDistance(bestRun.distance.toString());
    const durationParts = bestRun.duration.split(':');
    if (durationParts.length === 3) {
      setHh(durationParts[0]);
      setMm(durationParts[1]);
      setSs(durationParts[2]);
    } else if (durationParts.length === 2) {
      setHh('00');
      setMm(durationParts[0]);
      setSs(durationParts[1]);
    }
  };

  return (
    <div className="vdot-calculator-container animate-fade-in" style={{ padding: '0 0.5rem' }}>
      {/* Explicación Inicial */}
      <div className="glass-card card-identity" style={{ padding: '1.25rem', marginBottom: '1.5rem', borderLeft: '4px solid var(--color-primary)' }}>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginBottom: '0.5rem' }}>
          <Sparkles className="text-primary-glow" size={20} style={{ color: 'var(--color-primary)' }} />
          <h3 className="card-title" style={{ margin: 0, fontSize: '1.1rem' }}>Fisiología Científica del Running</h3>
        </div>
        <p className="card-subtitle" style={{ fontSize: '0.85rem', lineHeight: '1.4', margin: 0 }}>
          El VDOT (inventado por el legendario fisiólogo Jack Daniels) estima tu consumo máximo de oxígeno (VO2 máx) efectivo combinando tu velocidad de carrera con tu economía de movimiento. Introduce una marca de prueba reciente para calcular tus ritmos óptimos de entrenamiento.
        </p>
      </div>

      <div className="grid-2col-layout" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
        {/* Formulario de Entrada */}
        <div className="glass-card" style={{ padding: '1.25rem' }}>
          <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1rem', marginBottom: '1rem' }}>
            <Activity size={18} style={{ color: 'var(--color-primary)' }} />
            Ingresar Marca de Carrera
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Distancia */}
            <div>
              <label className="input-label" style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>Distancia de Referencia (km)</label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input 
                  type="number" 
                  step="0.1" 
                  value={distance} 
                  onChange={(e) => setDistance(e.target.value)}
                  className="premium-input"
                  style={{ flex: 1 }}
                />
                <select 
                  className="premium-select"
                  value={distance}
                  onChange={(e) => setDistance(e.target.value)}
                  style={{ width: '120px' }}
                >
                  <option value="1">1 km</option>
                  <option value="1.609">1 Milla</option>
                  <option value="5">5 km</option>
                  <option value="10">10 km</option>
                  <option value="21.097">21.1k (Media)</option>
                  <option value="42.195">42.2k (Maratón)</option>
                </select>
              </div>
            </div>

            {/* Tiempo */}
            <div>
              <label className="input-label" style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>Tiempo Logrado (HH:MM:SS)</label>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <input 
                  type="number" 
                  min="0" 
                  max="23" 
                  placeholder="HH" 
                  value={hh} 
                  onChange={(e) => setHh(e.target.value.padStart(2, '0').slice(-2))}
                  className="premium-input"
                  style={{ width: '60px', textAlign: 'center' }}
                />
                <span style={{ color: 'var(--text-muted)' }}>:</span>
                <input 
                  type="number" 
                  min="0" 
                  max="59" 
                  placeholder="MM" 
                  value={mm} 
                  onChange={(e) => setMm(e.target.value.padStart(2, '0').slice(-2))}
                  className="premium-input"
                  style={{ width: '60px', textAlign: 'center' }}
                />
                <span style={{ color: 'var(--text-muted)' }}>:</span>
                <input 
                  type="number" 
                  min="0" 
                  max="59" 
                  placeholder="SS" 
                  value={ss} 
                  onChange={(e) => setSs(e.target.value.padStart(2, '0').slice(-2))}
                  className="premium-input"
                  style={{ width: '60px', textAlign: 'center' }}
                />
              </div>
            </div>

            {/* Botones rápidos */}
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
              <button 
                onClick={loadBestWorkoutMark}
                className="action-btn-secondary"
                style={{ flex: 1, padding: '0.5rem', fontSize: '0.75rem', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }}
                disabled={workouts.filter(w => w.type === 'running').length === 0}
              >
                <Trophy size={14} />
                Cargar tu mejor sesión
              </button>
            </div>
          </div>
        </div>

        {/* Score VDOT Result */}
        <div className="glass-card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
          <div className="toast-glow" style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.15) 0%, transparent 70%)', position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'none' }}></div>
          <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.75rem', boxShadow: '0 0 15px rgba(139,92,246,0.2)' }}>
            <Zap size={28} style={{ color: 'var(--color-primary)' }} />
          </div>
          <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)' }}>VDOT Estimado</span>
          <h2 style={{ fontSize: '3rem', fontWeight: '800', margin: '0.2rem 0', color: '#fff', textShadow: '0 0 10px rgba(139,92,246,0.4)' }}>{vdotValue || '--.-'}</h2>
          
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'center', marginTop: '0.5rem' }}>
            <span className="badge" style={{ background: 'rgba(139, 92, 246, 0.15)', color: 'var(--color-primary)', border: '1px solid rgba(139, 92, 246, 0.3)' }}>
              Nivel: {vdotValue > 55 ? 'Élite' : vdotValue > 45 ? 'Avanzado' : vdotValue > 35 ? 'Intermedio' : 'Iniciación'}
            </span>
          </div>
        </div>
      </div>

      {/* Zonas de Paso de Entrenamiento */}
      <div className="glass-card" style={{ padding: '1.25rem', marginBottom: '1.5rem' }}>
        <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1rem', marginBottom: '1rem' }}>
          <TrendingUp size={18} style={{ color: 'var(--color-running)' }} />
          Zonas de Ritmo de Entrenamiento
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {paceZones.length > 0 ? (
            paceZones.map((zone, idx) => (
              <div 
                key={idx} 
                className="zone-pace-row"
                style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  padding: '0.85rem', 
                  background: 'rgba(255,255,255,0.02)', 
                  border: '1px solid rgba(255,255,255,0.05)', 
                  borderRadius: '12px',
                  gap: '0.5rem'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ 
                      width: '8px', 
                      height: '8px', 
                      borderRadius: '50%', 
                      background: idx === 0 ? '#10b981' : idx === 1 ? '#3b82f6' : idx === 2 ? '#f59e0b' : idx === 3 ? '#f97316' : '#ef4444',
                      boxShadow: `0 0 6px ${idx === 0 ? '#10b981' : idx === 1 ? '#3b82f6' : idx === 2 ? '#f59e0b' : idx === 3 ? '#f97316' : '#ef4444'}`
                    }} />
                    <span style={{ fontSize: '0.85rem', fontWeight: '600', color: '#fff' }}>{zone.name}</span>
                  </div>
                  <span className="badge" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)' }}>{zone.range}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.03)', paddingTop: '0.5rem' }}>
                  <div>
                    <span style={{ display: 'block', fontSize: '0.65rem', color: 'var(--text-muted)' }}>Ritmo de Carrera</span>
                    <strong style={{ fontSize: '0.85rem', color: 'var(--color-running)' }}>{zone.paceMin} - {zone.paceMax}</strong>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ display: 'block', fontSize: '0.65rem', color: 'var(--text-muted)' }}>Frecuencia Recomendada</span>
                    <strong style={{ fontSize: '0.85rem', color: '#fff' }}>{zone.hrRange}</strong>
                  </div>
                </div>

                <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: '1.3' }}>{zone.description}</p>
              </div>
            ))
          ) : (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
              Ingresa una marca válida arriba para calcular tus zonas de ritmo de carrera.
            </div>
          )}
        </div>
      </div>

      {/* Predicción de Tiempos */}
      {predictions.length > 0 && (
        <div className="glass-card" style={{ padding: '1.25rem' }}>
          <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1rem', marginBottom: '1rem' }}>
            <Trophy size={18} style={{ color: 'var(--color-primary)' }} />
            Tiempos Estimados en Competencia
          </h3>
          
          <div className="table-responsive" style={{ border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', overflow: 'hidden' }}>
            <table className="gym-exercises-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <th style={{ padding: '0.75rem', textAlign: 'left', color: 'var(--text-muted)' }}>Distancia</th>
                  <th style={{ padding: '0.75rem', textAlign: 'center', color: 'var(--text-muted)' }}>Tiempo de Carrera</th>
                  <th style={{ padding: '0.75rem', textAlign: 'center', color: 'var(--text-muted)' }}>Paso Promedio</th>
                  <th style={{ padding: '0.75rem', textAlign: 'right', color: 'var(--text-muted)' }}>Decaimiento</th>
                </tr>
              </thead>
              <tbody>
                {predictions.map((pred, index) => (
                  <tr key={index} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', background: index % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)' }}>
                    <td style={{ padding: '0.75rem', fontWeight: '600', color: '#fff' }}>{pred.name}</td>
                    <td style={{ padding: '0.75rem', textAlign: 'center', color: 'var(--color-primary)', fontWeight: '600' }}>{pred.time}</td>
                    <td style={{ padding: '0.75rem', textAlign: 'center', color: 'var(--text-muted)' }}>{pred.pace}</td>
                    <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                      {pred.vdotLossPct > 0 ? (
                        <span className="badge" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.2)', fontSize: '0.65rem' }}>
                          -{pred.vdotLossPct}% cap
                        </span>
                      ) : (
                        <span className="badge" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.2)', fontSize: '0.65rem' }}>
                          Base
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start', marginTop: '1rem', padding: '0.75rem', background: 'rgba(139,92,246,0.05)', borderRadius: '8px', border: '1px solid rgba(139,92,246,0.1)' }}>
            <Info size={16} style={{ color: 'var(--color-primary)', marginTop: '2px', flexShrink: 0 }} />
            <p style={{ margin: 0, fontSize: '0.7rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
              Las predicciones calculan la fatiga cardiovascular y el decaimiento aeróbico real en base al volumen de entrenamientos de tus últimos 30 días. Si corres pocos kilómetros semanales, tus proyecciones para distancias largas (Medio y Maratón) reflejarán una mayor pérdida aeróbica fisiológica.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
