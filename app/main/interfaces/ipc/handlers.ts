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
import { IssueVoucher } from '../../domain/entities/IssueVoucher';
import { Between, Like } from 'typeorm';

export function setupIpcHandlers() {
  const handleCrud = (entity: any, name: string) => {
    ipcMain.handle(`${name}:get-all`, async () => {
      try {
        const repository = AppDataSource.getRepository(entity);
        return await repository.find({ order: { name: 'ASC' } as any });
      } catch (error) {
        console.error(`Error in ${name}:get-all:`, error);
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

  // Lot specific handler
  ipcMain.handle('receipt-voucher-lot:get-one', async (_, id: string) => {
    try {
      const repository = AppDataSource.getRepository(ReceiptVoucherLot);
      return await repository.findOne({ where: { id }, relations: ['garden'] });
    } catch (error) {
      console.error('Error in receipt-voucher-lot:get-one:', error);
      throw error;
    }
  });

  // Manual implementation of Issue Voucher CRUD to prevent registration conflicts
  // ISSUE VOUCHER CRUD
  ipcMain.handle('issue-voucher:get-next-no', async (_, firmId: string) => {
    try {
      const repository = AppDataSource.getRepository(IssueVoucher);
      const firmRepository = AppDataSource.getRepository(Firm);
      
      const firm = await firmRepository.findOneBy({ id: firmId });
      if (!firm) throw new Error('Firm not found');

      const now = new Date();
      const year = now.getFullYear();
      const fy = `${year.toString()}-${(year + 1).toString().slice(-2)}`;
      
      const lastVoucher = await repository.findOne({
        where: { firm_id: firmId, voucher_no: Like(`I-${firm.code}/${fy}/%`) },
        order: { createdAt: 'DESC', voucher_no: 'DESC' }
      });

      let nextNo = 1;
      
      if (lastVoucher) {
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
      
      return `I-${firm.code}/${fy}/${nextNo}`;
    } catch (error) {
      console.error('Error in issue-voucher:get-next-no:', error);
      throw error;
    }
  });

  ipcMain.handle('issue-voucher:get-all', async () => {
    return await AppDataSource.getRepository(IssueVoucher).find({ order: { voucher_no: 'ASC' } as any });
  });

  ipcMain.handle('issue-voucher:get-one', async (_, id: string) => {
    return await AppDataSource.getRepository(IssueVoucher).findOneBy({ id });
  });

  ipcMain.handle('issue-voucher:delete', async (_, id: string) => {
    return await AppDataSource.getRepository(IssueVoucher).delete(id);
  });

  ipcMain.handle('issue-voucher:get-paginated', async (_, { page = 1, limit = 20, filters = {} }: any) => {
    try {
      const repository = AppDataSource.getRepository(IssueVoucher);
      const where: any = {};
      if (filters.voucher_no) where.voucher_no = Like(`%${filters.voucher_no}%`);
      if (filters.firm_id) where.firm_id = filters.firm_id;
      if (filters.challan_no) where.challan_no = Like(`%${filters.challan_no}%`);
      if (filters.issue_date_from) where.issue_date = Between(filters.issue_date_from, filters.issue_date_to || filters.issue_date_from);
      
      // Filter by Lot details
      if (filters.garden_id || filters.grade) {
          where.lot = {};
          if (filters.garden_id) where.lot.garden_id = filters.garden_id;
          if (filters.grade) where.lot.grade = filters.grade;
      }
      
      const [items, total] = await repository.findAndCount({
        where,
        relations: ['firm', 'party', 'lot', 'lot.garden'],
        order: { issue_date: 'DESC' },
        skip: (page - 1) * limit,
        take: limit,
      });

      return { items, total, page, totalPages: Math.ceil(total / limit) };
    } catch (error) {
      console.error('Error in issue-voucher:get-paginated:', error);
      throw error;
    }
  });

  ipcMain.handle('issue-voucher:save', async (_, data: any) => {
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const repository = queryRunner.manager.getRepository(IssueVoucher);
      const lotRepository = queryRunner.manager.getRepository(ReceiptVoucherLot);

      // Backend stock validation
      const lot = await lotRepository.findOneBy({ id: data.receipt_voucher_lot_id });
      if (!lot) throw new Error('Selected lot not found');

      // Calculate already issued quantities
      const existingIssues = await repository.createQueryBuilder('issue')
        .where('issue.receipt_voucher_lot_id = :lotId', { lotId: data.receipt_voucher_lot_id })
        .andWhere('issue.id != :issueId', { issueId: data.id || 'new' })
        .getMany();
      
      const issuedBags = existingIssues.reduce((sum, i) => sum + i.no_of_bags, 0);
      const issuedWeight = existingIssues.reduce((sum, i) => sum + Number(i.net_weight), 0);

      if (Number(data.no_of_bags) + issuedBags > lot.total_bags) {
        throw new Error('Not enough bags available in the selected lot.');
      }
      
      // Allow small tolerance for floating point comparison
      if (Number(data.net_weight) + issuedWeight > Number(lot.net_weight) + 0.001) {
        throw new Error('Not enough weight available in the selected lot.');
      }
      
      // Clean up data
      const cleanData = { ...data };
      if (!cleanData.party_id) cleanData.party_id = null;
      
      const savedVoucher = await repository.save(cleanData);
      
      await queryRunner.commitTransaction();
      return savedVoucher;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      console.error('Error in issue-voucher:save:', error);
      throw error;
    } finally {
      await queryRunner.release();
    }
  });

  // Available Stock Query
  ipcMain.handle('stock:get-available', async (_, excludeIssueId?: string, includeAll?: boolean, filters?: any) => {
    try {
      const repository = AppDataSource.getRepository(ReceiptVoucherLot);
      const query = repository.createQueryBuilder('lot')
        .leftJoinAndSelect('lot.garden', 'garden')
        .leftJoinAndSelect('lot.voucher', 'voucher')
        .leftJoinAndSelect('voucher.transport', 'transport')
        .leftJoin('issue_vouchers', 'issue', `issue.receipt_voucher_lot_id = lot.id ${ excludeIssueId ? `AND issue.id != '${excludeIssueId}'` : ''}`)
        .select('lot.id', 'id')
        .addSelect('lot.lot_no', 'lot_no')
        .addSelect('lot.grade', 'grade')
        .addSelect('voucher.gr_no', 'gr_no')
        .addSelect('voucher.gr_date', 'gr_date')
        .addSelect('transport.name', 'transport_name')
        .addSelect('transport.id', 'transport_id')
        .addSelect('garden.name', 'garden_name')
        .addSelect('lot.total_bags', 'total_bags')
        .addSelect('lot.net_weight', 'net_weight')
        .addSelect('lot.total_bags - SUM(COALESCE(issue.no_of_bags, 0))', 'available_bags')
        .addSelect('lot.net_weight - SUM(COALESCE(issue.net_weight, 0))', 'available_weight')
        .addSelect('lot.weight_per_bag', 'weight_per_bag')
        .addSelect('lot.claim_raised', 'claim_raised')
        .addSelect('lot.claim_rate', 'claim_rate')
        .addSelect('lot.claim_amount', 'claim_amount')
        .groupBy('lot.id');

        if (filters) {
          if (filters.garden) {
            query.andWhere('garden.name = :garden', { garden: filters.garden });
          }
          if (filters.grade) {
            query.andWhere('lot.grade = :grade', { grade: filters.grade });
          }
          if (filters.lot_no) {
            query.andWhere('lot.lot_no LIKE :lot_no', { lot_no: `%${filters.lot_no}%` });
          }
          if (filters.gr_no) {
            query.andWhere('voucher.gr_no LIKE :gr_no', { gr_no: `%${filters.gr_no}%` });
          }
          if (filters.transport) {
            query.andWhere('transport.id = :transport', { transport: filters.transport });
          }
          if (filters.gr_date_from) {
            query.andWhere('voucher.gr_date >= :gr_date_from', { gr_date_from: filters.gr_date_from });
          }
          if (filters.gr_date_to) {
            query.andWhere('voucher.gr_date <= :gr_date_to', { gr_date_to: filters.gr_date_to });
          }
          if (filters.claim_status) {
            if (filters.claim_status === 'yes') {
              query.andWhere('lot.claim_raised = true');
            } else if (filters.claim_status === 'no') {
              query.andWhere('lot.claim_raised = false');
            }
          }
        }

        if (!includeAll) {
          query.having('available_bags > 0');
        } else {
          query.andHaving('available_bags > 0').orHaving('available_weight > 0')
        }
        return await query.orderBy('available_bags', 'DESC').addOrderBy('gr_date', 'ASC').getRawMany();
    } catch (error) {
      console.error('Error in stock:get-available:', error);
      throw error;
    }
  });

  ipcMain.handle('claim:report', async (_, {transportId, fromDate, toDate }: any) => {
    try {
      const repository = AppDataSource.getRepository(ReceiptVoucherLot);
      
      // First, get all lots with claims and their current available weight
      const lotsWithClaims = repository.createQueryBuilder('lot')
        .leftJoinAndSelect('lot.voucher', 'voucher')
        .leftJoinAndSelect('voucher.transport', 'transport')
        // .leftJoin('issue_vouchers', 'issue', 'issue.receipt_voucher_lot_id = lot.id')
        .select('voucher.gr_no', 'gr_no')
        .addSelect('voucher.gr_date', 'gr_date')
        .addSelect('transport.name', 'transport_name')
        .addSelect('SUM(lot.total_bags)', 'total_bags_received')
        .addSelect('SUM(lot.net_weight)', 'net_claim_weight')
        .addSelect('SUM(lot.claim_amount)', 'total_claim_amount')
        .addSelect('AVG(lot.claim_rate)', 'avg_claim_rate')
        .groupBy('voucher.id')
        .where('lot.claim_raised = true');
        if(transportId) {
          lotsWithClaims.andWhere('transport.id = :transportId', { transportId });
        }
        
        if (fromDate) {
          lotsWithClaims.andWhere('voucher.gr_date >= :fromDate', { fromDate });
        }
        if (toDate) {
          lotsWithClaims.andWhere('voucher.gr_date <= :toDate', { toDate });
        }
        
        return await lotsWithClaims.orderBy('gr_date', 'ASC').getRawMany();
    } catch (error) {
      console.error('Error in claim:report:', error);
      throw error;
    }
  });

  ipcMain.handle('receipt-voucher-lot:update-claim', async (_, { id, claim_raised, claim_rate, claim_amount }: any) => {
    try {
      const repository = AppDataSource.getRepository(ReceiptVoucherLot);
      return await repository.update(id, { claim_raised, claim_rate, claim_amount });
    } catch (error) {
      console.error('Error in receipt-voucher-lot:update-claim:', error);
      throw error;
    }
  });

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
      
      const lastVoucher = await repository.findOne({
        where: { firm_id: firmId, voucher_no: Like(`${firm.code}/${fy}/%`) },
        order: { createdAt: 'DESC', voucher_no: 'DESC' }
      });

      let nextNo = 1;
      
      if (lastVoucher) {
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
      // Ensure null is passed if party_id is not set
      if (!voucherData.party_id) voucherData.party_id = null;
      
      const savedVoucher = await voucherRepo.save(voucherData);

      if (voucherData.id) {
        await lotRepo.delete({ voucher_id: voucherData.id });
      }

      const lotsToSave = lots.map((lot: any) => ({
        ...lot,
        voucher_id: savedVoucher.id,
        id: undefined,
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
