import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { setupMockFetch } from '@/test-utils/mocks';
import { createEquipmentList } from '@/test-utils/factories';

// Example custom hook
const useEquipmentData = (refreshInterval = 5000) => {
  const [equipment, setEquipment] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEquipment = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/equipment');
      
      if (!response.ok) {
        throw new Error('Failed to fetch equipment data');
      }
      
      const data = await response.json();
      setEquipment(data.equipment);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEquipment();
    
    const interval = setInterval(fetchEquipment, refreshInterval);
    return () => clearInterval(interval);
  }, [fetchEquipment, refreshInterval]);

  return { equipment, loading, error, refetch: fetchEquipment };
};

// Import React hooks for the test
import { useState, useEffect, useCallback } from 'react';

describe('useEquipmentData', () => {
  let mockFetch: ReturnType<typeof setupMockFetch>;

  beforeEach(() => {
    mockFetch = setupMockFetch();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('fetches equipment data on mount', async () => {
    const mockEquipment = createEquipmentList(5);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ equipment: mockEquipment }),
    });

    const { result } = renderHook(() => useEquipmentData());

    // Initially loading
    expect(result.current.loading).toBe(true);
    expect(result.current.equipment).toEqual([]);
    expect(result.current.error).toBe(null);

    // Wait for data to load
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.equipment).toEqual(mockEquipment);
    expect(result.current.error).toBe(null);
    expect(mockFetch).toHaveBeenCalledWith('/api/equipment');
  });

  it('handles fetch errors', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ error: 'Server error' }),
    });

    const { result } = renderHook(() => useEquipmentData());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.equipment).toEqual([]);
    expect(result.current.error).toBe('Failed to fetch equipment data');
  });

  it('handles network errors', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useEquipmentData());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.equipment).toEqual([]);
    expect(result.current.error).toBe('Network error');
  });

  it('refetches data at specified interval', async () => {
    const mockEquipment = createEquipmentList(5);
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ equipment: mockEquipment }),
    });

    const { result } = renderHook(() => useEquipmentData(1000)); // 1 second interval

    // Wait for initial fetch
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(mockFetch).toHaveBeenCalledTimes(1);

    // Advance timer by 1 second
    vi.advanceTimersByTime(1000);

    // Should trigger another fetch
    expect(mockFetch).toHaveBeenCalledTimes(2);

    // Advance timer by another second
    vi.advanceTimersByTime(1000);

    // Should trigger another fetch
    expect(mockFetch).toHaveBeenCalledTimes(3);
  });

  it('cleans up interval on unmount', async () => {
    const mockEquipment = createEquipmentList(5);
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ equipment: mockEquipment }),
    });

    const { result, unmount } = renderHook(() => useEquipmentData(1000));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(mockFetch).toHaveBeenCalledTimes(1);

    // Unmount the hook
    unmount();

    // Advance timer
    vi.advanceTimersByTime(2000);

    // Should not trigger additional fetches after unmount
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('provides refetch function', async () => {
    const mockEquipment = createEquipmentList(5);
    const updatedEquipment = createEquipmentList(5).map((eq) => ({
      ...eq,
      oee: eq.oee + 5,
    }));

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ equipment: mockEquipment }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ equipment: updatedEquipment }),
      });

    const { result } = renderHook(() => useEquipmentData());

    // Wait for initial fetch
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.equipment).toEqual(mockEquipment);

    // Manually trigger refetch
    result.current.refetch();

    await waitFor(() => {
      expect(result.current.equipment).toEqual(updatedEquipment);
    });

    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('handles rapid refetch calls', async () => {
    const mockEquipment = createEquipmentList(5);
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ equipment: mockEquipment }),
    });

    const { result } = renderHook(() => useEquipmentData());

    // Wait for initial fetch
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Trigger multiple refetches rapidly
    result.current.refetch();
    result.current.refetch();
    result.current.refetch();

    // Should still handle gracefully
    await waitFor(() => {
      expect(result.current.equipment).toEqual(mockEquipment);
    });
  });
});