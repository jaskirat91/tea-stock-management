import "reflect-metadata";
import { DataSource } from "typeorm";
import { AppSetting } from "../../domain/entities/AppSetting";
import path from "node:path";
import { app } from "electron";

const isDev = !app.isPackaged;
const dbPath = isDev 
  ? path.join(process.cwd(), "database.sqlite")
  : path.join(app.getPath("userData"), "database.sqlite");

export const AppDataSource = new DataSource({
  type: "sqlite",
  database: dbPath,
  synchronize: isDev,
  logging: isDev,
  entities: [AppSetting],
  migrations: [],
  subscribers: [],
});

export async function initializeDatabase() {
  if (!AppDataSource.isInitialized) {
    await AppDataSource.initialize();
    console.log("Database initialized at:", dbPath);
  }
}
