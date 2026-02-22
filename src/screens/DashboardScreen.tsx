/**
 * Dashboard Screen - Painel Financeiro Principal
 * 
 * Este componente mostra:
 * - Resumo de dados financeiros mensais
 * - Gráficos de tendências
 * - Formulário para editar dados
 * - Sincronização com Firestore
 * 
 * Funcionalidades:
 * - Carrega dados do Firestore (coleção 'finance')
 * - Permite editar faturamento, anúncios, funcionários
 * - Calcula total automaticamente
 * - Sincroniza alterações com banco de dados
 * - Responsivo para diferentes tamanhos de tela
 * - Anima elementos ao carregar
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { signOut } from 'firebase/auth';
import { collection, doc, getDocs, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import LineChart from '../components/LineChart';

/**
 * Tipo para dados de um mês específico
 */
type MonthlyData = {
  month: string;
  faturamento: number;        // Receita/Faturamento
  anuncios: number;           // Gastos com anúncios
  funcionarios: number;       // Gastos com funcionários
  faturamentoTotal: number;   // Total = Faturamento - Anúncios - Funcionários
};

/**
 * Tipo para um ponto no gráfico
 */
type ChartPoint = {
  label: string;
  value: number;
};

/**
 * Dados padrão (exemplo) para 12 meses
 * Estes dados são combinados com os dados salvos no Firestore
 */
const DATA: MonthlyData[] = [
  { month: 'Jan', faturamento: 120000, anuncios: 35000, funcionarios: 18000, faturamentoTotal: 132000 },
  { month: 'Fev', faturamento: 98000, anuncios: 30000, funcionarios: 18000, faturamentoTotal: 105000 },
  { month: 'Mar', faturamento: 142000, anuncios: 42000, funcionarios: 19000, faturamentoTotal: 155000 },
  { month: 'Abr', faturamento: 110000, anuncios: 36000, funcionarios: 18500, faturamentoTotal: 118000 },
  { month: 'Mai', faturamento: 150000, anuncios: 48000, funcionarios: 20000, faturamentoTotal: 168000 },
  { month: 'Jun', faturamento: 132000, anuncios: 41000, funcionarios: 19500, faturamentoTotal: 142000 },
  { month: 'Jul', faturamento: 126000, anuncios: 39000, funcionarios: 19000, faturamentoTotal: 134000 },
  { month: 'Ago', faturamento: 158000, anuncios: 52000, funcionarios: 21000, faturamentoTotal: 176000 },
  { month: 'Set', faturamento: 144000, anuncios: 47000, funcionarios: 20500, faturamentoTotal: 159000 },
  { month: 'Out', faturamento: 165000, anuncios: 54000, funcionarios: 22000, faturamentoTotal: 184000 },
  { month: 'Nov', faturamento: 172000, anuncios: 56000, funcionarios: 22500, faturamentoTotal: 196000 },
  { month: 'Dez', faturamento: 190000, anuncios: 60000, funcionarios: 23000, faturamentoTotal: 212000 },
];

/**
 * Formata um número como moeda BRL
 * Ex: 120000 -> "R$ 120.000"
 */
const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  }).format(value);

/**
 * Formata um número como razão
 * Ex: 1.5 -> "1.50x"
 */
const formatRatio = (value: number) => `${value.toFixed(2)}x`;

/**
 * Props do componente
 */
type Props = {
  userEmail?: string | null;    // Email do usuário logado
  userId?: string | null;       // ID do usuário (UID do Firebase)
};

