// Jest test - using global test functions
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import Card, { CardProps } from '../../components/common/Card';

describe('Card Component', () => {
  const defaultProps: CardProps = {
    title: 'Test Card',
    children: <p>Test content</p>,
  };

  it('renders correctly with default props', () => {
    render(<Card {...defaultProps} />);
    
    // Check if the title is rendered
    expect(screen.getByTestId('card-title')).toHaveTextContent('Test Card');
    
    // Check if the content is rendered
    expect(screen.getByTestId('card-body')).toHaveTextContent('Test content');
    
    // Footer should not be present
    expect(screen.queryByTestId('card-footer')).not.toBeInTheDocument();
  });

  it('renders with custom className', () => {
    render(<Card {...defaultProps} className="custom-class" />);
    
    // Check if the custom class is applied
    expect(screen.getByTestId('card')).toHaveClass('custom-class');
  });

  it('renders with footer when provided', () => {
    render(
      <Card {...defaultProps} footer={<button>Action</button>} />
    );
    
    // Footer should be present
    const footer = screen.getByTestId('card-footer');
    expect(footer).toBeInTheDocument();
    expect(footer).toHaveTextContent('Action');
  });

  it('calls onClick when clicked', () => {
    const handleClick = jest.fn();
    render(<Card {...defaultProps} onClick={handleClick} />);
    
    // Click the card
    fireEvent.click(screen.getByTestId('card'));
    
    // Check if the handler was called
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('has proper accessibility attributes when clickable', () => {
    const handleClick = jest.fn();
    render(<Card {...defaultProps} onClick={handleClick} />);
    
    const card = screen.getByTestId('card');
    
    // Should have role="button" and tabIndex=0 when onClick is provided
    expect(card).toHaveAttribute('role', 'button');
    expect(card).toHaveAttribute('tabIndex', '0');
  });

  it('does not have button role when not clickable', () => {
    render(<Card {...defaultProps} />);
    
    const card = screen.getByTestId('card');
    
    // Should not have role="button" or tabIndex when onClick is not provided
    expect(card).not.toHaveAttribute('role', 'button');
    expect(card).not.toHaveAttribute('tabIndex');
  });
});