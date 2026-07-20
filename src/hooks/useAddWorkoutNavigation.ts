import { CommonActions, useNavigation } from '@react-navigation/native';
import type { MainStackParamList } from '../navigation/types';

export function useAddWorkoutNavigation() {
  const navigation = useNavigation();

  const openAddWorkout = (params: MainStackParamList['AddWorkout']) => {
    navigation.dispatch(
      CommonActions.navigate({
        name: 'AddWorkout',
        params,
      }),
    );
  };

  return { openAddWorkout };
}
