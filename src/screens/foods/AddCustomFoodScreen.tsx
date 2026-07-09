import React from 'react';
import { StyleSheet } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { AddCustomFoodForm } from '../../components/AddCustomFoodForm';
import { KeyboardAwareScreen } from '../../components/KeyboardAwareScreen';
import { Screen } from '../../components/Screen';
import { spacing } from '../../constants/theme';
import type { MainStackParamList } from '../../navigation/types';
import type { FoodItem } from '../../types/food';

type Nav = NativeStackNavigationProp<MainStackParamList, 'AddCustomFood'>;
type Route = RouteProp<MainStackParamList, 'AddCustomFood'>;

export function AddCustomFoodScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const selectOnSave = route.params?.selectOnSave ?? false;
  const returnDate = route.params?.returnDate;
  const returnEntryId = route.params?.returnEntryId;

  const handleSaved = (food: FoodItem) => {
    if (selectOnSave && returnDate) {
      navigation.navigate({
        name: 'AddEntry',
        params: {
          date: returnDate,
          entryId: returnEntryId,
          prefillFood: food,
        },
        merge: true,
      });
      return;
    }
    navigation.goBack();
  };

  return (
    <Screen edges={['bottom']}>
      <KeyboardAwareScreen contentContainerStyle={styles.content}>
        <AddCustomFoodForm onSaved={handleSaved} />
      </KeyboardAwareScreen>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.lg,
  },
});
