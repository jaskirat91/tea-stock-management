import "reflect-metadata";
import { DataSource } from "typeorm";
import { AppSetting } from "../../domain/entities/AppSetting";
import { Firm } from "../../domain/entities/Firm";
import { Garden } from "../../domain/entities/Garden";
import { Party } from "../../domain/entities/Party";
import { Transport } from "../../domain/entities/Transport";
import { Grade } from "../../domain/entities/Grade";
import { ReceiptVoucher } from "../../domain/entities/ReceiptVoucher";
import { ReceiptVoucherLot } from "../../domain/entities/ReceiptVoucherLot";
import { IssueVoucher } from "../../domain/entities/IssueVoucher";
import { MakeChallanNoUnique1718457600000 } from "./migrations/1718457600000-MakeChallanNoUnique";
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
  entities: [
    AppSetting, 
    Firm, 
    Garden, 
    Party, 
    Transport, 
    Grade, 
    ReceiptVoucher, 
    ReceiptVoucherLot,
    IssueVoucher
  ],
  migrations: [MakeChallanNoUnique1718457600000],
  migrationsRun: false,
  subscribers: [],
});

export async function initializeDatabase() {
  if (!AppDataSource.isInitialized) {
    await AppDataSource.initialize();
    console.log("Database initialized at:", dbPath);
  }
}
