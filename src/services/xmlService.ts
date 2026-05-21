import { dbConnection } from "../config/database";
import { RowDataPacket } from "mysql2/promise";
import path from "path";
import { StateManager } from "../utils/stateManager";

const XMLS_DIR = path.resolve(__dirname, "../../xmls_coletados");

export class XmlService {
  async fetchXMLs(iniDate: string, endDate: string) {
    const map: Map<string, string> = new Map();
    console.log(
      `[XML Service] Iniciando busca para as datas ${iniDate} a ${endDate}...`,
    );

    try {
      const processedKeys = await StateManager.getProcessedKeys();

      const [rows] = await dbConnection.query<RowDataPacket[]>(
        `
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
      `,
        [1, iniDate, endDate],
      );

      if (rows.length === 0) {
        console.error(`[XML Service] Nenhum XML foi encontrado neste período.`);
        return { map, newlyFetchedKeys: [] };
      }

      let ignoreDuplicates = 0;
      const newlyFetchedKeys: string[] = [];

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
    } catch (error) {
      console.error(`erro ao realizar busca ${error}`);
      throw error;
    }
  }
}
