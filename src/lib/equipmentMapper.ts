/**
 * Equipment Mapper
 * Maps between different equipment ID formats for consistent filtering
 */

import { prisma } from '@/lib/database/prisma';

interface EquipmentMapping {
  id: string;
  code: string;
  name: string;
  type: string;
}

let equipmentCache: EquipmentMapping[] | null = null;
let cacheExpiry: number = 0;

export async function getEquipmentMappings(): Promise<EquipmentMapping[]> {
  // Use cache if valid (5 minute expiry)
  if (equipmentCache && Date.now() < cacheExpiry) {
    return equipmentCache;
  }
  
  try {
    const equipment = await prisma.equipment.findMany({
      where: { isActive: true },
      select: {
        id: true,
        equipmentCode: true,
        equipmentName: true,
        equipmentType: true
      }
    });
    
    equipmentCache = equipment.map(e => ({
      id: e.id,
      code: e.equipmentCode,
      name: e.equipmentName,
      type: e.equipmentType || 'Unknown'
    }));
    
    cacheExpiry = Date.now() + (5 * 60 * 1000); // 5 minute cache
    
    return equipmentCache;
  } catch (error) {
    console.error('Failed to fetch equipment mappings:', error);
    return [];
  }
}

export async function mapEquipmentFilter(equipmentCodes: string[]): Promise<string[]> {
  const mappings = await getEquipmentMappings();
  
  // Map codes to IDs
  const equipmentIds = equipmentCodes
    .map(code => {
      const mapping = mappings.find(m => 
        m.code === code || 
        m.code.toLowerCase() === code.toLowerCase()
      );
      return mapping?.id;
    })
    .filter(Boolean) as string[];
  
  return equipmentIds;
}

export async function getValidEquipmentCodes(): Promise<string[]> {
  const mappings = await getEquipmentMappings();
  return mappings.map(m => m.code);
}