export default function DashboardScreen({ userEmail, userId }: Props) {
  // ===== ESTADOS =====
  
  // Mês selecionado para edição
  const [selectedMonth, setSelectedMonth] = useState('Jan');
  
  // Dados mensais (inicializa com dados padrão)
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>(DATA);
  
  // Indica se está carregando dados do Firestore
  const [loadingData, setLoadingData] = useState(false);
  
  // Indica se está salvando dados no Firestore
  const [saving, setSaving] = useState(false);
  
  // Mensagem de sucesso ao salvar
  const [saveMessage, setSaveMessage] = useState('');
  
  // Erros de validação do formulário
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof MonthlyData, string>>>({});
  
  // ===== DIMENSÕES E LAYOUT =====
  
  // Largura da tela atual
  const { width } = useWindowDimensions();
  
  // Tela estreita: < 700px (mobile)
  const isNarrow = width < 700;
  
  // Largura máxima do conteúdo
  const maxContentWidth = 1100;
  
  // Número de colunas para cards (1, 2 ou 3)
  const columns = width >= 1100 ? 3 : width >= 720 ? 2 : 1;
  
  // Largura disponível para conteúdo
  const availableWidth = Math.min(width, maxContentWidth) - 40;
  
  // Largura de cada card
  const cardWidth = columns === 1
    ? '100%'
    : (availableWidth - (columns - 1) * 12) / columns;

  // Número de colunas para gráficos
  const chartColumns = width >= 900 ? 2 : 1;
  
  // Largura de cada gráfico
  const chartWidth = chartColumns === 1
    ? '100%'
    : (availableWidth - (chartColumns - 1) * 16) / chartColumns;

  // ===== ANIMAÇÕES =====
  
  // Animação de opacidade para fade-in
  const fadeAnim = useRef(new Animated.Value(0)).current;
  
  // Animação de movimento para slide-in
  const slideAnim = useRef(new Animated.Value(16)).current;

  // Hook: Executar animações ao montar
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  // Hook: Carregar dados do Firestore quando userId muda
  useEffect(() => {
    if (!userId) {
      return;
    }

    let mounted = true;

    const loadData = async () => {
      setLoadingData(true);
      setSaveMessage('');
      try {
        // Buscar docs da coleção 'finance' do usuário
        const snapshot = await getDocs(collection(db, 'users', userId, 'finance'));
        if (!mounted) {
          return;
        }
        if (!snapshot.empty) {
          // Criar mapa dos dados por mês
          const map = new Map(snapshot.docs.map((docItem) => [docItem.id, docItem.data()]));
          // Mesclar dados salvos com dados padrão
          setMonthlyData((prev) =>
            prev.map((item) => {
              const data = map.get(item.month) as Partial<MonthlyData> | undefined;
              if (!data) {
                return item;
              }
              // Garantir que todos os valores são números válidos
              const faturamento = Number(data.faturamento ?? item.faturamento);
              const anuncios = Number(data.anuncios ?? item.anuncios);
              const funcionarios = Number(data.funcionarios ?? item.funcionarios);
              const faturamentoTotal = Number(data.faturamentoTotal ?? item.faturamentoTotal);
              
              // Validar e corrigir valores inválidos
              return {
                ...item,
                faturamento: Number.isFinite(faturamento) ? faturamento : item.faturamento,
                anuncios: Number.isFinite(anuncios) ? anuncios : item.anuncios,
                funcionarios: Number.isFinite(funcionarios) ? funcionarios : item.funcionarios,
                faturamentoTotal: Number.isFinite(faturamentoTotal) ? faturamentoTotal : item.faturamentoTotal,
              };
            })
          );
        }
      } catch (err) {
        console.error('Erro ao carregar dados:', err);
        setSaveMessage('Falha ao carregar dados do Firestore.');
      } finally {
        if (mounted) {
          setLoadingData(false);
        }
      }
    };

    loadData();

    return () => {
      mounted = false;
    };
  }, [userId]);

  const currentData = useMemo(() => {
    return monthlyData.find((item) => item.month === selectedMonth) ?? monthlyData[0];
  }, [monthlyData, selectedMonth]);

  const custoTotal = currentData.anuncios + currentData.funcionarios;
  const lucroLiquido = currentData.faturamento - custoTotal;
  const retorno = currentData.anuncios > 0 ? currentData.faturamento / currentData.anuncios : 0;

  const metrics = [
    { label: 'Faturamento', value: formatCurrency(currentData.faturamento) },
    { label: 'Gasto com anuncios', value: formatCurrency(currentData.anuncios) },
    { label: 'Retorno (ROAS)', value: formatRatio(retorno) },
    { label: 'Gasto com funcionarios', value: formatCurrency(currentData.funcionarios) },
    { label: 'Lucro liquido', value: formatCurrency(lucroLiquido) },
    { label: 'Custo total', value: formatCurrency(custoTotal) },
    { label: 'Faturamento total', value: formatCurrency(currentData.faturamentoTotal) },
  ];

  const validateMonth = (data: MonthlyData) => {
    const errors: Partial<Record<keyof MonthlyData, string>> = {};
    const fields: Array<keyof MonthlyData> = [
      'faturamento',
      'anuncios',
      'funcionarios',
      'faturamentoTotal',
    ];

    fields.forEach((field) => {
      const value = data[field];
      if (!Number.isFinite(value) || value < 0) {
        errors[field] = 'Use apenas numeros positivos.';
      } else if (value > 1000000000) {
        errors[field] = 'Valor muito alto. Use ate 1 bilhao.';
      }
    });

    if (data.faturamentoTotal < data.faturamento) {
      errors.faturamentoTotal = 'Faturamento total deve ser maior ou igual ao faturamento.';
    }

    return errors;
  };

  const updateField = (field: keyof MonthlyData, value: string) => {
    const numericValue = Number(value.replace(/[^0-9]/g, ''));
    const safeValue = Number.isNaN(numericValue) ? 0 : numericValue;
    const updated = { ...currentData, [field]: safeValue };

    setMonthlyData((prev) =>
      prev.map((item) =>
        item.month === selectedMonth
          ? updated
          : item
      )
    );

    setFormErrors(validateMonth(updated));
    setSaveMessage('');
  };

  const handleSave = async () => {
    if (!userId) {
      setSaveMessage('Usuario nao autenticado.');
      return;
    }

    const errors = validateMonth(currentData);
    setFormErrors(errors);
    if (Object.keys(errors).length > 0) {
      setSaveMessage('Corrija os campos antes de salvar.');
      return;
    }

    setSaving(true);
    setSaveMessage('');
    try {
      await setDoc(
        doc(db, 'users', userId, 'finance', currentData.month),
        {
          ...currentData,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
      setSaveMessage('Dados salvos com sucesso.');
    } catch (err) {
      setSaveMessage('Falha ao salvar no Firestore.');
    } finally {
      setSaving(false);
    }
  };

  const faturamentoSeries: ChartPoint[] = monthlyData
    .map((item) => ({
      label: item.month,
      value: Number.isFinite(item.faturamento) ? item.faturamento : 0,
    }))
    .filter(p => Number.isFinite(p.value));

  const custoSeries: ChartPoint[] = monthlyData
    .map((item) => {
      const custo = Number.isFinite(item.anuncios) && Number.isFinite(item.funcionarios) 
        ? item.anuncios + item.funcionarios 
        : 0;
      return {
        label: item.month,
        value: custo,
      };
    })
    .filter(p => Number.isFinite(p.value));

  const lucroSeries: ChartPoint[] = monthlyData
    .map((item) => {
      const lucro = Number.isFinite(item.faturamento) && Number.isFinite(item.anuncios) && Number.isFinite(item.funcionarios)
        ? item.faturamento - (item.anuncios + item.funcionarios)
        : 0;
      return {
        label: item.month,
        value: lucro,
      };
    })
    .filter(p => Number.isFinite(p.value));

  const roasSeries: ChartPoint[] = monthlyData
    .map((item) => {
      // Evita divisão por zero no cálculo de ROAS
      let roas = 0;
      if (Number.isFinite(item.anuncios) && Number.isFinite(item.faturamento) && item.anuncios > 0) {
        roas = item.faturamento / item.anuncios;
      }
      return {
        label: item.month,
        value: Number.isFinite(roas) ? roas : 0,
      };
    })
    .filter(p => Number.isFinite(p.value));

  return (
    <View style={styles.screen}>
      <View style={styles.bgGlow} />
      <View style={styles.bgGlowAlt} />
      <ScrollView contentContainerStyle={styles.content}>
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          <View style={[styles.header, isNarrow ? styles.headerStack : null]}>
            <View>
              <Text style={styles.kicker}>Painel Financeiro</Text>
              <Text style={styles.title}>Resumo mensal</Text>
              {userEmail ? <Text style={styles.email}>{userEmail}</Text> : null}
            </View>
            <View style={styles.headerActions}>
              <Pressable
                style={[styles.signOut, isNarrow ? styles.signOutFull : null]}
                onPress={() => signOut(auth)}
              >
                <Text style={styles.signOutText}>Sair</Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.selector}>
            <Text style={styles.selectorLabel}>Mes:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {monthlyData.map((item) => (
                <Pressable
                  key={item.month}
                  style={({ pressed }) => [
                    styles.monthChip,
                    selectedMonth === item.month ? styles.monthChipActive : null,
                    pressed ? styles.monthChipPressed : null,
                  ]}
                  onPress={() => setSelectedMonth(item.month)}
                >
                  <Text
                    style={
                      selectedMonth === item.month
                        ? styles.monthTextActive
                        : styles.monthText
                    }
                  >
                    {item.month}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>

          {loadingData ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator color="#7C5CFF" />
              <Text style={styles.loadingText}>Carregando dados do Firestore...</Text>
            </View>
          ) : null}

          <View style={styles.cards}>
            {metrics.map((metric) => (
              <View key={metric.label} style={[styles.card, { width: cardWidth }]}>
                <Text style={styles.cardLabel}>{metric.label}</Text>
                <Text style={styles.cardValue}>{metric.value}</Text>
              </View>
            ))}
          </View>

          <View style={styles.charts}>
            <Text style={styles.sectionTitle}>Tendencias anuais</Text>
            <View style={styles.chartGrid}>
              <View style={[styles.lineChartWrapper, { width: chartWidth }]}>
                <LineChart title="Faturamento" points={faturamentoSeries} color="#7C5CFF" />
              </View>
              <View style={[styles.lineChartWrapper, { width: chartWidth }]}>
                <LineChart title="Custo total" points={custoSeries} color="#4EC5FF" />
              </View>
              <View style={[styles.lineChartWrapper, { width: chartWidth }]}>
                <LineChart title="Lucro liquido" points={lucroSeries} color="#6DDFB5" />
              </View>
              <View style={[styles.lineChartWrapper, { width: chartWidth }]}>
                <LineChart title="ROAS" points={roasSeries} color="#F59E76" />
              </View>
            </View>
          </View>

          <View style={styles.form}>
            <Text style={styles.formTitle}>Atualizar dados do mes</Text>
            <View style={styles.formRow}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Faturamento</Text>
                <TextInput
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor="#8C8FB3"
                  style={styles.input}
                  value={String(currentData.faturamento)}
                  onChangeText={(value) => updateField('faturamento', value)}
                />
                {formErrors.faturamento ? (
                  <Text style={styles.errorText}>{formErrors.faturamento}</Text>
                ) : null}
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Gasto com anuncios</Text>
                <TextInput
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor="#8C8FB3"
                  style={styles.input}
                  value={String(currentData.anuncios)}
                  onChangeText={(value) => updateField('anuncios', value)}
                />
                {formErrors.anuncios ? (
                  <Text style={styles.errorText}>{formErrors.anuncios}</Text>
                ) : null}
              </View>
            </View>
            <View style={styles.formRow}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Gasto com funcionarios</Text>
                <TextInput
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor="#8C8FB3"
                  style={styles.input}
                  value={String(currentData.funcionarios)}
                  onChangeText={(value) => updateField('funcionarios', value)}
                />
                {formErrors.funcionarios ? (
                  <Text style={styles.errorText}>{formErrors.funcionarios}</Text>
                ) : null}
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Faturamento total</Text>
                <TextInput
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor="#8C8FB3"
                  style={styles.input}
                  value={String(currentData.faturamentoTotal)}
                  onChangeText={(value) => updateField('faturamentoTotal', value)}
                />
                {formErrors.faturamentoTotal ? (
                  <Text style={styles.errorText}>{formErrors.faturamentoTotal}</Text>
                ) : null}
              </View>
            </View>

            {saveMessage ? <Text style={styles.saveMessage}>{saveMessage}</Text> : null}

            <Pressable
              style={({ pressed }) => [
                styles.saveButton,
                pressed ? styles.saveButtonPressed : null,
              ]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#F4F2FF" />
              ) : (
                <Text style={styles.saveButtonText}>Salvar mes</Text>
              )}
            </Pressable>
          </View>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#0B0B1A',
  },
  bgGlow: {
    position: 'absolute',
    width: 380,
    height: 380,
    borderRadius: 190,
    backgroundColor: '#2C2F7A',
    top: -140,
    right: -120,
    opacity: 0.45,
  },
  bgGlowAlt: {
    position: 'absolute',
    width: 420,
    height: 420,
    borderRadius: 210,
    backgroundColor: '#4C1D95',
    bottom: -200,
    left: -140,
    opacity: 0.35,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
    alignSelf: 'center',
    width: '100%',
    maxWidth: 1100,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  headerStack: {
    flexDirection: 'column',
    gap: 12,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  kicker: {
    color: '#A9ACD9',
    textTransform: 'uppercase',
    fontSize: 13,
    letterSpacing: 2,
    fontWeight: '600',
  },
  title: {
    fontSize: 32,
    color: '#F4F2FF',
    fontFamily: 'Avenir Next',
    fontWeight: '800',
    marginTop: 4,
    letterSpacing: 0.5,
  },
  email: {
    color: '#C7C9E6',
    marginTop: 8,
    fontSize: 14,
    fontWeight: '500',
  },
  signOut: {
    backgroundColor: '#7C5CFF',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  signOutFull: {
    alignSelf: 'flex-start',
  },
  signOutText: {
    color: '#F2EEFF',
    fontWeight: '700',
  },
  selector: {
    backgroundColor: '#121427',
    borderRadius: 14,
    padding: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#232651',
  },
  selectorLabel: {
    color: '#B4B8E6',
    marginBottom: 10,
  },
  monthChip: {
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 14,
    backgroundColor: '#0E1026',
    borderWidth: 1,
    borderColor: '#242857',
    marginRight: 8,
  },
  monthChipActive: {
    backgroundColor: '#7C5CFF',
    borderColor: '#7C5CFF',
  },
  monthChipPressed: {
    opacity: 0.85,
  },
  monthText: {
    color: '#C2C6F3',
    fontWeight: '600',
  },
  monthTextActive: {
    color: '#F3F1FF',
    fontWeight: '700',
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  loadingText: {
    color: '#B4B8E6',
  },
  cards: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  card: {
    backgroundColor: '#141732',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2B2F63',
  },
  cardLabel: {
    color: '#9EA4DB',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    fontWeight: '600',
    marginBottom: 8,
  },
  cardValue: {
    color: '#F4F2FF',
    fontSize: 22,
    fontFamily: 'Avenir Next',
    fontWeight: '800',
  },
  charts: {
    marginTop: 28,
  },
  sectionTitle: {
    color: '#E5E2FF',
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 16,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  chartGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 20,
  },
  lineChartWrapper: {
    flex: 1,
    minWidth: 420,
  },
  form: {
    marginTop: 24,
    backgroundColor: '#121427',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#232651',
  },
  formTitle: {
    color: '#E5E2FF',
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 16,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  formRow: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
  },
  inputGroup: {
    flex: 1,
    minWidth: 220,
    marginBottom: 12,
  },
  inputLabel: {
    color: '#A7ABDE',
    marginBottom: 8,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  input: {
    backgroundColor: '#0E1026',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2B2F63',
    padding: 12,
    color: '#F5F2FF',
  },
  errorText: {
    color: '#FF9BC2',
    fontSize: 12,
    marginTop: 6,
  },
  saveMessage: {
    color: '#B4B8E6',
    marginBottom: 10,
  },
  saveButton: {
    backgroundColor: '#7C5CFF',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  saveButtonPressed: {
    opacity: 0.9,
  },
  saveButtonText: {
    color: '#F4F2FF',
    fontWeight: '700',
    fontSize: 16,
  },
});
