import Dexie, { type Table } from 'dexie';
import type {
  MadrasaSettings,
  Student,
  Staff,
  AttendanceRecord,
  FeePayment,
  SalaryPayment,
  FeeType,
} from '@/types/database.types';

export class MadrasaLocalDatabase extends Dexie {
  settings!: Table<MadrasaSettings, string>;
  students!: Table<Student, string>;
  staff!: Table<Staff, string>;
  attendance!: Table<AttendanceRecord, string>;
  feePayments!: Table<FeePayment, string>;
  salaryPayments!: Table<SalaryPayment, string>;
  feeTypes!: Table<FeeType, string>;

  constructor() {
    super('MadrasaManagementDB');
    this.version(1).stores({
      settings: 'id',
      students: 'id, admissionNo, className, section, rollNo, status, phone',
      staff: 'id, teacher_uid, role, designation, status, phone',
      attendance: 'id, date, studentId, className, status, synced',
      feePayments: 'id, receiptNo, studentId, feeTypeId, month, paymentDate, synced',
      salaryPayments: 'id, staffId, month, paymentDate, synced',
      feeTypes: 'id, name',
    });
  }
}

export const localDb = new MadrasaLocalDatabase();