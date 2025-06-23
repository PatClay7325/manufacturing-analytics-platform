import { notFound } from 'next/navigation';
import { DashboardViewer } from '@/components/dashboard/DashboardViewer';
import type { Dashboard } from '@/types/dashboard';


// Force dynamic rendering because: Uses dynamic params and searchParams
export const dynamic = 'force-dynamic';
interface DashboardPageProps {
  params: Promise<{ uid: string; slug: string[] }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

async function loadDashboard(uid: string): Promise<Dashboard | null> {
  if (uid === 'server-side-demo') {
    return {
      uid: 'server-side-demo',
      id: 'server-side-demo', 
      title: 'Server-Side Manufacturing Demo',
      description: 'A dashboard created and managed entirely server-side',
      tags: ['server-side', 'manufacturing', 'demo'],
      panels: [
        {
          id: 1,
          title: 'Equipment Status',
          type: 'stat',
          gridPos: { x: 0, y: 0, w: 6, h: 8 },
          targets: [{ refId: 'A', metric: 'equipment_status' }],
          fieldConfig: { defaults: {}, overrides: [] },
          options: {},
          transparent: false,
          links: [],
          transformations: []
        }
      ],
      templating: { list: [] },
      annotations: [],
      links: [],
      time: { from: 'now-6h', to: 'now' },
      timepicker: {},
      refresh: '30s',
      schemaVersion: 30,
      version: 1,
      timezone: 'browser',
      fiscalYearStartMonth: 0,
      liveNow: false,
      weekStart: 'monday',
      style: 'dark',
      editable: true,
      hideControls: false,
      graphTooltip: 1,
      preload: false,
      meta: { canEdit: true, canSave: true, canStar: true }
    };
  }
  return null;
}

export default async function DashboardByUidPage({ params, searchParams }: DashboardPageProps) {
  const { uid } = await params;
  const resolvedSearchParams = await searchParams;
  
  const dashboard = await loadDashboard(uid);
  
  if (!dashboard) {
    notFound();
  }

  const timeRange = {
    from: (resolvedSearchParams.from as string) || dashboard.time?.from || 'now-6h',
    to: (resolvedSearchParams.to as string) || dashboard.time?.to || 'now',
  };
  
  const refresh = (resolvedSearchParams.refresh as string) || dashboard.refresh;
  const editMode = resolvedSearchParams.editview !== undefined;
  const viewPanel = resolvedSearchParams.viewPanel as string;
  const editPanel = resolvedSearchParams.editPanel as string;
  const kiosk = resolvedSearchParams.kiosk as string;
  
  const variables = Object.entries(resolvedSearchParams)
    .filter(([key]) => key.startsWith('var-'))
    .reduce((acc, [key, value]) => {
      const varName = key.replace('var-', '');
      acc[varName] = Array.isArray(value) ? value : value;
      return acc;
    }, {} as Record<string, any>);

  const viewerClassName = kiosk ? `kiosk-mode kiosk-mode-${kiosk}` : '';

  return (
    <div className={`h-screen ${viewerClassName}`}>
      <DashboardViewer
        dashboard={dashboard}
        timeRange={timeRange}
        refresh={refresh}
        variables={variables}
        editMode={editMode}
        viewPanel={viewPanel}
        editPanel={editPanel}
        kiosk={kiosk}
      />
    </div>
  );
}