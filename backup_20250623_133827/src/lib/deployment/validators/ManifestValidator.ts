/**
 * Production Kubernetes Manifest Validator
 * Comprehensive validation for all Kubernetes resource types
 */

import { logger } from '@/lib/logger';
import Joi from 'joi';

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  path: string;
  message: string;
  severity: 'error';
  rule: string;
}

export interface ValidationWarning {
  path: string;
  message: string;
  severity: 'warning';
  rule: string;
}

export class ManifestValidator {
  private customRules: Map<string, (manifest: any) => ValidationResult> = new Map();

  constructor() {
    this.registerDefaultRules();
  }

  /**
   * Register default validation rules
   */
  private registerDefaultRules(): void {
    // Security rules
    this.addRule('no-root-containers', this.validateNoRootContainers.bind(this));
    this.addRule('resource-limits', this.validateResourceLimits.bind(this));
    this.addRule('image-pull-policy', this.validateImagePullPolicy.bind(this));
    this.addRule('pod-security-context', this.validatePodSecurityContext.bind(this));
    this.addRule('container-security-context', this.validateContainerSecurityContext.bind(this));
    this.addRule('network-policies', this.validateNetworkPolicies.bind(this));
    this.addRule('service-account', this.validateServiceAccount.bind(this));
    
    // Best practices
    this.addRule('labels-required', this.validateRequiredLabels.bind(this));
    this.addRule('probes-configured', this.validateProbes.bind(this));
    this.addRule('anti-affinity', this.validateAntiAffinity.bind(this));
    this.addRule('pdb-configured', this.validatePodDisruptionBudget.bind(this));
  }

  /**
   * Add custom validation rule
   */
  addRule(name: string, validator: (manifest: any) => ValidationResult): void {
    this.customRules.set(name, validator);
  }

  /**
   * Validate Kubernetes manifest
   */
  async validate(manifest: any): ValidationResult {
    const results: ValidationResult = {
      valid: true,
      errors: [],
      warnings: []
    };

    try {
      // Basic structure validation
      const structureResult = this.validateStructure(manifest);
      results.errors.push(...structureResult.errors);
      results.warnings.push(...structureResult.warnings);

      // API version validation
      const apiResult = this.validateApiVersion(manifest);
      results.errors.push(...apiResult.errors);
      results.warnings.push(...apiResult.warnings);

      // Kind-specific validation
      const kindResult = await this.validateByKind(manifest);
      results.errors.push(...kindResult.errors);
      results.warnings.push(...kindResult.warnings);

      // Run custom rules
      for (const [ruleName, validator] of this.customRules) {
        try {
          const ruleResult = validator(manifest);
          results.errors.push(...ruleResult.errors);
          results.warnings.push(...ruleResult.warnings);
        } catch (error) {
          logger.warn({
            rule: ruleName,
            error: error.message
          }, 'Validation rule failed');
        }
      }

      results.valid = results.errors.length === 0;

    } catch (error) {
      results.valid = false;
      results.errors.push({
        path: 'root',
        message: `Validation failed: ${error.message}`,
        severity: 'error',
        rule: 'general'
      });
    }

    return results;
  }

  /**
   * Validate basic manifest structure
   */
  private validateStructure(manifest: any): ValidationResult {
    const schema = Joi.object({
      apiVersion: Joi.string().required(),
      kind: Joi.string().required(),
      metadata: Joi.object({
        name: Joi.string().required(),
        namespace: Joi.string(),
        labels: Joi.object(),
        annotations: Joi.object()
      }).required(),
      spec: Joi.object().required()
    }).unknown(true);

    const { error } = schema.validate(manifest);
    
    if (error) {
      return {
        valid: false,
        errors: error.details.map(detail => ({
          path: detail.path.join('.'),
          message: detail.message,
          severity: 'error' as const,
          rule: 'structure'
        })),
        warnings: []
      };
    }

    return { valid: true, errors: [], warnings: [] };
  }

