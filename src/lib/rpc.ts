import type { ParsedTx } from './trades.ts';

export interface SignatureInfo {
  signature: string;
  slot: number;
  blockTime: number | null;
  err: unknown;
}

export class RpcError extends Error {
  constructor(message: string, public readonly status?: number) {
    super(message);
  }
}

/** Small JSON-RPC client for a Solana node: bounded concurrency, timeouts and retries on rate limits. */
export class RpcClient {
  private inFlight = 0;
  private waiters: (() => void)[] = [];
  public calls = 0;

  constructor(public readonly url: string, private readonly concurrency = 3) {}

  private async acquire(): Promise<void> {
    if (this.inFlight < this.concurrency) {
      this.inFlight += 1;
      return;
    }
    await new Promise<void>((resolve) => this.waiters.push(resolve));
    this.inFlight += 1;
  }

  private release(): void {
    this.inFlight -= 1;
    const next = this.waiters.shift();
    if (next) next();
  }

  async call<T>(method: string, params: unknown[], attempt = 0): Promise<T> {
    await this.acquire();
    try {
      this.calls += 1;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 25_000);
      let res: Response;
      try {
        res = await fetch(this.url, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timer);
      }
      if (res.status === 429 || res.status >= 500) {
        if (attempt < 3) {
          this.release();
          await sleep(800 * 2 ** attempt);
          return this.call<T>(method, params, attempt + 1);
        }
        throw new RpcError(`RPC ${res.status}`, res.status);
      }
      if (!res.ok) throw new RpcError(`RPC ${res.status}`, res.status);
      const json = (await res.json()) as { result?: T; error?: { code: number; message: string } };
      if (json.error) throw new RpcError(json.error.message, json.error.code);
      return json.result as T;
    } finally {
      this.release();
    }
  }

  getSignatures(address: string, opts: { limit?: number; until?: string } = {}): Promise<SignatureInfo[]> {
    const params: Record<string, unknown> = { limit: opts.limit ?? 15, commitment: 'confirmed' };
    if (opts.until) params.until = opts.until;
    return this.call<SignatureInfo[]>('getSignaturesForAddress', [address, params]);
  }

  getTransaction(signature: string): Promise<ParsedTx | null> {
    return this.call<ParsedTx | null>('getTransaction', [
      signature,
      { encoding: 'jsonParsed', maxSupportedTransactionVersion: 1, commitment: 'confirmed' },
    ]);
  }

  getSlot(): Promise<number> {
    return this.call<number>('getSlot', []);
  }
}

export const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
