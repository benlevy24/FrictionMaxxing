import { colors } from './colors';

const FONT = 'Comic Sans MS';

export const typography = {
  // Sizes
  xs: { fontFamily: FONT, fontSize: 12, color: colors.text },
  sm: { fontFamily: FONT, fontSize: 14, color: colors.text },
  base: { fontFamily: FONT, fontSize: 16, color: colors.text },
  lg: { fontFamily: FONT, fontSize: 20, color: colors.text },
  xl: { fontFamily: FONT, fontSize: 26, color: colors.text },
  xxl: { fontFamily: FONT, fontSize: 34, color: colors.text },

  // Semantic aliases
  heading: { fontFamily: FONT, fontSize: 26, color: colors.text },
  subheading: { fontFamily: FONT, fontSize: 18, color: colors.text },
  body: { fontFamily: FONT, fontSize: 16, color: colors.text },
  caption: { fontFamily: FONT, fontSize: 13, color: colors.textSub },
  label: { fontFamily: FONT, fontSize: 12, color: colors.textSub, letterSpacing: 0.8 },
};