  /**
   * Validate API version
   */
  private validateApiVersion(manifest: any): ValidationResult {
    const results: ValidationResult = { valid: true, errors: [], warnings: [] };
    
    const deprecatedAPIs: Record<string, string> = {
      'extensions/v1beta1': 'apps/v1',
      'apps/v1beta1': 'apps/v1',
      'apps/v1beta2': 'apps/v1',
      'batch/v1beta1': 'batch/v1',
      'rbac.authorization.k8s.io/v1beta1': 'rbac.authorization.k8s.io/v1'
    };

    if (deprecatedAPIs[manifest.apiVersion]) {
      results.warnings.push({
        path: 'apiVersion',
        message: `API version ${manifest.apiVersion} is deprecated. Use ${deprecatedAPIs[manifest.apiVersion]} instead.`,
        severity: 'warning',
        rule: 'api-version'
      });
    }

    return results;
  }

  /**
   * Validate based on resource kind
   */
  private async validateByKind(manifest: any): Promise<ValidationResult> {
    const results: ValidationResult = { valid: true, errors: [], warnings: [] };

    switch (manifest.kind) {
      case 'Deployment':
        return this.validateDeployment(manifest);
      
      case 'Service':
        return this.validateService(manifest);
      
      case 'ConfigMap':
        return this.validateConfigMap(manifest);
      
      case 'Secret':
        return this.validateSecret(manifest);
      
      case 'StatefulSet':
        return this.validateStatefulSet(manifest);
      
      case 'DaemonSet':
        return this.validateDaemonSet(manifest);
      
      case 'Job':
        return this.validateJob(manifest);
      
      case 'CronJob':
        return this.validateCronJob(manifest);
      
      case 'Ingress':
        return this.validateIngress(manifest);
      
      default:
        // Generic validation for other kinds
        return results;
    }
  }

  /**
   * Validate Deployment
   */
  private validateDeployment(manifest: any): ValidationResult {
    const results: ValidationResult = { valid: true, errors: [], warnings: [] };

    // Check replicas
    if (!manifest.spec.replicas || manifest.spec.replicas < 1) {
      results.warnings.push({
        path: 'spec.replicas',
        message: 'Consider setting replicas > 1 for high availability',
        severity: 'warning',
        rule: 'deployment-replicas'
      });
    }

    // Check update strategy
    if (!manifest.spec.strategy) {
      results.warnings.push({
        path: 'spec.strategy',
        message: 'No update strategy defined. Consider setting RollingUpdate strategy.',
        severity: 'warning',
        rule: 'deployment-strategy'
      });
    }

    // Check pod template
    if (manifest.spec.template) {
      const podResult = this.validatePodTemplate(manifest.spec.template);
      results.errors.push(...podResult.errors);
      results.warnings.push(...podResult.warnings);
    }

    return results;
  }

  /**
   * Validate Pod template
   */
  private validatePodTemplate(template: any): ValidationResult {
    const results: ValidationResult = { valid: true, errors: [], warnings: [] };

    if (!template.spec || !template.spec.containers) {
      results.errors.push({
        path: 'spec.template.spec.containers',
        message: 'Pod template must have containers',
        severity: 'error',
        rule: 'pod-containers'
      });
      return results;
    }

    // Validate each container
    template.spec.containers.forEach((container: any, index: number) => {
      const containerPath = `spec.template.spec.containers[${index}]`;
      
      // Check image
      if (!container.image) {
        results.errors.push({
          path: `${containerPath}.image`,
          message: 'Container image is required',
          severity: 'error',
          rule: 'container-image'
        });
      } else if (!container.image.includes(':') || container.image.endsWith(':latest')) {
        results.warnings.push({
          path: `${containerPath}.image`,
          message: 'Avoid using :latest tag. Use specific version tags.',
          severity: 'warning',
          rule: 'image-tag'
        });
      }

      // Check resources
      if (!container.resources) {
        results.errors.push({
          path: `${containerPath}.resources`,
          message: 'Resource limits and requests must be specified',
          severity: 'error',
          rule: 'container-resources'
        });
      } else {
        if (!container.resources.limits) {
          results.errors.push({
            path: `${containerPath}.resources.limits`,
            message: 'Resource limits must be specified',
            severity: 'error',
            rule: 'resource-limits'
          });
        }
        if (!container.resources.requests) {
          results.warnings.push({
            path: `${containerPath}.resources.requests`,
            message: 'Resource requests should be specified',
            severity: 'warning',
            rule: 'resource-requests'
          });
        }
      }
    });

    return results;
  }

