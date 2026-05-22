import React, { useState, useEffect } from 'react';
import { ShieldAlert, Zap, Flame, Activity, Clock, Info, ShieldCheck, Dumbbell, Award, HelpCircle } from 'lucide-react';
import { timeStringToSeconds } from '../utils/calculators';

export default function ConcurrentInterference({ workouts = [], profile = {} }) {
  const userAge = profile?.age || 30;
  const maxHR = Math.round(208 - 0.7 * userAge);
  
  // Estado para el simulador interactivo de separación horaria
  const [simulatedHours, setSimulatedHours] = useState(8);

  // 1. FUNCIONES FISIOLÓGICAS DE DETECCIÓN
  
  // Detección de carrera en Zona 4 o 5 (Alta Intensidad)
  const isHighIntensityRun = (w) => {
    if (w.type !== 'running') return false;
    // Frecuencia cardíaca mayor al 80% de Tanaka maxHR
    if (w.heartRate && Number(w.heartRate) >= maxHR * 0.8) return true;
    // En su ausencia, RPE exigente de carrera >= 8
    if (w.rpe && Number(w.rpe) >= 8) return true;
    return false;
  };

  // Detección de entrenamiento pesado de piernas
  const isLegWorkout = (w) => {
    if (w.type !== 'gym') return false;
    const legKeywords = ["cuádriceps", "isquiotibiales", "glúteos", "gemelos", "pierna", "piernas"];
    
    // 1. Por grupos musculares declarados
    if (w.trainedMuscles && w.trainedMuscles.some(m => legKeywords.includes(m.toLowerCase()))) {
      return true;
    }
    if (w.muscleGroup && legKeywords.includes(w.muscleGroup.toLowerCase())) {
      return true;
    }
    
    // 2. Por nombres de ejercicios
    if (w.exercises && w.exercises.some(ex => {
      const name = ex.name?.toLowerCase() || "";
      return name.includes("sentadilla") || name.includes("prensa") || name.includes("deadlift") || 
             name.includes("peso muerto") || name.includes("estocada") || name.includes("lunge") || 
             name.includes("gemelo") || name.includes("pantorrilla") || name.includes("quad") || 
             name.includes("isquio") || name.includes("gluteo") || name.includes("hip thrust") || 
             name.includes("leg extension") || name.includes("leg curl") || name.includes("camilla") || 
             name.includes("sillón") || name.includes("pierna");
    })) {
      return true;
    }
    return false;
  };

  // Obtener volumen e intensidad específicos de piernas en un entrenamiento de gimnasio
  const getLegStats = (w) => {
    let legSetsCount = 0;
    let totalRpeSum = 0;
    let rpeCount = 0;
    
    if (!w.exercises) return { sets: 0, avgRpe: 0 };
    
    const legKeywords = ["sentadilla", "prensa", "deadlift", "peso muerto", "estocada", "lunge", "gemelo", "pantorrilla", "quad", "isquio", "gluteo", "hip thrust", "leg extension", "leg curl", "camilla", "sillón", "pierna"];
    
    w.exercises.forEach(ex => {
      const isLegEx = legKeywords.some(keyword => ex.name?.toLowerCase().includes(keyword));
      if (!isLegEx) return;
      
      // Manejar formato detallado (Phase 8/9 arrays de sets)
      if (Array.isArray(ex.sets)) {
        ex.sets.forEach(s => {
          legSetsCount++;
          if (s.rpe) {
            totalRpeSum += Number(s.rpe);
            rpeCount++;
          }
        });
      } else {
        // Formato legacy plano
        const setsNum = Number(ex.sets) || 0;
        legSetsCount += setsNum;
        if (ex.rpe) {
          totalRpeSum += (Number(ex.rpe) * setsNum);
          rpeCount += setsNum;
        }
      }
    });

    // Fallback al RPE de la sesión si no hay RPE individuales de ejercicios
    const avgRpe = rpeCount > 0 ? (totalRpeSum / rpeCount) : (Number(w.rpe) || 7.5);
    
    // Si la sesión es de piernas pero no desglosó ejercicios específicos de piernas
    if (legSetsCount === 0 && isLegWorkout(w)) {
      // Sumar sets generales
      w.exercises.forEach(ex => {
        if (Array.isArray(ex.sets)) {
          legSetsCount += ex.sets.length;
        } else {
          legSetsCount += (Number(ex.sets) || 0);
        }
      });
      return { sets: legSetsCount || 12, avgRpe: Number(w.rpe) || 8 };
    }
    
    return { sets: legSetsCount, avgRpe: Math.round(avgRpe * 10) / 10 };
  };

  // 2. DETECCIÓN RETROSPECTIVA DE CONFLICTOS EN EL HISTORIAL (Últimos 60 días)
  const [conflictEvents, setConflictEvents] = useState([]);
  const [telemetry, setTelemetry] = useState({ cardioMins: 0, cardioKm: 0, strengthSets: 0, avgRpe: 0, score: 0 });

  useEffect(() => {
    if (!workouts || workouts.length === 0) return;

    // A. Filtrar y ordenar entrenamientos recientes
    const now = new Date();
    const limitDate = new Date();
    limitDate.setDate(now.getDate() - 60);

    const sortedWorkouts = [...workouts]
      .filter(w => new Date(w.date + "T00:00:00") >= limitDate)
      .sort((a, b) => new Date(b.date + "T00:00:00") - new Date(a.date + "T00:00:00"));

    const runs = sortedWorkouts.filter(isHighIntensityRun);
    const legs = sortedWorkouts.filter(isLegWorkout);

    // B. Buscar colisiones (±48 horas)
    const detectedConflicts = [];
    
    legs.forEach(g => {
      const gDate = new Date(g.date + "T00:00:00");
      
      runs.forEach(r => {
        const rDate = new Date(r.date + "T00:00:00");
        const diffMs = Math.abs(gDate - rDate);
        const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
        
        if (diffDays <= 2) {
          const legStats = getLegStats(g);
          
          let windowType = "";
          let penaltyPercent = 0;
          let recoveryAdvice = "";
          let riskColor = "";
          
          if (diffDays === 0) {
            windowType = "Mismo Día (< 6 horas)";
            penaltyPercent = 25;
            riskColor = "#ef4444"; // Red
            recoveryAdvice = "Interferencia neuromuscular severa. La activación de AMPK blanqueó por completo las cascadas de traducción de mTORC1. Capacidad de fuerza del tren inferior drásticamente depletada.";
          } else if (diffDays === 1) {
            windowType = "Días Consecutivos (~24 horas)";
            penaltyPercent = 12;
            riskColor = "#f97316"; // Orange
            recoveryAdvice = "Fatiga central residual y glucógeno muscular parcialmente repuesto. Pérdida moderada de economía de carrera y asimilación de hipertrofia.";
          } else {
            windowType = "Días Alternados (~48 horas)";
            penaltyPercent = 5;
            riskColor = "#eab308"; // Yellow
            recoveryAdvice = "Carga tolerable. Supercompensación iniciada. Pérdida mínima de adaptación, recomendada alimentación abundante en carbohidratos.";
          }

          detectedConflicts.push({
            id: `${g.id}-${r.id}`,
            legWorkout: g,
            runWorkout: r,
            diffDays,
            windowType,
            penaltyPercent,
            riskColor,
            recoveryAdvice,
            order: rDate < gDate ? "Cardio antes de Fuerza" : gDate < rDate ? "Fuerza antes de Cardio" : "Mismo día"
          });
        }
      });
    });

    setConflictEvents(detectedConflicts);

    // C. Calcular Telemetría de las últimas 48 horas reales
    const nowTime = new Date();
    const limit48h = new Date();
    limit48h.setDate(nowTime.getDate() - 2);

    const recentWorkouts = workouts.filter(w => new Date(w.date + "T00:00:00") >= limit48h);
    const recentRuns = recentWorkouts.filter(isHighIntensityRun);
    const recentLegs = recentWorkouts.filter(isLegWorkout);

    let recentCardioMins = 0;
    let recentCardioKm = 0;
    recentRuns.forEach(r => {
      recentCardioKm += Number(r.distance) || 0;
      const secs = timeStringToSeconds(r.duration);
      recentCardioMins += secs / 60;
    });

    let recentSets = 0;
    let recentRpeSum = 0;
    let recentRpeCount = 0;
    recentLegs.forEach(l => {
      const stats = getLegStats(l);
      recentSets += stats.sets;
      if (stats.avgRpe > 0) {
        recentRpeSum += stats.avgRpe;
        recentRpeCount++;
      }
    });

    const recentAvgRpe = recentRpeCount > 0 ? (recentRpeSum / recentRpeCount) : 0;

    // Calcular el Score de Interferencia Global (0 a 100)
    // Factores: Volumen de Running Z4/Z5 (peso 50%), Sets de piernas (peso 30%), RPE de Fuerza (peso 20%)
    // Si coinciden en la misma ventana de 48h
    let globalInterferenceScore = 0;
    if (recentRuns.length > 0 && recentLegs.length > 0) {
      const runFactor = Math.min(recentCardioMins / 60, 1) * 50; // Max 60 mins Z4/5 = 50 pts
      const setsFactor = Math.min(recentSets / 16, 1) * 30; // Max 16 sets = 30 pts
      const rpeFactor = Math.min(recentAvgRpe / 10, 1) * 20; // Max RPE 10 = 20 pts
      
      // Castigo por cercanía (asumir mismo día si coinciden en la ventana de 48h actuales)
      globalInterferenceScore = Math.round(runFactor + setsFactor + rpeFactor);
    } else if (recentRuns.length > 0) {
      globalInterferenceScore = Math.round(Math.min(recentCardioMins / 60, 1) * 15); // Solo cardio residual
    } else if (recentLegs.length > 0) {
      globalInterferenceScore = Math.round(Math.min(recentSets / 16, 1) * 10); // Solo fatiga de gimnasio
    }

    setTelemetry({
      cardioMins: Math.round(recentCardioMins),
      cardioKm: Math.round(recentCardioKm * 10) / 10,
      strengthSets: recentSets,
      avgRpe: Math.round(recentAvgRpe * 10) / 10,
      score: globalInterferenceScore
    });

  }, [workouts, userAge]);

  // 3. FÓRMULAS MATEMÁTICAS DEL SIMULADOR AMPK/mTORC1
  const getAMPKValue = (h) => Math.exp(-0.08 * h) * 100;
  const getmTORC1Value = (h) => {
    const ampk = getAMPKValue(h);
    // mTORC1 es inhibido directamente por la presencia de AMPK celular
    return Math.max(0, (1 - ampk / 100) * 100 * (1 - Math.exp(-0.07 * h)));
  };
  const getFuerzaDisponibleValue = (h) => {
    // La fuerza neuromuscular disponible se ve afectada por fatiga y glucógeno.
    // A 0h de separación, la fuerza disponible cae al 70%, subiendo al 100% de forma exponencial a las 48h.
    return 70 + 30 * (1 - Math.exp(-0.06 * h));
  };

  // Generar strings de ruta (path) SVG de forma dinámica
  const generateSvgPath = (fn) => {
    let d = "";
    for (let h = 0; h <= 48; h += 2) {
      const val = fn(h);
      const x = (h / 48) * 360 + 30; // 360px de gráfico + 30px offset
      const y = 160 - (val / 100) * 120; // 120px de escala + 20px offset
      if (h === 0) d += `M ${x} ${y}`;
      else d += ` L ${x} ${y}`;
    }
    return d;
  };

  // Descripciones del simulador según separación horaria
  const getSimulatorInsights = (h) => {
    if (h < 4) {
      return {
        level: "Interferencia Crítica (Severa)",
        color: "#ef4444",
        desc: "Las vías metabólicas compiten directamente. AMPK (activada por el running) inhibe mecánicamente el complejo proteico mTORC1. La síntesis de proteínas musculares se apaga por completo. El entrenamiento de fuerza tiene una eficiencia nula para crear músculo y el riesgo de sobrecarga tendinosa se duplica.",
        keyTip: "⚠️ NUNCA realices entrenamientos intensos en el mismo bloque. Estás anulando tus adaptaciones de fuerza."
      };
    } else if (h < 8) {
      return {
        level: "Interferencia Elevada",
        color: "#f97316",
        desc: "AMPK comienza a decaer pero la fatiga neuromuscular central y la depletación de glucógeno en las piernas reducen sustancialmente la capacidad de aplicar fuerza. El 1RM se reduce un 10-15%. La economía de carrera también se ve degradada si corres fatigado.",
        keyTip: "⏱️ Ventana subóptima. Si entrenas aquí, asegúrate de consumir 1.5g de carbohidratos por kg de peso entre sesiones."
      };
    } else if (h < 24) {
      return {
        level: "Interferencia Moderada (Ventana Aceptable)",
        color: "#f59e0b",
        desc: "Separación fisiológica aceptable. Las vías de señalización de hipertrofia celular (mTOR) logran activarse de manera parcial. La fuerza se recupera a un ~90%. Excelente ventana para atletas híbridos que entrenan running por la mañana y piernas por la tarde.",
        keyTip: "🍎 REGLA DE ORO: Prioriza la fuerza de piernas temprano o sepáralas al menos 8h agregando un almuerzo hipercalórico."
      };
    } else {
      return {
        level: "Ventana Óptima de Adaptación Dual",
        color: "#10b981",
        desc: "Ventana científica óptima. Las cascadas hormonales y de señalización intracelular no colisionan. La resíntesis de glucógeno en el cuádriceps e isquiotibiales está al 98%. Puedes entrenar a intensidades máximas tanto de running como de gimnasio logrando adaptaciones puras en ambas vías.",
        keyTip: "🏆 Rendimiento al 100%. Economía de carrera impecable y asimilación de hipertrofia / fuerza intacta."
      };
    }
  };

  const simInsight = getSimulatorInsights(simulatedHours);

  return (
    <div className="concurrent-interference-container animate-fade-in" style={{ padding: '0 0.5rem' }}>
      
      {/* Cabecera Científica */}
      <div className="glass-card card-identity" style={{ padding: '1.25rem', marginBottom: '1.5rem', borderLeft: '4px solid var(--color-primary)' }}>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginBottom: '0.5rem' }}>
          <ShieldAlert className="text-primary-glow" size={22} style={{ color: 'var(--color-primary)' }} />
          <h3 className="card-title" style={{ margin: 0, fontSize: '1.15rem' }}>Monitoreo de Interferencia Concurrente</h3>
        </div>
        <p className="card-subtitle" style={{ fontSize: '0.85rem', lineHeight: '1.45', margin: 0 }}>
          El entrenamiento concurrente mal periodizado sabotea tus ganancias de fuerza. La vía aeróbica **AMPK** inhibe directamente el interruptor de hipertrofia muscular **mTORC1**. Este sistema cruza tu telemetría de running en Zona 4/5 con tus series de piernas para proteger tu masa muscular e indicar tus ventanas óptimas de entrenamiento.
        </p>
      </div>

      {/* FILA DE TELEMETRÍA (Últimas 48 horas reales del usuario) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        
        {/* Card 1: Cardio Alta Intensidad */}
        <div className="glass-card" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', position: 'relative' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '700' }}>Cardio Z4/Z5 (48h)</span>
            <Flame size={16} style={{ color: 'var(--color-running)' }} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.75rem', fontWeight: '800', margin: 0, color: '#fff' }}>
              {telemetry.cardioMins} <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>mins</span>
            </h2>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0.1rem 0 0 0' }}>
              Acumulado: {telemetry.cardioKm} km de carrera exigente
            </p>
          </div>
          <div style={{ height: '3px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${Math.min((telemetry.cardioMins / 60) * 100, 100)}%`, background: 'var(--color-running)', boxShadow: '0 0 8px var(--color-running)' }} />
          </div>
        </div>

        {/* Card 2: Fuerza Piernas */}
        <div className="glass-card" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '700' }}>Fuerza Piernas (48h)</span>
            <Dumbbell size={16} style={{ color: 'var(--color-gym)' }} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.75rem', fontWeight: '800', margin: 0, color: '#fff' }}>
              {telemetry.strengthSets} <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>series</span>
            </h2>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0.1rem 0 0 0' }}>
              Esfuerzo promedio: {telemetry.strengthSets > 0 ? `RPE ${telemetry.avgRpe}` : 'Sin series registradas'}
            </p>
          </div>
          <div style={{ height: '3px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${Math.min((telemetry.strengthSets / 16) * 100, 100)}%`, background: 'var(--color-gym)', boxShadow: '0 0 8px var(--color-gym)' }} />
          </div>
        </div>

        {/* Card 3: Estado de Interferencia Global */}
        <div className="glass-card" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', borderLeft: telemetry.score > 40 ? '3px solid #ef4444' : telemetry.score > 15 ? '3px solid #f97316' : '3px solid #10b981' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '700' }}>Interferencia Global</span>
            <ShieldCheck size={16} style={{ color: telemetry.score > 40 ? '#ef4444' : telemetry.score > 15 ? '#f97316' : '#10b981' }} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: '800', margin: 0, color: telemetry.score > 40 ? '#ef4444' : telemetry.score > 15 ? '#f97316' : '#10b981', textShadow: `0 0 8px ${telemetry.score > 40 ? 'rgba(239,68,68,0.2)' : telemetry.score > 15 ? 'rgba(249,115,22,0.2)' : 'rgba(16,185,129,0.2)'}` }}>
              {telemetry.score > 40 ? 'Riesgo Crítico' : telemetry.score > 15 ? 'Riesgo Moderado' : 'Estado Óptimo'}
            </h2>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0.1rem 0 0 0' }}>
              Puntaje de conflicto: {telemetry.score} / 100
            </p>
          </div>
          
          {/* Fila LED de niveles estilo Ecualizador */}
          <div style={{ display: 'flex', gap: '4px', marginTop: '4px' }}>
            {Array.from({ length: 10 }).map((_, i) => {
              const active = telemetry.score >= (i + 1) * 10 || (telemetry.score === 0 && i === 0);
              let ledColor = "rgba(255,255,255,0.05)";
              if (active) {
                if (i < 3) ledColor = "#10b981"; // Green
                else if (i < 7) ledColor = "#f97316"; // Orange
                else ledColor = "#ef4444"; // Red
              }
              return (
                <div 
                  key={i} 
                  style={{ 
                    flex: 1, 
                    height: '8px', 
                    borderRadius: '2px', 
                    background: ledColor,
                    boxShadow: active ? `0 0 4px ${ledColor}` : 'none',
                    transition: 'all 0.3s ease'
                  }} 
                />
              );
            })}
          </div>
        </div>

      </div>

      {/* SECCIÓN DUAL: SIMULADOR DE CURVA INTERACTIVA & DETALLES */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 360px), 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
        
        {/* Simulador de Curvas SVG */}
        <div className="glass-card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1rem', margin: 0 }}>
            <Activity size={18} style={{ color: 'var(--color-primary)' }} />
            Simulador Fisiológico Molecular
          </h3>
          
          {/* Controles deslizantes */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.5rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>Separación entre sesiones:</span>
              <strong style={{ color: 'var(--color-primary)', fontSize: '0.9rem' }}>{simulatedHours} horas</strong>
            </div>
            
            <input 
              type="range" 
              min="0" 
              max="48" 
              step="1"
              value={simulatedHours}
              onChange={(e) => setSimulatedHours(Number(e.target.value))}
              style={{
                width: '100%',
                height: '6px',
                background: 'rgba(255,255,255,0.08)',
                borderRadius: '3px',
                outline: 'none',
                WebkitAppearance: 'none',
                cursor: 'pointer',
                // Controlar color del slider thumb mediante variables CSS del sistema
                '--slider-thumb-color': 'var(--color-primary)',
                '--slider-thumb-shadow': 'rgba(139,92,246,0.4)'
              }}
              className="premium-slider"
            />
            
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
              <span>0h (Mismo bloque)</span>
              <span>12h</span>
              <span>24h (Día siguiente)</span>
              <span>48h (Ventana total)</span>
            </div>
          </div>

          {/* Gráfico SVG de Vías Moleculares */}
          <div style={{ position: 'relative', width: '100%', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.03)', borderRadius: '12px', padding: '0.5rem' }}>
            <svg viewBox="0 0 400 180" style={{ width: '100%', height: 'auto', display: 'block' }}>
              {/* Líneas de Grilla */}
              <line x1="30" y1="160" x2="390" y2="160" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
              <line x1="30" y1="20" x2="30" y2="160" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
              
              <line x1="30" y1="100" x2="390" y2="100" stroke="rgba(255,255,255,0.03)" strokeDasharray="3 3" />
              <line x1="30" y1="40" x2="390" y2="40" stroke="rgba(255,255,255,0.03)" strokeDasharray="3 3" />

              {/* Textos de Leyendas Ejes */}
              <text x="390" y="175" fill="var(--text-muted)" fontSize="8" textAnchor="end">Tiempo (h)</text>
              <text x="25" y="25" fill="var(--text-muted)" fontSize="8" textAnchor="end" transform="rotate(-90 25 25)">Actividad / Fuerza (%)</text>
              
              {/* Curva 1: AMPK (Cardio) */}
              <path 
                d={generateSvgPath(getAMPKValue)} 
                fill="none" 
                stroke="#06b6d4" 
                strokeWidth="2.5" 
                strokeLinecap="round"
                style={{ filter: 'drop-shadow(0 0 3px rgba(6,182,212,0.3))' }}
              />
              
              {/* Curva 2: mTORC1 (Fuerza) */}
              <path 
                d={generateSvgPath(getmTORC1Value)} 
                fill="none" 
                stroke="#ec4899" 
                strokeWidth="2.5" 
                strokeLinecap="round"
                style={{ filter: 'drop-shadow(0 0 3px rgba(236,72,153,0.3))' }}
              />

              {/* Curva 3: Fuerza Disponible */}
              <path 
                d={generateSvgPath(getFuerzaDisponibleValue)} 
                fill="none" 
                stroke="#10b981" 
                strokeWidth="2" 
                strokeDasharray="4 2"
                strokeLinecap="round"
                style={{ filter: 'drop-shadow(0 0 2px rgba(16,185,129,0.2))' }}
              />

              {/* Línea Dotted de la Hora Simulada */}
              {(() => {
                const xSim = (simulatedHours / 48) * 360 + 30;
                const yAmpk = 160 - (getAMPKValue(simulatedHours) / 100) * 120;
                const yMtor = 160 - (getmTORC1Value(simulatedHours) / 100) * 120;
                const yForce = 160 - (getFuerzaDisponibleValue(simulatedHours) / 100) * 120;

                return (
                  <g>
                    <line x1={xSim} y1="20" x2={xSim} y2="160" stroke="rgba(255,255,255,0.25)" strokeDasharray="3 3" />
                    
                    {/* Intersección AMPK */}
                    <circle cx={xSim} cy={yAmpk} r="4" fill="#06b6d4" stroke="#fff" strokeWidth="1" />
                    {/* Intersección mTOR */}
                    <circle cx={xSim} cy={yMtor} r="4" fill="#ec4899" stroke="#fff" strokeWidth="1" />
                    {/* Intersección Fuerza */}
                    <circle cx={xSim} cy={yForce} r="4" fill="#10b981" stroke="#fff" strokeWidth="1" />
                  </g>
                );
              })()}
            </svg>

            {/* Leyendas del gráfico */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem', flexWrap: 'wrap', marginTop: '0.25rem', fontSize: '0.65rem' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '3px', color: '#06b6d4' }}>
                <span style={{ width: '8px', height: '2px', background: '#06b6d4' }} /> AMPK (Cardio)
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '3px', color: '#ec4899' }}>
                <span style={{ width: '8px', height: '2px', background: '#ec4899' }} /> mTORC1 (Síntesis)
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '3px', color: '#10b981' }}>
                <span style={{ width: '8px', height: '2px', borderTop: '2px dashed #10b981' }} /> Fuerza Neuromuscular
              </span>
            </div>
          </div>
        </div>

        {/* Diagnóstico en Tiempo Real del Simulador */}
        <div className="glass-card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '1rem', borderLeft: `4px solid ${simInsight.color}` }}>
          
          <div>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.5rem' }}>
              <Clock size={16} style={{ color: simInsight.color }} />
              <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>
                Estado de la Ventana Simulada
              </span>
            </div>
            
            <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.15rem', color: '#fff', fontWeight: '800' }}>
              {simInsight.level}
            </h3>
            
            <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: '1.45' }}>
              {simInsight.desc}
            </p>
          </div>

          {/* Métricas clave de rendimiento en esta ventana */}
          <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '10px', padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>Fuerza muscular disponible:</span>
              <strong style={{ color: '#10b981', fontSize: '0.85rem' }}>{Math.round(getFuerzaDisponibleValue(simulatedHours))}%</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>Bloqueo de síntesis proteica (AMPK):</span>
              <strong style={{ color: '#06b6d4', fontSize: '0.85rem' }}>{Math.round(getAMPKValue(simulatedHours))}%</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>Asimilación de hipertrofia (mTORC1):</span>
              <strong style={{ color: '#ec4899', fontSize: '0.85rem' }}>{Math.round(getmTORC1Value(simulatedHours))}%</strong>
            </div>
          </div>

          <div style={{ padding: '0.65rem 0.85rem', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', borderLeft: `2px solid ${simInsight.color}` }}>
            <p style={{ margin: 0, fontSize: '0.75rem', color: '#fff', fontStyle: 'italic', fontWeight: '500' }}>
              {simInsight.keyTip}
            </p>
          </div>

        </div>

      </div>

      {/* BITÁCORA HISTÓRICA DE CONFLICTOS DETECTADOS */}
      <div className="glass-card" style={{ padding: '1.25rem', marginBottom: '1.5rem' }}>
        <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1rem', marginBottom: '1rem' }}>
          <ShieldAlert size={18} style={{ color: 'var(--color-primary)' }} />
          Historial de Colisiones Detectadas (Últimos 60 días)
        </h3>

        {conflictEvents.length > 0 ? (
          <div className="conflicts-timeline" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '420px', overflowY: 'auto', paddingRight: '0.25rem' }}>
            {conflictEvents.map((evt) => (
              <div 
                key={evt.id} 
                className="conflict-card"
                style={{ 
                  padding: '1rem', 
                  background: 'rgba(255,255,255,0.02)', 
                  border: '1px solid rgba(255,255,255,0.05)', 
                  borderLeft: `4px solid ${evt.riskColor}`,
                  borderRadius: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem',
                  boxShadow: `0 2px 10px rgba(0,0,0,0.15)`
                }}
              >
                {/* Cabecera del Conflicto */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div>
                    <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block' }}>
                      Colisión Detectada el {new Date(evt.legWorkout.date + "T00:00:00").toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                    <strong style={{ fontSize: '0.85rem', color: '#fff' }}>
                      Ventana: {evt.windowType} ({evt.order})
                    </strong>
                  </div>
                  <span className="badge" style={{ background: `rgba(${evt.riskColor === '#ef4444' ? '239,68,68' : evt.riskColor === '#f97316' ? '249,115,22' : '234,179,8'}, 0.15)`, color: evt.riskColor, border: `1px solid rgba(${evt.riskColor === '#ef4444' ? '239,68,68' : evt.riskColor === '#f97316' ? '249,115,22' : '234,179,8'}, 0.3)` }}>
                    -{evt.penaltyPercent}% Fuerza Piernas
                  </span>
                </div>

                {/* Detalle de entrenamientos colisionados */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', background: 'rgba(0,0,0,0.1)', padding: '0.65rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.02)' }}>
                  <div>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '0.65rem', color: 'var(--color-running)', fontWeight: '700', textTransform: 'uppercase' }}>
                      🏃 Running Z4/Z5
                    </span>
                    <strong style={{ display: 'block', fontSize: '0.8rem', color: '#fff', marginTop: '0.15rem' }}>
                      {evt.runWorkout.distance} km @ {evt.runWorkout.heartRate ? `${evt.runWorkout.heartRate} bpm` : `RPE ${evt.runWorkout.rpe}`}
                    </strong>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                      Notas: {evt.runWorkout.notes ? (evt.runWorkout.notes.length > 30 ? `${evt.runWorkout.notes.slice(0, 30)}...` : evt.runWorkout.notes) : 'Sin notas'}
                    </span>
                  </div>
                  
                  <div>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '0.65rem', color: 'var(--color-gym)', fontWeight: '700', textTransform: 'uppercase' }}>
                      🏋️ Fuerza Piernas
                    </span>
                    <strong style={{ display: 'block', fontSize: '0.8rem', color: '#fff', marginTop: '0.15rem' }}>
                      {evt.legWorkout.sessionName || "Sesión de Piernas"}
                    </strong>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                      {getLegStats(evt.legWorkout).sets} series @ RPE {getLegStats(evt.legWorkout).avgRpe}
                    </span>
                  </div>
                </div>

                {/* Consejo específico del deportólogo */}
                <div style={{ display: 'flex', gap: '0.45rem', alignItems: 'flex-start', fontSize: '0.75rem', color: 'var(--text-muted)', borderTop: '1px solid rgba(255,255,255,0.03)', paddingTop: '0.5rem' }}>
                  <Info size={14} style={{ color: evt.riskColor, flexShrink: 0, marginTop: '1px' }} />
                  <p style={{ margin: 0, lineHeight: '1.4' }}>
                    <strong>Fisiología:</strong> {evt.recoveryAdvice}
                  </p>
                </div>

              </div>
            ))}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem 1rem', textAlign: 'center', background: 'rgba(16,185,129,0.03)', border: '1px dashed rgba(16,185,129,0.2)', borderRadius: '12px' }}>
            <Award size={36} style={{ color: '#10b981', marginBottom: '0.5rem', filter: 'drop-shadow(0 0 8px rgba(16,185,129,0.2))' }} />
            <h4 style={{ margin: '0 0 0.25rem 0', color: '#fff', fontSize: '0.95rem' }}>¡Excelente Periodización!</h4>
            <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)', maxWidth: '400px', lineHeight: '1.4' }}>
              No se detectan colisiones de interferencia concurrente (carrera exigente y entrenamiento de piernas el mismo día o días seguidos) en tus últimos 60 días. Estás absorbiendo el anabolismo muscular al máximo.
            </p>
          </div>
        )}
      </div>

      {/* GUÍA RÁPIDA: MEDICINA DEPORTIVA HÍBRIDA */}
      <div className="glass-card" style={{ padding: '1.25rem', background: 'linear-gradient(135deg, rgba(139,92,246,0.03) 0%, rgba(6,182,212,0.03) 100%)', border: '1px solid rgba(139,92,246,0.1)' }}>
        <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1rem', margin: '0 0 1rem 0' }}>
          <HelpCircle size={18} style={{ color: 'var(--color-primary)' }} />
          Estrategias Científicas para Atletas Híbridos
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <strong style={{ color: '#fff', fontSize: '0.8rem' }}>1. Orden de las Sesiones</strong>
            <p style={{ margin: 0, lineHeight: '1.4' }}>
              Si debes entrenar ambos en el mismo día, realiza la sesión de **fuerza de piernas primero**. Si corres antes, la fatiga del SNC degradará tu reclutamiento fibrilar. Si corres después, hazlo suave en **Zona 1/2** para no activar excesivamente AMPK.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <strong style={{ color: '#fff', fontSize: '0.8rem' }}>2. Nutrición Post-Cardio</strong>
            <p style={{ margin: 0, lineHeight: '1.4' }}>
              Tras correr a alta intensidad, consume carbohidratos de asimilación rápida combinados con **25g de proteína rica en Leucina** (o BCAA). Esto ayuda a resintetizar el glucógeno rápidamente y ejerce una señal de apagado sobre AMPK, reactivando mTORC1.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <strong style={{ color: '#fff', fontSize: '0.8rem' }}>3. Descanso Táctico</strong>
            <p style={{ margin: 0, lineHeight: '1.4' }}>
              Separa tus entrenamientos pesados de sentadilla / peso muerto al menos **24 horas** de las pasadas rápidas o cuestas en running. Las carreras continuas regenerativas de baja intensidad (Zona 2) no causan interferencia y promueven la recuperación vascular.
            </p>
          </div>

        </div>
      </div>
      
      {/* Scrollbar estilizado en la bitácora */}
      <style>{`
        .conflicts-timeline::-webkit-scrollbar {
          width: 5px;
        }
        .conflicts-timeline::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.01);
          border-radius: 4px;
        }
        .conflicts-timeline::-webkit-scrollbar-thumb {
          background: rgba(139, 92, 246, 0.2);
          border-radius: 4px;
        }
        .conflicts-timeline::-webkit-scrollbar-thumb:hover {
          background: rgba(139, 92, 246, 0.4);
        }
        .premium-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: var(--slider-thumb-color, var(--color-primary));
          box-shadow: 0 0 10px var(--slider-thumb-shadow, rgba(139,92,246,0.4));
          border: 1.5px solid #fff;
          cursor: pointer;
          transition: transform 0.1s ease;
        }
        .premium-slider::-webkit-slider-thumb:hover {
          transform: scale(1.2);
        }
        .premium-slider::-moz-range-thumb {
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: var(--slider-thumb-color, var(--color-primary));
          box-shadow: 0 0 10px var(--slider-thumb-shadow, rgba(139,92,246,0.4));
          border: 1.5px solid #fff;
          cursor: pointer;
          transition: transform 0.1s ease;
        }
        .premium-slider::-moz-range-thumb:hover {
          transform: scale(1.2);
        }
      `}</style>

    </div>
  );
}
