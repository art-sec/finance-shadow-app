/**
 * Billing Screen - Gerenciamento de Faturamento e Gastos Diários
 * Refatorado com componentes simples e intuitivos
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { collection, doc, getDocs, serverTimestamp, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import {
  LineChart,
  SimpleButton,
  SimpleInput,
  SimpleList,
  SimpleListItem,
  SimpleMetrics,
  SimpleSection,
} from '../components';

type DailyExpense = {
  date: string;
  receivedAmount: number;
  employeeCost: number;
  adsCost: number;
  adsReturn: number;
  notes?: string;
};

type Subscription = {
  id: string;
  name: string;
  cost: number;
  category: string;
  createdAt?: any;
  storagePath?: 'monthly' | 'legacy';
};

type ChartPoint = {
  label: string;
  value: number;
};

type Props = {
  selectedMonth?: string;
  userId?: string | null;
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

  // ===== CARREGAMENTO =====
  useEffect(() => {
    if (!userId || !selectedMonth) return;

    let mounted = true;

    const loadData = async () => {
      setLoadingData(true);
      setSaveMessage('');
      try {
        const dailySnapshot = await getDocs(
          collection(db, 'users', userId, 'billing', selectedMonth, 'daily')
        );

        const monthlySubsSnapshot = await getDocs(
          collection(db, 'users', userId, 'billing', selectedMonth, 'subscriptions')
        );

        // Fallback para estrutura legada (mantém compatibilidade com dados antigos)
        let legacySubsSnapshot: any = null;
        if (monthlySubsSnapshot.empty) {
          legacySubsSnapshot = await getDocs(
            collection(db, 'users', userId, 'subscriptions')
          );
        }

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

        if (!monthlySubsSnapshot.empty) {
          const subs = monthlySubsSnapshot.docs.map((docItem) => ({
            id: docItem.id,
            ...docItem.data(),
            storagePath: 'monthly',
          } as Subscription));
          setSubscriptions(subs);
        } else if (legacySubsSnapshot && !legacySubsSnapshot.empty) {
          const subs = legacySubsSnapshot.docs.map((docItem: any) => ({
            id: docItem.id,
            ...docItem.data(),
            storagePath: 'legacy',
          } as Subscription));
          setSubscriptions(subs);
        } else {
          setSubscriptions([]);
        }
      } catch (err) {
        console.error('Erro ao carregar dados:', err);
        const errorCode = (err as any)?.code;
        if (errorCode === 'permission-denied') {
          setSaveMessage('Sem permissão no Firestore para ler billing/subscriptions. Atualize as regras.');
        } else {
          setSaveMessage('Falha ao carregar dados.');
        }
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

  // ===== FUNÇÕES =====
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
      setSaveMessage('✐️ Corrija os campos antes de salvar.');
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

  const handleAddSubscription = async () => {
    if (!userId || !selectedMonth) {
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
      setSaveMessage('✐️ Corrija os campos da assinatura.');
      return;
    }

    setSavingSubscription(true);
    setSaveMessage('');

    try {
      const subId = `${Date.now()}`;
      await setDoc(
        doc(db, 'users', userId, 'billing', selectedMonth, 'subscriptions', subId),
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
      if (err?.code === 'permission-denied') {
        setSaveMessage('Erro: sem permissão para salvar assinatura. Libere users/{uid}/billing/{month}/subscriptions nas regras do Firestore.');
      } else {
        setSaveMessage(`Erro: ${err.message}`);
      }
    } finally {
      setSavingSubscription(false);
    }
  };

  const handleDeleteSubscription = async (subId: string) => {
    if (!userId || !selectedMonth) return;

    const targetSub = subscriptions.find((sub) => sub.id === subId);
    const isLegacy = targetSub?.storagePath === 'legacy';

    try {
      if (isLegacy) {
        await deleteDoc(doc(db, 'users', userId, 'subscriptions', subId));
      } else {
        await deleteDoc(doc(db, 'users', userId, 'billing', selectedMonth, 'subscriptions', subId));
      }
      setSaveMessage('✓ Assinatura removida.');
      setTimeout(() => {
        setReloadTrigger(prev => prev + 1);
        setSaveMessage('');
      }, 1000);
    } catch (err: any) {
      console.error('Erro ao deletar assinatura:', err);
      if (err?.code === 'permission-denied') {
        setSaveMessage('Erro: sem permissão para remover assinatura. Verifique as regras do Firestore.');
      } else {
        setSaveMessage(`Erro: ${err.message}`);
      }
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

  // ===== MÉTRICAS =====
  const metrics = [
    { label: 'Faturamento', value: formatCurrency(totals.totalReceived), color: '#7C5CFF', icon: '💰' },
    { label: '% Funcionários', value: formatPercentage(totals.employeePercentage), color: '#4EC5FF', icon: '👥' },
    { label: 'Lucro Líquido', value: formatCurrency(totals.netProfit), color: '#6DDFB5', icon: '📊' },
    { label: '% Lucro', value: formatPercentage(totals.profitPercentage), color: '#F59E76', icon: '📈' },
    { label: 'Assinaturas', value: formatCurrency(totals.totalSubscriptions), color: '#FF7F50', icon: '🔄' },
    { label: 'ROAS', value: formatRatio(totals.roas), color: '#F0A500', icon: '🎯' },
  ];

  // ===== LISTA DE GASTOS =====
  const dailyExpenseItems: SimpleListItem[] = dailyExpenses.map((exp) => ({
    id: exp.date,
    title: `Dia ${exp.date} - ${formatCurrency(exp.receivedAmount)}`,
    subtitle: `👥 ${formatCurrency(exp.employeeCost)} | 📢 ${formatCurrency(exp.adsCost)}`,
    value: exp.notes ? `📝 ${exp.notes}` : '',
  }));

  // ===== LISTA DE ASSINATURAS =====
  const subscriptionItems: SimpleListItem[] = subscriptions.map((sub) => ({
    id: sub.id,
    title: sub.name,
    subtitle: sub.category,
    value: formatCurrency(sub.cost),
  }));

  // ===== RENDER =====
  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {/* Cabeçalho */}
        <SimpleSection title="Faturamento e Gastos" icon="📊">
          <Text style={styles.subtitle}>Gastos diários de {selectedMonth}</Text>
        </SimpleSection>

        {/* Carregando */}
        {loadingData && (
          <SimpleSection title="">
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#4CAF50" />
              <Text style={styles.loadingText}>Carregando gastos...</Text>
            </View>
          </SimpleSection>
        )}

        {/* Métricas */}
        <SimpleSection title="Sumário do Mês" icon="📈">
          <SimpleMetrics metrics={metrics} columns={2} />
        </SimpleSection>

        {/* Gráficos */}
        {dailyExpenses.length > 0 && (
          <SimpleSection title="Tendências Diárias" icon="📉">
            <View style={styles.chartsGrid}>
              <View style={styles.chart}>
                <LineChart title="Faturamento Diário" points={receivedSeries} color="#4CAF50" />
              </View>
              <View style={styles.chart}>
                <LineChart title="Gastos Diários" points={expenseSeries} color="#F44336" />
              </View>
              <View style={styles.chart}>
                <LineChart title="Lucro Diário" points={profitSeries} color="#FF9800" />
              </View>
            </View>
          </SimpleSection>
        )}

        {/* Formulário de Gasto Diário */}
        <SimpleSection title="Registrar Novo Gasto" icon="➕">
          <View style={styles.formGrid}>
            <View style={styles.formRow}>
              <SimpleInput
                label="Dia"
                placeholder="01-31"
                keyboardType="numeric"
                value={currentDay}
                onChangeText={setCurrentDay}
                error={formErrors.date}
                help={formErrors.date}
              />
              <SimpleInput
                label="Faturamento"
                placeholder="Ex: 5000"
                keyboardType="numeric"
                value={currentReceived}
                onChangeText={setCurrentReceived}
                error={formErrors.receivedAmount}
                help={formErrors.receivedAmount}
              />
            </View>

            <View style={styles.formRow}>
              <SimpleInput
                label="Gasto com Funcionários"
                placeholder="Ex: 1000"
                keyboardType="numeric"
                value={currentEmployeeCost}
                onChangeText={setCurrentEmployeeCost}
                error={formErrors.employeeCost}
                help={formErrors.employeeCost}
              />
              <SimpleInput
                label="Gasto com Anúncios"
                placeholder="Ex: 500"
                keyboardType="numeric"
                value={currentAdsCost}
                onChangeText={setCurrentAdsCost}
                error={formErrors.adsCost}
                help={formErrors.adsCost}
              />
            </View>

            <SimpleInput
              label="Retorno dos Anúncios"
              placeholder="Ex: 2000"
              keyboardType="numeric"
              value={currentAdsReturn}
              onChangeText={setCurrentAdsReturn}
              error={formErrors.adsReturn}
              help={formErrors.adsReturn}
            />

            <SimpleInput
              label="Observações (Opcional)"
              placeholder="Ex: Dia com vendas extras"
              value={currentNotes}
              onChangeText={setCurrentNotes}
            />

            {saveMessage && (
              <Text style={[styles.message, saveMessage.includes('sucesso') ? styles.successMessage : styles.errorMessage]}>
                {saveMessage}
              </Text>
            )}

            <SimpleButton
              label="💾 Adicionar Gasto"
              onPress={handleAddDaily}
              disabled={saving}
              loading={saving}
              size="large"
            />
          </View>
        </SimpleSection>

        {/* Lista de Gastos */}
        {dailyExpenses.length > 0 && (
          <SimpleSection title="Gastos Registrados" icon="📋">
            <SimpleList
              items={dailyExpenseItems}
              onDelete={handleDeleteDaily}
              empty="Nenhum gasto registrado"
            />
          </SimpleSection>
        )}

        {/* Formulário de Assinatura */}
        <SimpleSection title="Assinaturas Mensais" icon="🔄">
          <View style={styles.formGrid}>
            <SimpleInput
              label="Nome da Assinatura"
              placeholder="Ex: Adobe, Netflix"
              value={subName}
              onChangeText={setSubName}
              error={subFormErrors.name}
              help={subFormErrors.name}
            />

            <View style={styles.formRow}>
              <SimpleInput
                label="Custo Mensal"
                placeholder="Ex: 99"
                keyboardType="numeric"
                value={subCost}
                onChangeText={setSubCost}
                error={subFormErrors.cost}
                help={subFormErrors.cost}
              />
              <SimpleInput
                label="Categoria"
                placeholder="Ex: software"
                value={subCategory}
                onChangeText={setSubCategory}
              />
            </View>

            <SimpleButton
              label="➕ Adicionar Assinatura"
              onPress={handleAddSubscription}
              disabled={savingSubscription}
              loading={savingSubscription}
              size="large"
            />
          </View>
        </SimpleSection>

        {/* Lista de Assinaturas */}
        {subscriptions.length > 0 && (
          <SimpleSection title="Assinaturas Ativas" icon="✓">
            <SimpleList
              items={subscriptionItems}
              onDelete={handleDeleteSubscription}
              empty="Nenhuma assinatura"
            />
          </SimpleSection>
        )}
      </ScrollView>
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
  subtitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#A9ACD9',
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
  },
  formRow: {
    flexDirection: 'row',
    gap: 12,
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
  errorMessage: {
    color: '#FF9BC2',
  },
});
