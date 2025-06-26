// Jest test - using global test functions
import React from 'react';
import { render, screen } from '@testing-library/react';

interface TestComponentProps {
  title: string;
}

const TestComponent = ({ title }: TestComponentProps) => {
  return <h1>{title}</h1>;
};

describe('TestComponent', () => {
  it('renders the title', () => {
    render(<TestComponent title="Hello, World!" />);
    expect(screen.getByRole('heading')).toHaveTextContent('Hello, World!');
  });
});