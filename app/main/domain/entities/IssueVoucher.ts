import { 
  Entity, 
  PrimaryGeneratedColumn, 
  Column, 
  CreateDateColumn, 
  UpdateDateColumn, 
  ManyToOne, 
  JoinColumn 
} from 'typeorm';
import { Firm } from './Firm';
import { Party } from './Party';
import { ReceiptVoucherLot } from './ReceiptVoucherLot';

@Entity('issue_vouchers')
export class IssueVoucher {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  voucher_no!: string;

  @Column()
  firm_id!: string;

  @ManyToOne(() => Firm)
  @JoinColumn({ name: 'firm_id' })
  firm!: Firm;

  @Column({ nullable: true })
  party_id?: string;

  @ManyToOne(() => Party)
  @JoinColumn({ name: 'party_id' })
  party?: Party;

  @Column()
  receipt_voucher_lot_id!: string;

  @ManyToOne(() => ReceiptVoucherLot)
  @JoinColumn({ name: 'receipt_voucher_lot_id' })
  lot!: ReceiptVoucherLot;

  @Column()
  challan_no!: string;

  @Column({ type: 'integer', default: 0 })
  no_of_bags!: number;

  @Column({ type: 'decimal', precision: 12, scale: 3, default: 0 })
  weight_per_bag!: number;

  @Column({ type: 'decimal', precision: 12, scale: 3, default: 0 })
  shortage_weight!: number;

  @Column({ type: 'decimal', precision: 12, scale: 3, default: 0 })
  net_weight!: number;

  @Column({ type: 'date', default: new Date().toISOString().split('T')[0] })
  issue_date!: Date;

  @Column({ type: 'text', nullable: true })
  remarks?: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
