import fs from "fs";
import path from "path";
import archiver from "archiver";
import { Logger } from "../utils/logger";

export class StorageService {
  async compressAndSave(
    xmlsMap: Map<string, string>,
    fileName: string,
  ): Promise<string> {
    Logger.info(
      "Storage",
      `Compactando ${xmlsMap.size} arquivo(s) XML em ${fileName}`,
    );

    const destDir = path.resolve(__dirname, "..", "..", "xmls_coletados");

    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }

    const fullPath = path.join(destDir, fileName);
    const output = fs.createWriteStream(fullPath);

    const archive = archiver("zip", {
      zlib: { level: 9 },
    });

    output.on("close", () => {
      const sizeKB = (archive.pointer() / 1024).toFixed(2);
      Logger.success(
        "Storage",
        `ZIP gerado com sucesso — ${sizeKB} KB (${archive.pointer()} bytes)`,
      );
    });

    archive.on("error", (err) => {
      Logger.error("Storage", "Falha ao gerar arquivo ZIP", err);
      throw err;
    });

    archive.pipe(output);

    for (const [chave, xml] of xmlsMap.entries()) {
      archive.append(xml, { name: `NFe_${chave}.xml` });
    }

    archive.finalize();

    return fullPath;
  }
}
