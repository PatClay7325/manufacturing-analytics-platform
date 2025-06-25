/**
 * AnalyticsPlatform Panel Chrome - Panel Container Component
 * Adapted from @analyticsPlatform/ui for Next.js manufacturing analyticsPlatform
 */

import { ReactElement, ReactNode, useState, useCallback, useId, CSSProperties } from 'react';
import { clsx } from 'clsx';
import { ChevronDownIcon, ChevronRightIcon, EllipsisVerticalIcon } from '@heroicons/react/24/outline';

export type PanelPadding = 'none' | 'md';

export type LoadingState = 'NotStarted' | 'Loading' | 'Streaming' | 'Done' | 'Error';

export interface PanelChromeProps {
  width?: number;
  height?: number;
  children: ReactNode | ((innerWidth: number, innerHeight: number) => ReactNode);
  padding?: PanelPadding;
  title?: string | ReactElement;
  description?: string | (() => string);
  titleItems?: ReactNode;
  menu?: ReactElement | (() => ReactElement);
  dragClass?: string;
  dragClassCancel?: string;
  onDragStart?: (e: React.PointerEvent) => void;
  selectionId?: string;
  loadingState?: LoadingState;
  statusMessage?: string;
  statusMessageOnClick?: (e: React.SyntheticEvent) => void;
  actions?: ReactNode;
  displayMode?: 'default' | 'transparent';
  onCancelQuery?: () => void;
  onOpenMenu?: () => void;
  onFocus?: () => void;
  onMouseMove?: () => void;
  onMouseEnter?: () => void;
  showMenuAlways?: boolean;
  collapsible?: boolean;
  collapsed?: boolean;
  onToggleCollapse?: (collapsed: boolean) => void;
  hoverHeader?: boolean;
  hoverHeaderOffset?: number;
  className?: string;
}

