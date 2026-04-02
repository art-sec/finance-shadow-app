/**
 * Responsive Design Utilities
 * 
 * Fornece breakpoints e hooks para design responsivo
 * Inspirado em Tailwind CSS mas otimizado para React Native Web
 */

import { useWindowDimensions } from 'react-native';

/**
 * Breakpoints padrão para diferentes dispositivos
 */
export const BREAKPOINTS = {
  XS: 0,      // Extra small (phones)
  SM: 480,    // Small (phones landscape)
  MD: 768,    // Medium (tablets)
  LG: 1024,   // Large (desktop)
  XL: 1280,   // Extra large (wide desktop)
  '2XL': 1536, // 2x extra large (ultra-wide)
} as const;

/**
 * Hook para obter screen size category
 */
export const useScreenSize = () => {
  const { width } = useWindowDimensions();

  if (width < BREAKPOINTS.SM) return 'xs';
  if (width < BREAKPOINTS.MD) return 'sm';
  if (width < BREAKPOINTS.LG) return 'md';
  if (width < BREAKPOINTS.XL) return 'lg';
  if (width < BREAKPOINTS['2XL']) return 'xl';
  return '2xl';
};

/**
 * Hook para obter ajustes de espaçamento responsivo
 */
export const useResponsiveSpacing = () => {
  const { width } = useWindowDimensions();

  return {
    // Padding horizontal
    paddingH: width < BREAKPOINTS.SM ? 12 : width < BREAKPOINTS.MD ? 16 : 24,
    // Padding vertical
    paddingV: width < BREAKPOINTS.SM ? 12 : width < BREAKPOINTS.MD ? 14 : 20,
    // Gap entre elementos
    gap: width < BREAKPOINTS.SM ? 12 : width < BREAKPOINTS.MD ? 14 : 16,
    // Padding para cards
    cardPadding: width < BREAKPOINTS.SM ? 12 : width < BREAKPOINTS.MD ? 14 : 16,
    // Raio de borda
    borderRadius: width < BREAKPOINTS.SM ? 10 : 14,
  };
};

/**
 * Hook para obter ajustes de tipografia responsiva
 */
export const useResponsiveTypography = () => {
  const { width } = useWindowDimensions();

  return {
    // Títulos principais
    title: width < BREAKPOINTS.SM ? 24 : width < BREAKPOINTS.MD ? 28 : 32,
    // Subtítulos
    subtitle: width < BREAKPOINTS.SM ? 16 : width < BREAKPOINTS.MD ? 18 : 20,
    // Corpo de texto
    body: width < BREAKPOINTS.SM ? 13 : width < BREAKPOINTS.MD ? 14 : 15,
    // Texto pequeno
    small: width < BREAKPOINTS.SM ? 11 : width < BREAKPOINTS.MD ? 12 : 13,
    // Muito pequeno (labels)
    xsmall: width < BREAKPOINTS.SM ? 10 : 11,
  };
};

/**
 * Hook para obter layout responsivo
 */
export const useResponsiveLayout = () => {
  const { width } = useWindowDimensions();

  return {
    // Número de colunas para grids
    columns: width < BREAKPOINTS.SM ? 1 : width < BREAKPOINTS.MD ? 2 : 3,
    // Largura máxima containers
    maxWidth: width < BREAKPOINTS.SM ? '100%' : width < BREAKPOINTS.MD ? '95%' : 1180,
    // Orientação
    isPortrait: width < BREAKPOINTS.MD,
  };
};

/**
 * Função auxiliar para tamanho de fonte responsivo
 */
export const getFontSize = (width: number, sizes: { xs: number; sm: number; md: number; lg: number }) => {
  if (width < BREAKPOINTS.SM) return sizes.xs;
  if (width < BREAKPOINTS.MD) return sizes.sm;
  if (width < BREAKPOINTS.LG) return sizes.md;
  return sizes.lg;
};

/**
 * Função auxiliar para padding responsivo
 */
export const getPadding = (width: number, values: { xs: number; sm: number; md: number; lg: number }) => {
  if (width < BREAKPOINTS.SM) return values.xs;
  if (width < BREAKPOINTS.MD) return values.sm;
  if (width < BREAKPOINTS.LG) return values.md;
  return values.lg;
};

/**
 * Estilos base responsivos
 */
export const responsiveStyles = (width: number) => ({
  paddingHorizontal: width < BREAKPOINTS.SM ? 12 : width < BREAKPOINTS.MD ? 16 : 24,
  paddingVertical: width < BREAKPOINTS.SM ? 12 : width < BREAKPOINTS.MD ? 14 : 20,
  gap: width < BREAKPOINTS.SM ? 12 : 16,
});
