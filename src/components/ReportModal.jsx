import React, { useState } from 'react';
import { 
  X, 
  Printer, 
  Calendar, 
  Activity, 
  TrendingUp, 
  Dumbbell, 
  Award, 
  Scale, 
  User, 
  Clock, 
  Heart,
  ChevronDown,
  Sparkles,
  CheckCircle,
  ShieldAlert,
  Copy,
  Bot
} from 'lucide-react';
import { secondsToTimeString, formatPace, timeStringToSeconds, calculateDecayedHistoricalRunningMetrics, getRunningExponentDetails, getBestEffortFromSplits, calculate1RM } from '../utils/calculators';
import { calculateAchievements } from '../utils/achievements';

export default function ReportModal({ workouts, profile, onClose }) {
  const [period, setPeriod] = useState('30-days'); // '30-days', 'current-month', 'last-month', 'all-time'
  
  // Personal Athlete profile metrics
  const age = profile?.age || 25;
  const weight = profile?.weight || 75;
  const height = profile?.height || 175;
  const restingHR = profile?.restingHR || 60;
  const gender = profile?.gender === 'female' ? 'Femenino' : 'Masculino';

  // --- 1. PERIOD DATE FILTERING ---
  const getFilteredWorkouts = () => {
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    return workouts.filter(w => {
      if (!w.date) return false;
      const wDate = new Date(w.date + 'T00:00:00'); // avoid timezone shifts

      if (period === '30-days') {
        const thirtyDaysAgo = new Date(today);
        thirtyDaysAgo.setDate(today.getDate() - 30);
        thirtyDaysAgo.setHours(0, 0, 0, 0);
        return wDate >= thirtyDaysAgo && wDate <= today;
      }
      if (period === 'current-month') {
        return wDate.getMonth() === today.getMonth() && wDate.getFullYear() === today.getFullYear();
      }
      if (period === 'last-month') {
        const lastMonth = new Date(today);
        lastMonth.setMonth(today.getMonth() - 1);
        return wDate.getMonth() === lastMonth.getMonth() && wDate.getFullYear() === lastMonth.getFullYear();
      }
      return true; // 'all-time'
    });
  };

  const filtered = getFilteredWorkouts().sort((a, b) => new Date(a.date + 'T00:00:00') - new Date(b.date + 'T00:00:00'));
  
  // --- 2. STATISTICS COMPUTATIONS ---
  
  // Running stats
  const runs = filtered.filter(w => w.type === 'running');
  const runningCount = runs.length;
  const totalKm = runs.reduce((sum, w) => sum + (Number(w.distance) || 0), 0);
  const totalRunningSeconds = runs.reduce((sum, w) => sum + timeStringToSeconds(w.duration), 0);
  const avgPaceSecs = totalKm > 0 ? totalRunningSeconds / totalKm : 0;
  
  let bestPaceSecs = Infinity;
  runs.forEach(w => {
    const d = Number(w.distance) || 0;
    if (d > 0) {
      const pace = timeStringToSeconds(w.duration) / d;
      if (pace < bestPaceSecs) bestPaceSecs = pace;
    }
  });
  if (bestPaceSecs === Infinity) bestPaceSecs = 0;

  const hrRuns = runs.filter(w => w.heartRate && Number(w.heartRate) > 0);
  const avgHR = hrRuns.length > 0 
    ? Math.round(hrRuns.reduce((sum, w) => sum + Number(w.heartRate), 0) / hrRuns.length) 
    : 0;

  // Terrain distribution
  const terrains = {};
  runs.forEach(w => {
    if (w.terrain) {
      const t = w.terrain.charAt(0).toUpperCase() + w.terrain.slice(1).toLowerCase();
      terrains[t] = (terrains[t] || 0) + 1;
    }
  });

  // Gym stats
  const gymSessions = filtered.filter(w => w.type === 'gym');
  const gymCount = gymSessions.length;
  let totalVol = 0;
  let maxWeight = 0;

  gymSessions.forEach(w => {
    if (w.exercises && Array.isArray(w.exercises)) {
      w.exercises.forEach(ex => {
        if (Array.isArray(ex.sets)) {
          ex.sets.forEach(s => {
            if (s.done !== false) {
              const weightVal = parseFloat(s.weight) || 0;
              const repsVal = parseFloat(s.reps) || 0;
              totalVol += weightVal * repsVal;
              if (weightVal > maxWeight) {
                maxWeight = weightVal;
              }
            }
          });
        } else {
          const setsVal = Number(ex.sets) || 0;
          const repsVal = Number(ex.reps) || 0;
          const weightVal = Number(ex.weight) || 0;
          totalVol += setsVal * repsVal * weightVal;
          if (weightVal > maxWeight) {
            maxWeight = weightVal;
          }
        }
      });
    }
  });

  // 1RM Estimations Scanner
  const getBestLiftAnd1RM = (keywords) => {
    let bestLift = { weight: 0, reps: 0, exerciseName: '', date: '', oneRepMax: 0 };

    filtered.forEach(w => {
      if (w.type === 'gym' && w.exercises && Array.isArray(w.exercises)) {
        w.exercises.forEach(ex => {
          const name = (ex.name || '').toLowerCase();
          const matches = keywords.some(keyword => name.includes(keyword));
          if (matches) {
            if (Array.isArray(ex.sets)) {
              ex.sets.forEach(s => {
                if (s.done !== false) {
                  const weight = Number(s.weight) || 0;
                  const reps = Number(s.reps) || 0;
                  const calculated1RM = calculate1RM(weight, reps, s.rpe);
                  
                  if (calculated1RM > bestLift.oneRepMax) {
                    bestLift = {
                      weight,
                      reps,
                      exerciseName: ex.name,
                      date: w.date,
                      oneRepMax: calculated1RM
                    };
                  }
                }
              });
            } else {
              const weight = Number(ex.weight) || 0;
              const reps = Number(ex.reps) || 0;
              const calculated1RM = calculate1RM(weight, reps, ex.rpe || w.rpe);
              
              if (calculated1RM > bestLift.oneRepMax) {
                bestLift = {
                  weight,
                  reps,
                  exerciseName: ex.name,
                  date: w.date,
                  oneRepMax: calculated1RM
                };
              }
            }
          }
        });
      }
    });

    return bestLift.oneRepMax > 0 ? bestLift : null;
  };

  const bestBench = getBestLiftAnd1RM(['banca', 'bench', 'pecho']);
  const bestSquat = getBestLiftAnd1RM(['sentadilla', 'squat', 'pierna']);
  const bestDeadlift = getBestLiftAnd1RM(['muerto', 'deadlift', 'espalda baja']);

  // Unlocked Medals
  const achievements = calculateAchievements(workouts, profile);
  const unlockedAchievements = achievements.filter(a => a.isUnlocked);

  // Period label translator
  const getPeriodLabel = () => {
    switch (period) {
      case '30-days': return 'Últimos 30 días';
      case 'current-month': return 'Mes Actual';
      case 'last-month': return 'Mes Anterior';
      case 'all-time': return 'Historial Histórico Completo';
      default: return 'Período Personalizado';
    }
  };

  // Date range label computed
  const getDateRangeLabel = () => {
    if (filtered.length === 0) return 'Sin entrenamientos registrados';
    const firstDate = new Date(filtered[0].date + 'T00:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
    const lastDate = new Date(filtered[filtered.length - 1].date + 'T00:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
    return `${firstDate} - ${lastDate}`;
  };

  // Trigger browser print dialog
  const handlePrint = () => {
    window.print();
  };

  const [copiedForAI, setCopiedForAI] = useState(false);

  const generateMarkdownReport = () => {
    // Calcular métricas de telemetría avanzadas e historial
    const decayedMetrics = calculateDecayedHistoricalRunningMetrics(workouts, profile);
    const exponentDetails = getRunningExponentDetails(profile, workouts);

    // Calcular récords de honor (incluyendo splits contiguos)
    const targets = [
      { label: 'Mejor 1K', distance: 1.0 },
      { label: 'Mejor 5K', distance: 5.0 },
      { label: 'Mejor 10K', distance: 10.0 },
      { label: 'Medio Maratón (21.1k)', distance: 21.097 },
      { label: 'Maratón (42.2k)', distance: 42.195 }
    ];

    const runsHistory = workouts.filter(w => w.type === 'running' && w.distance > 0 && w.duration);
    const calculatedPRs = targets.map(target => {
      let bestEstimatedSeconds = Infinity;
      let matchingWorkout = null;
      let isFromSplits = false;

      runsHistory.forEach(run => {
        const dist = Number(run.distance);
        const workoutSplits = run.splits || run.advanced_metrics?.splits;

        // 1. Escanear parciales contiguos (splits)
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

        // 2. Comportamiento convencional
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

    let md = `# Reporte Analítico de Rendimiento Atleta\n\n`;
    md += `**Fecha de generación:** ${new Date().toLocaleDateString('es-ES')}\n`;
    md += `**Período evaluado:** ${getPeriodLabel()} (${getDateRangeLabel()})\n\n`;
    
    md += `## 1. Perfil del Atleta\n`;
    md += `- **Género:** ${gender}\n`;
    md += `- **Edad:** ${age} años\n`;
    md += `- **Peso Corporal:** ${weight} kg\n`;
    md += `- **Estatura:** ${height} cm\n`;
    md += `- **Frecuencia Cardíaca en Reposo:** ${restingHR} bpm\n\n`;

    md += `## 2. Telemetría Cardiovascular y Fisiológica Avanzada\n`;
    md += `- **VDOT Mecánico Ponderado (Daniels):** ${decayedMetrics.weightedVdot} ml/kg/min\n`;
    md += `- **VO2máx Cardíaco Ponderado (ACSM):** ${decayedMetrics.hasHRData ? `${decayedMetrics.weightedVo2MaxHR} ml/kg/min` : 'Sin datos cardíacos suficientes'}\n`;
    md += `- **Exponente de Fatiga Calibrado (Riegel):** ${exponentDetails.finalExponent} (${exponentDetails.hasCalculatedFromRecords ? 'Calibrado de récords reales' : 'Estimado por biometría/volumen'})\n`;
    md += `- **Diagnóstico y Plan Recomendado:** ${exponentDetails.recommendation}\n\n`;

    md += `## 3. Cuadro de Honor y Récords Personales (Extracción Contigua Laps/Splits)\n`;
    calculatedPRs.forEach(pr => {
      if (pr.bestTime) {
        const originType = pr.isFromSplits 
          ? `⚡ Parcial óptimo de corrida de ${pr.workout.distance} km` 
          : `Actividad completa de ${pr.workout.distance} km`;
        md += `- **${pr.label}:** ${pr.bestTime} (Ritmo: ${pr.bestPace}) | Origen: ${originType} el ${new Date(pr.workout.date + 'T00:00:00').toLocaleDateString('es-ES')}\n`;
      } else {
        md += `- **${pr.label}:** Pendiente de registrar (Requiere correr ${pr.distance} km o más)\n`;
      }
    });
    md += `\n`;

    md += `## 4. Resumen Macrociclo (Global del Periodo)\n`;
    md += `- Sesiones de Running Totales: ${runningCount}\n`;
    md += `- Distancia Acumulada: ${totalKm.toFixed(2)} km\n`;
    md += `- Ritmo Promedio Ponderado: ${formatPace(avgPaceSecs)} min/km\n`;
    if (gymCount > 0) {
      md += `- Sesiones de Fuerza Totales: ${gymCount}\n`;
      md += `- Volumen de Carga Total: ${totalVol} kg\n`;
    }
    
    md += `\n## 5. Récords Biomecánicos (Fuerza Máxima - 1RM)\n`;
    if (bestBench) md += `- Bench Press: ${Math.round(bestBench.oneRepMax)} kg (Con base en: ${bestBench.weight}kg x ${bestBench.reps})\n`;
    if (bestSquat) md += `- Squat: ${Math.round(bestSquat.oneRepMax)} kg (Con base en: ${bestSquat.weight}kg x ${bestSquat.reps})\n`;
    if (bestDeadlift) md += `- Deadlift: ${Math.round(bestDeadlift.oneRepMax)} kg (Con base en: ${bestDeadlift.weight}kg x ${bestDeadlift.reps})\n`;
    if (!bestBench && !bestSquat && !bestDeadlift) md += `- Sin registros concluyentes en este periodo.\n`;

    md += `\n## 6. Historial Detallado de Sesiones\n`;
    filtered.forEach((w, i) => {
      md += `### [${w.date}] Sesión ${i+1}: ${w.type === 'running' ? 'Running' : 'Fuerza'}\n`;
      if (w.type === 'running') {
        md += `- Distancia: ${w.distance} km | Duración: ${w.duration}\n`;
        if (w.heartRate) md += `- Frecuencia Cardíaca Media: ${w.heartRate} bpm\n`;
        if (w.rpe) md += `- RPE (Esfuerzo Percibido): ${w.rpe}/10\n`;
        if (w.elevationGain) md += `- Desnivel Positivo: +${w.elevationGain}m\n`;
        if (w.maxSpeed) md += `- Vel. Máx: ${w.maxSpeed} km/h\n`;
        if (w.avgCadence) md += `- Cadencia Promedio: ${w.avgCadence} spm\n`;
        if (w.splits && w.splits.length > 0) {
          md += `- Splits Registrados:\n`;
          w.splits.forEach(s => md += `  - Km ${s.splitNumber || s.km}: ${s.time} (Distancia: ${s.distance ? s.distance + 'm' : '1000m'})\n`);
        }
      } else {
        md += `- Enfoque Muscular: ${(w.trainedMuscles && w.trainedMuscles.length > 0) ? w.trainedMuscles.join(', ') : (w.muscleGroup || 'Full Body')}\n`;
        if (w.rpe) md += `- RPE (Esfuerzo Percibido): ${w.rpe}/10\n`;
        if (w.exercises && w.exercises.length > 0) {
          md += `- Rutina Ejercutada:\n`;
          w.exercises.forEach(ex => {
            if (Array.isArray(ex.sets)) {
              const setsStr = ex.sets.map((s, sIdx) => {
                const isWarmup = s.type === 'warmup';
                const typeText = isWarmup ? 'Calentamiento' : `Serie ${sIdx + 1}`;
                const rpeText = s.rpe ? `, RPE ${s.rpe}` : '';
                const restText = s.rest ? `, Descanso ${s.rest}s` : '';
                const doneText = s.done ? '' : ' [No completada]';
                return `${s.reps}x${s.weight}kg (${typeText}${rpeText}${restText})${doneText}`;
              }).join(' | ');
              md += `  - ${ex.name}: [${setsStr}] \n`;
            } else {
              md += `  - ${ex.name}: ${ex.sets}x${ex.reps} @ ${ex.weight} kg (RPE ${ex.rpe || w.rpe || '-'}) \n`;
            }
          });
        }
      }
      if (w.notes) md += `- Observaciones del Atleta: "${w.notes}"\n`;
      md += `\n`;
    });

    return md;
  };

  const handleExportForAI = () => {
    const text = generateMarkdownReport();
    navigator.clipboard.writeText(text).then(() => {
      setCopiedForAI(true);
      setTimeout(() => setCopiedForAI(false), 2500);
    });
  };

  return (
    <div className="modal-backdrop report-modal-backdrop">
      <div className="report-modal-wrapper glass-card fade-in">
        
        {/* MODAL HEADER */}
        <header className="report-modal-header">
          <div className="header-icon-title">
            <Printer size={22} className="text-primary animate-pulse" />
            <div>
              <h2 className="gradient-text font-extrabold" style={{ margin: 0, fontSize: '1.25rem' }}>
                Generador de Reporte PDF
              </h2>
              <span className="text-secondary text-xs">Previsualiza y exporta tu ficha de rendimiento físico</span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {/* Period Selector Dropdown */}
            <div className="select-wrapper">
              <Calendar size={14} className="select-icon" />
              <select 
                value={period} 
                onChange={(e) => setPeriod(e.target.value)} 
                className="toolbar-select"
                style={{ width: '170px', padding: '0.45rem 0.75rem 0.45rem 1.8rem', fontSize: '0.82rem', minHeight: '36px' }}
              >
                <option value="30-days">Últimos 30 días</option>
                <option value="current-month">Mes Actual</option>
                <option value="last-month">Mes Anterior</option>
                <option value="all-time">Todo el Historial</option>
              </select>
            </div>

            <button 
              onClick={handleExportForAI} 
              className="btn btn-secondary flex-center export-ai-btn" 
              style={{ gap: '6px', minHeight: '36px', padding: '0.4rem 1rem', fontSize: '0.85rem', position: 'relative', overflow: 'hidden', whiteSpace: 'nowrap' }}
            >
              {copiedForAI ? (
                <>
                  <CheckCircle size={16} style={{ color: '#10b981' }} />
                  <span className="hide-text-mobile" style={{ color: '#10b981', fontWeight: 600 }}>¡Copiado!</span>
                </>
              ) : (
                <>
                  <Bot size={16} />
                  <span className="hide-text-mobile">Copiar para IA</span>
                </>
              )}
            </button>

            <button onClick={handlePrint} className="btn btn-primary flex-center print-trigger-btn" style={{ gap: '6px', minHeight: '36px', padding: '0.4rem 1rem', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
              <Printer size={16} />
              <span className="hide-text-mobile">Imprimir / PDF</span>
            </button>

            <button onClick={onClose} className="btn-close-modal" title="Cerrar modal">
              <X size={20} />
            </button>
          </div>
        </header>

        {/* --- PANTALLA: MODAL PREVIEW SCROLL CONTAINER --- */}
        <div className="report-preview-scroll-container">
          
          <div className="printable-report-container">
            
            {/* REPORT BANNER LOGO */}
            <div className="report-print-banner">
              <div className="brand-logo-print">
                <TrendingUp size={24} style={{ color: '#8b5cf6' }} />
                <span>FitAnalytics</span>
              </div>
              <div className="doc-meta-print">
                <span className="doc-title-print">DOSSIER DE RENDIMIENTO ATLETICO</span>
                <span className="doc-date-print">Generado: {new Date().toLocaleDateString('es-ES')}</span>
              </div>
            </div>

            <hr className="print-divider" />

            {/* ATHLETE PERSONAL DOSSIER INFO */}
            <div className="report-section-grid no-gap-print" style={{ gridTemplateColumns: '1.2fr 2fr', gap: '1.5rem' }}>
              
              {/* Athlete Identity Card */}
              <div className="glass-card report-athlete-card">
                <h3 className="section-subtitle-compact">
                  <User size={15} className="icon-tint" />
                  Perfil del Atleta
                </h3>
                <ul className="athlete-details-list">
                  <li>
                    <span className="detail-label">Género:</span>
                    <span className="detail-value font-bold">{gender}</span>
                  </li>
                  <li>
                    <span className="detail-label">Edad:</span>
                    <span className="detail-value font-bold">{age} años</span>
                  </li>
                  <li>
                    <span className="detail-label">Peso Corporal:</span>
                    <span className="detail-value font-bold">{weight} kg</span>
                  </li>
                  <li>
                    <span className="detail-label">Estatura:</span>
                    <span className="detail-value font-bold">{height} cm</span>
                  </li>
                  <li>
                    <span className="detail-label">FC en Reposo:</span>
                    <span className="detail-value font-bold">{restingHR} bpm</span>
                  </li>
                </ul>
              </div>

              {/* Report period & general summary */}
              <div className="glass-card report-athlete-card">
                <h3 className="section-subtitle-compact">
                  <Sparkles size={15} className="icon-tint" />
                  Resumen de Actividades en el Período
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '0.85rem' }}>
                  <div>
                    <span className="detail-label">Rango del Reporte:</span>
                    <span className="detail-value font-bold" style={{ color: 'var(--color-primary)', marginLeft: '6px' }}>{getPeriodLabel()}</span>
                  </div>
                  <div>
                    <span className="detail-label">Fechas comprendidas:</span>
                    <span className="detail-value" style={{ marginLeft: '6px', fontSize: '0.82rem' }}>{getDateRangeLabel()}</span>
                  </div>
                </div>
                
                <div className="report-mini-stats-grid">
                  <div className="mini-stat-card">
                    <span className="mini-stat-num text-running">{runningCount}</span>
                    <span className="mini-stat-lbl">Corridas</span>
                  </div>
                  <div className="mini-stat-card">
                    <span className="mini-stat-num text-running">{totalKm.toFixed(1)} km</span>
                    <span className="mini-stat-lbl">Distancia</span>
                  </div>
                  <div className="mini-stat-card">
                    <span className="mini-stat-num text-gym">{gymCount}</span>
                    <span className="mini-stat-lbl">Sesiones Fuerza</span>
                  </div>
                  <div className="mini-stat-card">
                    <span className="mini-stat-num text-gym">{(totalVol / 1000).toFixed(1)}t</span>
                    <span className="mini-stat-lbl">Volumen (t)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* RUNNING TELEMETRY SECTION */}
            <div className="report-main-section glass-card">
              <h3 className="section-subtitle">
                <Activity size={16} className="text-running" />
                Métricas de Resistencia & Fisiología Cardiovascular
              </h3>

              {runningCount === 0 ? (
                <div className="no-data-report-box">
                  <ShieldAlert size={18} className="text-secondary" style={{ marginRight: '6px' }} />
                  <span>No hay actividades de Running registradas en el período seleccionado.</span>
                </div>
              ) : (
                <div className="report-section-grid" style={{ gridTemplateColumns: '2fr 1fr' }}>
                  
                  {/* Detailed Running parameters */}
                  <table className="report-data-table">
                    <thead>
                      <tr>
                        <th>Métrica de Resistencia</th>
                        <th className="right">Valor de Rendimiento</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>Distancia Acumulada</td>
                        <td className="right font-bold text-running">{totalKm.toFixed(2)} km</td>
                      </tr>
                      <tr>
                        <td>Tiempo Total de Carrera</td>
                        <td className="right">{secondsToTimeString(runningRunningSecondsVal())}</td>
                      </tr>
                      <tr>
                        <td>Ritmo Promedio Ponderado</td>
                        <td className="right font-bold">{formatPace(avgPaceSecs)}</td>
                      </tr>
                      <tr>
                        <td>Mejor Ritmo Registrado</td>
                        <td className="right font-bold" style={{ color: '#10b981' }}>{formatPace(bestPaceSecs)}</td>
                      </tr>
                      <tr>
                        <td>Frecuencia Cardíaca Promedio</td>
                        <td className="right font-bold" style={{ color: '#ef4444' }}>
                          {avgHR > 0 ? `${avgHR} bpm` : 'Sin Telemetría'}
                        </td>
                      </tr>
                    </tbody>
                  </table>

                  {/* Terrain Distribution */}
                  <div className="report-nested-box">
                    <h4 className="nested-box-title">Distribución de Terrenos</h4>
                    {Object.keys(terrains).length === 0 ? (
                      <span className="text-secondary text-xs">Sin especificar terrenos</span>
                    ) : (
                      <ul className="terrain-distribution-list">
                        {Object.entries(terrains).map(([terrain, count]) => {
                          const pct = Math.round((count / runningCount) * 100);
                          return (
                            <li key={terrain}>
                              <div className="terrain-bar-label">
                                <span>{terrain}</span>
                                <span>{count} ({pct}%)</span>
                              </div>
                              <div className="terrain-bar-track">
                                <div className="terrain-bar-fill" style={{ width: `${pct}%`, background: 'var(--color-running)' }}></div>
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* STRENGTH & FORCE ESTIMATIONS SECTION */}
            <div className="report-main-section glass-card page-break-print">
              <h3 className="section-subtitle">
                <Dumbbell size={16} className="text-gym" />
                Métricas de Sobrecarga Progresiva & Estimaciones de Fuerza Máxima (1RM)
              </h3>

              {gymCount === 0 ? (
                <div className="no-data-report-box">
                  <ShieldAlert size={18} className="text-secondary" style={{ marginRight: '6px' }} />
                  <span>No hay entrenamientos de Fuerza (Gimnasio) registrados en el período seleccionado.</span>
                </div>
              ) : (
                <div className="report-section-grid" style={{ gridTemplateColumns: '1fr', gap: '1.25rem' }}>
                  
                  {/* General summary of lifts */}
                  <div className="report-section-row-stats" style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', background: 'rgba(255,255,255,0.01)', padding: '0.85rem', borderRadius: '8px', border: '1px solid var(--border-light)' }}>
                    <div>
                      <span className="detail-label">Sesiones Realizadas:</span>
                      <span className="detail-value font-bold" style={{ marginLeft: '5px' }}>{gymCount}</span>
                    </div>
                    <div>
                      <span className="detail-label">Volumen Acumulado en Fuerza:</span>
                      <span className="detail-value font-bold text-gym" style={{ marginLeft: '5px' }}>{totalVol.toLocaleString('es-ES')} kg</span>
                    </div>
                    <div>
                      <span className="detail-label">Carga Máxima Levantada:</span>
                      <span className="detail-value font-bold" style={{ marginLeft: '5px' }}>{maxWeight} kg</span>
                    </div>
                  </div>

                  {/* 1RM Estimations dossier table */}
                  <div>
                    <h4 className="nested-box-title" style={{ marginBottom: '0.65rem' }}>Ficha de 1RM Teórico (Estimaciones Científicas)</h4>
                    <table className="report-data-table">
                      <thead>
                        <tr>
                          <th>Movimiento Patrón</th>
                          <th>Ejercicio Específico</th>
                          <th className="center">Mejor Serie</th>
                          <th className="right">1RM Teórico Estimado</th>
                          <th className="right">Fecha del Logro</th>
                        </tr>
                      </thead>
                      <tbody>
                        {/* Bench Press */}
                        <tr>
                          <td className="font-bold">Bench Press (Empuje Pecho)</td>
                          <td>{bestBench ? bestBench.exerciseName : 'Sin Registro'}</td>
                          <td className="center">{bestBench ? `${bestBench.weight}kg × ${bestBench.reps}` : '-'}</td>
                          <td className="right font-bold text-gym">{bestBench ? `${Math.round(bestBench.oneRepMax)} kg` : '-'}</td>
                          <td className="right text-secondary" style={{ fontSize: '0.8rem' }}>
                            {bestBench ? new Date(bestBench.date + 'T00:00:00').toLocaleDateString('es-ES') : '-'}
                          </td>
                        </tr>
                        {/* Squat */}
                        <tr>
                          <td className="font-bold">Squat (Pierna/Sentadilla)</td>
                          <td>{bestSquat ? bestSquat.exerciseName : 'Sin Registro'}</td>
                          <td className="center">{bestSquat ? `${bestSquat.weight}kg × ${bestSquat.reps}` : '-'}</td>
                          <td className="right font-bold text-gym">{bestSquat ? `${Math.round(bestSquat.oneRepMax)} kg` : '-'}</td>
                          <td className="right text-secondary" style={{ fontSize: '0.8rem' }}>
                            {bestSquat ? new Date(bestSquat.date + 'T00:00:00').toLocaleDateString('es-ES') : '-'}
                          </td>
                        </tr>
                        {/* Deadlift */}
                        <tr>
                          <td className="font-bold">Deadlift (Fuerza Espalda/Peso Muerto)</td>
                          <td>{bestDeadlift ? bestDeadlift.exerciseName : 'Sin Registro'}</td>
                          <td className="center">{bestDeadlift ? `${bestDeadlift.weight}kg × ${bestDeadlift.reps}` : '-'}</td>
                          <td className="right font-bold text-gym">{bestDeadlift ? `${Math.round(bestDeadlift.oneRepMax)} kg` : '-'}</td>
                          <td className="right text-secondary" style={{ fontSize: '0.8rem' }}>
                            {bestDeadlift ? new Date(bestDeadlift.date + 'T00:00:00').toLocaleDateString('es-ES') : '-'}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                    <div style={{ marginTop: '0.65rem', background: 'rgba(255,255,255,0.015)', padding: '0.65rem 0.85rem', borderRadius: '6px', fontSize: '0.72rem', color: 'var(--text-secondary)', borderLeft: '3px solid var(--color-primary)' }}>
                      <strong>Nota Metodológica de Fuerza:</strong> El 1RM (Una Repetición Máxima) se estima utilizando los modelos científicos de Epley y Brzycki con corrección dinámica de RPE/RIR (Esfuerzo Percibido / Repeticiones en Reserva) para una precisión de grado profesional. Las equivalencias y el volumen se procesan en el período del reporte para calcular tu carga de fuerza absoluta.
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* UNLOCKED ATHLETIC ACHIEVEMENTS */}
            <div className="report-main-section glass-card" style={{ marginBottom: '2rem' }}>
              <h3 className="section-subtitle">
                <Award size={16} className="text-primary" />
                Medallas de Rendimiento & Hitos Desbloqueados
              </h3>

              {unlockedAchievements.length === 0 ? (
                <div className="no-data-report-box">
                  <ShieldAlert size={18} className="text-secondary" style={{ marginRight: '6px' }} />
                  <span>El atleta aún no ha desbloqueado medallas de rendimiento en esta temporada.</span>
                </div>
              ) : (
                <div>
                  <div className="unlocked-medals-grid-print">
                    {unlockedAchievements.map(ach => (
                      <div key={ach.id} className="medal-mini-card-print">
                        <span className="medal-mini-icon-print">🏆</span>
                        <div className="medal-mini-text-print">
                          <span className="medal-mini-title-print">{ach.title}</span>
                          <span className="medal-mini-desc-print">{ach.subtitle}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* PRINT SIGNATURE BLOCK & HEALTH COACH SEAL */}
            <div className="report-print-footer">
              <div className="coach-advice-box">
                <h4 style={{ margin: '0 0 0.35rem 0', fontSize: '0.85rem', fontWeight: '800' }}>🔬 RECOMENDACIÓN DEL VIRTUAL HEALTH COACH</h4>
                <p style={{ margin: 0, fontSize: '0.78rem', lineHeight: '1.4' }}>
                  El perfil cardiovascular del deportista refleja un balance saludable entre sesiones de resistencia e hipertrofia. Recomendamos planificar descargas estratégicas de volumen total cada 4-6 semanas y mantener el 80% del volumen de running en la Zona 2 para optimizar la densidad de capilares y la biogénesis mitocondrial, manteniendo el sistema nervioso libre de fatiga crónica.
                </p>
              </div>

              <div className="print-signature-grid">
                <div className="signature-box">
                  <div className="signature-line"></div>
                  <span className="signature-label">Firma del Atleta</span>
                </div>
                <div className="signature-box">
                  <div className="signature-line"></div>
                  <span className="signature-label">Firma del Entrenador / Nutricionista</span>
                </div>
              </div>
            </div>

          </div>

        </div>

      </div>

      <style>{`
        /* MODAL WINDOW SYSTEM STYLING (ON SCREEN VIEW) */
        .report-modal-backdrop {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.7);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          z-index: 10005;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1.5rem;
        }

        .report-modal-wrapper {
          width: 100%;
          max-width: 900px;
          height: 90%;
          max-height: 850px;
          display: flex;
          flex-direction: column;
          background: var(--bg-surface-solid);
          border: 1px solid var(--border-light);
          border-radius: 20px;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.6);
          overflow: hidden;
        }

        .report-modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1.25rem 1.5rem;
          border-bottom: 1px solid var(--border-light);
          background: rgba(14, 17, 26, 0.5);
          flex-shrink: 0;
        }

        .header-icon-title {
          display: flex;
          align-items: center;
          gap: 0.85rem;
        }

        .btn-close-modal {
          background: none;
          border: none;
          color: var(--text-secondary);
          cursor: pointer;
          transition: color 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 4px;
          border-radius: 50%;
        }

        .btn-close-modal:hover {
          color: var(--text-primary);
          background: rgba(255, 255, 255, 0.05);
        }

        .report-preview-scroll-container {
          flex: 1;
          overflow-y: auto;
          padding: 1.5rem;
          background: rgba(9, 10, 15, 0.4);
        }

        .printable-report-container {
          background: var(--bg-surface);
          border: 1px solid var(--border-light);
          border-radius: 16px;
          padding: 2.25rem;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
          max-width: 800px;
          margin: 0 auto;
        }

        /* BANNER HEADER PRINT LOGO */
        .report-print-banner {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.25rem;
        }

        .brand-logo-print {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-weight: 800;
          font-size: 1.35rem;
          color: var(--text-primary);
        }

        .doc-meta-print {
          display: flex;
          flex-direction: column;
          text-align: right;
          gap: 0.15rem;
        }

        .doc-title-print {
          font-size: 0.72rem;
          font-weight: 900;
          color: var(--color-primary);
          letter-spacing: 0.08em;
        }

        .doc-date-print {
          font-size: 0.75rem;
          color: var(--text-secondary);
        }

        .print-divider {
          border: 0;
          height: 1px;
          background: linear-gradient(90deg, transparent, var(--border-light), transparent);
          margin: 1.2rem 0;
        }

        .section-subtitle-compact {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.85rem;
          font-weight: 800;
          color: var(--text-primary);
          margin: 0 0 0.75rem 0;
          text-transform: uppercase;
          letter-spacing: 0.03em;
        }

        .icon-tint {
          color: var(--color-primary);
        }

        .report-section-grid {
          display: grid;
          gap: 1.25rem;
          margin-bottom: 1.25rem;
        }

        .report-athlete-card {
          padding: 1.15rem !important;
        }

        .athlete-details-list {
          list-style: none;
          padding: 0;
          margin: 0;
          display: flex;
          flex-direction: column;
          gap: 0.45rem;
        }

        .athlete-details-list li {
          display: flex;
          justify-content: space-between;
          font-size: 0.82rem;
          border-bottom: 1px dashed rgba(255, 255, 255, 0.04);
          padding-bottom: 0.35rem;
        }

        .athlete-details-list li:last-child {
          border: none;
          padding: 0;
        }

        .detail-label {
          color: var(--text-secondary);
        }

        .detail-value {
          color: var(--text-primary);
        }

        .report-mini-stats-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 0.6rem;
        }

        .mini-stat-card {
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid var(--border-light);
          padding: 0.65rem 0.45rem;
          border-radius: 8px;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
        }

        .mini-stat-num {
          font-size: 1.15rem;
          font-weight: 800;
        }

        .mini-stat-lbl {
          font-size: 0.62rem;
          color: var(--text-muted);
          text-transform: uppercase;
          margin-top: 0.15rem;
          font-weight: 600;
        }

        .report-main-section {
          padding: 1.5rem !important;
          margin-bottom: 1.25rem;
        }

        .section-subtitle {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          font-size: 0.95rem;
          font-weight: 800;
          color: var(--text-primary);
          margin: 0 0 1rem 0;
          text-transform: uppercase;
          letter-spacing: 0.02em;
        }

        .report-data-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
          font-size: 0.85rem;
        }

        .report-data-table th {
          font-weight: 700;
          color: var(--text-secondary);
          border-bottom: 1px solid var(--border-light);
          padding: 0.5rem 0.65rem;
          font-size: 0.78rem;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }

        .report-data-table td {
          padding: 0.65rem;
          border-bottom: 1px solid rgba(255, 255, 255, 0.03);
          color: var(--text-primary);
        }

        .report-data-table tr:last-child td {
          border-bottom: none;
        }

        .report-nested-box {
          background: rgba(255, 255, 255, 0.015);
          border: 1px solid var(--border-light);
          border-radius: 10px;
          padding: 1rem;
        }

        .nested-box-title {
          font-size: 0.78rem;
          font-weight: 800;
          text-transform: uppercase;
          color: var(--text-secondary);
          margin: 0 0 0.85rem 0;
          letter-spacing: 0.03em;
        }

        .terrain-distribution-list {
          list-style: none;
          padding: 0;
          margin: 0;
          display: flex;
          flex-direction: column;
          gap: 0.65rem;
        }

        .terrain-bar-label {
          display: flex;
          justify-content: space-between;
          font-size: 0.75rem;
          color: var(--text-secondary);
          margin-bottom: 0.25rem;
        }

        .terrain-bar-track {
          width: 100%;
          height: 6px;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 10px;
          overflow: hidden;
        }

        .terrain-bar-fill {
          height: 100%;
          border-radius: 10px;
        }

        .unlocked-medals-grid-print {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 0.85rem;
        }

        .medal-mini-card-print {
          display: flex;
          align-items: center;
          gap: 0.65rem;
          background: rgba(255, 255, 255, 0.015);
          border: 1px solid var(--border-light);
          padding: 0.65rem 0.85rem;
          border-radius: 8px;
        }

        .medal-mini-icon-print {
          font-size: 1.3rem;
          flex-shrink: 0;
        }

        .medal-mini-text-print {
          display: flex;
          flex-direction: column;
          gap: 0.1rem;
        }

        .medal-mini-title-print {
          font-size: 0.85rem;
          font-weight: 700;
          color: var(--text-primary);
        }

        .medal-mini-desc-print {
          font-size: 0.72rem;
          color: var(--text-secondary);
        }

        .report-print-footer {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
          margin-top: 1.5rem;
        }

        .coach-advice-box {
          border-left: 3px solid var(--color-primary);
          background: rgba(139, 92, 246, 0.03);
          padding: 1rem;
          border-radius: 4px 8px 8px 4px;
        }

        .print-signature-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 3rem;
          margin-top: 1rem;
        }

        .signature-box {
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .signature-line {
          width: 80%;
          height: 1px;
          background: var(--border-light);
          margin-bottom: 0.5rem;
        }

        .signature-label {
          font-size: 0.75rem;
          color: var(--text-secondary);
        }

        .no-data-report-box {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1.5rem;
          background: rgba(255,255,255,0.01);
          border: 1px dashed var(--border-light);
          border-radius: 8px;
          color: var(--text-secondary);
          font-size: 0.82rem;
        }

        /* --- PRINT PROCESS ENGINE RULES --- */
        @media print {
          body {
            background: white !important;
            color: black !important;
          }
          
          /* Hide interactive screen layers completely */
          .app-container,
          .btn-close-modal,
          .print-trigger-btn,
          .report-modal-header,
          .select-wrapper {
            display: none !important;
          }

          /* Force modal wrappers to be completely transparent and non-restricting */
          .report-modal-backdrop,
          .modal-backdrop {
            display: block !important;
            position: static !important;
            background: none !important;
            backdrop-filter: none !important;
            -webkit-backdrop-filter: none !important;
            padding: 0 !important;
            z-index: auto !important;
            overflow: visible !important;
          }

          .report-modal-wrapper {
            display: block !important;
            max-width: none !important;
            height: auto !important;
            max-height: none !important;
            border: none !important;
            background: none !important;
            box-shadow: none !important;
            overflow: visible !important;
          }

          .report-preview-scroll-container {
            display: block !important;
            overflow: visible !important;
            padding: 0 !important;
            background: none !important;
          }

          /* Force report container to block full page */
          .printable-report-container {
            display: block !important;
            position: static !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
            color: black !important;
            box-shadow: none !important;
            border: none !important;
          }

          .printable-report-container * {
            color: black !important;
            background: transparent !important;
            text-shadow: none !important;
            box-shadow: none !important;
            border-color: #cbd5e1 !important;
          }

          .report-athlete-card,
          .report-main-section,
          .mini-stat-card,
          .report-nested-box,
          .report-section-row-stats,
          .medal-mini-card-print,
          .coach-advice-box {
            border: 1px solid #94a3b8 !important;
            background: none !important;
            padding: 1rem !important;
            border-radius: 8px !important;
          }

          .mini-stat-num {
            color: black !important;
          }

          .report-print-banner {
            display: flex !important;
            justify-content: space-between !important;
            align-items: center !important;
          }

          .brand-logo-print span {
            color: black !important;
          }

          .doc-title-print {
            color: #8b5cf6 !important;
          }

          .terrain-bar-track {
            background: #e2e8f0 !important;
            border: 1px solid #cbd5e1 !important;
          }

          .terrain-bar-fill {
            background: #8b5cf6 !important;
          }

          .signature-line {
            background: #64748b !important;
          }

          .page-break-print {
            page-break-before: always !important;
          }
        }

        /* --- MOBILE RESPONSIVE ENGINE RULES --- */
        @media (max-width: 768px) {
          .report-modal-backdrop {
            padding: 0.5rem !important;
          }

          .report-modal-wrapper {
            height: 95dvh !important;
            max-height: 100% !important;
            border-radius: 12px !important;
          }

          .report-modal-header {
            padding: 0.85rem 1rem !important;
            flex-direction: column !important;
            gap: 0.75rem !important;
            align-items: stretch !important;
            position: relative !important;
          }

          .report-modal-header .header-icon-title {
            gap: 0.5rem !important;
          }

          .report-modal-header .header-icon-title h2 {
            font-size: 1.1rem !important;
          }

          .report-modal-header .header-icon-title span {
            font-size: 0.68rem !important;
          }

          .report-modal-header > div:last-child {
            display: flex !important;
            width: 100% !important;
            justify-content: flex-start !important;
            gap: 0.5rem !important;
            flex-wrap: wrap !important;
            padding-right: 2.5rem !important;
          }

          /* Period dropdown & buttons on mobile */
          .toolbar-select {
            font-size: 0.75rem !important;
            min-height: 32px !important;
            padding: 0.35rem 0.5rem 0.35rem 1.5rem !important;
            width: 120px !important;
          }

          .select-icon {
            left: 0.45rem !important;
          }

          .export-ai-btn, .print-trigger-btn {
            padding: 0.35rem 0.65rem !important;
            font-size: 0.75rem !important;
            min-height: 32px !important;
            flex: 1 !important;
            justify-content: center !important;
          }

          .hide-text-mobile {
            display: none !important;
          }

          .btn-close-modal {
            position: absolute !important;
            top: 0.75rem !important;
            right: 0.75rem !important;
            padding: 6px !important;
            background: rgba(255, 255, 255, 0.05) !important;
            border-radius: 50% !important;
            z-index: 10 !important;
          }

          .report-preview-scroll-container {
            padding: 0.75rem !important;
          }

          .printable-report-container {
            padding: 1.25rem 1rem !important;
            border-radius: 12px !important;
          }

          .report-print-banner {
            flex-direction: column !important;
            align-items: flex-start !important;
            gap: 0.5rem !important;
          }

          .doc-meta-print {
            text-align: left !important;
          }

          /* Grids collapsing on mobile */
          .report-section-grid {
            grid-template-columns: 1fr !important;
            gap: 1rem !important;
          }

          .report-mini-stats-grid {
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 0.5rem !important;
          }

          .unlocked-medals-grid-print {
            grid-template-columns: 1fr !important;
            gap: 0.65rem !important;
          }

          .print-signature-grid {
            grid-template-columns: 1fr !important;
            gap: 1.5rem !important;
            margin-top: 1rem !important;
          }

          /* Table responsiveness */
          .report-data-table {
            font-size: 0.78rem !important;
            display: block !important;
            overflow-x: auto !important;
            white-space: nowrap !important;
            width: 100% !important;
          }

          .report-data-table th, .report-data-table td {
            padding: 0.5rem 0.4rem !important;
          }

          /* General styling adjustments to fit */
          .report-athlete-card {
            padding: 0.85rem !important;
          }

          .report-main-section {
            padding: 1rem !important;
            margin-bottom: 1rem !important;
          }
        }
      `}</style>

    </div>
  );

  // Quick helper to read running duration in seconds safe
  function runningRunningSecondsVal() {
    return totalRunningSeconds;
  }
}
