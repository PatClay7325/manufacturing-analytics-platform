/**
 * OPC UA Subscription Manager
 * Manages subscriptions and monitored items for real-time data collection
 */

import {
  ClientSession,
  ClientSubscription,
  ClientMonitoredItem,
  TimestampsToReturn,
  MonitoringParametersOptions,
  DataValue,
  ReadValueIdOptions,
  AttributeIds
} from 'node-opcua';
import { EventEmitter } from 'events';
import {
  SubscriptionConfig,
  MonitoredItemConfig,
  ManufacturingDataValue,
  OPCUAEventHandlers,
  SubscriptionError
} from '../types';
import { TypeMapper } from '../utils/type-mapper';
import { logger } from '../../logger';

interface SubscriptionEntry {
  id: string;
  subscription: ClientSubscription;
  monitoredItems: Map<string, ClientMonitoredItem>;
  config: SubscriptionConfig;
  createdAt: Date;
  itemCount: number;
}

interface MonitoredItemContext {
  nodeId: string;
  equipmentId?: string;
  equipmentName?: string;
  parameterName?: string;
  unit?: string;
}

export class SubscriptionManager extends EventEmitter {
  private subscriptions: Map<string, SubscriptionEntry> = new Map();
  private typeMapper: TypeMapper;
  private eventHandlers: OPCUAEventHandlers;
  private dataBuffer: ManufacturingDataValue[] = [];
  private bufferFlushInterval?: NodeJS.Timeout;
  private bufferSize: number = 100;
  private flushIntervalMs: number = 1000;

  constructor(
    private session: ClientSession,
    eventHandlers: OPCUAEventHandlers = {},
    typeMapper?: TypeMapper
  ) {
    super();
    this.eventHandlers = eventHandlers;
    this.typeMapper = typeMapper || new TypeMapper();
    this.startBufferFlush();
  }

  /**
   * Create a new subscription
   */
  async createSubscription(
    subscriptionId: string,
    config?: Partial<SubscriptionConfig>
  ): Promise<string> {
    try {
      const subscriptionConfig: SubscriptionConfig = {
        requestedPublishingInterval: config.requestedPublishingInterval || 1000,
        requestedLifetimeCount: config.requestedLifetimeCount || 100,
        requestedMaxKeepAliveCount: config.requestedMaxKeepAliveCount || 10,
        maxNotificationsPerPublish: config.maxNotificationsPerPublish || 100,
        publishingEnabled: config.publishingEnabled !== false,
        priority: config.priority || 10
      };

      logger.info('Creating OPC UA subscription', { 
        subscriptionId, 
        config: subscriptionConfig 
      });

      const subscription = await this.session.createSubscription2({
        requestedPublishingInterval: subscriptionConfig.requestedPublishingInterval,
        requestedLifetimeCount: subscriptionConfig.requestedLifetimeCount,
        requestedMaxKeepAliveCount: subscriptionConfig.requestedMaxKeepAliveCount,
        maxNotificationsPerPublish: subscriptionConfig.maxNotificationsPerPublish,
        publishingEnabled: subscriptionConfig.publishingEnabled,
        priority: subscriptionConfig.priority
      });

      // Set up subscription event handlers
      subscription.on('started', () => {
        logger.info('Subscription started', { 
          subscriptionId,
          id: subscription.subscriptionId 
        });
        if (this.eventHandlers.onSubscriptionCreated) {
          this.eventHandlers.onSubscriptionCreated(subscription.subscriptionId);
        }
      });

      subscription.on('terminated', () => {
        logger.warn('Subscription terminated', { subscriptionId });
        this.subscriptions.delete(subscriptionId);
      });

      subscription.on('error', (err) => {
        logger.error('Subscription error', { subscriptionId, error: err });
        if (this.eventHandlers.onError) {
          this.eventHandlers.onError(err);
        }
      });

      const entry: SubscriptionEntry = {
        id: subscriptionId,
        subscription,
        monitoredItems: new Map(),
        config: subscriptionConfig,
        createdAt: new Date(),
        itemCount: 0
      };

      this.subscriptions.set(subscriptionId, entry);
      this.emit('subscriptionCreated', { subscriptionId, config: subscriptionConfig });

      return subscriptionId;
    } catch (error) {
      logger.error('Failed to create subscription', { error, subscriptionId });
      throw new SubscriptionError(
        `Failed to create subscription: ${error.message}`,
        { originalError: error }
      );
    }
  }

  /**
   * Add monitored items to a subscription
   */
  async addMonitoredItems(
    subscriptionId: string,
    items: MonitoredItemConfig[],
    context?: MonitoredItemContext
  ): Promise<string[]> {
    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription) {
      throw new SubscriptionError(`Subscription ${subscriptionId} not found`);
    }

    const monitoredItemIds: string[] = [];

