"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StateManager = void 0;
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const STATE_FILE_PATH = path_1.default.resolve(__dirname, "../../data/execution_state.json");
exports.StateManager = {
    async getProcessedKeys() {
        try {
            const data = await promises_1.default.readFile(STATE_FILE_PATH, "utf-8");
            return JSON.parse(data);
        }
        catch (error) {
            if (error.code === "ENOENT") {
                return [];
            }
            throw error;
        }
    },
    async addProcessedKeys(newKeys) {
        const existingKeys = await this.getProcessedKeys();
        const allKeys = Array.from(new Set([...existingKeys, ...newKeys]));
        await promises_1.default.writeFile(STATE_FILE_PATH, JSON.stringify(allKeys, null, 2), "utf-8");
    },
};
