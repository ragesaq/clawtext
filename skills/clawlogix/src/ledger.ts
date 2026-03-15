import fs from "node:fs/promises";
import path from "node:path";

export type LedgerEvent = {
  ts: string;
  type: string;
  requestId?: string;
  data?: Record<string, unknown>;
};

export class Ledger {
  constructor(private readonly filePath: string) {}

  private async ensureDir() {
    await fs.mkdir(path.dirname(this.filePath), { recursive: true });
  }

  async append(event: LedgerEvent) {
    await this.ensureDir();
    await fs.appendFile(this.filePath, JSON.stringify(event) + "\n", "utf8");
  }
}
