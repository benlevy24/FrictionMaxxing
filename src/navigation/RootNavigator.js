import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import OnboardingNavigator from './OnboardingNavigator';
import MainTabNavigator from './MainTabNavigator';
import GameScreen from '../screens/games/GameScreen';
import TutorialScreen from '../screens/main/TutorialScreen';
import GeoBlockingScreen from '../screens/main/GeoBlockingScreen';
import UsageEstimatesScreen from '../screens/main/UsageEstimatesScreen';

const Stack = createNativeStackNavigator();

// Swap initialRouteName between 'Onboarding' and 'Main' to test each flow.
// In production this will be driven by whether the user has completed onboarding.
const linking = {
  prefixes: ['frictionmaxxing://'],
  config: {
    screens: {
      Game: { path: 'game' },
    },
  },
};

export default function RootNavigator() {
  return (
    <NavigationContainer linking={linking}>
      <Stack.Navigator initialRouteName="Onboarding" screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Onboarding" component={OnboardingNavigator} />
        <Stack.Screen name="Main" component={MainTabNavigator} />
        <Stack.Screen
          name="Game"
          component={GameScreen}
          options={{ presentation: 'fullScreenModal' }}
        />
        <Stack.Screen name="Tutorial" component={TutorialScreen} />
        <Stack.Screen name="GeoBlocking" component={GeoBlockingScreen} />
        <Stack.Screen name="UsageEstimates" component={UsageEstimatesScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
