/**
 * Fast Query Processor for Manufacturing Data
 * Optimized for quick responses without complex analysis
 */

import { prisma } from '@/lib/database/prisma';

export interface FastQueryResult {
  queryType: string;
  data: any;
  executionTime: number;
}

export async function processFastQuery(query: string): Promise<FastQueryResult> {
  const startTime = Date.now();
  const queryLower = query.toLowerCase();
  
  try {
    // Quick department/site query
    if (queryLower.includes('department') || queryLower.includes('site') || queryLower.includes('area')) {
      const [sites, areas, workCenters] = await Promise.all([
        prisma.manufacturingSite.findMany({
          select: {
            siteName: true,
            siteCode: true,
            timezone: true
          }
        }),
        prisma.manufacturingArea.findMany({
          select: {
            areaName: true,
            areaCode: true,
            site: {
              select: { siteName: true }
            }
          }
        }),
        prisma.workCenter.findMany({
          select: {
            workCenterName: true,
            workCenterCode: true,
            area: {
              select: { 
                areaName: true,
                site: { select: { siteName: true } }
              }
            }
          }
        })
      ]);
      
      return {
        queryType: 'organizational_structure',
        data: {
          sites: sites.map(s => ({ name: s.siteName, code: s.siteCode, timezone: s.timezone })),
          areas: areas.map(a => ({ name: a.areaName, code: a.areaCode, site: a.site?.siteName })),
          workCenters: workCenters.map(w => ({ 
            name: w.workCenterName, 
            code: w.workCenterCode, 
            area: w.area?.areaName,
            site: w.area?.site?.siteName 
          })),
          summary: `You have ${sites.length} manufacturing sites, ${areas.length} areas, and ${workCenters.length} work centers.`
        },
        executionTime: Date.now() - startTime
      };
    }
    
    // Quick equipment query
    if (queryLower.includes('equipment') || queryLower.includes('machine')) {
      const equipment = await prisma.equipment.findMany({
        where: { isActive: true },
        select: {
          equipmentName: true,
          equipmentCode: true,
          equipmentType: true,
          workCenter: {
            select: {
              workCenterName: true,
              area: {
                select: { areaName: true }
              }
            }
          }
        }
      });
      
      return {
        queryType: 'equipment_list',
        data: {
          equipment: equipment.map(e => ({
            name: e.equipmentName,
            code: e.equipmentCode,
            type: e.equipmentType,
            location: `${e.workCenter?.area?.areaName} - ${e.workCenter?.workCenterName}`
          })),
          summary: `You have ${equipment.length} active machines across different work centers.`,
          types: [...new Set(equipment.map(e => e.equipmentType))]
        },
        executionTime: Date.now() - startTime
      };
    }
    
    // Quick OEE summary
    if (queryLower.includes('oee') && (queryLower.includes('summary') || queryLower.includes('overall'))) {
      const recentOEE = await prisma.factOeeMetric.findMany({
        where: {
          timestamp: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
          }
        },
        select: {
          oee: true,
          availability: true,
          performance: true,
          quality: true,
          equipment: {
            select: { equipmentName: true }
          }
        }
      });
      
      if (recentOEE.length === 0) {
        return {
          queryType: 'oee_summary',
          data: {
            summary: 'No OEE data available for the last 24 hours.',
            metrics: {}
          },
          executionTime: Date.now() - startTime
        };
      }
      
      const avgOEE = recentOEE.reduce((sum, m) => sum + Number(m.oee), 0) / recentOEE.length;
      const avgAvail = recentOEE.reduce((sum, m) => sum + Number(m.availability), 0) / recentOEE.length;
      const avgPerf = recentOEE.reduce((sum, m) => sum + Number(m.performance), 0) / recentOEE.length;
      const avgQual = recentOEE.reduce((sum, m) => sum + Number(m.quality), 0) / recentOEE.length;
      
      return {
        queryType: 'oee_summary',
        data: {
          summary: `Overall OEE: ${(avgOEE * 100).toFixed(1)}% (Last 24h)`,
          metrics: {
            oee: Number((avgOEE * 100).toFixed(1)),
            availability: Number((avgAvail * 100).toFixed(1)),
            performance: Number((avgPerf * 100).toFixed(1)),
            quality: Number((avgQual * 100).toFixed(1))
          },
          dataPoints: recentOEE.length,
          equipment: [...new Set(recentOEE.map(m => m.equipment?.equipmentName))].filter(Boolean)
        },
        executionTime: Date.now() - startTime
      };
    }
    
    // Default: provide general overview
    const [equipmentCount, recentDataCount] = await Promise.all([
      prisma.equipment.count({ where: { isActive: true } }),
      prisma.factOeeMetric.count({
        where: {
          timestamp: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
          }
        }
      })
    ]);
    
    return {
      queryType: 'general_overview',
      data: {
        summary: `Manufacturing system overview: ${equipmentCount} active machines with ${recentDataCount} recent data points.`,
        equipmentCount,
        recentDataCount,
        suggestion: "Try asking about OEE, equipment status, or departments for more specific information."
      },
      executionTime: Date.now() - startTime
    };
    
  } catch (error) {
    console.error('Fast query processor error:', error);
    return {
      queryType: 'error',
      data: {
        summary: 'Unable to process query quickly.',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      executionTime: Date.now() - startTime
    };
  }
}