import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

// Simple test component
const TestComponent = () => {
  return <div data-testid="test">Hello Test</div>;
};

describe('Simple Test', () => {
  it('should render test component', () => {
    render(<TestComponent />);
    expect(screen.getByTestId('test')).toBeInTheDocument();
    expect(screen.getByText('Hello Test')).toBeInTheDocument();
  });
});