"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StorageService = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const archiver_1 = __importDefault(require("archiver"));
class StorageService {
    async compressAndSave(xmlsMap, fileName) {
        return new Promise((resolve, reject) => {
            console.log(`\n[Storage Service] Preparando para compactar os arquivos...`);
            const destDir = path_1.default.resolve(__dirname, "..", "..", "xmls_coletados");
            if (!fs_1.default.existsSync(destDir)) {
                fs_1.default.mkdirSync(destDir, { recursive: true });
            }
            const fullPath = path_1.default.join(destDir, fileName);
            const output = fs_1.default.createWriteStream(fullPath);
            const archive = (0, archiver_1.default)("zip", {
                zlib: { level: 9 },
            });
            output.on("close", () => {
                console.log(`[Storage Service] Arquivo Zip gerado ${archive.pointer()} Bytes com sucesso!`);
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
exports.StorageService = StorageService;