    try {
      for (const itemConfig of items) {
        const itemId = await this.createMonitoredItem(
          subscription,
          itemConfig,
          context
        );
        monitoredItemIds.push(itemId);
      }

      logger.info('Monitored items added', {
        subscriptionId,
        itemCount: monitoredItemIds.length
      });

      return monitoredItemIds;
    } catch (error) {
      logger.error('Failed to add monitored items', { 
        error, 
        subscriptionId,
        itemCount: items.length 
      });
      throw new SubscriptionError(
        `Failed to add monitored items: ${error.message}`,
        { originalError: error }
      );
    }
  }

  /**
   * Create a single monitored item
   */
  private async createMonitoredItem(
    subscriptionEntry: SubscriptionEntry,
    config: MonitoredItemConfig,
    context?: MonitoredItemContext
  ): Promise<string> {
    const itemToMonitor: ReadValueIdOptions = {
      nodeId: config.nodeId,
      attributeId: config.attributeId || AttributeIds.Value
    };

    const monitoringParameters: MonitoringParametersOptions = {
      samplingInterval: config.samplingInterval,
      discardOldest: config.discardOldest,
      queueSize: config.queueSize
    };

    if (config.dataChangeFilter) {
      monitoringParameters.filter = {
        trigger: config.dataChangeFilter.trigger,
        deadbandType: config.dataChangeFilter.deadbandType,
        deadbandValue: config.dataChangeFilter.deadbandValue
      };
    }

    const monitoredItem = await subscriptionEntry.subscription.monitor(
      itemToMonitor,
      monitoringParameters,
      TimestampsToReturn.Both
    );

    // Create context for this monitored item
    const itemContext: MonitoredItemContext = {
      nodeId: config.nodeId,
      ...context
    };

    // Set up data change handler
    monitoredItem.on('changed', (dataValue: DataValue) => {
      this.handleDataChange(itemContext, dataValue);
    });

    monitoredItem.on('error', (err) => {
      logger.error('Monitored item error', { 
        nodeId: config.nodeId,
        error: err 
      });
      if (this.eventHandlers.onError) {
        this.eventHandlers.onError(err);
      }
    });

    const itemId = `${subscriptionEntry.id}-${config.nodeId}`;
    subscriptionEntry.monitoredItems.set(itemId, monitoredItem);
    subscriptionEntry.itemCount++;

    return itemId;
  }

  /**
   * Handle data change events
   */
  private handleDataChange(context: MonitoredItemContext, dataValue: DataValue): void {
    try {
      const manufacturingData = this.typeMapper.mapDataValue(
        context.nodeId,
        dataValue,
        context
      );

      // Add to buffer
      this.dataBuffer.push(manufacturingData);

      // Flush if buffer is full
      if (this.dataBuffer.length >= this.bufferSize) {
        this.flushBuffer();
      }

      // Emit individual data change for real-time processing
      this.emit('dataChange', manufacturingData);

    } catch (error) {
      logger.error('Error handling data change', { 
        error,
        nodeId: context.nodeId 
      });
    }
  }

  /**
   * Start buffer flush timer
   */
  private startBufferFlush(): void {
    this.bufferFlushInterval = setInterval(() => {
      if (this.dataBuffer.length > 0) {
        this.flushBuffer();
      }
    }, this.flushIntervalMs);
  }

  /**
   * Flush data buffer
   */
  private async flushBuffer(): Promise<void> {
    if (this.dataBuffer.length === 0) return;

    const dataToFlush = [...this.dataBuffer];
    this.dataBuffer = [];

    try {
      // Process buffered data
      if (this.eventHandlers.onDataChange) {
        for (const data of dataToFlush) {
          await this.eventHandlers.onDataChange(data);
        }
      }

      // Emit batch event
      this.emit('batchDataChange', dataToFlush);

    } catch (error) {
      logger.error('Error flushing data buffer', { 
        error,
        bufferSize: dataToFlush.length 
      });
      
      // Re-add failed data to buffer
      this.dataBuffer.unshift(...dataToFlush);
    }
  }

  /**
   * Remove monitored items
   */
  async removeMonitoredItems(
    subscriptionId: string,
    itemIds: string[]
  ): Promise<void> {
    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription) {
      throw new SubscriptionError(`Subscription ${subscriptionId} not found`);
    }

    for (const itemId of itemIds) {
      const monitoredItem = subscription.monitoredItems.get(itemId);
      if (monitoredItem) {
        await monitoredItem.terminate();
        subscription.monitoredItems.delete(itemId);
        subscription.itemCount--;
      }
    }

    logger.info('Monitored items removed', {
      subscriptionId,
      removedCount: itemIds.length,
      remainingCount: subscription.itemCount
    });
  }

  /**
   * Delete a subscription
   */
  async deleteSubscription(subscriptionId: string): Promise<void> {
    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription) {
      return;
    }

    try {
      // Terminate all monitored items
      for (const [itemId, monitoredItem] of subscription.monitoredItems) {
        await monitoredItem.terminate();
      }

      // Terminate subscription
      await subscription.subscription.terminate();

      this.subscriptions.delete(subscriptionId);
      this.emit('subscriptionDeleted', subscriptionId);

      logger.info('Subscription deleted', { subscriptionId });
    } catch (error) {
      logger.error('Error deleting subscription', { error, subscriptionId });
      throw new SubscriptionError(
        `Failed to delete subscription: ${error.message}`,
        { originalError: error }
      );
    }
  }

  /**
   * Get subscription metrics
   */
  getMetrics() {
    const subscriptions = Array.from(this.subscriptions.values());
    
    return {
      activeSubscriptions: subscriptions.length,
      totalMonitoredItems: subscriptions.reduce((sum, sub) => sum + sub.itemCount, 0),
      bufferSize: this.dataBuffer.length,
      subscriptions: subscriptions.map(sub => ({
        id: sub.id,
        monitoredItems: sub.itemCount,
        publishingInterval: sub.config.requestedPublishingInterval,
        createdAt: sub.createdAt
      }))
    };
  }

  /**
   * Shutdown subscription manager
   */
  async shutdown(): Promise<void> {
    logger.info('Shutting down subscription manager');

    // Stop buffer flush
    if (this.bufferFlushInterval) {
      clearInterval(this.bufferFlushInterval);
    }

    // Flush remaining data
    await this.flushBuffer();

    // Delete all subscriptions
    const deletePromises = Array.from(this.subscriptions.keys()).map(id =>
      this.deleteSubscription(id)
    );

    await Promise.allSettled(deletePromises);

    this.subscriptions.clear();
    this.removeAllListeners();

    logger.info('Subscription manager shut down');
  }
}