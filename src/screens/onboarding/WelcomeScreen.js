import ScreenWrapper from '../../components/ScreenWrapper';
import AppText from '../../components/AppText';
import Button from '../../components/Button';

export default function WelcomeScreen({ navigation }) {
  return (
    <ScreenWrapper>
      <AppText variant="xxl">Friction Maxxing</AppText>
      <AppText variant="caption">yes, you need a maze to stop opening instagram</AppText>
      <Button label="Let's go" onPress={() => navigation.navigate('HowItWorks')} />
    </ScreenWrapper>
  );
}
