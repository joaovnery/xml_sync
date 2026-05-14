import fs from "fs";
import path from "path";
import archiver from "archiver";

export class StorageService {
  async compressAndSave(xmlsMap: Map<string, string>, fileName: string) {
    return new Promise((resolve, reject) => {
      console.log(
        `\n[Storage Service] Preparando para compactar os arquivos...`,
      );

      const destDir = path.resolve(__dirname, "..", "..", "xmlsColetados");

      if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true });
      }

      const fullPath = path.join(destDir, fileName);
      const output = fs.createWriteStream(fullPath);

      const archive = archiver("zip", {
        zlib: { level: 9 },
      });

      output.on("close", () => {
        console.log(
          `[Storage Service] Arquivo Zip gerado ${archive.pointer()} Bytes com sucesso!`,
        );
        resolve(fullPath);
      });

      archive.on("error", (err) => {
        reject(err);
      });

      archive.pipe(output);

      for (const [chave, xml] of xmlsMap.entries()) {
        archive.append(xml, { name: `NFe_${chave}.xml` });
      }

      archive.finalize();
    });
  }
}
