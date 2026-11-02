import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { EnergyState } from '../../services/energy-state';
import { KzPipe } from '../../pipes/kz.pipe';

@Component({
  selector: 'app-emis-modal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, MatIconModule, KzPipe],
  template: `
    @if (isOpen()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/80 backdrop-blur-md animate-fade-in">
        <!-- Phone Frame Container -->
        <div class="relative w-full max-w-sm rounded-[2.5rem] bg-stone-900 border-4 border-stone-800 shadow-2xl overflow-hidden text-stone-100 flex flex-col max-h-[92vh]">
          
          <!-- Phone Speaker & Camera Notch -->
          <div class="h-6 w-full bg-stone-950 flex items-center justify-center">
            <div class="h-1.5 w-16 bg-stone-800 rounded-full"></div>
          </div>

          <!-- Top App Bar (EMIS Multicaixa Express Header) -->
          <div class="bg-gradient-to-r from-red-700 to-red-600 px-5 py-3.5 flex items-center justify-between text-white shadow-md">
            <div class="flex items-center gap-2">
              <span class="p-1 rounded bg-white/20 text-white font-black text-xs tracking-wider">MCX</span>
              <span class="font-bold text-sm tracking-tight">MULTICAIXA Express</span>
            </div>
            <button
              (click)="close()"
              class="w-7 h-7 rounded-full bg-black/20 hover:bg-black/30 flex items-center justify-center text-white transition-colors cursor-pointer"
            >
              <mat-icon class="text-sm">close</mat-icon>
            </button>
          </div>

          <!-- Notification Banner -->
          <div class="bg-red-500/10 border-b border-red-500/20 px-4 py-2 flex items-center gap-2 text-xs text-red-300">
            <mat-icon class="text-sm animate-pulse text-red-400">notifications_active</mat-icon>
            <span>Pedido de Pagamento Push Recebido</span>
          </div>

          <!-- Scrollable Phone Body -->
          <div class="flex-1 overflow-y-auto p-5 space-y-4">
            
            @if (activeTx()?.status === 'PAYMENT_SUCCESS') {
              <!-- Payment Success Screen -->
              <div class="py-6 flex flex-col items-center text-center space-y-3 animate-scale-up">
                <div class="w-20 h-20 rounded-full bg-emerald-500/20 border-2 border-emerald-500 text-emerald-400 flex items-center justify-center shadow-lg shadow-emerald-950/60">
                  <mat-icon class="text-5xl">check</mat-icon>
                </div>
                
                <h3 class="text-xl font-black text-emerald-400">PAGAMENTO APROVADO!</h3>
                <p class="text-xs text-stone-300">A operação foi liquidada e validada em tempo real pela rede EMIS Multicaixa.</p>

                <!-- Transaction Details Card -->
                <div class="w-full bg-stone-950/80 rounded-2xl p-4 border border-stone-800 text-left space-y-2 text-xs font-mono">
                  <div class="flex justify-between border-b border-stone-800/80 pb-1.5">
                    <span class="text-stone-400 font-sans">Entidade:</span>
                    <span class="font-bold text-stone-100">00142 (ENDE EP)</span>
                  </div>
                  <div class="flex justify-between border-b border-stone-800/80 pb-1.5">
                    <span class="text-stone-400 font-sans">Montante:</span>
                    <span class="font-bold text-emerald-400">{{ activeTx()?.amountKz | kz }} Kz</span>
                  </div>
                  <div class="flex justify-between border-b border-stone-800/80 pb-1.5">
                    <span class="text-stone-400 font-sans">Cód. Autorização:</span>
                    <span class="font-bold text-amber-400">{{ activeTx()?.authCode }}</span>
                  </div>
                  <div class="flex justify-between border-b border-stone-800/80 pb-1.5">
                    <span class="text-stone-400 font-sans">Transação:</span>
                    <span class="text-stone-300">{{ activeTx()?.transactionId }}</span>
                  </div>
                  <div class="flex justify-between">
                    <span class="text-stone-400 font-sans">Terminal:</span>
                    <span class="text-stone-300">{{ activeTx()?.terminalId || 'TMCX-LUANDA-094' }}</span>
                  </div>
                </div>

                <div class="p-2.5 rounded-xl bg-emerald-950/30 border border-emerald-800/40 text-[11px] text-emerald-300 flex items-center gap-2">
                  <mat-icon class="text-sm">verified_user</mat-icon>
                  <span>Comprovativo oficial arquivado no Cofre Anti-Fiscal</span>
                </div>
              </div>
            } @else {
              <!-- Push Authorization & PIN Entry Screen -->
              <div class="space-y-4">
                <!-- Merchant & Amount Header -->
                <div class="bg-stone-950 rounded-2xl p-4 border border-stone-800 text-center space-y-1">
                  <span class="text-[11px] uppercase tracking-wider text-stone-400 font-medium">Serviço de Eletricidade</span>
                  <h4 class="text-base font-bold text-stone-100">ENDE EP - Eletricidade de Angola</h4>
                  
                  <div class="pt-2">
                    <span class="text-xs text-stone-400">Total a Autorizar</span>
                    <div class="text-2xl font-black text-stone-100">
                      {{ activeTx()?.amountKz | kz }} <span class="text-red-500 font-bold text-lg">Kz</span>
                    </div>
                  </div>

                  <div class="pt-2 text-[11px] text-stone-400 grid grid-cols-2 gap-2 border-t border-stone-800/80">
                    <div>Entidade: <strong class="text-stone-200">00142</strong></div>
                    <div>Ref: <strong class="text-stone-200">{{ activeTx()?.reference }}</strong></div>
                  </div>
                </div>

                <!-- PIN Entry Indicator -->
                <div class="text-center space-y-2">
                  <span class="block text-xs font-semibold text-stone-300">Introduza o seu PIN MULTICAIXA (4 dígitos)</span>
                  
                  <!-- 4 Dots Indicators -->
                  <div class="flex justify-center items-center gap-3 py-1">
                    @for (dot of [0, 1, 2, 3]; track dot) {
                      <div
                        class="w-4 h-4 rounded-full border-2 transition-all duration-200"
                        [class.bg-red-500]="pin().length > dot"
                        [class.border-red-500]="pin().length > dot"
                        [class.scale-110]="pin().length > dot"
                        [class.bg-stone-800]="pin().length <= dot"
                        [class.border-stone-700]="pin().length <= dot"
                      ></div>
                    }
                  </div>

                  @if (errorMessage()) {
                    <p class="text-[11px] text-red-400 font-medium animate-shake">{{ errorMessage() }}</p>
                  }
                </div>

                <!-- Custom Scrambled/Numeric Keypad -->
                <div class="grid grid-cols-3 gap-2">
                  @for (key of keypadKeys; track key) {
                    <button
                      type="button"
                      (click)="pressKey(key)"
                      class="h-12 rounded-xl bg-stone-800/90 hover:bg-stone-700 active:scale-95 text-stone-100 font-bold text-lg flex items-center justify-center transition-all cursor-pointer border border-stone-700/60 shadow-sm"
                    >
                      @if (key === 'backspace') {
                        <mat-icon class="text-stone-400">backspace</mat-icon>
                      } @else if (key === 'clear') {
                        <span class="text-xs text-stone-400">C</span>
                      } @else {
                        <span>{{ key }}</span>
                      }
                    </button>
                  }
                </div>

                <!-- Submit / Authorize Button -->
                <button
                  type="button"
                  (click)="submitPin()"
                  [disabled]="pin().length !== 4 || isProcessing()"
                  class="w-full py-3.5 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-sm tracking-wide transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-red-950/50"
                >
                  @if (isProcessing()) {
                    <mat-icon class="animate-spin text-sm">progress_activity</mat-icon>
                    <span>A Processar com a EMIS...</span>
                  } @else {
                    <mat-icon class="text-sm">lock_open</mat-icon>
                    <span>Confirmar Pagamento</span>
                  }
                </button>

                <p class="text-center text-[10px] text-stone-400">
                  Ambiente seguro de demonstração com integração simulada GPO EMIS Luanda.
                </p>
              </div>
            }
          </div>

          <!-- Phone Home Indicator Bar -->
          <div class="h-5 w-full bg-stone-950 flex items-center justify-center">
            <div class="h-1 w-28 bg-stone-700 rounded-full"></div>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    @keyframes shake {
      0%, 100% { transform: translateX(0); }
      25% { transform: translateX(-4px); }
      75% { transform: translateX(4px); }
    }
    .animate-shake {
      animation: shake 0.3s ease-in-out;
    }
  `],
})
export class EmisModal {
  private readonly state = inject(EnergyState);

  readonly isOpen = this.state.isEmisModalOpen;
  readonly activeTx = this.state.activeEmisTx;
  readonly pin = this.state.emisPinInput;
  readonly errorMessage = this.state.emisErrorMessage;
  readonly isProcessing = this.state.emisProcessing;

  readonly keypadKeys: (string | number)[] = [
    1, 2, 3,
    4, 5, 6,
    7, 8, 9,
    'clear', 0, 'backspace',
  ];

  close() {
    this.state.closeEmisModal();
  }

  pressKey(key: string | number) {
    if (key === 'backspace') {
      this.state.removePinDigit();
    } else if (key === 'clear') {
      this.state.clearPinDigits();
    } else {
      this.state.appendPinDigit(String(key));
    }
  }

  submitPin() {
    this.state.submitEmisPin();
  }
}
