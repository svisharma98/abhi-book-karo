import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const sourceDirectory = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(sourceDirectory, "../.env") });

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  throw new Error("JWT_SECRET must be configured with at least 32 characters.");
}
