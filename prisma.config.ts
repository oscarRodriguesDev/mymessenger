import "dotenv/config";
import { defineConfig } from "prisma/config";

const datasourceUrl = process.env.DATABASE_URL;

if (!datasourceUrl) {
  throw new Error('DATABASE_URL is not configured. Set DATABASE_URL in .env.local');
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: datasourceUrl,
  },
});
