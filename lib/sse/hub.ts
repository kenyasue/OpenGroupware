import type { SseBroadcaster, SseEvent } from '@/lib/types';

/**
 * SSEクライアントの抽象。ReadableStreamのcontrollerを包む。
 */
export interface SseClient {
  enqueue(chunk: string): void;
  close(): void;
}

/**
 * プロジェクト単位のSSEクライアント管理・イベント配信を行うHub。
 * 配信は当該プロジェクトのクライアントのみに行い、他プロジェクトへ漏らさない。
 * モジュールシングルトン(getSseHub)でプロセス内共有する。
 */
export class SseHub implements SseBroadcaster {
  private readonly clients = new Map<number, Set<SseClient>>();

  addClient(projectId: number, client: SseClient): void {
    let set = this.clients.get(projectId);
    if (!set) {
      set = new Set();
      this.clients.set(projectId, set);
    }
    set.add(client);
  }

  removeClient(projectId: number, client: SseClient): void {
    this.clients.get(projectId)?.delete(client);
  }

  broadcast(projectId: number, event: SseEvent): void {
    const set = this.clients.get(projectId);
    if (!set || set.size === 0) return;
    const payload = `data: ${JSON.stringify(event)}\n\n`;
    for (const client of set) {
      try {
        client.enqueue(payload);
      } catch {
        // 書き込み失敗(切断済み等)のクライアントは除去
        set.delete(client);
      }
    }
  }

  /** テスト/監視用: プロジェクトの接続クライアント数 */
  getClientCount(projectId: number): number {
    return this.clients.get(projectId)?.size ?? 0;
  }
}

let hubInstance: SseHub | null = null;

/** プロセス全体で共有するSseHubシングルトンを取得する */
export function getSseHub(): SseHub {
  if (!hubInstance) {
    hubInstance = new SseHub();
  }
  return hubInstance;
}

/** テスト用途: シングルトンをリセットする */
export function resetSseHub(): void {
  hubInstance = null;
}
