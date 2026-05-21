"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const cron_1 = require("./jobs/cron");
const app = (0, express_1.default)();
const PORT = process.env.PORT;
app.listen(PORT, () => {
    console.log(`[Sistema] Servidor executando na Porta: ${PORT}`);
    (0, cron_1.startCronJobs)();
});
