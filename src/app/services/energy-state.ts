import { Injectable, computed, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import {
  CyclePhase,
  CycleState,
  EmisTransaction,
  EnergyPrediction,
  Invoice,
  UserSettings,
  WhatsAppMessage,
} from '../models/energy.models';

const STORAGE_KEY_SETTINGS = 'luzemdia_settings_v1';
const STORAGE_KEY_INVOICES = 'luzemdia_invoices_v1';
const STORAGE_KEY_CYCLE_DAY = 'luzemdia_cycle_day_v1';
const STORAGE_KEY_WA_MESSAGES = 'luzemdia_wa_messages_v1';
const STORAGE_KEY_WA_CONNECTED = 'luzemdia_wa_connected_v1';

interface EmisPushResponse {
  success: boolean;
  transaction: EmisTransaction;
  message: string;
}

interface EmisAuthorizeResponse {
  success: boolean;
  transaction?: EmisTransaction;
  authCode: string;
  terminalId: string;
  clearedAt: string;
  fiscalHash: string;
  message: string;
}

interface NlpChatResponse {
  reply: string;
  suggestedAction?: 'PAY_NOW' | 'SNOOZE' | 'SHOW_RECEIPT' | 'CYCLE_INFO' | 'PREDICT';
  timestamp: string;
}

interface OcrExtractedData {
  clientNumber?: string;
  meterNumber?: string;
  period?: string;
  consumptionKWh?: number;
  amountKz?: number;
  dueDate?: string;
  rupeOrEntityRef?: string;
  customerName?: string;
  address?: string;
}

interface OcrApiResponse {
  source: string;
  data: OcrExtractedData;
}

@Injectable({
  providedIn: 'root',
})
export class EnergyState {
  private readonly http = inject(HttpClient);

  // Settings signal
  readonly settings = signal<UserSettings>(this.loadSettings());

  // Simulation day signal (1 to 30+)
  readonly currentDay = signal<number>(this.loadCycleDay());

  // Current active invoice
  readonly currentInvoice = signal<Invoice>(this.getInitialCurrentInvoice());

  // Invoices history (Cofre Anti-Fiscal)
  readonly invoiceHistory = signal<Invoice[]>(this.loadInvoices());

  // WhatsApp connection and chat signals
  readonly isWhatsAppConnected = signal<boolean>(this.loadWhatsAppConnected());
  readonly whatsAppMessages = signal<WhatsAppMessage[]>(this.loadWhatsAppMessages());

  // EMIS Multicaixa active transaction
  readonly activeEmisTx = signal<EmisTransaction | null>(null);
  readonly isEmisModalOpen = signal<boolean>(false);
  readonly emisProcessing = signal<boolean>(false);
  readonly emisPinInput = signal<string>('');
  readonly emisErrorMessage = signal<string>('');

  // AI Prediction signal
  readonly aiPrediction = signal<EnergyPrediction>({
    targetMonth: new Date().getMonth() + 1,
    predictedKWh: 345,
    predictedAmountKz: 16250,
    seasonalFactor: 1.35,
    seasonalReason: 'Pico de calor e chuvas em Luanda. Maior utilização de ar condicionado.',
    recommendedBudgetLimitKz: 18000,
    aiAdvice: 'Regule os aparelhos de ar condicionado para 24°C para reduzir até 20% do pico de consumo neste ciclo.',
    confidenceScore: 0.94,
  });

  // Selected receipt for Anti-Fiscal Inspection Modal
  readonly inspectingInvoice = signal<Invoice | null>(null);

  // Computed cycle state
  readonly cycleState = computed<CycleState>(() => {
    const day = this.currentDay();
    const invoice = this.currentInvoice();
    const isPaid = invoice.status === 'PAID';
    const totalDays = 30;
    const daysRemaining = Math.max(0, totalDays - day);

    let phase: CyclePhase = 'SAFE';
    let phaseLabel = 'Fase Segura (Consumo Normal)';
    let statusColor: 'green' | 'yellow' | 'orange' | 'red' = 'green';

    if (day >= 30) {
      phase = 'OVERDUE_RISK';
      phaseLabel = isPaid ? 'Ciclo Concluído (Sem Risco)' : 'Risco Crítico de Corte ENDE';
      statusColor = isPaid ? 'green' : 'red';
    } else if (day >= 28) {
      phase = 'CRITICAL_ALERT';
      phaseLabel = isPaid ? 'Ciclo Liquidado' : 'Alerta Iminente (Fechamento Próximo)';
      statusColor = isPaid ? 'green' : 'orange';
    } else if (day >= 21) {
      phase = 'WARNING';
      phaseLabel = isPaid ? 'Ciclo Liquidado' : 'Fase de Pré-Aviso de Faturação';
      statusColor = isPaid ? 'green' : 'yellow';
    } else {
      phase = 'SAFE';
      phaseLabel = isPaid ? 'Ciclo Liquidado' : 'Fase Segura';
      statusColor = 'green';
    }

    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const dueDate = invoice.dueDate;

    return {
      currentDay: day,
      totalDays,
      daysRemaining,
      phase,
      phaseLabel,
      statusColor,
      startDate,
      dueDate,
      isPaid,
      estimatedKWh: Math.round(invoice.consumptionKWh * (day / 30)),
      estimatedAmountKz: invoice.amountKz,
    };
  });

  // Computed statistics
  readonly stats = computed(() => {
    const cycle = this.cycleState();
    const invoice = this.currentInvoice();
    const settings = this.settings();
    const progressPercent = Math.min(100, Math.round((cycle.currentDay / cycle.totalDays) * 100));
    const dailyAverageKz = Math.round(invoice.amountKz / 30);
    const budgetUsagePercent = Math.round((invoice.amountKz / settings.monthlyBudgetKz) * 100);

    return {
      progressPercent,
      dailyAverageKz,
      budgetUsagePercent,
      daysUntilCutoff: cycle.daysRemaining,
      paidCount: this.invoiceHistory().filter((i) => i.status === 'PAID').length + (invoice.status === 'PAID' ? 1 : 0),
    };
  });

  constructor() {
    this.refreshAIPrediction();
  }

  /* -------------------------------------------------------------------------- */
  /*                            TIME ENGINE ACTIONS                             */
  /* -------------------------------------------------------------------------- */

  setCycleDay(day: number) {
    const clamped = Math.max(1, Math.min(32, day));
    this.currentDay.set(clamped);
    this.saveCycleDay(clamped);
    this.checkAndTriggerAutomatedAlerts(clamped);
  }

  advanceOneDay() {
    this.setCycleDay(this.currentDay() + 1);
  }

  rewindOneDay() {
    this.setCycleDay(this.currentDay() - 1);
  }

  resetToDayOne() {
    this.setCycleDay(1);
  }

  /* -------------------------------------------------------------------------- */
  /*                       EMIS MULTICAIXA EXPRESS ENGINE                       */
  /* -------------------------------------------------------------------------- */

  openEmisPayment(invoice: Invoice = this.currentInvoice()) {
    if (invoice.status === 'PAID') {
      return;
    }

    const settings = this.settings();
    const payload = {
      phoneNumber: settings.phoneNumber,
      amountKz: invoice.amountKz,
      invoiceId: invoice.id,
      clientNumber: invoice.clientNumber,
    };

    this.http.post<EmisPushResponse>('/api/emis/push', payload).subscribe({
      next: (res) => {
        if (res.success && res.transaction) {
          this.activeEmisTx.set(res.transaction);
          this.emisPinInput.set('');
          this.emisErrorMessage.set('');
          this.isEmisModalOpen.set(true);

          // Add prompt message to WhatsApp
          this.addWhatsAppBotMessage(
            `📲 *Multicaixa Express Push Enviado!*\nFoi solicitada autorização para a fatura ENDE no valor de *${invoice.amountKz.toLocaleString('pt-AO')} Kz*.\nPor favor digite o seu PIN MCX no telemóvel para concluir com segurança.`,
            'PAY_NOW',
            'Autorizar PIN',
            invoice.id
          );
        }
      },
      error: () => {
        // Fallback transaction simulation
        const mockTx: EmisTransaction = {
          transactionId: `MCX-TX-2026-${Math.floor(10000 + Math.random() * 90000)}`,
          rupe: invoice.rupe,
          entity: '00142',
          reference: invoice.reference,
          amountKz: invoice.amountKz,
          phoneNumber: settings.phoneNumber,
          clientNumber: invoice.clientNumber,
          invoiceId: invoice.id,
          status: 'PENDING_PIN_AUTHORIZATION',
          createdAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 60000).toISOString(),
        };
        this.activeEmisTx.set(mockTx);
        this.emisPinInput.set('');
        this.emisErrorMessage.set('');
        this.isEmisModalOpen.set(true);
      },
    });
  }

  closeEmisModal() {
    this.isEmisModalOpen.set(false);
    this.emisPinInput.set('');
    this.emisErrorMessage.set('');
    this.emisProcessing.set(false);
  }

  appendPinDigit(digit: string) {
    if (this.emisPinInput().length < 4) {
      this.emisPinInput.update((curr) => curr + digit);
    }
  }

  removePinDigit() {
    this.emisPinInput.update((curr) => curr.slice(0, -1));
  }

  clearPinDigits() {
    this.emisPinInput.set('');
  }

  submitEmisPin() {
    const pin = this.emisPinInput();
    const tx = this.activeEmisTx();

    if (pin.length !== 4) {
      this.emisErrorMessage.set('O PIN deve conter exatamente 4 algarismos.');
      return;
    }

    if (!tx) return;

    this.emisProcessing.set(true);
    this.emisErrorMessage.set('');

    this.http.post<EmisAuthorizeResponse>('/api/emis/authorize', {
      transactionId: tx.transactionId,
      pin: pin,
    }).subscribe({
      next: (res) => {
        this.handlePaymentSuccess(res.authCode, res.fiscalHash, res.terminalId);
      },
      error: () => {
        // Simulated local fallback clearance
        const randomAuth = `EMIS-AUT-${Math.floor(10000000 + Math.random() * 90000000)}`;
        const fiscalHash = `AO-EMIS-${Math.random().toString(36).substring(2, 11).toUpperCase()}-ENDE`;
        this.handlePaymentSuccess(randomAuth, fiscalHash, 'TMCX-LUANDA-094');
      },
    });
  }

  private handlePaymentSuccess(authCode: string, fiscalHash: string, terminalId: string) {
    this.emisProcessing.set(false);
    const tx = this.activeEmisTx();
    if (!tx) return;

    const clearedAt = new Date().toISOString();
    const updatedTx: EmisTransaction = {
      ...tx,
      status: 'PAYMENT_SUCCESS',
      authCode,
      fiscalHash,
      terminalId,
      clearedAt,
    };
    this.activeEmisTx.set(updatedTx);

    // Settle Current Invoice
    const inv = this.currentInvoice();
    const paidInvoice: Invoice = {
      ...inv,
      status: 'PAID',
      paymentDate: clearedAt,
      emisTxId: tx.transactionId,
      emisAuthCode: authCode,
      fiscalHash: fiscalHash,
      terminalId: terminalId,
    };

    this.currentInvoice.set(paidInvoice);

    // Add or update in History
    this.invoiceHistory.update((list) => {
      const filtered = list.filter((item) => item.id !== paidInvoice.id);
      const updated = [paidInvoice, ...filtered];
      this.saveInvoices(updated);
      return updated;
    });

    // Notify on WhatsApp
    this.addWhatsAppBotMessage(
      `🎉 *PAGAMENTO MULTICAIXA EXPRESS CONCLUÍDO!*\n━━━━━━━━━━━━━━━━━━━━\n• Entidade: *00142 (ENDE EP)*\n• Montante: *${paidInvoice.amountKz.toLocaleString('pt-AO')} Kz*\n• Cód. Aut. EMIS: *${authCode}*\n• Transação: *${tx.transactionId}*\n• Hash Fiscal: *${fiscalHash}*\n\n🛡️ O teu comprovativo oficial já foi arquivado no *Cofre Digital Anti-Fiscal*. Podes exibi-lo a qualquer fiscal da ENDE com validade jurídica garantida!`,
      'SHOW_RECEIPT',
      'Ver Comprovativo',
      paidInvoice.id
    );

    // Close modal after brief celebratory moment
    setTimeout(() => {
      this.closeEmisModal();
    }, 2400);
  }

  /* -------------------------------------------------------------------------- */
  /*                         WHATSAPP SENTINEL BOT ENGINE                       */
  /* -------------------------------------------------------------------------- */

  toggleWhatsAppConnection() {
    const nextState = !this.isWhatsAppConnected();
    this.isWhatsAppConnected.set(nextState);
    this.saveWhatsAppConnected(nextState);

    if (nextState) {
      this.addWhatsAppSystemMessage('Conexão local ao WhatsApp Sentinel estabelecida com sucesso via Baileys Engine.');
      this.addWhatsAppBotMessage(
        `👋 Olá! Sou o teu *Sentinel LuzEmDia*.\nA partir de agora estou a vigiar o ciclo de 30 dias da tua fatura ENDE (Contador: *${this.settings().meterNumber}*). Não deixaremos a tua luz ser cortada!`,
        'CYCLE_INFO',
        'Ver Estado do Ciclo'
      );
    } else {
      this.addWhatsAppSystemMessage('Sessão WhatsApp desconectada localmente.');
    }
  }

  sendWhatsAppUserMessage(text: string) {
    if (!text.trim()) return;

    const userMsg: WhatsAppMessage = {
      id: `msg-${Date.now()}-${Math.random()}`,
      sender: 'user',
      text: text.trim(),
      timestamp: new Date().toLocaleTimeString('pt-AO', { hour: '2-digit', minute: '2-digit' }),
    };

    this.whatsAppMessages.update((msgs) => {
      const updated = [...msgs, userMsg];
      this.saveWhatsAppMessages(updated);
      return updated;
    });

    // Send to NLP Backend
    const cycle = this.cycleState();
    this.http.post<NlpChatResponse>('/api/ai/chat', {
      message: text,
      cycleState: {
        currentDay: cycle.currentDay,
        daysRemaining: cycle.daysRemaining,
        status: cycle.phaseLabel,
        amountKz: cycle.estimatedAmountKz,
        isPaid: cycle.isPaid,
        clientNumber: this.settings().clientNumber,
      },
    }).subscribe({
      next: (res) => {
        this.addWhatsAppBotMessage(
          res.reply,
          res.suggestedAction,
          this.getActionLabel(res.suggestedAction)
        );
      },
      error: () => {
        this.addWhatsAppBotMessage(
          'Recebido! Estou a monitorizar o teu ciclo de 30 dias da ENDE para garantir energia contínua.',
          'CYCLE_INFO',
          'Ver Resumo'
        );
      },
    });
  }

  addWhatsAppBotMessage(text: string, actionType?: WhatsAppMessage['actionType'], actionLabel?: string, invoiceId?: string) {
    const botMsg: WhatsAppMessage = {
      id: `msg-${Date.now()}-${Math.random()}`,
      sender: 'bot',
      text,
      timestamp: new Date().toLocaleTimeString('pt-AO', { hour: '2-digit', minute: '2-digit' }),
      actionType,
      actionLabel,
      invoiceId,
    };

    this.whatsAppMessages.update((msgs) => {
      const updated = [...msgs, botMsg];
      this.saveWhatsAppMessages(updated);
      return updated;
    });
  }

  addWhatsAppSystemMessage(text: string) {
    const sysMsg: WhatsAppMessage = {
      id: `msg-${Date.now()}-${Math.random()}`,
      sender: 'system',
      text,
      timestamp: new Date().toLocaleTimeString('pt-AO', { hour: '2-digit', minute: '2-digit' }),
    };

    this.whatsAppMessages.update((msgs) => {
      const updated = [...msgs, sysMsg];
      this.saveWhatsAppMessages(updated);
      return updated;
    });
  }

  private getActionLabel(action?: string): string {
    switch (action) {
      case 'PAY_NOW':
        return 'Pagar com Multicaixa';
      case 'SHOW_RECEIPT':
        return 'Ver Comprovativo';
      case 'SNOOZE':
        return 'Adiar Lembrete';
      case 'PREDICT':
        return 'Ver Previsão IA';
      default:
        return 'Ver Detalhes';
    }
  }

  handleWhatsAppAction(msg: WhatsAppMessage) {
    if (!msg.actionType) return;

    switch (msg.actionType) {
      case 'PAY_NOW':
        this.openEmisPayment();
        break;
      case 'SHOW_RECEIPT':
        this.inspectInvoice(this.currentInvoice());
        break;
      case 'SNOOZE':
        this.addWhatsAppBotMessage(
          '⏰ Lembrete silenciado por 48 horas. Avisarei novamente quando o prazo estiver a aproximar-se do limite de corte.'
        );
        break;
      case 'PREDICT':
        this.refreshAIPrediction();
        this.addWhatsAppBotMessage(
          `📊 *Previsão do Próximo Mês:*\nEstimativa de *${this.aiPrediction().predictedAmountKz.toLocaleString('pt-AO')} Kz* (${this.aiPrediction().predictedKWh} kWh).\n${this.aiPrediction().aiAdvice}`
        );
        break;
      case 'CYCLE_INFO': {
        const cycle = this.cycleState();
        this.addWhatsAppBotMessage(
          `⏱️ *Estado do Ciclo:*\nDia *${cycle.currentDay}/30* • Faltam *${cycle.daysRemaining} dias* para o fecho.\nFatura: *${cycle.estimatedAmountKz.toLocaleString('pt-AO')} Kz* (${cycle.isPaid ? 'PAGA' : 'PENDENTE'}).`
        );
        break;
      }
    }
  }

  /* -------------------------------------------------------------------------- */
  /*                     AUTOMATED 30-DAY PROGRESSIVE ALERTS                    */
  /* -------------------------------------------------------------------------- */

  private checkAndTriggerAutomatedAlerts(day: number) {
    const invoice = this.currentInvoice();
    if (invoice.status === 'PAID') {
      return;
    }

    const amountFormatted = `${invoice.amountKz.toLocaleString('pt-AO')} Kz`;

    if (day === 1) {
      this.addWhatsAppBotMessage(
        `🟢 *Dia 1 do Ciclo ENDE Iniciado!*\nO contador de 30 dias foi resetado. Previsão de custo inicial calculada: *${amountFormatted}*.\nAproveite para verificar o seu disjuntor e manter os consumos eficientes!`,
        'PREDICT',
        'Ver Previsão'
      );
    } else if (day === 25) {
      this.addWhatsAppBotMessage(
        `🟡 *Pré-Aviso do Sentinel (Dia 25 de 30)*\nFaltam apenas *5 dias* para o fecho da fatura ENDE deste mês. O valor a liquidar é de *${amountFormatted}*.\nQueres que eu lembre mais tarde ou preferes liquidar já via Multicaixa Express?`,
        'PAY_NOW',
        'Pagar via MCX'
      );
    } else if (day === 28 || day === 29) {
      this.addWhatsAppBotMessage(
        `🟠 *ALERTA IMINENTE (Dia ${day} de 30)*\n⚠️ Faltam menos de *${30 - day} dia(s)* para o prazo final!\nEvite filas no banco e o terror de cortes na iluminação pública. Autorize a liquidação via Multicaixa Express agora.`,
        'PAY_NOW',
        '⚡ Pagar Agora'
      );
    } else if (day >= 30) {
      this.addWhatsAppBotMessage(
        `🔴 *RISCO CRÍTICO DE CORTE (Dia 30+)*\n🚨 A sua fatura da ENDE atingiu o prazo máximo! Os fiscais de corte podem suspender o fornecimento de energia a qualquer momento.\nLiquide imediatamente para emissão do comprovativo Anti-Fiscal!`,
        'PAY_NOW',
        '🚨 LIQUIDAR COM URGÊNCIA'
      );
    }
  }

  /* -------------------------------------------------------------------------- */
  /*                               AI PREDICTIONS                               */
  /* -------------------------------------------------------------------------- */

  refreshAIPrediction() {
    this.http.post<EnergyPrediction>('/api/ai/predict', {
      currentMonth: new Date().getMonth() + 1,
      history: this.invoiceHistory(),
      clientInfo: this.settings(),
    }).subscribe({
      next: (pred) => {
        this.aiPrediction.set(pred);
      },
      error: () => {
        // Fallback already preset
      },
    });
  }

  /* -------------------------------------------------------------------------- */
  /*                            OCR SMART EXTRACTION                            */
  /* -------------------------------------------------------------------------- */

  processInvoiceOcr(imageBase64: string, mimeType: string, callback?: (data: Invoice) => void) {
    this.http.post<OcrApiResponse>('/api/ocr', { imageBase64, mimeType }).subscribe({
      next: (res) => {
        if (res.data) {
          const extracted = res.data;
          const newInvoice: Invoice = {
            id: `inv-${Date.now()}`,
            invoiceNumber: `ENDE-${Math.floor(100000 + Math.random() * 900000)}`,
            clientNumber: extracted.clientNumber || this.settings().clientNumber,
            meterNumber: extracted.meterNumber || this.settings().meterNumber,
            customerName: extracted.customerName || this.settings().customerName,
            address: extracted.address || this.settings().address,
            period: extracted.period || 'Mês Atual',
            consumptionKWh: extracted.consumptionKWh || 320,
            amountKz: extracted.amountKz || 16500,
            dueDate: extracted.dueDate || new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0],
            status: 'PENDING',
            rupe: extracted.rupeOrEntityRef || `RUPE-2026${Math.floor(100000000 + Math.random() * 900000000)}`,
            entityCode: '00142',
            reference: `${Math.floor(90000000 + Math.random() * 99999999)}`,
            notes: `Fatura digitalizada via OCR inteligente (${res.source})`,
          };

          this.currentInvoice.set(newInvoice);
          this.addWhatsAppBotMessage(
            `📄 *Fatura ENDE Digitalizada com Sucesso!*\n• Cliente: *${newInvoice.clientNumber}*\n• Consumo: *${newInvoice.consumptionKWh} kWh*\n• Montante: *${newInvoice.amountKz.toLocaleString('pt-AO')} Kz*\n• Prazo: *${newInvoice.dueDate}*`,
            'PAY_NOW',
            'Pagar Fatura'
          );

          if (callback) callback(newInvoice);
        }
      },
      error: (err: unknown) => {
        console.error('OCR error:', err);
      },
    });
  }

  loadSampleInvoice(type: 'talatona' | 'maianga') {
    if (type === 'talatona') {
      const sample: Invoice = {
        id: `inv-sample-${Date.now()}`,
        invoiceNumber: 'ENDE-84920194',
        clientNumber: '00481920-1',
        meterNumber: 'ENDE-739102',
        customerName: 'Agostinho André',
        address: 'Rua do Luanda Sul, Talatona, Luanda',
        period: 'Ciclo Vigente',
        consumptionKWh: 340,
        amountKz: 16800,
        dueDate: new Date(Date.now() + 4 * 86400000).toISOString().split('T')[0],
        status: 'PENDING',
        rupe: 'RUPE-202684910231',
        entityCode: '00142',
        reference: '92849102',
        notes: 'Fatura de baixa tensão doméstica - ENDE Luanda',
      };
      this.currentInvoice.set(sample);
    } else {
      const sample: Invoice = {
        id: `inv-sample-${Date.now()}`,
        invoiceNumber: 'ENDE-51928472',
        clientNumber: '00319482-9',
        meterNumber: 'ENDE-628491',
        customerName: 'Agostinho André',
        address: 'Av. Ho Chi Minh, Maianga, Luanda',
        period: 'Ciclo Vigente',
        consumptionKWh: 290,
        amountKz: 14200,
        dueDate: new Date(Date.now() + 6 * 86400000).toISOString().split('T')[0],
        status: 'PENDING',
        rupe: 'RUPE-202651928472',
        entityCode: '00142',
        reference: '91849201',
        notes: 'Fatura residencial social - ENDE Luanda',
      };
      this.currentInvoice.set(sample);
    }
  }

  /* -------------------------------------------------------------------------- */
  /*                             ANTI-FISCAL VAULT                              */
  /* -------------------------------------------------------------------------- */

  inspectInvoice(invoice: Invoice) {
    this.inspectingInvoice.set(invoice);
  }

  closeInspection() {
    this.inspectingInvoice.set(null);
  }

  updateSettings(newSettings: Partial<UserSettings>) {
    this.settings.update((curr) => {
      const merged = { ...curr, ...newSettings };
      this.saveSettings(merged);
      return merged;
    });
  }

  resetAllData() {
    if (typeof window !== 'undefined') {
      localStorage.clear();
      window.location.reload();
    }
  }

  /* -------------------------------------------------------------------------- */
  /*                         PERSISTENCE & INITIALIZATION                       */
  /* -------------------------------------------------------------------------- */

  private loadSettings(): UserSettings {
    if (typeof window === 'undefined') return this.defaultSettings();
    try {
      const raw = localStorage.getItem(STORAGE_KEY_SETTINGS);
      if (raw) return JSON.parse(raw);
    } catch (_err: unknown) {
      console.debug('Failed to parse settings:', _err);
    }
    return this.defaultSettings();
  }

  private saveSettings(settings: UserSettings) {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(settings));
    }
  }

  private defaultSettings(): UserSettings {
    return {
      customerName: 'Agostinho André',
      clientNumber: '00481920-1',
      meterNumber: 'ENDE-739102',
      address: 'Bairro Talatona, Rua Principal, Luanda',
      province: 'Luanda',
      phoneNumber: '+244 923 456 789',
      monthlyBudgetKz: 22000,
      cutOffDayOfMonth: 30,
      enableWhatsAppAlerts: true,
      enableSounds: true,
      safeDaysThreshold: 20,
      warningDaysThreshold: 27,
      criticalDaysThreshold: 29,
    };
  }

  private loadCycleDay(): number {
    if (typeof window === 'undefined') return 25; // Default starts at Dia 25 to show the pre-warning phase directly!
    try {
      const raw = localStorage.getItem(STORAGE_KEY_CYCLE_DAY);
      if (raw) return Number(raw) || 25;
    } catch (_err: unknown) {
      console.debug('Failed to parse cycle day:', _err);
    }
    return 25;
  }

  private saveCycleDay(day: number) {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_CYCLE_DAY, String(day));
    }
  }

  private loadWhatsAppConnected(): boolean {
    if (typeof window === 'undefined') return true;
    try {
      const raw = localStorage.getItem(STORAGE_KEY_WA_CONNECTED);
      return raw ? JSON.parse(raw) : true;
    } catch (_err: unknown) {
      console.debug('Failed to parse WA connected:', _err);
    }
    return true;
  }

  private saveWhatsAppConnected(connected: boolean) {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_WA_CONNECTED, JSON.stringify(connected));
    }
  }

  private getInitialCurrentInvoice(): Invoice {
    return {
      id: 'inv-oct-2026',
      invoiceNumber: 'ENDE-84920194',
      clientNumber: '00481920-1',
      meterNumber: 'ENDE-739102',
      customerName: 'Agostinho André',
      address: 'Bairro Talatona, Luanda, Angola',
      period: 'Ciclo Outubro / Novembro 2026',
      consumptionKWh: 340,
      amountKz: 16800,
      dueDate: new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0],
      status: 'PENDING',
      rupe: 'RUPE-202684910231',
      entityCode: '00142',
      reference: '92849102',
      notes: 'Fatura de consumo doméstico ativo - Ciclo de 30 dias em curso.',
    };
  }

  private loadInvoices(): Invoice[] {
    if (typeof window === 'undefined') return this.seedInvoiceHistory();
    try {
      const raw = localStorage.getItem(STORAGE_KEY_INVOICES);
      if (raw) return JSON.parse(raw);
    } catch (_err: unknown) {
      console.debug('Failed to parse invoices:', _err);
    }
    return this.seedInvoiceHistory();
  }

  private saveInvoices(invoices: Invoice[]) {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_INVOICES, JSON.stringify(invoices));
    }
  }

  private seedInvoiceHistory(): Invoice[] {
    return [
      {
        id: 'inv-sep-2026',
        invoiceNumber: 'ENDE-78291034',
        clientNumber: '00481920-1',
        meterNumber: 'ENDE-739102',
        customerName: 'Agostinho André',
        address: 'Bairro Talatona, Luanda, Angola',
        period: 'Setembro 2026',
        consumptionKWh: 310,
        amountKz: 15200,
        dueDate: '2026-09-30',
        status: 'PAID',
        paymentDate: '2026-09-28T14:32:00.000Z',
        emisTxId: 'MCX-TX-2026-84921',
        emisAuthCode: 'EMIS-AUT-49201940',
        rupe: 'RUPE-202678291034',
        entityCode: '00142',
        reference: '91820491',
        fiscalHash: 'AO-EMIS-SEP26-9284A-ENDE-QUITA',
        terminalId: 'TMCX-LUANDA-094',
        notes: 'Liquidado via Multicaixa Express no Dia 28.',
      },
      {
        id: 'inv-aug-2026',
        invoiceNumber: 'ENDE-69182740',
        clientNumber: '00481920-1',
        meterNumber: 'ENDE-739102',
        customerName: 'Agostinho André',
        address: 'Bairro Talatona, Luanda, Angola',
        period: 'Agosto 2026 (Cacimbo)',
        consumptionKWh: 245,
        amountKz: 12100,
        dueDate: '2026-08-30',
        status: 'PAID',
        paymentDate: '2026-08-25T10:15:00.000Z',
        emisTxId: 'MCX-TX-2026-72810',
        emisAuthCode: 'EMIS-AUT-31948201',
        rupe: 'RUPE-202669182740',
        entityCode: '00142',
        reference: '90184729',
        fiscalHash: 'AO-EMIS-AUG26-3829B-ENDE-QUITA',
        terminalId: 'TMCX-LUANDA-094',
        notes: 'Mês de Cacimbo fresco com consumo reduzido.',
      },
      {
        id: 'inv-jul-2026',
        invoiceNumber: 'ENDE-61849201',
        clientNumber: '00481920-1',
        meterNumber: 'ENDE-739102',
        customerName: 'Agostinho André',
        address: 'Bairro Talatona, Luanda, Angola',
        period: 'Julho 2026 (Cacimbo)',
        consumptionKWh: 250,
        amountKz: 12400,
        dueDate: '2026-07-30',
        status: 'PAID',
        paymentDate: '2026-07-26T16:45:00.000Z',
        emisTxId: 'MCX-TX-2026-61849',
        emisAuthCode: 'EMIS-AUT-20491824',
        rupe: 'RUPE-202661849201',
        entityCode: '00142',
        reference: '89104829',
        fiscalHash: 'AO-EMIS-JUL26-1049C-ENDE-QUITA',
        terminalId: 'TMCX-LUANDA-094',
        notes: 'Liquidado via Multicaixa Express.',
      },
    ];
  }

  private loadWhatsAppMessages(): WhatsAppMessage[] {
    if (typeof window === 'undefined') return this.initialWhatsAppMessages();
    try {
      const raw = localStorage.getItem(STORAGE_KEY_WA_MESSAGES);
      if (raw) return JSON.parse(raw);
    } catch (_err: unknown) {
      console.debug('Failed to parse messages:', _err);
    }
    return this.initialWhatsAppMessages();
  }

  private saveWhatsAppMessages(messages: WhatsAppMessage[]) {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_WA_MESSAGES, JSON.stringify(messages));
    }
  }

  private initialWhatsAppMessages(): WhatsAppMessage[] {
    return [
      {
        id: 'seed-1',
        sender: 'system',
        text: 'Sessão WhatsApp do LuzEmDia conectada localmente.',
        timestamp: '08:00',
      },
      {
        id: 'seed-2',
        sender: 'bot',
        text: '👋 Bom dia, Agostinho! O teu *LuzEmDia Sentinel* está ativo.\nEstamos no *Dia 25 de 30* do teu ciclo de faturação ENDE.',
        timestamp: '08:01',
      },
      {
        id: 'seed-3',
        sender: 'bot',
        text: '🟡 *Pré-Aviso*: Faltam *5 dias* para o fecho do ciclo. O valor atual estimado é de *16.800 Kz*.\nQueres que eu emita o Push Multicaixa Express agora para liquidares sem filas?',
        timestamp: '08:02',
        actionType: 'PAY_NOW',
        actionLabel: '⚡ Pagar com MCX',
      },
    ];
  }
}
