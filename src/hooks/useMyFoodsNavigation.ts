import { CommonActions, useNavigation } from '@react-navigation/native';

export function useMyFoodsNavigation() {
  const navigation = useNavigation();

  const openMyFoods = () => {
    navigation.dispatch(
      CommonActions.navigate({
        name: 'MyFoods',
      }),
    );
  };

  return { openMyFoods };
}
