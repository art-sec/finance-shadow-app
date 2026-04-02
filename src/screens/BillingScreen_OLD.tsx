/**
 * Billing Screen - Gerenciamento de Faturamento e Gastos Diários
 * 
 * Este componente mostra:
 * - Registro de gastos diários (funcionários, anúncios, faturamento)
 * - Assinaturas mensais pré-definidas
 * - Lista de transações do mês
 * - Cálculos de percentuais (% gastos com funcionários, % lucro)
 * - Totalizadores diários e mensais
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
import { collection, doc, getDocs, serverTimestamp, setDoc, deleteDoc, query, where } from 'firebase/firestore';
import { db } from '../firebase/config';
import LineChart from '../components/LineChart';

/**
 * Tipo para gasto diário
 */
type DailyExpense = {
  date: string;                    // Formato: DD (01-31)
  receivedAmount: number;          // Faturamento do dia
  employeeCost: number;            // Gasto com funcionários
  adsCost: number;                 // Gasto com anúncios
  adsReturn: number;               // Retorno dos anúncios
  notes?: string;                  // Observações opcionais
};

/**
 * Tipo para assinatura mensal
 */
type Subscription = {
  id: string;                      // ID da assinatura
  name: string;                    // Nome da assinatura (ex: Adobe, Netflix)
  cost: number;                    // Custo mensal
  category: string;                // Categoria (software, streaming, etc)
  createdAt?: any;
};

/**
 * Tipo para um ponto no gráfico
 */
type ChartPoint = {
  label: string;
  value: number;
};

/**
 * Props do componente
 */
type Props = {
  selectedMonth?: string;          // Mês selecionado (Jan, Fev, etc)
  userId?: string | null;          // ID do usuário (UID do Firebase)
};

