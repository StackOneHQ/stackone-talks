/**
 * @stackone/prompt-defense
 *
 * Prompt injection defense framework for AI tool-calling
 *
 * @example
 * ```typescript
 * import { PromptDefense } from '@stackone/prompt-defense';
 *
 * const defense = new PromptDefense();
 *
 * // Sanitize a tool result
 * const result = defense.sanitizeToolResult(toolOutput, {
 *   toolName: 'gmail_get_message'
 * });
 *
 * // Get system prompt instructions
 * const systemPrompt = defense.getSystemPromptInstructions();
 *
 * // Quick one-liner
 * import { defend } from '@stackone/prompt-defense';
 * const safe = defend(toolOutput, 'gmail_get_message');
 * ```
 */

// Core types
export * from './types';

// Configuration
export {
  DEFAULT_CONFIG,
  DEFAULT_RISKY_FIELDS,
  DEFAULT_TRAVERSAL_CONFIG,
  DEFAULT_TOOL_RULES,
  createConfig,
} from './config';

// Utilities
export {
  generateDataBoundary,
  generateXMLBoundary,
  wrapWithBoundary,
  containsBoundaryPatterns,
  generateBoundaryInstructions,
} from './utils/boundary';

export {
  isRiskyField,
  getToolOverrideFields,
  matchesWildcard,
  getToolRule,
  shouldSkipField,
  getMaxFieldLength,
} from './utils/field-detection';

export {
  detectStructureType,
  isPaginatedResponse,
  getWrappedData,
  createSizeMetrics,
  estimateSize,
  updateSizeMetrics,
  shouldContinueTraversal,
  isPlainObject,
} from './utils/structure';

// Classifiers - Tier 1 (Pattern-based)
export {
  PatternDetector,
  createPatternDetector,
  DEFAULT_DETECTOR_CONFIG,
  type PatternDetectorConfig,
} from './classifiers/pattern-detector';

export {
  ALL_PATTERNS,
  ROLE_MARKER_PATTERNS,
  INSTRUCTION_OVERRIDE_PATTERNS,
  ROLE_ASSUMPTION_PATTERNS,
  SECURITY_BYPASS_PATTERNS,
  COMMAND_EXECUTION_PATTERNS,
  ENCODING_SUSPICIOUS_PATTERNS,
  PROMPT_LEAKING_PATTERNS,
  INDIRECT_INJECTION_PATTERNS,
  FAST_FILTER_KEYWORDS,
  containsFilterKeywords,
  getPatternsByCategory,
  getPatternsBySeverity,
  type PatternDefinition,
} from './classifiers/patterns';

// Classifiers - Tier 2 (MLP-based)
export {
  loadMLPWeights,
  mlpForward,
  mlpForwardBatch,
  type MLPWeights,
  type MLPModel,
} from './classifiers/mlp';

export {
  Embedder,
  createEmbedder,
  DEFAULT_EMBEDDER_CONFIG,
  type EmbedderConfig,
  type EmbedderResult,
} from './classifiers/embedder';

export {
  Tier2Classifier,
  createTier2Classifier,
  DEFAULT_TIER2_CLASSIFIER_CONFIG,
  type Tier2ClassifierConfig,
} from './classifiers/tier2-classifier';

// Pre-bundled weights
export { MLP_WEIGHTS, hasValidWeights } from './classifiers/weights';

// Sanitizers
export {
  normalizeUnicode,
  containsSuspiciousUnicode,
  analyzeSuspiciousUnicode,
} from './sanitizers/normalizer';

export {
  stripRoleMarkers,
  containsRoleMarkers,
  findRoleMarkers,
  DEFAULT_ROLE_STRIPPER_CONFIG,
  type RoleStripperConfig,
} from './sanitizers/role-stripper';

export {
  removePatterns,
  removeInstructionOverrides,
  removeRoleAssumptions,
  removeSecurityBypasses,
  removeCommandExecutions,
  DEFAULT_PATTERN_REMOVER_CONFIG,
  type PatternRemoverConfig,
  type PatternRemovalResult,
} from './sanitizers/pattern-remover';

export {
  detectEncoding,
  containsEncodedContent,
  containsSuspiciousEncoding,
  decodeAllEncoding,
  redactAllEncoding,
  DEFAULT_ENCODING_DETECTOR_CONFIG,
  type EncodingDetectorConfig,
  type EncodingDetectionResult,
  type EncodingDetection,
  type EncodingType,
} from './sanitizers/encoding-detector';

export {
  Sanitizer,
  createSanitizer,
  sanitizeText,
  suggestRiskLevel,
  DEFAULT_SANITIZER_CONFIG,
  type SanitizerConfig,
  type SanitizeOptions,
} from './sanitizers/sanitizer';

// Core - Tool Result Sanitizer
export {
  ToolResultSanitizer,
  createToolResultSanitizer,
  sanitizeToolResult,
  DEFAULT_TOOL_RESULT_SANITIZER_CONFIG,
  type ToolResultSanitizerConfig,
  type SanitizeToolResultOptions,
} from './core/tool-result-sanitizer';

// Core - Main PromptDefense class
export {
  PromptDefense,
  createPromptDefense,
  getDefaultPromptDefense,
  defend,
  type PromptDefenseOptions,
} from './core/prompt-defense';
