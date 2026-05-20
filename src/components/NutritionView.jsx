import React, { useState, useEffect } from 'react';
import { 
  Apple, 
  Plus, 
  Trash2, 
  TrendingUp, 
  Flame, 
  Award,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Calendar,
  Utensils,
  Dumbbell
} from 'lucide-react';

export default function NutritionView({ nutritionLogs, onUpdateNutrition, profile }) {
  // Calendar Navigation
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });

  // Nutrition Goal Mode: cut (definicion), recomp (mantenimiento), bulk (volumen), custom (personalizado)
  const [goalMode, setGoalMode] = useState(() => {
    return localStorage.getItem('fitanalytics_nutrition_mode') || 'recomp';
  });

  // Custom Targets (if custom is enabled)
  const [customCalories, setCustomCalories] = useState(2000);
  const [customProtein, setCustomProtein] = useState(140);
  const [customCarbs, setCustomCarbs] = useState(220);
  const [customFat, setCustomFat] = useState(65);

  // Manual Food Form
  const [foodName, setFoodName] = useState('');
  const [caloriesInput, setCaloriesInput] = useState('');
  const [proteinInput, setProteinInput] = useState('');
  const [carbsInput, setCarbsInput] = useState('');
  const [fatInput, setFatInput] = useState('');

  // Persist Goal Mode
  useEffect(() => {
    localStorage.setItem('fitanalytics_nutrition_mode', goalMode);
  }, [goalMode]);

  // Active Weight Profile
  const weight = profile?.weight || 75; // fallback to 75kg

  // Auto-calculated targets based on profile weight and goal mode
  let targetCalories = 2000;
  let targetProtein = 140;
  let targetCarbs = 220;
  let targetFat = 65;

  if (goalMode === 'cut') {
    targetCalories = Math.round(weight * 28);
    targetProtein = Math.round(weight * 2.2);
    targetFat = Math.round(weight * 0.8);
    targetCarbs = Math.round((targetCalories - (targetProtein * 4 + targetFat * 9)) / 4);
  } else if (goalMode === 'recomp') {
    targetCalories = Math.round(weight * 33);
    targetProtein = Math.round(weight * 2.0);
    targetFat = Math.round(weight * 1.0);
    targetCarbs = Math.round((targetCalories - (targetProtein * 4 + targetFat * 9)) / 4);
  } else if (goalMode === 'bulk') {
    targetCalories = Math.round(weight * 38);
    targetProtein = Math.round(weight * 1.8);
    targetFat = Math.round(weight * 1.2);
    targetCarbs = Math.round((targetCalories - (targetProtein * 4 + targetFat * 9)) / 4);
  } else {
    // Custom Mode
    targetCalories = customCalories;
    targetProtein = customProtein;
    targetCarbs = customCarbs;
    targetFat = customFat;
  }

  // Get current selected day log
  const activeDayLog = nutritionLogs.find(log => log.date === selectedDate) || {
    id: `nut-${selectedDate}`,
    date: selectedDate,
    meals: []
  };

  const meals = activeDayLog.meals || [];

  // Sum active day nutritional totals
  const totalCalories = meals.reduce((sum, m) => sum + (Number(m.calories) || 0), 0);
  const totalProtein = meals.reduce((sum, m) => sum + (Number(m.protein) || 0), 0);
  const totalCarbs = meals.reduce((sum, m) => sum + (Number(m.carbs) || 0), 0);
  const totalFat = meals.reduce((sum, m) => sum + (Number(m.fat) || 0), 0);

  // Quick Preset Foods
  const quickPresets = [
    { name: 'Batido Whey (1 scoop)', calories: 120, protein: 24, carbs: 3, fat: 1.5, category: 'shake' },
    { name: 'Pechuga de Pollo (200g)', calories: 330, protein: 62, carbs: 0, fat: 7, category: 'chicken' },
    { name: 'Huevo Entero Cocido (x2)', calories: 140, protein: 13, carbs: 1, fat: 10, category: 'egg' },
    { name: 'Avena con Leche (50g)', calories: 230, protein: 11, carbs: 38, fat: 3, category: 'oats' },
    { name: 'Banana Mediana', calories: 105, protein: 1, carbs: 27, fat: 0.3, category: 'banana' },
    { name: 'Lata de Atún al agua', calories: 120, protein: 28, carbs: 0, fat: 1, category: 'tuna' },
  ];

  // Add Item to log
  const handleAddMeal = (name, cals, prot, carb, fat) => {
    const newMeal = {
      id: `meal-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      name: name || 'Comida no identificada',
      calories: Math.max(0, parseInt(cals) || 0),
      protein: Math.max(0, parseInt(prot) || 0),
      carbs: Math.max(0, parseInt(carb) || 0),
      fat: Math.max(0, parseInt(fat) || 0),
      time: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
    };

    let updatedLogs = [];
    const logIndex = nutritionLogs.findIndex(log => log.date === selectedDate);

    if (logIndex !== -1) {
      const updatedLog = {
        ...nutritionLogs[logIndex],
        meals: [...nutritionLogs[logIndex].meals, newMeal]
      };
      updatedLogs = [...nutritionLogs];
      updatedLogs[logIndex] = updatedLog;
    } else {
      const newLog = {
        id: `nut-${selectedDate}`,
        date: selectedDate,
        meals: [newMeal]
      };
      updatedLogs = [...nutritionLogs, newLog];
    }

    onUpdateNutrition(updatedLogs);
  };

  // Delete Item from log
  const handleDeleteMeal = (mealId) => {
    const logIndex = nutritionLogs.findIndex(log => log.date === selectedDate);
    if (logIndex === -1) return;

    const updatedLog = {
      ...nutritionLogs[logIndex],
      meals: nutritionLogs[logIndex].meals.filter(m => m.id !== mealId)
    };

    const updatedLogs = [...nutritionLogs];
    updatedLogs[logIndex] = updatedLog;
    onUpdateNutrition(updatedLogs);
  };

  const handleQuickAdd = (preset) => {
    handleAddMeal(preset.name, preset.calories, preset.protein, preset.carbs, preset.fat);
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (!foodName.trim()) return;
    
    handleAddMeal(
      foodName.trim(), 
      caloriesInput || 0, 
      proteinInput || 0, 
      carbsInput || 0, 
      fatInput || 0
    );

    setFoodName('');
    setCaloriesInput('');
    setProteinInput('');
    setCarbsInput('');
    setFatInput('');
  };

  // Day navigation helper
  const handleShiftDate = (days) => {
    const current = new Date(selectedDate + 'T12:00:00');
    current.setDate(current.getDate() + days);
    setSelectedDate(current.toISOString().split('T')[0]);
  };

  // Circle progress styling generator
  const getCircleProps = (value, target, size = 180, strokeWidth = 12) => {
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const pct = Math.min(1, Math.max(0, value / (target || 1)));
    const offset = circumference - pct * circumference;
    
    return {
      radius,
      circumference,
      strokeDasharray: circumference,
      strokeDashoffset: offset
    };
  };

  // Color scheme selectors based on goal mode
  const getGoalColorToken = () => {
    if (goalMode === 'cut') return 'var(--color-definicion)';
    if (goalMode === 'bulk') return 'var(--color-volumen)';
    return 'var(--color-mantenimiento)';
  };

  const getGoalColorGlow = () => {
    if (goalMode === 'cut') return 'rgba(6, 182, 212, 0.4)';
    if (goalMode === 'bulk') return 'rgba(236, 72, 153, 0.4)';
    return 'rgba(16, 185, 129, 0.4)';
  };

  return (
    <div className="nutrition-container fade-in">
      <header className="nutrition-header">
        <div>
          <h1 className="gradient-text text-3xl font-extrabold flex-center">
            <Apple size={26} style={{ color: getGoalColorToken() }} />
            Nutrición y Macronutrientes
          </h1>
          <p className="text-secondary text-sm">Gestiona tu combustible deportivo. Sincronizado reactivamente con tu peso actual de {weight} kg.</p>
        </div>

        {/* Date Selector Navigation */}
        <div className="calendar-navigator glass-card">
          <button onClick={() => handleShiftDate(-1)} className="nav-btn" title="Día Anterior">
            <ChevronLeft size={18} />
          </button>
          <div className="current-date-pill">
            <Calendar size={15} style={{ color: getGoalColorToken() }} />
            <span>
              {new Date(selectedDate + 'T12:00:00').toLocaleDateString('es-ES', { 
                weekday: 'short', 
                day: 'numeric', 
                month: 'short' 
              })}
            </span>
          </div>
          <button onClick={() => handleShiftDate(1)} className="nav-btn" title="Día Siguiente">
            <ChevronRight size={18} />
          </button>
        </div>
      </header>

      {/* Switcher de Objetivo Deportivo */}
      <div className="goal-mode-bar mb-6">
        <button
          onClick={() => setGoalMode('cut')}
          className={`goal-chip ${goalMode === 'cut' ? 'active-cut' : ''}`}
        >
          <TrendingUp size={15} />
          <span>Definición (Cut)</span>
        </button>
        <button
          onClick={() => setGoalMode('recomp')}
          className={`goal-chip ${goalMode === 'recomp' ? 'active-recomp' : ''}`}
        >
          <Sparkles size={15} />
          <span>Mantenimiento</span>
        </button>
        <button
          onClick={() => setGoalMode('bulk')}
          className={`goal-chip ${goalMode === 'bulk' ? 'active-bulk' : ''}`}
        >
          <Flame size={15} />
          <span>Volumen (Bulk)</span>
        </button>
        <button
          onClick={() => setGoalMode('custom')}
          className={`goal-chip ${goalMode === 'custom' ? 'active-custom' : ''}`}
        >
          <Award size={15} />
          <span>Personalizado</span>
        </button>
      </div>

      <div className="nutrition-grid">
        
        {/* LEFT COLUMN: GAUGE AND TARGET CALCULATORS */}
        <div className="panel-col-left flex flex-col gap-6">
          
          {/* GLASSMORPHIC GAUGE CARD */}
          <div className="glass-card main-gauge-card flex-center flex-col">
            <div className="radial-rings-layout">
              {/* SVG Primary Ring for Calories */}
              <svg viewBox="0 0 220 220" className="radial-svg radial-svg-main">
                {/* Background Ring Track */}
                <circle 
                  cx="110" cy="110" 
                  r="95" 
                  stroke="rgba(255, 255, 255, 0.04)" 
                  strokeWidth="14" 
                  fill="transparent" 
                />
                {/* Glowing Progressive Arc */}
                <circle 
                  cx="110" cy="110" 
                  r="95" 
                  stroke={`url(#calorieGrad-${goalMode})`}
                  strokeWidth="14" 
                  fill="transparent"
                  strokeLinecap="round"
                  transform="rotate(-90 110 110)"
                  {...getCircleProps(totalCalories, targetCalories, 220, 14)}
                />
                
                {/* Gradient Definitions */}
                <defs>
                  <linearGradient id="calorieGrad-cut" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#06b6d4" />
                    <stop offset="100%" stopColor="#0891b2" />
                  </linearGradient>
                  <linearGradient id="calorieGrad-recomp" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#10b981" />
                    <stop offset="100%" stopColor="#059669" />
                  </linearGradient>
                  <linearGradient id="calorieGrad-bulk" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#ec4899" />
                    <stop offset="100%" stopColor="#d946ef" />
                  </linearGradient>
                  <linearGradient id="calorieGrad-custom" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#eab308" />
                    <stop offset="100%" stopColor="#ca8a04" />
                  </linearGradient>
                </defs>
              </svg>

              {/* Central Text Panel */}
              <div className="ring-central-panel flex flex-col items-center">
                <span className="text-secondary text-2xs uppercase tracking-wider font-semibold">Calorías</span>
                <h3 className="cal-value-text" style={{ textShadow: `0 0 15px ${getGoalColorGlow()}` }}>
                  {totalCalories.toLocaleString()}
                </h3>
                <span className="divider-line"></span>
                <span className="target-lbl text-xs text-muted">
                  Meta: {targetCalories.toLocaleString()} kcal
                </span>
                <span className="percent-badge mt-1" style={{ background: `rgba(${goalMode === 'cut' ? '6,182,212' : goalMode === 'bulk' ? '236,72,153' : '16,185,129'}, 0.12)`, color: getGoalColorToken() }}>
                  {Math.round((totalCalories / targetCalories) * 100)}%
                </span>
              </div>
            </div>

            {/* THREE SECONDARY MACRO RINGS */}
            <div className="macro-bar-layout mt-6">
              
              {/* PROTEIN GAUGE */}
              <div className="macro-ring-box">
                <div className="mini-ring-wrapper">
                  <svg viewBox="0 0 76 76" className="mini-ring-svg">
                    <circle cx="38" cy="38" r="32" stroke="rgba(255,255,255,0.03)" strokeWidth="6" fill="transparent" />
                    <circle 
                      cx="38" cy="38" r="32" 
                      stroke="#f87171" strokeWidth="6" fill="transparent" strokeLinecap="round"
                      transform="rotate(-90 38 38)"
                      {...getCircleProps(totalProtein, targetProtein, 76, 6)}
                    />
                  </svg>
                  <div className="mini-ring-label flex flex-col flex-center">
                    <span className="font-extrabold text-xs text-primary">{totalProtein}g</span>
                  </div>
                </div>
                <span className="macro-label text-red">Proteínas</span>
                <span className="macro-target text-muted text-2xs">de {targetProtein}g</span>
              </div>

              {/* CARBS GAUGE */}
              <div className="macro-ring-box">
                <div className="mini-ring-wrapper">
                  <svg viewBox="0 0 76 76" className="mini-ring-svg">
                    <circle cx="38" cy="38" r="32" stroke="rgba(255,255,255,0.03)" strokeWidth="6" fill="transparent" />
                    <circle 
                      cx="38" cy="38" r="32" 
                      stroke="#60a5fa" strokeWidth="6" fill="transparent" strokeLinecap="round"
                      transform="rotate(-90 38 38)"
                      {...getCircleProps(totalCarbs, targetCarbs, 76, 6)}
                    />
                  </svg>
                  <div className="mini-ring-label flex flex-col flex-center">
                    <span className="font-extrabold text-xs text-primary">{totalCarbs}g</span>
                  </div>
                </div>
                <span className="macro-label text-blue">Carbohidratos</span>
                <span className="macro-target text-muted text-2xs">de {targetCarbs}g</span>
              </div>

              {/* FAT GAUGE */}
              <div className="macro-ring-box">
                <div className="mini-ring-wrapper">
                  <svg viewBox="0 0 76 76" className="mini-ring-svg">
                    <circle cx="38" cy="38" r="32" stroke="rgba(255,255,255,0.03)" strokeWidth="6" fill="transparent" />
                    <circle 
                      cx="38" cy="38" r="32" 
                      stroke="#fbbf24" strokeWidth="6" fill="transparent" strokeLinecap="round"
                      transform="rotate(-90 38 38)"
                      {...getCircleProps(totalFat, targetFat, 76, 6)}
                    />
                  </svg>
                  <div className="mini-ring-label flex flex-col flex-center">
                    <span className="font-extrabold text-xs text-primary">{totalFat}g</span>
                  </div>
                </div>
                <span className="macro-label text-yellow">Grasas</span>
                <span className="macro-target text-muted text-2xs">de {targetFat}g</span>
              </div>

            </div>
          </div>

          {/* CUSTOM TARGET ADJUSTMENT SLIDERS */}
          {goalMode === 'custom' && (
            <div className="glass-card custom-sliders-card fade-in">
              <h3 className="section-subtitle flex-center mb-4">
                <Dumbbell size={18} style={{ color: 'var(--color-primary)' }} />
                Ajuste Fino de Macronutrientes
              </h3>
              <div className="form-group mb-3">
                <div className="flex justify-between text-xs mb-1">
                  <span>Calorías Objetivo</span>
                  <span className="font-bold text-primary">{customCalories} kcal</span>
                </div>
                <input 
                  type="range" min="1000" max="5000" step="50"
                  value={customCalories} 
                  onChange={(e) => setCustomCalories(Number(e.target.value))}
                  className="w-full slider"
                />
              </div>
              <div className="form-group mb-3">
                <div className="flex justify-between text-xs mb-1">
                  <span>Proteína (g)</span>
                  <span className="font-bold text-red">{customProtein}g</span>
                </div>
                <input 
                  type="range" min="40" max="300" step="5"
                  value={customProtein} 
                  onChange={(e) => setCustomProtein(Number(e.target.value))}
                  className="w-full slider"
                />
              </div>
              <div className="form-group mb-3">
                <div className="flex justify-between text-xs mb-1">
                  <span>Carbohidratos (g)</span>
                  <span className="font-bold text-blue">{customCarbs}g</span>
                </div>
                <input 
                  type="range" min="50" max="600" step="5"
                  value={customCarbs} 
                  onChange={(e) => setCustomCarbs(Number(e.target.value))}
                  className="w-full slider"
                />
              </div>
              <div className="form-group mb-3">
                <div className="flex justify-between text-xs mb-1">
                  <span>Grasas (g)</span>
                  <span className="font-bold text-yellow">{customFat}g</span>
                </div>
                <input 
                  type="range" min="20" max="150" step="5"
                  value={customFat} 
                  onChange={(e) => setCustomFat(Number(e.target.value))}
                  className="w-full slider"
                />
              </div>
            </div>
          )}

          {/* ATHLETE ADVICE BANNER */}
          <div className="glass-card info-athletic-card leading-relaxed">
            <h4 className="font-bold text-sm text-primary flex-center gap-2 mb-2" style={{ color: getGoalColorToken() }}>
              <Sparkles size={16} /> 
              {goalMode === 'cut' ? 'Estrategia de Definición' : goalMode === 'bulk' ? 'Estrategia de Hipertrofia' : 'Estrategia de Recomposición'}
            </h4>
            <p className="text-secondary text-xs">
              {goalMode === 'cut' 
                ? 'Para un déficit exitoso, mantén el consumo de proteínas alto (2.2g/kg) para blindar tu masa muscular. Acompaña con entrenamientos de fuerza pesada para indicar a tu cuerpo que debe deshacerse del tejido graso, no del músculo.'
                : goalMode === 'bulk'
                ? 'El superávit calórico optimiza el entorno anabólico. Las proteínas a 1.8g/kg son suficientes si los carbohidratos están elevados; el glucógeno muscular resultante aumentará tu rendimiento y volumen de entrenamiento exponencialmente.'
                : 'La recomposición física te permite construir músculo y perder grasa al mismo tiempo. Mantener tus macros estables y tus sesiones de fuerza al fallo técnico es el camino comprobado para optimizar este estado en atletas experimentados.'}
            </p>
          </div>

        </div>

        {/* RIGHT COLUMN: QUICK LOGGERS AND DIARY LISTS */}
        <div className="panel-col-right flex flex-col gap-6">
          
          {/* QUICK ADD PLATES (PRESETS) */}
          <div className="glass-card presets-card">
            <h3 className="section-subtitle flex-center mb-3">
              <Utensils size={18} style={{ color: getGoalColorToken() }} />
              Platos Rápidos Proteicos
            </h3>
            <p className="text-muted text-xs mb-4">Añade alimentos de alto valor deportivo listados por categoría en un solo clic.</p>
            
            <div className="presets-list-grid">
              {quickPresets.map((preset, idx) => (
                <button
                  key={idx}
                  onClick={() => handleQuickAdd(preset)}
                  className="preset-action-card flex-center gap-2"
                >
                  <div className="preset-avatar">
                    {preset.category === 'shake' ? '🥤' : preset.category === 'chicken' ? '🍗' : preset.category === 'egg' ? '🥚' : preset.category === 'oats' ? '🥣' : preset.category === 'banana' ? '🍌' : '🐟'}
                  </div>
                  <div className="preset-meta text-left">
                    <h5 className="preset-title m-0 text-xs font-semibold text-primary">{preset.name}</h5>
                    <p className="preset-macros m-0 text-3xs text-secondary">
                      {preset.calories} kcal • <span className="text-red">{preset.protein}g P</span>
                    </p>
                  </div>
                  <div className="add-hover-btn">
                    <Plus size={14} />
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* MANUAL MEAL ENTRY FORM */}
          <div className="glass-card manual-form-card">
            <h3 className="section-subtitle flex-center mb-4">
              <Plus size={18} style={{ color: getGoalColorToken() }} />
              Registrar Alimento / Comida
            </h3>
            
            <form onSubmit={handleManualSubmit} className="manual-nutrition-form">
              <div className="form-group mb-3">
                <label className="form-label">Nombre del Alimento o Plato</label>
                <input 
                  type="text" 
                  placeholder="Ej: Pechuga con Arroz Integral"
                  value={foodName}
                  onChange={(e) => setFoodName(e.target.value)}
                  className="form-input"
                  required
                />
              </div>

              <div className="form-row-macros">
                <div className="form-group">
                  <label className="form-label">Calorías (kcal)</label>
                  <input 
                    type="number" 
                    placeholder="0"
                    value={caloriesInput}
                    onChange={(e) => setCaloriesInput(e.target.value)}
                    className="form-input"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label text-red">Proteína (g)</label>
                  <input 
                    type="number" 
                    placeholder="0"
                    value={proteinInput}
                    onChange={(e) => setProteinInput(e.target.value)}
                    className="form-input text-red-input"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label text-blue">Carbs (g)</label>
                  <input 
                    type="number" 
                    placeholder="0"
                    value={carbsInput}
                    onChange={(e) => setCarbsInput(e.target.value)}
                    className="form-input text-blue-input"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label text-yellow">Grasas (g)</label>
                  <input 
                    type="number" 
                    placeholder="0"
                    value={fatInput}
                    onChange={(e) => setFatInput(e.target.value)}
                    className="form-input text-yellow-input"
                  />
                </div>
              </div>

              <button 
                type="submit" 
                className="btn w-full mt-4 flex-center"
                style={{ 
                  background: getGoalColorToken(), 
                  color: '#ffffff',
                  boxShadow: `0 8px 24px ${getGoalColorGlow()}`
                }}
              >
                <Plus size={16} />
                <span>Agregar Alimento al Registro</span>
              </button>
            </form>
          </div>

          {/* TODAY'S FOOD JOURNAL LIST */}
          <div className="glass-card food-journal-card flex-1">
            <h3 className="section-subtitle flex-center mb-3">
              <Apple size={18} style={{ color: getGoalColorToken() }} />
              Diario Nutricional de la Fecha
            </h3>
            
            {meals.length === 0 ? (
              <div className="empty-journal flex flex-col flex-center py-6 text-center">
                <Utensils size={36} className="text-secondary mb-2 animate-bounce" />
                <h5 className="text-secondary text-sm font-bold">Tu plato está vacío hoy</h5>
                <p className="text-muted text-xs leading-relaxed max-w-xs mt-1">
                  Registra tus primeras comidas o utiliza los platos rápidos para activar tus anillos de cristal templado.
                </p>
              </div>
            ) : (
              <div className="journal-items-list mt-3">
                {meals.map((meal) => (
                  <div key={meal.id} className="journal-row-card flex items-center justify-between">
                    <div className="row-info-block text-left">
                      <h4 className="meal-name text-sm text-primary font-bold m-0">{meal.name}</h4>
                      <p className="meal-time text-3xs text-muted m-0">Logueado a las {meal.time}</p>
                      
                      <div className="row-macros-badges mt-1">
                        <span className="macro-mini-badge badge-cals">{meal.calories} kcal</span>
                        <span className="macro-mini-badge badge-p">{meal.protein}g P</span>
                        <span className="macro-mini-badge badge-c">{meal.carbs}g C</span>
                        <span className="macro-mini-badge badge-f">{meal.fat}g G</span>
                      </div>
                    </div>

                    <button 
                      onClick={() => handleDeleteMeal(meal.id)}
                      className="btn-trash-journal flex-center"
                      title="Eliminar Alimento"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

      </div>

      <style>{`
        .nutrition-container {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
          color: var(--text-primary);
        }

        .nutrition-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 1.5rem;
          flex-wrap: wrap;
        }

        .calendar-navigator {
          display: flex;
          align-items: center;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid var(--border-light);
          padding: 0.4rem;
          border-radius: 12px;
          gap: 0.25rem;
        }

        .nav-btn {
          background: transparent;
          border: none;
          color: var(--text-secondary);
          display: flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          border-radius: 8px;
          cursor: pointer;
          transition: all var(--transition-fast);
        }

        .nav-btn:hover {
          background: rgba(255, 255, 255, 0.05);
          color: var(--text-primary);
        }

        .current-date-pill {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.4rem 0.85rem;
          background: rgba(255, 255, 255, 0.03);
          border-radius: 8px;
          font-size: 0.85rem;
          font-weight: 700;
        }

        .goal-mode-bar {
          display: flex;
          gap: 0.5rem;
          flex-wrap: wrap;
        }

        .goal-chip {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid var(--border-light);
          color: var(--text-secondary);
          padding: 0.55rem 1rem;
          border-radius: 12px;
          font-family: var(--font-sans);
          font-size: 0.85rem;
          font-weight: 600;
          cursor: pointer;
          transition: all var(--transition-fast);
        }

        .goal-chip:hover {
          background: rgba(255, 255, 255, 0.04);
          color: var(--text-primary);
        }

        .active-cut {
          background: rgba(6, 182, 212, 0.15);
          color: #ffffff;
          border-color: #06b6d4;
          box-shadow: 0 0 12px rgba(6, 182, 212, 0.2);
        }

        .active-recomp {
          background: rgba(16, 185, 129, 0.15);
          color: #ffffff;
          border-color: #10b981;
          box-shadow: 0 0 12px rgba(16, 185, 129, 0.2);
        }

        .active-bulk {
          background: rgba(236, 72, 153, 0.15);
          color: #ffffff;
          border-color: #ec4899;
          box-shadow: 0 0 12px rgba(236, 72, 153, 0.2);
        }

        .active-custom {
          background: rgba(234, 179, 8, 0.15);
          color: #ffffff;
          border-color: #eab308;
          box-shadow: 0 0 12px rgba(234, 179, 8, 0.2);
        }

        .nutrition-grid {
          display: grid;
          grid-template-columns: 4fr 5fr;
          gap: 1.5rem;
        }

        @media (max-width: 1024px) {
          .nutrition-grid {
            grid-template-columns: 1fr;
          }
        }

        .main-gauge-card {
          padding: 2.2rem 1.5rem;
        }

        .radial-rings-layout {
          position: relative;
          width: min(220px, 100%);
          aspect-ratio: 1 / 1;
        }

        .radial-svg-main {
          width: 100%;
          height: 100%;
          display: block;
        }

        .ring-central-panel {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 72%;
          height: 72%;
          border-radius: 50%;
          background: rgba(0, 0, 0, 0.35);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.05);
          box-shadow: inset 0 8px 32px rgba(0, 0, 0, 0.4);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .cal-value-text {
          font-size: clamp(1.4rem, 5vw, 2.1rem);
          font-weight: 900;
          margin: 0.15rem 0 0 0;
          letter-spacing: -0.04em;
        }

        .divider-line {
          width: 60px;
          height: 1px;
          background: rgba(255, 255, 255, 0.1);
          margin: 0.4rem 0;
        }

        .percent-badge {
          font-size: 0.65rem;
          font-weight: 800;
          padding: 0.15rem 0.55rem;
          border-radius: 20px;
        }

        .macro-bar-layout {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: clamp(0.5rem, 3vw, 1.5rem);
          width: 100%;
          border-top: 1px dashed rgba(255,255,255,0.06);
          padding-top: 1.5rem;
        }

        .macro-ring-box {
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .mini-ring-wrapper {
          position: relative;
          width: min(76px, 28vw);
          height: min(76px, 28vw);
        }

        .mini-ring-svg {
          width: 100%;
          height: 100%;
          display: block;
        }

        .mini-ring-label {
          position: absolute;
          top: 0; left: 0; right: 0; bottom: 0;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .macro-label {
          font-size: 0.72rem;
          font-weight: 700;
          margin-top: 0.5rem;
        }

        .macro-target {
          margin-top: 0.1rem;
        }

        .text-red { color: #f87171; }
        .text-blue { color: #60a5fa; }
        .text-yellow { color: #fbbf24; }

        .custom-sliders-card {
          padding: 1.5rem;
          text-align: left;
        }

        .slider {
          -webkit-appearance: none;
          height: 6px;
          border-radius: 5px;
          background: rgba(255, 255, 255, 0.08);
          outline: none;
          margin: 0.5rem 0;
        }

        .slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: var(--color-primary);
          cursor: pointer;
          border: 2px solid #ffffff;
          box-shadow: 0 0 10px rgba(139, 92, 246, 0.5);
          transition: transform 0.15s;
        }

        .slider::-webkit-slider-thumb:hover {
          transform: scale(1.2);
        }

        .info-athletic-card {
          padding: 1.25rem;
          text-align: left;
          border: 1px dashed rgba(255, 255, 255, 0.05);
          background: rgba(255, 255, 255, 0.01);
        }

        .presets-card {
          padding: 1.5rem;
          text-align: left;
        }

        .presets-list-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 0.75rem;
        }

        @media (max-width: 600px) {
          .presets-list-grid {
            grid-template-columns: 1fr;
          }
        }

        .preset-action-card {
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid var(--border-light);
          border-radius: 12px;
          padding: 0.65rem 0.85rem;
          display: flex;
          align-items: center;
          position: relative;
          cursor: pointer;
          transition: all var(--transition-fast);
        }

        .preset-action-card:hover {
          background: rgba(255, 255, 255, 0.05);
          border-color: rgba(255, 255, 255, 0.15);
          transform: translateY(-2px);
        }

        .preset-avatar {
          font-size: 1.25rem;
          margin-right: 0.65rem;
        }

        .preset-meta {
          flex: 1;
        }

        .preset-title {
          font-size: 0.8rem;
          letter-spacing: -0.01em;
        }

        .preset-macros {
          margin-top: 0.15rem;
        }

        .add-hover-btn {
          color: var(--text-secondary);
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0.4;
          transition: opacity 0.15s;
        }

        .preset-action-card:hover .add-hover-btn {
          opacity: 1;
          color: var(--text-primary);
        }

        .manual-form-card {
          padding: 1.5rem;
          text-align: left;
        }

        .form-row-macros {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 0.5rem;
          margin-top: 0.75rem;
        }

        @media (max-width: 600px) {
          .form-row-macros {
            grid-template-columns: repeat(2, 1fr);
          }
          
          .calendar-navigator {
            flex-direction: row;
            width: 100%;
            justify-content: space-between;
            margin-top: 1rem;
          }
          
          .nutrition-header {
            flex-direction: column;
            align-items: flex-start;
          }
          
          .goal-chip {
            padding: 0.4rem 0.6rem;
            font-size: 0.75rem;
          }
        }

        .text-red-input:focus { border-color: #f87171; box-shadow: 0 0 10px rgba(248,113,113,0.15); }
        .text-blue-input:focus { border-color: #60a5fa; box-shadow: 0 0 10px rgba(96,165,250,0.15); }
        .text-yellow-input:focus { border-color: #fbbf24; box-shadow: 0 0 10px rgba(251,191,36,0.15); }

        .food-journal-card {
          padding: 1.5rem;
          text-align: left;
          display: flex;
          flex-direction: column;
        }

        .empty-journal {
          padding: 2.5rem 1rem;
        }

        .journal-items-list {
          display: flex;
          flex-direction: column;
          gap: 0.65rem;
          max-height: 380px;
          overflow-y: auto;
          padding-right: 0.25rem;
        }

        .journal-row-card {
          background: rgba(255, 255, 255, 0.01);
          border: 1px solid rgba(255, 255, 255, 0.03);
          border-radius: 12px;
          padding: 0.75rem 1rem;
          display: flex;
          align-items: center;
          transition: all var(--transition-fast);
        }

        .journal-row-card:hover {
          background: rgba(255, 255, 255, 0.03);
          border-color: rgba(255, 255, 255, 0.08);
        }

        .row-macros-badges {
          display: flex;
          gap: 0.35rem;
          flex-wrap: wrap;
        }

        .macro-mini-badge {
          font-size: 0.65rem;
          font-weight: 700;
          padding: 0.1rem 0.45rem;
          border-radius: 6px;
        }

        .badge-cals { background: rgba(255,255,255,0.04); color: var(--text-secondary); }
        .badge-p { background: rgba(239, 68, 68, 0.1); color: #f87171; }
        .badge-c { background: rgba(59, 130, 246, 0.1); color: #60a5fa; }
        .badge-f { background: rgba(245, 158, 11, 0.1); color: #fbbf24; }

        .btn-trash-journal {
          background: rgba(239, 68, 68, 0.08);
          border: none;
          color: #ef4444;
          width: 32px;
          height: 32px;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-trash-journal:hover {
          background: #ef4444;
          color: #ffffff;
          transform: scale(1.1);
        }

        /* ===== Responsive: Mobile Nutrition Overhaul ===== */

        @media (max-width: 768px) {
          .nutrition-grid {
            grid-template-columns: 1fr;
            gap: 1rem;
          }

          .main-gauge-card {
            padding: 1.5rem 1rem;
          }

          .nutrition-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 0.75rem;
          }

          .calendar-navigator {
            width: 100%;
            justify-content: space-between;
          }

          .goal-mode-bar {
            gap: 0.4rem;
          }

          .goal-chip {
            padding: 0.45rem 0.75rem;
            font-size: 0.78rem;
          }

          .goal-chip span {
            display: inline;
          }
        }

        @media (max-width: 480px) {
          /* Tighten macro rings so 3 fit on a 320px screen */
          .macro-bar-layout {
            gap: 0.5rem;
            padding-top: 1rem;
          }

          .main-gauge-card {
            padding: 1.25rem 0.75rem;
          }

          /* Scale down the SVG rings slightly */
          .mini-ring-wrapper {
            width: 64px;
            height: 64px;
          }

          .mini-ring-wrapper svg {
            width: 64px;
            height: 64px;
          }

          .macro-label {
            font-size: 0.65rem;
          }

          .macro-target {
            font-size: 0.6rem;
          }

          /* Keep calorie ring readable */
          .cal-value-text {
            font-size: 1.65rem;
          }

          /* Goal chips: icon only on tiny screens */
          .goal-chip {
            padding: 0.4rem 0.5rem;
            font-size: 0.72rem;
          }

          /* Collapse manual form macros to 2 cols */
          .form-row-macros {
            grid-template-columns: repeat(2, 1fr);
          }

          /* Presets single column */
          .presets-list-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
