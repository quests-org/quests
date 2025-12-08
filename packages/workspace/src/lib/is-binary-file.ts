import fs from "node:fs/promises";
import path from "node:path";

export async function isBinaryFile(filepath: string): Promise<boolean> {
  const ext = path.extname(filepath).toLowerCase();
  switch (ext) {
    case ".7z":
    case ".a":
    case ".bin":
    case ".class":
    case ".dat":
    case ".dll":
    case ".doc":
    case ".docx":
    case ".exe":
    case ".gz":
    case ".jar":
    case ".lib":
    case ".o":
    case ".obj":
    case ".odp":
    case ".ods":
    case ".odt":
    case ".ppt":
    case ".pptx":
    case ".pyc":
    case ".pyo":
    case ".so":
    case ".tar":
    case ".war":
    case ".wasm":
    case ".xls":
    case ".xlsx":
    case ".zip": {
      return true;
    }
    default: {
      break;
    }
  }

  const stats = await fs.stat(filepath);
  const fileSize = stats.size;
  if (fileSize === 0) {
    return false;
  }

  const bufferSize = Math.min(4096, fileSize);
  const buffer = await fs.readFile(filepath);
  if (buffer.byteLength === 0) {
    return false;
  }
  const bytes = new Uint8Array(buffer.subarray(0, bufferSize));

  let nonPrintableCount = 0;
  for (const byte of bytes) {
    if (byte === 0) {
      return true;
    }
    if (byte < 9 || (byte > 13 && byte < 32)) {
      nonPrintableCount++;
    }
  }
  return nonPrintableCount / bytes.length > 0.3;
}