  /**
   * Validate Service
   */
  private validateService(manifest: any): ValidationResult {
    const results: ValidationResult = { valid: true, errors: [], warnings: [] };

    // Check selector
    if (!manifest.spec.selector || Object.keys(manifest.spec.selector).length === 0) {
      results.errors.push({
        path: 'spec.selector',
        message: 'Service selector is required',
        severity: 'error',
        rule: 'service-selector'
      });
    }

    // Check ports
    if (!manifest.spec.ports || manifest.spec.ports.length === 0) {
      results.errors.push({
        path: 'spec.ports',
        message: 'Service must define at least one port',
        severity: 'error',
        rule: 'service-ports'
      });
    }

    return results;
  }

  /**
   * Validate ConfigMap
   */
  private validateConfigMap(manifest: any): ValidationResult {
    const results: ValidationResult = { valid: true, errors: [], warnings: [] };

    // Check if data or binaryData exists
    if (!manifest.data && !manifest.binaryData) {
      results.warnings.push({
        path: 'data',
        message: 'ConfigMap has no data',
        severity: 'warning',
        rule: 'configmap-data'
      });
    }

    // Check for sensitive data
    if (manifest.data) {
      const sensitivePatterns = [
        /password/i,
        /secret/i,
        /key/i,
        /token/i,
        /credential/i
      ];

      Object.keys(manifest.data).forEach(key => {
        if (sensitivePatterns.some(pattern => pattern.test(key))) {
          results.warnings.push({
            path: `data.${key}`,
            message: 'Possible sensitive data in ConfigMap. Consider using Secret instead.',
            severity: 'warning',
            rule: 'sensitive-data'
          });
        }
      });
    }

    return results;
  }

  /**
   * Validate Secret
   */
  private validateSecret(manifest: any): ValidationResult {
    const results: ValidationResult = { valid: true, errors: [], warnings: [] };

    // Check type
    const validTypes = [
      'Opaque',
      'kubernetes.io/service-account-token',
      'kubernetes.io/dockercfg',
      'kubernetes.io/dockerconfigjson',
      'kubernetes.io/basic-auth',
      'kubernetes.io/ssh-auth',
      'kubernetes.io/tls'
    ];

    if (manifest.type && !validTypes.includes(manifest.type)) {
      results.warnings.push({
        path: 'type',
        message: `Unknown secret type: ${manifest.type}`,
        severity: 'warning',
        rule: 'secret-type'
      });
    }

    return results;
  }

  /**
   * Validate StatefulSet
   */
  private validateStatefulSet(manifest: any): ValidationResult {
    const results: ValidationResult = { valid: true, errors: [], warnings: [] };

    // Check serviceName
    if (!manifest.spec.serviceName) {
      results.errors.push({
        path: 'spec.serviceName',
        message: 'StatefulSet must have serviceName',
        severity: 'error',
        rule: 'statefulset-service'
      });
    }

    // Check volumeClaimTemplates for persistent workloads
    if (!manifest.spec.volumeClaimTemplates || manifest.spec.volumeClaimTemplates.length === 0) {
      results.warnings.push({
        path: 'spec.volumeClaimTemplates',
        message: 'StatefulSet typically needs persistent storage',
        severity: 'warning',
        rule: 'statefulset-storage'
      });
    }

    // Validate pod template
    if (manifest.spec.template) {
      const podResult = this.validatePodTemplate(manifest.spec.template);
      results.errors.push(...podResult.errors);
      results.warnings.push(...podResult.warnings);
    }

    return results;
  }

  /**
   * Validate DaemonSet
   */
  private validateDaemonSet(manifest: any): ValidationResult {
    const results: ValidationResult = { valid: true, errors: [], warnings: [] };

    // DaemonSets typically need privileged access
    if (manifest.spec.template?.spec?.containers) {
      const hasPrivileged = manifest.spec.template.spec.containers.some(
        (c: any) => c.securityContext?.privileged
      );

      if (hasPrivileged) {
        results.warnings.push({
          path: 'spec.template.spec.containers',
          message: 'DaemonSet uses privileged containers. Ensure this is necessary.',
          severity: 'warning',
          rule: 'daemonset-privileged'
        });
      }
    }

    // Validate pod template
    if (manifest.spec.template) {
      const podResult = this.validatePodTemplate(manifest.spec.template);
      results.errors.push(...podResult.errors);
      results.warnings.push(...podResult.warnings);
    }

    return results;
  }

