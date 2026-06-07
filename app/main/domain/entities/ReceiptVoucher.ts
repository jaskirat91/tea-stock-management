import { 
  Entity, 
  PrimaryGeneratedColumn, 
  Column, 
  CreateDateColumn, 
  UpdateDateColumn, 
  ManyToOne, 
  OneToMany, 
  JoinColumn 
} from 'typeorm';
import { Firm } from './Firm';
import { Party } from './Party';
import { Transport } from './Transport';
import { ReceiptVoucherLot } from './ReceiptVoucherLot';

@Entity('receipt_vouchers')
export class ReceiptVoucher {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  voucher_no!: string;

  @Column()
  firm_id!: string;

  @ManyToOne(() => Firm)
  @JoinColumn({ name: 'firm_id' })
  firm!: Firm;

  @Column()
  party_id!: string;

  @ManyToOne(() => Party)
  @JoinColumn({ name: 'party_id' })
  party!: Party;

  @Column({ nullable: true })
  bill_no?: string;

  @Column({ type: 'date', nullable: true })
  bill_date?: Date;

  @Column({ nullable: true })
  transport_id?: string;

  @ManyToOne(() => Transport)
  @JoinColumn({ name: 'transport_id' })
  transport?: Transport;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  frieght_amount!: number;

  @Column({ nullable: true })
  gr_no?: string;

  @Column({ type: 'date', nullable: true })
  gr_date?: Date;

  @Column({ nullable: true })
  receipt_no?: string;

  @Column({ type: 'date', nullable: true })
  receipt_date?: Date;

  @Column({ type: 'integer', default: 0 })
  total_bags!: number;

  @Column({ type: 'decimal', precision: 12, scale: 3, default: 0 })
  total_weight!: number;

  @OneToMany(() => ReceiptVoucherLot, (lot) => lot.voucher, { cascade: true, onDelete: 'CASCADE' })
  lots!: ReceiptVoucherLot[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
