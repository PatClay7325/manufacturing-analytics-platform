import React from 'react';

export interface CardProps {
  title: string;
  children: React.ReactNode;
  className?: string;
  headerClassName?: string;
  bodyClassName?: string;
  footer?: React.ReactNode;
  footerClassName?: string;
  onClick?: () => void;
}

/**
 * Card component for displaying content in a bordered container
 */
export const Card: React.FC<CardProps> = ({
  title,
  children,
  className = '',
  headerClassName = '',
  bodyClassName = '',
  footer,
  footerClassName = '',
  onClick,
}) => {
  return (
    <div 
      className={`rounded-lg border border-gray-200 bg-white shadow-sm ${className}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      data-testid="card"
    >
      <div className={`border-b border-gray-200 px-4 py-3 ${headerClassName}`}>
        <h3 className="text-lg font-medium" data-testid="card-title">{title}</h3>
      </div>
      <div className={`p-4 ${bodyClassName}`} data-testid="card-body">
        {children}
      </div>
      {footer && (
        <div className={`border-t border-gray-200 px-4 py-3 ${footerClassName}`} data-testid="card-footer">
          {footer}
        </div>
      )}
    </div>
  );
};

export default Card;