export default function BillingScreen({ selectedMonth = 'Jan', userId }: Props) {
  // ===== ESTADOS =====
  const [dailyExpenses, setDailyExpenses] = useState<DailyExpense[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof DailyExpense, string>>>({});
  const [reloadTrigger, setReloadTrigger] = useState(0);
  
  // Formulário de gasto diário
  const [currentDay, setCurrentDay] = useState('01');
  const [currentReceived, setCurrentReceived] = useState('0');
  const [currentEmployeeCost, setCurrentEmployeeCost] = useState('0');
  const [currentAdsCost, setCurrentAdsCost] = useState('0');
  const [currentAdsReturn, setCurrentAdsReturn] = useState('0');
  const [currentNotes, setCurrentNotes] = useState('');
  
  // Formulário de assinatura
  const [subName, setSubName] = useState('');
  const [subCost, setSubCost] = useState('0');
  const [subCategory, setSubCategory] = useState('software');
  const [subFormErrors, setSubFormErrors] = useState<Partial<Record<keyof Subscription, string>>>({});
  const [savingSubscription, setSavingSubscription] = useState(false);
  
  // ===== DIMENSÕES =====
  const { width } = useWindowDimensions();
  const isMobile = width < 700;
  const isTablet = width >= 700 && width < 1100;
  const maxContentWidth = 1180;
  const contentHorizontalPadding = isMobile ? 12 : isTablet ? 18 : 24;
  const availableWidth = Math.min(width, maxContentWidth) - contentHorizontalPadding * 2;
  const columns = width >= 1180 ? 3 : width >= 760 ? 2 : 1;
  const cardWidth = columns === 1 ? '100%' : (availableWidth - (columns - 1) * 12) / columns;
  const chartColumns = width >= 980 ? 2 : 1;
  const chartWidth = chartColumns === 1 ? '100%' : (availableWidth - (chartColumns - 1) * 16) / chartColumns;

  // ===== ANIMAÇÕES =====
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(16)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  // ===== CARREGAMENTO =====
  useEffect(() => {
    if (!userId || !selectedMonth) return;

    let mounted = true;

    const loadData = async () => {
      setLoadingData(true);
      setSaveMessage('');
      try {
        // Carregar gastos diários
        const dailySnapshot = await getDocs(
          collection(db, 'users', userId, 'billing', selectedMonth, 'daily')
        );
        
        // Carregar assinaturas
        const subsSnapshot = await getDocs(
          collection(db, 'users', userId, 'subscriptions')
        );
        
        if (!mounted) return;
        
        if (!dailySnapshot.empty) {
          const expenses = dailySnapshot.docs
            .map((docItem) => ({
              date: docItem.id,
              ...docItem.data(),
            } as DailyExpense))
            .sort((a, b) => parseInt(a.date) - parseInt(b.date));
          setDailyExpenses(expenses);
        } else {
          setDailyExpenses([]);
        }

        if (!subsSnapshot.empty) {
          const subs = subsSnapshot.docs.map((docItem) => ({
            id: docItem.id,
            ...docItem.data(),
          } as Subscription));
          setSubscriptions(subs);
        } else {
          setSubscriptions([]);
        }
      } catch (err) {
        console.error('Erro ao carregar dados:', err);
        setSaveMessage('Falha ao carregar dados.');
        setDailyExpenses([]);
        setSubscriptions([]);
      } finally {
        if (mounted) setLoadingData(false);
      }
    };

    loadData();
    return () => { mounted = false; };
  }, [userId, selectedMonth, reloadTrigger]);

  // ===== CÁLCULOS =====
  const totals = useMemo(() => {
    const totalReceived = dailyExpenses.reduce((sum, exp) => sum + (exp.receivedAmount || 0), 0);
    const totalEmployeeCost = dailyExpenses.reduce((sum, exp) => sum + (exp.employeeCost || 0), 0);
    const totalAdsCost = dailyExpenses.reduce((sum, exp) => sum + (exp.adsCost || 0), 0);
    const totalAdsReturn = dailyExpenses.reduce((sum, exp) => sum + (exp.adsReturn || 0), 0);
    const totalSubscriptions = subscriptions.reduce((sum, sub) => sum + (sub.cost || 0), 0);
    const totalCost = totalEmployeeCost + totalAdsCost + totalSubscriptions;
    const netProfit = totalReceived - totalCost;
    const employeePercentage = totalReceived > 0 ? (totalEmployeeCost / totalReceived) * 100 : 0;
    const profitPercentage = totalReceived > 0 ? (netProfit / totalReceived) * 100 : 0;
    const roas = totalAdsCost > 0 ? totalAdsReturn / totalAdsCost : 0;

    return { totalReceived, totalEmployeeCost, totalAdsCost, totalAdsReturn, totalSubscriptions, totalCost, netProfit, employeePercentage, profitPercentage, roas };
  }, [dailyExpenses, subscriptions]);

  // ===== FORMATAÇÕES =====
  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(value);
  const formatPercentage = (value: number) => `${value.toFixed(1)}%`;
  const formatRatio = (value: number) => `${value.toFixed(2)}x`;

  // ===== VALIDAÇÃO =====
  const validateExpense = (expense: DailyExpense) => {
    const errors: Partial<Record<keyof DailyExpense, string>> = {};
    if (!expense.date || !/^\d{2}$/.test(expense.date)) {
      errors.date = 'Dia deve estar em DD (01-31).';
    }
    const fields: Array<'receivedAmount' | 'employeeCost' | 'adsCost' | 'adsReturn'> = [
      'receivedAmount', 'employeeCost', 'adsCost', 'adsReturn',
    ];
    fields.forEach((field) => {
      const value = expense[field];
      if (!Number.isFinite(value) || value < 0) {
        errors[field] = 'Use números positivos.';
      } else if (value > 1000000000) {
        errors[field] = 'Valor muito alto.';
      }
    });
    return errors;
  };

  // ===== SALVAR =====
  const handleAddDaily = async () => {
    if (!userId || !selectedMonth) {
      setSaveMessage('Erro: Usuário ou mês não definido.');
      return;
    }

    const newExpense: DailyExpense = {
      date: currentDay.padStart(2, '0'),
      receivedAmount: Number(currentReceived) || 0,
      employeeCost: Number(currentEmployeeCost) || 0,
      adsCost: Number(currentAdsCost) || 0,
      adsReturn: Number(currentAdsReturn) || 0,
      notes: currentNotes || undefined,
    };

    const errors = validateExpense(newExpense);
    setFormErrors(errors);
    
    if (Object.keys(errors).length > 0) {
      setSaveMessage('Corrija os campos antes de salvar.');
      return;
    }

    setSaving(true);
    setSaveMessage('');
    
    try {
      await setDoc(
        doc(db, 'users', userId, 'billing', selectedMonth, 'daily', newExpense.date),
        { ...newExpense, updatedAt: serverTimestamp() },
        { merge: true }
      );

      setSaveMessage('✓ Gasto registrado com sucesso.');
      setCurrentDay('01');
      setCurrentReceived('0');
      setCurrentEmployeeCost('0');
      setCurrentAdsCost('0');
      setCurrentAdsReturn('0');
      setCurrentNotes('');
      
      setTimeout(() => {
        setReloadTrigger(prev => prev + 1);
        setSaveMessage('');
      }, 1000);
    } catch (err: any) {
      console.error('Erro ao salvar gasto:', err);
      setSaveMessage(`Erro: ${err.message || 'Tente novamente'}`);
    } finally {
      setSaving(false);
    }
  };

  // ===== DELETAR =====
  const handleDeleteDaily = async (date: string) => {
    if (!userId || !selectedMonth) return;

    try {
      await deleteDoc(doc(db, 'users', userId, 'billing', selectedMonth, 'daily', date));
      setSaveMessage('✓ Gasto removido.');
      setTimeout(() => {
        setReloadTrigger(prev => prev + 1);
        setSaveMessage('');
      }, 1000);
    } catch (err: any) {
      console.error('Erro ao deletar gasto:', err);
      setSaveMessage(`Erro: ${err.message}`);
    }
  };

  // ===== ASSINATURAS =====
  const validateSubscription = (sub: Partial<Subscription>) => {
    const errors: Partial<Record<keyof Subscription, string>> = {};
    if (!sub.name || sub.name.trim().length === 0) {
      errors.name = 'Nome é obrigatório.';
    }
    if (!Number.isFinite(sub.cost) || (sub.cost || 0) <= 0) {
      errors.cost = 'Custo deve ser maior que zero.';
    }
    return errors;
  };

  const handleAddSubscription = async () => {
    if (!userId) {
      setSaveMessage('Erro: Usuário não definido.');
      return;
    }

    const newSub: Partial<Subscription> = {
      name: subName.trim(),
      cost: Number(subCost) || 0,
      category: subCategory,
    };

    const errors = validateSubscription(newSub);
    setSubFormErrors(errors);
    
    if (Object.keys(errors).length > 0) {
      setSaveMessage('Corrija os campos da assinatura.');
      return;
    }

    setSavingSubscription(true);
    setSaveMessage('');
    
    try {
      const subId = `${Date.now()}`;
      await setDoc(
        doc(db, 'users', userId, 'subscriptions', subId),
        {
          name: newSub.name,
          cost: newSub.cost,
          category: newSub.category,
          createdAt: serverTimestamp(),
        }
      );

      setSaveMessage('✓ Assinatura adicionada com sucesso.');
      setSubName('');
      setSubCost('0');
      setSubCategory('software');
      
      setTimeout(() => {
        setReloadTrigger(prev => prev + 1);
        setSaveMessage('');
      }, 1000);
    } catch (err: any) {
      console.error('Erro ao salvar assinatura:', err);
      setSaveMessage(`Erro: ${err.message}`);
    } finally {
      setSavingSubscription(false);
    }
  };

  const handleDeleteSubscription = async (subId: string) => {
    if (!userId) return;

    try {
      await deleteDoc(doc(db, 'users', userId, 'subscriptions', subId));
      setSaveMessage('✓ Assinatura removida.');
      setTimeout(() => {
        setReloadTrigger(prev => prev + 1);
        setSaveMessage('');
      }, 1000);
    } catch (err: any) {
      console.error('Erro ao deletar assinatura:', err);
      setSaveMessage(`Erro: ${err.message}`);
    }
  };

  // ===== GRÁFICOS =====
  const receivedSeries: ChartPoint[] = dailyExpenses.map((exp) => ({
    label: `D${exp.date}`,
    value: exp.receivedAmount || 0,
  }));

  const expenseSeries: ChartPoint[] = dailyExpenses.map((exp) => ({
    label: `D${exp.date}`,
    value: (exp.employeeCost || 0) + (exp.adsCost || 0),
  }));

  const profitSeries: ChartPoint[] = dailyExpenses.map((exp) => ({
    label: `D${exp.date}`,
    value: (exp.receivedAmount || 0) - ((exp.employeeCost || 0) + (exp.adsCost || 0)),
  }));

  const metrics = [
    { label: 'Faturamento total', value: formatCurrency(totals.totalReceived) },
    { label: 'Gasto funcionários', value: formatCurrency(totals.totalEmployeeCost) },
    { label: '% Funcionários', value: formatPercentage(totals.employeePercentage) },
    { label: 'Gasto anúncios', value: formatCurrency(totals.totalAdsCost) },
    { label: 'Retorno ads', value: formatCurrency(totals.totalAdsReturn) },
    { label: 'ROAS', value: formatRatio(totals.roas) },
    { label: 'Gasto assinaturas', value: formatCurrency(totals.totalSubscriptions) },
    { label: 'Lucro líquido', value: formatCurrency(totals.netProfit) },
    { label: '% Lucro', value: formatPercentage(totals.profitPercentage) },
  ];

  return (
    <View style={styles.screen}>
      <View style={styles.bgGlow} />
      <View style={styles.bgGlowAlt} />
      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingHorizontal: contentHorizontalPadding,
            paddingTop: isMobile ? 12 : 20,
            paddingBottom: isMobile ? 28 : 40,
          },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          <View style={styles.header}>
            <View>
              <Text style={styles.kicker}>Gerenciamento de Faturamento</Text>
              <Text style={[styles.title, { fontSize: isMobile ? 26 : isTablet ? 30 : 34 }]}>
                Gastos diários - {selectedMonth}
              </Text>
            </View>
          </View>

          {loadingData && (
            <View style={styles.loadingRow}>
              <ActivityIndicator color="#7C5CFF" />
              <Text style={styles.loadingText}>Carregando gastos diários...</Text>
            </View>
          )}

          <View style={styles.cards}>
            {metrics.map((metric) => (
              <View key={metric.label} style={[styles.card, { width: cardWidth, padding: isMobile ? 14 : 16 }]}>
                <Text style={styles.cardLabel}>{metric.label}</Text>
                <Text style={[styles.cardValue, { fontSize: isMobile ? 18 : 22 }]}>{metric.value}</Text>
              </View>
            ))}
          </View>

          {dailyExpenses.length > 0 && (
            <View style={styles.charts}>
              <Text style={[styles.sectionTitle, { fontSize: isMobile ? 15 : 17 }]}>
                Tendências diárias
              </Text>
              <View style={styles.chartGrid}>
                <View style={[styles.lineChartWrapper, { width: chartWidth }]}>
                  <LineChart title="Faturamento diário" points={receivedSeries} color="#7C5CFF" />
                </View>
                <View style={[styles.lineChartWrapper, { width: chartWidth }]}>
                  <LineChart title="Gastos diários" points={expenseSeries} color="#FF7F50" />
                </View>
                <View style={[styles.lineChartWrapper, { width: chartWidth }]}>
                  <LineChart title="Lucro diário" points={profitSeries} color="#6DDFB5" />
                </View>
              </View>
            </View>
          )}

          <View style={[styles.form, { padding: isMobile ? 14 : 16 }]}>
            <Text style={[styles.formTitle, { fontSize: isMobile ? 15 : 17 }]}>
              Registrar novo gasto diário
            </Text>
            
            <View style={[styles.formRow, isMobile ? styles.formRowStack : null]}>
              <View style={[styles.inputGroup, isMobile ? styles.inputGroupMobile : null]}>
                <Text style={styles.inputLabel}>Dia</Text>
                <TextInput
                  keyboardType="numeric"
                  placeholder="01"
                  placeholderTextColor="#8C8FB3"
                  style={[styles.input, { padding: isMobile ? 10 : 12 }]}
                  value={currentDay}
                  onChangeText={setCurrentDay}
                  maxLength={2}
                />
                {formErrors.date && <Text style={styles.errorText}>{formErrors.date}</Text>}
              </View>

              <View style={[styles.inputGroup, isMobile ? styles.inputGroupMobile : null]}>
                <Text style={styles.inputLabel}>Faturamento</Text>
                <TextInput
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor="#8C8FB3"
                  style={[styles.input, { padding: isMobile ? 10 : 12 }]}
                  value={currentReceived}
                  onChangeText={setCurrentReceived}
                />
                {formErrors.receivedAmount && <Text style={styles.errorText}>{formErrors.receivedAmount}</Text>}
              </View>
            </View>

            <View style={[styles.formRow, isMobile ? styles.formRowStack : null]}>
              <View style={[styles.inputGroup, isMobile ? styles.inputGroupMobile : null]}>
                <Text style={styles.inputLabel}>Gasto funcionários</Text>
                <TextInput
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor="#8C8FB3"
                  style={[styles.input, { padding: isMobile ? 10 : 12 }]}
                  value={currentEmployeeCost}
                  onChangeText={setCurrentEmployeeCost}
                />
                {formErrors.employeeCost && <Text style={styles.errorText}>{formErrors.employeeCost}</Text>}
              </View>

              <View style={[styles.inputGroup, isMobile ? styles.inputGroupMobile : null]}>
                <Text style={styles.inputLabel}>Gasto anúncios</Text>
                <TextInput
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor="#8C8FB3"
                  style={[styles.input, { padding: isMobile ? 10 : 12 }]}
                  value={currentAdsCost}
                  onChangeText={setCurrentAdsCost}
                />
                {formErrors.adsCost && <Text style={styles.errorText}>{formErrors.adsCost}</Text>}
              </View>
            </View>

            <View style={[styles.formRow, isMobile ? styles.formRowStack : null]}>
              <View style={[styles.inputGroup, isMobile ? styles.inputGroupMobile : null]}>
                <Text style={styles.inputLabel}>Retorno anúncios</Text>
                <TextInput
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor="#8C8FB3"
                  style={[styles.input, { padding: isMobile ? 10 : 12 }]}
                  value={currentAdsReturn}
                  onChangeText={setCurrentAdsReturn}
                />
                {formErrors.adsReturn && <Text style={styles.errorText}>{formErrors.adsReturn}</Text>}
              </View>

              <View style={[styles.inputGroup, isMobile ? styles.inputGroupMobile : null]}>
                <Text style={styles.inputLabel}>Observações</Text>
                <TextInput
                  placeholder="Opcional"
                  placeholderTextColor="#8C8FB3"
                  style={[styles.input, { padding: isMobile ? 10 : 12 }]}
                  value={currentNotes}
                  onChangeText={setCurrentNotes}
                />
              </View>
            </View>

            {saveMessage && <Text style={styles.saveMessage}>{saveMessage}</Text>}

            <Pressable
              style={({ pressed }) => [
                styles.saveButton,
                pressed ? styles.saveButtonPressed : null,
              ]}
              onPress={handleAddDaily}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#F4F2FF" />
              ) : (
                <Text style={styles.saveButtonText}>Adicionar gasto</Text>
              )}
            </Pressable>
          </View>

          {dailyExpenses.length > 0 && (
            <View style={[styles.listContainer, { padding: isMobile ? 14 : 16 }]}>
              <Text style={[styles.formTitle, { fontSize: isMobile ? 15 : 17 }]}>
                Gastos registrados
              </Text>
              {dailyExpenses.map((expense) => (
                <View key={expense.date} style={styles.listItem}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.listItemDay}>Dia {expense.date}</Text>
                    <View style={styles.listItemDetails}>
                      <Text style={styles.listItemText}>
                        Faturamento: {formatCurrency(expense.receivedAmount)}
                      </Text>
                      <Text style={styles.listItemText}>
                        Func.: {formatCurrency(expense.employeeCost)} | Ads: {formatCurrency(expense.adsCost)}
                      </Text>
                      {expense.notes && <Text style={styles.listItemNote}>{expense.notes}</Text>}
                    </View>
                  </View>
                  <Pressable
                    style={({ pressed }) => [
                      styles.deleteButton,
                      pressed && styles.deleteButtonPressed,
                    ]}
                    onPress={() => handleDeleteDaily(expense.date)}
                  >
                    <Text style={styles.deleteButtonText}>×</Text>
                  </Pressable>
                </View>
              ))}
            </View>
          )}

          {/* Seção de Assinaturas */}
          <View style={[styles.form, { padding: isMobile ? 14 : 16, marginTop: 24 }]}>
            <Text style={[styles.formTitle, { fontSize: isMobile ? 15 : 17 }]}>
              Assinaturas mensais
            </Text>
            
            <View style={[styles.formRow, isMobile ? styles.formRowStack : null]}>
              <View style={[styles.inputGroup, isMobile ? styles.inputGroupMobile : null]}>
                <Text style={styles.inputLabel}>Nome da assinatura</Text>
                <TextInput
                  placeholder="Ex: Adobe, Netflix"
                  placeholderTextColor="#8C8FB3"
                  style={[styles.input, { padding: isMobile ? 10 : 12 }]}
                  value={subName}
                  onChangeText={setSubName}
                />
                {subFormErrors.name && <Text style={styles.errorText}>{subFormErrors.name}</Text>}
              </View>

              <View style={[styles.inputGroup, isMobile ? styles.inputGroupMobile : null]}>
                <Text style={styles.inputLabel}>Custo mensal</Text>
                <TextInput
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor="#8C8FB3"
                  style={[styles.input, { padding: isMobile ? 10 : 12 }]}
                  value={subCost}
                  onChangeText={setSubCost}
                />
                {subFormErrors.cost && <Text style={styles.errorText}>{subFormErrors.cost}</Text>}
              </View>

              <View style={[styles.inputGroup, isMobile ? styles.inputGroupMobile : null]}>
                <Text style={styles.inputLabel}>Categoria</Text>
                <TextInput
                  placeholder="software"
                  placeholderTextColor="#8C8FB3"
                  style={[styles.input, { padding: isMobile ? 10 : 12 }]}
                  value={subCategory}
                  onChangeText={setSubCategory}
                />
              </View>
            </View>

            <Pressable
              style={({ pressed }) => [
                styles.saveButton,
                pressed ? styles.saveButtonPressed : null,
              ]}
              onPress={handleAddSubscription}
              disabled={savingSubscription}
            >
              {savingSubscription ? (
                <ActivityIndicator color="#F4F2FF" />
              ) : (
                <Text style={styles.saveButtonText}>Adicionar assinatura</Text>
              )}
            </Pressable>
          </View>

          {subscriptions.length > 0 && (
            <View style={[styles.listContainer, { padding: isMobile ? 14 : 16 }]}>
              <Text style={[styles.formTitle, { fontSize: isMobile ? 15 : 17 }]}>
                Assinaturas ativas
              </Text>
              {subscriptions.map((sub) => (
                <View key={sub.id} style={styles.listItem}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.listItemDay}>{sub.name}</Text>
                    <View style={styles.listItemDetails}>
                      <Text style={styles.listItemText}>
                        {formatCurrency(sub.cost)}/mês
                      </Text>
                      <Text style={styles.listItemNote}>{sub.category}</Text>
                    </View>
                  </View>
                  <Pressable
                    style={({ pressed }) => [
                      styles.deleteButton,
                      pressed && styles.deleteButtonPressed,
                    ]}
                    onPress={() => handleDeleteSubscription(sub.id)}
                  >
                    <Text style={styles.deleteButtonText}>×</Text>
                  </Pressable>
                </View>
              ))}
            </View>
          )}
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
    alignSelf: 'center',
    width: '100%',
    maxWidth: 1180,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 20,
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
    fontWeight: '800',
    marginTop: 4,
    letterSpacing: 0.5,
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
    marginBottom: 24,
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
    fontWeight: '800',
  },
  charts: {
    marginBottom: 28,
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
    gap: 16,
  },
  lineChartWrapper: {
    maxWidth: '100%',
  },
  form: {
    marginBottom: 24,
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
  formRowStack: {
    flexDirection: 'column',
    gap: 0,
  },
  inputGroup: {
    flex: 1,
    minWidth: 220,
    marginBottom: 12,
  },
  inputGroupMobile: {
    minWidth: 0,
    width: '100%',
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
  listContainer: {
    backgroundColor: '#121427',
    borderRadius: 18,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#232651',
  },
  listItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1F2341',
  },
  listItemDay: {
    color: '#E5E2FF',
    fontWeight: '700',
    fontSize: 14,
    marginBottom: 4,
  },
  listItemDetails: {
    gap: 4,
  },
  listItemText: {
    color: '#B4B8E6',
    fontSize: 12,
  },
  listItemNote: {
    color: '#8C90B8',
    fontSize: 11,
    fontStyle: 'italic',
  },
  deleteButton: {
    backgroundColor: '#E94B5C',
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButtonPressed: {
    opacity: 0.8,
  },
  deleteButtonText: {
    color: '#F4F2FF',
    fontSize: 20,
    fontWeight: '700',
  },
});
