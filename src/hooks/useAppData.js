import { useState, useEffect, useCallback } from 'react';
import { MOCK_WORKOUTS } from '../mockData';
import { getSupabase, initSupabase, clearSupabase } from '../utils/supabaseClient';
import { calculateAchievements } from '../utils/achievements';
import { workoutToSupabasePayload, supabaseRowToWorkout } from '../utils/workoutSerializer';

/**
 * Lee un valor de localStorage parseando JSON con un default seguro.
 * Evita try/catch repetido en cada useState initializer.
 */
const readLocalJSON = (key, defaultValue) => {
  const stored = localStorage.getItem(key);
  if (!stored) return defaultValue;
  try { return JSON.parse(stored); } catch { return defaultValue; }
};

/**
 * useAppData — Custom hook central de la aplicación.
 *
 * Contiene todo el estado de datos, sincronización bidireccional con Supabase,
 * y los handlers de CRUD/Auth. Desacopla completamente la lógica de datos
 * del árbol de renderizado de App.jsx.
 *
 * HIGH-01: Extrae el God Component App.jsx en hook reutilizable.
 * HIGH-06: Estado inicializado una sola vez vía lazy initializers (no doble-read).
 */

const generateFriendWorkouts = (friendId) => {
  if (friendId === 'mock-friend-juan') {
    return [
      { id: 'w-j-1', type: 'Running', date: '2026-05-21', distance: 12, duration: '00:54:30', heartRate: 145, rpe: 6, notes: 'Trote aeróbico cómodo, buenas sensaciones.', terrain: 'Asfalto' },
      { id: 'w-j-2', type: 'Running', date: '2026-05-19', distance: 8, duration: '00:34:10', heartRate: 162, rpe: 8, notes: 'Series de 1000m en pista. Ritmo promedio 3:55/km.', terrain: 'Pista' },
      { id: 'w-j-3', type: 'Running', date: '2026-05-17', distance: 21.1, duration: '01:38:00', heartRate: 150, rpe: 7, notes: 'Fondo largo dominical en zona 2/3.', terrain: 'Asfalto' },
      { id: 'w-j-4', type: 'Running', date: '2026-05-14', distance: 10, duration: '00:45:00', heartRate: 142, rpe: 5, notes: 'Trote regenerativo.', terrain: 'Asfalto' },
      { id: 'w-j-5', type: 'Strength', date: '2026-05-13', sessionName: 'Fuerza Piernas', muscleGroup: 'Piernas', exercises: [{ name: 'Sentadillas', sets: 4, reps: 10, weight: 80 }, { name: 'Prensa', sets: 3, reps: 12, weight: 140 }], notes: 'Enfoque en potencia.' }
    ];
  } else if (friendId === 'mock-friend-sofia') {
    return [
      { id: 'w-s-1', type: 'Running', date: '2026-05-20', distance: 8, duration: '00:42:00', heartRate: 138, rpe: 5, notes: 'Trote suave regenerativo post-carrera.', terrain: 'Tierra' },
      { id: 'w-s-2', type: 'Running', date: '2026-05-18', distance: 15, duration: '01:18:20', heartRate: 146, rpe: 7, notes: 'Carrera tempo sostenido. Excelente clima.', terrain: 'Parque' },
      { id: 'w-s-3', type: 'Running', date: '2026-05-16', distance: 6, duration: '00:30:15', heartRate: 155, rpe: 8, notes: 'Cuestas de 200m en parque.', terrain: 'Parque' },
      { id: 'w-s-4', type: 'Running', date: '2026-05-13', distance: 12, duration: '01:03:00', heartRate: 140, rpe: 6, notes: 'Trote base.', terrain: 'Asfalto' }
    ];
  } else {
    return [
      { id: 'w-c-1', type: 'Running', date: '2026-05-20', distance: 10, duration: '00:50:00', heartRate: 140, rpe: 6, notes: 'Trote básico en parque.', terrain: 'Parque' }
    ];
  }
};

const generateFriendReadiness = (friendId) => {
  return [
    { date: '2026-05-22', sleep: 8, soreness: 2, resting_hr: 54, hrv: 75, notes: 'Descansado y listo para correr.' },
    { date: '2026-05-21', sleep: 7, soreness: 3, resting_hr: 56, hrv: 68, notes: 'Algo de fatiga en pantorrillas.' }
  ];
};

const generateFriendProfile = (friendId) => {
  if (friendId === 'mock-friend-juan') {
    return { age: 29, weight: 70, height: 178, restingHR: 52, gender: 'male', displayName: 'Juan Pérez', username: 'juan_vdot52' };
  } else if (friendId === 'mock-friend-sofia') {
    return { age: 26, weight: 58, height: 165, restingHR: 50, gender: 'female', displayName: 'Sofía Gómez', username: 'sofia_runner' };
  } else if (friendId === 'mock-user-carlos') {
    return { age: 35, weight: 74, height: 176, restingHR: 54, gender: 'male', displayName: 'Carlos Silva', username: 'carlos_maraton' };
  } else if (friendId === 'mock-user-ana') {
    return { age: 31, weight: 54, height: 160, restingHR: 48, gender: 'female', displayName: 'Ana Martínez', username: 'ana_ultra' };
  } else {
    return { age: 30, weight: 72, height: 172, restingHR: 58, gender: 'male', displayName: 'Atleta Pro', username: 'atleta_pro' };
  }
};

