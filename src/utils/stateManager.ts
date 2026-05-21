import fs from "fs/promises";
import path from "path";

const STATE_FILE_PATH = path.resolve(
  __dirname,
  "../../data/execution_state.json",
);

export const StateManager = {
  async getProcessedKeys(): Promise<string[]> {
    try {
      const data = await fs.readFile(STATE_FILE_PATH, "utf-8");
      return JSON.parse(data);
    } catch (error: any) {
      if (error.code === "ENOENT") {
        return [];
      }
      throw error;
    }
  },

  async addProcessedKeys(newKeys: string[]) {
    const existingKeys = await this.getProcessedKeys();
    const allKeys = Array.from(new Set([...existingKeys, ...newKeys]));

    await fs.writeFile(
      STATE_FILE_PATH,
      JSON.stringify(allKeys, null, 2),
      "utf-8",
    );
  },
};
