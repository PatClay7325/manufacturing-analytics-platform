/**
 * API endpoint to test SAP and Ignition connections
 * Used to verify system access with test queries
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSAPConnector } from '@/lib/connectors/sap-connector';
import { getIgnitionConnector } from '@/lib/connectors/ignition-connector';
import { systemStatus } from '@/config/external-systems';

interface ConnectionTestResult {
  system: string;
  configured: boolean;
  connected: boolean;
  testQuery: string;
  result: any;
  error?: string;
  latency?: number;
  timestamp: Date;
}

export async function GET(request: NextRequest) {
  const results: ConnectionTestResult[] = [];
  
  // Test SAP Connection
  const sapStartTime = Date.now();
  const sapResult: ConnectionTestResult = {
    system: 'SAP',
    configured: systemStatus.sap.configured,
    connected: false,
    testQuery: 'PM_EQUIPMENT_GET_LIST (Get equipment master data)',
    result: null,
    timestamp: new Date(),
  };

  if (systemStatus.sap.configured) {
    try {
      const sapConnector = getSAPConnector();
      
      // Test connection
      const connected = await sapConnector.testConnection();
      sapResult.connected = connected;
      
      if (connected) {
        // Execute test query
        const equipment = await sapConnector.getEquipmentList();
        sapResult.result = {
          success: true,
          recordCount: equipment.length,
          sampleData: equipment.slice(0, 2),
        };
        sapResult.latency = Date.now() - sapStartTime;
      }
    } catch (error) {
      sapResult.error = error instanceof Error ? error.message : 'Unknown error';
      sapResult.result = { success: false };
    }
  } else {
    sapResult.error = 'SAP not configured. Add SAP_* environment variables.';
  }

  results.push(sapResult);

  // Test Ignition Connection
  const ignitionStartTime = Date.now();
  const ignitionResult: ConnectionTestResult = {
    system: 'Ignition',
    configured: systemStatus.ignition.configured,
    connected: false,
    testQuery: 'Read system tags and browse available paths',
    result: null,
    timestamp: new Date(),
  };

  if (systemStatus.ignition.configured) {
    try {
      const ignitionConnector = getIgnitionConnector();
      
      // Test connection
      await ignitionConnector.connect();
      const connected = await ignitionConnector.testConnection();
      ignitionResult.connected = connected;
      
      if (connected) {
        // Execute test queries
        const testTags = [
          '[System]Gateway/Performance/CPU Usage',
          '[System]Gateway/Performance/Memory Usage',
        ];
        
        const tags = await ignitionConnector.readTags(testTags);
        const rootPaths = await ignitionConnector.browseTags('/');
        
        ignitionResult.result = {
          success: true,
          systemTags: tags.map(tag => ({
            path: tag.path,
            value: tag.value,
            quality: tag.quality,
          })),
          availablePaths: rootPaths.slice(0, 5),
          totalPaths: rootPaths.length,
        };
        ignitionResult.latency = Date.now() - ignitionStartTime;
      }
    } catch (error) {
      ignitionResult.error = error instanceof Error ? error.message : 'Unknown error';
      ignitionResult.result = { success: false };
    }
  } else {
    ignitionResult.error = 'Ignition not configured. Add IGNITION_* environment variables.';
  }

  results.push(ignitionResult);

  // Summary
  const summary = {
    timestamp: new Date(),
    totalSystems: 2,
    configured: results.filter(r => r.configured).length,
    connected: results.filter(r => r.connected).length,
    results,
    recommendations: generateRecommendations(results),
  };

  return NextResponse.json(summary, {
    status: summary.connected === 0 ? 503 : 200,
  });
}

function generateRecommendations(results: ConnectionTestResult[]): string[] {
  const recommendations: string[] = [];

  for (const result of results) {
    if (!result.configured) {
      recommendations.push(
        `Configure ${result.system} by adding required environment variables to .env.local`
      );
    } else if (!result.connected) {
      recommendations.push(
        `Check ${result.system} connection settings and ensure the system is accessible`
      );
      if (result.error?.includes('timeout')) {
        recommendations.push(
          `${result.system} connection timeout - check network connectivity and firewall rules`
        );
      }
    } else if (result.latency && result.latency > 1000) {
      recommendations.push(
        `${result.system} response time is slow (${result.latency}ms) - consider optimizing queries or network`
      );
    }
  }

  if (recommendations.length === 0) {
    recommendations.push('All systems configured and connected successfully!');
  }

  return recommendations;
}

// POST endpoint for testing specific queries
export async function POST(request: NextRequest) {
  const { system, query, parameters } = await request.json();
  
  if (!system || !query) {
    return NextResponse.json(
      { error: 'System and query are required' },
      { status: 400 }
    );
  }

  try {
    let result: any;
    
    if (system.toLowerCase() === 'sap') {
      const sapConnector = getSAPConnector();
      
      switch (query) {
        case 'equipment':
          result = await sapConnector.getEquipmentList(parameters?.plant);
          break;
        case 'workOrders':
          result = await sapConnector.getWorkOrders(
            parameters?.equipmentNumber,
            parameters?.dateFrom ? new Date(parameters.dateFrom) : undefined
          );
          break;
        case 'productionOrder':
          if (!parameters?.orderNumber) {
            throw new Error('Order number is required');
          }
          result = await sapConnector.getProductionOrder(parameters.orderNumber);
          break;
        default:
          throw new Error(`Unknown SAP query: ${query}`);
      }
    } else if (system.toLowerCase() === 'ignition') {
      const ignitionConnector = getIgnitionConnector();
      await ignitionConnector.connect();
      
      switch (query) {
        case 'readTags':
          if (!parameters?.tagPaths || !Array.isArray(parameters.tagPaths)) {
            throw new Error('Tag paths array is required');
          }
          result = await ignitionConnector.readTags(parameters.tagPaths);
          break;
        case 'tagHistory':
          if (!parameters?.tagPaths || !parameters?.startTime || !parameters?.endTime) {
            throw new Error('Tag paths, start time, and end time are required');
          }
          result = await ignitionConnector.getTagHistory(
            parameters.tagPaths,
            new Date(parameters.startTime),
            new Date(parameters.endTime)
          );
          break;
        case 'alarms':
          result = await ignitionConnector.getActiveAlarms(parameters?.source);
          break;
        case 'browse':
          result = await ignitionConnector.browseTags(parameters?.path || '/');
          break;
        case 'namedQuery':
          if (!parameters?.queryPath) {
            throw new Error('Query path is required');
          }
          result = await ignitionConnector.executeNamedQuery(
            parameters.queryPath,
            parameters.parameters || {}
          );
          break;
        default:
          throw new Error(`Unknown Ignition query: ${query}`);
      }
    } else {
      throw new Error(`Unknown system: ${system}`);
    }

    return NextResponse.json({
      success: true,
      system,
      query,
      parameters,
      result,
      timestamp: new Date(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        system,
        query,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date(),
      },
      { status: 500 }
    );
  }
}