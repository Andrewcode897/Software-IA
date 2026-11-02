import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { EnergyState } from '../../services/energy-state';

@Component({
  selector: 'app-settings-modal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ReactiveFormsModule, MatIconModule],
  template: `
    @if (isOpen()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/80 backdrop-blur-md animate-fade-in">
        <div class="relative w-full max-w-lg rounded-3xl bg-stone-900 border border-stone-800 shadow-2xl p-6 md:p-8 space-y-6 max-h-[90vh] overflow-y-auto">
          <!-- Header -->
          <div class="flex items-center justify-between border-b border-stone-800 pb-4">
            <div class="flex items-center gap-2.5">
              <span class="p-2 rounded-xl bg-stone-800 text-stone-300">
                <mat-icon class="text-sm">tune</mat-icon>
              </span>
              <div>
                <h3 class="text-lg font-bold text-stone-100">Configuração & Privacidade Local</h3>
                <p class="text-xs text-stone-400">Armazenamento 100% no dispositivo (SQLite/LocalStorage)</p>
              </div>
            </div>
            <button
              (click)="close()"
              class="w-8 h-8 rounded-full bg-stone-800 hover:bg-stone-700 flex items-center justify-center text-stone-400 hover:text-white transition-colors cursor-pointer"
            >
              <mat-icon class="text-sm">close</mat-icon>
            </button>
          </div>

          <!-- Settings Form -->
          <form [formGroup]="form" (ngSubmit)="save()" class="space-y-4 text-xs">
            
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <!-- Customer Name -->
              <label class="space-y-1 block">
                <span class="font-semibold text-stone-300 block">Nome do Titular</span>
                <input
                  type="text"
                  formControlName="customerName"
                  class="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-stone-100 focus:outline-none focus:border-emerald-500"
                />
              </label>

              <!-- Phone Number -->
              <label class="space-y-1 block">
                <span class="font-semibold text-stone-300 block">Telefone Multicaixa / WhatsApp</span>
                <input
                  type="text"
                  formControlName="phoneNumber"
                  class="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-stone-100 font-mono focus:outline-none focus:border-emerald-500"
                />
              </label>

              <!-- Client Number -->
              <label class="space-y-1 block">
                <span class="font-semibold text-stone-300 block">Nº de Cliente ENDE</span>
                <input
                  type="text"
                  formControlName="clientNumber"
                  class="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-stone-100 font-mono focus:outline-none focus:border-emerald-500"
                />
              </label>

              <!-- Meter Number -->
              <label class="space-y-1 block">
                <span class="font-semibold text-stone-300 block">Nº do Contador</span>
                <input
                  type="text"
                  formControlName="meterNumber"
                  class="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-stone-100 font-mono focus:outline-none focus:border-emerald-500"
                />
              </label>

              <!-- Address / Neighborhood -->
              <label class="space-y-1 block sm:col-span-2">
                <span class="font-semibold text-stone-300 block">Endereço / Bairro / Município</span>
                <input
                  type="text"
                  formControlName="address"
                  placeholder="Ex: Talatona, Maianga, Cazenga, Kilamba, etc."
                  class="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-stone-100 focus:outline-none focus:border-emerald-500"
                />
              </label>

              <!-- Monthly Budget -->
              <label class="space-y-1 block">
                <span class="font-semibold text-stone-300 block">Limite Orçamental Mensal (Kz)</span>
                <input
                  type="number"
                  formControlName="monthlyBudgetKz"
                  class="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-stone-100 font-mono focus:outline-none focus:border-emerald-500"
                />
              </label>

              <!-- Province -->
              <label class="space-y-1 block">
                <span class="font-semibold text-stone-300 block">Província</span>
                <select
                  formControlName="province"
                  class="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-stone-100 focus:outline-none focus:border-emerald-500"
                >
                  <option value="Luanda">Luanda</option>
                  <option value="Benguela">Benguela</option>
                  <option value="Huambo">Huambo</option>
                  <option value="Huíla">Huíla</option>
                  <option value="Cabinda">Cabinda</option>
                  <option value="Cuanza Sul">Cuanza Sul</option>
                  <option value="Outra">Outra Província</option>
                </select>
              </label>
            </div>

            <!-- Toggles -->
            <div class="pt-2 space-y-2 border-t border-stone-800">
              <label class="flex items-center gap-3 p-2.5 rounded-xl bg-stone-950/60 border border-stone-800 cursor-pointer">
                <input type="checkbox" formControlName="enableWhatsAppAlerts" class="rounded accent-emerald-500 w-4 h-4" />
                <div>
                  <span class="font-semibold text-stone-200 block">Alertas Proativos no WhatsApp</span>
                  <span class="text-stone-400 text-[11px]">Disparar avisos automáticos nos dias 1, 25, 29 e 30.</span>
                </div>
              </label>
            </div>

            <!-- Buttons -->
            <div class="pt-4 flex items-center justify-end gap-3 border-t border-stone-800">
              <button
                type="button"
                (click)="close()"
                class="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 font-semibold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                class="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold cursor-pointer shadow-md shadow-emerald-950"
              >
                Guardar Alterações
              </button>
            </div>
          </form>

          <!-- Local Backup & Reset Section -->
          <div class="pt-4 border-t border-stone-800 space-y-3">
            <h4 class="text-xs font-bold text-stone-300 uppercase tracking-wider">Cópia de Segurança Local</h4>
            <div class="flex flex-wrap items-center gap-2">
              <button
                (click)="exportBackup()"
                class="px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-semibold flex items-center gap-1.5 cursor-pointer border border-stone-700"
              >
                <mat-icon class="text-xs">download</mat-icon>
                <span>Exportar Dados (JSON)</span>
              </button>
              <button
                (click)="triggerReset()"
                class="px-3 py-1.5 rounded-xl bg-red-950/30 hover:bg-red-900/40 text-red-300 border border-red-800/40 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                <mat-icon class="text-xs">delete_forever</mat-icon>
                <span>Repor Valores Originais</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    }
  `,
})
export class SettingsModal {
  private readonly state = inject(EnergyState);

