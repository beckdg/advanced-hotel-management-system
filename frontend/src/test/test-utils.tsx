import { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { TestProviders } from './test-providers';

export function renderWithProviders(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'> & { initialEntries?: string[] },
) {
  const { initialEntries, ...renderOptions } = options ?? {};
  return render(ui, {
    wrapper: ({ children }) => (
      <TestProviders initialEntries={initialEntries}>{children}</TestProviders>
    ),
    ...renderOptions,
  });
}
