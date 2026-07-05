import { CommonActions, useNavigation } from '@react-navigation/native';
import type { MainStackParamList } from '../navigation/types';

export function useAddEntryNavigation() {
  const navigation = useNavigation();

  const openAddEntry = (params: MainStackParamList['AddEntry']) => {
    navigation.dispatch(
      CommonActions.navigate({
        name: 'AddEntry',
        params,
      }),
    );
  };

  return { openAddEntry };
}
