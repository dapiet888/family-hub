interface SqlRows {
  toArray(): Record<string, unknown>[];
}

interface DurableObjectState {
  storage: {
    sql: {
      exec(query: string, ...bindings: unknown[]): SqlRows;
    };
  };
}

interface DurableObjectId {
  toString(): string;
}

interface DurableObjectNamespace {
  idFromName(name: string): DurableObjectId;
  get(id: DurableObjectId): { fetch(input: RequestInfo, init?: RequestInit): Promise<Response> };
}

declare module "cloudflare:workers" {
  export class DurableObject<E = unknown> {
    constructor(ctx: DurableObjectState, env: E);
    ctx: DurableObjectState;
    env: E;
  }
  export const env: { HOUSEHOLD?: DurableObjectNamespace };
}
