'use client';

import React, { useCallback, useMemo } from 'react';
import { Responsive, WidthProvider, Layout } from 'react-grid-layout';
import { Panel } from '@/types/dashboard';
import PanelFrame from './PanelFrame';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

const ResponsiveGridLayout = WidthProvider(Responsive);

interface GridLayoutProps {
  panels?: Panel[];
  onLayoutChange?: (panels?: Panel[]) => void;
  onPanelClick?: (panel?: Panel) => void;
  onPanelDelete?: (panelId?: number) => void;
  onPanelDuplicate?: (panel?: Panel) => void;
  selectedPanelId?: number;
  isViewMode?: boolean;
}

export default function GridLayout({
  panels,
  onLayoutChange,
  onPanelClick,
  onPanelDelete,
  onPanelDuplicate,
  selectedPanelId,
  isViewMode = false
}: GridLayoutProps) {
  // Convert panels to grid layout format
  const layouts = useMemo(() => {
    const layout: Layout[] = (panels || [])
      .filter(panel => panel && panel.gridPos)
      .map(panel => ({
        i: panel.id.toString(),
        x: panel.gridPos?.x || 0,
        y: panel.gridPos?.y || 0,
        w: panel.gridPos?.w || 12,
        h: panel.gridPos?.h || 9,
        minW: 2,
        minH: 2,
        static: isViewMode
      }));
    
    return { lg: layout, md: layout, sm: layout };
  }, [panels, isViewMode]);

  // Handle layout changes
  const handleLayoutChange = useCallback((currentLayout: Layout[]) => {
    if (isViewMode) return;

    const updatedPanels = panels?.map(panel => {
      const layoutItem = currentLayout?.find(item => item?.i === panel?.id.toString());
      if (layoutItem) {
        return {
          ...panel,
          gridPos: {
            x: layoutItem.x,
            y: layoutItem.y,
            w: layoutItem.w,
            h: layoutItem.h
          }
        };
      }
      return panel;
    });

    onLayoutChange(updatedPanels);
  }, [panels, onLayoutChange, isViewMode]);

  return (
    <div className="dashboard-grid">
      <ResponsiveGridLayout
        className="layout"
        layouts={layouts}
        onLayoutChange={handleLayoutChange}
        breakpoints={{ lg: 1200, md: 996, sm: 768 }}
        cols={{ lg: 24, md: 24, sm: 12 }}
        rowHeight={30}
        margin={[8, 8]}
        containerPadding={[0, 0]}
        isDraggable={!isViewMode}
        isResizable={!isViewMode}
        draggableHandle=".panel-header"
        resizeHandles={['se', 'e', 's']}
      >
        {(panels || [])
          .filter(panel => panel && panel.gridPos)
          .map(panel => (
            <div key={panel.id.toString()} className="grid-item">
              <PanelFrame
                panel={panel}
                isSelected={selectedPanelId === panel.id}
                isViewMode={isViewMode}
                onClick={() => onPanelClick(panel)}
                onDelete={() => onPanelDelete(panel.id)}
                onDuplicate={() => onPanelDuplicate(panel)}
              />
            </div>
          ))}
      </ResponsiveGridLayout>

      <style jsx global>{`
        .dashboard-grid {
          width: 100%;
          min-height: 100%;
        }

        .react-grid-layout {
          position: relative;
        }

        .react-grid-item {
          transition: all 200ms ease;
          transition-property: left, top, width, height;
        }

        .react-grid-item?.cssTransforms {
          transition-property: transform, width, height;
        }

        .react-grid-item?.resizing {
          z-index: 100;
          will-change: width, height;
        }

        .react-grid-item?.dragging {
          transition: none;
          z-index: 100;
          will-change: transform;
        }

        .react-grid-item?.dropping {
          visibility: hidden;
        }

        .react-grid-item .react-resizable-handle {
          position: absolute;
          width: 20px;
          height: 20px;
          background: transparent;
        }

        .react-grid-item .react-resizable-handle::after {
          content: '';
          position: absolute;
          right: 3px;
          bottom: 3px;
          width: 5px;
          height: 5px;
          border-right: 2px solid rgba(255, 255, 255, 0.4);
          border-bottom: 2px solid rgba(255, 255, 255, 0.4);
        }

        .react-grid-item .react-resizable-handle-se {
          bottom: 0;
          right: 0;
          cursor: se-resize;
        }

        .react-grid-item .react-resizable-handle-e {
          right: 0;
          top: 50%;
          transform: translateY(-50%);
          cursor: e-resize;
          height: 60%;
        }

        .react-grid-item .react-resizable-handle-s {
          bottom: 0;
          left: 50%;
          transform: translateX(-50%);
          cursor: s-resize;
          width: 60%;
        }

        .react-grid-placeholder {
          background: rgba(59, 130, 246, 0.15);
          border: 2px dashed rgba(59, 130, 246, 0.5);
          border-radius: 8px;
          transition-duration: 100ms;
          z-index: 2;
          user-select: none;
        }

        .grid-item {
          width: 100%;
          height: 100%;
        }
      `}</style>
    </div>
  );
}