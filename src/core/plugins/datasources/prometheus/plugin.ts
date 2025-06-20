/**
 * Prometheus Data Source Plugin Definition
 */

import { createDataSourcePlugin } from '../../sdk';
import { PrometheusDataSource } from './PrometheusDataSource';
import PrometheusQueryEditor from './PrometheusQueryEditor';
import PrometheusConfigEditor from './PrometheusConfigEditor';

export const plugin = createDataSourcePlugin(PrometheusDataSource)
  .setId('prometheus')
  .setName('Prometheus')
  .setDescription('Open source time series database & alerting')
  .setQueryEditor(PrometheusQueryEditor)
  .setConfigEditor(PrometheusConfigEditor)
  .setAnnotations(true)
  .setMetrics(true)
  .setAlerting(true)
  .setStreaming(false)
  .setBackend(true)
  .setQueryOptions({
    maxDataPoints: true,
    minInterval: true,
    cacheTimeout: true,
  })
  .addRoute({
    path: 'api/v1/query',
    method: 'POST',
    reqRole: 'Viewer',
  })
  .addRoute({
    path: 'api/v1/query_range',
    method: 'POST',
    reqRole: 'Viewer',
  })
  .addRoute({
    path: 'api/v1/series',
    method: 'POST',
    reqRole: 'Viewer',
  })
  .addRoute({
    path: 'api/v1/labels',
    method: 'POST',
    reqRole: 'Viewer',
  })
  .addRoute({
    path: 'api/v1/query_exemplars',
    method: 'POST',
    reqRole: 'Viewer',
  })
  .addRoute({
    path: '/rules',
    method: 'GET',
    reqRole: 'Viewer',
  })
  .addRoute({
    path: '/rules',
    method: 'POST',
    reqRole: 'Editor',
  })
  .addRoute({
    path: '/rules',
    method: 'DELETE',
    reqRole: 'Editor',
  })
  .addRoute({
    path: '/config/v1/rules',
    method: 'DELETE',
    reqRole: 'Editor',
  })
  .addRoute({
    path: '/config/v1/rules',
    method: 'POST',
    reqRole: 'Editor',
  })
  .build();