export function PanelChrome({
  width,
  height,
  children,
  padding = 'md',
  title = '',
  description = '',
  displayMode = 'default',
  titleItems,
  menu,
  dragClass,
  dragClassCancel,
  hoverHeader = false,
  hoverHeaderOffset,
  loadingState,
  statusMessage,
  statusMessageOnClick,
  actions,
  selectionId,
  onCancelQuery,
  onOpenMenu,
  collapsible = false,
  collapsed: controlledCollapsed,
  onToggleCollapse,
  onFocus,
  onMouseMove,
  onMouseEnter,
  onDragStart,
  showMenuAlways = false,
  className
}: PanelChromeProps) {
  const panelContentId = useId();
  const panelTitleId = useId().replace(/:/g, '_');
  
  // Internal collapsed state for uncontrolled mode
  const [internalCollapsed, setInternalCollapsed] = useState(false);
  const collapsed = controlledCollapsed ?? internalCollapsed;

  // Highlight state for selection
  const [selectableHighlight, setSelectableHighlight] = useState(false);
  const onHeaderEnter = useCallback(() => setSelectableHighlight(true), []);
  const onHeaderLeave = useCallback(() => setSelectableHighlight(false), []);

  const hasHeader = !hoverHeader;
  const isPanelTransparent = displayMode === 'transparent';
  const showOnHoverClass = showMenuAlways ? 'always-show' : 'show-on-hover';

  // Calculate dimensions
  const headerHeight = hasHeader ? 40 : 0; // Fixed height for simplicity
  const chromePadding = padding === 'md' ? 16 : 0;
  const panelPadding = chromePadding * 2;
  const panelBorder = 2;

  let innerWidth = 0;
  if (width) {
    innerWidth = width - panelPadding - panelBorder;
  }

  let innerHeight = 0;
  if (height) {
    innerHeight = height - headerHeight - panelPadding - panelBorder;
  }

  if (collapsed) {
    innerHeight = 0;
  }

  const containerStyles: CSSProperties = {
    width: width ? `${width}px` : undefined,
    height: collapsed ? `${headerHeight}px` : height ? `${height}px` : undefined
  };

  const contentStyle: CSSProperties = {
    padding: chromePadding
  };

  const headerStyles: CSSProperties = {
    height: headerHeight,
    cursor: dragClass ? 'move' : 'auto'
  };

  // Handle collapse toggle
  const handleToggleCollapse = useCallback(() => {
    const newCollapsed = !collapsed;
    setInternalCollapsed(newCollapsed);
    onToggleCollapse?.(newCollapsed);
  }, [collapsed, onToggleCollapse]);

  // Handle drag and selection
  const handlePointerDown = useCallback((evt: React.PointerEvent) => {
    evt.stopPropagation();
    onDragStart?.(evt);
  }, [onDragStart]);

  const handleContentPointerDown = useCallback((evt: React.PointerEvent) => {
    // Ignore clicks inside buttons, links, etc.
    if (evt.target instanceof Element && evt.target.closest('button,a,canvas,svg')) {
      return;
    }
    // Handle selection if needed
  }, []);

  const testid = typeof title === 'string' ? `panel-${title}` : 'panel';

  const renderTitleContent = () => (
    <div className="flex items-center flex-1 min-w-0">
      {/* Non-collapsible title */}
      {!collapsible && title && (
        <div className="flex-1 min-w-0 px-3">
          <h2 
            className="text-sm font-medium text-gray-900 truncate" 
            id={panelTitleId}
            title={typeof title === 'string' ? title : undefined}
          >
            {title}
          </h2>
        </div>
      )}

      {/* Collapsible title */}
      {collapsible && (
        <div className="flex-1 min-w-0">
          <button
            type="button"
            className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-gray-900 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 rounded"
            onClick={handleToggleCollapse}
            aria-expanded={!collapsed}
            aria-controls={!collapsed ? panelContentId : undefined}
          >
            {!collapsed ? (
              <ChevronDownIcon className="w-4 h-4 text-gray-500" />
            ) : (
              <ChevronRightIcon className="w-4 h-4 text-gray-500" />
            )}
            <span className="truncate" id={panelTitleId}>
              {title}
            </span>
          </button>
        </div>
      )}
    </div>
  );

  const renderHeaderContent = () => (
    <>
      {renderTitleContent()}
      
      <div className={clsx('flex items-center', dragClassCancel)}>
        {/* Description tooltip */}
        {description && typeof description === 'string' && (
          <div className="px-2" title={description}>
            <div className="w-4 h-4 text-gray-400">ℹ️</div>
          </div>
        )}
        
        {/* Title items */}
        {titleItems && (
          <div className="flex items-center">
            {titleItems}
          </div>
        )}
        
        {/* Loading indicator */}
        {loadingState === 'Streaming' && (
          <div className="px-2">
            <div 
              className="w-3 h-3 bg-green-500 rounded-full animate-pulse"
              title={onCancelQuery ? 'Stop streaming' : 'Streaming'}
              onClick={onCancelQuery}
            />
          </div>
        )}
        
        {loadingState === 'Loading' && onCancelQuery && (
          <button
            className="px-2 py-1 text-gray-400 hover:text-gray-600 focus:outline-none"
            onClick={onCancelQuery}
            title="Cancel query"
          >
            ⏹️
          </button>
        )}
        
        {/* Actions */}
        {actions && (
          <div className="flex items-center gap-1 px-2">
            {Array.isArray(actions) ? actions.map((action, index) => (
              <div key={index}>{action}</div>
            )) : actions}
          </div>
        )}
      </div>
    </>
  );

  return (
    <section
      className={clsx(
        'relative flex flex-col h-full rounded-md',
        isPanelTransparent 
          ? 'bg-transparent border border-transparent hover:border-gray-200' 
          : 'bg-white border border-gray-200',
        selectableHighlight && 'ring-2 ring-primary-500 ring-opacity-50',
        showOnHoverClass === 'show-on-hover' && 'group',
        className
      )}
      style={containerStyles}
      aria-labelledby={!!title ? panelTitleId : undefined}
      data-testid={testid}
      tabIndex={0}
      onFocus={onFocus}
      onMouseMove={onMouseMove}
      onMouseEnter={onMouseEnter}
    >
      {/* Loading bar */}
      {loadingState === 'Loading' && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-gray-200 rounded-t-md overflow-hidden">
          <div className="h-full bg-primary-500 animate-pulse"></div>
        </div>
      )}

      {/* Hover header (for floating headers) */}
      {hoverHeader && (
        <div 
          className="absolute top-0 left-0 right-0 bg-white border border-gray-200 rounded-t-md shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ transform: `translateY(${hoverHeaderOffset || 0}px)` }}
        >
          <div className="flex items-center h-10 px-3">
            {renderHeaderContent()}
            {menu && (
              <PanelMenu 
                menu={menu} 
                title={typeof title === 'string' ? title : undefined}
                onOpenMenu={onOpenMenu} 
              />
            )}
          </div>
        </div>
      )}

      {/* Regular header */}
      {hasHeader && (
        <div
          className={clsx(
            'flex items-center border-b border-gray-100',
            dragClass
          )}
          style={headerStyles}
          onPointerDown={handlePointerDown}
          onMouseEnter={onHeaderEnter}
          onMouseLeave={onHeaderLeave}
        >
          {/* Status message */}
          {statusMessage && (
            <div className={clsx('px-3', dragClassCancel)}>
              <PanelStatus 
                message={statusMessage} 
                onClick={statusMessageOnClick} 
              />
            </div>
          )}

          {renderHeaderContent()}

          {/* Panel menu */}
          {menu && (
            <div className={clsx(
              'px-2',
              dragClassCancel,
              showOnHoverClass === 'show-on-hover' && 'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100'
            )}>
              <PanelMenu 
                menu={menu} 
                title={typeof title === 'string' ? title : undefined}
                onOpenMenu={onOpenMenu} 
              />
            </div>
          )}
        </div>
      )}

      {/* Panel content */}
      {!collapsed && (
        <div
          id={panelContentId}
          className="flex-1 relative"
          style={contentStyle}
          onPointerDown={handleContentPointerDown}
        >
          {typeof children === 'function' ? children(innerWidth, innerHeight) : children}
        </div>
      )}

      {/* Floating status for hover headers */}
      {hoverHeader && statusMessage && (
        <div className="absolute top-0 left-0">
          <PanelStatus message={statusMessage} onClick={statusMessageOnClick} />
        </div>
      )}
    </section>
  );
}

