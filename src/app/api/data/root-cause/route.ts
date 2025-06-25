import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const timeRange = searchParams.get('timeRange') || '7d';
    const issueType = searchParams.get('issueType') || 'quality';
    
    // Calculate time range
    const now = new Date();
    let startTime = new Date();
    
    switch (timeRange) {
      case '24h':
        startTime.setDate(now.getDate() - 1);
        break;
      case '7d':
        startTime.setDate(now.getDate() - 7);
        break;
      case '30d':
        startTime.setDate(now.getDate() - 30);
        break;
      default:
        startTime.setDate(now.getDate() - 7);
    }
    
    // Fetch relevant data based on issue type
    let rootCauseData: any = {
      issueType,
      timeRange: {
        start: startTime.toISOString(),
        end: now.toISOString()
      },
      categories: {}
    };
    
    if (issueType === 'quality' || issueType === 'all') {
      // Fetch quality issues
      const qualityMetrics = await prisma.qualityMetric.findMany({
        where: {
          timestamp: {
            gte: startTime,
            lte: now
          },
          isWithinSpec: false
        },
        include: {
          WorkUnit: {
            select: {
              name: true,
              code: true,
              equipmentType: true
            }
          }
        }
      });
      
      // Categorize quality issues
      const qualityCategories = {
        measurement: [],
        material: [],
        method: [],
        machine: [],
        manpower: [],
        environment: []
      };
      
      qualityMetrics.forEach(metric => {
        const issue = {
          parameter: metric.parameter,
          deviation: metric.deviation,
          equipment: metric.WorkUnit.name,
          timestamp: metric.timestamp,
          shift: metric.shift,
          inspector: metric.inspector
        };
        
        // Categorize based on patterns
        if (metric.deviation && Math.abs(metric.deviation) > 2) {
          qualityCategories.machine.push({
            ...issue,
            cause: 'Equipment calibration issue'
          });
        }
        
        if (metric.shift === 'C') { // Night shift
          qualityCategories.manpower.push({
            ...issue,
            cause: 'Night shift training needed'
          });
        }
        
        if (metric.parameter?.includes('Dimension')) {
          qualityCategories.measurement.push({
            ...issue,
            cause: 'Measurement system variation'
          });
        }
      });
      
      rootCauseData.categories.quality = qualityCategories;
    }
    
    if (issueType === 'downtime' || issueType === 'all') {
      // Fetch alerts and maintenance records
      const [alerts, maintenanceRecords] = await Promise.all([
        prisma.alert.findMany({
          where: {
            timestamp: {
              gte: startTime,
              lte: now
            }
          },
          include: {
            WorkUnit: {
              select: {
                name: true,
                code: true
              }
            }
          }
        }),
        prisma.maintenanceRecord.findMany({
          where: {
            startTime: {
              gte: startTime,
              lte: now
            }
          },
          include: {
            WorkUnit: {
              select: {
                name: true,
                code: true
              }
            }
          }
        })
      ]);
      
      // Categorize downtime causes
      const downtimeCategories = {
        equipment: [],
        maintenance: [],
        material: [],
        process: [],
        utilities: [],
        other: []
      };
      
      alerts.forEach(alert => {
        const issue = {
          title: alert.title,
          description: alert.message || alert.description,
          equipment: alert.WorkUnit?.name,
          severity: alert.severity,
          timestamp: alert.timestamp
        };
        
        switch (alert.alertType) {
          case 'EQUIPMENT_FAILURE':
            downtimeCategories.equipment.push({
              ...issue,
              cause: 'Equipment mechanical failure'
            });
            break;
          case 'MAINTENANCE_REQUIRED':
            downtimeCategories.maintenance.push({
              ...issue,
              cause: 'Missed preventive maintenance'
            });
            break;
          default:
            downtimeCategories.other.push({
              ...issue,
              cause: 'Unclassified issue'
            });
        }
      });
      
      maintenanceRecords.forEach(record => {
        if (record.effectiveness !== 'successful') {
          downtimeCategories.maintenance.push({
            equipment: record.WorkUnit.name,
            maintenanceType: record.maintenanceType,
            issue: record.description,
            cause: 'Ineffective maintenance procedure',
            timestamp: record.startTime
          });
        }
      });
      
      rootCauseData.categories.downtime = downtimeCategories;
    }
    
    // Generate fishbone diagram structure
    const fishboneData = {
      problem: issueType === 'quality' ? 'Quality Defects' : 'Equipment Downtime',
      categories: []
    };
    
    Object.entries(rootCauseData.categories).forEach(([type, categories]) => {
      Object.entries(categories as any).forEach(([category, issues]) => {
        if (Array.isArray(issues) && issues.length > 0) {
          fishboneData.categories.push({
            name: category.charAt(0).toUpperCase() + category.slice(1),
            causes: issues.slice(0, 5).map((issue: any) => ({
              primary: issue.cause || 'Unknown cause',
              secondary: [
                issue.equipment || 'Unknown equipment',
                issue.parameter || issue.title || 'No description'
              ]
            }))
          });
        }
      });
    });
    
    // Statistical summary
    const summary = {
      totalIssues: 0,
      byCategory: {} as Record<string, number>,
      topCauses: [] as any[]
    };
    
    Object.values(rootCauseData.categories).forEach((typeCategories: any) => {
      Object.entries(typeCategories).forEach(([category, issues]) => {
        const count = (issues as any[]).length;
        summary.totalIssues += count;
        summary.byCategory[category] = count;
      });
    });
    
    // Get top causes
    const allCauses: Record<string, number> = {};
    Object.values(rootCauseData.categories).forEach((typeCategories: any) => {
      Object.values(typeCategories).forEach((issues: any) => {
        issues.forEach((issue: any) => {
          const cause = issue.cause || 'Unknown';
          allCauses[cause] = (allCauses[cause] || 0) + 1;
        });
      });
    });
    
    summary.topCauses = Object.entries(allCauses)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([cause, count]) => ({ cause, count, percentage: (count / summary.totalIssues) * 100 }));
    
    return NextResponse.json({
      summary,
      fishboneData,
      categories: rootCauseData.categories,
      recommendations: generateRecommendations(summary.topCauses)
    });
    
  } catch (error) {
    console.error('Error fetching root cause data:', error);
    return NextResponse.json({
      error: 'Failed to fetch root cause data',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

function generateRecommendations(topCauses: any[]): string[] {
  const recommendations = [];
  
  for (const { cause } of topCauses) {
    switch (cause) {
      case 'Equipment calibration issue':
        recommendations.push('Implement daily calibration checks and monthly verification procedures');
        break;
      case 'Night shift training needed':
        recommendations.push('Conduct specialized training sessions for night shift operators');
        break;
      case 'Equipment mechanical failure':
        recommendations.push('Increase preventive maintenance frequency for critical equipment');
        break;
      case 'Missed preventive maintenance':
        recommendations.push('Implement automated maintenance scheduling and alerts');
        break;
      case 'Measurement system variation':
        recommendations.push('Perform Gauge R&R study and implement SPC for critical measurements');
        break;
      default:
        recommendations.push(`Investigate and document root cause for: ${cause}`);
    }
  }
  
  return recommendations.slice(0, 5);
}