  readonly isOpen = signal<boolean>(false);
  private readonly currentSettings = this.state.settings;

  readonly form = new FormGroup({
    customerName: new FormControl('', [Validators.required]),
    phoneNumber: new FormControl('', [Validators.required]),
    clientNumber: new FormControl('', [Validators.required]),
    meterNumber: new FormControl('', [Validators.required]),
    address: new FormControl('', [Validators.required]),
    province: new FormControl('Luanda'),
    monthlyBudgetKz: new FormControl(22000, [Validators.required]),
    enableWhatsAppAlerts: new FormControl(true),
  });

  open() {
    const s = this.currentSettings();
    this.form.patchValue({
      customerName: s.customerName,
      phoneNumber: s.phoneNumber,
      clientNumber: s.clientNumber,
      meterNumber: s.meterNumber,
      address: s.address,
      province: s.province,
      monthlyBudgetKz: s.monthlyBudgetKz,
      enableWhatsAppAlerts: s.enableWhatsAppAlerts,
    });
    this.isOpen.set(true);
  }

  close() {
    this.isOpen.set(false);
  }

  save() {
    if (this.form.valid) {
      const val = this.form.value;
      this.state.updateSettings({
        customerName: val.customerName || '',
        phoneNumber: val.phoneNumber || '',
        clientNumber: val.clientNumber || '',
        meterNumber: val.meterNumber || '',
        address: val.address || '',
        province: val.province || 'Luanda',
        monthlyBudgetKz: Number(val.monthlyBudgetKz) || 22000,
        enableWhatsAppAlerts: Boolean(val.enableWhatsAppAlerts),
      });
      this.close();
    }
  }

  exportBackup() {
    if (typeof window !== 'undefined') {
      const data = {
        settings: this.state.settings(),
        invoices: this.state.invoiceHistory(),
        currentInvoice: this.state.currentInvoice(),
        cycleDay: this.state.currentDay(),
        exportedAt: new Date().toISOString(),
      };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `luzemdia-backup-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    }
  }

  triggerReset() {
    if (confirm('Tem a certeza que deseja limpar todos os dados locais e repor os valores de fábrica?')) {
      this.state.resetAllData();
    }
  }
}
