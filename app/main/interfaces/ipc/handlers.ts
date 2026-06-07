import { ipcMain } from 'electron';
import { AppDataSource } from '../../infrastructure/database/dataSource';
import { AppSetting } from '../../domain/entities/AppSetting';
import { Firm } from '../../domain/entities/Firm';
import { Garden } from '../../domain/entities/Garden';
import { Party } from '../../domain/entities/Party';
import { Transport } from '../../domain/entities/Transport';
import { Grade } from '../../domain/entities/Grade';
import { ReceiptVoucher } from '../../domain/entities/ReceiptVoucher';
import { ReceiptVoucherLot } from '../../domain/entities/ReceiptVoucherLot';
import { Like, Between } from 'typeorm';

export function setupIpcHandlers() {
  const handleCrud = (entity: any, name: string) => {
    ipcMain.handle(`${name}:get-all`, async () => {
      try {
        const repository = AppDataSource.getRepository(entity);
        return await repository.find({ order: { name: 'ASC' } });
      } catch (error) {
        console.error(`Error in ${name}:get-all:`, error);
        throw error;
      }
    });

    ipcMain.handle(`${name}:get-one`, async (_, id: string) => {
      try {
        const repository = AppDataSource.getRepository(entity);
        return await repository.findOneBy({ id });
      } catch (error) {
        console.error(`Error in ${name}:get-one:`, error);
        throw error;
      }
    });

    ipcMain.handle(`${name}:save`, async (_, data: any) => {
      try {
        const repository = AppDataSource.getRepository(entity);
        if (data.is_active !== undefined) {
          data.is_active = data.is_active === 'true' || data.is_active === true;
        }

        if (data.id) {
          return await repository.save(data);
        } else {
          const { id, ...cleanData } = data;
          const instance = repository.create(cleanData);
          return await repository.save(instance);
        }
      } catch (error) {
        console.error(`Error in ${name}:save:`, error);
        throw error;
      }
    });

    ipcMain.handle(`${name}:delete`, async (_, id: string) => {
      try {
        const repository = AppDataSource.getRepository(entity);
        return await repository.delete(id);
      } catch (error) {
        console.error(`Error in ${name}:delete:`, error);
        throw error;
      }
    });
  };

  handleCrud(Firm, 'firm');
  handleCrud(Garden, 'garden');
  handleCrud(Party, 'party');
  handleCrud(Transport, 'transport');
  handleCrud(Grade, 'grade');

  // RECEIPT VOUCHER CRUD
  ipcMain.handle('receipt-voucher:get-next-no', async (_, firmId: string) => {
    try {
      const repository = AppDataSource.getRepository(ReceiptVoucher);
      const firmRepository = AppDataSource.getRepository(Firm);
      
      const firm = await firmRepository.findOneBy({ id: firmId });
      if (!firm) throw new Error('Firm not found');

      const now = new Date();
      const year = now.getFullYear();
      const fy = `${year.toString()}-${(year + 1).toString().slice(-2)}`;
      
      // Get last voucher for this firm
      const lastVoucher = await repository.findOne({
        where: { firm_id: firmId, voucher_no: Like(`${firm.code}/${fy}/%`) },
        order: { createdAt: 'DESC', voucher_no: 'DESC' }
      });

      let nextNo = 1;
      
      if (lastVoucher) {
        // Assume format [FIRM_CODE]/[FY]/[NO]
        const parts = lastVoucher.voucher_no.split('/');
        if (parts.length === 3) {
           const lastFy = parts[1];
           if (lastFy === fy) {
             const lastNo = parseInt(parts[2]);
             if (!isNaN(lastNo)) {
               nextNo = lastNo + 1;
             }
           }
        }
      }
      
      return `${firm.code}/${fy}/${nextNo}`;
    } catch (error) {
      console.error('Error in receipt-voucher:get-next-no:', error);
      throw error;
    }
  });

  ipcMain.handle('receipt-voucher:get-paginated', async (_, { page = 1, limit = 20, filters = {} }: any) => {
    try {
      const repository = AppDataSource.getRepository(ReceiptVoucher);
      const where: any = {};

      if (filters.voucher_no) where.voucher_no = Like(`%${filters.voucher_no}%`);
      if (filters.firm_id) where.firm_id = filters.firm_id;
      if (filters.party_id) where.party_id = filters.party_id;
      if (filters.bill_no) where.bill_no = Like(`%${filters.bill_no}%`);
      
      // Date filters (simplified, usually need a range or specific logic)
      if (filters.bill_date) where.bill_date = filters.bill_date;
      if (filters.gr_no) where.gr_no = Like(`%${filters.gr_no}%`);
      if (filters.transport_id) where.transport_id = filters.transport_id;
      if (filters.receipt_no) where.receipt_no = Like(`%${filters.receipt_no}%`);

      const [items, total] = await repository.findAndCount({
        where,
        relations: ['firm', 'party', 'transport', 'lots', 'lots.garden'],
        order: { createdAt: 'DESC' },
        skip: (page - 1) * limit,
        take: limit,
      });

      return { items, total, page, totalPages: Math.ceil(total / limit) };
    } catch (error) {
      console.error('Error in receipt-voucher:get-paginated:', error);
      throw error;
    }
  });

  ipcMain.handle('receipt-voucher:save', async (_, data: any) => {
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const voucherRepo = queryRunner.manager.getRepository(ReceiptVoucher);
      const lotRepo = queryRunner.manager.getRepository(ReceiptVoucherLot);

      const { lots, ...voucherData } = data;
      
      // Save Voucher
      const savedVoucher = await voucherRepo.save(voucherData);

      // Handle Lots (Simple strategy: delete existing and re-insert for updates)
      // TODO: Check if there exists an issue voucher for any of the lot:
      // If YES: throw error that 'This Receipt Voucher cannot be updated as it has associated issue voucher'
      // if NO: proceed with deletion and insertion
      if (voucherData.id) {
        await lotRepo.delete({ voucher_id: voucherData.id });
      }

      const lotsToSave = lots.map((lot: any) => ({
        ...lot,
        voucher_id: savedVoucher.id,
        id: undefined, // ensure new IDs for lots if re-inserting
      }));

      await lotRepo.save(lotsToSave);

      await queryRunner.commitTransaction();
      return savedVoucher;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      console.error('Error in receipt-voucher:save:', error);
      throw error;
    } finally {
      await queryRunner.release();
    }
  });

  ipcMain.handle('receipt-voucher:delete', async (_, id: string) => {
    try {
      const voucherRepo = AppDataSource.getRepository(ReceiptVoucher);
      const lotRepo = AppDataSource.getRepository(ReceiptVoucherLot);
      // TODO: check if there exist issue voucher for any of the lot:
      // const lots = await lotRepo.find({ where: { voucher_id: id } });
      // for(const lot of lots) {
      //   // If YES: throw error that 'This Receipt Voucher cannot be deleted as it has associated issue voucher'
      //   // if NO: proceed to delete
      // }
      
      await lotRepo.delete({ voucher_id: id });
      return await voucherRepo.delete(id);
    } catch (error) {
      console.error('Error in receipt-voucher:delete:', error);
      throw error;
    }
  });

  // App Settings
  ipcMain.handle('app:get-settings', async () => {
    const repository = AppDataSource.getRepository(AppSetting);
    return await repository.find();
  });

  ipcMain.handle('app:get-setting', async (_, key: string) => {
    const repository = AppDataSource.getRepository(AppSetting);
    return await repository.findOneBy({ key });
  });

  ipcMain.handle('app:save-setting', async (_, key: string, value: string) => {
    const repository = AppDataSource.getRepository(AppSetting);
    let setting = await repository.findOneBy({ key });
    if (setting) setting.value = value;
    else setting = repository.create({ key, value });
    return await repository.save(setting);
  });
}
