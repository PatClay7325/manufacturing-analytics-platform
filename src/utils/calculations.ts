/**
 * Manufacturing calculations utility functions
 */

/**
 * Calculate Overall Equipment Effectiveness (OEE)
 * OEE = Availability × Performance × Quality
 * 
 * @param availability Percentage of scheduled time the equipment is available to operate
 * @param performance Speed at which the equipment runs as a percentage of its designed speed
 * @param quality Percentage of good units produced out of total units started
 * @returns OEE as a percentage (0-100)
 */
export function calculateOEE(
  availability: number,
  performance: number,
  quality: number
): number {
  // Validate inputs
  if (
    typeof availability !== 'number' ||
    typeof performance !== 'number' ||
    typeof quality !== 'number'
  ) {
    throw new TypeError('All inputs must be numbers');
  }
  
  // Validate ranges
  if (
    availability < 0 || availability > 100 ||
    performance < 0 || performance > 100 ||
    quality < 0 || quality > 100
  ) {
    throw new RangeError('All inputs must be percentages between 0 and 100');
  }
  
  // Convert percentages to decimals and multiply
  const oee = (availability / 100) * (performance / 100) * (quality / 100);
  
  // Return as percentage rounded to nearest integer
  return Math.round(oee * 100);
}

/**
 * Calculate Mean Time Between Failures (MTBF)
 * 
 * @param operatingTime Total operating time in hours
 * @param numberOfFailures Number of failures during the operating time
 * @returns MTBF in hours
 */
export function calculateMTBF(
  operatingTime: number,
  numberOfFailures: number
): number {
  // Validate inputs
  if (
    typeof operatingTime !== 'number' ||
    typeof numberOfFailures !== 'number'
  ) {
    throw new TypeError('All inputs must be numbers');
  }
  
  // Validate ranges
  if (operatingTime < 0) {
    throw new RangeError('Operating time cannot be negative');
  }
  
  if (numberOfFailures < 0 || !Number.isInteger(numberOfFailures)) {
    throw new RangeError('Number of failures must be a non-negative integer');
  }
  
  // Avoid division by zero
  if (numberOfFailures === 0) {
    return operatingTime; // If no failures, MTBF equals the operating time
  }
  
  // Calculate MTBF
  return operatingTime / numberOfFailures;
}

/**
 * Calculate Mean Time To Repair (MTTR)
 * 
 * @param totalRepairTime Total time spent on repairs in hours
 * @param numberOfRepairs Number of repairs performed
 * @returns MTTR in hours
 */
export function calculateMTTR(
  totalRepairTime: number,
  numberOfRepairs: number
): number {
  // Validate inputs
  if (
    typeof totalRepairTime !== 'number' ||
    typeof numberOfRepairs !== 'number'
  ) {
    throw new TypeError('All inputs must be numbers');
  }
  
  // Validate ranges
  if (totalRepairTime < 0) {
    throw new RangeError('Total repair time cannot be negative');
  }
  
  if (numberOfRepairs < 0 || !Number.isInteger(numberOfRepairs)) {
    throw new RangeError('Number of repairs must be a non-negative integer');
  }
  
  // Avoid division by zero
  if (numberOfRepairs === 0) {
    return 0; // If no repairs, MTTR is 0
  }
  
  // Calculate MTTR
  return totalRepairTime / numberOfRepairs;
}