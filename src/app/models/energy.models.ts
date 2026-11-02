export type CyclePhase = 'SAFE' | 'WARNING' | 'CRITICAL_ALERT' | 'OVERDUE_RISK';

export interface CycleState {
  currentDay: number; // 1 to 30+
  totalDays: number; // 30
  daysRemaining: number;
  phase: CyclePhase;
  phaseLabel: string;
  statusColor: 'green' | 'yellow' | 'orange' | 'red';
  startDate: string;
  dueDate: string;
  isPaid: boolean;
  estimatedKWh: number;
  estimatedAmountKz: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  clientNumber: string;
  meterNumber: string;
  customerName: string;
  address: string;
  period: string; // e.g. "Outubro 2026"
  consumptionKWh: number;
  amountKz: number;
  dueDate: string;
  status: 'PENDING' | 'PAID' | 'OVERDUE';
  rupe: string;
  entityCode: string; // 00142 ENDE
  reference: string;
  paymentDate?: string;
  emisTxId?: string;
  emisAuthCode?: string;
  fiscalHash?: string;
  terminalId?: string;
  notes?: string;
}

export interface EmisTransaction {
  transactionId: string;
  rupe: string;
  entity: string;
  reference: string;
  amountKz: number;
  phoneNumber: string;
  clientNumber: string;
  invoiceId: string;
  status: 'PENDING_PIN_AUTHORIZATION' | 'PROCESSING' | 'PAYMENT_SUCCESS' | 'CANCELLED';
  createdAt: string;
  expiresAt: string;
  authCode?: string;
  terminalId?: string;
  clearedAt?: string;
  fiscalHash?: string;
}

export interface WhatsAppMessage {
  id: string;
  sender: 'bot' | 'user' | 'system';
  text: string;
  timestamp: string;
  isRead?: boolean;
  actionType?: 'PAY_NOW' | 'SNOOZE' | 'SHOW_RECEIPT' | 'CYCLE_INFO' | 'PREDICT';
  actionLabel?: string;
  invoiceId?: string;
}

export interface EnergyPrediction {
  targetMonth: number;
  predictedKWh: number;
  predictedAmountKz: number;
  seasonalFactor: number;
  seasonalReason: string;
  recommendedBudgetLimitKz: number;
  aiAdvice: string;
  confidenceScore: number;
}

export interface UserSettings {
  customerName: string;
  clientNumber: string;
  meterNumber: string;
  address: string;
  province: string;
  phoneNumber: string;
  monthlyBudgetKz: number;
  cutOffDayOfMonth: number;
  enableWhatsAppAlerts: boolean;
  enableSounds: boolean;
  safeDaysThreshold: number; // 20
  warningDaysThreshold: number; // 27
  criticalDaysThreshold: number; // 29
}
