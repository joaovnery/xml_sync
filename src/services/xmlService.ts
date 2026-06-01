import { dbConnection } from "../config/database";
import { RowDataPacket } from "mysql2/promise";
import { StateManager } from "../utils/stateManager";
import { Logger } from "../utils/logger";

export interface DifalRow extends RowDataPacket {
  Loja: number;
  UF: string;
  NF: number;
  Sr: string;
  Emissao: string;
  BaseICMS_: string;
  "Al_Interna%": number;
  ValorICMS: string;
  "Al_Destin%": number;
  ValorDIFAL: string;
  TotalDIFAL: string;
  Chave: string;
  Obs_NF: string;
}

export class XmlService {
  async fetchXmlsPilecco() {
    const map: Map<string, string> = new Map();
    const filaIds: number[] = [];
    Logger.info(
      "XML Service",
      "Consultando notas com status PENDENTE no banco de dados",
    );

    const [rows] = await dbConnection.query<RowDataPacket[]>(
      `
      SELECT 
        f.id AS fila_id,
        nf.nfno, 
        nf.nfkey, 
        nf.date, 
        nf.storeno, 
        x.xml 
      FROM fila_envio_xml f
      INNER JOIN nfeav nf ON f.nfKey = nf.nfKey 
      INNER JOIN nfeavxml x ON f.nfKey = x.nfKey 
      WHERE f.status_envio = 'PENDENTE'
      AND f.storeno = ?;
      `,
      [1],
    );

    for (const invoice of rows) {
      map.set(invoice.nfkey, invoice.xml);
      filaIds.push(invoice.fila_id);
    }

    Logger.info(
      "XML Service",
      `Consulta finalizada — ${map.size} nota(s) pendente(s) encontrada(s)`,
    );

    return { map, filaIds };
  }

  async markAsSent(filaIds: number[]) {
    if (filaIds.length === 0) return;

    try {
      const placeholders = filaIds.map(() => "?").join(",");

      await dbConnection.query(
        `UPDATE fila_envio_xml SET status_envio='ENVIADO' WHERE id IN (${placeholders})`,
        filaIds,
      );

      Logger.success(
        "XML Service",
        `${filaIds.length} nota(s) atualizada(s) para status ENVIADO`,
      );
    } catch (error) {
      Logger.error(
        "XML Service",
        "Falha ao atualizar status das notas na fila",
        error,
      );
      throw error;
    }
  }

  async fetchDifalData(filaIds: number[]): Promise<DifalRow[]> {
    if (filaIds.length === 0) return [];

    Logger.info(
      "XML Service",
      `Buscando dados de DIFAL para ${filaIds.length} nota(s)`,
    );

    try {
      const [rows] = await dbConnection.query<DifalRow[]>(
        `
        SELECT
            nf.storeno                                   AS Loja,
            IFNULL(ctadd.state, custp.state1)            AS UF, 
            nf.nfno                                      AS NF,
            nf.nfse                                      AS Sr,
            DATE_FORMAT(nf.issuedate, '%d/%m/%y')        AS Emissao,   
            FORMAT(X.baseCalculoIcms / 100, 2, 'de_DE')  AS BaseICMS_,
            X.l2 / 100                                   AS 'Al_Interna%',
            FORMAT(X.icmsAmt / 100, 2, 'de_DE')          AS ValorICMS,
            X.l4 / 100                                   AS 'Al_Destin%',
            FORMAT(X.m3 / 100, 2, 'de_DE')               AS ValorDIFAL,
            FORMAT(nf.icmsUfDest / 100, 2, 'de_DE')      AS TotalDIFAL,
            nfeav.nfKey                                  AS Chave,  
            xaprdm.msg                                   AS Obs_NF    
        FROM
            fila_envio_xml AS fila
        INNER JOIN nfeav AS nfeav ON nfeav.nfKey = fila.nfKey AND nfeav.storeno = fila.storeno
        INNER JOIN xaprd2 AS X ON X.xano = nfeav.xano AND X.storeno = nfeav.storeno
        INNER JOIN nf AS nf ON nf.xano = X.xano AND nf.storeno = X.storeno AND nf.nfno = X.nfno AND nf.nfse = X.nfse
        LEFT JOIN xaprd3 ON xaprd3.xano = X.xano AND xaprd3.storeno = X.storeno AND xaprd3.pdvno = X.pdvno AND xaprd3.prdno = X.prdno AND xaprd3.grade = X.grade
        LEFT JOIN xaprdm ON xaprdm.xano = X.xano AND xaprdm.storeno = X.storeno 
        LEFT JOIN custp ON custp.no = nf.custno
        LEFT JOIN cfo ON cfo.no = nf.cfo
        LEFT JOIN nfr ON nfr.custno = nf.custno AND nfr.auxLong1 = nf.eordno
        LEFT JOIN ctadd ON ctadd.custno = nfr.custno AND ctadd.seqno = nfr.auxShort1
        WHERE
            fila.id IN (?)          AND 
            nf.cfo > 0              AND
            nf.status = 0           AND
            ((X.m3 > 0) OR (xaprd3.auxMy6 > 0)) AND
            xaprdm.msg LIKE 'Valores%'
        GROUP BY 
            X.xano, X.storeno, X.prdno, nfeav.nfKey, xaprdm.msg
        ORDER BY
            nf.storeno, nf.cfo, nf.issuedate, nf.nfno;
      `,
        [filaIds],
      );

      Logger.info(
        "XML Service",
        `${rows.length} registro(s) de DIFAL encontrado(s)`,
      );

      return rows;
    } catch (error) {
      Logger.error("XML Service", "Falha ao buscar dados de DIFAL", error);
      throw error;
    }
  }

  // ----------- Mebuki --------- \\

  async fetchXmlsMebuki(
    iniDate: string,
    endDate: string,
  ): Promise<{ map: Map<string, string>; newlyFetchedKeys: string[] }> {
    const map: Map<string, string> = new Map();
    Logger.info(
      "XML Service",
      `Consultando notas no banco — Período: ${iniDate} → ${endDate}`,
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
          x.xml Loja: number;
          UF: string;
          NF: number;
          Sr: string;
          Emissao: string;
          BaseICMS_: string;
          "Al_Interna%": string;
        FROM nfeav nf 
        INNER JOIN nfeavxml x 
        ON nf.nfkey = x.nfkey 
        WHERE nf.storeno = ?
        AND nf.date BETWEEN ? AND ?;
      `,
        [1, iniDate, endDate],
      );

      if (rows.length === 0) {
        Logger.info(
          "XML Service",
          "Nenhuma nota encontrada para o período consultado",
        );
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

      Logger.info(
        "XML Service",
        `${rows.length} nota(s) retornada(s) do banco — ${ignoreDuplicates} duplicada(s) ignorada(s) — ${map.size} nova(s) para processar`,
      );

      return { map, newlyFetchedKeys };
    } catch (error) {
      Logger.error(
        "XML Service",
        "Falha ao consultar notas no banco de dados",
        error,
      );
      throw error;
    }
  }
}
