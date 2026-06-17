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

export class XmlServicePilecco {
  async fetchXmls(storeno: string) {
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
      [storeno],
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
          nfeav.storeno                                AS Loja,
          COALESCE(ctadd.state, custp.state1, 'N/A')   AS UF, 
          nfeav.nfno                                   AS NF,
          IFNULL(nf.nfse, nfeav.serie)                 AS Sr,
          DATE_FORMAT(IFNULL(nf.issuedate, STR_TO_DATE(nfeav.date, '%Y%m%d')), '%d/%m/%y') AS Emissao,   
          FORMAT(SUM(X.baseCalculoIcms) / 100, 2, 'de_DE') AS BaseICMS_,
          MAX(X.l2) / 100                              AS 'Al_Interna%',
          FORMAT(SUM(X.icmsAmt) / 100, 2, 'de_DE')     AS ValorICMS,
          MAX(X.l4) / 100                              AS 'Al_Destin%',
          FORMAT(SUM(X.m3) / 100, 2, 'de_DE')          AS ValorDIFAL,
          FORMAT(IFNULL(nf.icmsUfDest, SUM(X.m3)) / 100, 2, 'de_DE') AS TotalDIFAL,
          nfeav.nfKey                                  AS Chave,  
          xaprdm.msg                                   AS Obs_NF    
        FROM
          fila_envio_xml AS fila
        INNER JOIN nfeav AS nfeav ON nfeav.nfKey = fila.nfKey AND nfeav.storeno = fila.storeno
        INNER JOIN xaprd2 AS X ON X.xano = nfeav.xano AND X.storeno = nfeav.storeno
        LEFT JOIN nf AS nf ON nf.xano = X.xano AND nf.storeno = X.storeno AND nf.nfno = X.nfno AND nf.nfse = X.nfse
        LEFT JOIN xaprd3 ON xaprd3.xano = X.xano AND xaprd3.storeno = X.storeno AND xaprd3.pdvno = X.pdvno AND xaprd3.prdno = X.prdno AND xaprd3.grade = X.grade
        LEFT JOIN xaprdm ON xaprdm.xano = X.xano AND xaprdm.storeno = X.storeno 
        LEFT JOIN custp ON custp.no = nfeav.custno
        LEFT JOIN cfo ON cfo.no = nf.cfo
        LEFT JOIN nfr ON nfr.custno = nfeav.custno AND nfr.xano = nfeav.xano
        LEFT JOIN ctadd ON ctadd.custno = nfr.custno AND ctadd.seqno = nfr.auxShort1
        WHERE
          fila.id IN (?)                          AND 
          (nf.status = 0 OR nf.status IS NULL)    AND
          ((X.m3 > 0) OR (xaprd3.auxMy6 > 0))     AND
          xaprdm.msg LIKE '%Valores%'            
        GROUP BY 
          nfeav.storeno, 
          ctadd.state, 
          custp.state1, 
          nfeav.nfno, 
          nf.nfse, 
          nfeav.serie, 
          nf.issuedate, 
          nfeav.date, 
          nf.icmsUfDest, 
          nfeav.nfKey, 
          xaprdm.msg
        ORDER BY
          nfeav.storeno, nfeav.nfno;
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
}

export class XmlServiceMebuki {
  async fetchXmlsAvanco(
    iniDate: string,
    endDate: string,
  ): Promise<{
    mapSerie3: Map<string, string>;
    mapSerie4: Map<string, string>;
    mapSerie5: Map<string, string>;
    newlyFetchedKeys: string[];
  }> {
    const mapSerie3: Map<string, string> = new Map();
    const mapSerie4: Map<string, string> = new Map();
    const mapSerie5: Map<string, string> = new Map();

    Logger.info(
      "XML Service",
      `Consultando notas no banco — Período: ${iniDate} → ${endDate}`,
    );

    try {
      const processedKeys = await StateManager.getProcessedKeys();
      let ignoreDuplicates = 0;
      const newlyFetchedKeys: string[] = [];

      const [rowsAvanco] = await dbConnection.query<RowDataPacket[]>(
        `
        SELECT nf.nfno, nf.nfkey, nf.date, nf.storeno, x.xml 
        FROM nfeav nf 
        INNER JOIN nfeavxml x ON nf.nfkey = x.nfkey 
        WHERE nf.storeno = ? AND nf.date BETWEEN ? AND ?;
        `,
        [1, iniDate, endDate],
      );

      const [rowsVenda] = await dbConnection.query<RowDataPacket[]>(
        `
        SELECT L.nfkey AS chaveAcesso, N.nfse AS serieNota, L.xml 
        FROM nf N 
        INNER JOIN nfeavxml L USING (xano, storeno, pdvno) 
        WHERE N.issuedate = ? AND N.storeno = ? AND N.nfse IN (?, ?);
        `,
        [iniDate, 1, 4, 5],
      );

      const [rowsDevRet] = await dbConnection.query<RowDataPacket[]>(
        `
        SELECT X.nfekey AS chaveAcesso, I.invse AS serieNota, L.xml 
        FROM inv I 
        INNER JOIN invnfe X USING (invno, storeno) 
        LEFT JOIN nfeavxml L ON (L.xano = X.xano AND L.nfkey = X.nfekey AND L.storeno = X.storeno) 
        WHERE I.issue_date = ? AND I.storeno = ? AND I.invse IN (?, ?);
        `,
        [iniDate, 1, 4, 5],
      );

      const [rowsCancel] = await dbConnection.query<RowDataPacket[]>(
        `
        SELECT nf2.nfekey AS chaveAcesso, nf.nfse AS serieNota, nfeavxml.xml
        FROM nf 
        INNER JOIN nf2 ON nf.storeno = nf2.storeno AND nf.pdvno = nf2.pdvno AND nf.xano = nf2.xano 
        LEFT JOIN nfeavxml ON nf2.nfekey = nfeavxml.nfKey 
        LEFT JOIN eordchannelp ON nf.storeno = eordchannelp.storeno AND nf.eordno = eordchannelp.ordno 
        LEFT JOIN eord ON eord.storeno = eordchannelp.storeno AND eord.ordno = eordchannelp.ordno 
        WHERE (nf.storeno = ? AND (nf.bits2 & 1 != 0 OR eord.s9 & 64 != 0) AND (nf.status = 1 OR nf2.status = 4) AND nf.bits2 & 16 = 0 AND nf.issuedate = ?)
        UNION ALL
        SELECT invnfe.nfekey AS chaveAcesso, inv.invse AS serieNota, nfeavxml.xml
        FROM inv 
        INNER JOIN invnfe ON inv.invno = invnfe.invno AND inv.storeno = invnfe.storeno 
        LEFT JOIN nfeavxml ON invnfe.nfekey = nfeavxml.nfKey 
        WHERE (inv.storeno = ? AND inv.bits4 & 512 != 0 AND inv.bits & 16 != 0 AND inv.bits4 & 32768 = 0 AND inv.issue_date = ?);
        `,
        [1, iniDate, 1, iniDate],
      );

      const processarNotas = (
        rows: any[],
        chaveColuna: string,
        seriePadrao?: number,
      ) => {
        for (const nota of rows) {
          const key = nota[chaveColuna];

          if (processedKeys.includes(key)) {
            ignoreDuplicates++;
            continue;
          }

          const serie = seriePadrao || Number(nota.serieNota);

          if (serie === 3) mapSerie3.set(key, nota.xml);
          else if (serie === 4) mapSerie4.set(key, nota.xml);
          else if (serie === 5) mapSerie5.set(key, nota.xml);

          newlyFetchedKeys.push(key);
        }
      };

      processarNotas(rowsAvanco, "nfkey", 3);
      processarNotas(rowsVenda, "chaveAcesso");
      processarNotas(rowsDevRet, "chaveAcesso");
      processarNotas(rowsCancel, "chaveAcesso");

      const totalNotas =
        rowsAvanco.length +
        rowsVenda.length +
        rowsDevRet.length +
        rowsCancel.length;
      const totalNovas = mapSerie3.size + mapSerie4.size + mapSerie5.size;

      if (totalNotas === 0) {
        return { mapSerie3, mapSerie4, mapSerie5, newlyFetchedKeys: [] };
      }

      Logger.info(
        "XML Service",
        `Total banco: ${totalNotas} — Duplicadas: ${ignoreDuplicates} — Novas para zip: ${totalNovas}`,
      );

      return { mapSerie3, mapSerie4, mapSerie5, newlyFetchedKeys };
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
