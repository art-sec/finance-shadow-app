/**
 * Exemplo de Implementação de Responsividade
 * 
 * Este arquivo mostra como usar os novos hooks e utilities
 * de responsividade em seus componentes.
 */

import { useWindowDimensions, StyleSheet } from 'react-native';
import {
  useResponsiveSpacing,
  useResponsiveTypography,
  useResponsiveLayout,
  BREAKPOINTS,
} from '../utils/responsive';

/**
 * Exemplo 1: Componente com espaçamento responsivo
 */
export const ResponsiveComponentExample = () => {
  const { paddingH, paddingV, gap, borderRadius } = useResponsiveSpacing();
  const { title, body } = useResponsiveTypography();

  const styles = StyleSheet.create({
    container: {
      paddingHorizontal: paddingH, // 12px (mobile) → 16px (tablet) → 24px (desktop)
      paddingVertical: paddingV,   // 12px (mobile) → 14px (tablet) → 20px (desktop)
      gap: gap,                     // 12px (mobile) → 14px (tablet) → 16px (desktop)
      borderRadius: borderRadius,   // 10px (mobile) → 14px (desktop)
    },
    title: {
      fontSize: title,    // Ajusta automaticamente com o tamanho da tela
      fontWeight: '700',
    },
    text: {
      fontSize: body,     // Ajusta para cada tamanho de tela
    },
  });

  return (
    // Seu componente aqui
  );
};

/**
 * Exemplo 2: Layout responsivo (1 coluna → 2 → 3)
 */
export const ResponsiveGridExample = () => {
  const { columns, maxWidth, isPortrait } = useResponsiveLayout();
  const { gap } = useResponsiveSpacing();

  const styles = StyleSheet.create({
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: gap,
      maxWidth: typeof maxWidth === 'number' ? maxWidth : '100%',
    },
    item: {
      flex: 1,
      minWidth: 250, // Para garantir espaço mínimo
    },
  });

  return (
    // Grid que ajusta número de colunas:
    // - Mobile: 1 coluna
    // - Tablet: 2 colunas
    // - Desktop: 3 colunas
  );
};

/**
 * Exemplo 3: Condicional baseado no tamanho
 */
export const ResponsiveConditionalExample = () => {
  const { width } = useWindowDimensions();
  const isDesktop = width >= BREAKPOINTS.LG;
  const isTablet = width >= BREAKPOINTS.MD && width < BREAKPOINTS.LG;
  const isMobile = width < BREAKPOINTS.MD;

  if (isMobile) {
    // Layout otimizado para mobile
    return (
      <div style={{ padding: '12px', gap: '12px' }}>
        {/* Conteúdo mobile */}
      </div>
    );
  }

  if (isTablet) {
    // Layout otimizado para tablet
    return (
      <div style={{ padding: '16px', gap: '14px' }}>
        {/* Conteúdo tablet */}
      </div>
    );
  }

  // Desktop
  return (
    <div style={{ padding: '24px', gap: '16px', maxWidth: '1180px' }}>
      {/* Conteúdo desktop */}
    </div>
  );
};

/**
 * Exemplo 4: Dashboard com responsividade
 * Isso é como você deveria atualizar DashboardScreen
 */
export const ResponsiveDashboardExample = () => {
  const { width } = useWindowDimensions();
  const spacing = useResponsiveSpacing();
  const typography = useResponsiveTypography();
  const layout = useResponsiveLayout();

  const styles = StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: '#0B0B1A',
    },
    content: {
      paddingHorizontal: spacing.paddingH,
      paddingVertical: spacing.paddingV,
      gap: spacing.gap,
      paddingBottom: 40,
      alignSelf: 'center',
      width: '100%',
      maxWidth: layout.maxWidth,
    },
    title: {
      fontSize: typography.title,
      fontWeight: '800',
      color: '#E5E2FF',
    },
    subtitle: {
      fontSize: typography.subtitle,
      color: '#A9ACD9',
    },
    metricsGrid: {
      flexDirection: layout.isPortrait ? 'column' : 'row',
      gap: spacing.gap,
    },
    chart: {
      width: layout.isPortrait ? '100%' : 'auto',
      flex: layout.isPortrait ? 0 : 1,
    },
  });

  return (
    // Seu dashboard com espaçamento e tamanhos responsivos
  );
};

/**
 * Guia de Implementação Rápida
 * 
 * Passo 1: Importe os hooks
 * ──────────────────────────
 * import {
 *   useResponsiveSpacing,
 *   useResponsiveTypography,
 *   useResponsiveLayout,
 * } from '../utils/responsive';
 * 
 * Passo 2: Use os hooks no componente
 * ────────────────────────────────────
 * const { paddingH, gap } = useResponsiveSpacing();
 * const { body, title } = useResponsiveTypography();
 * 
 * Passo 3: Aplique aos estilos
 * ─────────────────────────────
 * const styles = StyleSheet.create({
 *   container: {
 *     paddingHorizontal: paddingH,
 *     gap: gap,
 *   },
 *   text: {
 *     fontSize: body,
 *   }
 * });
 * 
 * Pronto! Seus componentes serão responsivos automaticamente.
 */

/**
 * Valores de Breakpoint para Referência
 * ─────────────────────────────────────
 * 
 * XS: 0px        | Extra small devices (phones)
 * SM: 480px      | Small devices (phones landscape)
 * MD: 768px      | Medium devices (tablets)
 * LG: 1024px     | Large devices (desktops)
 * XL: 1280px     | Extra large (wide desktops)
 * 2XL: 1536px    | 2x extra large (ultra-wide)
 */
