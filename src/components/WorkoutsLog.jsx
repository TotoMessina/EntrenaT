import React, { useState } from 'react';
import { 
  Trash2, 
  Pencil,
  Search, 
  Filter, 
  ChevronDown, 
  ChevronUp, 
  Calendar, 
  MapPin, 
  Heart, 
  Flame, 
  Dumbbell, 
  Award,
  Clock,
  TrendingUp
} from 'lucide-react';
import { formatPace, calculate1RM, timeStringToSeconds, getHRZonePlacement, getGymSessionVolume, getGymSessionMaxWeight, getGlobalTop3Records } from '../utils/calculators';
import GpxVisualizer from './GpxVisualizer';
import { compressGpxData, decompressGpxData } from '../utils/gpxCompressor';


const getGymSessionSetsCount = (workout) => {
  return workout.exercises?.reduce((sum, ex) => {
    if (Array.isArray(ex.sets)) {
      return sum + ex.sets.length;
    }
    return sum + (Number(ex.sets) || 0);
  }, 0) || 0;
};

export default function WorkoutsLog({ workouts, onDeleteWorkout, onUpdateWorkout, onUpdateAllWorkouts, onEditWorkout, showAlert, showConfirm }) {
  const [filterType, setFilterType] = useState('all'); // all, running, gym
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMuscle, setFilterMuscle] = useState('all');
  const [sortBy, setSortBy] = useState('date-desc'); // date-desc, date-asc, volume-desc, distance-desc
  const [expandedGymSessions, setExpandedGymSessions] = useState({}); // tracking expanded cards
  const [userAge, setUserAge] = useState(() => {
    return Number(localStorage.getItem('fitanalytics_age')) || 0;
  });
  const [activeChip, setActiveChip] = useState('all'); // 'all', 'running', 'gym', 'week', 'records'
  const [selectedWorkouts, setSelectedWorkouts] = useState(new Set());

  // Precomputar los rankings globales (top-3) para cada una de las 4 categorías
  const globalRecords = React.useMemo(() => {
    return getGlobalTop3Records(workouts);
  }, [workouts]);


  const toggleSelectWorkout = (id) => {
    setSelectedWorkouts(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAllVisible = () => {
    const allVisibleSelected = filteredWorkouts.every(w => selectedWorkouts.has(w.id));
    setSelectedWorkouts(prev => {
      const next = new Set(prev);
      if (allVisibleSelected) {
        filteredWorkouts.forEach(w => next.delete(w.id));
      } else {
        filteredWorkouts.forEach(w => next.add(w.id));
      }
      return next;
    });
  };

  const handleBulkDelete = async () => {
    const confirmed = showConfirm
      ? await showConfirm("Eliminar Entrenamientos", `¿Estás seguro de que deseas eliminar permanentemente los ${selectedWorkouts.size} entrenamientos seleccionados?`)
      : confirm(`¿Estás seguro de que deseas eliminar permanentemente los ${selectedWorkouts.size} entrenamientos seleccionados?`);
      
    if (confirmed) {
      const updated = workouts.filter(w => !selectedWorkouts.has(w.id));
      onUpdateAllWorkouts(updated);
      setSelectedWorkouts(new Set());
    }
  };

  const handleBulkUpdateMuscleGroup = async (newMuscle) => {
    const gymSelectedCount = workouts.filter(w => selectedWorkouts.has(w.id) && w.type === 'gym').length;
    if (gymSelectedCount === 0) {
      if (showAlert) {
        await showAlert("No hay Selección", "No hay entrenamientos de fuerza (Gym) seleccionados para reasignar.");
      } else {
        alert('No hay entrenamientos de fuerza (Gym) seleccionados para reasignar.');
      }
      return;
    }
    
    const confirmed = showConfirm
      ? await showConfirm("Cambiar Grupo Muscular", `¿Estás seguro de que deseas cambiar el grupo muscular a "${newMuscle}" para los ${gymSelectedCount} entrenamientos de fuerza seleccionados?`)
      : confirm(`¿Estás seguro de que deseas cambiar el grupo muscular a "${newMuscle}" para los ${gymSelectedCount} entrenamientos de fuerza seleccionados?`);

    if (confirmed) {
      const updated = workouts.map(w => {
        if (selectedWorkouts.has(w.id) && w.type === 'gym') {
          return {
            ...w,
            muscleGroup: newMuscle,
            trainedMuscles: [newMuscle]
          };
        }
        return w;
      });
      onUpdateAllWorkouts(updated);
      setSelectedWorkouts(new Set());
    }
  };

  const hasBulkUpdate = typeof onUpdateAllWorkouts === 'function';

  // Determinar si una sesión tiene medallas en el podio histórico de todos los tiempos.
  // Solo los 3 mejores de todos los tiempos en cada una de las 4 categorías principales.
  const getWorkoutMedals = (w) => {
    const medals = [];
    const getMedalStyles = (rank) => {
      if (rank === 1) return { label: 'Oro', class: 'medal-gold', icon: '🥇' };
      if (rank === 2) return { label: 'Plata', class: 'medal-silver', icon: '🥈' };
      if (rank === 3) return { label: 'Bronce', class: 'medal-bronze', icon: '🥉' };
      return null;
    };

    if (w.type === 'running') {
      const dist = Number(w.distance) || 0;
      // 1. Distancia Máxima Running
      const distIndex = globalRecords.distance.findIndex(r => r.id === w.id);
      if (distIndex !== -1) {
        const style = getMedalStyles(distIndex + 1);
        medals.push({
          type: 'distance',
          text: `${style.icon} Distancia máx (${distIndex + 1}º): ${dist.toFixed(2)} km`,
          class: style.class,
          icon: style.icon,
          rank: distIndex + 1
        });
      }

      // 2. Mejor Ritmo Running
      const paceIndex = globalRecords.pace.findIndex(r => r.id === w.id);
      if (paceIndex !== -1) {
        const style = getMedalStyles(paceIndex + 1);
        const secs = timeStringToSeconds(w.duration);
        const pace = secs / dist;
        const paceMin = Math.floor(pace / 60);
        const paceSec = Math.round(pace % 60);
        medals.push({
          type: 'pace',
          text: `${style.icon} Mejor ritmo (${paceIndex + 1}º): ${paceMin}:${String(paceSec).padStart(2,'0')} min/km`,
          class: style.class,
          icon: style.icon,
          rank: paceIndex + 1
        });
      }
    } else if (w.type === 'gym') {
      // 3. Volumen Máximo Gym
      const volIndex = globalRecords.volume.findIndex(r => r.id === w.id);
      if (volIndex !== -1) {
        const style = getMedalStyles(volIndex + 1);
        const vol = getGymSessionVolume(w);
        medals.push({
          type: 'volume',
          text: `${style.icon} Volumen máx (${volIndex + 1}º): ${vol.toLocaleString('es-ES')} kg`,
          class: style.class,
          icon: style.icon,
          rank: volIndex + 1
        });
      }

      // 4. Levantamiento Máximo Gym
      const wtIndex = globalRecords.weight.findIndex(r => r.id === w.id);
      if (wtIndex !== -1) {
        const style = getMedalStyles(wtIndex + 1);
        const maxWt = getGymSessionMaxWeight(w);
        medals.push({
          type: 'weight',
          text: `${style.icon} Levantamiento máx (${wtIndex + 1}º): ${maxWt} kg`,
          class: style.class,
          icon: style.icon,
          rank: wtIndex + 1
        });
      }
    }

    return medals;
  };

  const isRecord = (w) => getWorkoutMedals(w).length > 0;



  const getRelativeDateLabel = (dateStr) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const wDate = new Date(dateStr + 'T00:00:00');
    wDate.setHours(0, 0, 0, 0);
    
    const diffTime = today - wDate;
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Hoy';
    if (diffDays === 1) return 'Ayer';
    if (diffDays > 1 && diffDays < 7) return `Hace ${diffDays} días`;
    if (diffDays >= 7 && diffDays < 14) return 'La semana pasada';
    if (diffDays >= 14 && diffDays < 30) return `Hace ${Math.floor(diffDays / 7)} semanas`;
    return wDate.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
  };

  // Toggle card expansion
  const toggleExpand = (id) => {
    setExpandedGymSessions(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  // Get all unique muscle groups in database for filter list
  const muscleGroups = ['all', ...new Set(workouts
    .filter(w => w.type === 'gym')
    .flatMap(w => w.trainedMuscles && w.trainedMuscles.length > 0 ? w.trainedMuscles : (w.muscleGroup ? [w.muscleGroup] : []))
  )];

  // --- FILTERING & SORTING LOGIC ---
  const filteredWorkouts = workouts
    .filter(w => {
      // 1. Chip filter
      if (activeChip === 'running' && w.type !== 'running') return false;
      if (activeChip === 'gym' && w.type !== 'gym') return false;
      if (activeChip === 'week') {
        const today = new Date();
        const currentDayIndex = today.getDay();
        const mondayDiff = currentDayIndex === 0 ? -6 : 1 - currentDayIndex;
        const monday = new Date(today);
        monday.setDate(today.getDate() + mondayDiff);
        monday.setHours(0, 0, 0, 0);
        
        const wDate = new Date(w.date + 'T00:00:00');
        wDate.setHours(0, 0, 0, 0);
        if (wDate < monday || wDate > today) return false;
      }
      if (activeChip === 'records') {
        if (!isRecord(w)) return false;
      }

      // 2. Type selector filter (applies if not overridden by running/gym chip)
      if (activeChip === 'all' || activeChip === 'week' || activeChip === 'records') {
        if (filterType !== 'all' && w.type !== filterType) return false;
      }
      
      // 3. Muscle group filter (for gym only)
      if (w.type === 'gym' && filterMuscle !== 'all') {
        const hasMuscle = w.trainedMuscles && w.trainedMuscles.length > 0
          ? w.trainedMuscles.includes(filterMuscle)
          : w.muscleGroup === filterMuscle;
        if (!hasMuscle) return false;
      }
      if (w.type === 'running' && filterMuscle !== 'all') return false; // Hide runs when filtering by gym muscles
      
      // 4. Search query filter
      if (searchQuery.trim() !== '') {
        const query = searchQuery.toLowerCase();
        const dateMatch = w.date.includes(query);
        const noteMatch = w.notes && w.notes.toLowerCase().includes(query);
        
        if (w.type === 'running') {
          const terrainMatch = w.terrain && w.terrain.toLowerCase().includes(query);
          return dateMatch || noteMatch || terrainMatch || w.distance.toString().includes(query);
        } else if (w.type === 'gym') {
          const nameMatch = w.sessionName && w.sessionName.toLowerCase().includes(query);
          const muscleMatch = (w.trainedMuscles && w.trainedMuscles.length > 0)
            ? w.trainedMuscles.some(m => m.toLowerCase().includes(query))
            : (w.muscleGroup && w.muscleGroup.toLowerCase().includes(query));
          const exerciseMatch = w.exercises && w.exercises.some(ex => ex.name.toLowerCase().includes(query));
          return dateMatch || noteMatch || nameMatch || muscleMatch || exerciseMatch;
        }
      }
      return true;
    })
    .sort((a, b) => {
      // Sorting
      if (sortBy === 'date-desc') {
        return new Date(b.date + 'T00:00:00') - new Date(a.date + 'T00:00:00');
      }
      if (sortBy === 'date-asc') {
        return new Date(a.date + 'T00:00:00') - new Date(b.date + 'T00:00:00');
      }
      if (sortBy === 'distance-desc') {
        const distA = a.type === 'running' ? Number(a.distance) : 0;
        const distB = b.type === 'running' ? Number(b.distance) : 0;
        return distB - distA;
      }
      if (sortBy === 'volume-desc') {
        return getGymSessionVolume(b) - getGymSessionVolume(a);
      }
      return 0;
    });

  return (
    <div className="log-container fade-in">
      <header className="log-header">
        <div>
          <h1 className="gradient-text text-3xl font-extrabold">Historial</h1>
          <p className="text-secondary text-sm">Gestiona, filtra y examina en detalle cada uno de tus entrenamientos.</p>
        </div>
      </header>

      {/* Horizontal Pill Chips Filters */}
      <div className="pill-chips-container">
        {[
          { id: 'all', label: 'Todos', emoji: '📂' },
          { id: 'running', label: 'Running', emoji: '🏃' },
          { id: 'gym', label: 'Fuerza', emoji: '🏋️' },
          { id: 'week', label: 'Esta Semana', emoji: '🔥' },
          { id: 'records', label: 'Récords Personales', emoji: '🏆' }
        ].map(chip => (
          <button
            key={chip.id}
            onClick={() => {
              setActiveChip(chip.id);
              if (chip.id === 'running' || chip.id === 'gym') {
                setFilterType(chip.id);
              } else if (chip.id === 'all') {
                setFilterType('all');
              }
            }}
            className={`pill-chip ${activeChip === chip.id ? 'active' : ''}`}
          >
            <span className="chip-emoji">{chip.emoji}</span>
            <span className="chip-label">{chip.label}</span>
          </button>
        ))}
      </div>

      {/* Filter Toolbar */}
      <div className="glass-card toolbar-card mb-6">
        <div className="toolbar-grid">
          {/* Search Input */}
          <div className="search-wrapper">
            <Search className="search-icon" size={18} />
            <input
              type="text"
              placeholder="Buscar por fecha, ejercicio, nota..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="toolbar-input"
            />
          </div>

          {/* Type Selector */}
          <div className="filter-group">
            <label className="toolbar-label">Actividad</label>
            <select
              value={filterType}
              onChange={(e) => {
                setFilterType(e.target.value);
                setFilterMuscle('all'); // Reset muscle filter on type change
              }}
              className="toolbar-select"
            >
              <option value="all">Todas</option>
              <option value="running">🏃 Running</option>
              <option value="gym">🏋️ Gimnasio</option>
            </select>
          </div>

          {/* Muscle Selector (Active only for Gym or All) */}
          {filterType !== 'running' && (
            <div className="filter-group">
              <label className="toolbar-label">Grupo Muscular</label>
              <select
                value={filterMuscle}
                onChange={(e) => setFilterMuscle(e.target.value)}
                className="toolbar-select"
              >
                <option value="all">Todos los grupos</option>
                {muscleGroups.filter(m => m !== 'all').map(muscle => (
                  <option key={muscle} value={muscle}>{muscle}</option>
                ))}
              </select>
            </div>
          )}

          {/* Sort Selector */}
          <div className="filter-group">
            <label className="toolbar-label">Ordenar por</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="toolbar-select"
            >
              <option value="date-desc">Más recientes primero</option>
              <option value="date-asc">Más antiguos primero</option>
              {filterType !== 'gym' && <option value="distance-desc">Mayor distancia (Running)</option>}
              {filterType !== 'running' && <option value="volume-desc">Mayor volumen (Gym)</option>}
            </select>
          </div>
        </div>
      </div>

      {/* Selection Master Bar */}
      {hasBulkUpdate && filteredWorkouts.length > 0 && (
        <div className="glass-card selection-master-bar mb-4">
          <div className="master-bar-content">
            <label className="master-checkbox-label">
              <input 
                type="checkbox"
                checked={filteredWorkouts.length > 0 && filteredWorkouts.every(w => selectedWorkouts.has(w.id))}
                onChange={toggleSelectAllVisible}
                className="workout-row-checkbox"
              />
              <span className="master-checkbox-text">
                {filteredWorkouts.every(w => selectedWorkouts.has(w.id)) 
                  ? 'Deseleccionar todos los visibles' 
                  : `Seleccionar todos los visibles (${filteredWorkouts.length})`}
              </span>
            </label>
            {selectedWorkouts.size > 0 && (
              <span className="selection-count-badge animate-pulse">
                {selectedWorkouts.size} seleccionados
              </span>
            )}
          </div>
        </div>
      )}

      {/* Workouts List */}
      <div className="workouts-list-wrapper">
        {filteredWorkouts.length === 0 ? (
          <div className="glass-card empty-card">
            <Filter size={48} className="text-muted mb-3" />
            <h3>No se encontraron resultados</h3>
            <p className="text-secondary">Prueba modificando los filtros o el buscador para encontrar lo que buscas.</p>
          </div>
        ) : (
          filteredWorkouts.map(w => {
            const isGym = w.type === 'gym';
            const isRunningWithHR = w.type === 'running' && w.heartRate;
            const canExpand = isGym || w.type === 'running';
            const isExpanded = expandedGymSessions[w.id];
            
            return (
              <div 
                key={w.id} 
                className={`glass-card workout-row-card ${isGym ? 'gym-card-hover' : 'running-card-hover'}`}
              >
                <div className="card-main-row">
                  {hasBulkUpdate && (
                    <div className="workout-checkbox-wrapper" onClick={(e) => e.stopPropagation()}>
                      <input 
                        type="checkbox"
                        checked={selectedWorkouts.has(w.id)}
                        onChange={() => toggleSelectWorkout(w.id)}
                        className="workout-row-checkbox"
                        aria-label="Seleccionar entrenamiento"
                      />
                    </div>
                  )}
                  {/* Left Column: Icon Avatar & Basic Title */}
                  <div className="card-identity">
                    <div className={`activity-avatar-large ${isGym ? 'gym-avatar' : 'run-avatar'}`}>
                      {isGym ? <Dumbbell size={22} /> : <Flame size={22} />}
                    </div>
                    <div className="identity-text">
                      <div className="identity-title-row">
                        <span className="workout-row-title">
                          {isGym 
                            ? (w.sessionName || (w.muscleGroup ? `Sesión de ${w.muscleGroup}` : 'Sesión de Fuerza')) 
                            : `Corrida al aire libre`}
                        </span>
                        <span className={`badge ${isGym ? 'badge-gym' : 'badge-running'}`}>
                          {isGym ? 'Gym' : 'Running'}
                        </span>
                        {isGym && (w.trainedMuscles && w.trainedMuscles.length > 0 ? (
                          <div className="trained-muscles-badges-row" style={{ display: 'inline-flex', flexWrap: 'wrap', gap: '4px', marginLeft: '4px', verticalAlign: 'middle' }}>
                            {w.trainedMuscles.map((m, idx) => (
                              <span key={idx} className="badge badge-secondary" style={{ fontSize: '11px', textTransform: 'capitalize' }}>
                                {m}
                              </span>
                            ))}
                          </div>
                        ) : (
                          w.muscleGroup && <span className="badge badge-secondary">{w.muscleGroup}</span>
                        ))}
                      </div>
                      
                      <div className="workout-meta-line">
                        <span className="meta-item">
                          <Calendar size={13} />
                          {new Date(w.date + 'T00:00:00').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                        </span>
                        <span className="meta-item relative-date-badge">
                          ({getRelativeDateLabel(w.date)})
                        </span>
                        {!isGym && w.terrain && (
                          <span className="meta-item">
                            <MapPin size={13} />
                            {w.terrain}
                          </span>
                        )}
                        {(() => {
                          const medals = getWorkoutMedals(w);
                          return medals.length > 0 ? medals.map((medal, mi) => (
                            <span
                              key={mi}
                              className={`meta-item record-badge ${medal.class}`}
                              title={medal.text}
                            >
                              {medal.text}
                            </span>
                          )) : null;
                        })()}

                      </div>
                    </div>
                  </div>

                  {/* Middle Column: Major Metrics */}
                  <div className="card-major-metrics">
                    {!isGym ? (
                      // Running Major Metrics
                      <>
                        <div className="metric-box">
                          <span className="metric-box-label">Distancia</span>
                          <span className="metric-box-value">{Number(w.distance).toFixed(2)} <span className="unit">km</span></span>
                        </div>
                        <div className="metric-box">
                          <span className="metric-box-label">Ritmo Medio</span>
                          <span className="metric-box-value">
                            {formatPace(timeStringToSeconds(w.duration) / Number(w.distance))}
                          </span>
                        </div>
                        <div className="metric-box">
                          <span className="metric-box-label">Tiempo</span>
                          <span className="metric-box-value"><Clock size={13} style={{ marginRight: '3px', display: 'inline' }} />{w.duration}</span>
                        </div>
                      </>
                    ) : (
                      // Gym Major Metrics
                      <>
                        <div className="metric-box">
                          <span className="metric-box-label">Volumen Total</span>
                          <span className="metric-box-value">{getGymSessionVolume(w).toLocaleString('es-ES')} <span className="unit">kg</span></span>
                        </div>
                        <div className="metric-box">
                          <span className="metric-box-label">Ejercicios</span>
                          <span className="metric-box-value">{w.exercises?.length || 0}</span>
                        </div>
                        <div className="metric-box">
                          <span className="metric-box-label">Series Totales</span>
                          <span className="metric-box-value">
                            {getGymSessionSetsCount(w)}
                          </span>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Right Column: Actions (Delete, Edit & Expand for gym) */}
                  <div className="card-actions">
                    {onEditWorkout && (
                      <button 
                        onClick={() => onEditWorkout(w)} 
                        className="btn-action-edit"
                        title="Editar sesión"
                      >
                        <Pencil size={18} />
                      </button>
                    )}
                    {canExpand && (
                      <button 
                        onClick={() => toggleExpand(w.id)} 
                        className="btn-action-expand"
                        title={isExpanded ? "Contraer detalles" : "Expandir detalles"}
                      >
                        {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                      </button>
                    )}
                    <button 
                      onClick={async () => {
                        const confirmed = showConfirm
                          ? await showConfirm("Eliminar Sesión", "¿Estás seguro de que deseas eliminar este entrenamiento?")
                          : confirm('¿Estás seguro de que deseas eliminar este entrenamiento?');
                        if (confirmed) {
                          onDeleteWorkout(w.id);
                        }
                      }}
                      className="btn-action-delete"
                      title="Eliminar sesión"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>

                {/* Optional Running Note Row */}
                {!isGym && (w.notes || w.heartRate || w.rpe) && (
                  <div className="running-notes-row">
                    {w.notes ? <p><strong>Nota:</strong> {w.notes}</p> : <p style={{ visibility: 'hidden', margin: 0 }}></p>}
                    {w.heartRate && <span className="physiological-stat"><Heart size={12} style={{ color: '#ef4444' }} /> {w.heartRate} bpm</span>}
                    {w.rpe && <span className="physiological-stat"><Award size={12} style={{ color: '#f59e0b' }} /> RPE: {w.rpe}/10</span>}
                  </div>
                )}

                {/* Expandable Running Section with Map & Heart Rate Gauge */}
                {!isGym && isExpanded && (
                  <div className="gym-details-expanded fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    
                    {/* Advanced Running Metrics */}
                    {(w.maxSpeed || w.avgCadence || w.strideLength || w.elevationGain || (w.splits && w.splits.length > 0)) && (
                      <div className="running-advanced-metrics glass-card p-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.02)' }}>
                        <h4 className="flex-center mb-3" style={{ fontSize: '0.95rem', gap: '6px' }}><TrendingUp size={16} className="text-running" /> Dinámica de Carrera</h4>
                        
                        <div className="grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '1rem' }}>
                          {w.maxSpeed && (
                            <div>
                              <span className="text-xs text-secondary block mb-1">Velocidad Máx</span>
                              <span className="font-bold text-lg">{w.maxSpeed}</span>
                            </div>
                          )}
                          {w.avgCadence && (
                            <div>
                              <span className="text-xs text-secondary block mb-1">Cadencia Media</span>
                              <span className="font-bold text-lg">{w.avgCadence} <small className="opacity-70 text-xs">spm</small></span>
                            </div>
                          )}
                          {w.maxCadence && (
                            <div>
                              <span className="text-xs text-secondary block mb-1">Cadencia Máx</span>
                              <span className="font-bold text-lg">{w.maxCadence} <small className="opacity-70 text-xs">spm</small></span>
                            </div>
                          )}
                          {w.strideLength && (
                            <div>
                              <span className="text-xs text-secondary block mb-1">Long. Zancada</span>
                              <span className="font-bold text-lg">{w.strideLength} <small className="opacity-70 text-xs">m</small></span>
                            </div>
                          )}
                          {w.elevationGain && (
                            <div>
                              <span className="text-xs block mb-1" style={{ color: '#ef4444' }}>Elevación Ganada</span>
                              <span className="font-bold text-lg">{w.elevationGain} <small className="opacity-70 text-xs">m</small></span>
                            </div>
                          )}
                          {w.elevationLoss && (
                            <div>
                              <span className="text-xs block mb-1" style={{ color: '#3b82f6' }}>Elevación Perdida</span>
                              <span className="font-bold text-lg">{w.elevationLoss} <small className="opacity-70 text-xs">m</small></span>
                            </div>
                          )}
                        </div>

                        {w.splits && w.splits.length > 0 && (
                          <div className="mt-4 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                            <h5 className="mb-2 text-sm text-secondary">Tiempos por Kilómetro (Splits)</h5>
                            <div className="splits-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: '0.5rem' }}>
                              {w.splits.map((s, idx) => (
                                <div key={idx} className="split-badge" style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '0.3rem 0.5rem', borderRadius: '6px', textAlign: 'center', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                                  <span className="block text-xs text-secondary mb-1">Km {s.km}</span>
                                  <span className="block font-bold text-sm text-running">{s.time}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* GPX Visualizer / Route mapping section */}
                    <div className="running-gpx-section">
                      <GpxVisualizer 
                        gpxData={decompressGpxData(w.gpxData)} 
                        theme="dark" 
                        readOnly={false} 
                        onGpxLoaded={(parsedStruct) => {
                          const updated = {
                            ...w,
                            gpxData: compressGpxData(parsedStruct)
                          };
                          if (parsedStruct?.summary) {
                            const { distance: d, duration: dur } = parsedStruct.summary;
                            if (d) updated.distance = parseFloat(d.toFixed(2));
                            if (dur) updated.duration = dur;
                          }
                          if (onUpdateWorkout) {
                            onUpdateWorkout(updated);
                          }
                        }}
                      />
                      {w.gpxData && (
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '-8px', marginBottom: '8px' }}>
                          <button
                            type="button"
                            onClick={async () => {
                              const confirmed = showConfirm
                                ? await showConfirm("Eliminar Ruta GPX", "¿Estás seguro de que deseas eliminar la ruta GPX de este entrenamiento?")
                                : confirm('¿Estás seguro de que deseas eliminar la ruta GPX de este entrenamiento?');
                              if (confirmed) {
                                const updated = { ...w };
                                delete updated.gpxData;
                                if (onUpdateWorkout) onUpdateWorkout(updated);
                              }
                            }}
                            className="btn text-xs font-semibold cursor-pointer"
                            style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#ef4444', borderRadius: '8px', padding: '0.35rem 0.85rem' }}
                          >
                            🗑️ Eliminar Ruta GPX
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Heart Rate / Zones section if HR is available */}
                    {w.heartRate && (
                      <div className="heart-rate-analysis-section">
                        {userAge === 0 ? (
                          <div className="card-age-setter glass-card" style={{ padding: '1.25rem', marginTop: '0.5rem', background: 'rgba(255, 255, 255, 0.02)', textAlign: 'left' }}>
                            <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                              <Heart size={16} style={{ color: '#ef4444' }} className="animate-pulse" />
                              Configura tu Edad para el Análisis Cardíaco
                            </h4>
                            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1rem', lineHeight: 1.4 }}>
                              Necesitamos tu edad para calcular dinámicamente tus zonas de frecuencia cardíaca personalizadas y analizar científicamente la intensidad de esta sesión.
                            </p>
                            <form onSubmit={(e) => {
                              e.preventDefault();
                              const ageVal = Number(e.target.age.value);
                              if (ageVal > 0 && ageVal <= 110) {
                                setUserAge(ageVal);
                                localStorage.setItem('fitanalytics_age', ageVal.toString());
                              }
                            }} style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                              <input
                                type="number"
                                name="age"
                                placeholder="Ej: 28"
                                min="5"
                                max="110"
                                required
                                className="form-input"
                                style={{ width: '90px', padding: '0.5rem' }}
                              />
                              <button type="submit" className="btn btn-primary" style={{ padding: '0.5rem 1.25rem', fontSize: '0.85rem', borderRadius: '10px' }}>
                                Guardar Edad
                              </button>
                            </form>
                          </div>
                        ) : (
                          (() => {
                            const placement = getHRZonePlacement(userAge, w.heartRate);
                            if (!placement) return null;
                            
                            // Map HR relative to maxHR (min 40%, max 100%)
                            const minScale = 0.4;
                            const hrPct = w.heartRate / placement.maxHR;
                            const fraction = Math.min(1, Math.max(0, (hrPct - minScale) / (1 - minScale)));
                            
                            return (
                              <div className="running-expanded-layout">
                                {/* Left Side: SVG Dial */}
                                <div className="gauge-panel">
                                  <svg viewBox="0 0 200 120" className="heart-rate-gauge" style={{ width: '100%', maxWidth: '220px', margin: '0 auto', display: 'block' }}>
                                    <defs>
                                      <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                                        <feGaussianBlur stdDeviation="2" result="blur" />
                                        <feComposite in="SourceGraphic" in2="blur" operator="over" />
                                      </filter>
                                    </defs>
                                    
                                    {/* Background Arc */}
                                    <path 
                                      d="M 25 100 A 75 75 0 0 1 175 100" 
                                      fill="none" 
                                      stroke="var(--border-light)" 
                                      strokeWidth="10" 
                                      strokeLinecap="round" 
                                    />

                                    {/* Color Zone Filled Arc */}
                                    <path 
                                      d="M 25 100 A 75 75 0 0 1 175 100" 
                                      fill="none" 
                                      stroke={placement.activeZone.color} 
                                      strokeWidth="10" 
                                      strokeLinecap="round"
                                      strokeDasharray="235"
                                      strokeDashoffset={235 - (235 * fraction)}
                                      style={{ transition: 'stroke-dashoffset 0.8s ease-in-out', filter: `drop-shadow(0 0 3px ${placement.activeZone.color}80)` }}
                                    />

                                    {/* Center indicator node */}
                                    <circle cx="100" cy="100" r="10" fill="var(--bg-surface-solid)" stroke="var(--border-light)" strokeWidth="2" />
                                    
                                    {/* Needle pointing */}
                                    <g transform={`rotate(${-180 + 180 * fraction}, 100, 100)`} style={{ transition: 'transform 0.8s ease-in-out' }}>
                                      <line 
                                        x1="100" 
                                        y1="100" 
                                        x2="35" 
                                        y2="100" 
                                        stroke={placement.activeZone.color} 
                                        strokeWidth="3.5" 
                                        strokeLinecap="round" 
                                      />
                                      <polygon 
                                        points="35,100 45,96 45,104" 
                                        fill={placement.activeZone.color} 
                                      />
                                    </g>

                                    {/* Value Labels */}
                                    <text x="100" y="82" textAnchor="middle" fill="var(--text-primary)" fontSize="18" fontWeight="800" fontFamily="var(--font-sans)">
                                      {w.heartRate}
                                    </text>
                                    <text x="100" y="96" textAnchor="middle" fill="var(--text-secondary)" fontSize="8" fontWeight="600" fontFamily="var(--font-sans)">
                                      BPM MEDIO
                                    </text>

                                    {/* Min/Max indicators */}
                                    <text x="25" y="115" textAnchor="middle" fill="var(--text-muted)" fontSize="8" fontFamily="var(--font-sans)">
                                      {Math.round(placement.maxHR * 0.4)}
                                    </text>
                                    <text x="175" y="115" textAnchor="middle" fill="var(--text-muted)" fontSize="8" fontFamily="var(--font-sans)">
                                      {placement.maxHR}
                                    </text>
                                  </svg>
                                </div>
                                
                                {/* Right Side: Zone Details & Advice */}
                                <div className="advice-panel">
                                  <div className="advice-header">
                                    <span className="advice-intensity-badge" style={{ backgroundColor: `rgba(${placement.activeZone.colorRgb}, 0.12)`, color: placement.activeZone.color }}>
                                      {placement.activeZone.name}
                                    </span>
                                    <span className="advice-effort-pct">
                                      {Math.round(hrPct * 100)}% de tu FCmáx
                                    </span>
                                  </div>
                                  
                                  <h4 className="advice-title" style={{ margin: 0, fontSize: '0.95rem' }}>Análisis de la Intensidad del Esfuerzo</h4>
                                  <p className="advice-desc" style={{ margin: 0 }}>{placement.activeZone.description}</p>
                                  
                                  <div className="garmin-recommendation-box" style={{ borderLeft: `3px solid ${placement.activeZone.color}` }}>
                                    <p className="recommendation-text" style={{ margin: 0 }}>
                                      <strong>Análisis Fisiológico:</strong> {placement.recommendation}
                                    </p>
                                  </div>

                                  <div className="running-coach-scientific-note" style={{ borderLeft: `3px dashed ${placement.activeZone.color}` }}>
                                    <span className="note-icon">⚡</span>
                                    <p className="note-text">
                                      <strong>Fisiología del Cardio:</strong> Tus zonas cardíacas se estiman dinámicamente mediante la fórmula de Tanaka: <code>FCmáx = 208 - (0.7 × Edad)</code>. Entrenar en Zona 2 potencia la biogénesis mitocondrial, aumentando tu umbral lactato sin acumular fatiga neural.
                                    </p>
                                  </div>

                                  <div className="advice-footer-stats">
                                    <div className="sub-stat">
                                      <span className="sub-stat-label">Edad Configurada</span>
                                      <span className="sub-stat-value" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                        {userAge} años 
                                        <button 
                                          onClick={() => {
                                            setUserAge(0);
                                            localStorage.removeItem('fitanalytics_age');
                                          }}
                                          style={{ background: 'none', border: 'none', color: 'var(--color-primary)', cursor: 'pointer', fontSize: '0.7rem', padding: 0, textDecoration: 'underline' }}
                                        >
                                          (cambiar)
                                        </button>
                                      </span>
                                    </div>
                                    <div className="sub-stat">
                                      <span className="sub-stat-label">FCmáx Est. ({userAge}a)</span>
                                      <span className="sub-stat-value">{placement.maxHR} bpm</span>
                                    </div>
                                    <div className="sub-stat">
                                      <span className="sub-stat-label">Rango Z{placement.activeZone.level || 1}</span>
                                      <span className="sub-stat-value">{placement.activeZone.range}</span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })()
                        )}
                      </div>
                    )}

                  </div>
                )}

                {/* Expandable Gym Table */}
                {isGym && isExpanded && (
                  <div className="gym-details-expanded fade-in">
                    <div className="table-responsive">
                    <table className="gym-exercises-table">
                      <thead>
                        <tr>
                          <th>Ejercicio</th>
                          <th className="center">Series</th>
                          <th className="center">Repes</th>
                          <th className="right">Peso</th>
                          <th className="center" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px' }}>
                            RPE
                            <span className="info-trigger" title="Borg RPE (Esfuerzo Percibido): Escala 1-10. RPE 10 = Esfuerzo Máximo, RPE 8 = RIR 2 (2 repeticiones en reserva).">ℹ️</span>
                          </th>
                          <th className="right">
                            1RM Est.
                            <span className="info-trigger" title="1RM Estimado: El peso máximo teórico que podrías levantar para 1 repetición simple, estimado mediante la fórmula científica de Epley/Brzycki.">ℹ️</span>
                          </th>
                          <th className="right">Volumen</th>
                        </tr>
                      </thead>
                      <tbody>
                        {w.exercises.map((ex, idx) => {
                          let oneRepMax = 0;
                          let vol = 0;
                          const isNested = Array.isArray(ex.sets);

                          if (isNested) {
                            ex.sets.forEach(s => {
                              if (s.done !== false) {
                                const rpeMax = calculate1RM(parseFloat(s.weight) || 0, parseFloat(s.reps) || 0, s.rpe);
                                if (rpeMax > oneRepMax) {
                                  oneRepMax = rpeMax;
                                }
                                vol += (parseFloat(s.weight) || 0) * (parseFloat(s.reps) || 0);
                              }
                            });
                          } else {
                            oneRepMax = calculate1RM(ex.weight, ex.reps, ex.rpe);
                            vol = (Number(ex.sets) || 0) * (Number(ex.reps) || 0) * (Number(ex.weight) || 0);
                          }

                          return (
                            <tr key={idx}>
                              <td><strong>{ex.name}</strong></td>
                              {isNested ? (
                                <td colSpan={4}>
                                  <div className="sets-badges-container" style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', padding: '4px 0' }}>
                                    {ex.sets.map((s, sIdx) => {
                                      const isWarmup = s.type === 'warmup';
                                      const rpeText = s.rpe ? ` @ RPE ${s.rpe}` : '';
                                      const restText = s.rest ? ` (⏱️${s.rest}s)` : '';
                                      const completedStyle = s.done ? {} : { opacity: 0.5, textDecoration: 'line-through' };
                                      const badgeStyle = isWarmup 
                                        ? { 
                                            backgroundColor: '#1e293b', 
                                            border: '1px solid #475569', 
                                            color: '#94a3b8', 
                                            padding: '2px 8px', 
                                            borderRadius: '6px', 
                                            fontSize: '11px',
                                            ...completedStyle
                                          }
                                        : { 
                                            backgroundColor: 'rgba(236, 72, 153, 0.1)', 
                                            border: '1px solid #ec4899', 
                                            color: '#f472b6', 
                                            padding: '2px 8px', 
                                            borderRadius: '6px', 
                                            fontSize: '11px', 
                                            fontWeight: '500', 
                                            boxShadow: '0 0 4px rgba(236, 72, 153, 0.2)',
                                            ...completedStyle
                                          };
                                      return (
                                        <span 
                                          key={sIdx} 
                                          style={badgeStyle} 
                                          title={isWarmup ? `Serie de Calentamiento${s.done ? '' : ' (No realizada)'}` : `Serie Efectiva${s.done ? '' : ' (No realizada)'}`}
                                        >
                                          {isWarmup ? 'W' : `S${sIdx + 1}`}: {s.reps} x {s.weight}kg{rpeText}{restText}
                                        </span>
                                      );
                                    })}
                                  </div>
                                </td>
                              ) : (
                                <>
                                  <td className="center">{ex.sets}</td>
                                  <td className="center">{ex.reps}</td>
                                  <td className="right">{ex.weight} kg</td>
                                  <td className="center">
                                    <span className={`rpe-pill rpe-${ex.rpe}`}>
                                      {ex.rpe || '-'}
                                    </span>
                                  </td>
                                </>
                              )}
                              <td className="right text-primary" style={{ fontWeight: 600 }}>
                                {oneRepMax > 0 ? `${oneRepMax.toFixed(1)} kg` : '-'}
                              </td>
                              <td className="right text-secondary">{vol.toLocaleString('es-ES')} kg</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                    </div>

                    <div className="gym-coach-scientific-note">
                      <span className="note-icon">💡</span>
                      <p className="note-text">
                        <strong>Análisis Científico de Fuerza:</strong> Tu 1RM estimado se calcula usando la fórmula de Epley: <code>Peso × (1 + Reps/30)</code>. El RPE mide las repeticiones en reserva (RIR): un RPE 9 indica que solo podías completar 1 repetición adicional antes del fallo.
                      </p>
                    </div>
                    {w.notes && (
                      <div className="gym-notes-block">
                        <p><strong>Notas de la sesión:</strong> {w.notes}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Sliding Glassmorphic Bottom Drawer for Bulk Actions */}
      {hasBulkUpdate && selectedWorkouts.size > 0 && (
        <div className="bulk-actions-drawer show">
          <div className="drawer-glow"></div>
          <div className="drawer-container">
            <div className="drawer-info">
              <span className="drawer-count">
                📊 {selectedWorkouts.size} {selectedWorkouts.size === 1 ? 'entrenamiento seleccionado' : 'entrenamientos seleccionados'}
              </span>
              {workouts.filter(w => selectedWorkouts.has(w.id) && w.type === 'gym').length > 0 && (
                <span className="drawer-subinfo">
                  ({workouts.filter(w => selectedWorkouts.has(w.id) && w.type === 'gym').length} de fuerza)
                </span>
              )}
            </div>
            
            <div className="drawer-actions">
              {/* Cambiar Grupo Muscular dropdown */}
              {workouts.filter(w => selectedWorkouts.has(w.id) && w.type === 'gym').length > 0 && (
                <div className="bulk-select-wrapper">
                  <Dumbbell size={14} className="bulk-select-icon" />
                  <select
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val) {
                        handleBulkUpdateMuscleGroup(val);
                        e.target.value = ''; // Reset select
                      }
                    }}
                    className="bulk-select-dropdown"
                    defaultValue=""
                  >
                    <option value="" disabled>Reasignar Grupo Muscular...</option>
                    <option value="Pectoral">💪 Pectoral</option>
                    <option value="Espalda">👐 Espalda</option>
                    <option value="Hombros">🛡️ Hombros</option>
                    <option value="Bíceps">💪 Bíceps</option>
                    <option value="Tríceps">🔥 Tríceps</option>
                    <option value="Antebrazo">✊ Antebrazo</option>
                    <option value="Core">🧱 Core</option>
                    <option value="Cuádriceps">🦵 Cuádriceps</option>
                    <option value="Isquiotibiales">🦵 Isquiotibiales</option>
                    <option value="Gemelos">🦶 Gemelos</option>
                    <option value="Glúteos">🍑 Glúteos</option>
                    <option value="Cuello">🦒 Cuello</option>
                  </select>
                </div>
              )}
              
              <button 
                onClick={handleBulkDelete}
                className="btn-bulk-action btn-bulk-delete"
                title="Eliminar permanentemente todos los entrenamientos seleccionados"
              >
                <Trash2 size={16} />
                <span>Eliminar Seleccionados</span>
              </button>
              
              <button 
                onClick={() => setSelectedWorkouts(new Set())}
                className="btn-bulk-action btn-bulk-cancel"
              >
                <span>Cancelar</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .log-container {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .log-header {
          margin-bottom: 0.5rem;
        }

        .text-3xl {
          font-size: 1.85rem;
          font-weight: 800;
        }

        .text-secondary {
          color: var(--text-secondary);
        }

        .text-sm {
          font-size: 0.9rem;
          margin-top: 0.25rem;
        }

        .mb-6 {
          margin-bottom: 1.5rem;
        }

        .mb-3 {
          margin-bottom: 0.75rem;
        }

        /* Toolbar styles */
        .toolbar-card {
          padding: 1.25rem;
          background: rgba(14, 17, 26, 0.5);
        }

        .toolbar-grid {
          display: grid;
          grid-template-columns: 2fr 1fr 1fr 1.2fr;
          gap: 1.25rem;
          align-items: end;
        }

        @media (max-width: 900px) {
          .toolbar-grid {
            grid-template-columns: 1fr 1fr;
          }
        }

        @media (max-width: 600px) {
          .toolbar-grid {
            grid-template-columns: 1fr;
          }
        }

        .search-wrapper {
          position: relative;
          display: flex;
          align-items: center;
        }

        .search-icon {
          position: absolute;
          left: 0.85rem;
          color: var(--text-muted);
          pointer-events: none;
        }

        .toolbar-input {
          width: 100%;
          padding: 0.7rem 1rem 0.7rem 2.3rem;
          background-color: rgba(9, 10, 15, 0.8);
          border: 1px solid var(--border-light);
          border-radius: 10px;
          color: var(--text-primary);
          font-family: var(--font-sans);
          font-size: 0.9rem;
          transition: all var(--transition-fast);
        }

        .toolbar-input:focus {
          outline: none;
          border-color: var(--color-primary);
          background-color: rgba(9, 10, 15, 0.95);
        }

        .filter-group {
          display: flex;
          flex-direction: column;
          gap: 0.4rem;
        }

        .toolbar-label {
          font-size: 0.75rem;
          font-weight: 600;
          color: var(--text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .toolbar-select {
          width: 100%;
          padding: 0.7rem 1rem;
          background-color: rgba(9, 10, 15, 0.8);
          border: 1px solid var(--border-light);
          border-radius: 10px;
          color: var(--text-primary);
          font-family: var(--font-sans);
          font-size: 0.9rem;
          cursor: pointer;
          transition: all var(--transition-fast);
        }

        .toolbar-select:focus {
          outline: none;
          border-color: var(--color-primary);
        }

        /* Workouts Table/Row Card */
        .workouts-list-wrapper {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .workout-row-card {
          padding: 1.25rem;
          border-radius: 16px;
          transition: border-color var(--transition-normal), box-shadow var(--transition-normal);
        }

        .running-card-hover:hover {
          border-color: rgba(16, 185, 129, 0.2);
          box-shadow: 0 8px 25px -5px rgba(0, 0, 0, 0.6), 0 0 15px rgba(16, 185, 129, 0.08);
        }

        .gym-card-hover:hover {
          border-color: rgba(236, 72, 153, 0.2);
          box-shadow: 0 8px 25px -5px rgba(0, 0, 0, 0.6), 0 0 15px rgba(236, 72, 153, 0.08);
        }

        .card-main-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1.5rem;
          flex-wrap: wrap;
        }

        .card-identity {
          display: flex;
          align-items: center;
          gap: 1rem;
          flex: 1;
          min-width: 0;
        }

        .activity-avatar-large {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .identity-text {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .identity-title-row {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          flex-wrap: wrap;
        }

        .workout-row-title {
          font-size: 1.05rem;
          font-weight: 700;
          color: var(--text-primary);
        }

        .badge-secondary {
          background-color: rgba(255, 255, 255, 0.04);
          color: var(--text-secondary);
          border: 1px solid var(--border-light);
        }

        .workout-meta-line {
          display: flex;
          align-items: center;
          gap: 0.85rem;
          font-size: 0.75rem;
          color: var(--text-muted);
          flex-wrap: wrap;
        }

        .meta-item {
          display: inline-flex;
          align-items: center;
          gap: 0.25rem;
          text-transform: capitalize;
        }

        /* Card metrics */
        .card-major-metrics {
          display: flex;
          gap: 2rem;
          flex-shrink: 0;
          justify-content: flex-end;
          align-items: center;
        }

        @media (max-width: 768px) {
          .card-major-metrics {
            justify-content: flex-start;
            width: 100%;
            border-top: 1px solid var(--border-light);
            padding-top: 1rem;
            margin-top: 0.25rem;
          }
        }

        .metric-box {
          display: flex;
          flex-direction: column;
        }

        .metric-box-label {
          font-size: 0.7rem;
          font-weight: 600;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .metric-box-value {
          font-size: 1.15rem;
          font-weight: 700;
          color: var(--text-primary);
          margin-top: 0.1rem;
        }

        .metric-box-value .unit {
          font-size: 0.75rem;
          font-weight: 500;
          color: var(--text-secondary);
        }

        /* Action buttons */
        .card-actions {
          display: flex;
          gap: 0.5rem;
          align-items: center;
        }

        .btn-action-expand, .btn-action-delete, .btn-action-edit {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid var(--border-light);
          color: var(--text-secondary);
          width: 36px;
          height: 36px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all var(--transition-fast);
        }

        .btn-action-expand:hover {
          background: rgba(139, 92, 246, 0.1);
          color: var(--color-primary);
          border-color: rgba(139, 92, 246, 0.25);
        }

        .btn-action-delete:hover {
          background: rgba(239, 68, 68, 0.15);
          color: #ef4444;
          border-color: rgba(239, 68, 68, 0.3);
        }

        .btn-action-edit:hover {
          background: rgba(16, 185, 129, 0.15);
          color: var(--color-running);
          border-color: rgba(16, 185, 129, 0.3);
        }

        /* Notes rows */
        .running-notes-row {
          margin-top: 1rem;
          padding-top: 0.75rem;
          border-top: 1px solid var(--border-light);
          font-size: 0.85rem;
          color: var(--text-secondary);
          display: flex;
          align-items: center;
          gap: 1.25rem;
          flex-wrap: wrap;
        }

        .running-notes-row p {
          flex: 1;
          min-width: 200px;
        }

        .physiological-stat {
          display: inline-flex;
          align-items: center;
          gap: 0.25rem;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid var(--border-light);
          padding: 0.2rem 0.5rem;
          border-radius: 6px;
          font-size: 0.75rem;
          color: var(--text-secondary);
        }

        /* Expanded gym tables */
        .gym-details-expanded {
          margin-top: 1.25rem;
          padding-top: 1rem;
          border-top: 1px solid var(--border-light);
        }

        .gym-exercises-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.85rem;
          text-align: left;
        }

        .gym-exercises-table th {
          color: var(--text-muted);
          font-weight: 600;
          padding: 0.6rem 0.75rem;
          border-bottom: 1px solid var(--border-light);
          font-size: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .gym-exercises-table td {
          padding: 0.75rem;
          border-bottom: 1px solid rgba(255, 255, 255, 0.03);
          color: var(--text-primary);
        }

        .gym-exercises-table tr:last-child td {
          border-bottom: none;
        }

        .center { text-align: center; }
        .right { text-align: right; }

        .rpe-pill {
          display: inline-block;
          padding: 0.15rem 0.4rem;
          border-radius: 4px;
          font-size: 0.7rem;
          font-weight: 700;
        }

        .rpe-1, .rpe-2, .rpe-3, .rpe-4, .rpe-5 {
          background-color: rgba(16, 185, 129, 0.15);
          color: #10b981;
        }
        .rpe-6, .rpe-7, .rpe-8 {
          background-color: rgba(245, 158, 11, 0.15);
          color: #f59e0b;
        }
        .rpe-9, .rpe-10 {
          background-color: rgba(239, 68, 68, 0.15);
          color: #ef4444;
        }

        .gym-notes-block {
          margin-top: 1rem;
          padding: 0.75rem;
          background: rgba(255, 255, 255, 0.01);
          border: 1px dashed var(--border-light);
          border-radius: 8px;
          font-size: 0.8rem;
          color: var(--text-secondary);
        }

        .empty-card {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 3.5rem 2rem;
          text-align: center;
          color: var(--text-muted);
        }

        .empty-card h3 {
          font-size: 1.15rem;
          font-weight: 700;
          color: var(--text-primary);
          margin-bottom: 0.25rem;
        }

        /* Expanded running details layout */
        .running-expanded-layout {
          display: grid;
          grid-template-columns: 1fr 1.5fr;
          gap: 1.5rem;
          align-items: center;
          padding: 1.25rem;
          background: rgba(255, 255, 255, 0.01);
          border: 1px solid var(--border-light);
          border-radius: 12px;
          margin-top: 1rem;
          text-align: left;
        }

        @media (max-width: 650px) {
          .running-expanded-layout {
            grid-template-columns: 1fr;
          }
        }

        .gauge-panel {
          display: flex;
          justify-content: center;
          align-items: center;
        }

        .advice-panel {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .advice-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 0.5rem;
        }

        .advice-intensity-badge {
          padding: 0.25rem 0.6rem;
          font-size: 0.75rem;
          font-weight: 700;
          border-radius: 6px;
          text-transform: uppercase;
        }

        .advice-effort-pct {
          font-size: 0.75rem;
          color: var(--text-secondary);
          font-weight: 600;
        }

        .advice-title {
          font-size: 0.95rem;
          font-weight: 700;
          color: var(--text-primary);
        }

        .advice-desc {
          font-size: 0.8rem;
          color: var(--text-secondary);
          line-height: 1.45;
        }

        .garmin-recommendation-box {
          background: rgba(255, 255, 255, 0.02);
          padding: 0.75rem;
          border-radius: 8px;
          font-size: 0.8rem;
          line-height: 1.4;
          color: var(--text-primary);
        }

        .recommendation-text strong {
          color: var(--text-primary);
        }

        .advice-footer-stats {
          display: flex;
          gap: 1.5rem;
          border-top: 1px dashed var(--border-light);
          padding-top: 0.75rem;
          margin-top: 0.25rem;
          flex-wrap: wrap;
        }

        .sub-stat {
          display: flex;
          flex-direction: column;
          gap: 0.1rem;
        }

        .sub-stat-label {
          font-size: 0.7rem;
          color: var(--text-muted);
          font-weight: 600;
          text-transform: uppercase;
        }

        .sub-stat-value {
          font-size: 0.85rem;
          font-weight: 700;
          color: var(--text-secondary);
        }

        /* New Custom styles for chips, tooltips, notes */
        .pill-chips-container {
          display: flex;
          gap: 0.75rem;
          flex-wrap: wrap;
          margin-bottom: 1.25rem;
        }

        .pill-chip {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.6rem 1.15rem;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid var(--border-light);
          border-radius: 50px;
          color: var(--text-secondary);
          font-family: var(--font-sans);
          font-size: 0.85rem;
          font-weight: 600;
          cursor: pointer;
          transition: all var(--transition-fast);
        }

        .pill-chip:hover {
          background: rgba(255, 255, 255, 0.06);
          color: var(--text-primary);
          border-color: rgba(255, 255, 255, 0.15);
        }

        .pill-chip.active {
          background: rgba(139, 92, 246, 0.15);
          color: var(--color-primary);
          border-color: var(--color-primary);
          box-shadow: 0 0 12px rgba(139, 92, 246, 0.25);
        }

        .relative-date-badge {
          color: var(--color-primary);
          font-weight: 700;
          letter-spacing: 0.02em;
          text-transform: none;
        }

        .record-badge {
          padding: 0.2rem 0.55rem;
          border-radius: 8px;
          font-weight: 800;
          font-size: 0.72rem;
          letter-spacing: 0.03em;
          display: inline-flex;
          align-items: center;
          gap: 0.3rem;
          transition: all 0.2s ease;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
        }

        .record-badge:hover {
          transform: translateY(-1px);
        }

        .medal-gold {
          background: rgba(245, 158, 11, 0.15) !important;
          border: 1px solid rgba(245, 158, 11, 0.65) !important;
          color: #f59e0b !important;
          text-shadow: 0 0 6px rgba(245, 158, 11, 0.4);
          box-shadow: 0 0 10px rgba(245, 158, 11, 0.15), inset 0 0 8px rgba(245, 158, 11, 0.05);
        }

        .medal-silver {
          background: rgba(148, 163, 184, 0.15) !important;
          border: 1px solid rgba(148, 163, 184, 0.65) !important;
          color: #cbd5e1 !important;
          text-shadow: 0 0 6px rgba(148, 163, 184, 0.4);
          box-shadow: 0 0 10px rgba(148, 163, 184, 0.1), inset 0 0 8px rgba(148, 163, 184, 0.05);
        }

        .medal-bronze {
          background: rgba(180, 83, 9, 0.15) !important;
          border: 1px solid rgba(180, 83, 9, 0.65) !important;
          color: #f97316 !important;
          text-shadow: 0 0 6px rgba(180, 83, 9, 0.4);
          box-shadow: 0 0 10px rgba(180, 83, 9, 0.1), inset 0 0 8px rgba(180, 83, 9, 0.05);
        }

        .info-trigger {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          margin-left: 5px;
          cursor: help;
          font-size: 0.72rem;
          opacity: 0.6;
          transition: opacity 0.2s ease;
          color: var(--color-primary);
          filter: drop-shadow(0 0 2px var(--color-primary));
        }

        .info-trigger:hover {
          opacity: 1;
        }

        .gym-coach-scientific-note, .running-coach-scientific-note {
          background: rgba(139, 92, 246, 0.03);
          border-left: 3px solid var(--color-primary);
          border-radius: 4px 8px 8px 4px;
          padding: 0.75rem 1rem;
          margin-top: 1rem;
          display: flex;
          gap: 0.6rem;
          align-items: flex-start;
        }

        .running-coach-scientific-note {
          background: rgba(255, 255, 255, 0.02);
          margin-bottom: 0.5rem;
        }

        .note-icon {
          font-size: 1.1rem;
          flex-shrink: 0;
          line-height: 1.1;
        }

        .note-text {
          font-size: 0.78rem;
          color: var(--text-secondary);
          line-height: 1.45;
          margin: 0;
          text-align: left;
        }

        .note-text code {
          background: rgba(255, 255, 255, 0.05);
          padding: 0.1rem 0.3rem;
          border-radius: 4px;
          font-family: monospace;
          color: var(--text-primary);
        }

        /* Checkbox Custom Styles */
        .workout-checkbox-wrapper {
          display: flex;
          align-items: center;
          justify-content: center;
          margin-right: 0.5rem;
        }

        .workout-row-checkbox {
          appearance: none;
          -webkit-appearance: none;
          width: 20px;
          height: 20px;
          border: 2px solid var(--border-light);
          border-radius: 6px;
          background: rgba(9, 10, 15, 0.6);
          cursor: pointer;
          position: relative;
          transition: all var(--transition-fast);
          outline: none;
        }

        .workout-row-checkbox:checked {
          background: var(--color-primary);
          border-color: var(--color-primary);
          box-shadow: 0 0 8px rgba(139, 92, 246, 0.4);
        }

        .workout-row-checkbox:checked::after {
          content: '✓';
          position: absolute;
          color: white;
          font-size: 13px;
          font-weight: bold;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
        }

        .workout-row-checkbox:hover {
          border-color: var(--color-primary);
          background: rgba(139, 92, 246, 0.05);
        }

        /* Selection Master Bar */
        .selection-master-bar {
          background: rgba(14, 17, 26, 0.4);
          border: 1px solid var(--border-light);
          padding: 0.75rem 1.25rem;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .master-bar-content {
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
        }

        .master-checkbox-label {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          cursor: pointer;
          font-size: 0.9rem;
          font-weight: 600;
          color: var(--text-secondary);
          user-select: none;
        }

        .master-checkbox-text {
          transition: color var(--transition-fast);
        }

        .master-checkbox-label:hover .master-checkbox-text {
          color: var(--text-primary);
        }

        .selection-count-badge {
          background: rgba(139, 92, 246, 0.15);
          color: var(--color-primary);
          border: 1px solid rgba(139, 92, 246, 0.3);
          padding: 0.25rem 0.75rem;
          border-radius: 50px;
          font-size: 0.8rem;
          font-weight: 700;
          letter-spacing: 0.02em;
          box-shadow: 0 0 10px rgba(139, 92, 246, 0.1);
        }

        /* Bulk Actions Bottom Drawer */
        .bulk-actions-drawer {
          position: fixed;
          bottom: -100px;
          left: 0;
          right: 0;
          z-index: 9999;
          background: rgba(10, 11, 18, 0.75);
          backdrop-filter: blur(25px);
          -webkit-backdrop-filter: blur(25px);
          border-top: 1px solid rgba(139, 92, 246, 0.3);
          box-shadow: 0 -15px 40px rgba(0, 0, 0, 0.6), 0 0 25px rgba(139, 92, 246, 0.15);
          padding: 1.25rem 2rem;
          transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
          opacity: 0;
          pointer-events: none;
        }

        .bulk-actions-drawer.show {
          bottom: 0;
          opacity: 1;
          pointer-events: auto;
        }

        .drawer-glow {
          position: absolute;
          top: 0;
          left: 10%;
          right: 10%;
          height: 1px;
          background: linear-gradient(90deg, transparent, var(--color-primary), transparent);
          filter: blur(2px);
          opacity: 0.8;
        }

        .drawer-container {
          max-width: 1200px;
          margin: 0 auto;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1.5rem;
          flex-wrap: wrap;
        }

        .drawer-info {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: var(--text-primary);
        }

        .drawer-count {
          font-size: 1rem;
          font-weight: 700;
          letter-spacing: -0.01em;
        }

        .drawer-subinfo {
          font-size: 0.85rem;
          color: var(--text-muted);
          font-weight: 500;
        }

        .drawer-actions {
          display: flex;
          align-items: center;
          gap: 0.85rem;
          flex-wrap: wrap;
        }

        .btn-bulk-action {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.65rem 1.25rem;
          border-radius: 10px;
          font-size: 0.85rem;
          font-weight: 700;
          cursor: pointer;
          transition: all var(--transition-fast);
          border: 1px solid transparent;
          font-family: var(--font-sans);
        }

        .btn-bulk-delete {
          background: rgba(239, 68, 68, 0.15);
          border-color: rgba(239, 68, 68, 0.3);
          color: #ef4444;
        }

        .btn-bulk-delete:hover {
          background: #ef4444;
          color: white;
          box-shadow: 0 0 15px rgba(239, 68, 68, 0.4);
          transform: translateY(-1px);
        }

        .btn-bulk-cancel {
          background: rgba(255, 255, 255, 0.04);
          border-color: var(--border-light);
          color: var(--text-secondary);
        }

        .btn-bulk-cancel:hover {
          background: rgba(255, 255, 255, 0.08);
          color: var(--text-primary);
          border-color: rgba(255, 255, 255, 0.15);
        }

        /* Bulk Reassign Dropdown */
        .bulk-select-wrapper {
          position: relative;
          display: flex;
          align-items: center;
        }

        .bulk-select-icon {
          position: absolute;
          left: 0.85rem;
          color: var(--text-muted);
          pointer-events: none;
        }

        .bulk-select-dropdown {
          padding: 0.65rem 1rem 0.65rem 2.2rem;
          background: rgba(9, 10, 15, 0.8);
          border: 1px solid var(--border-light);
          border-radius: 10px;
          color: var(--text-secondary);
          font-family: var(--font-sans);
          font-size: 0.85rem;
          font-weight: 600;
          cursor: pointer;
          transition: all var(--transition-fast);
          appearance: none;
          -webkit-appearance: none;
          padding-right: 2rem;
        }

        .bulk-select-dropdown:hover {
          border-color: var(--color-primary);
          color: var(--text-primary);
        }

        .bulk-select-dropdown:focus {
          outline: none;
          border-color: var(--color-primary);
        }

        .bulk-select-wrapper::after {
          content: '▼';
          font-size: 8px;
          color: var(--text-muted);
          position: absolute;
          right: 0.85rem;
          pointer-events: none;
        }

        /* ===== Mobile Overrides: WorkoutsLog ===== */
        @media (max-width: 768px) {
          .log-container {
            gap: 1rem;
          }

          /* Full-width cards */
          .workout-row-card {
            padding: 1rem;
          }

          /* Stack identity + metrics vertically */
          .card-main-row {
            flex-direction: column;
            align-items: flex-start;
            gap: 0.75rem;
          }

          .card-identity {
            width: 100%;
          }

          .card-major-metrics {
            width: 100%;
            justify-content: flex-start;
            gap: 1rem;
            flex-wrap: wrap;
            border-top: 1px solid var(--border-light);
            padding-top: 0.75rem;
          }

          /* Move action buttons to same row as identity */
          .card-actions {
            position: absolute;
            top: 1rem;
            right: 1rem;
          }

          .workout-row-card {
            position: relative;
          }

          /* Slightly smaller titles on mobile */
          .workout-row-title {
            font-size: 0.95rem;
          }

          /* Running expanded: scroll gauge horizontally */
          .gauge-panel svg {
            max-width: 100%;
          }

          .running-notes-row p {
            min-width: 0;
          }

          /* Bulk actions drawer */
          .bulk-actions-drawer {
            padding: 1rem;
          }
          
          .drawer-container {
            flex-direction: column;
            align-items: stretch;
            gap: 1rem;
          }

          .drawer-actions {
            justify-content: flex-end;
          }

          .bulk-select-wrapper, .btn-bulk-action {
            flex: 1;
            justify-content: center;
          }
        }

        @media (max-width: 480px) {
          .metric-box-value {
            font-size: 0.95rem;
          }

          .card-major-metrics {
            gap: 0.75rem;
          }

          .activity-avatar-large {
            width: 40px;
            height: 40px;
          }
        }
      `}</style>
    </div>
  );
}