// Panel Status Component
interface PanelStatusProps {
  message: string;
  onClick?: (e: React.SyntheticEvent) => void;
}

function PanelStatus({ message, onClick }: PanelStatusProps) {
  return (
    <div
      className={clsx(
        'inline-flex items-center px-2 py-1 text-xs rounded',
        onClick ? 'cursor-pointer hover:bg-red-100' : '',
        'bg-red-50 text-red-700 border border-red-200'
      )}
      onClick={onClick}
      title={message}
    >
      <span className="mr-1">⚠️</span>
      <span className="truncate max-w-48">{message}</span>
    </div>
  );
}

// Panel Menu Component
interface PanelMenuProps {
  menu: ReactElement | (() => ReactElement);
  title?: string;
  onOpenMenu?: () => void;
}

function PanelMenu({ menu, title, onOpenMenu }: PanelMenuProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleToggle = useCallback(() => {
    setIsOpen(!isOpen);
    onOpenMenu?.();
  }, [isOpen, onOpenMenu]);

  return (
    <div className="relative">
      <button
        type="button"
        className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded focus:outline-none focus:ring-2 focus:ring-primary-500"
        onClick={handleToggle}
        aria-label={`Panel menu for ${title || 'panel'}`}
      >
        <EllipsisVerticalIcon className="w-4 h-4" />
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Menu content */}
          <div className="absolute right-0 top-full mt-1 z-50 bg-white border border-gray-200 rounded-md shadow-lg min-w-48">
            {typeof menu === 'function' ? menu() : menu}
          </div>
        </>
      )}
    </div>
  );
}