  /**
   * Validate Job
   */
  private validateJob(manifest: any): ValidationResult {
    const results: ValidationResult = { valid: true, errors: [], warnings: [] };

    // Check completions and parallelism
    if (!manifest.spec.completions) {
      results.warnings.push({
        path: 'spec.completions',
        message: 'Consider setting completions for Job',
        severity: 'warning',
        rule: 'job-completions'
      });
    }

    // Check backoffLimit
    if (manifest.spec.backoffLimit === undefined) {
      results.warnings.push({
        path: 'spec.backoffLimit',
        message: 'Consider setting backoffLimit to prevent infinite retries',
        severity: 'warning',
        rule: 'job-backoff'
      });
    }

    return results;
  }

  /**
   * Validate CronJob
   */
  private validateCronJob(manifest: any): ValidationResult {
    const results: ValidationResult = { valid: true, errors: [], warnings: [] };

    // Validate schedule
    if (!manifest.spec.schedule) {
      results.errors.push({
        path: 'spec.schedule',
        message: 'CronJob must have schedule',
        severity: 'error',
        rule: 'cronjob-schedule'
      });
    } else {
      // Basic cron expression validation
      const cronRegex = /^(\*|([0-9]|[1-5][0-9])) (\*|([0-9]|[1-5][0-9])) (\*|([0-9]|1[0-9]|2[0-3])) (\*|([1-9]|[1-2][0-9]|3[0-1])) (\*|([1-9]|1[0-2]))$/;
      if (!cronRegex.test(manifest.spec.schedule)) {
        results.warnings.push({
          path: 'spec.schedule',
          message: 'Cron schedule may be invalid',
          severity: 'warning',
          rule: 'cronjob-schedule-format'
        });
      }
    }

    return results;
  }

  /**
   * Validate Ingress
   */
  private validateIngress(manifest: any): ValidationResult {
    const results: ValidationResult = { valid: true, errors: [], warnings: [] };

    // Check TLS configuration
    if (!manifest.spec.tls) {
      results.warnings.push({
        path: 'spec.tls',
        message: 'Consider enabling TLS for Ingress',
        severity: 'warning',
        rule: 'ingress-tls'
      });
    }

    // Check rules
    if (!manifest.spec.rules || manifest.spec.rules.length === 0) {
      results.errors.push({
        path: 'spec.rules',
        message: 'Ingress must have at least one rule',
        severity: 'error',
        rule: 'ingress-rules'
      });
    }

    return results;
  }

  // Security validation rules

  private validateNoRootContainers(manifest: any): ValidationResult {
    const results: ValidationResult = { valid: true, errors: [], warnings: [] };

    if (manifest.kind === 'Pod' || manifest.spec?.template?.spec) {
      const spec = manifest.kind === 'Pod' ? manifest.spec : manifest.spec.template.spec;
      
      spec.containers?.forEach((container: any, index: number) => {
        if (container.securityContext?.runAsUser === 0) {
          results.errors.push({
            path: `spec.containers[${index}].securityContext.runAsUser`,
            message: 'Container should not run as root (UID 0)',
            severity: 'error',
            rule: 'no-root-containers'
          });
        }
      });
    }

    return results;
  }

  private validateResourceLimits(manifest: any): ValidationResult {
    const results: ValidationResult = { valid: true, errors: [], warnings: [] };

    if (manifest.spec?.template?.spec?.containers) {
      manifest.spec.template.spec.containers.forEach((container: any, index: number) => {
        if (!container.resources?.limits?.memory) {
          results.errors.push({
            path: `spec.template.spec.containers[${index}].resources.limits.memory`,
            message: 'Memory limit must be specified',
            severity: 'error',
            rule: 'resource-limits'
          });
        }
        if (!container.resources?.limits?.cpu) {
          results.warnings.push({
            path: `spec.template.spec.containers[${index}].resources.limits.cpu`,
            message: 'CPU limit should be specified',
            severity: 'warning',
            rule: 'resource-limits'
          });
        }
      });
    }

    return results;
  }

