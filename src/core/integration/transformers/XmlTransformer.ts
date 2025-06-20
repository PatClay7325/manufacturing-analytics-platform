/**
 * XML Transformer
 * 
 * Implements the DataTransformer interface for handling XML data format.
 * Provides functionality for parsing XML data, serializing to XML, and
 * applying transformation rules to convert between external XML schemas
 * and internal data structures.
 */

import { v4 as uuidv4 } from 'uuid';
import { 
  DataTransformer, 
  TransformationResult, 
  TransformationRule 
} from './interfaces/DataTransformer';
import { 
  IntegrationDataPacket, 
  IntegrationErrorType 
} from './types';

// Using lightweight XML parsing/serialization libraries
// These would need to be added to the project dependencies
type XmlDocument = any; // Replace with actual XML document type from chosen library

/**
 * XML Transformer class for handling XML data transformations
 */
export class XmlTransformer implements DataTransformer {
  private rules: Map<string, TransformationRule> = new Map();

  /**
   * Transform raw XML data to internal data packet format
   * @param sourceData Raw XML data from external system
   * @param context Additional context information
   * @returns Transformation result containing the standardized data packet
   */
  async transformInbound<SourceType, TargetType = unknown>(
    sourceData: SourceType,
    context?: Record<string, unknown>
  ): Promise<TransformationResult<IntegrationDataPacket<TargetType>>> {
    try {
      // Handle string XML input
      if (typeof sourceData !== 'string' && typeof sourceData !== 'object') {
        return this.createErrorResult(
          IntegrationErrorType.TRANSFORMATION,
          'Invalid XML input: expected string or XML document'
        );
      }

      // Parse XML string to document if needed
      let xmlDoc: XmlDocument;
      let parsedData: Record<string, unknown>;
      
      if (typeof sourceData === 'string') {
        try {
          // In a real implementation, use an XML parsing library
          // For example: xmlDoc = new DOMParser().parseFromString(sourceData, 'application/xml');
          // Then convert XML to JavaScript object
          parsedData = this.xmlToObject(sourceData);
        } catch (error) {
          return this.createErrorResult(
            IntegrationErrorType.TRANSFORMATION,
            `Failed to parse XML: ${(error as Error).message}`
          );
        }
      } else {
        // Already an XML document or object
        parsedData = sourceData as unknown as Record<string, unknown>;
      }

      // Apply transformation rules
      let transformedData = parsedData;
      const applicableRules = Array.from(this.rules.values()).filter(rule => 
        !rule.condition || rule.condition(parsedData, context)
      );

      for (const rule of applicableRules) {
        transformedData = rule.transform(transformedData, context);
      }

      // Create standardized data packet
      const dataPacket: IntegrationDataPacket<TargetType> = {
        id: uuidv4(),
        source: context.source as string || 'xml-source',
        timestamp: new Date(),
        payload: transformedData as unknown as TargetType,
        schemaVersion: context.schemaVersion as string,
        metadata: {
          originalFormat: 'xml',
          ...context?.metadata as Record<string, unknown>
        }
      };

      return {
        success: true,
        data: dataPacket
      };
    } catch (error) {
      return this.createErrorResult(
        IntegrationErrorType.TRANSFORMATION,
        `XML transformation error: ${(error as Error).message}`
      );
    }
  }

  /**
   * Transform internal data packet to XML format
   * @param dataPacket Internal standardized data packet
   * @param context Additional context information
   * @returns Transformation result containing the XML data
   */
  async transformOutbound<TargetType, SourceType = unknown>(
    dataPacket: IntegrationDataPacket<SourceType>,
    context?: Record<string, unknown>
  ): Promise<TransformationResult<TargetType>> {
    try {
      // Validate data packet
      if (!dataPacket || !dataPacket.payload) {
        return this.createErrorResult(
          IntegrationErrorType.TRANSFORMATION,
          'Invalid data packet: missing payload'
        );
      }

      // Apply transformation rules
      let transformedData = dataPacket.payload;
      const applicableRules = Array.from(this.rules.values()).filter(rule => 
        !rule.condition || rule.condition(dataPacket, context)
      );

      for (const rule of applicableRules) {
        transformedData = rule.transform(transformedData, context);
      }

      // Convert to XML string
      const rootElement = context?.rootElement as string || 'root';
      const xmlString = this.objectToXml(transformedData, rootElement, context?.pretty === true);

      return {
        success: true,
        data: xmlString as unknown as TargetType
      };
    } catch (error) {
      return this.createErrorResult(
        IntegrationErrorType.TRANSFORMATION,
        `XML transformation error: ${(error as Error).message}`
      );
    }
  }

