/**
 * Fast Query Processor for Manufacturing Data
 * Optimized for quick responses without complex analysis
 * Updated to use ISO-compliant schema models
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
        prisma.dimSite.findMany({
          select: {
            name: true,
            code: true,
            timezone: true
          }
        }),
        prisma.dimArea.findMany({
          select: {
            name: true,
            code: true,
            site: {
              select: { name: true }
            }
          }
        }),
        prisma.dimWorkCenter.findMany({
          select: {
            name: true,
            code: true,
            area: {
              select: { 
                name: true,
                site: { select: { name: true } }
              }
            }
          }
        })
      ]);
      
      return {
        queryType: 'organizational_structure',
        data: {
          sites: sites.map(s => ({ name: s.name, code: s.code, timezone: s.timezone })),
          areas: areas.map(a => ({ name: a.name, code: a.code, site: a.site?.name })),
          workCenters: workCenters.map(w => ({ 
            name: w.name, 
            code: w.code, 
            area: w.area?.name,
            site: w.area?.site?.name 
          })),
          summary: `You have ${sites.length} manufacturing sites, ${areas.length} areas, and ${workCenters.length} work centers.`
        },
        executionTime: Date.now() - startTime
      };
    }
    
    // Quick equipment query
    if (queryLower.includes('equipment') || queryLower.includes('machine')) {
      const equipment = await prisma.dimEquipment.findMany({
        where: { isActive: true },
        select: {
          name: true,
          code: true,
          type: true,
          workCenter: {
            select: {
              name: true,
              area: {
                select: { name: true }
              }
            }
          }
        },
        orderBy: { name: 'asc' }
      });
      
      return {
        queryType: 'equipment_list',
        data: {
          equipment: equipment.map(e => ({
            name: e.name,
            code: e.code,
            type: e.type || 'Unknown',
            location: `${e.workCenter?.area?.name} - ${e.workCenter?.name}`
          })),
          summary: `You have ${equipment.length} active machines across different work centers.`,
          types: [...new Set(equipment.map(e => e.type).filter(Boolean))]
        },
        executionTime: Date.now() - startTime
      };
    }
    
    // Quick product query
    if (queryLower.includes('product') || queryLower.includes('widget') || queryLower.includes('item')) {
      const products = await prisma.dimProduct.findMany({
        select: {
          name: true,
          code: true,
          family: true,
          unitOfMeasure: true,
          standardCost: true
        },
        orderBy: { name: 'asc' }
      });
      
      return {
        queryType: 'product_list',
        data: {
          products: products.map(p => ({
            name: p.name,
            code: p.code,
            family: p.family || 'General',
            unit: p.unitOfMeasure || 'EA',
            cost: p.standardCost?.toNumber() || 0
          })),
          summary: `You have ${products.length} products in your catalog.`,
          families: [...new Set(products.map(p => p.family).filter(Boolean))]
        },
        executionTime: Date.now() - startTime
      };
    }
    
    // Quick shift query
    if (queryLower.includes('shift') || queryLower.includes('schedule')) {
      const shifts = await prisma.dimShift.findMany({
        where: { isActive: true },
        select: {
          name: true,
          startTime: true,
          endTime: true,
          breakMinutes: true,
          site: {
            select: { name: true }
          }
        },
        orderBy: { name: 'asc' }
      });
      
      return {
        queryType: 'shift_schedule',
        data: {
          shifts: shifts.map(s => ({
            name: s.name,
            site: s.site.name,
            schedule: `${s.startTime} - ${s.endTime}`,
            breakMinutes: s.breakMinutes || 0
          })),
          summary: `You have ${shifts.length} active shifts scheduled.`
        },
        executionTime: Date.now() - startTime
      };
    }
    
    // Recent production summary
    if (queryLower.includes('recent') || queryLower.includes('latest') || queryLower.includes('current')) {
      const recentProduction = await prisma.factProduction.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        select: {
          totalPartsProduced: true,
          goodParts: true,
          scrapParts: true,
          equipment: {
            select: { name: true }
          },
          product: {
            select: { name: true }
          },
          createdAt: true
        }
      });
      
      return {
        queryType: 'recent_production',
        data: {
          production: recentProduction.map(p => ({
            equipment: p.equipment.name,
            product: p.product.name,
            total: p.totalPartsProduced,
            good: p.goodParts,
            scrap: p.scrapParts,
            efficiency: ((p.goodParts / p.totalPartsProduced) * 100).toFixed(1) + '%',
            date: p.createdAt?.toISOString().split('T')[0]
          })),
          summary: recentProduction.length > 0 
            ? `Showing ${recentProduction.length} most recent production runs.`
            : 'No recent production data found.'
        },
        executionTime: Date.now() - startTime
      };
    }
    
    // General greeting or help
    if (queryLower.includes('hello') || queryLower.includes('help') || queryLower.includes('what can')) {
      return {
        queryType: 'help',
        data: {
          message: 'I can help you with manufacturing analytics! Here are some things you can ask:',
          capabilities: [
            'Equipment and machine information',
            'Production data and metrics',
            'Quality analysis and defect trends',
            'OEE (Overall Equipment Effectiveness) calculations',
            'Downtime analysis',
            'Product catalog information',
            'Shift schedules',
            'Site and area organization'
          ],
          examples: [
            'What are the top 5 defect types this week?',
            'Show me OEE performance for today',
            'List all machines',
            'What products do we manufacture?',
            'Show recent production data'
          ]
        },
        executionTime: Date.now() - startTime
      };
    }
    
    // Default: general query about the system
    const [equipmentCount, productCount, productionCount] = await Promise.all([
      prisma.dimEquipment.count(),
      prisma.dimProduct.count(),
      prisma.factProduction.count()
    ]);
    
    return {
      queryType: 'system_overview',
      data: {
        summary: `Manufacturing Analytics System Overview`,
        statistics: {
          equipment: equipmentCount,
          products: productCount,
          productionRuns: productionCount
        },
        message: 'For more specific information, try asking about equipment, products, production, quality, or OEE metrics.'
      },
      executionTime: Date.now() - startTime
    };
    
  } catch (error) {
    console.error('Fast query processor error:', error);
    return {
      queryType: 'error',
      data: {
        message: 'I encountered an error processing your request. Please try rephrasing your question.',
        error: error.message
      },
      executionTime: Date.now() - startTime
    };
  }
}