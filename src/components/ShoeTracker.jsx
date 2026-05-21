import React, { useState, useMemo } from 'react';
import { ShieldAlert, Plus, Trash2, Calendar, Zap, Info, ShieldCheck, Trash } from 'lucide-react';

export default function ShoeTracker({ workouts = [], onUpdateShoes, shoes = [] }) {
  const [showAddForm, setShowAddForm] = useState(false);
  
  // Form fields state
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [initialKm, setInitialKm] = useState('0');
  const [maxKm, setMaxKm] = useState('800');
  const [buyDate, setBuyDate] = useState(() => new Date().toISOString().split('T')[0]);

  // Calcular el kilometraje real acumulado por cada par de zapatillas
  const shoesWithStats = useMemo(() => {
    return shoes.map(shoe => {
      const runningWorkouts = workouts.filter(w => {
        if (w.type !== 'running') return false;
        // El id se asocia en w.advanced_metrics?.shoeId o simplemente w.shoeId
        return (w.advanced_metrics?.shoeId === shoe.id) || (w.shoeId === shoe.id);
      });
      
      const accumulatedDistance = runningWorkouts.reduce((sum, w) => sum + (Number(w.distance) || 0), 0);
      const totalKm = Number(shoe.initialKm || 0) + accumulatedDistance;
      const progressPct = Math.min(100, (totalKm / Number(shoe.maxKm || 800)) * 100);

      // Código de color según desgaste
      let statusColor = '#10b981'; // Green
      let statusText = 'Excelente estado';
      let statusClass = 'health-good';

      if (progressPct >= 85) {
        statusColor = '#ef4444'; // Red
        statusText = 'Límite de desgaste crítico';
        statusClass = 'health-critical';
      } else if (progressPct >= 60) {
        statusColor = '#f59e0b'; // Orange/Yellow
        statusText = 'Desgaste moderado';
        statusClass = 'health-warning';
      }

      return {
        ...shoe,
        totalKm: Math.round(totalKm * 10) / 10,
        progressPct,
        statusColor,
        statusText,
        statusClass,
        runsCount: runningWorkouts.length
      };
    });
  }, [shoes, workouts]);

  const handleAddShoe = (e) => {
    e.preventDefault();
    if (!brand.trim() || !model.trim()) {
      alert("Por favor completa la marca y el modelo.");
      return;
    }

    const newShoe = {
      id: `shoe-${Date.now()}`,
      brand: brand.trim(),
      model: model.trim(),
      initialKm: Number(initialKm) || 0,
      maxKm: Number(maxKm) || 800,
      buyDate: buyDate || new Date().toISOString().split('T')[0],
      isActive: true
    };

    const updated = [...shoes, newShoe];
    onUpdateShoes(updated);

    // Reset fields
    setBrand('');
    setModel('');
    setInitialKm('0');
    setMaxKm('800');
    setBuyDate(new Date().toISOString().split('T')[0]);
    setShowAddForm(false);
  };

  const handleToggleActive = (id) => {
    const updated = shoes.map(s => s.id === id ? { ...s, isActive: !s.isActive } : s);
    onUpdateShoes(updated);
  };

  const handleDeleteShoe = (id) => {
    if (confirm("¿Estás seguro de que deseas eliminar este calzado? Esta acción no afectará el historial de tus carreras logradas, pero las desvinculará de las estadísticas de desgaste.")) {
      const updated = shoes.filter(s => s.id !== id);
      onUpdateShoes(updated);
    }
  };

  return (
    <div className="shoe-tracker-container animate-fade-in" style={{ padding: '0 0.5rem' }}>
      {/* Cabecera */}
      <div className="glass-card card-identity" style={{ padding: '1.25rem', marginBottom: '1.5rem', borderLeft: '4px solid var(--color-running)' }}>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginBottom: '0.5rem', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <Zap className="text-running-glow" size={20} style={{ color: 'var(--color-running)' }} />
            <h3 className="card-title" style={{ margin: 0, fontSize: '1.1rem' }}>Seguimiento de Desgaste de Calzado</h3>
          </div>
          <button 
            onClick={() => setShowAddForm(!showAddForm)}
            className="action-btn-primary"
            style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
          >
            <Plus size={14} />
            {showAddForm ? 'Cancelar' : 'Agregar Calzado'}
          </button>
        </div>
        <p className="card-subtitle" style={{ fontSize: '0.85rem', lineHeight: '1.4', margin: 0 }}>
          Registra tus zapatillas de running para llevar el kilometraje exacto acumulado. La amortiguación media dura entre 600 y 800 km. Entrenar con suelas vencidas es la causa número uno de lesiones por impacto como fascitis plantar o periostitis tibial.
        </p>
      </div>

      {/* Formulario de Alta */}
      {showAddForm && (
        <form onSubmit={handleAddShoe} className="glass-card animate-fade-in" style={{ padding: '1.25rem', marginBottom: '1.5rem' }}>
          <h3 className="card-title" style={{ fontSize: '0.95rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Plus size={16} style={{ color: 'var(--color-primary)' }} />
            Registrar Nuevo Calzado
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
            <div>
              <label className="input-label" style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>Marca</label>
              <input 
                type="text" 
                placeholder="ej: Nike, Adidas, Brooks" 
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                className="premium-input"
                style={{ width: '100%' }}
                required
              />
            </div>
            
            <div>
              <label className="input-label" style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>Modelo</label>
              <input 
                type="text" 
                placeholder="ej: Vaporfly 3, Pegasus 40, Clifton 9" 
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="premium-input"
                style={{ width: '100%' }}
                required
              />
            </div>

            <div>
              <label className="input-label" style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>Kilómetros Iniciales (Si ya tenían uso)</label>
              <input 
                type="number" 
                min="0"
                value={initialKm}
                onChange={(e) => setInitialKm(e.target.value)}
                className="premium-input"
                style={{ width: '100%' }}
              />
            </div>

            <div>
              <label className="input-label" style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>Límite Máximo Estimado (km)</label>
              <input 
                type="number" 
                min="1"
                value={maxKm}
                onChange={(e) => setMaxKm(e.target.value)}
                className="premium-input"
                style={{ width: '100%' }}
              />
            </div>

            <div>
              <label className="input-label" style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>Fecha de Adquisición</label>
              <input 
                type="date" 
                value={buyDate}
                onChange={(e) => setBuyDate(e.target.value)}
                className="premium-input"
                style={{ width: '100%' }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
            <button 
              type="button" 
              onClick={() => setShowAddForm(false)}
              className="action-btn-secondary"
              style={{ padding: '0.5rem 1rem', fontSize: '0.8rem', borderRadius: '8px' }}
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              className="action-btn-primary"
              style={{ padding: '0.5rem 1rem', fontSize: '0.8rem', borderRadius: '8px' }}
            >
              Guardar Calzado
            </button>
          </div>
        </form>
      )}

      {/* Grid de Calzados */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {shoesWithStats.length > 0 ? (
          shoesWithStats.map((shoe) => (
            <div 
              key={shoe.id} 
              className="glass-card" 
              style={{ 
                padding: '1.25rem', 
                borderLeft: `4px solid ${shoe.isActive ? shoe.statusColor : 'var(--text-muted)'}`,
                opacity: shoe.isActive ? 1 : 0.65
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <div>
                  <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: '700', color: '#fff' }}>
                    {shoe.brand} {shoe.model}
                  </h4>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'flex', gap: '0.5rem', marginTop: '0.15rem' }}>
                    <span>Adquirido: {new Date(shoe.buyDate + 'T00:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                    <span>•</span>
                    <span>Carreras vinculadas: {shoe.runsCount}</span>
                  </span>
                </div>
                
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  {/* Status Badge */}
                  <span className="badge" style={{ 
                    background: `${shoe.statusColor}15`, 
                    color: shoe.statusColor, 
                    border: `1px solid ${shoe.statusColor}35`,
                    fontSize: '0.65rem'
                  }}>
                    {shoe.statusText}
                  </span>

                  {/* Active Toggle */}
                  <button 
                    onClick={() => handleToggleActive(shoe.id)}
                    className="action-btn-secondary"
                    style={{ padding: '0.25rem 0.5rem', fontSize: '0.65rem', borderRadius: '6px' }}
                    title={shoe.isActive ? "Archivar zapatilla (ya no se mostrará para nuevas carreras)" : "Activar zapatilla para usar en nuevas carreras"}
                  >
                    {shoe.isActive ? 'Archivar' : 'Activar'}
                  </button>

                  {/* Delete Button */}
                  <button 
                    onClick={() => handleDeleteShoe(shoe.id)}
                    style={{ background: 'transparent', border: 'none', color: '#f87171', cursor: 'pointer', padding: '0.25rem' }}
                    title="Eliminar registro"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              {/* Progress and numbers */}
              <div style={{ marginTop: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                  <span>Distancia total: <strong>{shoe.totalKm} km</strong></span>
                  <span>Límite: {shoe.maxKm} km</span>
                </div>
                
                {/* Custom Progress Bar */}
                <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ 
                    width: `${shoe.progressPct}%`, 
                    height: '100%', 
                    background: shoe.statusColor,
                    borderRadius: '4px',
                    boxShadow: `0 0 8px ${shoe.statusColor}50`,
                    transition: 'width 0.4s ease'
                  }} />
                </div>
              </div>

              {/* Alerta de Desgaste Crítico */}
              {shoe.progressPct >= 85 && shoe.isActive && (
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start', marginTop: '1rem', padding: '0.75rem', background: 'rgba(239, 68, 68, 0.05)', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.15)' }}>
                  <ShieldAlert size={16} style={{ color: '#f87171', marginTop: '2px', flexShrink: 0 }} />
                  <p style={{ margin: 0, fontSize: '0.7rem', color: '#f87171', lineHeight: '1.4' }}>
                    <strong>¡Atención!</strong> Estas zapatillas han superado el 85% de su vida útil. La suela ha perdido elasticidad de rebote, aumentando significativamente la carga mecánica sobre tus tendones y rodillas. Se recomienda reemplazarlas para entrenamientos exigentes.
                  </p>
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="glass-card" style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            <Info size={32} style={{ color: 'var(--text-muted)', margin: '0 auto 0.75rem auto', display: 'block', opacity: 0.5 }} />
            <p style={{ margin: 0, fontSize: '0.85rem' }}>No tienes calzados registrados.</p>
            <p style={{ margin: '0.25rem 0 1rem 0', fontSize: '0.75rem' }}>Registra tu primer par de zapatillas para medir el desgaste automáticamente.</p>
            <button 
              onClick={() => setShowAddForm(true)}
              className="action-btn-primary"
              style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem', borderRadius: '8px', margin: 'auto' }}
            >
              Agregar Zapatilla
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
