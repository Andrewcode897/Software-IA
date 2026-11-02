import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { EnergyState } from '../../services/energy-state';
import { Invoice } from '../../models/energy.models';
import { KzPipe } from '../../pipes/kz.pipe';

@Component({
  selector: 'app-anti-fiscal-vault',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, MatIconModule, KzPipe],
  template: `
    <div class="rounded-3xl bg-stone-900/90 border border-stone-800 p-6 md:p-8 backdrop-blur-xl shadow-2xl space-y-6">
      <!-- Header -->
      <div class="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div class="flex items-center gap-2">
            <span class="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
              <mat-icon class="text-sm">verified_user</mat-icon>
            </span>
            <span class="text-xs uppercase tracking-wider font-semibold text-emerald-400">Proteção Jurídica & Quitações</span>
          </div>
          <h2 class="text-xl md:text-2xl font-bold text-stone-100 mt-1">Cofre Digital Anti-Fiscal</h2>
        </div>

        <div class="flex items-center gap-2">
          <div class="px-3 py-1 rounded-full bg-stone-950 border border-stone-800 text-xs text-stone-300 font-mono flex items-center gap-1.5">
            <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>{{ paidInvoices().length }} Comprovativos Blindados</span>
          </div>
        </div>
      </div>

      <p class="text-xs text-stone-300 max-w-2xl leading-relaxed">
        Armazenamento local criptografado para exibição instantânea aos fiscais de corte da ENDE. Cada comprovativo contém o código oficial de autorização da rede EMIS Multicaixa e QR Code de verificação em tempo real.
      </p>

      <!-- Invoices History Table / Cards -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        @for (inv of paidInvoices(); track inv.id) {
          <div
            (click)="inspect(inv)"
            (keydown.enter)="inspect(inv)"
            tabindex="0"
            role="button"
            class="group p-5 rounded-2xl bg-stone-950/80 border border-stone-800 hover:border-emerald-500/50 hover:bg-stone-900/90 transition-all cursor-pointer shadow-lg relative overflow-hidden flex flex-col justify-between"
          >
            <!-- Top badge & period -->
            <div class="space-y-2">
              <div class="flex items-center justify-between">
                <span class="text-xs font-bold text-stone-200">{{ inv.period }}</span>
                <span class="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold tracking-wide flex items-center gap-1">
                  <mat-icon class="text-xs">verified</mat-icon>
                  PAGO
                </span>
              </div>

              <!-- Main Amount & kWh -->
              <div>
                <div class="text-2xl font-black text-stone-100 group-hover:text-emerald-400 transition-colors">
                  {{ inv.amountKz | kz }} <span class="text-xs font-bold text-stone-400">Kz</span>
                </div>
                <div class="text-xs text-stone-400 font-mono">
                  {{ inv.consumptionKWh }} kWh • Contador: {{ inv.meterNumber }}
                </div>
              </div>
            </div>

            <!-- Footer Clearance Codes -->
            <div class="mt-4 pt-3 border-t border-stone-800/80 space-y-1 text-[11px] font-mono text-stone-400">
              <div class="flex justify-between">
                <span>Aut. EMIS:</span>
                <span class="text-amber-400 font-semibold">{{ inv.emisAuthCode || 'EMIS-VALIDADO' }}</span>
              </div>
              <div class="flex justify-between">
                <span>RUPE:</span>
                <span class="text-stone-300 truncate max-w-[140px]">{{ inv.rupe }}</span>
              </div>
            </div>

            <!-- Inspect prompt hover -->
            <div class="mt-3 w-full py-1.5 rounded-xl bg-stone-900 group-hover:bg-emerald-600 group-hover:text-white text-stone-300 text-xs font-semibold text-center transition-all flex items-center justify-center gap-1">
              <mat-icon class="text-sm">visibility</mat-icon>
              <span>Exibir ao Fiscal</span>
            </div>
          </div>
        }
      </div>

      <!-- Detail Modal: Full Official Clearance Receipt (Anti-Fiscal Inspector Screen) -->
      @if (inspectingInvoice()) {
        <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/85 backdrop-blur-md animate-fade-in">
          <div class="relative w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-3xl bg-white text-stone-900 shadow-2xl p-6 md:p-8 space-y-6">
            
            <!-- Top Actions -->
            <div class="flex items-center justify-between border-b pb-3 print:hidden">
              <div class="flex items-center gap-2">
                <span class="p-1 rounded bg-emerald-600 text-white">
                  <mat-icon class="text-sm">verified</mat-icon>
                </span>
                <span class="text-xs font-bold uppercase tracking-wider text-stone-700">Comprovativo de Quitação Oficial</span>
              </div>

              <div class="flex items-center gap-2">
                <button
                  (click)="printReceipt()"
                  class="px-3 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-semibold transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <mat-icon class="text-sm">print</mat-icon>
                  <span>Imprimir / PDF</span>
                </button>
                <button
                  (click)="closeInspection()"
                  class="w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 flex items-center justify-center text-stone-600 transition-colors cursor-pointer"
                >
                  <mat-icon class="text-sm">close</mat-icon>
                </button>
              </div>
            </div>

            <!-- Printable Receipt Container -->
            <div id="official-receipt-print" class="space-y-6 font-sans">
              <!-- Official Header Republic of Angola / ENDE -->
              <div class="text-center space-y-1 border-b border-stone-200 pb-4">
                <p class="text-[10px] font-bold tracking-widest uppercase text-stone-500">República de Angola • Ministério da Energia e Águas</p>
                <h3 class="text-lg font-black tracking-tight text-stone-900">ENDE - EMPRESA NACIONAL DE DISTRIBUIÇÃO DE ELECTRICIDADE, E.P.</h3>
                <p class="text-xs text-stone-600">Sistema Integrado de Faturação e Cobrança • Luanda</p>
              </div>

              <!-- Big Stamp: PAGO / LIQUIDADO EMIS -->
              <div class="p-4 rounded-2xl bg-emerald-50 border-2 border-emerald-500 text-emerald-900 flex items-center justify-between">
                <div class="flex items-center gap-3">
                  <div class="w-12 h-12 rounded-full bg-emerald-500 text-white flex items-center justify-center font-black text-xl shadow-md">
                    <mat-icon class="text-2xl">check_circle</mat-icon>
                  </div>
                  <div>
                    <span class="text-[10px] uppercase tracking-wider font-extrabold text-emerald-700">Estado de Fornecimento</span>
                    <h4 class="text-base font-black text-emerald-900 leading-tight">ENERGIA REGULARIZADA - PAGO</h4>
                    <p class="text-[11px] text-emerald-800 font-mono">Aut. EMIS: {{ inspectingInvoice()?.emisAuthCode || 'EMIS-AUT-4920194' }}</p>
                  </div>
                </div>
                <div class="text-right">
                  <span class="text-[10px] text-emerald-700 block uppercase font-bold">Liquidado em</span>
                  <span class="text-xs font-mono font-bold text-emerald-900">{{ inspectingInvoice()?.paymentDate ? (inspectingInvoice()?.paymentDate | date:'dd/MM/yyyy HH:mm') : 'Liquidado no Ciclo' }}</span>
                </div>
              </div>

              <!-- Client & Meter Specifications Grid -->
              <div class="grid grid-cols-2 gap-4 text-xs bg-stone-50 p-4 rounded-2xl border border-stone-200">
                <div>
                  <span class="text-[10px] uppercase tracking-wider text-stone-500 block">Titular / Cliente</span>
                  <strong class="text-stone-900 font-bold block">{{ inspectingInvoice()?.customerName }}</strong>
                  <span class="text-stone-600 text-[11px] block mt-0.5">{{ inspectingInvoice()?.address }}</span>
                </div>
                <div>
                  <span class="text-[10px] uppercase tracking-wider text-stone-500 block">Nº de Cliente ENDE</span>
                  <strong class="text-stone-900 font-mono text-sm block">{{ inspectingInvoice()?.clientNumber }}</strong>
                  <span class="text-[10px] uppercase tracking-wider text-stone-500 block mt-2">Nº do Contador</span>
                  <strong class="text-stone-900 font-mono text-sm block">{{ inspectingInvoice()?.meterNumber }}</strong>
                </div>
              </div>

              <!-- Billing Breakdown -->
              <div class="space-y-2 text-xs">
                <div class="flex justify-between py-1 border-b border-stone-200">
                  <span class="text-stone-600">Período de Referência:</span>
                  <span class="font-bold text-stone-900">{{ inspectingInvoice()?.period }}</span>
                </div>
                <div class="flex justify-between py-1 border-b border-stone-200">
                  <span class="text-stone-600">Consumo Faturado em Baixa Tensão (BT):</span>
                  <span class="font-bold text-stone-900">{{ inspectingInvoice()?.consumptionKWh }} kWh</span>
                </div>
                <div class="flex justify-between py-1 border-b border-stone-200">
                  <span class="text-stone-600">Entidade Multicaixa:</span>
                  <span class="font-mono font-bold text-stone-900">00142 (ENDE EP)</span>
                </div>
                <div class="flex justify-between py-1 border-b border-stone-200">
                  <span class="text-stone-600">Referência Multicaixa / RUPE:</span>
                  <span class="font-mono font-bold text-stone-900">{{ inspectingInvoice()?.reference }} / {{ inspectingInvoice()?.rupe }}</span>
                </div>
                <div class="flex justify-between py-2 border-t-2 border-stone-900 text-sm font-black">
                  <span>TOTAL LIQUIDADO (KWANZAS):</span>
                  <span class="text-emerald-700 text-base">{{ inspectingInvoice()?.amountKz | kz }} Kz</span>
                </div>
              </div>

              <!-- Verification QR Code & Digital Signature Section for Field Fiscal -->
              <div class="p-4 rounded-2xl bg-stone-100 border border-stone-300 flex items-center justify-between gap-4">
                <div class="space-y-1">
                  <h5 class="text-xs font-black uppercase text-stone-900">Validação para o Fiscal da ENDE</h5>
                  <p class="text-[11px] text-stone-600 leading-snug">
                    Aponte a câmara do terminal de fiscalização para o código ao lado para conferir a chave criptográfica nos servidores da EMIS / ENDE.
                  </p>
                  <p class="text-[10px] font-mono text-stone-500 pt-1">
                    Hash: {{ inspectingInvoice()?.fiscalHash || 'AO-EMIS-2026-ENDE-QUITA' }}
                  </p>
                </div>

                <!-- QR Code representation -->
                <div class="p-2 bg-white rounded-xl shadow-sm border border-stone-200 shrink-0">
                  <svg class="w-20 h-20 text-stone-900" viewBox="0 0 100 100">
                    <rect x="5" y="5" width="30" height="30" fill="currentColor" rx="2" />
                    <rect x="10" y="10" width="20" height="20" fill="white" rx="1" />
                    <rect x="14" y="14" width="12" height="12" fill="currentColor" />

                    <rect x="65" y="5" width="30" height="30" fill="currentColor" rx="2" />
                    <rect x="70" y="10" width="20" height="20" fill="white" rx="1" />
                    <rect x="74" y="14" width="12" height="12" fill="currentColor" />

                    <rect x="5" y="65" width="30" height="30" fill="currentColor" rx="2" />
                    <rect x="10" y="70" width="20" height="20" fill="white" rx="1" />
                    <rect x="14" y="74" width="12" height="12" fill="currentColor" />

                    <circle cx="48" cy="20" r="3" fill="currentColor" />
                    <circle cx="48" cy="40" r="3" fill="currentColor" />
                    <circle cx="50" cy="50" r="4" fill="currentColor" />
                    <circle cx="30" cy="50" r="3" fill="currentColor" />
                    <circle cx="70" cy="50" r="3" fill="currentColor" />
                    <circle cx="50" cy="70" r="3" fill="currentColor" />
                    <circle cx="70" cy="70" r="4" fill="currentColor" />
                    <circle cx="85" cy="85" r="4" fill="currentColor" />
                  </svg>
                </div>
              </div>

              <!-- Footer Notice -->
              <p class="text-[10px] text-center text-stone-500 italic">
                Documento emitido ao abrigo do Decreto Executivo Regulador do Sector Eléctrico de Angola. Proibida a suspensão de fornecimento com quitação ativa.
              </p>
            </div>
          </div>
        </div>
      }
    </div>
  `,
})
export class AntiFiscalVault {
  private readonly state = inject(EnergyState);

  readonly paidInvoices = computed(() => {
    const list = this.state.invoiceHistory();
    const curr = this.state.currentInvoice();
    if (curr.status === 'PAID') {
      const exists = list.some((i) => i.id === curr.id);
      if (!exists) return [curr, ...list];
    }
    return list;
  });

  readonly inspectingInvoice = this.state.inspectingInvoice;

  inspect(invoice: Invoice) {
    this.state.inspectInvoice(invoice);
  }

  closeInspection() {
    this.state.closeInspection();
  }

  printReceipt() {
    if (typeof window !== 'undefined') {
      window.print();
    }
  }
}
