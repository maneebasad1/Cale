export type WorkoutEntryMode = 'preset' | 'custom';

export interface WorkoutEntry {
  id: string;
  date: string;
  name: string;
  caloriesBurned: number;
  durationMinutes?: number;
  entryMode: WorkoutEntryMode;
  workoutId?: string;
  timestamp: string;
}

export interface WorkoutPreset {
  id: string;
  name: string;
  met: number;
  category: string;
}
