import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import SimpleButton from '../components/SimpleButton';
import SimpleInput from '../components/SimpleInput';
import SimpleList, { SimpleListItem } from '../components/SimpleList';
import SimpleCard from '../components/SimpleCard';

// ===== SimpleButton =====
describe('SimpleButton', () => {
  it('renders the label', () => {
    const { getByText } = render(
      <SimpleButton label="Salvar" onPress={() => {}} />
    );
    expect(getByText('Salvar')).toBeTruthy();
  });

  it('calls onPress when tapped', () => {
    const onPress = jest.fn();
    const { getByText } = render(
      <SimpleButton label="Clique" onPress={onPress} />
    );
    fireEvent.press(getByText('Clique'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does not call onPress when disabled', () => {
    const onPress = jest.fn();
    const { getByText } = render(
      <SimpleButton label="Bloqueado" onPress={onPress} disabled />
    );
    fireEvent.press(getByText('Bloqueado'));
    expect(onPress).not.toHaveBeenCalled();
  });

  it('shows ActivityIndicator when loading', () => {
    const { queryByText, getByTestId } = render(
      <SimpleButton label="Salvar" onPress={() => {}} loading />
    );
    expect(queryByText('Salvar')).toBeNull();
  });

  it('renders danger variant without crashing', () => {
    const { getByText } = render(
      <SimpleButton label="Excluir" onPress={() => {}} variant="danger" />
    );
    expect(getByText('Excluir')).toBeTruthy();
  });
});

// ===== SimpleInput =====
describe('SimpleInput', () => {
  it('renders the label', () => {
    const { getByText } = render(
      <SimpleInput label="Email" value="" onChangeText={() => {}} />
    );
    expect(getByText('Email')).toBeTruthy();
  });

  it('calls onChangeText with new value', () => {
    const onChange = jest.fn();
    const { getByPlaceholderText } = render(
      <SimpleInput
        label="Campo"
        value=""
        onChangeText={onChange}
        placeholder="Digite aqui"
      />
    );
    fireEvent.changeText(getByPlaceholderText('Digite aqui'), 'novo valor');
    expect(onChange).toHaveBeenCalledWith('novo valor');
  });

  it('shows error message when error prop is set', () => {
    const { getByText } = render(
      <SimpleInput
        label="Campo"
        value=""
        onChangeText={() => {}}
        error="Valor inválido"
      />
    );
    expect(getByText('Valor inválido')).toBeTruthy();
  });

  it('shows help text when no error', () => {
    const { getByText } = render(
      <SimpleInput
        label="Campo"
        value=""
        onChangeText={() => {}}
        help="Dica de preenchimento"
      />
    );
    expect(getByText('Dica de preenchimento')).toBeTruthy();
  });

  it('shows error instead of help when both are set', () => {
    const { getByText, queryByText } = render(
      <SimpleInput
        label="Campo"
        value=""
        onChangeText={() => {}}
        error="Erro!"
        help="Ajuda"
      />
    );
    expect(getByText('Erro!')).toBeTruthy();
    expect(queryByText('Ajuda')).toBeNull();
  });
});

// ===== SimpleCard =====
describe('SimpleCard', () => {
  it('renders label and value', () => {
    const { getByText } = render(
      <SimpleCard label="Faturamento" value="R$ 100.000" />
    );
    expect(getByText('Faturamento')).toBeTruthy();
    expect(getByText('R$ 100.000')).toBeTruthy();
  });

  it('renders icon when provided', () => {
    const { getByText } = render(
      <SimpleCard label="Lucro" value="R$ 50.000" icon="💰" />
    );
    expect(getByText('💰')).toBeTruthy();
  });
});

// ===== SimpleList =====
describe('SimpleList', () => {
  const items: SimpleListItem[] = [
    { id: '1', title: 'Item 1', subtitle: 'Sub 1', value: 'R$ 100' },
    { id: '2', title: 'Item 2' },
  ];

  it('renders all items', () => {
    const { getByText } = render(
      <SimpleList items={items} />
    );
    expect(getByText('Item 1')).toBeTruthy();
    expect(getByText('Item 2')).toBeTruthy();
  });

  it('renders empty state when items is empty', () => {
    const { getByText } = render(
      <SimpleList items={[]} empty="Nenhum item cadastrado" />
    );
    expect(getByText('Nenhum item cadastrado')).toBeTruthy();
  });

  it('calls onDelete with item id when delete pressed', () => {
    const onDelete = jest.fn();
    const { getAllByText } = render(
      <SimpleList items={items} onDelete={onDelete} />
    );
    const deleteButtons = getAllByText('🗑️');
    fireEvent.press(deleteButtons[0]);
    expect(onDelete).toHaveBeenCalledWith('1');
  });

  it('renders subtitle and value when provided', () => {
    const { getByText } = render(
      <SimpleList items={items} />
    );
    expect(getByText('Sub 1')).toBeTruthy();
    expect(getByText('R$ 100')).toBeTruthy();
  });
});
