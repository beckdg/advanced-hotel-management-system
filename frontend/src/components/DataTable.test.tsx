import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { DataTable } from './DataTable';
import { renderWithProviders } from '@/test/test-utils';

interface Row {
  id: string;
  name: string;
  value: number;
}

const rows: Row[] = [
  { id: '1', name: 'Alpha', value: 10 },
  { id: '2', name: 'Beta', value: 20 },
];

describe('DataTable', () => {
  it('shows empty message when no data', () => {
    renderWithProviders(
      <DataTable
        data={[]}
        keyExtractor={(r) => r.id}
        columns={[{ key: 'name', header: 'Name' }]}
        emptyMessage="Nothing here"
      />,
    );
    expect(screen.getByText('Nothing here')).toBeInTheDocument();
  });

  it('renders column headers', () => {
    renderWithProviders(
      <DataTable
        data={rows}
        keyExtractor={(r) => r.id}
        columns={[
          { key: 'name', header: 'Name' },
          { key: 'value', header: 'Value' },
        ]}
      />,
    );
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Value')).toBeInTheDocument();
  });

  it('renders row data', () => {
    renderWithProviders(
      <DataTable
        data={rows}
        keyExtractor={(r) => r.id}
        columns={[{ key: 'name', header: 'Name' }]}
      />,
    );
    expect(screen.getByText('Alpha')).toBeInTheDocument();
    expect(screen.getByText('Beta')).toBeInTheDocument();
  });

  it('uses custom render function', () => {
    renderWithProviders(
      <DataTable
        data={rows}
        keyExtractor={(r) => r.id}
        columns={[{
          key: 'value',
          header: 'Value',
          render: (r) => `$${r.value}`,
        }]}
      />,
    );
    expect(screen.getByText('$10')).toBeInTheDocument();
  });
});