  private validateImagePullPolicy(manifest: any): ValidationResult {
    const results: ValidationResult = { valid: true, errors: [], warnings: [] };

    if (manifest.spec?.template?.spec?.containers) {
      manifest.spec.template.spec.containers.forEach((container: any, index: number) => {
        if (container.imagePullPolicy === 'Always' && container.image?.includes(':latest')) {
          results.warnings.push({
            path: `spec.template.spec.containers[${index}].imagePullPolicy`,
            message: 'Using imagePullPolicy: Always with :latest tag can cause issues',
            severity: 'warning',
            rule: 'image-pull-policy'
          });
        }
      });
    }

    return results;
  }

  private validatePodSecurityContext(manifest: any): ValidationResult {
    const results: ValidationResult = { valid: true, errors: [], warnings: [] };

    if (manifest.spec?.template?.spec) {
      const securityContext = manifest.spec.template.spec.securityContext;
      
      if (!securityContext) {
        results.warnings.push({
          path: 'spec.template.spec.securityContext',
          message: 'Pod should have security context defined',
          severity: 'warning',
          rule: 'pod-security-context'
        });
      } else {
        if (!securityContext.runAsNonRoot) {
          results.warnings.push({
            path: 'spec.template.spec.securityContext.runAsNonRoot',
            message: 'Consider setting runAsNonRoot: true',
            severity: 'warning',
            rule: 'pod-security-context'
          });
        }
        if (!securityContext.fsGroup) {
          results.warnings.push({
            path: 'spec.template.spec.securityContext.fsGroup',
            message: 'Consider setting fsGroup for volume permissions',
            severity: 'warning',
            rule: 'pod-security-context'
          });
        }
      }
    }

    return results;
  }

  private validateContainerSecurityContext(manifest: any): ValidationResult {
    const results: ValidationResult = { valid: true, errors: [], warnings: [] };

    if (manifest.spec?.template?.spec?.containers) {
      manifest.spec.template.spec.containers.forEach((container: any, index: number) => {
        const securityContext = container.securityContext;
        
        if (!securityContext) {
          results.warnings.push({
            path: `spec.template.spec.containers[${index}].securityContext`,
            message: 'Container should have security context defined',
            severity: 'warning',
            rule: 'container-security-context'
          });
        } else {
          if (!securityContext.allowPrivilegeEscalation === false) {
            results.warnings.push({
              path: `spec.template.spec.containers[${index}].securityContext.allowPrivilegeEscalation`,
              message: 'Set allowPrivilegeEscalation: false',
              severity: 'warning',
              rule: 'container-security-context'
            });
          }
          if (!securityContext.readOnlyRootFilesystem) {
            results.warnings.push({
              path: `spec.template.spec.containers[${index}].securityContext.readOnlyRootFilesystem`,
              message: 'Consider setting readOnlyRootFilesystem: true',
              severity: 'warning',
              rule: 'container-security-context'
            });
          }
          if (!securityContext.capabilities?.drop?.includes('ALL')) {
            results.warnings.push({
              path: `spec.template.spec.containers[${index}].securityContext.capabilities`,
              message: 'Consider dropping all capabilities and adding only required ones',
              severity: 'warning',
              rule: 'container-security-context'
            });
          }
        }
      });
    }

    return results;
  }

  private validateNetworkPolicies(manifest: any): ValidationResult {
    const results: ValidationResult = { valid: true, errors: [], warnings: [] };

    if (manifest.kind === 'NetworkPolicy') {
      if (!manifest.spec.policyTypes || manifest.spec.policyTypes.length === 0) {
        results.errors.push({
          path: 'spec.policyTypes',
          message: 'NetworkPolicy must specify policyTypes',
          severity: 'error',
          rule: 'network-policies'
        });
      }
    }

    return results;
  }

