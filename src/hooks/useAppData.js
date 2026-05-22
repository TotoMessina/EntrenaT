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

  // ── PERSISTENCIA LOCAL REACTIVA ──
  useEffect(() => { localStorage.setItem('fitanalytics_shoes',           JSON.stringify(shoes));        }, [shoes]);
  useEffect(() => { localStorage.setItem('fitanalytics_training_plans',  JSON.stringify(plans));        }, [plans]);
  useEffect(() => { localStorage.setItem('fitanalytics_readiness_logs',  JSON.stringify(readinessLogs));}, [readinessLogs]);
  useEffect(() => { localStorage.setItem('fitanalytics_nutrition',       JSON.stringify(nutritionLogs));}, [nutritionLogs]);

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

      const localMap  = new Map(localWorkouts.map(w => [w.id, w]));
      const remoteMap = new Map((remoteData || []).map(w => [w.id, w]));
      const merged    = [];
      const toUpload  = [];

      const isMockWorkout = (id) => {
        const match = id.match(/^(run|gym)-(\d+)$/);
        return match ? parseInt(match[2], 10) < 1000 : false;
      };

      for (const local of localWorkouts) {
        const remote = remoteMap.get(local.id);
        if (isMockWorkout(local.id) && !remote) continue;
        if (remote?.gpx_data && !local.gpxData) local.gpxData = remote.gpx_data;
        if (!remote) toUpload.push(local);
        merged.push(local);
      }
      for (const remote of (remoteData || [])) {
        if (!localMap.has(remote.id)) merged.push(supabaseRowToWorkout(remote));
      }
      if (toUpload.length > 0) {
        const { error: uploadError } = await client
          .from('workouts')
          .upsert(toUpload.map(w => workoutToSupabasePayload(w, activeUser.id)));
        if (uploadError) console.error('Supabase synchronization insert error:', uploadError);
      }

      merged.sort((a, b) => new Date(b.date) - new Date(a.date));
      localStorage.setItem('fitanalytics_workouts', JSON.stringify(merged));
      setIsSupabaseConnected(true);
      return merged;
    } catch (e) {
      console.error('Supabase bi-directional sync failed, running in local-only fallback mode:', e);
      setIsSupabaseConnected(false);
      return localWorkouts;
    }
  };

  const syncNutritionWithSupabase = async (client, localNutrition, activeUser) => {
    if (!activeUser) return localNutrition;
    try {
      const { data: remoteData, error } = await client.from('nutrition').select('*');
      if (error) throw error;

      const localMap  = new Map(localNutrition.map(n => [n.id, n]));
      const remoteMap = new Map((remoteData || []).map(n => [n.id, n]));
      const merged    = [];
      const toUpload  = [];

      for (const local of localNutrition) {
        const remote = remoteMap.get(local.id);
        if (!remote) {
          toUpload.push(local);
          merged.push(local);
        } else {
          const mealMap = new Map();
          (local.meals  || []).forEach(m => mealMap.set(m.id, m));
          (remote.meals || []).forEach(m => mealMap.set(m.id, m));
          const uniqueMeals = Array.from(mealMap.values());
          const mergedLog = { ...local, meals: uniqueMeals };
          merged.push(mergedLog);
          if ((local.meals || []).length !== uniqueMeals.length ||
              (remote.meals || []).length !== uniqueMeals.length) {
            toUpload.push(mergedLog);
          }
        }
      }
      for (const remote of (remoteData || [])) {
        if (!localMap.has(remote.id)) merged.push({ id: remote.id, date: remote.date, meals: remote.meals || [] });
      }

      if (toUpload.length > 0) {
        const { error: uploadError } = await client.from('nutrition').upsert(
          toUpload.map(log => {
            const meals = log.meals || [];
            return {
              id: log.id, user_id: activeUser.id, date: log.date,
              calories: meals.reduce((s, m) => s + (Number(m.calories) || 0), 0),
              protein:  meals.reduce((s, m) => s + (Number(m.protein)  || 0), 0),
              carbs:    meals.reduce((s, m) => s + (Number(m.carbs)    || 0), 0),
              fat:      meals.reduce((s, m) => s + (Number(m.fat)      || 0), 0),
              meals,
            };
          })
        );
        if (uploadError) throw uploadError;
      }

      merged.sort((a, b) => new Date(b.date) - new Date(a.date));
      localStorage.setItem('fitanalytics_nutrition', JSON.stringify(merged));
      return merged;
    } catch (e) {
      console.error('Supabase nutrition bi-directional sync failed:', e);
      return localNutrition;
    }
  };

  const syncProfileWithSupabase = async (client, localProfile, activeUser) => {
    if (!activeUser) return localProfile;
    try {
      const { data: remoteProfile, error } = await client
        .from('profiles').select('*').eq('user_id', activeUser.id).maybeSingle();
      if (error) throw error;

      if (remoteProfile) {
        const updated = {
          age:       Number(remoteProfile.age)       || 25,
          weight:    Number(remoteProfile.weight)    || 75,
          height:    Number(remoteProfile.height)    || 175,
          restingHR: Number(remoteProfile.restingHR) || 60,
          gender:    remoteProfile.gender || 'male',
        };
        localStorage.setItem('fitanalytics_profile_age',        updated.age.toString());
        localStorage.setItem('fitanalytics_age',                updated.age.toString());
        localStorage.setItem('fitanalytics_profile_weight',     updated.weight.toString());
        localStorage.setItem('fitanalytics_profile_height',     updated.height.toString());
        localStorage.setItem('fitanalytics_profile_resting_hr', updated.restingHR.toString());
        localStorage.setItem('fitanalytics_profile_gender',     updated.gender);
        return updated;
      } else {
        const { error: insertError } = await client.from('profiles').insert({
          user_id:   activeUser.id,
          age:       Number(localProfile.age),
          weight:    Number(localProfile.weight),
          height:    Number(localProfile.height),
          restingHR: Number(localProfile.restingHR),
          gender:    localProfile.gender,
        });
        if (insertError) throw insertError;
        return localProfile;
      }
    } catch (e) {
      console.error('Supabase profile sync failed:', e);
      return localProfile;
    }
  };

  const syncShoesWithSupabase = async (client, localShoes, activeUser) => {
    if (!activeUser) return localShoes;
    try {
      const { data: remoteData, error } = await client.from('shoes').select('*');
      if (error) throw error;

      const localMap  = new Map(localShoes.map(s => [s.id, s]));
      const remoteMap = new Map((remoteData || []).map(s => [s.id, s]));
      const merged    = [];
      const toUpload  = [];

      for (const local of localShoes) {
        if (!remoteMap.get(local.id)) {
          toUpload.push({ id: local.id, user_id: activeUser.id, brand: local.brand, model: local.model,
            initial_km: Number(local.initialKm) || 0, max_km: Number(local.maxKm) || 800,
            buy_date: local.buyDate, is_active: local.isActive !== false });
        }
        merged.push(local);
      }
      for (const remote of (remoteData || [])) {
        if (!localMap.has(remote.id)) {
          merged.push({ id: remote.id, brand: remote.brand, model: remote.model,
            initialKm: Number(remote.initial_km) || 0, maxKm: Number(remote.max_km) || 800,
            buyDate: remote.buy_date, isActive: remote.is_active !== false });
        }
      }
      if (toUpload.length > 0) {
        const { error: uploadError } = await client.from('shoes').upsert(toUpload);
        if (uploadError) throw uploadError;
      }
      localStorage.setItem('fitanalytics_shoes', JSON.stringify(merged));
      return merged;
    } catch (e) {
      console.error('Supabase shoes bi-directional sync failed:', e);
      return localShoes;
    }
  };

  const syncPlansWithSupabase = async (client, localPlans, activeUser) => {
    if (!activeUser) return localPlans;
    try {
      const { data: remoteData, error } = await client.from('training_plans').select('*');
      if (error) throw error;

      const localMap  = new Map(localPlans.map(p => [p.date, p]));
      const remoteMap = new Map((remoteData || []).map(p => [p.date, p]));
      const merged    = [];
      const toUpload  = [];

      for (const local of localPlans) {
        if (!remoteMap.get(local.date)) {
          toUpload.push({ date: local.date, user_id: activeUser.id,
            distance: Number(local.distance) || 0, session_type: local.sessionType || 'Regenerativo', note: local.note || '' });
        }
        merged.push(local);
      }
      for (const remote of (remoteData || [])) {
        if (!localMap.has(remote.date)) {
          merged.push({ date: remote.date, distance: Number(remote.distance) || 0,
            sessionType: remote.session_type || 'Regenerativo', note: remote.note || '' });
        }
      }
      if (toUpload.length > 0) {
        const { error: uploadError } = await client.from('training_plans').upsert(toUpload);
        if (uploadError) throw uploadError;
      }
      localStorage.setItem('fitanalytics_training_plans', JSON.stringify(merged));
      return merged;
    } catch (e) {
      console.error('Supabase training plans bi-directional sync failed:', e);
      return localPlans;
    }
  };

  const syncReadinessWithSupabase = async (client, localReadiness, activeUser) => {
    if (!activeUser) return localReadiness;
    try {
      const { data: remoteData, error } = await client.from('readiness_logs').select('*');
      if (error) throw error;

      const localMap  = new Map(localReadiness.map(l => [l.date, l]));
      const remoteMap = new Map((remoteData || []).map(l => [l.date, l]));
      const merged    = [];
      const toUpload  = [];

      for (const local of localReadiness) {
        if (!remoteMap.get(local.date)) {
          toUpload.push({ date: local.date, user_id: activeUser.id,
            sleep: Number(local.sleep) || 4, soreness: Number(local.soreness) || 2,
            resting_hr: Number(local.restingHr) || 60, hrv: local.hrv ? Number(local.hrv) : null, notes: local.notes || '' });
        }
        merged.push(local);
      }
      for (const remote of (remoteData || [])) {
        if (!localMap.has(remote.date)) {
          merged.push({ date: remote.date, sleep: Number(remote.sleep) || 4,
            soreness: Number(remote.soreness) || 2, restingHr: Number(remote.resting_hr) || 60,
            hrv: remote.hrv ? Number(remote.hrv) : null, notes: remote.notes || '' });
        }
      }
      if (toUpload.length > 0) {
        const { error: uploadError } = await client.from('readiness_logs').upsert(toUpload);
        if (uploadError) throw uploadError;
      }
      localStorage.setItem('fitanalytics_readiness_logs', JSON.stringify(merged));
      return merged;
    } catch (e) {
      console.error('Supabase readiness logs bi-directional sync failed:', e);
      return localReadiness;
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
        setWorkouts(initWorkouts);
        setNutritionLogs(initNutrition);
        setProfile(initProfile);
        setShoes(initShoes);
        setPlans(initPlans);
        setReadinessLogs(initReadiness);
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
      localStorage.setItem('fitanalytics_workouts', JSON.stringify(updated));
      return updated;
    });
    const client = getSupabase();
    if (client && user) {
      try {
        const { error } = await client.from('workouts').insert(workoutToSupabasePayload(newWorkout, user.id));
        if (error) throw error;
      } catch (e) { console.error('Supabase insertion error. Item cached locally:', e); }
    }
  }, [user]);

  const handleDeleteWorkout = useCallback(async (id) => {
    setWorkouts(prev => {
      const updated = prev.filter(w => w.id !== id);
      localStorage.setItem('fitanalytics_workouts', JSON.stringify(updated));
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
      localStorage.setItem('fitanalytics_workouts', JSON.stringify(updated));
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
    localStorage.setItem('fitanalytics_nutrition', JSON.stringify(updatedLogs));
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
    localStorage.setItem('fitanalytics_shoes', JSON.stringify(updatedShoes));
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
    localStorage.setItem('fitanalytics_training_plans', JSON.stringify(updatedPlans));
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
    localStorage.setItem('fitanalytics_readiness_logs', JSON.stringify(updatedReadiness));
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
    localStorage.setItem('fitanalytics_profile_age',        newProfile.age.toString());
    localStorage.setItem('fitanalytics_age',                newProfile.age.toString());
    localStorage.setItem('fitanalytics_profile_weight',     newProfile.weight.toString());
    localStorage.setItem('fitanalytics_profile_height',     newProfile.height.toString());
    localStorage.setItem('fitanalytics_profile_resting_hr', newProfile.restingHR.toString());
    localStorage.setItem('fitanalytics_profile_gender',     newProfile.gender);
    const client = getSupabase();
    if (client && user) {
      try {
        const { error } = await client.from('profiles').upsert({
          user_id: user.id, age: Number(newProfile.age), weight: Number(newProfile.weight),
          height: Number(newProfile.height), restingHR: Number(newProfile.restingHR),
          gender: newProfile.gender, updated_at: new Date().toISOString(),
        });
        if (error) throw error;
      } catch (e) { console.error('Supabase profile upsert error:', e); }
    }
  }, [user]);

  const handleUpdateAllWorkouts = useCallback(async (allWorkouts) => {
    setWorkouts(allWorkouts);
    localStorage.setItem('fitanalytics_workouts', JSON.stringify(allWorkouts));
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
      localStorage.setItem('fitanalytics_workouts', JSON.stringify(MOCK_WORKOUTS));
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

  // ── RETORNO PÚBLICO DEL HOOK ──
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
  };
}
