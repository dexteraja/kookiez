import { GridFSBucket, ObjectId } from "mongodb";
import { connectToDatabase } from "@/lib/mongodb";

export const MAX_FILE_SIZE = 10 * 1024 * 1024;
export const MAX_FILES = 10;
export const ALLOWED_FILE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
  "application/zip",
] as const;
export const ALLOWED_FILE_ACCEPT = ".jpg,.jpeg,.png,.webp,.pdf,.zip";
export const ALLOWED_FILE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp", ".pdf", ".zip"]);

export function isAllowedFile(file: File) {
  const extension = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
  return ALLOWED_FILE_TYPES.includes(file.type as (typeof ALLOWED_FILE_TYPES)[number]) && ALLOWED_FILE_EXTENSIONS.has(extension);
}

export type StoredFile = {
  id: string;
  name: string;
  contentType: string;
  size: number;
};

export async function storeFile(file: File, metadata: Record<string, string>): Promise<StoredFile> {
  if (file.size > MAX_FILE_SIZE) throw new Error("Ukuran file maksimal 10 MB.");
  if (!isAllowedFile(file)) throw new Error("Tipe atau ekstensi file tidak didukung.");
  const { db } = await connectToDatabase();
  const bucket = new GridFSBucket(db, { bucketName: "files" });
  const id = new ObjectId();
  const upload = bucket.openUploadStreamWithId(id, file.name, { metadata: { ...metadata, contentType: file.type || "application/octet-stream" } });
  upload.end(Buffer.from(await file.arrayBuffer()));
  await new Promise<void>((resolve, reject) => { upload.once("finish", () => resolve()); upload.once("error", reject); });
  return { id: id.toHexString(), name: file.name, contentType: file.type || "application/octet-stream", size: file.size };
}

export async function readFile(fileId: string) {
  if (!ObjectId.isValid(fileId)) throw new Error("Invalid file id");
  const { db } = await connectToDatabase();
  const id = new ObjectId(fileId);
  const file = await db.collection("files.files").findOne({ _id: id });
  if (!file) return null;
  const bucket = new GridFSBucket(db, { bucketName: "files" });
  const chunks: Buffer[] = [];
  for await (const chunk of bucket.openDownloadStream(id)) chunks.push(Buffer.from(chunk));
  return { ...file, filename: String(file.filename ?? "download"), metadata: file.metadata as Record<string, string> | undefined, body: Buffer.concat(chunks), contentType: String(file.metadata?.contentType ?? "application/octet-stream") };
}
