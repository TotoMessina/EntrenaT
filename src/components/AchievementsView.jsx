import React, { useState, useEffect } from 'react';
import { 
  Zap, 
  Dumbbell, 
  Trophy, 
  Lock, 
  Check, 
  Award,
  Calendar,
  ChevronRight,
  Sparkles,
  User,
  Heart,
  Scale,
  Ruler,
  TrendingUp,
  Activity,
  Edit2,
  Save,
  X,
  Info,
  Star
} from 'lucide-react';
import { calculateAchievements, getAdvancedAthleticStats } from '../utils/achievements';

/**
 * Vista premium del panel de logros y medallas deportivas.
 * @param {Array} workouts Historial de entrenamientos actual del usuario.
 * @param {Object} profile Datos del deportista en localStorage.
 * @param {Function} onProfileChange Callback para propagar los cambios del perfil a App.jsx y localStorage.
 */
export default function AchievementsView({ 
  workouts, 
  profile, 
  onProfileChange, 
  setShowConfetti, 
  onSaveWorkout, 
  setActiveToast 
}) {
  // Calculamos los logros y estadísticas basados en la prop reactiva del perfil
  const achievements = calculateAchievements(workouts, profile);
  const advancedStats = getAdvancedAthleticStats(workouts, profile);
  
  let unlockedTiersCount = 0;
  achievements.forEach(a => {
    if (a.tier === 'bronze') unlockedTiersCount += 1;
    if (a.tier === 'silver') unlockedTiersCount += 2;
    if (a.tier === 'gold' || a.tier === 'maxed') unlockedTiersCount += 3;
  });
  
  const totalCount = achievements.length * 3;
  const overallProgress = Math.round((unlockedTiersCount / totalCount) * 100);

  // Estados del Formulario de Perfil Deportivo
  const [isEditing, setIsEditing] = useState(false);

  const handleShareAchievement = async (medal) => {
    if (setShowConfetti) {
      setShowConfetti(false);
      setTimeout(() => setShowConfetti(true), 50);
    }
    
    const todayStr = new Date().toISOString().split('T')[0];
    const sharePost = {
      id: `achievement-${medal.id}-${Date.now()}`,
      type: 'running',
      date: todayStr,
      distance: 0,
      duration: '00:00:00',
      terrain: 'Pista',
      rpe: 10,
      notes: `🏅 ¡Logro Desbloqueado: ${medal.title}! (${medal.subtitle}) ${medal.description} Marca alcanzada: ${medal.currentValue}. ¿Cómo viene su semana de entrenamientos, equipo? ⚡🏃‍♂️💪`
    };
    
    if (onSaveWorkout) {
      const res = await onSaveWorkout(sharePost);
      if (res?.success) {
        if (setActiveToast) {
          setActiveToast({
            title: '¡Logro Compartido!',
            message: `Publicaste tu medalla de "${medal.title}" en el feed social con éxito.`,
            type: 'success'
          });
        }
      }
    }
  };
  const [formData, setFormData] = useState({
    displayName: profile?.displayName || '',
    username: profile?.username || '',
    age: profile?.age || 25,
    weight: profile?.weight || 75,
    height: profile?.height || 175,
    restingHR: profile?.restingHR || 60,
    gender: profile?.gender || 'male'
  });

  // Mantener en sincronía cuando cambie la prop
  useEffect(() => {
    if (profile) {
      setFormData({
        displayName: profile.displayName || '',
        username: profile.username || '',
        age: profile.age,
        weight: profile.weight,
        height: profile.height,
        restingHR: profile.restingHR,
        gender: profile.gender
      });
    }
  }, [profile]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: ['gender', 'displayName', 'username'].includes(name) ? value : Number(value)
    }));
  };

  const handleSave = (e) => {
    e.preventDefault();
    if (onProfileChange) {
      onProfileChange(formData);
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setFormData({
      displayName: profile.displayName || '',
      username: profile.username || '',
      age: profile.age,
      weight: profile.weight,
      height: profile.height,
      restingHR: profile.restingHR,
      gender: profile.gender
    });
    setIsEditing(false);
  };

  // Selector de clasificación de fuerza relativa
  const getLiftRating = (liftType, ratioVal) => {
    const ratio = parseFloat(ratioVal);
    if (isNaN(ratio) || ratio <= 0) return { text: 'Sin Registro', class: 'rating-novice' };
    
    if (liftType === 'bench') {
      if (ratio >= 1.5) return { text: 'Élite', class: 'rating-elite' };
      if (ratio >= 1.2) return { text: 'Avanzado', class: 'rating-advanced' };
      if (ratio >= 0.8) return { text: 'Intermedio', class: 'rating-intermediate' };
      return { text: 'Novato', class: 'rating-novice' };
    } else if (liftType === 'squat') {
      if (ratio >= 2.0) return { text: 'Élite', class: 'rating-elite' };
      if (ratio >= 1.5) return { text: 'Avanzado', class: 'rating-advanced' };
      if (ratio >= 1.0) return { text: 'Intermedio', class: 'rating-intermediate' };
      return { text: 'Novato', class: 'rating-novice' };
    } else { // deadlift
      if (ratio >= 2.5) return { text: 'Élite', class: 'rating-elite' };
      if (ratio >= 2.0) return { text: 'Avanzado', class: 'rating-advanced' };
      if (ratio >= 1.2) return { text: 'Intermedio', class: 'rating-intermediate' };
      return { text: 'Novato', class: 'rating-novice' };
    }
  };

  // Selector de íconos dinámicos
  const renderIcon = (iconName, colorTheme, isUnlocked) => {
    const iconProps = {
      size: 28,
      className: `medal-icon ${isUnlocked ? 'active-neon' : ''}`
    };

    switch (iconName) {
      case 'Zap':
        return <Zap {...iconProps} />;
      case 'Dumbbell':
        return <Dumbbell {...iconProps} />;
      case 'Trophy':
        return <Trophy {...iconProps} />;
      default:
        return <Award {...iconProps} />;
    }
  };

  return (
    <div className="achievements-view-container animate-fade-in">
      {/* HEADER SECTION */}
      <header className="achievements-header glass-card">
        <div className="header-badge">
          <Sparkles size={16} className="sparkle-icon" />
          <span>Gamificación Activa</span>
        </div>
        <h1 className="header-title">Logros y Hitos Deportivos</h1>
        <p className="header-subtitle">
          Supera tus límites en cada corrida y sesión de gimnasio. Desbloquea medallas de rendimiento y consolida tu legado atlético.
        </p>

        {/* OVERALL PROGRESS ROW */}
        <div className="overall-progress-container">
          <div className="overall-progress-stats">
            <span className="stats-label">Progreso de la Temporada</span>
            <span className="stats-value">{unlockedTiersCount} de {totalCount} Niveles</span>
          </div>
          <div className="progress-bar-wrapper">
            <div 
              className="progress-bar-fill" 
              style={{ width: `${overallProgress}%`, background: 'linear-gradient(90deg, var(--color-running) 0%, var(--color-primary) 100%)' }}
            ></div>
          </div>
          <span className="progress-percentage">{overallProgress}% Completado</span>
        </div>
      </header>

      {/* SECCIÓN SUPERIOR: PERFIL Y MÉTRICAS AVANZADAS */}
      <div className="profile-analytics-section">
        {/* PANEL DE PERFIL DEPORTIVO */}
        <div className="profile-card glass-card">
          <div className="profile-card-header">
            <div className="avatar-wrapper">
              <User size={24} className="avatar-icon" />
            </div>
            <div>
              <h2 className="profile-title">{profile.displayName || 'Invitado'}</h2>
              <span className="profile-tag">@{profile.username || 'invitado'}</span>
            </div>
            {!isEditing && (
              <button 
                onClick={() => setIsEditing(true)}
                className="edit-profile-btn"
                title="Editar Datos Deportivos"
              >
                <Edit2 size={16} />
                <span>Editar</span>
              </button>
            )}
          </div>

          {isEditing ? (
            <form onSubmit={handleSave} className="profile-form">
              <div className="form-grid">
                <div className="form-group-custom">
                  <label className="form-label-custom">
                    <User size={14} className="input-icon" /> Nombre
                  </label>
                  <input
                    type="text"
                    name="displayName"
                    required
                    value={formData.displayName}
                    onChange={handleChange}
                    className="form-input-custom"
                    placeholder="Tu nombre completo"
                  />
                </div>

                <div className="form-group-custom">
                  <label className="form-label-custom">
                    <Sparkles size={14} className="input-icon" /> Nombre de Usuario
                  </label>
                  <input
                    type="text"
                    name="username"
                    required
                    value={formData.username}
                    onChange={handleChange}
                    className="form-input-custom"
                    placeholder="nombre_usuario"
                  />
                </div>

                <div className="form-group-custom">
                  <label className="form-label-custom">
                    <Calendar size={14} className="input-icon" /> Edad (años)
                  </label>
                  <input
                    type="number"
                    name="age"
                    min="1"
                    max="120"
                    required
                    value={formData.age}
                    onChange={handleChange}
                    className="form-input-custom"
                  />
                </div>
                
                <div className="form-group-custom">
                  <label className="form-label-custom">
                    <Scale size={14} className="input-icon" /> Peso (kg)
                  </label>
                  <input
                    type="number"
                    name="weight"
                    min="20"
                    max="300"
                    step="0.1"
                    required
                    value={formData.weight}
                    onChange={handleChange}
                    className="form-input-custom"
                  />
                </div>

                <div className="form-group-custom">
                  <label className="form-label-custom">
                    <Ruler size={14} className="input-icon" /> Altura (cm)
                  </label>
                  <input
                    type="number"
                    name="height"
                    min="50"
                    max="250"
                    required
                    value={formData.height}
                    onChange={handleChange}
                    className="form-input-custom"
                  />
                </div>

                <div className="form-group-custom">
                  <label className="form-label-custom">
                    <Heart size={14} className="input-icon" /> FC Reposo (bpm)
                  </label>
                  <input
                    type="number"
                    name="restingHR"
                    min="30"
                    max="120"
                    required
                    value={formData.restingHR}
                    onChange={handleChange}
                    className="form-input-custom"
                  />
                </div>

                <div className="form-group-custom full-width">
                  <label className="form-label-custom">
                    <Activity size={14} className="input-icon" /> Género
                  </label>
                  <select
                    name="gender"
                    value={formData.gender}
                    onChange={handleChange}
                    className="form-input-custom select-custom"
                  >
                    <option value="male">Masculino</option>
                    <option value="female">Femenino</option>
                  </select>
                </div>
              </div>

              <div className="form-actions">
                <button type="submit" className="save-btn">
                  <Save size={16} />
                  <span>Guardar</span>
                </button>
                <button type="button" onClick={handleCancel} className="cancel-btn">
                  <X size={16} />
                  <span>Cancelar</span>
                </button>
              </div>
            </form>
          ) : (
            <div className="profile-display">
              <div className="display-grid">
                <div className="display-item">
                  <Calendar size={18} className="display-icon text-primary" />
                  <div className="display-info">
                    <span className="display-label">Edad</span>
                    <span className="display-value">{profile.age} años</span>
                  </div>
                </div>

                <div className="display-item">
                  <Scale size={18} className="display-icon text-gym" />
                  <div className="display-info">
                    <span className="display-label">Peso</span>
                    <span className="display-value">{profile.weight} kg</span>
                  </div>
                </div>

                <div className="display-item">
                  <Ruler size={18} className="display-icon text-primary" />
                  <div className="display-info">
                    <span className="display-label">Altura</span>
                    <span className="display-value">{profile.height} cm</span>
                  </div>
                </div>

                <div className="display-item">
                  <Heart size={18} className="display-icon text-running" />
                  <div className="display-info">
                    <span className="display-label">FC Reposo</span>
                    <span className="display-value">{profile.restingHR} bpm</span>
                  </div>
                </div>
              </div>
              
              <div className="display-footer">
                <span className="gender-display">
                  Género: <strong>{profile.gender === 'male' ? 'Masculino' : 'Femenino'}</strong>
                </span>
                <span className="experience-display">
                  Nivel: <strong>Amateur Avanzado</strong>
                </span>
              </div>
            </div>
          )}
        </div>

        {/* METRICAS DE FUERZA Y CARDIO */}
        <div className="advanced-stats-card glass-card">
          <h2 className="stats-main-title">
            <TrendingUp size={20} className="stats-icon text-primary animate-pulse" />
            Métricas Deportivas Avanzadas
          </h2>
          
          <div className="stats-subgrid">
            {/* LIFTING RATIOS */}
            <div className="stats-block gym-block">
              <h3 className="block-title">
                <Dumbbell size={16} className="title-icon text-gym" />
                Relación Fuerza-Peso (1RM / Corporal)
              </h3>
              
              <div className="lift-metrics-list">
                {/* Bench Press */}
                <div className="lift-item">
                  <div className="lift-header">
                    <span className="lift-name">Press de Banca</span>
                    <span className={`lift-rating-badge ${getLiftRating('bench', advancedStats.benchRatio).class}`}>
                      {getLiftRating('bench', advancedStats.benchRatio).text}
                    </span>
                  </div>
                  <div className="lift-value-row">
                    <span className="lift-weight-info">Récord: {advancedStats.bestBench} kg</span>
                    <span className="lift-ratio-info">{advancedStats.benchRatio}x peso</span>
                  </div>
                  <div className="lift-progress-track">
                    <div 
                      className="lift-progress-bar" 
                      style={{ 
                        width: `${Math.min(100, (parseFloat(advancedStats.benchRatio) / 1.5) * 100)}%`,
                        backgroundColor: 'var(--color-gym)'
                      }}
                    ></div>
                  </div>
                  <span className="lift-target-label">Meta Élite: 1.50x</span>
                </div>

                {/* Squat */}
                <div className="lift-item">
                  <div className="lift-header">
                    <span className="lift-name">Sentadilla</span>
                    <span className={`lift-rating-badge ${getLiftRating('squat', advancedStats.squatRatio).class}`}>
                      {getLiftRating('squat', advancedStats.squatRatio).text}
                    </span>
                  </div>
                  <div className="lift-value-row">
                    <span className="lift-weight-info">Récord: {advancedStats.bestSquat} kg</span>
                    <span className="lift-ratio-info">{advancedStats.squatRatio}x peso</span>
                  </div>
                  <div className="lift-progress-track">
                    <div 
                      className="lift-progress-bar" 
                      style={{ 
                        width: `${Math.min(100, (parseFloat(advancedStats.squatRatio) / 2.0) * 100)}%`,
                        backgroundColor: 'var(--color-gym)'
                      }}
                    ></div>
                  </div>
                  <span className="lift-target-label">Meta Élite: 2.00x</span>
                </div>

                {/* Deadlift */}
                <div className="lift-item">
                  <div className="lift-header">
                    <span className="lift-name">Peso Muerto</span>
                    <span className={`lift-rating-badge ${getLiftRating('deadlift', advancedStats.deadliftRatio).class}`}>
                      {getLiftRating('deadlift', advancedStats.deadliftRatio).text}
                    </span>
                  </div>
                  <div className="lift-value-row">
                    <span className="lift-weight-info">Récord: {advancedStats.bestDeadlift} kg</span>
                    <span className="lift-ratio-info">{advancedStats.deadliftRatio}x peso</span>
                  </div>
                  <div className="lift-progress-track">
                    <div 
                      className="lift-progress-bar" 
                      style={{ 
                        width: `${Math.min(100, (parseFloat(advancedStats.deadliftRatio) / 2.5) * 100)}%`,
                        backgroundColor: 'var(--color-gym)'
                      }}
                    ></div>
                  </div>
                  <span className="lift-target-label">Meta Élite: 2.50x</span>
                </div>
              </div>
            </div>

            {/* CARDIO & HR ZONES */}
            <div className="stats-block running-block">
              <h3 className="block-title">
                <Heart size={16} className="title-icon text-running" />
                Resistencia y Fisiología Cardiovascular
              </h3>

              <div className="cardio-metrics-list">
                <div className="cardio-item">
                  <div className="cardio-header">
                    <span className="cardio-label">VO2 Máx Estimado (FC Reposo)</span>
                    <span className="cardio-badge-rating">{advancedStats.vo2MaxRating}</span>
                  </div>
                  <div className="vo2-value-container">
                    <span className="vo2-main-val text-running">{advancedStats.vo2MaxHR}</span>
                    <span className="vo2-unit">ml/kg/min</span>
                  </div>
                </div>

                <div className="cardio-item">
                  <div className="cardio-header">
                    <span className="cardio-label">VO2 Máx Estimado (Rendimiento Carrera)</span>
                    <span className="cardio-badge-rating-sec">Cooper Test</span>
                  </div>
                  <div className="vo2-value-container">
                    <span className="vo2-main-val text-primary">{advancedStats.vo2MaxPerf}</span>
                    <span className="vo2-unit">ml/kg/min</span>
                  </div>
                </div>

                <div className="hr-zones-science">
                  <div className="science-header">
                    <Activity size={14} className="text-running" />
                    <span>Zonas Científicas de Frecuencia Cardíaca</span>
                  </div>
                  
                  <div className="science-metrics-row">
                    <div className="science-metric">
                      <span className="science-lbl">FC Máxima Tanaka</span>
                      <span className="science-val">{advancedStats.maxHR} bpm</span>
                    </div>
                    <div className="science-metric border-left-custom">
                      <span className="science-lbl">Zona 2 (Resistencia)</span>
                      <span className="science-val text-running">
                        {Math.round(advancedStats.maxHR * 0.6)} - {Math.round(advancedStats.maxHR * 0.7)} bpm
                      </span>
                    </div>
                  </div>
                  <p className="science-footer-text">
                    La Zona 2 optimiza la mitocondria y el uso de grasas. Se calcula dinámicamente usando la fórmula de Tanaka (208 - 0.7 × edad).
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ACHIEVEMENTS GRID */}
      <h2 className="gallery-section-title">
        <Sparkles size={20} className="gallery-icon text-primary animate-pulse" />
        Medallas Deportivas Obtenidas
      </h2>

      <div className="achievements-grid">
        {achievements.map((medal) => {
          const isUnlocked = medal.isUnlocked;
          const themeClass = `theme-${medal.colorTheme}`;
          const tierClass = `tier-${medal.tier}`;
          
          return (
            <div 
              key={medal.id} 
              className={`achievement-card glass-card ${isUnlocked ? 'unlocked' : 'locked'} ${themeClass} ${tierClass}`}
            >
              {/* Card Neon Glow Ambient Layer (Unlocked only) */}
              {isUnlocked && <div className="neon-glow-ambient"></div>}

              {/* CARD HEADER */}
              <div className="card-top">
                <div className={`medal-icon-container ${isUnlocked ? 'active' : 'inactive'}`}>
                  {renderIcon(medal.iconName, medal.colorTheme, isUnlocked)}
                </div>
                
                <div className="tier-stars" title={`Nivel Actual: ${medal.tier.toUpperCase()}`}>
                  <Star size={16} fill={medal.tier === 'bronze' || medal.tier === 'silver' || medal.tier === 'gold' || medal.tier === 'maxed' ? 'currentColor' : 'none'} className={medal.tier === 'bronze' || medal.tier === 'silver' || medal.tier === 'gold' || medal.tier === 'maxed' ? 'star-active star-bronze' : 'star-inactive'} />
                  <Star size={16} fill={medal.tier === 'silver' || medal.tier === 'gold' || medal.tier === 'maxed' ? 'currentColor' : 'none'} className={medal.tier === 'silver' || medal.tier === 'gold' || medal.tier === 'maxed' ? 'star-active star-silver' : 'star-inactive'} />
                  <Star size={16} fill={medal.tier === 'gold' || medal.tier === 'maxed' ? 'currentColor' : 'none'} className={medal.tier === 'gold' || medal.tier === 'maxed' ? 'star-active star-gold' : 'star-inactive'} />
                </div>
              </div>

              {/* CARD INFO */}
              <div className="card-body">
                <h3 className="medal-title">{medal.title}</h3>
                <h4 className="medal-subtitle">{medal.subtitle}</h4>
                <p className="medal-description">{medal.description}</p>
              </div>

              {/* CARD PROGRESS & METRICS */}
              <div className="card-footer">
                <div className="metric-row">
                  <span className="metric-label">Tu récord actual</span>
                  <span className="metric-target">Meta: {medal.targetValue}</span>
                </div>
                
                <div className="metric-value-display">
                  <span className={`current-val ${isUnlocked ? 'unlocked-text' : 'locked-text'}`}>
                    {medal.currentValue}
                  </span>
                  <ChevronRight size={14} className="arrow-divider" />
                  <span className="target-val">{medal.targetValue}</span>
                </div>

                {/* Progress bar */}
                <div className="medal-progress-bar-bg">
                  <div 
                    className="medal-progress-bar-fill" 
                    style={{ width: `${medal.progressPct}%` }}
                  ></div>
                </div>
                
                <div className="progress-footer">
                  <span className="pct-text">{medal.progressPct}% al sgte. nivel</span>
                  {medal.detailText && (
                    <span className="detail-date-text">
                      {medal.detailText}
                    </span>
                  )}
                </div>

                {isUnlocked && (
                  <button
                    onClick={() => handleShareAchievement(medal)}
                    className="share-achievement-btn animate-fade-in"
                    style={{
                      width: '100%',
                      marginTop: '0.85rem',
                      padding: '0.55rem',
                      borderRadius: '8px',
                      background: 'rgba(139, 92, 246, 0.12)',
                      border: '1px solid rgba(139, 92, 246, 0.3)',
                      color: 'var(--color-primary)',
                      fontSize: '0.75rem',
                      fontWeight: '700',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.35rem',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <Sparkles size={14} className="sparkle-icon" />
                    <span>Compartir en Comunidad</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* COMPONENT STYLES */}
      <style>{`
        .share-achievement-btn:hover {
          background: rgba(139, 92, 246, 0.22) !important;
          border-color: rgba(139, 92, 246, 0.5) !important;
          color: #fff !important;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(139, 92, 246, 0.2);
        }
        .share-achievement-btn:active {
          transform: translateY(0) scale(0.97);
        }
        .achievements-view-container {
          display: flex;
          flex-direction: column;
          gap: 2rem;
          max-width: 1200px;
          margin: 0 auto;
          padding-bottom: 3rem;
        }

        .achievements-header {
          position: relative;
          padding: 2.5rem !important;
          border-radius: 24px;
          overflow: hidden;
        }

        .header-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.35rem 0.85rem;
          background: rgba(139, 92, 246, 0.1);
          border: 1px solid rgba(139, 92, 246, 0.25);
          border-radius: 100px;
          font-size: 0.8rem;
          font-weight: 600;
          color: var(--color-primary);
          margin-bottom: 1.25rem;
        }

        .sparkle-icon {
          animation: spin 3s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .header-title {
          font-size: 2.2rem;
          font-weight: 800;
          letter-spacing: -0.03em;
          margin-bottom: 0.75rem;
          background: linear-gradient(135deg, var(--text-primary) 0%, var(--text-secondary) 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .header-subtitle {
          font-size: 1.1rem;
          color: var(--text-secondary);
          max-width: 700px;
          line-height: 1.6;
          margin-bottom: 2rem;
        }

        /* Overall progress */
        .overall-progress-container {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid var(--border-light);
          padding: 1.25rem;
          border-radius: 16px;
          max-width: 550px;
        }

        .overall-progress-stats {
          display: flex;
          justify-content: space-between;
          font-size: 0.9rem;
          font-weight: 600;
        }

        .stats-label {
          color: var(--text-secondary);
        }

        .stats-value {
          color: var(--text-primary);
        }

        .progress-bar-wrapper {
          height: 8px;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 4px;
          overflow: hidden;
        }

        .progress-bar-fill {
          height: 100%;
          border-radius: 4px;
          transition: width 0.8s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .progress-percentage {
          font-size: 0.8rem;
          font-weight: 700;
          color: var(--color-primary);
          text-align: right;
        }

        /* Profile & Analytics Grid */
        .profile-analytics-section {
          display: grid;
          grid-template-columns: 1fr 2fr;
          gap: 1.75rem;
        }

        @media (max-width: 1024px) {
          .profile-analytics-section {
            grid-template-columns: 1fr;
          }
        }

        /* Profile Card */
        .profile-card {
          padding: 2rem !important;
          border-radius: 20px;
          display: flex;
          flex-direction: column;
          justify-content: flex-start;
          background: var(--bg-surface);
          border: 1px solid var(--border-light);
          height: 100%;
          transition: border-color 0.3s ease;
        }

        .profile-card:hover {
          border-color: rgba(139, 92, 246, 0.25);
        }

        .profile-card-header {
          display: flex;
          align-items: center;
          gap: 1rem;
          margin-bottom: 1.75rem;
          position: relative;
          width: 100%;
        }

        .avatar-wrapper {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          background: rgba(139, 92, 246, 0.15);
          border: 1px solid rgba(139, 92, 246, 0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--color-primary);
        }

        .profile-title {
          font-size: 1.3rem;
          font-weight: 800;
          color: var(--text-primary);
          letter-spacing: -0.02em;
        }

        .profile-tag {
          font-size: 0.78rem;
          color: var(--color-primary);
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .edit-profile-btn {
          margin-left: auto;
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid var(--border-light);
          padding: 0.4rem 0.8rem;
          border-radius: 8px;
          font-size: 0.8rem;
          font-weight: 600;
          color: var(--text-secondary);
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .edit-profile-btn:hover {
          background: rgba(139, 92, 246, 0.1);
          border-color: rgba(139, 92, 246, 0.3);
          color: var(--color-primary);
        }

        /* Profile Display mode */
        .profile-display {
          display: flex;
          flex-direction: column;
          flex: 1;
        }

        .display-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 1.25rem;
          margin-bottom: 2rem;
        }

        .display-item {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid var(--border-light);
          padding: 0.9rem;
          border-radius: 12px;
        }

        .display-icon {
          flex-shrink: 0;
        }

        .display-info {
          display: flex;
          flex-direction: column;
        }

        .display-label {
          font-size: 0.72rem;
          color: var(--text-muted);
          font-weight: 600;
          text-transform: uppercase;
        }

        .display-value {
          font-size: 1.05rem;
          font-weight: 700;
          color: var(--text-primary);
        }

        .display-footer {
          margin-top: auto;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          padding-top: 1.25rem;
          border-top: 1px solid var(--border-light);
          font-size: 0.82rem;
          color: var(--text-secondary);
        }

        /* Profile Editing mode Form */
        .profile-form {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }

        .form-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 1rem;
        }

        .form-group-custom {
          display: flex;
          flex-direction: column;
          gap: 0.4rem;
        }

        .form-group-custom.full-width {
          grid-column: span 2;
        }

        .form-label-custom {
          font-size: 0.75rem;
          font-weight: 700;
          color: var(--text-secondary);
          display: flex;
          align-items: center;
          gap: 0.35rem;
        }

        .input-icon {
          opacity: 0.7;
        }

        .form-input-custom {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid var(--border-light);
          padding: 0.65rem 0.85rem;
          border-radius: 8px;
          font-size: 0.95rem;
          font-weight: 600;
          color: var(--text-primary);
          width: 100%;
          outline: none;
          transition: all 0.25s ease;
        }

        .form-input-custom:focus {
          border-color: var(--color-primary);
          box-shadow: 0 0 10px rgba(139, 92, 246, 0.25);
          background: rgba(255, 255, 255, 0.06);
        }

        .select-custom {
          cursor: pointer;
        }

        .select-custom option {
          background: var(--bg-surface);
          color: var(--text-primary);
        }

        .form-actions {
          display: flex;
          gap: 0.75rem;
          margin-top: 0.5rem;
        }

        .save-btn {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.4rem;
          background: var(--color-primary);
          border: none;
          padding: 0.65rem;
          border-radius: 8px;
          color: white;
          font-weight: 700;
          font-size: 0.9rem;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .save-btn:hover {
          filter: brightness(1.1);
          box-shadow: 0 4px 15px rgba(139, 92, 246, 0.35);
        }

        .cancel-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.4rem;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid var(--border-light);
          padding: 0.65rem 1rem;
          border-radius: 8px;
          color: var(--text-secondary);
          font-weight: 600;
          font-size: 0.9rem;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .cancel-btn:hover {
          background: rgba(255, 255, 255, 0.1);
          color: var(--text-primary);
        }

        /* Advanced Stats Card */
        .advanced-stats-card {
          padding: 2rem !important;
          border-radius: 20px;
          background: var(--bg-surface);
          border: 1px solid var(--border-light);
          display: flex;
          flex-direction: column;
        }

        .stats-main-title {
          font-size: 1.35rem;
          font-weight: 800;
          color: var(--text-primary);
          letter-spacing: -0.02em;
          display: flex;
          align-items: center;
          gap: 0.6rem;
          margin-bottom: 1.5rem;
          border-bottom: 1px solid var(--border-light);
          padding-bottom: 0.75rem;
        }

        .stats-subgrid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1.75rem;
          flex: 1;
        }

        @media (max-width: 768px) {
          .stats-subgrid {
            grid-template-columns: 1fr;
            gap: 1.5rem;
          }
        }

        .stats-block {
          display: flex;
          flex-direction: column;
          gap: 1.15rem;
        }

        .block-title {
          font-size: 0.88rem;
          font-weight: 700;
          color: var(--text-secondary);
          display: flex;
          align-items: center;
          gap: 0.45rem;
          text-transform: uppercase;
          letter-spacing: 0.03em;
        }

        .title-icon {
          flex-shrink: 0;
        }

        /* Lift metrics style */
        .lift-metrics-list {
          display: flex;
          flex-direction: column;
          gap: 1.1rem;
        }

        .lift-item {
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
          background: rgba(255, 255, 255, 0.01);
          border: 1px solid var(--border-light);
          padding: 0.75rem;
          border-radius: 10px;
        }

        .lift-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .lift-name {
          font-size: 0.88rem;
          font-weight: 700;
          color: var(--text-primary);
        }

        .lift-rating-badge {
          font-size: 0.68rem;
          font-weight: 800;
          padding: 0.15rem 0.45rem;
          border-radius: 100px;
          text-transform: uppercase;
          letter-spacing: 0.03em;
        }

        .rating-elite {
          background: rgba(236, 72, 153, 0.15);
          border: 1px solid rgba(236, 72, 153, 0.3);
          color: #f472b6;
        }

        .rating-advanced {
          background: rgba(139, 92, 246, 0.15);
          border: 1px solid rgba(139, 92, 246, 0.3);
          color: #a78bfa;
        }

        .rating-intermediate {
          background: rgba(16, 185, 129, 0.15);
          border: 1px solid rgba(16, 185, 129, 0.3);
          color: #34d399;
        }

        .rating-novice {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid var(--border-light);
          color: var(--text-muted);
        }

        .lift-value-row {
          display: flex;
          justify-content: space-between;
          font-size: 0.8rem;
          font-weight: 600;
        }

        .lift-weight-info {
          color: var(--text-secondary);
        }

        .lift-ratio-info {
          color: var(--color-gym);
          font-weight: 700;
        }

        .lift-progress-track {
          height: 4px;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 100px;
          overflow: hidden;
          margin-top: 0.15rem;
        }

        .lift-progress-bar {
          height: 100%;
          border-radius: 100px;
          transition: width 0.8s ease-in-out;
        }

        .lift-target-label {
          font-size: 0.68rem;
          color: var(--text-muted);
          text-align: right;
          font-weight: 600;
        }

        /* Cardio metrics style */
        .cardio-metrics-list {
          display: flex;
          flex-direction: column;
          gap: 1.1rem;
        }

        .cardio-item {
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
          background: rgba(255, 255, 255, 0.01);
          border: 1px solid var(--border-light);
          padding: 0.75rem;
          border-radius: 10px;
        }

        .cardio-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .cardio-label {
          font-size: 0.82rem;
          font-weight: 700;
          color: var(--text-secondary);
        }

        .cardio-badge-rating {
          font-size: 0.68rem;
          font-weight: 800;
          background: rgba(16, 185, 129, 0.15);
          border: 1px solid rgba(16, 185, 129, 0.3);
          color: #34d399;
          padding: 0.15rem 0.45rem;
          border-radius: 100px;
          text-transform: uppercase;
        }

        .cardio-badge-rating-sec {
          font-size: 0.68rem;
          font-weight: 800;
          background: rgba(139, 92, 246, 0.15);
          border: 1px solid rgba(139, 92, 246, 0.3);
          color: #a78bfa;
          padding: 0.15rem 0.45rem;
          border-radius: 100px;
          text-transform: uppercase;
        }

        .vo2-value-container {
          display: flex;
          align-items: baseline;
          gap: 0.25rem;
        }

        .vo2-main-val {
          font-size: 1.45rem;
          font-weight: 850;
          letter-spacing: -0.02em;
        }

        .vo2-unit {
          font-size: 0.75rem;
          color: var(--text-muted);
          font-weight: 600;
        }

        /* Scientific Cardiac HR zones */
        .hr-zones-science {
          background: rgba(16, 185, 129, 0.03);
          border: 1px solid rgba(16, 185, 129, 0.15);
          padding: 0.9rem;
          border-radius: 12px;
          display: flex;
          flex-direction: column;
          gap: 0.65rem;
        }

        .science-header {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          font-size: 0.78rem;
          font-weight: 700;
          color: var(--color-running);
          text-transform: uppercase;
          letter-spacing: 0.02em;
        }

        .science-metrics-row {
          display: flex;
          background: rgba(255, 255, 255, 0.02);
          border-radius: 8px;
          padding: 0.5rem 0;
          border: 1px solid var(--border-light);
        }

        .science-metric {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }

        .border-left-custom {
          border-left: 1px solid var(--border-light);
        }

        .science-lbl {
          font-size: 0.65rem;
          color: var(--text-muted);
          font-weight: 600;
          text-transform: uppercase;
        }

        .science-val {
          font-size: 0.95rem;
          font-weight: 750;
          color: var(--text-primary);
        }

        .science-footer-text {
          font-size: 0.68rem;
          color: var(--text-muted);
          line-height: 1.4;
          font-weight: 500;
        }

        /* Theme Text Colors */
        .text-primary {
          color: var(--color-primary) !important;
        }
        .text-gym {
          color: var(--color-gym) !important;
        }
        .text-running {
          color: var(--color-running) !important;
        }

        /* Title Gallery Sec */
        .gallery-section-title {
          font-size: 1.4rem;
          font-weight: 800;
          color: var(--text-primary);
          letter-spacing: -0.02em;
          display: flex;
          align-items: center;
          gap: 0.6rem;
          margin-top: 1.5rem;
          margin-bottom: 0.5rem;
        }

        /* Achievements grid */
        .achievements-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(340px, 1fr));
          gap: 1.75rem;
        }

        .achievement-card {
          position: relative;
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
          border-radius: 20px;
          transition: all 0.4s cubic-bezier(0.25, 0.8, 0.25, 1);
          overflow: hidden;
          background: var(--bg-surface);
        }

        /* Card Ambient Neon Glow */
        .neon-glow-ambient {
          position: absolute;
          top: -20%;
          left: -20%;
          right: -20%;
          bottom: -20%;
          background: radial-gradient(circle, rgba(var(--neon-rgb), 0.08) 0%, transparent 60%);
          z-index: 0;
          pointer-events: none;
          transition: background 0.4s ease;
        }

        .achievement-card:hover .neon-glow-ambient {
          background: radial-gradient(circle, rgba(var(--neon-rgb), 0.15) 0%, transparent 60%);
        }

        /* Target theme color overrides */
        .theme-running {
          --neon-color: var(--color-running);
          --neon-rgb: 16, 185, 129;
        }

        .theme-gym {
          --neon-color: var(--color-gym);
          --neon-rgb: 236, 72, 153;
        }

        .theme-primary {
          --neon-color: var(--color-primary);
          --neon-rgb: 139, 92, 246;
        }

        /* Card active and hover scales */
        .achievement-card.unlocked {
          border: 1px solid rgba(var(--neon-rgb), 0.2);
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3), 0 0 15px rgba(var(--neon-rgb), 0.1);
        }

        .achievement-card.unlocked:hover {
          transform: translateY(-5px) scale(1.01);
          border-color: rgba(var(--neon-rgb), 0.45);
          box-shadow: 0 12px 30px rgba(0, 0, 0, 0.4), 0 0 25px rgba(var(--neon-rgb), 0.25);
        }

        /* Locked Card Styling */
        .achievement-card.locked {
          opacity: 0.7;
          border: 1px dashed var(--border-light);
          box-shadow: none;
        }

        .achievement-card.locked:hover {
          opacity: 0.9;
          transform: translateY(-2px);
          border-color: var(--text-muted);
        }

        .achievement-card.locked .medal-title,
        .achievement-card.locked .medal-subtitle,
        .achievement-card.locked .medal-icon {
          filter: grayscale(100%);
        }

        /* Card Content Layout */
        .card-top {
          position: relative;
          z-index: 1;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .medal-icon-container {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 52px;
          height: 52px;
          border-radius: 14px;
          transition: all 0.4s ease;
        }

        .medal-icon-container.active {
          background: rgba(var(--neon-rgb), 0.15);
          border: 1px solid rgba(var(--neon-rgb), 0.3);
          color: var(--neon-color);
        }

        .medal-icon-container.inactive {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid var(--border-light);
          color: var(--text-muted);
        }

        .medal-icon {
          transition: all 0.4s ease;
        }

        .active-neon {
          filter: drop-shadow(0 0 6px var(--neon-color));
          animation: pulse-glow 2.5s ease-in-out infinite alternate;
        }

        @keyframes pulse-glow {
          0% {
            filter: drop-shadow(0 0 2px var(--neon-color));
          }
          100% {
            filter: drop-shadow(0 0 10px var(--neon-color));
          }
        }

        /* Status Pills */
        .status-pill {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          padding: 0.3rem 0.65rem;
          border-radius: 100px;
          font-size: 0.75rem;
          font-weight: 700;
          letter-spacing: 0.02em;
        }

        .unlocked-pill {
          background: rgba(16, 185, 129, 0.12);
          border: 1px solid rgba(16, 185, 129, 0.25);
          color: #34d399;
        }

        .locked-pill {
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid var(--border-light);
          color: var(--text-muted);
        }

        /* Body Typography */
        .card-body {
          position: relative;
          z-index: 1;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          flex: 1;
        }

        .medal-title {
          font-size: 1.35rem;
          font-weight: 800;
          color: var(--text-primary);
          letter-spacing: -0.02em;
        }

        .medal-subtitle {
          font-size: 0.85rem;
          font-weight: 600;
          color: var(--neon-color);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .medal-description {
          font-size: 0.92rem;
          color: var(--text-secondary);
          line-height: 1.5;
        }

        /* Footer & Progress Indicators */
        .card-footer {
          position: relative;
          z-index: 1;
          display: flex;
          flex-direction: column;
          gap: 0.65rem;
          border-top: 1px solid var(--border-light);
          padding-top: 1.25rem;
        }

        .metric-row {
          display: flex;
          justify-content: space-between;
          font-size: 0.8rem;
          font-weight: 600;
          color: var(--text-muted);
        }

        .metric-value-display {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .current-val {
          font-size: 1.4rem;
          font-weight: 800;
          letter-spacing: -0.02em;
        }

        .unlocked-text {
          color: var(--neon-color);
          text-shadow: 0 0 8px rgba(var(--neon-rgb), 0.3);
        }

        .locked-text {
          color: var(--text-primary);
        }

        .arrow-divider {
          color: var(--text-muted);
          opacity: 0.6;
        }

        .target-val {
          font-size: 0.95rem;
          font-weight: 600;
          color: var(--text-muted);
        }

        .medal-progress-bar-bg {
          height: 6px;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 100px;
          overflow: hidden;
        }

        .medal-progress-bar-fill {
          height: 100%;
          border-radius: 100px;
          background: linear-gradient(90deg, var(--neon-color) 0%, rgba(var(--neon-rgb), 0.7) 100%);
          transition: width 0.8s cubic-bezier(0.25, 0.8, 0.25, 1);
        }

        .progress-footer {
          display: flex;
          justify-content: space-between;
          font-size: 0.75rem;
          font-weight: 600;
        }

        .pct-text {
          color: var(--text-muted);
        }

        .detail-date-text {
          color: var(--neon-color);
          font-weight: 700;
        }

        /* Tier Styling */
        .tier-bronze .medal-icon-container.active { border-color: #cd7f32; box-shadow: 0 0 15px rgba(205, 127, 50, 0.4); }
        .tier-bronze .neon-glow-ambient { background: radial-gradient(circle at center, rgba(205, 127, 50, 0.15) 0%, transparent 70%); }
        .tier-silver .medal-icon-container.active { border-color: #c0c0c0; box-shadow: 0 0 15px rgba(192, 192, 192, 0.4); }
        .tier-silver .neon-glow-ambient { background: radial-gradient(circle at center, rgba(192, 192, 192, 0.15) 0%, transparent 70%); }
        .tier-gold .medal-icon-container.active, .tier-maxed .medal-icon-container.active { border-color: #ffd700; box-shadow: 0 0 20px rgba(255, 215, 0, 0.6); }
        .tier-gold .neon-glow-ambient, .tier-maxed .neon-glow-ambient { background: radial-gradient(circle at center, rgba(255, 215, 0, 0.25) 0%, transparent 70%); }

        .tier-stars {
          display: flex;
          gap: 4px;
          margin-left: auto;
          align-items: center;
        }
        .star-inactive { color: rgba(255,255,255,0.1); }
        .star-active { filter: drop-shadow(0 0 4px currentColor); }
        .star-bronze { color: #cd7f32; }
        .star-silver { color: #c0c0c0; }
        .star-gold { color: #ffd700; }

        /* responsive */
        @media (max-width: 480px) {
          .achievements-header {
            padding: 1.5rem !important;
          }
          .header-title {
            font-size: 1.8rem;
          }
          .achievements-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
