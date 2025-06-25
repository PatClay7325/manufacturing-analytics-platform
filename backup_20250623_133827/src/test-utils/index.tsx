import React, { ReactElement } from 'react';
import { render as testingLibraryRender, RenderOptions } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Define wrapper provider types
interface WrapperProps {
  children: React.ReactNode;
}

// Custom wrapper component that would include providers if needed
function Wrapper({ children }: WrapperProps) {
  return <>{children}</>;
}

// Custom render method
function render(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) {
  return {
    ...testingLibraryRender(ui, { wrapper: Wrapper, ...options }),
    user: userEvent.setup(),
  };
}

// Re-export everything from testing-library
export * from '@testing-library/react';

// Override render method
export { render, userEvent };

// Export test utilities
export * from './factories';
export * from './mocks';