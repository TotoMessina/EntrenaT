/**
 * Serialización bidireccional de objetos workout para sincronización con Supabase.
 * Centraliza el mapeo entre el esquema local y las columnas de la base de datos,
 * garantizando que todos los campos (incluyendo trainedMuscles) se persistan
 * correctamente en cada operación de escritura.
 */

/**
 * Convierte un objeto workout local al payload de columnas de Supabase.
 * @param {Object} workout - Objeto workout del estado local de React
 * @param {string} userId  - ID del usuario autenticado
 * @returns {Object} Payload listo para insert/upsert en Supabase
 */
export const workoutToSupabasePayload = (workout, userId) => {
  const hasAdvancedMetrics = Boolean(
    workout.maxSpeed || workout.avgCadence || workout.strideLength ||
    workout.elevationGain || workout.splits || workout.shoeId ||
    workout.advanced_metrics?.shoeId
  );

  return {
    id: workout.id,
    type: workout.type,
    date: workout.date,
    distance: workout.distance,
    duration: workout.duration,
    terrain: workout.terrain,
    heartRate: workout.heartRate,
    rpe: workout.rpe,
    notes: workout.notes,
    muscleGroup: workout.muscleGroup,
    trainedMuscles: workout.trainedMuscles || [],
    sessionName: workout.sessionName,
    exercises: workout.exercises,
    gpx_data: workout.gpxData || null,
    advanced_metrics: hasAdvancedMetrics ? {
      maxSpeed:      workout.maxSpeed      || workout.advanced_metrics?.maxSpeed      || null,
      avgCadence:    workout.avgCadence    || workout.advanced_metrics?.avgCadence    || null,
      maxCadence:    workout.maxCadence    || workout.advanced_metrics?.maxCadence    || null,
      strideLength:  workout.strideLength  || workout.advanced_metrics?.strideLength  || null,
      elevationGain: workout.elevationGain || workout.advanced_metrics?.elevationGain || null,
      elevationLoss: workout.elevationLoss || workout.advanced_metrics?.elevationLoss || null,
      splits:        workout.splits        || workout.advanced_metrics?.splits        || null,
      shoeId:        workout.shoeId        || workout.advanced_metrics?.shoeId        || null,
    } : null,
    user_id: userId,
  };
};

/**
 * Convierte una fila de Supabase al esquema de objeto workout local.
 * @param {Object} remote - Fila recibida desde Supabase
 * @returns {Object} Objeto workout compatible con el estado local de React
 */
export const supabaseRowToWorkout = (remote) => ({
  id: remote.id,
  type: remote.type,
  date: remote.date,
  distance: remote.distance ? Number(remote.distance) : 0,
  duration: remote.duration,
  terrain: remote.terrain,
  heartRate: remote.heartRate,
  rpe: remote.rpe,
  notes: remote.notes,
  muscleGroup: remote.muscleGroup,
  trainedMuscles: remote.trainedMuscles || [],
  sessionName: remote.sessionName,
  exercises: remote.exercises,
  gpxData: remote.gpx_data,
  maxSpeed:      remote.advanced_metrics?.maxSpeed      || null,
  avgCadence:    remote.advanced_metrics?.avgCadence    || null,
  maxCadence:    remote.advanced_metrics?.maxCadence    || null,
  strideLength:  remote.advanced_metrics?.strideLength  || null,
  elevationGain: remote.advanced_metrics?.elevationGain || null,
  elevationLoss: remote.advanced_metrics?.elevationLoss || null,
  splits:        remote.advanced_metrics?.splits        || null,
  shoeId:        remote.advanced_metrics?.shoeId        || null,
});
