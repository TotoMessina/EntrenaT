import React, { useState, useEffect, useCallback } from 'react';
import { 
  Users, 
  Search, 
  UserPlus, 
  Check, 
  Clock, 
  UserMinus, 
  X, 
  Award, 
  Flame, 
  Zap, 
  Activity, 
  Heart, 
  Calendar, 
  Dumbbell, 
  Sparkles,
  Info
} from 'lucide-react';
import { calculateVDOT, getRacePredictions, timeStringToSeconds } from '../utils/calculators';

export default function SocialHub({
  user,
  searchUsers,
  sendFriendRequest,
  acceptFriendRequest,
  removeFriend,
  fetchFriendsList,
  fetchFriendData,
  showAlert,
  showConfirm
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  
  const [friendsList, setFriendsList] = useState([]);
  const [isLoadingFriends, setIsLoadingFriends] = useState(true);

  const [selectedFriend, setSelectedFriend] = useState(null);
  const [friendDetails, setFriendDetails] = useState(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  // Cargar lista de amigos
  const loadFriends = useCallback(async () => {
    setIsLoadingFriends(true);
    try {
      const list = await fetchFriendsList();
      setFriendsList(list || []);
    } catch (e) {
      console.error('Error loading friends list:', e);
    } finally {
      setIsLoadingFriends(false);
    }
  }, [fetchFriendsList]);

  useEffect(() => {
    loadFriends();
  }, [loadFriends]);

  // Manejar la búsqueda
  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await searchUsers(searchQuery);
        setSearchResults(results || []);
      } catch (e) {
        console.error('Error searching users:', e);
      } finally {
        setIsSearching(false);
      }
    }, 400);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery, searchUsers]);

  // Enviar solicitud de amistad
  const handleAddFriend = async (friendId, name) => {
    try {
      const res = await sendFriendRequest(friendId);
      if (res?.success) {
        showAlert('Solicitud Enviada', `Le has enviado una solicitud de amistad a ${name}.`);
        loadFriends();
        // Reset search results state to show requested status
        setSearchResults(prev => prev.map(u => u.user_id === friendId ? { ...u, isRequested: true } : u));
      } else {
        showAlert('Error', res?.message || 'No se pudo enviar la solicitud.');
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Aceptar solicitud
  const handleAcceptRequest = async (senderId, name) => {
    try {
      const res = await acceptFriendRequest(senderId);
      if (res?.success) {
        showAlert('Amigo Agregado', `¡Ahora eres amigo de ${name}!`);
        loadFriends();
      } else {
        showAlert('Error', res?.message || 'No se pudo aceptar la solicitud.');
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Rechazar o eliminar amigo
  const handleRemoveFriend = async (friendId, name, isPending = false) => {
    const actionText = isPending ? 'cancelar la solicitud de amistad' : 'eliminar a este amigo';
    const confirmed = await showConfirm(
      isPending ? 'Cancelar Solicitud' : 'Eliminar Amigo',
      `¿Estás seguro de que deseas ${actionText} con ${name}?`
    );
    if (!confirmed) return;

    try {
      const res = await removeFriend(friendId);
      if (res?.success) {
        showAlert('Éxito', 'Acción realizada correctamente.');
        loadFriends();
      } else {
        showAlert('Error', res?.message || 'No se pudo realizar la acción.');
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Ver detalles de un amigo
  const handleViewFriendDetails = async (friend) => {
    setSelectedFriend(friend);
    setIsLoadingDetails(true);
    setFriendDetails(null);
    try {
      const data = await fetchFriendData(friend.friendId);
      if (data) {
        // Calcular estadísticas adicionales para el amigo
        const runs = data.workouts.filter(w => w.type?.toLowerCase() === 'running' && w.distance > 0 && w.duration);
        
        // Calcular VDOT
        let bestVDOT = 0;
        let bestRun = null;
        let bestPace = Infinity;

        runs.forEach(r => {
          const secs = timeStringToSeconds(r.duration);
          if (secs > 0) {
            const vdot = calculateVDOT(r.distance, secs);
            if (vdot > bestVDOT) {
              bestVDOT = vdot;
              bestRun = r;
            }
            const pace = secs / r.distance;
            if (pace < bestPace) bestPace = pace;
          }
        });

        // Calcular kilómetros en los últimos 7 días
        const today = new Date();
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(today.getDate() - 7);
        const weeklyKm = runs
          .filter(r => new Date(r.date) >= sevenDaysAgo)
          .reduce((sum, r) => sum + Number(r.distance), 0);

        // Predicciones de carrera basadas en su VDOT máximo
        let predictions = [];
        if (bestVDOT > 0 && bestRun) {
          predictions = getRacePredictions(bestRun.distance, bestRun.duration, data.profile || {}, data.workouts);
        }

        setFriendDetails({
          ...data,
          weeklyKm: Math.round(weeklyKm * 10) / 10,
          bestVDOT: Math.round(bestVDOT * 10) / 10,
          predictions,
          totalWorkouts: data.workouts.length,
          runsCount: runs.length
        });
      } else {
        showAlert('Error', 'No se pudo cargar la información de este amigo.');
        setSelectedFriend(null);
      }
    } catch (e) {
      console.error('Failed loading friend profile details:', e);
      showAlert('Error', 'Ocurrió un error al procesar el perfil.');
      setSelectedFriend(null);
    } finally {
      setIsLoadingDetails(false);
    }
  };

  // Separar amigos por estado
  const activeFriends = friendsList.filter(f => f.status === 'accepted');
  const pendingReceived = friendsList.filter(f => f.status === 'pending' && !f.isSender);
  const pendingSent = friendsList.filter(f => f.status === 'pending' && f.isSender);

  // Helper para renderizar iniciales de avatar
  const getInitials = (name) => {
    if (!name) return 'AT';
    return name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();
  };

  return (
    <div className="social-hub-container animate-fade-in" style={{ padding: '0 0.5rem' }}>
      
      {/* Explicación / Header de comunidad */}
      <div className="glass-card card-identity" style={{ padding: '1.25rem', marginBottom: '1.5rem', borderLeft: '4px solid var(--color-primary)' }}>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginBottom: '0.5rem' }}>
          <Users className="text-primary-glow animate-pulse" size={24} style={{ color: 'var(--color-primary)' }} />
          <h3 className="card-title" style={{ margin: 0, fontSize: '1.2rem' }}>Comunidad de Atletas</h3>
        </div>
        <p className="card-subtitle" style={{ fontSize: '0.85rem', lineHeight: '1.4', margin: 0 }}>
          {user 
            ? 'Busca amigos deportistas para compartir entrenamientos, comparar marcas de VDOT, seguir kilometrajes acumulados semanales y motivarse mutuamente sin salir de tu ecosistema deportivo.'
            : '⚠️ Estás en modo de demostración local. Puedes explorar el comportamiento interactivo con perfiles y actividades simuladas. Conéctate a Supabase Cloud en la pestaña "Respaldos" para buscar atletas reales.'}
        </p>
      </div>

      <div className="grid-2col-layout" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem' }}>
        
        {/* Columna Búsqueda y Solicitudes */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Buscador */}
          <div className="glass-card" style={{ padding: '1.25rem' }}>
            <h3 className="card-title" style={{ fontSize: '1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Search size={18} style={{ color: 'var(--color-primary)' }} />
              Buscar Atletas
            </h3>
            
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Ingresa el nombre, username o email..."
                className="premium-input"
                style={{ width: '100%', paddingLeft: '2.5rem' }}
              />
              <Search size={18} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            </div>

            {/* Resultados de búsqueda */}
            {searchQuery.trim().length >= 2 && (
              <div style={{ marginTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '1rem' }}>
                {isSearching ? (
                  <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-muted)' }}>
                    <div className="search-pulse" style={{ width: '20px', height: '20px', borderRadius: '50%', border: '2px solid var(--color-primary)', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite', margin: '0 auto 0.5rem' }} />
                    Buscando atletas...
                  </div>
                ) : searchResults.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {searchResults.map((athlete) => {
                      // Comprobar estado de relación actual
                      const relation = friendsList.find(f => f.friendId === athlete.user_id);
                      const isFriend = relation?.status === 'accepted';
                      const isPendingSent = relation?.status === 'pending' && relation.isSender;
                      const isPendingRecv = relation?.status === 'pending' && !relation.isSender;

                      return (
                        <div 
                          key={athlete.user_id} 
                          className="search-result-row"
                          style={{ 
                            display: 'flex', 
                            justifyContent: 'space-between', 
                            alignItems: 'center', 
                            padding: '0.75rem 1rem', 
                            background: 'rgba(255,255,255,0.02)', 
                            border: '1px solid rgba(255,255,255,0.05)', 
                            borderRadius: '12px' 
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
                            <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--color-primary), #6d28d9)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '0.85rem', flexShrink: 0 }}>
                              {getInitials(athlete.display_name)}
                            </div>
                            <div style={{ minWidth: 0 }}>
                              <span style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {athlete.display_name || athlete.email?.split('@')[0]}
                              </span>
                              <span style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                @{athlete.username || 'atleta'}
                              </span>
                            </div>
                          </div>

                          <div style={{ marginLeft: '0.5rem' }}>
                            {isFriend ? (
                              <span className="badge" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                                <Check size={12} style={{ marginRight: '4px' }} /> Amigos
                              </span>
                            ) : isPendingSent ? (
                              <button 
                                onClick={() => handleRemoveFriend(athlete.user_id, athlete.display_name, true)}
                                className="badge hover-glow-red"
                                style={{ background: 'rgba(249, 115, 22, 0.1)', color: '#f97316', border: '1px solid rgba(249, 115, 22, 0.2)', cursor: 'pointer' }}
                                title="Hacer clic para cancelar solicitud"
                              >
                                <Clock size={12} style={{ marginRight: '4px' }} /> Pendiente
                              </button>
                            ) : isPendingRecv ? (
                              <button 
                                onClick={() => handleAcceptRequest(athlete.user_id, athlete.display_name)}
                                className="btn btn-primary"
                                style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem', borderRadius: '6px' }}
                              >
                                Aceptar
                              </button>
                            ) : (
                              <button 
                                onClick={() => handleAddFriend(athlete.user_id, athlete.display_name)}
                                className="btn btn-primary flex-center"
                                style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem', borderRadius: '8px', gap: '0.25rem' }}
                              >
                                <UserPlus size={14} />
                                <span>Agregar</span>
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    No se encontraron atletas que coincidan con tu búsqueda.
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Bandeja de solicitudes recibidas */}
          {pendingReceived.length > 0 && (
            <div className="glass-card animate-pulse-border" style={{ padding: '1.25rem', borderLeft: '4px solid var(--color-running)' }}>
              <h3 className="card-title" style={{ fontSize: '1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-running)' }}>
                <Clock size={18} />
                Solicitudes de Amistad Recibidas ({pendingReceived.length})
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {pendingReceived.map((req) => (
                  <div 
                    key={req.friendId}
                    style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center', 
                      padding: '0.75rem 1rem', 
                      background: 'rgba(255,255,255,0.02)', 
                      border: '1px solid rgba(255,255,255,0.05)', 
                      borderRadius: '12px' 
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
                      <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--color-primary), #6d28d9)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '0.85rem', flexShrink: 0 }}>
                        {getInitials(req.profile.displayName)}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <span style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {req.profile.displayName}
                        </span>
                        <span style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                          @{req.profile.username}
                        </span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '0.4rem', marginLeft: '0.5rem' }}>
                      <button 
                        onClick={() => handleAcceptRequest(req.friendId, req.profile.displayName)}
                        className="btn btn-primary"
                        style={{ padding: '0.35rem 0.6rem', fontSize: '0.75rem', borderRadius: '6px' }}
                      >
                        Aceptar
                      </button>
                      <button 
                        onClick={() => handleRemoveFriend(req.friendId, req.profile.displayName, true)}
                        className="theme-switcher-btn"
                        style={{ width: '28px', height: '28px', borderRadius: '6px', color: '#f87171' }}
                        title="Rechazar solicitud"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Columna Amigos Activos */}
        <div className="glass-card" style={{ padding: '1.25rem' }}>
          <h3 className="card-title" style={{ fontSize: '1rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Users size={18} style={{ color: 'var(--color-primary)' }} />
            Mis Amigos ({activeFriends.length})
          </h3>

          {isLoadingFriends ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
              <div className="search-pulse" style={{ width: '30px', height: '30px', borderRadius: '50%', border: '2px solid var(--color-primary)', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite', margin: '0 auto 0.75rem' }} />
              Cargando red de amigos...
            </div>
          ) : activeFriends.length > 0 ? (
            <div className="friends-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 260px), 1fr))', gap: '1rem' }}>
              {activeFriends.map((friend) => (
                <div 
                  key={friend.friendId}
                  className="friend-item-card glass-card hover-glow"
                  onClick={() => handleViewFriendDetails(friend)}
                  style={{ 
                    padding: '1.15rem', 
                    borderRadius: '16px', 
                    background: 'rgba(255,255,255,0.02)', 
                    border: '1px solid rgba(255,255,255,0.05)',
                    display: 'flex',
                    flexDirection: 'column',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease-in-out',
                    position: 'relative',
                    overflow: 'hidden'
                  }}
                >
                  {/* Neon border hover in CSS style */}
                  <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginBottom: '1rem' }}>
                    <div style={{ 
                      width: '42px', 
                      height: '42px', 
                      borderRadius: '50%', 
                      background: 'linear-gradient(135deg, var(--color-primary) 0%, #4f46e5 100%)', 
                      color: '#fff', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      fontWeight: '700', 
                      fontSize: '1rem',
                      boxShadow: '0 0 10px rgba(139, 92, 246, 0.15)',
                      flexShrink: 0 
                    }}>
                      {getInitials(friend.profile.displayName)}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <span style={{ display: 'block', fontSize: '0.9rem', fontWeight: '700', color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {friend.profile.displayName}
                      </span>
                      <span style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        @{friend.profile.username}
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', background: 'rgba(0,0,0,0.15)', padding: '0.6rem 0.85rem', borderRadius: '10px', fontSize: '0.78rem', gap: '0.5rem', marginTop: 'auto' }}>
                    <div>
                      <span style={{ display: 'block', fontSize: '0.62rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Km Semanales</span>
                      <strong style={{ color: 'var(--color-running)', fontSize: '0.85rem' }}>
                        {friend.friendId === 'mock-friend-juan' ? '45.1' : friend.friendId === 'mock-friend-sofia' ? '35.0' : '--.-'}
                      </strong>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ display: 'block', fontSize: '0.62rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>VDOT Máx</span>
                      <strong style={{ color: 'var(--color-primary)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '2px' }}>
                        <Zap size={10} />
                        {friend.friendId === 'mock-friend-juan' ? '52.0' : friend.friendId === 'mock-friend-sofia' ? '48.2' : '--.-'}
                      </strong>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.85rem', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    <span>Ver ficha atlética</span>
                    <span style={{ color: 'var(--color-primary)', fontWeight: 'bold' }}>→</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '4rem 1rem', color: 'var(--text-muted)', fontSize: '0.88rem' }}>
              <Users size={32} style={{ color: 'var(--text-muted)', marginBottom: '0.75rem', opacity: 0.5 }} />
              <p style={{ margin: 0 }}>Aún no has agregado a ningún amigo en tu red.</p>
              <p style={{ margin: '0.35rem 0 0', fontSize: '0.75rem' }}>Utiliza el buscador de arriba para encontrar y agregar atletas.</p>
            </div>
          )}
        </div>
      </div>

      {/* MODAL DETALLES DEL ATLETA (FICHA DE AMIGO) */}
      {selectedFriend && (
        <div className="custom-dialog-overlay" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100 }}>
          <div className="glass-card custom-dialog" style={{ width: '90%', maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', position: 'relative' }}>
            
            <button 
              onClick={() => setSelectedFriend(null)} 
              className="mobile-more-sheet-close" 
              style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', zIndex: 10 }}
            >
              <X size={16} />
            </button>

            {isLoadingDetails ? (
              <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
                <div className="search-pulse" style={{ width: '40px', height: '40px', borderRadius: '50%', border: '3px solid var(--color-primary)', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite', margin: '0 auto 1rem' }} />
                <h3>Sincronizando perfil de atleta...</h3>
                <p style={{ fontSize: '0.8rem', margin: 0 }}>Consultando base de datos y recalculando telemetría VDOT...</p>
              </div>
            ) : friendDetails ? (
              <div className="friend-details-content animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                
                {/* Cabecera / Tarjeta Biometría de Atleta */}
                <div 
                  className="glass-card" 
                  style={{ 
                    padding: '1.5rem', 
                    background: 'linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(139, 92, 246, 0.05) 100%)', 
                    borderRadius: '20px', 
                    border: '1px solid rgba(139,92,246,0.15)',
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    gap: '1.25rem'
                  }}
                >
                  <div style={{ 
                    width: '64px', 
                    height: '64px', 
                    borderRadius: '50%', 
                    background: 'linear-gradient(135deg, var(--color-primary) 0%, #4f46e5 100%)', 
                    color: '#fff', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    fontWeight: '800', 
                    fontSize: '1.5rem',
                    boxShadow: '0 0 20px rgba(139, 92, 246, 0.4)',
                    flexShrink: 0 
                  }}>
                    {getInitials(selectedFriend.profile.displayName)}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <h2 style={{ margin: 0, fontSize: '1.3rem', fontWeight: '800', color: '#fff' }}>
                        {selectedFriend.profile.displayName}
                      </h2>
                      <span className="badge" style={{ background: 'rgba(139, 92, 246, 0.15)', color: 'var(--color-primary)', border: '1px solid rgba(139, 92, 246, 0.3)', fontSize: '0.65rem' }}>
                        Atleta Verificado
                      </span>
                    </div>
                    <span style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                      @{selectedFriend.profile.username} • {selectedFriend.profile.email || 'Correo oculto'}
                    </span>
                  </div>

                  <button 
                    onClick={() => handleRemoveFriend(selectedFriend.friendId, selectedFriend.profile.displayName, false)}
                    className="action-btn-secondary"
                    style={{ padding: '0.5rem 0.85rem', fontSize: '0.75rem', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.2)', background: 'rgba(239, 68, 68, 0.05)', borderRadius: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    <UserMinus size={14} />
                    <span>Eliminar amigo</span>
                  </button>
                </div>

                {/* Grid Core Stats (Km semanales, VDOT, Actividades) */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                  
                  {/* Kilómetros Semanales */}
                  <div className="glass-card" style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-running)', flexShrink: 0 }}>
                      <Activity size={20} />
                    </div>
                    <div>
                      <span style={{ display: 'block', fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Volume 7 Días</span>
                      <strong style={{ fontSize: '1.2rem', color: '#fff' }}>{friendDetails.weeklyKm || '0'} <span style={{ fontSize: '0.8rem', fontWeight: '500', color: 'var(--text-muted)' }}>km</span></strong>
                    </div>
                  </div>

                  {/* VDOT Fisiológica */}
                  <div className="glass-card" style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(139, 92, 246, 0.1)', border: '1px solid rgba(139, 92, 246, 0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-primary)', flexShrink: 0 }}>
                      <Zap size={20} />
                    </div>
                    <div>
                      <span style={{ display: 'block', fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>VDOT Máxima</span>
                      <strong style={{ fontSize: '1.2rem', color: '#fff' }}>{friendDetails.bestVDOT || '--.-'} <span style={{ fontSize: '0.8rem', fontWeight: '500', color: 'var(--text-muted)' }}>Vº₂</span></strong>
                    </div>
                  </div>

                  {/* Actividades Totales */}
                  <div className="glass-card" style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3b82f6', flexShrink: 0 }}>
                      <Dumbbell size={20} />
                    </div>
                    <div>
                      <span style={{ display: 'block', fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Sesiones Registradas</span>
                      <strong style={{ fontSize: '1.2rem', color: '#fff' }}>{friendDetails.totalWorkouts || '0'} <span style={{ fontSize: '0.8rem', fontWeight: '500', color: 'var(--text-muted)' }}>total</span></strong>
                    </div>
                  </div>
                </div>

                {/* Ficha Antropométrica y Biométricas */}
                {friendDetails.profile && (
                  <div className="glass-card" style={{ padding: '1.25rem' }}>
                    <h4 style={{ margin: '0 0 0.85rem 0', fontSize: '0.88rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Biometría del Atleta</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '0.75rem' }}>
                      <div style={{ background: 'rgba(255,255,255,0.02)', padding: '0.5rem 0.75rem', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.04)' }}>
                        <span style={{ display: 'block', fontSize: '0.65rem', color: 'var(--text-muted)' }}>Edad</span>
                        <strong style={{ fontSize: '0.9rem', color: '#fff' }}>{friendDetails.profile.age} años</strong>
                      </div>
                      <div style={{ background: 'rgba(255,255,255,0.02)', padding: '0.5rem 0.75rem', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.04)' }}>
                        <span style={{ display: 'block', fontSize: '0.65rem', color: 'var(--text-muted)' }}>Peso</span>
                        <strong style={{ fontSize: '0.9rem', color: '#fff' }}>{friendDetails.profile.weight} kg</strong>
                      </div>
                      <div style={{ background: 'rgba(255,255,255,0.02)', padding: '0.5rem 0.75rem', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.04)' }}>
                        <span style={{ display: 'block', fontSize: '0.65rem', color: 'var(--text-muted)' }}>Altura</span>
                        <strong style={{ fontSize: '0.9rem', color: '#fff' }}>{friendDetails.profile.height} cm</strong>
                      </div>
                      <div style={{ background: 'rgba(255,255,255,0.02)', padding: '0.5rem 0.75rem', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.04)' }}>
                        <span style={{ display: 'block', fontSize: '0.65rem', color: 'var(--text-muted)' }}>FC de Reposo</span>
                        <strong style={{ fontSize: '0.9rem', color: '#fff' }}>{friendDetails.profile.restingHR} ppm</strong>
                      </div>
                    </div>
                  </div>
                )}

                {/* Predicciones VDOT del Amigo */}
                {friendDetails.predictions && friendDetails.predictions.length > 0 && (
                  <div className="glass-card" style={{ padding: '1.25rem' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.85rem' }}>
                      <Award size={18} style={{ color: 'var(--color-primary)' }} />
                      <h4 style={{ margin: 0, fontSize: '0.88rem', color: '#fff', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Tiempos Proyectados Científicos (VDOT {friendDetails.bestVDOT})</h4>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.75rem' }}>
                      {friendDetails.predictions.slice(0, 4).map((p, idx) => (
                        <div 
                          key={idx}
                          style={{ 
                            background: 'rgba(139, 92, 246, 0.03)', 
                            border: '1px solid rgba(139, 92, 246, 0.1)', 
                            padding: '0.65rem 0.85rem', 
                            borderRadius: '12px',
                            textAlign: 'center'
                          }}
                        >
                          <span style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: '600' }}>{p.name}</span>
                          <strong style={{ display: 'block', fontSize: '1.05rem', color: 'var(--color-primary)', margin: '4px 0' }}>{p.time}</strong>
                          <span style={{ display: 'block', fontSize: '0.62rem', color: 'var(--text-muted)' }}>{p.pace} /km</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Bitácora de Actividades Recientes */}
                <div className="glass-card" style={{ padding: '1.25rem' }}>
                  <h4 style={{ margin: '0 0 1rem 0', fontSize: '0.88rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Bitácora de Entrenamientos Recientes</h4>
                  
                  {friendDetails.workouts && friendDetails.workouts.length > 0 ? (
                    <div className="workouts-recent-scroll" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '250px', overflowY: 'auto', paddingRight: '4px' }}>
                      {friendDetails.workouts.map((workout) => {
                        const isRun = workout.type?.toLowerCase() === 'running';
                        return (
                          <div 
                            key={workout.id}
                            style={{ 
                              padding: '0.85rem 1rem', 
                              background: 'rgba(255,255,255,0.01)', 
                              border: '1px solid rgba(255,255,255,0.03)', 
                              borderRadius: '12px',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '0.4rem'
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <span className={`badge ${isRun ? 'badge-running' : 'badge-strength'}`} style={{
                                  background: isRun ? 'rgba(16, 185, 129, 0.12)' : 'rgba(59, 130, 246, 0.12)',
                                  color: isRun ? 'var(--color-running)' : '#3b82f6',
                                  border: `1px solid ${isRun ? 'rgba(16, 185, 129, 0.2)' : 'rgba(59, 130, 246, 0.2)'}`,
                                  fontSize: '0.65rem'
                                }}>
                                  {isRun ? 'Running 👟' : 'Fuerza 🏋️'}
                                </span>
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  <Calendar size={12} />
                                  {workout.date}
                                </span>
                              </div>
                              <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#fff' }}>
                                {isRun 
                                  ? `${workout.distance} km @ ${workout.duration}` 
                                  : workout.sessionName || 'Sesión de Fuerza'}
                              </span>
                            </div>

                            {workout.notes && (
                              <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic', lineHeight: '1.3' }}>
                                "{workout.notes}"
                              </p>
                            )}

                            {!isRun && workout.exercises && workout.exercises.length > 0 && (
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginTop: '2px' }}>
                                {workout.exercises.map((ex, idx) => (
                                  <span key={idx} style={{ fontSize: '0.65rem', background: 'rgba(255,255,255,0.03)', padding: '2px 6px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.05)', color: 'var(--text-muted)' }}>
                                    {ex.name}: {ex.sets}x{ex.reps} {ex.weight ? `(${ex.weight}kg)` : ''}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                      Este amigo aún no ha registrado ningún entrenamiento en la plataforma.
                    </div>
                  )}
                </div>

                {/* Historial de recuperación (Readiness) */}
                {friendDetails.readinessLogs && friendDetails.readinessLogs.length > 0 && (
                  <div className="glass-card" style={{ padding: '1.25rem' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.85rem' }}>
                      <Heart size={16} style={{ color: 'var(--color-running)' }} />
                      <h4 style={{ margin: 0, fontSize: '0.88rem', color: '#fff', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Registro Reciente de Disposición Física (Readiness)</h4>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {friendDetails.readinessLogs.slice(0, 2).map((log, idx) => (
                        <div 
                          key={idx}
                          style={{ 
                            background: 'rgba(255,255,255,0.01)', 
                            border: '1px solid rgba(255,255,255,0.03)', 
                            padding: '0.65rem 0.85rem', 
                            borderRadius: '10px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            fontSize: '0.75rem',
                            flexWrap: 'wrap',
                            gap: '0.5rem'
                          }}
                        >
                          <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Calendar size={12} /> {log.date}
                          </span>
                          <div style={{ display: 'flex', gap: '1rem' }}>
                            <span>💤 Sueño: <strong>{log.sleep}/10</strong></span>
                            <span>🦵 Dolor Muscular: <strong>{log.soreness}/10</strong></span>
                            <span>💓 Pulso: <strong>{log.restingHr} ppm</strong></span>
                            {log.hrv && <span>📉 HRV: <strong>{log.hrv} ms</strong></span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                No se pudo obtener la ficha de este deportista.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Keyframe spinner style for search */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .hover-glow:hover {
          border-color: rgba(139, 92, 246, 0.4) !important;
          box-shadow: 0 4px 20px rgba(139, 92, 246, 0.12) !important;
          transform: translateY(-2px);
        }
        .hover-glow-red:hover {
          border-color: rgba(239, 68, 68, 0.4) !important;
          color: #f87171 !important;
          background: rgba(239, 68, 68, 0.1) !important;
        }
        .animate-pulse-border {
          animation: pulseBorder 2s infinite alternate ease-in-out;
        }
        @keyframes pulseBorder {
          0% { border-color: rgba(16, 185, 129, 0.15); }
          100% { border-color: rgba(16, 185, 129, 0.45); }
        }
        .search-pulse {
          box-shadow: 0 0 10px rgba(139, 92, 246, 0.3);
        }
        .workouts-recent-scroll::-webkit-scrollbar {
          width: 4px;
        }
        .workouts-recent-scroll::-webkit-scrollbar-track {
          background: transparent;
        }
        .workouts-recent-scroll::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,0.06);
          border-radius: 2px;
        }
        .workouts-recent-scroll::-webkit-scrollbar-thumb:hover {
          background: rgba(139, 92, 246, 0.3);
        }
      `}</style>
    </div>
  );
}
