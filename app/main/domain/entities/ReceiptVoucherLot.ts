import { 
  Entity, 
  PrimaryGeneratedColumn, 
  Column, 
  CreateDateColumn, 
  UpdateDateColumn, 
  ManyToOne, 
  JoinColumn 
} from 'typeorm';
import { ReceiptVoucher } from './ReceiptVoucher';
import { Garden } from './Garden';

@Entity('receipt_voucher_lots')
export class ReceiptVoucherLot {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  voucher_id!: string;

  @ManyToOne(() => ReceiptVoucher, (voucher) => voucher.lots)
  @JoinColumn({ name: 'voucher_id' })
  voucher!: ReceiptVoucher;

  @Column()
  lot_no!: string;

  @Column()
  garden_id!: string;

  @ManyToOne(() => Garden)
  @JoinColumn({ name: 'garden_id' })
  garden!: Garden;

  @Column()
  grade!: string; // Storing the name/id for simplicity in display, or could link to Grade entity

  @Column({ type: 'integer', default: 0 })
  total_bags!: number;

  @Column({ type: 'decimal', precision: 12, scale: 3, default: 0 })
  weight_per_bag!: number;

  @Column({ type: 'decimal', precision: 12, scale: 3, default: 0 })
  shortage_weight!: number;

  @Column({ type: 'decimal', precision: 12, scale: 3, default: 0 })
  net_weight!: number;

  @Column({ type: 'text', nullable: true })
  remarks?: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
