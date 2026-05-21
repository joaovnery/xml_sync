"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.XmlService = void 0;
const database_1 = require("../config/database");
const path_1 = __importDefault(require("path"));
const stateManager_1 = require("../utils/stateManager");
const XMLS_DIR = path_1.default.resolve(__dirname, "../../xmls_coletados");
class XmlService {
    async fetchXMLs(iniDate, endDate) {
        const map = new Map();
        console.log(`[XML Service] Iniciando busca para as datas ${iniDate} a ${endDate}...`);
        try {
            const processedKeys = await stateManager_1.StateManager.getProcessedKeys();
            const [rows] = await database_1.dbConnection.query(`
        SELECT 
          nf.nfno, 
          nf.nfkey, 
          nf.date, 
          nf.storeno, 
          x.xml 
        FROM nfeav nf 
        INNER JOIN nfeavxml x 
        ON nf.nfkey = x.nfkey 
        WHERE nf.storeno = ?
        AND nf.date BETWEEN ? AND ?;
      `, [1, iniDate, endDate]);
            if (rows.length === 0) {
                console.error(`[XML Service] Nenhum XML foi encontrado neste período.`);
                return { map, newlyFetchedKeys: [] };
            }
            let ignoreDuplicates = 0;
            const newlyFetchedKeys = [];
            for (const invoices of rows) {
                if (processedKeys.includes(invoices.nfkey)) {
                    ignoreDuplicates++;
                    continue;
                }
                map.set(invoices.nfkey, invoices.xml);
                newlyFetchedKeys.push(invoices.nfkey);
            }
            console.log(`[XML Service] XMLs encontrados: ${map.size}`);
            console.log(`[XML Service] XMLs coletados: ${map.size}`);
            console.log(`[XML Service] Sucesso! Todos os XMLs salvos fisicamente!`);
            return { map, newlyFetchedKeys };
        }
        catch (error) {
            console.error(`erro ao realizar busca ${error}`);
            throw error;
        }
    }
}
exports.XmlService = XmlService;
