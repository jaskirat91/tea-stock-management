import { MigrationInterface, QueryRunner } from "typeorm";

export class MakeChallanNoUnique1718457600000 implements MigrationInterface {
    name = 'MakeChallanNoUnique1718457600000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // 0. Safety check: Ensure table exists
        const table = await queryRunner.getTable("issue_vouchers");
        if (!table) return;

        // Check if unique constraint/index already exists on challan_no
        const hasUniqueIndex = table.indices.some(idx => 
            idx.columnNames.includes("challan_no") && idx.isUnique
        );
        if (hasUniqueIndex) return;

        // 1. Identify and fix duplicates by appending a suffix to the challan_no
        const duplicates = await queryRunner.query(`
            SELECT challan_no, COUNT(*) as count 
            FROM issue_vouchers 
            GROUP BY challan_no 
            HAVING count > 1
        `);

        for (const dup of duplicates) {
            const records = await queryRunner.query(`
                SELECT id FROM issue_vouchers WHERE challan_no = ? ORDER BY createdAt ASC
            `, [dup.challan_no]);
            
            // Skip the first record, update the rest
            for (let i = 1; i < records.length; i++) {
                const newChallan = `${dup.challan_no}_DUP_${i}`;
                await queryRunner.query(`
                    UPDATE issue_vouchers SET challan_no = ? WHERE id = ?
                `, [newChallan, records[i].id]);
            }
        }

        // 2. Create the unique index
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_issue_vouchers_challan_no" ON "issue_vouchers" ("challan_no")`);

        // 3. Add price_per_kg column if it doesn't exist
        const hasPriceColumn = table.findColumnByName("price_per_kg");
        if (!hasPriceColumn) {
            await queryRunner.query(`ALTER TABLE "issue_vouchers" ADD COLUMN "price_per_kg" decimal(12,2) DEFAULT 0`);
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "IDX_issue_vouchers_challan_no"`);
    }
}
