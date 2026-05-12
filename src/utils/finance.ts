export const formatCurrency = (value: number): string =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  }).format(value);

export const formatRatio = (value: number): string => `${value.toFixed(2)}x`;

export const formatPercentage = (value: number): string => `${value.toFixed(1)}%`;

export type MonthlyData = {
  month: string;
  faturamento: number;
  anuncios: number;
  funcionarios: number;
  retornoAnuncios: number;
};

export const calcCustoTotal = (data: MonthlyData): number =>
  data.anuncios + data.funcionarios;

export const calcLucroLiquido = (data: MonthlyData): number =>
  data.faturamento - calcCustoTotal(data);

export const calcRoas = (data: MonthlyData): number =>
  data.anuncios > 0 ? data.retornoAnuncios / data.anuncios : 0;

export const calcPercentualFuncionarios = (data: MonthlyData): number =>
  data.faturamento > 0 ? (data.funcionarios / data.faturamento) * 100 : 0;

export const calcPercentualLucro = (data: MonthlyData): number => {
  const lucro = calcLucroLiquido(data);
  return data.faturamento > 0 ? (lucro / data.faturamento) * 100 : 0;
};

export const validateMonthlyData = (
  data: MonthlyData
): Partial<Record<keyof MonthlyData, string>> => {
  const errors: Partial<Record<keyof MonthlyData, string>> = {};
  const fields: Array<keyof MonthlyData> = [
    'faturamento',
    'anuncios',
    'funcionarios',
    'retornoAnuncios',
  ];

  fields.forEach((field) => {
    const value = data[field] as number;
    if (!Number.isFinite(value) || value < 0) {
      errors[field] = 'Use apenas numeros positivos.';
    } else if (value > 1_000_000_000) {
      errors[field] = 'Valor muito alto. Use ate 1 bilhao.';
    }
  });

  return errors;
};
