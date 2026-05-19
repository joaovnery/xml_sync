import { dbConnection } from "../config/database";
import { RowDataPacket } from "mysql2/promise";

export class XmlService {
  async fetchXMLs(iniDate: string, endDate: string) {
    const map: Map<string, string> = new Map();
    console.log(
      `[XML Service] Iniciando busca para as datas ${iniDate} a ${endDate}...`,
    );

    try {
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
        return map;
      }

      for (const invoices of rows) {
        map.set(invoices.nfkey, invoices.xml);
      }

      console.log(`[XML Service] XMLs encontrados: ${map.size}`);
      console.log(`[XML Service] XMLs coletados: ${map.size}`);
      console.log(`[XML Service] Sucesso! Todos os XMLs salvos fisicamente!`);

      return map;
    } catch (error) {
      console.error(`erro ao realizar busca ${error}`);
      throw error;
    }
  }
}
