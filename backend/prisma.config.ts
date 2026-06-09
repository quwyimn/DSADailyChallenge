import { config } from "dotenv";
import { defineConfig } from "prisma/config";

const env = process.env["NODE_ENV"] ?? "development";
config({ path: `.env.${env}` });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env["DATABASE_URL"],
  },
});
