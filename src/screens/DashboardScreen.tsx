/**
 * Dashboard Screen - Painel Financeiro Principal com Abas
 * 
 * Este componente mostra:
 * - Sistema de abas (Dashboard e Faturamento)
 * - Aba Dashboard: Resumo de dados financeiros mensais
 * - Aba Faturamento: Gastos diários com percentuais
 * - Gráficos de tendências
 * - Formulário para editar dados
 * - Sincronização com Firestore
 * 
 * Funcionalidades:
 * - Abas para alternar entre resumo mensal e gastos diários
 * - Carrega dados do Firestore (coleção 'finance')
 * - Permite editar faturamento, anúncios, funcionários
 * - Calcula percentuais de gastos e lucro
 * - Calcula total automaticamente
 * - Sincroniza alterações com banco de dados
 * - Responsivo para diferentes tamanhos de tela
 * - Anima elementos ao carregar
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { signOut } from 'firebase/auth';
import { collection, doc, getDocs, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import {
  LineChart,
  SimpleButton,
  SimpleCard,
  SimpleInput,
  SimpleMetrics,
  SimpleTabs,
  SimpleSection,
} from '../components';
import BillingScreen from './BillingScreen';

/**
 * Tipo para dados de um mês específico
 */
type MonthlyData = {
  month: string;
  faturamento: number;        // Receita/Faturamento
  anuncios: number;           // Gastos com anúncios
  funcionarios: number;       // Gastos com funcionários
  retornoAnuncios: number;    // Retorno financeiro dos anúncios
};

/**
 * Tipo para um ponto no gráfico
 */
type ChartPoint = {
  label: string;
  value: number;
};

/**
 * Template vazio para 12 meses
 * O usuário preenche com seus próprios dados
 */