export function useAppData() {

  // ── ESTADO DE DATOS (HIGH-06: lazy initializers = único read de localStorage) ──
  const [workouts, setWorkouts] = useState(() =>
    readLocalJSON('fitanalytics_workouts', MOCK_WORKOUTS)
  );
  const [shoes, setShoes] = useState(() =>
    readLocalJSON('fitanalytics_shoes', [])
  );
  const [plans, setPlans] = useState(() =>
    readLocalJSON('fitanalytics_training_plans', [])
  );
  const [readinessLogs, setReadinessLogs] = useState(() =>
    readLocalJSON('fitanalytics_readiness_logs', [])
  );
  const [nutritionLogs, setNutritionLogs] = useState(() =>
    readLocalJSON('fitanalytics_nutrition', [])
  );
  const [profile, setProfile] = useState(() => ({
    age:       Number(localStorage.getItem('fitanalytics_profile_age') || localStorage.getItem('fitanalytics_age')) || 25,
    weight:    Number(localStorage.getItem('fitanalytics_profile_weight'))   || 75,
    height:    Number(localStorage.getItem('fitanalytics_profile_height'))   || 175,
    restingHR: Number(localStorage.getItem('fitanalytics_profile_resting_hr')) || 60,
    gender:    localStorage.getItem('fitanalytics_profile_gender') || 'male',
    displayName: localStorage.getItem('fitanalytics_profile_display_name') || 'Invitado',
    username:  localStorage.getItem('fitanalytics_profile_username') || 'invitado',
    email:     '',
  }));

  // ── ESTADO DE AUTENTICACIÓN / NUBE ──
  const [isSupabaseConnected, setIsSupabaseConnected] = useState(false);
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);

  // ── ESTADO DE GAMIFICACIÓN ──
  const [showConfetti, setShowConfetti] = useState(false);
  const [activeToast, setActiveToast] = useState(null);

  // ── ESTADO DE DIÁLOGOS INTERACTIVOS (MED-04) ──
  const [dialog, setDialog] = useState(null);

  const showAlert = useCallback((title, message) => {
    return new Promise((resolve) => {
      setDialog({ type: 'alert', title, message, resolve });
    });
  }, []);

  const showConfirm = useCallback((title, message) => {
    return new Promise((resolve) => {
      setDialog({ type: 'confirm', title, message, resolve });
    });
  }, []);

  // ── PERSISTENCIA LOCAL REACTIVA (Solo en modo invitado / local) ──
  useEffect(() => { 
    if (!user) localStorage.setItem('fitanalytics_shoes', JSON.stringify(shoes));        
  }, [shoes, user]);

  useEffect(() => { 
    if (!user) localStorage.setItem('fitanalytics_training_plans', JSON.stringify(plans));        
  }, [plans, user]);

  useEffect(() => { 
    if (!user) localStorage.setItem('fitanalytics_readiness_logs', JSON.stringify(readinessLogs));
  }, [readinessLogs, user]);

  useEffect(() => { 
    if (!user) localStorage.setItem('fitanalytics_nutrition', JSON.stringify(nutritionLogs));
  }, [nutritionLogs, user]);

  // ── OBSERVADOR DE LOGROS Y GAMIFICACIÓN ──
  useEffect(() => {
    if (!workouts || workouts.length === 0) return;
    const currentAchievements = calculateAchievements(workouts, profile);
    let notified = [];
    try { notified = JSON.parse(localStorage.getItem('fitanalytics_notified_achievements') || '[]'); }
    catch { notified = []; }

    const newlyUnlocked = [];
    const updatedNotified = [...notified];
    let triggeredAny = false;
    currentAchievements.forEach(ach => {
      if (ach.isUnlocked && !notified.includes(ach.id)) {
        newlyUnlocked.push(ach);
        updatedNotified.push(ach.id);
        triggeredAny = true;
      }
    });
    if (triggeredAny) {
      localStorage.setItem('fitanalytics_notified_achievements', JSON.stringify(updatedNotified));
      setShowConfetti(true);
      if (newlyUnlocked.length > 0) {
        const medal = newlyUnlocked[0];
        const toastId = Date.now();
        setActiveToast({ id: toastId, title: medal.title, subtitle: medal.subtitle, colorTheme: medal.colorTheme });
        setTimeout(() => {
          setActiveToast(prev => (prev && prev.id === toastId ? null : prev));
        }, 5000);
      }
    }
  }, [workouts, profile]);

  // ── FUNCIONES DE SINCRONIZACIÓN BIDIRECCIONAL ──

  const syncWithSupabase = async (client, localWorkouts, activeUser) => {
    if (!activeUser) return localWorkouts;
    try {
      const { data: remoteData, error } = await client.from('workouts').select('*');
      if (error) throw error;

      const workoutsList = (remoteData || []).map(supabaseRowToWorkout);
      workoutsList.sort((a, b) => new Date(b.date) - new Date(a.date));
      setIsSupabaseConnected(true);
      return workoutsList;
    } catch (e) {
      console.error('Supabase workouts read failed:', e);
      setIsSupabaseConnected(false);
      return [];
    }
  };

  const syncNutritionWithSupabase = async (client, localNutrition, activeUser) => {
    if (!activeUser) return localNutrition;
    try {
      const { data: remoteData, error } = await client.from('nutrition').select('*');
      if (error) throw error;

      const nutritionList = (remoteData || []).map(remote => ({
        id: remote.id,
        date: remote.date,
        meals: remote.meals || []
      }));
      nutritionList.sort((a, b) => new Date(b.date) - new Date(a.date));
      return nutritionList;
    } catch (e) {
      console.error('Supabase nutrition read failed:', e);
      return [];
    }
  };

  const syncProfileWithSupabase = async (client, localProfile, activeUser) => {
    if (!activeUser) return localProfile;
    try {
      const { data: remoteProfile, error } = await client
        .from('profiles').select('*').eq('user_id', activeUser.id).maybeSingle();
      if (error) throw error;

      if (remoteProfile) {
        return {
          age:       Number(remoteProfile.age)       || 25,
          weight:    Number(remoteProfile.weight)    || 75,
          height:    Number(remoteProfile.height)    || 175,
          restingHR: Number(remoteProfile.restingHR) || 60,
          gender:    remoteProfile.gender || 'male',
          displayName: remoteProfile.display_name || activeUser.email?.split('@')[0] || 'Atleta',
          username:  remoteProfile.username || activeUser.email?.split('@')[0].replace(/[^a-zA-Z0-9]/g, '').toLowerCase() || 'atleta',
          email:     remoteProfile.email || activeUser.email || '',
        };
      } else {
        const initialDisplayName = activeUser.email ? activeUser.email.split('@')[0] : 'Atleta';
        const initialUsername = activeUser.email ? activeUser.email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '').toLowerCase() : 'atleta_' + activeUser.id.substring(0, 5);
        const defaultProfile = {
          age: 25,
          weight: 75,
          height: 175,
          restingHR: 60,
          gender: 'male',
          displayName: initialDisplayName,
          username: initialUsername,
          email: activeUser.email || '',
        };
        const { error: insertError } = await client.from('profiles').insert({
          user_id:   activeUser.id,
          age:       Number(defaultProfile.age),
          weight:    Number(defaultProfile.weight),
          height:    Number(defaultProfile.height),
          restingHR: Number(defaultProfile.restingHR),
          gender:    defaultProfile.gender,
          display_name: defaultProfile.displayName,
          username:    defaultProfile.username,
          email:       defaultProfile.email,
        });
        if (insertError) throw insertError;
        return defaultProfile;
      }
    } catch (e) {
      console.error('Supabase profile sync failed:', e);
      return { age: 25, weight: 75, height: 175, restingHR: 60, gender: 'male', displayName: 'Atleta', username: 'atleta', email: '' };
    }
  };

  const syncShoesWithSupabase = async (client, localShoes, activeUser) => {
    if (!activeUser) return localShoes;
    try {
      const { data: remoteData, error } = await client.from('shoes').select('*');
      if (error) throw error;

      return (remoteData || []).map(remote => ({
        id: remote.id,
        brand: remote.brand,
        model: remote.model,
        initialKm: Number(remote.initial_km) || 0,
        maxKm: Number(remote.max_km) || 800,
        buyDate: remote.buy_date,
        isActive: remote.is_active !== false
      }));
    } catch (e) {
      console.error('Supabase shoes read failed:', e);
      return [];
    }
  };

  const syncPlansWithSupabase = async (client, localPlans, activeUser) => {
    if (!activeUser) return localPlans;
    try {
      const { data: remoteData, error } = await client.from('training_plans').select('*');
      if (error) throw error;

      return (remoteData || []).map(remote => ({
        date: remote.date,
        distance: Number(remote.distance) || 0,
        sessionType: remote.session_type || 'Regenerativo',
        note: remote.note || ''
      }));
    } catch (e) {
      console.error('Supabase plans read failed:', e);
      return [];
    }
  };

  const syncReadinessWithSupabase = async (client, localReadiness, activeUser) => {
    if (!activeUser) return localReadiness;
    try {
      const { data: remoteData, error } = await client.from('readiness_logs').select('*');
      if (error) throw error;

      return (remoteData || []).map(remote => ({
        date: remote.date,
        sleep: Number(remote.sleep) || 4,
        soreness: Number(remote.soreness) || 2,
        restingHr: Number(remote.resting_hr) || 60,
        hrv: remote.hrv ? Number(remote.hrv) : null,
        notes: remote.notes || ''
      }));
    } catch (e) {
      console.error('Supabase readiness logs read failed:', e);
      return [];
    }
  };

  // ── INICIALIZACIÓN (HIGH-06: usa valores del closure del primer render — sin re-read) ──
  useEffect(() => {
    const correctUrl = import.meta.env.VITE_SUPABASE_URL || 'https://qxtgjxmuoxrwqboapbzd.supabase.co';
    const correctKey = import.meta.env.VITE_SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF4dGdqeG11b3hyd3Fib2FwYnpkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkyMTAyMjYsImV4cCI6MjA5NDc4NjIyNn0.qNHQA2qHFboQkPZTPARXAXOud4r868MYoW9TVimBxqM';

    if (!localStorage.getItem('fitanalytics_supabase_url'))
      localStorage.setItem('fitanalytics_supabase_url', correctUrl);
    if (!localStorage.getItem('fitanalytics_supabase_key'))
      localStorage.setItem('fitanalytics_supabase_key', correctKey);

    // Captura los valores del primer render (ya cargados por lazy initializers).
    // No vuelven a leer localStorage — esto elimina el doble-load de HIGH-06.
    const initWorkouts    = workouts;
    const initNutrition   = nutritionLogs;
    const initProfile     = profile;
    const initShoes       = shoes;
    const initPlans       = plans;
    const initReadiness   = readinessLogs;

    const runSync = (client, activeUser) => {
      syncWithSupabase(client, initWorkouts, activeUser).then(setWorkouts);
      syncNutritionWithSupabase(client, initNutrition, activeUser).then(setNutritionLogs);
      syncProfileWithSupabase(client, initProfile, activeUser).then(setProfile);
      syncShoesWithSupabase(client, initShoes, activeUser).then(setShoes);
      syncPlansWithSupabase(client, initPlans, activeUser).then(setPlans);
      syncReadinessWithSupabase(client, initReadiness, activeUser).then(setReadinessLogs);
    };

    const client = getSupabase();
    if (!client) return;

    setIsSupabaseConnected(true);

    client.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user || null);
      if (s) runSync(client, s.user);
    });

    const { data: { subscription } } = client.auth.onAuthStateChange((event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user || null);
      if (event === 'SIGNED_IN' && newSession) {
        runSync(client, newSession.user);
      } else if (event === 'SIGNED_OUT') {
        setWorkouts(readLocalJSON('fitanalytics_workouts', MOCK_WORKOUTS));
        setNutritionLogs(readLocalJSON('fitanalytics_nutrition', []));
        setShoes(readLocalJSON('fitanalytics_shoes', []));
        setPlans(readLocalJSON('fitanalytics_training_plans', []));
        setReadinessLogs(readLocalJSON('fitanalytics_readiness_logs', []));
        setProfile({
          age:       Number(localStorage.getItem('fitanalytics_profile_age') || localStorage.getItem('fitanalytics_age')) || 25,
          weight:    Number(localStorage.getItem('fitanalytics_profile_weight'))   || 75,
          height:    Number(localStorage.getItem('fitanalytics_profile_height'))   || 175,
          restingHR: Number(localStorage.getItem('fitanalytics_profile_resting_hr')) || 60,
          gender:    localStorage.getItem('fitanalytics_profile_gender') || 'male',
        });
      }
    });

    return () => { subscription?.unsubscribe(); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── AUTH HANDLERS ──
  const handleLogin = useCallback(async (email, password) => {
    const client = getSupabase();
    if (!client) return { success: false, message: 'Supabase no está inicializado.' };
    try {
      const { error } = await client.auth.signInWithPassword({ email, password });
      if (error) throw error;
      return { success: true };
    } catch (e) {
      console.error('Sign-in failed:', e);
      return { success: false, message: e.message || 'Correo o contraseña incorrectos.' };
    }
  }, []);

  const handleRegister = useCallback(async (email, password) => {
    const client = getSupabase();
    if (!client) return { success: false, message: 'Supabase no está inicializado.' };
    try {
      const { error } = await client.auth.signUp({ email, password });
      if (error) throw error;
      return { success: true };
    } catch (e) {
      console.error('Registration failed:', e);
      return { success: false, message: e.message || 'Error al registrar usuario.' };
    }
  }, []);

  const handleLogout = useCallback(async () => {
    const client = getSupabase();
    if (client) { try { await client.auth.signOut(); } catch (e) { console.error('Sign-out failed:', e); } }
    setSession(null);
    setUser(null);
  }, []);

  // ── HANDLERS DE CONEXIÓN ──
  const handleConnectSupabase = useCallback(async (url, key) => {
    try {
      const client = initSupabase(url, key);
      if (!client) return { success: false, message: 'La inicialización del cliente de Supabase falló.' };

      const { error } = await client.from('workouts').select('id').limit(1);
      if (error) {
        if (error.code === 'PGRST116' || error.message?.includes('relation "workouts" does not exist')) {
          return { success: false, message: "La conexión es válida, pero la tabla 'workouts' no existe. Ejecuta la consulta SQL provista para crearla." };
        }
      }

      localStorage.setItem('fitanalytics_supabase_url', url);
      localStorage.setItem('fitanalytics_supabase_key', key);
      setIsSupabaseConnected(true);

      const { data: { session: s } } = await client.auth.getSession();
      setSession(s);
      setUser(s?.user || null);

      if (s) {
        syncWithSupabase(client, workouts, s.user).then(setWorkouts);
        syncNutritionWithSupabase(client, nutritionLogs, s.user).then(setNutritionLogs);
        syncProfileWithSupabase(client, profile, s.user).then(setProfile);
        syncShoesWithSupabase(client, shoes, s.user).then(setShoes);
        syncPlansWithSupabase(client, plans, s.user).then(setPlans);
        syncReadinessWithSupabase(client, readinessLogs, s.user).then(setReadinessLogs);
      }
      return { success: true };
    } catch (e) {
      console.error('Failed to connect to Supabase database:', e);
      return { success: false, message: e.message || 'Error de red al establecer comunicación con Supabase.' };
    }
  }, [workouts, nutritionLogs, profile, shoes, plans, readinessLogs]);

  const handleDisconnectSupabase = useCallback(() => {
    localStorage.removeItem('fitanalytics_supabase_url');
    localStorage.removeItem('fitanalytics_supabase_key');
    setIsSupabaseConnected(false);
    setSession(null);
    setUser(null);
    clearSupabase();
  }, []);

  // ── HANDLERS CRUD ──
  const handleSaveWorkout = useCallback(async (newWorkout) => {
    setWorkouts(prev => {
      const updated = [newWorkout, ...prev];
      if (!user) {
        localStorage.setItem('fitanalytics_workouts', JSON.stringify(updated));
      }
      return updated;
    });
    const client = getSupabase();
    if (client && user) {
      try {
        const { error } = await client.from('workouts').insert(workoutToSupabasePayload(newWorkout, user.id));
        if (error) throw error;
      } catch (e) { console.error('Supabase insertion error:', e); }
    }
  }, [user]);

  const handleDeleteWorkout = useCallback(async (id) => {
    setWorkouts(prev => {
      const updated = prev.filter(w => w.id !== id);
      if (!user) {
        localStorage.setItem('fitanalytics_workouts', JSON.stringify(updated));
      }
      return updated;
    });
    const client = getSupabase();
    if (client && user) {
      try {
        const { error } = await client.from('workouts').delete().eq('id', id);
        if (error) throw error;
      } catch (e) { console.error('Supabase deletion error:', e); }
    }
  }, [user]);

  const handleUpdateWorkout = useCallback(async (updatedWorkout) => {
    setWorkouts(prev => {
      const updated = prev.map(w => w.id === updatedWorkout.id ? updatedWorkout : w);
      if (!user) {
        localStorage.setItem('fitanalytics_workouts', JSON.stringify(updated));
      }
      return updated;
    });
    const client = getSupabase();
    if (client && user) {
      try {
        const { error } = await client.from('workouts').upsert(workoutToSupabasePayload(updatedWorkout, user.id));
        if (error) throw error;
      } catch (e) { console.error('Supabase single update error:', e); }
    }
  }, [user]);

  const handleUpdateNutrition = useCallback(async (updatedLogs) => {
    setNutritionLogs(updatedLogs);
    if (!user) {
      localStorage.setItem('fitanalytics_nutrition', JSON.stringify(updatedLogs));
    }
    const client = getSupabase();
    if (client && user) {
      try {
        if (updatedLogs.length > 0) {
          const { error } = await client.from('nutrition').upsert(
            updatedLogs.map(log => {
              const meals = log.meals || [];
              return {
                id: log.id, user_id: user.id, date: log.date,
                calories: meals.reduce((s, m) => s + (Number(m.calories) || 0), 0),
                protein:  meals.reduce((s, m) => s + (Number(m.protein)  || 0), 0),
                carbs:    meals.reduce((s, m) => s + (Number(m.carbs)    || 0), 0),
                fat:      meals.reduce((s, m) => s + (Number(m.fat)      || 0), 0),
                meals,
              };
            })
          );
          if (error) throw error;
        } else {
          const { error } = await client.from('nutrition').delete().eq('user_id', user.id);
          if (error) throw error;
        }
      } catch (e) { console.error('Supabase nutrition update error:', e); }
    }
  }, [user]);

  const handleUpdateShoes = useCallback(async (updatedShoes) => {
    setShoes(updatedShoes);
    if (!user) {
      localStorage.setItem('fitanalytics_shoes', JSON.stringify(updatedShoes));
    }
    const client = getSupabase();
    if (client && user) {
      try {
        const updatedIds = new Set(updatedShoes.map(s => s.id));
        const deletedShoes = shoes.filter(s => !updatedIds.has(s.id));
        await Promise.all(deletedShoes.map(del => client.from('shoes').delete().eq('id', del.id)));
        if (updatedShoes.length > 0) {
          const { error } = await client.from('shoes').upsert(
            updatedShoes.map(s => ({ id: s.id, user_id: user.id, brand: s.brand, model: s.model,
              initial_km: Number(s.initialKm) || 0, max_km: Number(s.maxKm) || 800,
              buy_date: s.buyDate, is_active: s.isActive !== false }))
          );
          if (error) throw error;
        }
      } catch (e) { console.error('Supabase shoes update error:', e); }
    }
  }, [shoes, user]);

  const handleUpdatePlans = useCallback(async (updatedPlans) => {
    setPlans(updatedPlans);
    if (!user) {
      localStorage.setItem('fitanalytics_training_plans', JSON.stringify(updatedPlans));
    }
    const client = getSupabase();
    if (client && user) {
      try {
        const updatedDates = new Set(updatedPlans.map(p => p.date));
        const deletedPlans = plans.filter(p => !updatedDates.has(p.date));
        await Promise.all(deletedPlans.map(del => client.from('training_plans').delete().eq('date', del.date)));
        if (updatedPlans.length > 0) {
          const { error } = await client.from('training_plans').upsert(
            updatedPlans.map(p => ({ date: p.date, user_id: user.id,
              distance: Number(p.distance) || 0, session_type: p.sessionType || 'Regenerativo', note: p.note || '' }))
          );
          if (error) throw error;
        }
      } catch (e) { console.error('Supabase plans update error:', e); }
    }
  }, [plans, user]);

  const handleUpdateReadinessLogs = useCallback(async (updatedReadiness) => {
    setReadinessLogs(updatedReadiness);
    if (!user) {
      localStorage.setItem('fitanalytics_readiness_logs', JSON.stringify(updatedReadiness));
    }
    const client = getSupabase();
    if (client && user) {
      try {
        const updatedDates = new Set(updatedReadiness.map(l => l.date));
        const deletedLogs = readinessLogs.filter(l => !updatedDates.has(l.date));
        await Promise.all(deletedLogs.map(del => client.from('readiness_logs').delete().eq('date', del.date)));
        if (updatedReadiness.length > 0) {
          const { error } = await client.from('readiness_logs').upsert(
            updatedReadiness.map(l => ({ date: l.date, user_id: user.id,
              sleep: Number(l.sleep) || 4, soreness: Number(l.soreness) || 2,
              resting_hr: Number(l.restingHr) || 60, hrv: l.hrv ? Number(l.hrv) : null, notes: l.notes || '' }))
          );
          if (error) throw error;
        }
      } catch (e) { console.error('Supabase readiness logs update error:', e); }
    }
  }, [readinessLogs, user]);

  const handleProfileChange = useCallback(async (newProfile) => {
    setProfile(newProfile);
    if (!user) {
      localStorage.setItem('fitanalytics_profile_age',        newProfile.age.toString());
      localStorage.setItem('fitanalytics_age',                newProfile.age.toString());
      localStorage.setItem('fitanalytics_profile_weight',     newProfile.weight.toString());
      localStorage.setItem('fitanalytics_profile_height',     newProfile.height.toString());
      localStorage.setItem('fitanalytics_profile_resting_hr', newProfile.restingHR.toString());
      localStorage.setItem('fitanalytics_profile_gender',     newProfile.gender);
      if (newProfile.displayName) localStorage.setItem('fitanalytics_profile_display_name', newProfile.displayName);
      if (newProfile.username) localStorage.setItem('fitanalytics_profile_username', newProfile.username);
    }
    const client = getSupabase();
    if (client && user) {
      try {
        const { error } = await client.from('profiles').upsert({
          user_id: user.id,
          age: Number(newProfile.age),
          weight: Number(newProfile.weight),
          height: Number(newProfile.height),
          restingHR: Number(newProfile.restingHR),
          gender: newProfile.gender,
          display_name: newProfile.displayName,
          username: newProfile.username,
          email: newProfile.email || user.email || '',
          updated_at: new Date().toISOString(),
        });
        if (error) throw error;
      } catch (e) { console.error('Supabase profile upsert error:', e); }
    }
  }, [user]);

  const handleUpdateAllWorkouts = useCallback(async (allWorkouts) => {
    setWorkouts(allWorkouts);
    if (!user) {
      localStorage.setItem('fitanalytics_workouts', JSON.stringify(allWorkouts));
    }
    const client = getSupabase();
    if (client && user) {
      try {
        const { error: delError } = await client.from('workouts').delete().eq('user_id', user.id);
        if (delError) throw delError;
        if (allWorkouts.length > 0) {
          const { error: insError } = await client.from('workouts')
            .insert(allWorkouts.map(w => workoutToSupabasePayload(w, user.id)));
          if (insError) throw insError;
        }
      } catch (e) { console.error('Supabase bulk update error:', e); }
    }
  }, [user]);

  const handleResetMockData = useCallback(async () => {
    const confirmed = await showConfirm(
      'Restablecer Datos de Demostración',
      '¿Estás seguro de que deseas restablecer los datos de demostración? Esto borrará tus entrenamientos actuales permanentemente.'
    );
    if (confirmed) {
      if (!user) {
        localStorage.setItem('fitanalytics_workouts', JSON.stringify(MOCK_WORKOUTS));
      }
      setWorkouts(MOCK_WORKOUTS);
      const client = getSupabase();
      if (client && user) {
        try {
          const { error: delError } = await client.from('workouts').delete().eq('user_id', user.id);
          if (delError) throw delError;
          const { error: insError } = await client.from('workouts')
            .insert(MOCK_WORKOUTS.map(w => workoutToSupabasePayload(w, user.id)));
          if (insError) throw insError;
          await showAlert('¡Éxito!', '¡Datos de demostración cargados localmente y sincronizados en Supabase!');
        } catch (e) {
          console.error('Supabase mock re-seed failed:', e);
          await showAlert('Error de Sincronización', 'Datos cargados localmente, pero falló la sincronización remota: ' + e.message);
        }
      } else {
        await showAlert('¡Éxito!', '¡Datos de demostración cargados exitosamente!');
      }
    }
  }, [user, showConfirm, showAlert]);

  // ── FUNCIONES DE COMUNIDAD Y AMISTADES (BÚSQUEDA Y SEGUIMIENTO) ──
  const searchUsers = useCallback(async (queryStr) => {
    if (!queryStr || queryStr.trim().length < 2) return [];
    const term = queryStr.trim().toLowerCase();

    if (!user) {
      const staticMockAthletes = [
        { user_id: 'mock-user-carlos', display_name: 'Carlos Silva', username: 'carlos_maraton', email: 'carlos@fitanalytics.com' },
        { user_id: 'mock-user-ana', display_name: 'Ana Martínez', username: 'ana_ultra', email: 'ana@fitanalytics.com' },
        { user_id: 'mock-user-pedro', display_name: 'Pedro Rossi', username: 'pedro_triatleta', email: 'pedro@fitanalytics.com' }
      ];
      return staticMockAthletes.filter(athlete => 
        athlete.display_name.toLowerCase().includes(term) ||
        athlete.username.toLowerCase().includes(term) ||
        athlete.email.toLowerCase().includes(term)
      );
    }

    const client = getSupabase();
    if (!client) return [];
    try {
      const { data, error } = await client
        .from('profiles')
        .select('user_id, display_name, username, email')
        .neq('user_id', user.id)
        .or(`display_name.ilike.%${term}%,username.ilike.%${term}%,email.ilike.%${term}%`)
        .limit(10);
      if (error) throw error;
      return data || [];
    } catch (e) {
      console.error('Error searching users:', e);
      return [];
    }
  }, [user]);

  const sendFriendRequest = useCallback(async (friendId) => {
    if (!user) {
      const stored = localStorage.getItem('fitanalytics_mock_friends');
      let currentFriends = [];
      if (stored) {
        try { currentFriends = JSON.parse(stored); } catch { }
      }
      if (currentFriends.some(f => f.friendId === friendId)) return { success: true };

      const staticMockAthletes = [
        { userId: 'mock-user-carlos', display_name: 'Carlos Silva', username: 'carlos_maraton', email: 'carlos@fitanalytics.com' },
        { userId: 'mock-user-ana', display_name: 'Ana Martínez', username: 'ana_ultra', email: 'ana@fitanalytics.com' },
        { userId: 'mock-user-pedro', display_name: 'Pedro Rossi', username: 'pedro_triatleta', email: 'pedro@fitanalytics.com' }
      ];
      const match = staticMockAthletes.find(a => a.userId === friendId);
      if (match) {
        currentFriends.push({
          friendId: match.userId,
          status: 'pending',
          isSender: true,
          profile: { userId: match.userId, displayName: match.display_name, username: match.username, email: match.email }
        });
        localStorage.setItem('fitanalytics_mock_friends', JSON.stringify(currentFriends));
      }
      return { success: true };
    }

    const client = getSupabase();
    if (!client) return { success: false, message: 'Supabase no conectado' };
    try {
      const { error } = await client.from('friendships').insert({
        user_id: user.id,
        friend_id: friendId,
        status: 'pending'
      });
      if (error) throw error;
      return { success: true };
    } catch (e) {
      console.error('Error sending friend request:', e);
      return { success: false, message: e.message };
    }
  }, [user]);

  const acceptFriendRequest = useCallback(async (senderId) => {
    if (!user) {
      const stored = localStorage.getItem('fitanalytics_mock_friends');
      if (stored) {
        try {
          let currentFriends = JSON.parse(stored);
          const idx = currentFriends.findIndex(f => f.friendId === senderId);
          if (idx !== -1) {
            currentFriends[idx].status = 'accepted';
            localStorage.setItem('fitanalytics_mock_friends', JSON.stringify(currentFriends));
          }
        } catch { }
      }
      return { success: true };
    }

    const client = getSupabase();
    if (!client) return { success: false, message: 'Supabase no conectado' };
    try {
      const { error } = await client
        .from('friendships')
        .update({ status: 'accepted' })
        .eq('user_id', senderId)
        .eq('friend_id', user.id);
      if (error) throw error;
      return { success: true };
    } catch (e) {
      console.error('Error accepting friend request:', e);
      return { success: false, message: e.message };
    }
  }, [user]);

  const removeFriend = useCallback(async (friendId) => {
    if (!user) {
      const stored = localStorage.getItem('fitanalytics_mock_friends');
      if (stored) {
        try {
          let currentFriends = JSON.parse(stored);
          const updated = currentFriends.filter(f => f.friendId !== friendId);
          localStorage.setItem('fitanalytics_mock_friends', JSON.stringify(updated));
        } catch { }
      }
      return { success: true };
    }

    const client = getSupabase();
    if (!client) return { success: false, message: 'Supabase no conectado' };
    try {
      const { error } = await client
        .from('friendships')
        .delete()
        .or(`and(user_id.eq.${user.id},friend_id.eq.${friendId}),and(user_id.eq.${friendId},friend_id.eq.${user.id})`);
      if (error) throw error;
      return { success: true };
    } catch (e) {
      console.error('Error removing friend:', e);
      return { success: false, message: e.message };
    }
  }, [user]);

  const fetchFriendsList = useCallback(async () => {
    if (!user) {
      const stored = localStorage.getItem('fitanalytics_mock_friends');
      if (stored) {
        try { return JSON.parse(stored); } catch { }
      }
      const defaultMocks = [
        {
          friendId: 'mock-friend-juan',
          status: 'accepted',
          isSender: true,
          profile: { userId: 'mock-friend-juan', displayName: 'Juan Pérez', username: 'juan_vdot52', email: 'juan@fitanalytics.com' }
        },
        {
          friendId: 'mock-friend-sofia',
          status: 'accepted',
          isSender: false,
          profile: { userId: 'mock-friend-sofia', displayName: 'Sofía Gómez', username: 'sofia_runner', email: 'sofia@fitanalytics.com' }
        }
      ];
      localStorage.setItem('fitanalytics_mock_friends', JSON.stringify(defaultMocks));
      return defaultMocks;
    }

    const client = getSupabase();
    if (!client) return [];
    try {
      const { data: sent, error: errSent } = await client
        .from('friendships')
        .select('friend_id, status')
        .eq('user_id', user.id);
      
      const { data: received, error: errRecv } = await client
        .from('friendships')
        .select('user_id, status')
        .eq('friend_id', user.id);

      if (errSent) throw errSent;
      if (errRecv) throw errRecv;

      const friendIds = [
        ...(sent || []).map(f => f.friend_id),
        ...(received || []).map(f => f.user_id)
      ];

      const profilesMap = {};
      if (friendIds.length > 0) {
        const { data: profiles, error: errProf } = await client
          .from('profiles')
          .select('user_id, display_name, username, email')
          .in('user_id', friendIds);
        
        if (errProf) throw errProf;
        
        (profiles || []).forEach(p => {
          profilesMap[p.user_id] = p;
        });
      }

      const list = [];
      sent?.forEach(f => {
        const prof = profilesMap[f.friend_id];
        if (prof) {
          list.push({
            friendId: f.friend_id,
            status: f.status,
            isSender: true,
            profile: {
              userId: prof.user_id,
              displayName: prof.display_name || prof.email?.split('@')[0] || 'Atleta',
              username: prof.username || 'atleta',
              email: prof.email || ''
            }
          });
        }
      });

      received?.forEach(f => {
        const prof = profilesMap[f.user_id];
        if (prof) {
          list.push({
            friendId: f.user_id,
            status: f.status,
            isSender: false,
            profile: {
              userId: prof.user_id,
              displayName: prof.display_name || prof.email?.split('@')[0] || 'Atleta',
              username: prof.username || 'atleta',
              email: prof.email || ''
            }
          });
        }
      });
      return list;
    } catch (e) {
      console.error('Error fetching friends:', e);
      return [];
    }
  }, [user]);

  const fetchFriendData = useCallback(async (friendId) => {
    if (!user) {
      return {
        workouts: generateFriendWorkouts(friendId),
        readinessLogs: generateFriendReadiness(friendId),
        profile: generateFriendProfile(friendId)
      };
    }

    const client = getSupabase();
    if (!client) return null;
    try {
      const [workoutsRes, readinessRes, profileRes] = await Promise.all([
        client.from('workouts').select('*').eq('user_id', friendId),
        client.from('readiness_logs').select('*').eq('user_id', friendId),
        client.from('profiles').select('*').eq('user_id', friendId).maybeSingle()
      ]);

      if (workoutsRes.error) throw workoutsRes.error;
      if (readinessRes.error) throw readinessRes.error;
      if (profileRes.error) throw profileRes.error;

      const friendWorkouts = (workoutsRes.data || []).map(supabaseRowToWorkout);
      friendWorkouts.sort((a, b) => new Date(b.date) - new Date(a.date));

      const friendReadiness = (readinessRes.data || []).map(remote => ({
        date: remote.date,
        sleep: Number(remote.sleep) || 4,
        soreness: Number(remote.soreness) || 2,
        resting_hr: Number(remote.resting_hr) || 60,
        hrv: remote.hrv ? Number(remote.hrv) : null,
        notes: remote.notes || ''
      }));

      const friendProfile = profileRes.data ? {
        age: Number(profileRes.data.age) || 25,
        weight: Number(profileRes.data.weight) || 75,
        height: Number(profileRes.data.height) || 175,
        restingHR: Number(profileRes.data.restingHR) || 60,
        gender: profileRes.data.gender || 'male',
        displayName: profileRes.data.display_name || '',
        username: profileRes.data.username || '',
        email: profileRes.data.email || ''
      } : null;

      return {
        workouts: friendWorkouts,
        readinessLogs: friendReadiness,
        profile: friendProfile
      };
    } catch (e) {
      console.error('Error fetching friend data details:', e);
      return null;
    }
  }, [user]);

  // ── SISTEMA DE INTERACCIÓN SOCIAL (MINI-STRAVA) ──

  const initMockSocialData = useCallback(() => {
    if (!localStorage.getItem('fitanalytics_mock_kudos')) {
      const initialKudos = {
        'w-j-2': ['sofia_runner'],
        'w-s-2': ['juan_vdot52']
      };
      localStorage.setItem('fitanalytics_mock_kudos', JSON.stringify(initialKudos));
    }
    if (!localStorage.getItem('fitanalytics_mock_comments')) {
      const initialComments = {
        'w-j-2': [
          {
            id: 'c-mock-1',
            displayName: 'Sofía Gómez',
            username: 'sofia_runner',
            text: '¡Esas series de 1000m volaron! Tremendo ritmo promedio 🏃‍♀️🔥',
            createdAt: new Date(Date.now() - 3600000 * 2).toISOString()
          }
        ],
        'w-s-2': [
          {
            id: 'c-mock-2',
            displayName: 'Juan Pérez',
            username: 'juan_vdot52',
            text: 'Excelente tempo run, Sofi. ¡Sostuviste muy bien ese pulso! 💪',
            createdAt: new Date(Date.now() - 3600000 * 4).toISOString()
          }
        ]
      };
      localStorage.setItem('fitanalytics_mock_comments', JSON.stringify(initialComments));
    }
  }, []);

  const fetchSocialFeed = useCallback(async () => {
    if (!user) {
      initMockSocialData();
      // Entrenamientos del usuario
      const userWorkouts = workouts.map(w => ({
        ...w,
        userId: 'currentUser',
        profile: {
          displayName: profile.displayName || 'Tú',
          username: profile.username || 'tú'
        }
      }));

      // Entrenamientos de amigos simulados
      const mockFriends = [
        { friendId: 'mock-friend-juan', profile: generateFriendProfile('mock-friend-juan') },
        { friendId: 'mock-friend-sofia', profile: generateFriendProfile('mock-friend-sofia') }
      ];

      const friendsWorkouts = [];
      mockFriends.forEach(friend => {
        const workoutsList = generateFriendWorkouts(friend.friendId);
        workoutsList.forEach(w => {
          friendsWorkouts.push({
            ...w,
            userId: friend.friendId,
            profile: friend.profile
          });
        });
      });

      const allWorkouts = [...userWorkouts, ...friendsWorkouts];
      allWorkouts.sort((a, b) => new Date(b.date) - new Date(a.date));

      const storedKudos = readLocalJSON('fitanalytics_mock_kudos', {});
      const storedComments = readLocalJSON('fitanalytics_mock_comments', {});

      return allWorkouts.map(w => {
        const kNames = storedKudos[w.id] || [];
        const kudosList = kNames.map(name => ({
          userId: name === (profile.username || 'invitado') ? 'currentUser' : 'friendUser',
          username: name,
          displayName: name === 'sofia_runner' ? 'Sofía Gómez' : name === 'juan_vdot52' ? 'Juan Pérez' : 'Atleta'
        }));

        return {
          ...w,
          kudos: kudosList,
          comments: storedComments[w.id] || []
        };
      });
    }

    const client = getSupabase();
    if (!client) return [];
    try {
      const friends = await fetchFriendsList();
      const acceptedFriends = friends.filter(f => f.status === 'accepted');
      const friendIds = acceptedFriends.map(f => f.friendId);
      const allUserIds = [user.id, ...friendIds];

      const { data: profiles, error: errProf } = await client
        .from('profiles')
        .select('user_id, display_name, username, email')
        .in('user_id', allUserIds);

      if (errProf) throw errProf;

      const profilesMap = {};
      (profiles || []).forEach(p => {
        profilesMap[p.user_id] = {
          displayName: p.display_name || p.email?.split('@')[0] || 'Atleta',
          username: p.username || 'atleta',
          email: p.email || ''
        };
      });

      const { data: rawWorkouts, error: errWorkouts } = await client
        .from('workouts')
        .select('*')
        .in('user_id', allUserIds);

      if (errWorkouts) throw errWorkouts;

      const workoutsList = (rawWorkouts || []).map(remote => ({
        ...supabaseRowToWorkout(remote),
        userId: remote.user_id
      }));
      workoutsList.sort((a, b) => new Date(b.date) - new Date(a.date));

      const workoutIds = workoutsList.map(w => w.id);
      if (workoutIds.length === 0) return [];

      const [kudosRes, commentsRes] = await Promise.all([
        client.from('workout_kudos').select('*').in('workout_id', workoutIds),
        client.from('workout_comments').select('*').in('workout_id', workoutIds)
      ]);

      if (kudosRes.error) throw kudosRes.error;
      if (commentsRes.error) throw commentsRes.error;

      const kudosMap = {};
      (kudosRes.data || []).forEach(k => {
        if (!kudosMap[k.workout_id]) kudosMap[k.workout_id] = [];
        const kProf = profilesMap[k.kudo_user_id];
        kudosMap[k.workout_id].push({
          userId: k.kudo_user_id,
          username: kProf?.username || 'atleta',
          displayName: kProf?.displayName || 'Atleta'
        });
      });

      const commentsMap = {};
      (commentsRes.data || []).forEach(c => {
        if (!commentsMap[c.workout_id]) commentsMap[c.workout_id] = [];
        const cProf = profilesMap[c.comment_user_id];
        commentsMap[c.workout_id].push({
          id: c.id,
          userId: c.comment_user_id,
          displayName: cProf?.displayName || 'Atleta',
          username: cProf?.username || 'atleta',
          text: c.text,
          createdAt: c.created_at
        });
      });

      return workoutsList.map(w => ({
        ...w,
        profile: profilesMap[w.userId] || { displayName: 'Atleta', username: 'atleta' },
        kudos: kudosMap[w.id] || [],
        comments: commentsMap[w.id] || []
      }));
    } catch (e) {
      console.error('Error fetching social feed:', e);
      return [];
    }
  }, [user, workouts, profile, fetchFriendsList, initMockSocialData]);

  const toggleKudo = useCallback(async (workoutId, workoutOwnerId) => {
    if (!user) {
      initMockSocialData();
      const stored = readLocalJSON('fitanalytics_mock_kudos', {});
      const myUsername = profile.username || 'invitado';
      const currentList = stored[workoutId] || [];
      let updatedList = [];
      let isKudoed = false;

      if (currentList.includes(myUsername)) {
        updatedList = currentList.filter(u => u !== myUsername);
        isKudoed = false;
      } else {
        updatedList = [...currentList, myUsername];
        isKudoed = true;
      }

      stored[workoutId] = updatedList;
      localStorage.setItem('fitanalytics_mock_kudos', JSON.stringify(stored));
      return { success: true, isKudoed };
    }

    const client = getSupabase();
    if (!client) return { success: false, message: 'Supabase no conectado' };
    try {
      const { data, error } = await client
        .from('workout_kudos')
        .select('*')
        .eq('workout_id', workoutId)
        .eq('kudo_user_id', user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        const { error: delErr } = await client
          .from('workout_kudos')
          .delete()
          .eq('workout_id', workoutId)
          .eq('kudo_user_id', user.id);

        if (delErr) throw delErr;
        return { success: true, isKudoed: false };
      } else {
        const { error: insErr } = await client
          .from('workout_kudos')
          .insert({
            workout_id: workoutId,
            workout_user_id: workoutOwnerId,
            kudo_user_id: user.id
          });

        if (insErr) throw insErr;
        return { success: true, isKudoed: true };
      }
    } catch (e) {
      console.error('Error toggling kudo:', e);
      return { success: false, message: e.message };
    }
  }, [user, profile, initMockSocialData]);

  const addComment = useCallback(async (workoutId, workoutOwnerId, commentText) => {
    if (!commentText || !commentText.trim()) return { success: false, message: 'El comentario no puede estar vacío' };

    if (!user) {
      initMockSocialData();
      const stored = readLocalJSON('fitanalytics_mock_comments', {});
      const currentList = stored[workoutId] || [];
      const newComment = {
        id: `c-mock-${Date.now()}`,
        displayName: profile.displayName || 'Invitado',
        username: profile.username || 'invitado',
        text: commentText.trim(),
        createdAt: new Date().toISOString()
      };
      
      stored[workoutId] = [...currentList, newComment];
      localStorage.setItem('fitanalytics_mock_comments', JSON.stringify(stored));
      return { success: true, comment: newComment };
    }

    const client = getSupabase();
    if (!client) return { success: false, message: 'Supabase no conectado' };
    try {
      const { data, error } = await client
        .from('workout_comments')
        .insert({
          workout_id: workoutId,
          workout_user_id: workoutOwnerId,
          comment_user_id: user.id,
          text: commentText.trim()
        })
        .select('*')
        .single();

      if (error) throw error;

      return {
        success: true,
        comment: {
          id: data.id,
          userId: data.comment_user_id,
          displayName: profile.displayName || 'Tú',
          username: profile.username || 'tú',
          text: data.text,
          createdAt: data.created_at
        }
      };
    } catch (e) {
      console.error('Error adding comment:', e);
      return { success: false, message: e.message };
    }
  }, [user, profile, initMockSocialData]);


  // ── SISTEMA DE INTEGRACIÓN AUTOMÁTICA CON LA API DE STRAVA ──

  const saveStravaCredentials = useCallback(async (clientId, clientSecret) => {
    if (!clientId || !clientSecret) {
      return { success: false, message: 'Por favor, ingresa el Client ID y el Client Secret.' };
    }

    if (!user) {
      const mockCreds = {
        connected: false,
        clientId: clientId.trim(),
        clientSecret: clientSecret.trim()
      };
      localStorage.setItem('fitanalytics_mock_strava_creds', JSON.stringify(mockCreds));
      return { success: true };
    }

    const client = getSupabase();
    if (!client) return { success: false, message: 'Supabase no conectado' };

    try {
      const { error } = await client
        .from('strava_credentials')
        .upsert({
          user_id: user.id,
          client_id: clientId.trim(),
          client_secret: clientSecret.trim()
        });

      if (error) throw error;
      return { success: true };
    } catch (e) {
      console.error('Error saving Strava credentials:', e);
      return { success: false, message: e.message };
    }
  }, [user]);

  const getStravaConnection = useCallback(async () => {
    if (!user) {
      const stored = localStorage.getItem('fitanalytics_mock_strava_creds');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          return {
            connected: Boolean(parsed.connected),
            athleteName: parsed.athleteName || '',
            athleteUsername: parsed.athleteUsername || '',
            clientId: parsed.clientId || '',
            clientSecret: parsed.clientSecret || ''
          };
        } catch { }
      }
      return {
        connected: false,
        athleteName: '',
        athleteUsername: '',
        clientId: '249955',
        clientSecret: 'd56aed15d5032a78779a255e1698691aca0c0c89'
      };
    }

    const client = getSupabase();
    if (!client) return { connected: false };

    try {
      const { data, error } = await client
        .from('strava_credentials')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      if (!data) return { connected: false };

      return {
        connected: Boolean(data.access_token),
        athleteName: data.athlete_name || '',
        athleteUsername: data.athlete_username || '',
        clientId: data.client_id || '',
        clientSecret: data.client_secret || ''
      };
    } catch (e) {
      console.error('Error reading Strava connection:', e);
      return { connected: false };
    }
  }, [user]);

  const disconnectStrava = useCallback(async () => {
    if (!user) {
      localStorage.removeItem('fitanalytics_mock_strava_creds');
      return { success: true };
    }

    const client = getSupabase();
    if (!client) return { success: false, message: 'Supabase no conectado' };

    try {
      const { error } = await client
        .from('strava_credentials')
        .delete()
        .eq('user_id', user.id);

      if (error) throw error;
      return { success: true };
    } catch (e) {
      console.error('Error disconnecting Strava:', e);
      return { success: false, message: e.message };
    }
  }, [user]);

  const exchangeStravaCode = useCallback(async (authCode) => {
    if (!user) {
      const mockCreds = {
        connected: true,
        athleteName: 'Usuario Demostración',
        athleteUsername: 'atleta_demo',
        clientId: '249955',
        clientSecret: 'd56aed15d5032a78779a255e1698691aca0c0c89',
        expiresAt: Math.floor(Date.now() / 1000) + 21600
      };
      localStorage.setItem('fitanalytics_mock_strava_creds', JSON.stringify(mockCreds));
      return { success: true, athleteName: mockCreds.athleteName, athleteUsername: mockCreds.athleteUsername };
    }

    const client = getSupabase();
    if (!client) return { success: false, message: 'Supabase no conectado' };

    try {
      const { data: creds, error: errCreds } = await client
        .from('strava_credentials')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (errCreds) throw errCreds;
      if (!creds) {
        return { success: false, message: 'Faltan credenciales de Client ID y Secret en la base de datos.' };
      }

      const exchangeResponse = await fetch('https://www.strava.com/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: creds.client_id,
          client_secret: creds.client_secret,
          code: authCode,
          grant_type: 'authorization_code'
        })
      });

      if (!exchangeResponse.ok) {
        throw new Error('Error al intercambiar el código de autorización con Strava. Verifica tu Client ID y Secret.');
      }

      const tokenData = await exchangeResponse.json();
      
      const athleteName = `${tokenData.athlete?.firstname || ''} ${tokenData.athlete?.lastname || ''}`.trim() || 'Atleta Strava';
      const athleteUsername = tokenData.athlete?.username || tokenData.athlete?.id?.toString() || 'atleta';

      const { error: updErr } = await client
        .from('strava_credentials')
        .update({
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token,
          expires_at: tokenData.expires_at,
          athlete_name: athleteName,
          athlete_username: athleteUsername
        })
        .eq('user_id', user.id);

      if (updErr) throw updErr;

      return { success: true, athleteName, athleteUsername };
    } catch (e) {
      console.error('Error exchanging Strava authorization code:', e);
      return { success: false, message: e.message };
    }
  }, [user]);

  const syncRecentStravaActivities = useCallback(async () => {
    if (!user) {
      const mockSync = [
        {
          id: `strava-mock-1-${Date.now()}`,
          type: 'running',
          date: new Date(Date.now() - 86400000).toISOString().split('T')[0],
          distance: 10.2,
          duration: '00:48:15',
          heartRate: 152,
          rpe: 7,
          terrain: 'Asfalto',
          notes: '🏃 Trote tempo en parque con ritmo progresivo. ¡Sincronizado de Strava con sensaciones espectaculares!',
          splits: [
            { splitNumber: 1, distance: 1000, time: "05:02" },
            { splitNumber: 2, distance: 1000, time: "04:55" },
            { splitNumber: 3, distance: 1000, time: "04:48" },
            { splitNumber: 4, distance: 1000, time: "04:45" },
            { splitNumber: 5, distance: 1000, time: "04:42" },
            { splitNumber: 6, distance: 1000, time: "04:38" },
            { splitNumber: 7, distance: 1000, time: "04:35" },
            { splitNumber: 8, distance: 1000, time: "04:32" },
            { splitNumber: 9, distance: 1000, time: "04:30" },
            { splitNumber: 10, distance: 1000, time: "04:45" },
            { splitNumber: 11, distance: 200, time: "00:53" }
          ]
        },
        {
          id: `strava-mock-2-${Date.now()}`,
          type: 'running',
          date: new Date(Date.now() - 86400000 * 3).toISOString().split('T')[0],
          distance: 5.0,
          duration: '00:22:10',
          heartRate: 165,
          rpe: 8,
          terrain: 'Pista',
          notes: '⚡ Series de velocidad 5x800m en pista de atletismo. ¡Sincronizado de Strava cumpliendo los ritmos!',
          splits: [
            { splitNumber: 1, distance: 1000, time: "04:35" },
            { splitNumber: 2, distance: 1000, time: "04:28" },
            { splitNumber: 3, distance: 1000, time: "04:22" },
            { splitNumber: 4, distance: 1000, time: "04:18" },
            { splitNumber: 5, distance: 1000, time: "04:27" }
          ]
        },
        {
          id: `strava-mock-3-${Date.now()}`,
          type: 'running',
          date: new Date(Date.now() - 86400000 * 5).toISOString().split('T')[0],
          distance: 15.5,
          duration: '01:14:30',
          heartRate: 142,
          rpe: 6,
          terrain: 'Tierra',
          notes: '⛰️ Fondo largo aeróbico de fin de semana en sendero mixto. ¡Sincronizado de Strava con buena base mitocondrial!',
          splits: [
            { splitNumber: 1, distance: 1000, time: "05:10" },
            { splitNumber: 2, distance: 1000, time: "05:05" },
            { splitNumber: 3, distance: 1000, time: "05:00" },
            { splitNumber: 4, distance: 1000, time: "04:55" },
            { splitNumber: 5, distance: 1000, time: "04:52" },
            { splitNumber: 6, distance: 1000, time: "04:48" },
            { splitNumber: 7, distance: 1000, time: "04:45" },
            { splitNumber: 8, distance: 1000, time: "04:42" },
            { splitNumber: 9, distance: 1000, time: "04:40" },
            { splitNumber: 10, distance: 1000, time: "04:38" },
            { splitNumber: 11, distance: 1000, time: "04:35" },
            { splitNumber: 12, distance: 1000, time: "04:32" },
            { splitNumber: 13, distance: 1000, time: "04:35" },
            { splitNumber: 14, distance: 1000, time: "04:40" },
            { splitNumber: 15, distance: 1000, time: "04:50" },
            { splitNumber: 16, distance: 500, time: "02:23" }
          ]
        }
      ];

      const newWorkoutsList = [];
      
      mockSync.forEach(newW => {
        const isDup = workouts.some(oldW => 
          oldW.type === 'running' && 
          oldW.date === newW.date && 
          Math.abs(oldW.distance - newW.distance) <= 1.0
        );
        if (!isDup) {
          newWorkoutsList.push(newW);
        }
      });

      if (newWorkoutsList.length === 0) {
        return { success: true, addedCount: 0, message: 'No se encontraron nuevas actividades para importar.' };
      }

      const confirmed = await showConfirm(
        'Sincronizar con Strava',
        `Se encontraron ${newWorkoutsList.length} nuevas carreras listas para sincronizar en modo demostración. ¿Deseas importarlas ahora?`
      );

      if (!confirmed) {
        return { success: true, addedCount: 0, message: 'Sincronización cancelada por el usuario.' };
      }

      const updatedWorkouts = [...workouts, ...newWorkoutsList];
      updatedWorkouts.sort((a, b) => new Date(b.date) - new Date(a.date));
      setWorkouts(updatedWorkouts);
      localStorage.setItem('fitanalytics_workouts', JSON.stringify(updatedWorkouts));
      return { success: true, addedCount: newWorkoutsList.length, message: `¡Sincronización exitosa! Se importaron ${newWorkoutsList.length} nuevas actividades de running.` };
    }

    const client = getSupabase();
    if (!client) return { success: false, message: 'Supabase no conectado' };

    try {
      const { data: creds, error: errCreds } = await client
        .from('strava_credentials')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (errCreds) throw errCreds;
      if (!creds || !creds.refresh_token) {
        return { success: false, message: 'Primero debes conectar tu cuenta de Strava' };
      }

      let accessToken = creds.access_token;
      let expiresAt = Number(creds.expires_at) || 0;
      const nowSeconds = Math.floor(Date.now() / 1000);

      if (expiresAt === 0 || expiresAt < nowSeconds + 300) {
        const refreshResponse = await fetch('https://www.strava.com/oauth/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            client_id: creds.client_id,
            client_secret: creds.client_secret,
            refresh_token: creds.refresh_token,
            grant_type: 'refresh_token'
          })
        });

        if (!refreshResponse.ok) {
          throw new Error('No se pudo renovar el token de acceso con Strava.');
        }

        const refreshData = await refreshResponse.json();
        accessToken = refreshData.access_token;
        expiresAt = refreshData.expires_at;

        const { error: updErr } = await client
          .from('strava_credentials')
          .update({
            access_token: accessToken,
            refresh_token: refreshData.refresh_token || creds.refresh_token,
            expires_at: expiresAt
          })
          .eq('user_id', user.id);

        if (updErr) throw updErr;
      }

      const activitiesResponse = await fetch(`https://www.strava.com/api/v3/athlete/activities?per_page=10`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });

      if (!activitiesResponse.ok) {
        throw new Error('Error al consultar actividades de Strava.');
      }

      const activities = await activitiesResponse.json();
      const runs = activities.filter(a => a.type === 'Run');

      let addedCount = 0;
      const newWorkoutsList = [];

      for (const run of runs) {
        const dateStr = run.start_date.split('T')[0];
        const distKm = Math.round((run.distance / 1000) * 100) / 100;
        
        const hours = Math.floor(run.moving_time / 3600);
        const minutes = Math.floor((run.moving_time % 3600) / 60);
        const seconds = Math.round(run.moving_time % 60);
        const durationStr = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

        const isDup = workouts.some(oldW => 
          oldW.type === 'running' && 
          oldW.date === dateStr && 
          Math.abs(oldW.distance - distKm) <= 1.0
        );

        if (!isDup) {
          let runSplits = null;
          let maxCadenceVal = null;
          try {
            const detailResponse = await fetch(`https://www.strava.com/api/v3/activities/${run.id}`, {
              headers: { 'Authorization': `Bearer ${accessToken}` }
            });
            if (detailResponse.ok) {
              const detailData = await detailResponse.json();
              if (detailData.splits_metric && detailData.splits_metric.length > 0) {
                runSplits = detailData.splits_metric.map((s, sIdx) => {
                  const splitSecs = s.moving_time || s.elapsed_time || 0;
                  const splitHours = Math.floor(splitSecs / 3600);
                  const splitMins = Math.floor((splitSecs % 3600) / 60);
                  const splitS = Math.round(splitSecs % 60);
                  
                  let timeStr = "";
                  if (splitHours > 0) {
                    timeStr = `${String(splitHours).padStart(2, '0')}:${String(splitMins).padStart(2, '0')}:${String(splitS).padStart(2, '0')}`;
                  } else {
                    timeStr = `${String(splitMins).padStart(2, '0')}:${String(splitS).padStart(2, '0')}`;
                  }

                  return {
                    splitNumber: s.split || (sIdx + 1),
                    distance: Math.round(s.distance) || 1000,
                    time: timeStr
                  };
                });
              }

              if (detailData.max_cadence) {
                const rawMaxCad = detailData.max_cadence;
                maxCadenceVal = rawMaxCad < 110 ? Math.round(rawMaxCad * 2) : Math.round(rawMaxCad);
              }
            }
          } catch (detailError) {
            console.error(`Error fetching detailed activity ${run.id} from Strava:`, detailError);
          }

          const newWorkout = {
            id: `strava-${run.id}`,
            type: 'running',
            date: dateStr,
            distance: distKm,
            duration: durationStr,
            heartRate: run.has_heartrate ? Math.round(run.average_heartrate) : null,
            rpe: run.suffer_score ? Math.min(10, Math.max(1, Math.round(run.suffer_score / 12))) : 6,
            terrain: 'Asfalto',
            notes: `${run.name}${run.description ? ' - ' + run.description : ''} (Sincronizado vía Strava Hub)`,
            // Advanced metrics from Strava
            maxSpeed: run.max_speed ? `${(run.max_speed * 3.6).toFixed(1)} km/h` : null,
            avgCadence: run.average_cadence ? (run.average_cadence < 110 ? Math.round(run.average_cadence * 2) : Math.round(run.average_cadence)) : null,
            maxCadence: maxCadenceVal,
            elevationGain: run.total_elevation_gain ? Math.round(run.total_elevation_gain) : null,
            splits: runSplits
          };
          newWorkoutsList.push(newWorkout);
          addedCount++;
        }
      }

      if (addedCount > 0) {
        const confirmed = await showConfirm(
          'Sincronizar con Strava',
          `Se encontraron ${addedCount} nuevas carreras en tu cuenta de Strava. ¿Deseas sincronizarlas e importarlas ahora?`
        );

        if (!confirmed) {
          return { success: true, addedCount: 0, message: 'Sincronización cancelada por el usuario.' };
        }

        for (const w of newWorkoutsList) {
          const payload = workoutToSupabasePayload(w, user.id);
          const { error: insErr } = await client.from('workouts').insert(payload);
          if (insErr) throw insErr;
        }

        const combinedList = [...workouts, ...newWorkoutsList];
        combinedList.sort((a, b) => new Date(b.date) - new Date(a.date));
        setWorkouts(combinedList);
        localStorage.setItem('fitanalytics_workouts', JSON.stringify(combinedList));

        return { success: true, addedCount, message: `¡Sincronización exitosa! Se importaron ${addedCount} nuevas carreras de Strava.` };
      }

      return { success: true, addedCount: 0, message: 'No se encontraron nuevas carreras de Strava para importar.' };
    } catch (e) {
      console.error('Error in syncRecentStravaActivities:', e);
      return { success: false, message: e.message };
    }
  }, [user, workouts, showConfirm]);



  // ── RETORNO PÚBLICO DEL HOOK ──
  console.log("DEBUG [useAppData]: Hook executes. fetchFriendsList exists?", typeof fetchFriendsList === 'function', {
    fetchFriendsList: typeof fetchFriendsList,
    searchUsers: typeof searchUsers
  });

  return {
    // Estado de datos
    workouts, shoes, plans, readinessLogs, nutritionLogs, profile,
    // Estado de autenticación
    isSupabaseConnected, session, user,
    // Estado de gamificación
    showConfetti, setShowConfetti,
    activeToast, setActiveToast,
    // Estado de diálogos (MED-04)
    dialog, setDialog, showAlert, showConfirm,
    // Handlers de autenticación
    handleLogin, handleRegister, handleLogout,
    // Handlers de conexión
    handleConnectSupabase, handleDisconnectSupabase,
    // Handlers CRUD
    handleSaveWorkout, handleDeleteWorkout, handleUpdateWorkout,
    handleUpdateNutrition, handleUpdateShoes, handleUpdatePlans,
    handleUpdateReadinessLogs, handleProfileChange,
    handleUpdateAllWorkouts, handleResetMockData,
    // COMUNIDAD
    searchUsers, sendFriendRequest, acceptFriendRequest, removeFriend, fetchFriendsList, fetchFriendData, fetchSocialFeed, toggleKudo, addComment,
    // INTEGRACIÓN STRAVA
    saveStravaCredentials, getStravaConnection, disconnectStrava, exchangeStravaCode, syncRecentStravaActivities,
  };
}


