import fs from 'fs/promises';
import path from 'path';

export interface DbConfig {
  host?: string;
  port?: number;
  database?: string;
  user?: string;
  password?: string;
}

const CONFIG_PATH = path.join(process.cwd(), 'config.json');

export async function getConfig(): Promise<DbConfig> {
  try {
    const data = await fs.readFile(CONFIG_PATH, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    return {};
  }
}

export async function setConfig(config: DbConfig): Promise<void> {
  await fs.writeFile(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf-8');
}