const DATA_EMPTY: MonthlyData[] = [
  { month: 'Jan', faturamento: 0, anuncios: 0, funcionarios: 0, retornoAnuncios: 0 },
  { month: 'Fev', faturamento: 0, anuncios: 0, funcionarios: 0, retornoAnuncios: 0 },
  { month: 'Mar', faturamento: 0, anuncios: 0, funcionarios: 0, retornoAnuncios: 0 },
  { month: 'Abr', faturamento: 0, anuncios: 0, funcionarios: 0, retornoAnuncios: 0 },
  { month: 'Mai', faturamento: 0, anuncios: 0, funcionarios: 0, retornoAnuncios: 0 },
  { month: 'Jun', faturamento: 0, anuncios: 0, funcionarios: 0, retornoAnuncios: 0 },
  { month: 'Jul', faturamento: 0, anuncios: 0, funcionarios: 0, retornoAnuncios: 0 },
  { month: 'Ago', faturamento: 0, anuncios: 0, funcionarios: 0, retornoAnuncios: 0 },
  { month: 'Set', faturamento: 0, anuncios: 0, funcionarios: 0, retornoAnuncios: 0 },
  { month: 'Out', faturamento: 0, anuncios: 0, funcionarios: 0, retornoAnuncios: 0 },
  { month: 'Nov', faturamento: 0, anuncios: 0, funcionarios: 0, retornoAnuncios: 0 },
  { month: 'Dez', faturamento: 0, anuncios: 0, funcionarios: 0, retornoAnuncios: 0 },
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
  const [selectedTab, setSelectedTab] = useState<'dashboard' | 'billing'>('dashboard');
  const [selectedMonth, setSelectedMonth] = useState('Jan');
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>(DATA_EMPTY);
  const [loadingData, setLoadingData] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof MonthlyData, string>>>({});
  const [reloadTrigger, setReloadTrigger] = useState(0);

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
        
        if (snapshot.empty) {
          console.warn('Nenhum dado salvo no Firestore para este usuário.');
          // Se não há dados, usa template vazio
          setMonthlyData(DATA_EMPTY);
        } else {
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
              const retornoAnuncios = Number(data.retornoAnuncios ?? item.retornoAnuncios);
              
              // Validar e corrigir valores inválidos
              return {
                ...item,
                faturamento: Number.isFinite(faturamento) ? faturamento : item.faturamento,
                anuncios: Number.isFinite(anuncios) ? anuncios : item.anuncios,
                funcionarios: Number.isFinite(funcionarios) ? funcionarios : item.funcionarios,
                retornoAnuncios: Number.isFinite(retornoAnuncios) ? retornoAnuncios : item.retornoAnuncios,
              };
            })
          );
        }
      } catch (err) {
        console.error('Erro ao carregar dados:', err);
        setSaveMessage('Falha ao carregar dados do Firestore. Formulário vazio.');
        setMonthlyData(DATA_EMPTY);
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
  }, [userId, reloadTrigger]);

  const currentData = useMemo(() => {
    return monthlyData.find((item) => item.month === selectedMonth) ?? monthlyData[0];
  }, [monthlyData, selectedMonth]);

  const custoTotal = currentData.anuncios + currentData.funcionarios;
  const lucroLiquido = currentData.faturamento - custoTotal;
  const roas = currentData.anuncios > 0 ? currentData.retornoAnuncios / currentData.anuncios : 0;
  
  // Cálculos de percentuais
  const percentualFuncionarios = currentData.faturamento > 0 
    ? (currentData.funcionarios / currentData.faturamento) * 100 
    : 0;
  const percentualLucro = currentData.faturamento > 0 
    ? (lucroLiquido / currentData.faturamento) * 100 
    : 0;

  // Apenas 5-6 métricas principais para simplificar
  const metrics = [
    { label: 'Faturamento', value: formatCurrency(currentData.faturamento), color: '#7C5CFF', icon: '💰' },
    { label: '% Funcionários', value: `${percentualFuncionarios.toFixed(1)}%`, color: '#4EC5FF', icon: '👥' },
    { label: 'Lucro Líquido', value: formatCurrency(lucroLiquido), color: '#6DDFB5', icon: '📊' },
    { label: '% Lucro', value: `${percentualLucro.toFixed(1)}%`, color: '#F59E76', icon: '📈' },
    { label: 'Custo Total', value: formatCurrency(custoTotal), color: '#FF7F50', icon: '💸' },
    { label: 'ROAS', value: formatRatio(roas), color: '#F0A500', icon: '🎯' },
  ];

  const validateMonth = (data: MonthlyData) => {
    const errors: Partial<Record<keyof MonthlyData, string>> = {};
    const fields: Array<keyof MonthlyData> = [
      'faturamento',
      'anuncios',
      'funcionarios',
      'retornoAnuncios',
    ];

    fields.forEach((field) => {
      const value = data[field];
      if (!Number.isFinite(value) || value < 0) {
        errors[field] = 'Use apenas numeros positivos.';
      } else if (value > 1000000000) {
        errors[field] = 'Valor muito alto. Use ate 1 bilhao.';
      }
    });

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
      setSaveMessage('Usuário não autenticado.');
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
      // Cria um promise com timeout de 15 segundos
      const savePromise = setDoc(
        doc(db, 'users', userId, 'finance', currentData.month),
        {
          ...currentData,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      // Executa save com timeout
      await Promise.race([
        savePromise,
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Timeout ao salvar. Verifique sua conexão.')), 15000)
        ),
      ]);

      // Atualiza mensagem de sucesso
      setSaveMessage('✓ Dados salvos com sucesso.');
      console.log('Dados salvos com sucesso para:', currentData.month);
      
      // Recarrega dados após 1 segundo para confirmar salvamento
      setTimeout(() => {
        setReloadTrigger(prev => prev + 1);
        setSaveMessage('');
      }, 1000);
      
    } catch (err: any) {
      console.error('Erro ao salvar no Firestore:', err);
      
      // Mensagens de erro mais específicas
      if (err.code === 'permission-denied') {
        setSaveMessage('Erro: Sem permissão para salvar. Faça login novamente.');
      } else if (err.code === 'unauthenticated') {
        setSaveMessage('Erro: Você foi desconectado. Faça login novamente.');
      } else if (err.message?.includes('Timeout')) {
        setSaveMessage('Erro: Conexão com banco de dados lenta ou indisponível.');
      } else {
        setSaveMessage(`Erro ao salvar: ${err.message || 'Tente novamente'}`);
      }
    } finally {
      setSaving(false);
    }
  };

  const faturamentoSeries: ChartPoint[] = monthlyData
    .map((item) => ({
      label: item.month,
      value: Number.isFinite(item.faturamento) ? item.faturamento : 0,
    }));

  const custoSeries: ChartPoint[] = monthlyData
    .map((item) => {
      const custo = Number.isFinite(item.anuncios) && Number.isFinite(item.funcionarios) 
        ? item.anuncios + item.funcionarios 
        : 0;
      return {
        label: item.month,
        value: custo,
      };
    });

  const lucroSeries: ChartPoint[] = monthlyData
    .map((item) => {
      const lucro = Number.isFinite(item.faturamento) && Number.isFinite(item.anuncios) && Number.isFinite(item.funcionarios)
        ? item.faturamento - (item.anuncios + item.funcionarios)
        : 0;
      return {
        label: item.month,
        value: lucro,
      };
    });

  const roasSeries: ChartPoint[] = monthlyData
    .map((item) => {
      // Calcula ROAS a partir do retorno dos anúncios
      let roas = 0;
      if (Number.isFinite(item.anuncios) && Number.isFinite(item.retornoAnuncios) && item.anuncios > 0) {
        roas = item.retornoAnuncios / item.anuncios;
      }
      return {
        label: item.month,
        value: Number.isFinite(roas) ? roas : 0,
      };
    });

  return (
    <View style={styles.screen}>
      {/* Tabs de Navegação */}
      <SimpleTabs
        tabs={[
          { id: 'dashboard', label: 'Dashboard', icon: '📊' },
          { id: 'billing', label: 'Faturamento', icon: '💳' },
        ]}
        activeTab={selectedTab}
        onTabChange={(tab) => setSelectedTab(tab as 'dashboard' | 'billing')}
      />

      {selectedTab === 'dashboard' ? (
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          {/* Cabeçalho */}
          <SimpleSection title="Painel Financeiro" icon="📱">
            <View style={styles.header}>
              <View style={styles.headerInfo}>
                <Text style={styles.subtitle}>Resumo mensal</Text>
                {userEmail && <Text style={styles.email}>{userEmail}</Text>}
              </View>
              <SimpleButton
                label="Sair"
                onPress={() => signOut(auth)}
                variant="secondary"
                size="medium"
              />
            </View>
          </SimpleSection>

          {/* Seletor de Mês */}
          <SimpleSection title="Selecione o Mês" icon="📅">
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.monthScroll}>
              {monthlyData.map((item) => (
                <Pressable
                  key={item.month}
                  style={[
                    styles.monthButton,
                    selectedMonth === item.month && styles.monthButtonActive,
                  ]}
                  onPress={() => setSelectedMonth(item.month)}
                >
                  <Text
                    style={[
                      styles.monthButtonText,
                      selectedMonth === item.month && styles.monthButtonTextActive,
                    ]}
                  >
                    {item.month}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </SimpleSection>

          {/* Carregando */}
          {loadingData && (
            <SimpleSection title="">
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#4CAF50" />
                <Text style={styles.loadingText}>Carregando dados...</Text>
              </View>
            </SimpleSection>
          )}

          {/* Métricas */}
          <SimpleSection title="Métricas do Mês" icon="📈">
            <SimpleMetrics metrics={metrics} columns={2} />
          </SimpleSection>

          {/* Gráficos */}
          <SimpleSection title="Tendências Anuais" icon="📉">
            <View style={styles.chartsGrid}>
              <View style={styles.chart}>
                <LineChart title="Faturamento" points={faturamentoSeries} color="#4CAF50" />
              </View>
              <View style={styles.chart}>
                <LineChart title="Custo Total" points={custoSeries} color="#F44336" />
              </View>
              <View style={styles.chart}>
                <LineChart title="Lucro Líquido" points={lucroSeries} color="#FF9800" />
              </View>
              <View style={styles.chart}>
                <LineChart title="ROAS" points={roasSeries} color="#2196F3" />
              </View>
            </View>
          </SimpleSection>

          {/* Formulário */}
          <SimpleSection title="Atualizar Dados" icon="✏️">
            <View style={styles.formGrid}>
              <SimpleInput
                label="Faturamento"
                placeholder="Ex: 50000"
                keyboardType="numeric"
                value={String(currentData.faturamento)}
                onChangeText={(value) => updateField('faturamento', value)}
                error={!!formErrors.faturamento}
                help={formErrors.faturamento}
              />
              <SimpleInput
                label="Gasto com Anúncios"
                placeholder="Ex: 10000"
                keyboardType="numeric"
                value={String(currentData.anuncios)}
                onChangeText={(value) => updateField('anuncios', value)}
                error={!!formErrors.anuncios}
                help={formErrors.anuncios}
              />
              <SimpleInput
                label="Retorno dos Anúncios"
                placeholder="Ex: 30000"
                keyboardType="numeric"
                value={String(currentData.retornoAnuncios)}
                onChangeText={(value) => updateField('retornoAnuncios', value)}
                error={!!formErrors.retornoAnuncios}
                help={formErrors.retornoAnuncios}
              />
              <SimpleInput
                label="Gasto com Funcionários"
                placeholder="Ex: 20000"
                keyboardType="numeric"
                value={String(currentData.funcionarios)}
                onChangeText={(value) => updateField('funcionarios', value)}
                error={!!formErrors.funcionarios}
                help={formErrors.funcionarios}
              />
            </View>

            {saveMessage && (
              <Text style={[styles.message, saveMessage.includes('sucesso') && styles.successMessage]}>
                {saveMessage}
              </Text>
            )}

            <SimpleButton
              label="💾 Salvar Mês"
              onPress={handleSave}
              disabled={saving}
              loading={saving}
              size="large"
            />
          </SimpleSection>
        </ScrollView>
      ) : (
        <BillingScreen selectedMonth={selectedMonth} userId={userId} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#0B0B1A',
  },
  content: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 16,
    paddingBottom: 40,
    alignSelf: 'center',
    width: '100%',
    maxWidth: 1180,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerInfo: {
    flex: 1,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#A9ACD9',
    marginBottom: 4,
  },
  email: {
    fontSize: 14,
    color: '#8C8FB3',
  },
  monthScroll: {
    marginVertical: 8,
  },
  monthButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: '#0E1026',
    borderWidth: 2,
    borderColor: '#2B2F63',
  },
  monthButtonActive: {
    backgroundColor: '#7C5CFF',
    borderColor: '#7C5CFF',
  },
  monthButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#C2C6F3',
  },
  monthButtonTextActive: {
    color: '#F3F1FF',
    fontWeight: '700',
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 20,
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
    color: '#B4B8E6',
    fontWeight: '500',
  },
  chartsGrid: {
    gap: 16,
  },
  chart: {
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#141732',
    borderWidth: 1,
    borderColor: '#2B2F63',
  },
  formGrid: {
    gap: 16,
    marginBottom: 16,
  },
  message: {
    fontSize: 14,
    marginBottom: 12,
    textAlign: 'center',
    fontWeight: '600',
  },
  successMessage: {
    color: '#6DDFB5',
  },
});
