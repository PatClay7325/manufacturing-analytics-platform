/**
 * Plugin Security - Handles plugin signature verification and security policies
 */

import crypto from 'crypto';

export interface PluginSignatureInfo {
  signature: string;
  signedBy: string;
  signedAt: string;
  publicKey: string;
  algorithm: string;
  files: string[];
}

export interface SecurityPolicy {
  allowUnsigned: boolean;
  allowedSigners: string[];
  requiredPermissions: string[];
  blockedPlugins: string[];
  maxPluginSize: number; // bytes
  allowedHosts: string[];
  allowedProtocols: string[];
}

const DEFAULT_SECURITY_POLICY: SecurityPolicy = {
  allowUnsigned: false,
  allowedSigners: ['analyticsPlatform', 'core', 'verified-publisher'],
  requiredPermissions: [],
  blockedPlugins: [],
  maxPluginSize: 50 * 1024 * 1024, // 50MB
  allowedHosts: ['localhost', '127.0.0.1', 'api.analyticsPlatform.com'],
  allowedProtocols: ['https:', 'wss:']
};

/**
 * Verify plugin signature
 */
export async function verifyPluginSignature(
  pluginPath: string,
  manifest: any,
  policy: SecurityPolicy = DEFAULT_SECURITY_POLICY
): Promise<boolean> {
  try {
    // Check if plugin is blocked
    if (policy.blockedPlugins.includes(manifest.id)) {
      console.error(`Plugin ${manifest.id} is blocked by security policy`);
      return false;
    }

    // Load signature file
    const signaturePath = `${pluginPath}/MANIFEST.json`;
    const signatureResponse = await fetch(signaturePath);
    
    if (!signatureResponse.ok) {
      if (policy.allowUnsigned) {
        console.warn(`No signature found for plugin ${manifest.id}`);
        return true;
      }
      console.error(`No signature found for plugin ${manifest.id} and unsigned plugins are not allowed`);
      return false;
    }

    const signatureInfo: PluginSignatureInfo = await signatureResponse.json();

    // Verify signer is allowed
    if (!policy.allowedSigners.includes(signatureInfo.signedBy)) {
      console.error(`Plugin ${manifest.id} signed by unauthorized signer: ${signatureInfo.signedBy}`);
      return false;
    }

    // Verify signature
    const isValid = await verifySignature(pluginPath, signatureInfo);
    
    if (!isValid) {
      console.error(`Invalid signature for plugin ${manifest.id}`);
      return false;
    }

    // Verify manifest hash
    const manifestHash = await hashFile(`${pluginPath}/plugin.json`);
    const expectedHash = signatureInfo.files.find(f => f.includes('plugin.json'));
    
    if (!expectedHash || !expectedHash.includes(manifestHash)) {
      console.error(`Manifest hash mismatch for plugin ${manifest.id}`);
      return false;
    }

    console.log(`Plugin ${manifest.id} signature verified successfully`);
    return true;
  } catch (error) {
    console.error(`Error verifying plugin signature:`, error);
    return false;
  }
}

/**
 * Verify the cryptographic signature
 */
async function verifySignature(
  pluginPath: string,
  signatureInfo: PluginSignatureInfo
): Promise<boolean> {
  try {
    // Get public key
    const publicKey = await getPublicKey(signatureInfo.signedBy);
    if (!publicKey) {
      console.error(`No public key found for signer: ${signatureInfo.signedBy}`);
      return false;
    }

    // Create verification object
    const verify = crypto.createVerify(signatureInfo.algorithm || 'RSA-SHA256');

    // Add all signed files to verification
    for (const fileInfo of signatureInfo.files) {
      const [filePath, fileHash] = fileInfo.split(':');
      const actualHash = await hashFile(`${pluginPath}/${filePath}`);
      
      if (actualHash !== fileHash) {
        console.error(`Hash mismatch for file: ${filePath}`);
        return false;
      }
      
      verify.update(fileInfo);
    }

    // Verify signature
    return verify.verify(publicKey, signatureInfo.signature, 'base64');
  } catch (error) {
    console.error('Signature verification error:', error);
    return false;
  }
}

/**
 * Get public key for a signer
 */
async function getPublicKey(signer: string): Promise<string | null> {
  // In production, these would be fetched from a secure key server
  const publicKeys: Record<string, string> = {
    'analyticsPlatform': `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA3QfZ8XYGPzHs1XDZ5lKi
Ua6wZLv7KgJMBk2HZ5qr9MjlbjbHZz6m3HfeF+wKn3dVmgPCLwfVlnDEwmAKBGBW
wJwN2BhW8lY8xBwgmBCmBSevNnHHBZq6hqRkZGFMFpQ8w9GbKKQ5JhGrK5qhnpVE
7heVASYPhEusgSNdPL8p2dWugNf5FYr7hTNv6FXIiruYZgeudVJAPQpgnlF1Obwc
acOqlQxJUgSZekLGMlGbLaesLGkKjLrheLH6FGfMJJVVJmJnBhtXBMNnT7DC6iJ3
EiE9DzSSuZPPiWCbdV2kS3rVJjPd6koKRZGkXGhWIP9C2YLaMSBcWlGUsNNObXLM
uwIDAQAB
-----END PUBLIC KEY-----`,
    'core': `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAyNmBmUA7EGEJGZ9g4x0t
SoQPFmBzj+uN9i/L+zsdQenz0SKBDyHVqKNxjh7S6i2fXkdZqhEuVlY1f2u0cwmX
zMnGuHdU1IDrX/qbyKOEWFwVGWMCJTGUvC8s3p4VO8tzGcawFrVTqhtoHJXqWyD5
PVISV9SLrTYVDS2XM3Je9dntDQhYgcJLQtQ5SWCvUCfS6v9LxGCm3pTThmhVBKDU
V7fFfUYdJokLMZQTOwZKQvBVDlP8X0JZck5tUQPT1ML7sTJBJ0tQrQQNjHQsQO9z
6YD7vSITqhtJTfXycDOa2BkdJb6sK1rLDZVLpQ9UhGl9PqRBnfEZvwO9tQnQWQQa
1wIDAQAB
-----END PUBLIC KEY-----`,
    'verified-publisher': `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA0bD8k6PIijy7aVFI7XAt
9PkJgQ7V8IbVGVqyNjBCGQqz0qG9NSuAW1wvZ3MvhFQxYvR2ijgSJl3diMvPQBr7
0TYsvgpMS2pilCbOQUI9M7gyupQH7PaCEmYtLHwFNL4P6zj4nj5l6U9w0bNqJLkO
4V7H8z3PLQkUVTMcB0x7jbRJOLNenPBBz3V6VQ8wrErfCMdGx8TLtvQMG6L9PWKK
VQbVQNBJtC0HRSLbzBFfZ1VvVJQQcHQGZR0qjlG8LvHh9xY9D3cXLsGqgo8hoOOG
QrbmDPUdFOHFE0fg0xNcshXlHBIqbam6dH3TqoQhKieGERaWr7eJqg1h2qZEPVgG
HwIDAQAB
-----END PUBLIC KEY-----`
  };

  return publicKeys[signer] || null;
}

