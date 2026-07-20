import type { WorkoutPreset } from '../types/workout';

export const WORKOUT_PRESETS: WorkoutPreset[] = [
  { id: 'walk-leisure', name: 'Walking (leisure)', met: 3.0, category: 'Walking' },
  { id: 'walk-brisk', name: 'Walking (brisk)', met: 4.3, category: 'Walking' },
  { id: 'walk-hike', name: 'Hiking', met: 6.0, category: 'Walking' },
  { id: 'run-light', name: 'Running (light jog)', met: 7.0, category: 'Running' },
  { id: 'run-moderate', name: 'Running (moderate)', met: 9.8, category: 'Running' },
  { id: 'run-fast', name: 'Running (fast)', met: 11.5, category: 'Running' },
  { id: 'cycle-leisure', name: 'Cycling (leisure)', met: 4.0, category: 'Cycling' },
  { id: 'cycle-moderate', name: 'Cycling (moderate)', met: 8.0, category: 'Cycling' },
  { id: 'cycle-vigorous', name: 'Cycling (vigorous)', met: 12.0, category: 'Cycling' },
  { id: 'swim-leisure', name: 'Swimming (leisure)', met: 6.0, category: 'Swimming' },
  { id: 'swim-laps', name: 'Swimming (laps)', met: 8.0, category: 'Swimming' },
  { id: 'weights-light', name: 'Weight training (light)', met: 3.5, category: 'Strength' },
  { id: 'weights-moderate', name: 'Weight training (moderate)', met: 5.0, category: 'Strength' },
  { id: 'weights-vigorous', name: 'Weight training (vigorous)', met: 6.0, category: 'Strength' },
  { id: 'yoga', name: 'Yoga', met: 3.0, category: 'Mind-body' },
  { id: 'pilates', name: 'Pilates', met: 3.5, category: 'Mind-body' },
  { id: 'hiit', name: 'HIIT', met: 8.0, category: 'Cardio' },
  { id: 'elliptical', name: 'Elliptical', met: 5.0, category: 'Cardio' },
  { id: 'rowing', name: 'Rowing machine', met: 7.0, category: 'Cardio' },
  { id: 'stairs', name: 'Stair climbing', met: 8.8, category: 'Cardio' },
  { id: 'dance', name: 'Dance', met: 5.5, category: 'Sports & play' },
  { id: 'basketball', name: 'Basketball', met: 6.5, category: 'Sports & play' },
  { id: 'football', name: 'Football / soccer', met: 7.0, category: 'Sports & play' },
  { id: 'tennis', name: 'Tennis', met: 7.3, category: 'Sports & play' },
  { id: 'badminton', name: 'Badminton', met: 5.5, category: 'Sports & play' },
  { id: 'cricket', name: 'Cricket', met: 4.8, category: 'Sports & play' },
  { id: 'boxing', name: 'Boxing / sparring', met: 9.0, category: 'Sports & play' },
  { id: 'jump-rope', name: 'Jump rope', met: 11.0, category: 'Cardio' },
];

export function searchWorkouts(query: string): WorkoutPreset[] {
  const q = query.trim().toLowerCase();
  if (!q) {
    return WORKOUT_PRESETS;
  }
  return WORKOUT_PRESETS.filter(
    workout =>
      workout.name.toLowerCase().includes(q) ||
      workout.category.toLowerCase().includes(q),
  );
}

export function getWorkoutById(id: string): WorkoutPreset | undefined {
  return WORKOUT_PRESETS.find(workout => workout.id === id);
}
