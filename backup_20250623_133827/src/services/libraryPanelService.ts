/**
 * Library Panel Service
 * Handles integration of library panels with dashboards
 */

import type { 
  LibraryPanel,
  LibraryPanelSearchRequest,
  LibraryPanelSearchResponse,
  CreateLibraryPanelRequest,
  UpdateLibraryPanelRequest,
  LibraryPanelWithConnections,
  LibraryPanelVersion,
  LibraryPanelUsage,
  Panel
} from '@/types/dashboard';

export class LibraryPanelService {
  private baseUrl = '/api/library-panels';

  /**
   * Search library panels
   */
  async searchLibraryPanels(request: LibraryPanelSearchRequest): Promise<LibraryPanelSearchResponse> {
    const params = new URLSearchParams();
    
    if (request.query) params.append('query', request.query);
    if (request.page) params.append('page', request.page.toString());
    if (request.perPage) params.append('perPage', request.perPage.toString());
    if (request.sort) params.append('sort', request.sort);
    if (request.sortDirection) params.append('sortDirection', request.sortDirection);
    if (request.typeFilter) params.append('typeFilter', request.typeFilter);
    if (request.folderFilter) params.append('folderFilter', request.folderFilter);
    if (request.tagFilter && request.tagFilter.length > 0) {
      params.append('tagFilter', request.tagFilter.join(','));
    }
    if (request.excludeUids && request.excludeUids.length > 0) {
      params.append('excludeUids', request.excludeUids.join(','));
    }

    const response = await fetch(`${this.baseUrl}?${params}`);
    if (!response.ok) {
      throw new Error('Failed to search library panels');
    }

    return response.json();
  }

  /**
   * Get library panel by UID
   */
  async getLibraryPanel(uid: string): Promise<LibraryPanelWithConnections> {
    const response = await fetch(`${this.baseUrl}/${uid}`);
    if (!response.ok) {
      throw new Error('Failed to fetch library panel');
    }

    return response.json();
  }

  /**
   * Create new library panel
   */
  async createLibraryPanel(data: CreateLibraryPanelRequest): Promise<LibraryPanel> {
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error('Failed to create library panel');
    }

