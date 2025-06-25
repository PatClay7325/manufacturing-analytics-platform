/**
 * PRODUCTION-SECURE Expression Evaluator
 * Uses AST parsing instead of Function constructor to prevent injection
 */

import { logger } from '@/lib/logger';

interface EvaluationContext {
  data: any;
  context: any;
  Math: typeof Math;
  Date: typeof Date;
  Array: typeof Array;
}

export class SecureExpressionEvaluator {
  private static readonly ALLOWED_OPERATORS = new Set([
    '+', '-', '*', '/', '%', '===', '!==', '==', '!=', 
    '<', '>', '<=', '>=', '&&', '||', '!', '?', ':'
  ]);

  private static readonly ALLOWED_IDENTIFIERS = new Set([
    'data', 'context', 'Math', 'Date', 'Array', 'true', 'false', 'null', 'undefined'
  ]);

  private static readonly ALLOWED_MATH_METHODS = new Set([
    'abs', 'ceil', 'floor', 'round', 'max', 'min', 'pow', 'sqrt'
  ]);

  private static readonly ALLOWED_ARRAY_METHODS = new Set([
    'length', 'isArray'
  ]);

  /**
   * Safely evaluate an expression using AST parsing
   */
  static evaluate(expression: string, data: any, context: any): { 
    success: boolean; 
    result?: any; 
    error?: string; 
  } {
    try {
      // Parse and validate the expression
      const ast = this.parseExpression(expression);
      if (!ast.valid) {
        return { success: false, error: ast.error };
      }

      // Create safe evaluation context
      const evalContext: EvaluationContext = {
        data: this.sanitizeValue(data),
        context: this.sanitizeValue(context),
        Math: {
          abs: Math.abs,
          ceil: Math.ceil,
          floor: Math.floor,
          round: Math.round,
          max: Math.max,
          min: Math.min,
          pow: Math.pow,
          sqrt: Math.sqrt,
        } as typeof Math,
        Date: {
          now: Date.now,
        } as typeof Date,
        Array: {
          isArray: Array.isArray,
        } as typeof Array,
      };

      // Evaluate the parsed AST
      const result = this.evaluateAST(ast.ast!, evalContext);
      return { success: true, result };

    } catch (error) {
      logger.error({ error, expression }, 'Expression evaluation failed');
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Evaluation error' 
      };
    }
  }

  /**
   * Parse expression into safe AST
   */
  private static parseExpression(expression: string): { 
    valid: boolean; 
    ast?: ExpressionNode; 
    error?: string; 
  } {
    try {
      if (expression.length > 500) {
        return { valid: false, error: 'Expression too long' };
      }

      // Simple recursive descent parser for safe subset of JavaScript
      const tokens = this.tokenize(expression);
      const parser = new ExpressionParser(tokens);
      const ast = parser.parseExpression();

      return { valid: true, ast };
    } catch (error) {
      return { 
        valid: false, 
        error: error instanceof Error ? error.message : 'Parse error' 
      };
    }
  }

  /**
   * Tokenize expression into safe tokens
   */
  private static tokenize(expression: string): Token[] {
    const tokens: Token[] = [];
    let i = 0;

    while (i < expression.length) {
      const char = expression[i];

      // Skip whitespace
      if (/\s/.test(char)) {
        i++;
        continue;
      }

      // Numbers
      if (/\d/.test(char)) {
        let number = '';
        while (i < expression.length && /[\d.]/.test(expression[i])) {
          number += expression[i];
          i++;
        }
        tokens.push({ type: 'number', value: parseFloat(number) });
        continue;
      }

      // Strings
      if (char === '"' || char === "'") {
        const quote = char;
        let string = '';
        i++; // Skip opening quote
        while (i < expression.length && expression[i] !== quote) {
          string += expression[i];
          i++;
        }
        if (i >= expression.length) {
          throw new Error('Unterminated string');
        }
        i++; // Skip closing quote
        tokens.push({ type: 'string', value: string });
        continue;
      }

      // Identifiers
      if (/[a-zA-Z_]/.test(char)) {
        let identifier = '';
        while (i < expression.length && /[a-zA-Z0-9_.]/.test(expression[i])) {
          identifier += expression[i];
          i++;
        }
        
        if (!this.isAllowedIdentifier(identifier)) {
          throw new Error(`Forbidden identifier: ${identifier}`);
        }
        
        tokens.push({ type: 'identifier', value: identifier });
        continue;
      }

      // Operators
      if (char === '=' && expression[i + 1] === '=' && expression[i + 2] === '=') {
        tokens.push({ type: 'operator', value: '===' });
        i += 3;
        continue;
      }

      if (char === '!' && expression[i + 1] === '=' && expression[i + 2] === '=') {
        tokens.push({ type: 'operator', value: '!==' });
        i += 3;
        continue;
      }

      if (char === '=' && expression[i + 1] === '=') {
        tokens.push({ type: 'operator', value: '==' });
        i += 2;
        continue;
      }

      if (char === '!' && expression[i + 1] === '=') {
        tokens.push({ type: 'operator', value: '!=' });
        i += 2;
        continue;
      }

      if (char === '<' && expression[i + 1] === '=') {
        tokens.push({ type: 'operator', value: '<=' });
        i += 2;
        continue;
      }

      if (char === '>' && expression[i + 1] === '=') {
        tokens.push({ type: 'operator', value: '>=' });
        i += 2;
        continue;
      }

      if (char === '&' && expression[i + 1] === '&') {
        tokens.push({ type: 'operator', value: '&&' });
        i += 2;
        continue;
      }

      if (char === '|' && expression[i + 1] === '|') {
        tokens.push({ type: 'operator', value: '||' });
        i += 2;
        continue;
      }

      // Single character operators
      if ('+-*/%<>!?:()'.includes(char)) {
        tokens.push({ type: 'operator', value: char });
        i++;
        continue;
      }

      throw new Error(`Unexpected character: ${char}`);
    }

    return tokens;
  }

  /**
   * Check if identifier is allowed
   */
  private static isAllowedIdentifier(identifier: string): boolean {
    // Allow direct identifiers
    if (this.ALLOWED_IDENTIFIERS.has(identifier)) {
      return true;
    }

    // Allow property access on allowed objects
    const parts = identifier.split('.');
    if (parts.length === 2) {
      const [obj, prop] = parts;
      
      if (obj === 'data' || obj === 'context') {
        return true; // Allow any property on data/context
      }
      
      if (obj === 'Math' && this.ALLOWED_MATH_METHODS.has(prop)) {
        return true;
      }
      
      if (obj === 'Array' && this.ALLOWED_ARRAY_METHODS.has(prop)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Evaluate AST node
   */
  private static evaluateAST(node: ExpressionNode, context: EvaluationContext): any {
    switch (node.type) {
      case 'literal':
        return node.value;

      case 'identifier':
        return this.resolveIdentifier(node.value as string, context);

      case 'binary':
        const left = this.evaluateAST(node.left!, context);
        const right = this.evaluateAST(node.right!, context);
        return this.evaluateBinaryOperation(node.operator!, left, right);

      case 'unary':
        const operand = this.evaluateAST(node.operand!, context);
        return this.evaluateUnaryOperation(node.operator!, operand);

      case 'conditional':
        const test = this.evaluateAST(node.test!, context);
        return test ? 
          this.evaluateAST(node.consequent!, context) : 
          this.evaluateAST(node.alternate!, context);

      default:
        throw new Error(`Unknown node type: ${node.type}`);
    }
  }

  /**
   * Resolve identifier in context
   */
  private static resolveIdentifier(identifier: string, context: EvaluationContext): any {
    const parts = identifier.split('.');
    let value: any = context;

    for (const part of parts) {
      if (value && typeof value === 'object' && part in value) {
        value = value[part];
      } else {
        return undefined;
      }
    }

    return value;
  }

  /**
   * Evaluate binary operation
   */
  private static evaluateBinaryOperation(operator: string, left: any, right: any): any {
    switch (operator) {
      case '+': return left + right;
      case '-': return left - right;
      case '*': return left * right;
      case '/': return left / right;
      case '%': return left % right;
      case '===': return left === right;
      case '!==': return left !== right;
      case '==': return left == right;
      case '!=': return left != right;
      case '<': return left < right;
      case '>': return left > right;
      case '<=': return left <= right;
      case '>=': return left >= right;
      case '&&': return left && right;
      case '||': return left || right;
      default:
        throw new Error(`Unknown binary operator: ${operator}`);
    }
  }

  /**
   * Evaluate unary operation
   */
  private static evaluateUnaryOperation(operator: string, operand: any): any {
    switch (operator) {
      case '!': return !operand;
      case '-': return -operand;
      case '+': return +operand;
      default:
        throw new Error(`Unknown unary operator: ${operator}`);
    }
  }

  /**
   * Sanitize value to prevent prototype pollution
   */
  private static sanitizeValue(value: any): any {
    if (value === null || value === undefined) {
      return value;
    }

    if (typeof value !== 'object') {
      return value;
    }

    if (Array.isArray(value)) {
      return value.map(item => this.sanitizeValue(item));
    }

    const sanitized: any = {};
    for (const [key, val] of Object.entries(value)) {
      if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
        continue;
      }
      sanitized[key] = this.sanitizeValue(val);
    }

    return sanitized;
  }
}

interface Token {
  type: 'number' | 'string' | 'identifier' | 'operator';
  value: any;
}

interface ExpressionNode {
  type: 'literal' | 'identifier' | 'binary' | 'unary' | 'conditional';
  value?: any;
  operator?: string;
  left?: ExpressionNode;
  right?: ExpressionNode;
  operand?: ExpressionNode;
  test?: ExpressionNode;
  consequent?: ExpressionNode;
  alternate?: ExpressionNode;
}

class ExpressionParser {
  private tokens: Token[];
  private current = 0;

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  parseExpression(): ExpressionNode {
    return this.parseConditional();
  }

  private parseConditional(): ExpressionNode {
    let node = this.parseLogicalOr();

    if (this.match('operator', '?')) {
      const consequent = this.parseConditional();
      this.consume('operator', ':');
      const alternate = this.parseConditional();
      
      return {
        type: 'conditional',
        test: node,
        consequent,
        alternate,
      };
    }

    return node;
  }

  private parseLogicalOr(): ExpressionNode {
    let node = this.parseLogicalAnd();

    while (this.match('operator', '||')) {
      const operator = this.previous().value;
      const right = this.parseLogicalAnd();
      node = {
        type: 'binary',
        operator,
        left: node,
        right,
      };
    }

    return node;
  }

  private parseLogicalAnd(): ExpressionNode {
    let node = this.parseEquality();

    while (this.match('operator', '&&')) {
      const operator = this.previous().value;
      const right = this.parseEquality();
      node = {
        type: 'binary',
        operator,
        left: node,
        right,
      };
    }

    return node;
  }

  private parseEquality(): ExpressionNode {
    let node = this.parseComparison();

    while (this.match('operator', '===', '!==', '==', '!=')) {
      const operator = this.previous().value;
      const right = this.parseComparison();
      node = {
        type: 'binary',
        operator,
        left: node,
        right,
      };
    }

    return node;
  }

  private parseComparison(): ExpressionNode {
    let node = this.parseAddition();

    while (this.match('operator', '<', '>', '<=', '>=')) {
      const operator = this.previous().value;
      const right = this.parseAddition();
      node = {
        type: 'binary',
        operator,
        left: node,
        right,
      };
    }

    return node;
  }

  private parseAddition(): ExpressionNode {
    let node = this.parseMultiplication();

    while (this.match('operator', '+', '-')) {
      const operator = this.previous().value;
      const right = this.parseMultiplication();
      node = {
        type: 'binary',
        operator,
        left: node,
        right,
      };
    }

    return node;
  }

  private parseMultiplication(): ExpressionNode {
    let node = this.parseUnary();

    while (this.match('operator', '*', '/', '%')) {
      const operator = this.previous().value;
      const right = this.parseUnary();
      node = {
        type: 'binary',
        operator,
        left: node,
        right,
      };
    }

    return node;
  }

  private parseUnary(): ExpressionNode {
    if (this.match('operator', '!', '-', '+')) {
      const operator = this.previous().value;
      const operand = this.parseUnary();
      return {
        type: 'unary',
        operator,
        operand,
      };
    }

    return this.parsePrimary();
  }

  private parsePrimary(): ExpressionNode {
    if (this.match('number', 'string')) {
      return {
        type: 'literal',
        value: this.previous().value,
      };
    }

    if (this.match('identifier')) {
      return {
        type: 'identifier',
        value: this.previous().value,
      };
    }

    if (this.match('operator', '(')) {
      const expr = this.parseExpression();
      this.consume('operator', ')');
      return expr;
    }

    throw new Error('Unexpected token');
  }

  private match(...values: string[]): boolean {
    for (const value of values) {
      if (this.check('operator', value) || this.check('identifier', value) || 
          this.check('number', value) || this.check('string', value)) {
        this.advance();
        return true;
      }
    }
    return false;
  }

  private check(type: string, value?: string): boolean {
    if (this.isAtEnd()) return false;
    const token = this.peek();
    return token.type === type && (value === undefined || token.value === value);
  }

  private advance(): Token {
    if (!this.isAtEnd()) this.current++;
    return this.previous();
  }

  private isAtEnd(): boolean {
    return this.current >= this.tokens.length;
  }

  private peek(): Token {
    return this.tokens[this.current];
  }

  private previous(): Token {
    return this.tokens[this.current - 1];
  }

  private consume(type: string, value: string): Token {
    if (this.check(type, value)) return this.advance();
    throw new Error(`Expected ${type}:${value}`);
  }
}