  /**
   * Register a new transformation rule
   * @param rule Transformation rule to register
   */
  registerRule<S, T>(rule: TransformationRule<S, T>): void {
    this.rules.set(rule.id, rule as unknown as TransformationRule);
  }

  /**
   * Deregister a transformation rule
   * @param ruleId ID of the rule to deregister
   */
  deregisterRule(ruleId: string): void {
    this.rules.delete(ruleId);
  }

  /**
   * Get all registered transformation rules
   * @returns Array of registered rules
   */
  getRules(): TransformationRule[] {
    return Array.from(this.rules.values());
  }

  /**
   * Clear all transformation rules
   */
  clearRules(): void {
    this.rules.clear();
  }

  /**
   * Convert XML string to JavaScript object
   * @param xmlString XML string to convert
   * @returns JavaScript object representation of the XML
   */
  xmlToObject(xmlString: string): Record<string, unknown> {
    // In a real implementation, use an XML parsing library
    // This is a placeholder implementation
    try {
      // Example implementation using a hypothetical XML library:
      // const xmlDoc = new DOMParser().parseFromString(xmlString, 'application/xml');
      // return this.elementToObject(xmlDoc.documentElement);
      
      // Placeholder implementation for demonstration
      if (!xmlString || typeof xmlString !== 'string') {
        throw new Error('Invalid XML string');
      }
      
      // Very simplistic XML parsing - not for production use
      const placeholderObject: Record<string, unknown> = {};
      // Extract root element name from XML
      const rootMatch = xmlString.match(/<([^\s>]+)([^>]*)>([\s\S]*?)<\/\1>/);
      
      if (rootMatch) {
        const [_, rootName, attributes, content] = rootMatch;
        placeholderObject[rootName] = this.parseXmlContent(content);
        
        // Parse attributes
        const attrMatches = attributes.matchAll(/([^\s=]+)="([^"]*)"/g);
        for (const attrMatch of attrMatches) {
          const [__, attrName, attrValue] = attrMatch;
          if (!placeholderObject.attributes) {
            placeholderObject.attributes = {};
          }
          (placeholderObject.attributes as Record<string, string>)[attrName] = attrValue;
        }
      }
      
      return placeholderObject;
    } catch (error) {
      throw new Error(`XML parsing error: ${(error as Error).message}`);
    }
  }

  /**
   * Parse XML content recursively
   * @param content XML content to parse
   * @returns Parsed content as object or string
   */
  private parseXmlContent(content: string): unknown {
    // Simplistic XML parsing - not for production use
    const elementMatches = content.match(/<([^\s>]+)([^>]*)>([\s\S]*?)<\/\1>/g);
    
    if (!elementMatches) {
      // No child elements, return trimmed content
      return content.trim();
    }
    
    const result: Record<string, unknown> = {};
    
    for (const elementMatch of elementMatches) {
      const innerMatch = elementMatch.match(/<([^\s>]+)([^>]*)>([\s\S]*?)<\/\1>/);
      if (innerMatch) {
        const [_, tagName, attributes, innerContent] = innerMatch;
        
        // Check if this element already exists in the result
        if (result[tagName]) {
          // Convert to array if not already
          if (!Array.isArray(result[tagName])) {
            result[tagName] = [result[tagName]];
          }
          
          // Add new element to array
          (result[tagName] as unknown[]).push(this.parseXmlContent(innerContent));
        } else {
          // First occurrence of this element
          result[tagName] = this.parseXmlContent(innerContent);
        }
      }
    }
    
    return result;
  }

  /**
   * Convert JavaScript object to XML string
   * @param obj JavaScript object to convert
   * @param rootName Name of the root element
   * @param pretty Whether to pretty-print the XML
   * @returns XML string representation of the object
   */
  objectToXml(obj: unknown, rootName: string, pretty = false): string {
    // In a real implementation, use an XML serialization library
    // This is a placeholder implementation
    try {
      const indent = pretty ? '  ' : '';
      const newline = pretty ? '\n' : '';
      
      // Handle null or undefined
      if (obj === null || obj === undefined) {
        return `<${rootName}/>`;
      }
      
      // Handle primitive types
      if (typeof obj !== 'object') {
        return `<${rootName}>${String(obj)}</${rootName}>`;
      }
      
      // Handle arrays
      if (Array.isArray(obj)) {
        return obj.map(item => this.objectToXml(item, rootName, pretty)).join(newline);
      }
      
      // Handle objects
      let xml = `<${rootName}`;
      
      // Extract attributes (properties that start with @)
      const attributes: Record<string, string> = {};
      const children: Record<string, unknown> = {};
      
      for (const [key, value] of Object.entries(obj)) {
        if (key.startsWith('@')) {
          attributes[key.substring(1)] = String(value);
        } else {
          children[key] = value;
        }
      }
      
      // Add attributes to opening tag
      for (const [key, value] of Object.entries(attributes)) {
        xml += ` ${key}="${value}"`;
      }
      
      // If no children and no text content, use self-closing tag
      if (Object.keys(children).length === 0 && !('$' in obj)) {
        return `${xml}/>`;
      }
      
      xml += '>';
      
      // Add text content if present
      if ('$' in obj) {
        xml += String(obj['$']);
      }
      
      // Add child elements
      if (Object.keys(children).length > 0) {
        if (pretty) xml += newline;
        
        for (const [key, value] of Object.entries(children)) {
          const childXml = this.objectToXml(value, key, pretty);
          xml += pretty ? indent + childXml + newline : childXml;
        }
      }
      
      // Close tag
      xml += `</${rootName}>`;
      
      return xml;
    } catch (error) {
      throw new Error(`XML serialization error: ${(error as Error).message}`);
    }
  }

  /**
   * Validate XML string
   * @param xmlString XML string to validate
   * @param xsdSchema Optional XSD schema for validation
   * @returns Whether the XML is valid
   */
  isValidXml(xmlString: string, xsdSchema?: string): boolean {
    try {
      // In a real implementation, use an XML validation library
      // For example with a DOM parser:
      // const parser = new DOMParser();
      // const xmlDoc = parser.parseFromString(xmlString, 'application/xml');
      // return xmlDoc.getElementsByTagName('parsererror').length === 0;
      
      // Basic validation - check if it can be parsed
      const hasOpeningTag = /<[^>]+>/.test(xmlString);
      const hasMatchingTags = this.checkMatchingTags(xmlString);
      
      return hasOpeningTag && hasMatchingTags;
    } catch (error) {
      return false;
    }
  }

  /**
   * Check if XML has matching opening and closing tags
   * @param xmlString XML string to check
   * @returns Whether the tags match
   */
  private checkMatchingTags(xmlString: string): boolean {
    // Simplified tag matching check
    const tagStack: string[] = [];
    const tagRegex = /<\/?([^\s>]+)[^>]*>/g;
    let match;
    
    while ((match = tagRegex.exec(xmlString)) !== null) {
      const fullTag = match[0];
      const tagName = match[1];
      
      if (fullTag.startsWith('</')) {
        // Closing tag
        if (tagStack.pop() !== tagName) {
          return false;
        }
      } else if (!fullTag.endsWith('/>')) {
        // Opening tag (not self-closing)
        tagStack.push(tagName);
      }
    }
    
    return tagStack.length === 0;
  }

  /**
   * Create error transformation result
   * @param type Error type
   * @param message Error message
   * @param details Additional error details
   * @returns Error transformation result
   */
  private createErrorResult<T>(
    type: IntegrationErrorType,
    message: string,
    details?: Record<string, unknown>
  ): TransformationResult<T> {
    return {
      success: false,
      error: {
        type,
        message,
        details
      }
    };
  }
}