/**
 * Hash a file
 */
async function hashFile(filePath: string): Promise<string> {
  try {
    const response = await fetch(filePath);
    const buffer = await response.arrayBuffer();
    const hash = crypto.createHash('sha256');
    hash.update(Buffer.from(buffer));
    return hash.digest('hex');
  } catch (error) {
    console.error(`Failed to hash file ${filePath}:`, error);
    throw error;
  }
}

/**
 * Generate plugin signature (for plugin developers)
 */
export async function signPlugin(
  pluginPath: string,
  privateKey: string,
  signer: string
): Promise<PluginSignatureInfo> {
  const files: string[] = [];
  const algorithm = 'RSA-SHA256';

  // Get list of files to sign
  const filesToSign = [
    'plugin.json',
    'module.js',
    'module.css',
    'README.md',
    'CHANGELOG.md'
  ];

  // Hash each file
  for (const file of filesToSign) {
    try {
      const hash = await hashFile(`${pluginPath}/${file}`);
      files.push(`${file}:${hash}`);
    } catch (error) {
      // File might not exist, skip
    }
  }

  // Create signature
  const sign = crypto.createSign(algorithm);
  for (const fileInfo of files) {
    sign.update(fileInfo);
  }
  
  const signature = sign.sign(privateKey, 'base64');

  const signatureInfo: PluginSignatureInfo = {
    signature,
    signedBy: signer,
    signedAt: new Date().toISOString(),
    publicKey: '', // Would be the public key corresponding to privateKey
    algorithm,
    files
  };

  return signatureInfo;
}

/**
 * Check if plugin code is safe to execute
 */
export function isPluginSafe(
  code: string,
  policy: SecurityPolicy = DEFAULT_SECURITY_POLICY
): boolean {
  // Check size limit
  if (code.length > policy.maxPluginSize) {
    console.error('Plugin exceeds maximum allowed size');
    return false;
  }

  // Check for blocked patterns
  const blockedPatterns = [
    /require\s*\(\s*['"`]child_process['"`]\s*\)/,
    /require\s*\(\s*['"`]fs['"`]\s*\)/,
    /process\s*\.\s*exit/,
    /process\s*\.\s*kill/,
    /__dirname/,
    /__filename/
  ];

  for (const pattern of blockedPatterns) {
    if (pattern.test(code)) {
      console.error('Plugin contains blocked pattern');
      return false;
    }
  }

  return true;
}

/**
 * Sanitize plugin configuration
 */
export function sanitizePluginConfig(config: any): any {
  const sanitized = { ...config };

  // Remove sensitive fields
  const sensitiveFields = [
    'password',
    'secret',
    'token',
    'apiKey',
    'privateKey',
    'credentials'
  ];

  const removeSensitive = (obj: any) => {
    for (const key in obj) {
      if (sensitiveFields.some(field => key.toLowerCase().includes(field.toLowerCase()))) {
        delete obj[key];
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        removeSensitive(obj[key]);
      }
    }
  };

  removeSensitive(sanitized);
  return sanitized;
}

/**
 * Create Content Security Policy for plugin
 */
export function createPluginCSP(
  pluginId: string,
  policy: SecurityPolicy = DEFAULT_SECURITY_POLICY
): string {
  const directives = [
    `default-src 'none'`,
    `script-src 'self' 'unsafe-inline' 'unsafe-eval'`, // Plugins may need eval
    `style-src 'self' 'unsafe-inline'`,
    `img-src 'self' data: https:`,
    `font-src 'self' data:`,
    `connect-src 'self' ${policy.allowedHosts.join(' ')}`,
    `frame-src 'none'`,
    `object-src 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `frame-ancestors 'none'`
  ];

  return directives.join('; ');
}

/**
 * Validate plugin network request
 */
export function validateNetworkRequest(
  url: string,
  policy: SecurityPolicy = DEFAULT_SECURITY_POLICY
): boolean {
  try {
    const urlObj = new URL(url);

    // Check protocol
    if (!policy.allowedProtocols.includes(urlObj.protocol)) {
      console.error(`Protocol not allowed: ${urlObj.protocol}`);
      return false;
    }

    // Check host
    if (!policy.allowedHosts.includes(urlObj.hostname)) {
      console.error(`Host not allowed: ${urlObj.hostname}`);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Invalid URL:', error);
    return false;
  }
}