  private validateServiceAccount(manifest: any): ValidationResult {
    const results: ValidationResult = { valid: true, errors: [], warnings: [] };

    if (manifest.spec?.template?.spec) {
      if (manifest.spec.template.spec.serviceAccount === 'default') {
        results.warnings.push({
          path: 'spec.template.spec.serviceAccount',
          message: 'Avoid using default service account. Create a dedicated one.',
          severity: 'warning',
          rule: 'service-account'
        });
      }
      if (manifest.spec.template.spec.automountServiceAccountToken !== false) {
        results.warnings.push({
          path: 'spec.template.spec.automountServiceAccountToken',
          message: 'Consider setting automountServiceAccountToken: false if not needed',
          severity: 'warning',
          rule: 'service-account'
        });
      }
    }

    return results;
  }

  private validateRequiredLabels(manifest: any): ValidationResult {
    const results: ValidationResult = { valid: true, errors: [], warnings: [] };
    
    const requiredLabels = ['app', 'version', 'environment'];
    const recommendedLabels = ['team', 'component', 'part-of'];

    if (!manifest.metadata.labels) {
      results.errors.push({
        path: 'metadata.labels',
        message: 'Resource must have labels',
        severity: 'error',
        rule: 'labels-required'
      });
    } else {
      requiredLabels.forEach(label => {
        if (!manifest.metadata.labels[label]) {
          results.errors.push({
            path: `metadata.labels.${label}`,
            message: `Required label '${label}' is missing`,
            severity: 'error',
            rule: 'labels-required'
          });
        }
      });

      recommendedLabels.forEach(label => {
        if (!manifest.metadata.labels[label]) {
          results.warnings.push({
            path: `metadata.labels.${label}`,
            message: `Recommended label '${label}' is missing`,
            severity: 'warning',
            rule: 'labels-required'
          });
        }
      });
    }

    return results;
  }

  private validateProbes(manifest: any): ValidationResult {
    const results: ValidationResult = { valid: true, errors: [], warnings: [] };

    if (manifest.spec?.template?.spec?.containers) {
      manifest.spec.template.spec.containers.forEach((container: any, index: number) => {
        if (!container.livenessProbe) {
          results.warnings.push({
            path: `spec.template.spec.containers[${index}].livenessProbe`,
            message: 'Container should have liveness probe',
            severity: 'warning',
            rule: 'probes-configured'
          });
        }
        if (!container.readinessProbe) {
          results.warnings.push({
            path: `spec.template.spec.containers[${index}].readinessProbe`,
            message: 'Container should have readiness probe',
            severity: 'warning',
            rule: 'probes-configured'
          });
        }
      });
    }

    return results;
  }

  private validateAntiAffinity(manifest: any): ValidationResult {
    const results: ValidationResult = { valid: true, errors: [], warnings: [] };

    if (manifest.kind === 'Deployment' || manifest.kind === 'StatefulSet') {
      if (manifest.spec.replicas > 1) {
        const affinity = manifest.spec.template?.spec?.affinity;
        
        if (!affinity?.podAntiAffinity) {
          results.warnings.push({
            path: 'spec.template.spec.affinity.podAntiAffinity',
            message: 'Consider adding pod anti-affinity for high availability',
            severity: 'warning',
            rule: 'anti-affinity'
          });
        }
      }
    }

    return results;
  }

  private validatePodDisruptionBudget(manifest: any): ValidationResult {
    const results: ValidationResult = { valid: true, errors: [], warnings: [] };

    if (manifest.kind === 'PodDisruptionBudget') {
      if (!manifest.spec.minAvailable && !manifest.spec.maxUnavailable) {
        results.errors.push({
          path: 'spec',
          message: 'PDB must specify either minAvailable or maxUnavailable',
          severity: 'error',
          rule: 'pdb-configured'
        });
      }
    } else if ((manifest.kind === 'Deployment' || manifest.kind === 'StatefulSet') && manifest.spec.replicas > 1) {
      results.warnings.push({
        path: 'spec',
        message: 'Consider creating a PodDisruptionBudget for this workload',
        severity: 'warning',
        rule: 'pdb-configured'
      });
    }

    return results;
  }
}

// Export singleton instance
export const manifestValidator = new ManifestValidator();