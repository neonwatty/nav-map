export const AGENT_CONTRACT_SCHEMA_VERSION = 'nav-map-agent-contract/v1';

export interface AgentContractArtifact {
  kind: string;
  path?: string;
  description?: string;
}

export interface AgentContractNextAction {
  label: string;
  command: string;
  reason?: string;
  safety?: 'read-only' | 'writes-local-files' | 'requires-review';
}

export interface AgentContract<TKind extends string, TData> {
  schemaVersion: typeof AGENT_CONTRACT_SCHEMA_VERSION;
  kind: TKind;
  generatedAt: string;
  summary: Record<string, unknown>;
  data: TData;
  artifacts: AgentContractArtifact[];
  nextActions: AgentContractNextAction[];
}

const SENSITIVE_KEY_PATTERN =
  /(^|[_-])(access[_-]?token|refresh[_-]?token|api[_-]?key|secret|password|token|private[_-]?key|database[_-]?url|authorization|bearer[_-]?auth|webhook[_-]?secret|cookie|cookies|local[_-]?storage)($|[_-])/i;
const SENSITIVE_VALUE_PATTERN =
  /cookie|localStorage|access_token|refresh_token|id_token|bearer\s+\S+|api[_-]?key\b|secret\b|database[_-]?url\b|postgres(?:ql)?:\/\/|password\b|token\b|private[_-]?key\b|-----BEGIN [A-Z ]*PRIVATE KEY-----|whsec_/i;

export function createAgentContract<TKind extends string, TData>(options: {
  kind: TKind;
  generatedAt?: string;
  summary: Record<string, unknown>;
  data: TData;
  artifacts?: AgentContractArtifact[];
  nextActions?: AgentContractNextAction[];
}): AgentContract<TKind, TData> {
  return redactAgentContractValue({
    schemaVersion: AGENT_CONTRACT_SCHEMA_VERSION,
    kind: options.kind,
    generatedAt: options.generatedAt ?? new Date().toISOString(),
    summary: options.summary,
    data: options.data,
    artifacts: options.artifacts ?? [],
    nextActions: options.nextActions ?? [],
  }) as AgentContract<TKind, TData>;
}

export function redactAgentContractValue(value: unknown): unknown {
  if (typeof value === 'string') {
    return redactAgentContractString(value);
  }
  if (Array.isArray(value)) {
    return value.map(item => redactAgentContractValue(item));
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, nestedValue]) => [
        key,
        isSensitiveKey(key) ? '[redacted]' : redactAgentContractValue(nestedValue),
      ])
    );
  }
  return value;
}

export function redactAgentContractString(value: string): string {
  return value
    .replace(
      /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g,
      '[redacted]'
    )
    .replace(
      /\b(access_token|refresh_token|id_token|token|api[_-]?key|secret|password|private[_-]?key)\s*[:=]\s*([^&\s]+)/gi,
      '$1=[redacted]'
    )
    .replace(
      /"(access_token|refresh_token|id_token|token|api[_-]?key|secret|password|private[_-]?key)"\s*:\s*"[^"]*"/gi,
      '"$1":"[redacted]"'
    )
    .replace(/\bBearer\s+[A-Za-z0-9._~+/=-]+/gi, 'Bearer [redacted]')
    .replace(/\bAuthorization:\s*Basic\s+[A-Za-z0-9._~+/=-]+/gi, 'Authorization: Basic [redacted]')
    .replace(/(postgres(?:ql)?:\/\/)[^\s]+/gi, '$1[redacted]')
    .replace(/\b(cookie|set-cookie):\s*[^\n\r]+/gi, '$1: [redacted]')
    .replace(/\bwhsec_[A-Za-z0-9_=-]+/gi, 'whsec_[redacted]')
    .replace(SENSITIVE_VALUE_PATTERN, '[redacted]');
}

function isSensitiveKey(key: string): boolean {
  const normalized = key.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase();
  return SENSITIVE_KEY_PATTERN.test(`_${normalized}_`);
}
