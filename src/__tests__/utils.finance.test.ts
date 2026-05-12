import {
  formatCurrency,
  formatRatio,
  formatPercentage,
  calcCustoTotal,
  calcLucroLiquido,
  calcRoas,
  calcPercentualFuncionarios,
  calcPercentualLucro,
  validateMonthlyData,
  type MonthlyData,
} from '../utils/finance';

const makeData = (overrides: Partial<MonthlyData> = {}): MonthlyData => ({
  month: 'Jan',
  faturamento: 100_000,
  anuncios: 20_000,
  funcionarios: 30_000,
  retornoAnuncios: 60_000,
  ...overrides,
});

// ===== formatCurrency =====
describe('formatCurrency', () => {
  it('formats a positive integer in BRL', () => {
    const result = formatCurrency(100_000);
    expect(result).toContain('100');
    expect(result).toContain('R$');
  });

  it('formats zero as R$ 0', () => {
    const result = formatCurrency(0);
    expect(result).toContain('R$');
    expect(result).toContain('0');
  });

  it('formats negative values with minus sign', () => {
    const result = formatCurrency(-5_000);
    expect(result).toContain('-');
  });
});

// ===== formatRatio =====
describe('formatRatio', () => {
  it('appends "x" and uses 2 decimal places', () => {
    expect(formatRatio(3)).toBe('3.00x');
    expect(formatRatio(1.5)).toBe('1.50x');
    expect(formatRatio(0)).toBe('0.00x');
  });
});

// ===== formatPercentage =====
describe('formatPercentage', () => {
  it('appends "%" and uses 1 decimal place', () => {
    expect(formatPercentage(50)).toBe('50.0%');
    expect(formatPercentage(33.333)).toBe('33.3%');
    expect(formatPercentage(0)).toBe('0.0%');
  });
});

// ===== calcCustoTotal =====
describe('calcCustoTotal', () => {
  it('sums anuncios and funcionarios', () => {
    expect(calcCustoTotal(makeData())).toBe(50_000);
  });

  it('returns 0 when both costs are zero', () => {
    expect(calcCustoTotal(makeData({ anuncios: 0, funcionarios: 0 }))).toBe(0);
  });
});

// ===== calcLucroLiquido =====
describe('calcLucroLiquido', () => {
  it('subtracts total cost from revenue', () => {
    expect(calcLucroLiquido(makeData())).toBe(50_000);
  });

  it('returns negative when costs exceed revenue', () => {
    expect(
      calcLucroLiquido(makeData({ faturamento: 10_000, anuncios: 8_000, funcionarios: 5_000 }))
    ).toBe(-3_000);
  });
});

// ===== calcRoas =====
describe('calcRoas', () => {
  it('divides adsReturn by adsCost', () => {
    expect(calcRoas(makeData())).toBeCloseTo(3, 5);
  });

  it('returns 0 when anuncios is 0', () => {
    expect(calcRoas(makeData({ anuncios: 0, retornoAnuncios: 0 }))).toBe(0);
  });

  it('returns 0 when anuncios is 0 even with return', () => {
    expect(calcRoas(makeData({ anuncios: 0, retornoAnuncios: 50_000 }))).toBe(0);
  });
});

// ===== calcPercentualFuncionarios =====
describe('calcPercentualFuncionarios', () => {
  it('calculates employee cost as percentage of revenue', () => {
    expect(calcPercentualFuncionarios(makeData())).toBeCloseTo(30, 5);
  });

  it('returns 0 when faturamento is 0', () => {
    expect(calcPercentualFuncionarios(makeData({ faturamento: 0 }))).toBe(0);
  });
});

// ===== calcPercentualLucro =====
describe('calcPercentualLucro', () => {
  it('calculates net profit as percentage of revenue', () => {
    expect(calcPercentualLucro(makeData())).toBeCloseTo(50, 5);
  });

  it('returns 0 when faturamento is 0', () => {
    expect(calcPercentualLucro(makeData({ faturamento: 0 }))).toBe(0);
  });
});

// ===== validateMonthlyData =====
describe('validateMonthlyData', () => {
  it('returns no errors for valid data', () => {
    expect(validateMonthlyData(makeData())).toEqual({});
  });

  it('flags negative values', () => {
    const errors = validateMonthlyData(makeData({ faturamento: -1 }));
    expect(errors.faturamento).toBeDefined();
  });

  it('flags values above 1 billion', () => {
    const errors = validateMonthlyData(makeData({ anuncios: 2_000_000_000 }));
    expect(errors.anuncios).toBeDefined();
  });

  it('flags NaN as invalid', () => {
    const errors = validateMonthlyData(makeData({ funcionarios: NaN }));
    expect(errors.funcionarios).toBeDefined();
  });

  it('allows zero as a valid value', () => {
    const errors = validateMonthlyData(
      makeData({ faturamento: 0, anuncios: 0, funcionarios: 0, retornoAnuncios: 0 })
    );
    expect(errors).toEqual({});
  });

  it('flags multiple invalid fields independently', () => {
    const errors = validateMonthlyData(
      makeData({ faturamento: -1, anuncios: -500 })
    );
    expect(errors.faturamento).toBeDefined();
    expect(errors.anuncios).toBeDefined();
    expect(errors.funcionarios).toBeUndefined();
  });
});
