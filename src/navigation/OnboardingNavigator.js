import { createNativeStackNavigator } from '@react-navigation/native-stack';
import WelcomeScreen from '../screens/onboarding/WelcomeScreen';
import HowItWorksScreen from '../screens/onboarding/HowItWorksScreen';
import PermissionsScreen from '../screens/onboarding/PermissionsScreen';

const Stack = createNativeStackNavigator();

export default function OnboardingNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Welcome" component={WelcomeScreen} />
      <Stack.Screen name="HowItWorks" component={HowItWorksScreen} />
      <Stack.Screen name="Permissions" component={PermissionsScreen} />
    </Stack.Navigator>
  );
}