    return response.json();
  }

  /**
   * Update library panel
   */
  async updateLibraryPanel(uid: string, data: UpdateLibraryPanelRequest): Promise<LibraryPanel> {
    const response = await fetch(`${this.baseUrl}/${uid}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error('Failed to update library panel');
    }

    return response.json();
  }

  /**
   * Delete library panel
   */
  async deleteLibraryPanel(uid: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/${uid}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete library panel');
    }
  }

  /**
   * Get library panel versions
   */
  async getLibraryPanelVersions(uid: string): Promise<LibraryPanelVersion[]> {
    const response = await fetch(`${this.baseUrl}/${uid}/versions`);
    if (!response.ok) {
      throw new Error('Failed to fetch library panel versions');
    }

    return response.json();
  }

  /**
   * Create new version of library panel
   */
  async createLibraryPanelVersion(
    uid: string, 
    model: Panel, 
    message?: string
  ): Promise<LibraryPanelVersion> {
    const response = await fetch(`${this.baseUrl}/${uid}/versions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, message }),
    });

    if (!response.ok) {
      throw new Error('Failed to create library panel version');
    }

    return response.json();
  }

  /**
   * Get library panel connections
   */
  async getLibraryPanelConnections(uid: string): Promise<LibraryPanelUsage[]> {
    const response = await fetch(`${this.baseUrl}/${uid}/connections`);
    if (!response.ok) {
      throw new Error('Failed to fetch library panel connections');
    }

    return response.json();
  }

  /**
   * Add connection between library panel and dashboard
   */
  async addLibraryPanelConnection(
    uid: string, 
    dashboardUid: string, 
    panelId: number
  ): Promise<LibraryPanelUsage> {
    const response = await fetch(`${this.baseUrl}/${uid}/connections`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dashboardUid, panelId }),
    });

    if (!response.ok) {
      throw new Error('Failed to add library panel connection');
    }

    return response.json();
  }

  /**
   * Remove connection between library panel and dashboard
   */
  async removeLibraryPanelConnection(
    uid: string, 
    dashboardUid: string, 
    panelId: number
  ): Promise<void> {
    const response = await fetch(
      `${this.baseUrl}/${uid}/connections?dashboardUid=${dashboardUid}&panelId=${panelId}`,
      { method: 'DELETE' }
    );

    if (!response.ok) {
      throw new Error('Failed to remove library panel connection');
    }
  }

  /**
   * Convert regular panel to library panel
   */
  async convertToLibraryPanel(
    panel: Panel,
    name: string,
    description?: string,
    tags?: string[],
    category?: string,
    folderId?: string
  ): Promise<LibraryPanel> {
    const data: CreateLibraryPanelRequest = {
      name,
      type: panel.type,
      description,
      model: panel,
      tags,
      category,
      folderId,
    };

    return this.createLibraryPanel(data);
  }

  /**
   * Create panel from library panel
   */
  createPanelFromLibrary(libraryPanel: LibraryPanel, newPanelId: number): Panel {
    const panel = { ...libraryPanel.model } as Panel;
    panel.id = newPanelId;
    panel.libraryPanel = {
      uid: libraryPanel.uid,
      name: libraryPanel.name,
      type: libraryPanel.type,
      description: libraryPanel.description,
      model: libraryPanel.model,
      version: libraryPanel.version,
      meta: libraryPanel.meta,
    };

    return panel;
  }

  /**
   * Update panel from library panel (sync changes)
   */
  updatePanelFromLibrary(currentPanel: Panel, libraryPanel: LibraryPanel): Panel {
    // Preserve certain panel-specific properties
    const preservedProps = {
      id: currentPanel.id,
      gridPos: currentPanel.gridPos,
      title: currentPanel.title || libraryPanel.name,
      // Preserve any panel-specific overrides
      repeat: currentPanel.repeat,
      repeatDirection: currentPanel.repeatDirection,
      maxDataPoints: currentPanel.maxDataPoints,
      interval: currentPanel.interval,
      timeFrom: currentPanel.timeFrom,
      timeShift: currentPanel.timeShift,
    };

    // Apply library panel model with preserved properties
    const updatedPanel = {
      ...libraryPanel.model,
      ...preservedProps,
      libraryPanel: {
        uid: libraryPanel.uid,
        name: libraryPanel.name,
        type: libraryPanel.type,
        description: libraryPanel.description,
        model: libraryPanel.model,
        version: libraryPanel.version,
        meta: libraryPanel.meta,
      },
    } as Panel;

    return updatedPanel;
  }

  /**
   * Check if panel is linked to library panel
   */
  isLibraryPanel(panel: Panel): boolean {
    return panel.libraryPanel !== undefined;
  }

  /**
   * Get library panel UID from panel
   */
  getLibraryPanelUid(panel: Panel): string | undefined {
    return panel.libraryPanel?.uid;
  }

  /**
   * Check if library panel has newer version
   */
  hasNewerVersion(panel: Panel, libraryPanel: LibraryPanel): boolean {
    if (!this.isLibraryPanel(panel)) return false;
    
    const currentVersion = panel.libraryPanel?.version || 0;
    return libraryPanel.version > currentVersion;
  }

  /**
   * Unlink panel from library panel
   */
  unlinkFromLibrary(panel: Panel): Panel {
    const unlinkedPanel = { ...panel };
    delete unlinkedPanel.libraryPanel;
    return unlinkedPanel;
  }

  /**
   * Export library panel for backup/sharing
   */
  exportLibraryPanel(libraryPanel: LibraryPanel): string {
    const exportData = {
      uid: libraryPanel.uid,
      name: libraryPanel.name,
      type: libraryPanel.type,
      description: libraryPanel.description,
      model: libraryPanel.model,
      version: libraryPanel.version,
      tags: libraryPanel.tags,
      category: libraryPanel.category,
      exportedAt: new Date().toISOString(),
      exportedBy: 'Manufacturing AnalyticsPlatform',
    };

    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Import library panel from export data
   */
  async importLibraryPanel(
    exportData: string,
    name?: string,
    folderId?: string
  ): Promise<LibraryPanel> {
    try {
      const data = JSON.parse(exportData);
      
      const importRequest: CreateLibraryPanelRequest = {
        name: name || `${data.name} (Imported)`,
        type: data.type,
        description: data.description,
        model: data.model,
        tags: data.tags || [],
        category: data.category,
        folderId,
      };

      return this.createLibraryPanel(importRequest);
    } catch (error) {
      throw new Error('Invalid library panel export data');
    }
  }

  /**
   * Bulk operations
   */
  async bulkDeleteLibraryPanels(uids: string[]): Promise<{ success: string[]; errors: string[] }> {
    const results = { success: [], errors: [] };

    for (const uid of uids) {
      try {
        await this.deleteLibraryPanel(uid);
        results.success.push(uid);
      } catch (error) {
        results.errors.push(uid);
      }
    }

    return results;
  }

  async bulkUpdateTags(uids: string[], tags: string[]): Promise<void> {
    const promises = uids.map(uid => 
      this.updateLibraryPanel(uid, { tags })
    );

    await Promise.all(promises);
  }

  async bulkUpdateCategory(uids: string[], category: string): Promise<void> {
    const promises = uids.map(uid => 
      this.updateLibraryPanel(uid, { category })
    );

    await Promise.all(promises);
  }

  async bulkMoveToFolder(uids: string[], folderId: string): Promise<void> {
    const promises = uids.map(uid => 
      this.updateLibraryPanel(uid, { folderId })
    );

    await Promise.all(promises);
  }
}

// Export singleton instance
export const libraryPanelService = new LibraryPanelService();