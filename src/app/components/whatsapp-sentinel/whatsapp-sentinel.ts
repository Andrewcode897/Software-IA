import { ChangeDetectionStrategy, Component, ElementRef, ViewChild, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { EnergyState } from '../../services/energy-state';
import { WhatsAppMessage } from '../../models/energy.models';

@Component({
  selector: 'app-whatsapp-sentinel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ReactiveFormsModule, MatIconModule],
  template: `
    <div class="rounded-3xl bg-stone-900/90 border border-stone-800 overflow-hidden shadow-2xl flex flex-col h-[650px] backdrop-blur-xl">
      <!-- WhatsApp Header -->
      <div class="bg-stone-950 px-4 py-3 border-b border-stone-800 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="relative">
            <div class="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-base shadow-md">
              <mat-icon>electric_bolt</mat-icon>
            </div>
            @if (isConnected()) {
              <span class="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-stone-950"></span>
            } @else {
              <span class="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-stone-500 border-2 border-stone-950"></span>
            }
          </div>
          <div>
            <div class="flex items-center gap-1.5">
              <h3 class="text-sm font-bold text-stone-100">LuzEmDia Sentinel</h3>
              <mat-icon class="text-emerald-400 text-sm">verified</mat-icon>
            </div>
            <p class="text-[11px] text-stone-400 flex items-center gap-1">
              @if (isConnected()) {
                <span class="text-emerald-400 font-medium">online</span>
                <span>• Vigilância 24/7 (ENDE Luanda)</span>
              } @else {
                <span class="text-stone-400">offline • toque para ligar QR Code</span>
              }
            </p>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <!-- QR Code Pair / Toggle Connection Button -->
          <button
            (click)="showQrModal.set(!showQrModal())"
            [class.bg-emerald-500/20]="isConnected()"
            [class.text-emerald-400]="isConnected()"
            [class.border-emerald-500/30]="isConnected()"
            [class.bg-stone-800]="!isConnected()"
            [class.text-stone-300]="!isConnected()"
            class="px-2.5 py-1.5 rounded-xl border text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer"
            title="Conexão do Motor WhatsApp"
          >
            <mat-icon class="text-sm">qr_code_2</mat-icon>
            <span class="hidden sm:inline">{{ isConnected() ? 'Ligado (Local)' : 'Emparelhar QR' }}</span>
          </button>
        </div>
      </div>

      <!-- Main Chat Body -->
      <div class="flex-1 overflow-y-auto p-4 space-y-3 bg-[#0d1418] relative" #chatContainer>
        
        <!-- Wallpaper Pattern Overlay -->
        <div class="absolute inset-0 opacity-[0.03] pointer-events-none bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:16px_16px]"></div>

        <!-- Date separator -->
        <div class="flex justify-center my-2">
          <span class="px-3 py-1 rounded-full bg-stone-900/90 text-[10px] text-stone-400 font-medium uppercase tracking-wider border border-stone-800">
            Hoje • Sentinela Local Ativa
          </span>
        </div>

        <!-- Messages Loop -->
        @for (msg of messages(); track msg.id) {
          @if (msg.sender === 'system') {
            <!-- System Notice -->
            <div class="flex justify-center my-1.5">
              <span class="px-3 py-1 rounded-xl bg-stone-900/80 text-[11px] text-stone-400 text-center max-w-md border border-stone-800">
                🔒 {{ msg.text }}
              </span>
            </div>
          } @else if (msg.sender === 'bot') {
            <!-- Bot / Sentinel Message -->
            <div class="flex items-end gap-2 max-w-[85%] sm:max-w-[75%]">
              <div class="p-3.5 rounded-2xl rounded-bl-none bg-stone-800/95 text-stone-100 border border-stone-700/60 shadow-md space-y-2">
                <div class="text-xs whitespace-pre-wrap leading-relaxed select-text" [innerHTML]="formatWhatsAppText(msg.text)"></div>
                
                <!-- Action button if attached -->
                @if (msg.actionType) {
                  <div class="pt-1 border-t border-stone-700/60">
                    <button
                      (click)="onAction(msg)"
                      class="w-full py-2 px-3 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <mat-icon class="text-sm">
                        {{ msg.actionType === 'PAY_NOW' ? 'bolt' : msg.actionType === 'SHOW_RECEIPT' ? 'description' : 'touch_app' }}
                      </mat-icon>
                      <span>{{ msg.actionLabel || 'Executar Ação' }}</span>
                    </button>
                  </div>
                }

                <div class="flex justify-end items-center gap-1 text-[10px] text-stone-400 pt-0.5">
                  <span>{{ msg.timestamp }}</span>
                </div>
              </div>
            </div>
          } @else {
            <!-- User Message -->
            <div class="flex items-end justify-end">
              <div class="p-3 rounded-2xl rounded-br-none bg-emerald-700 text-stone-100 max-w-[80%] sm:max-w-[70%] shadow-md space-y-1">
                <div class="text-xs leading-relaxed select-text">{{ msg.text }}</div>
                <div class="flex justify-end items-center gap-1 text-[10px] text-emerald-200">
                  <span>{{ msg.timestamp }}</span>
                  <mat-icon class="text-xs">done_all</mat-icon>
                </div>
              </div>
            </div>
          }
        }
      </div>

      <!-- Quick Action Prompt Chips -->
      <div class="px-3 py-2 bg-stone-950 border-t border-stone-800/80 flex items-center gap-1.5 overflow-x-auto text-[11px] no-scrollbar">
        <span class="text-stone-400 text-[10px] font-semibold uppercase tracking-wider shrink-0 mr-1">Rápido:</span>
        <button
          (click)="sendQuick('Quanto devo este mês?')"
          class="px-2.5 py-1 rounded-full bg-stone-800/90 hover:bg-stone-700 text-stone-300 whitespace-nowrap transition-colors cursor-pointer border border-stone-700"
        >
          💰 Quanto devo?
        </button>
        <button
          (click)="sendQuick('Paga a luz agora')"
          class="px-2.5 py-1 rounded-full bg-stone-800/90 hover:bg-stone-700 text-stone-300 whitespace-nowrap transition-colors cursor-pointer border border-stone-700"
        >
          ⚡ Pagar a luz agora
        </button>
        <button
          (click)="sendQuick('Adia o lembrete por 2 dias')"
          class="px-2.5 py-1 rounded-full bg-stone-800/90 hover:bg-stone-700 text-stone-300 whitespace-nowrap transition-colors cursor-pointer border border-stone-700"
        >
          ⏰ Adiar 2 dias
        </button>
        <button
          (click)="sendQuick('Qual a previsão do próximo mês?')"
          class="px-2.5 py-1 rounded-full bg-stone-800/90 hover:bg-stone-700 text-stone-300 whitespace-nowrap transition-colors cursor-pointer border border-stone-700"
        >
          📊 Previsão IA
        </button>
        <button
          (click)="sendQuick('Mostra o comprovativo')"
          class="px-2.5 py-1 rounded-full bg-stone-800/90 hover:bg-stone-700 text-stone-300 whitespace-nowrap transition-colors cursor-pointer border border-stone-700"
        >
          📄 Ver comprovativo
        </button>
      </div>

      <!-- Message Input Bar -->
      <div class="p-3 bg-stone-950 flex items-center gap-2 border-t border-stone-800">
        <input
          type="text"
          [formControl]="messageControl"
          (keydown.enter)="sendMessage()"
          placeholder="Mensagem ao Sentinel (ex: 'Quanto devo?', 'Paga a luz')..."
          class="flex-1 bg-stone-900 border border-stone-800 rounded-2xl px-4 py-2.5 text-xs text-stone-100 placeholder-stone-400 focus:outline-none focus:border-emerald-500 transition-colors"
        />

        <button
          (click)="sendMessage()"
          [disabled]="!messageControl.value.trim()"
          class="w-10 h-10 rounded-2xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-30 disabled:cursor-not-allowed text-white flex items-center justify-center transition-all cursor-pointer shadow-md shadow-emerald-950"
        >
          <mat-icon class="text-sm">send</mat-icon>
        </button>
      </div>

      <!-- QR Code Pairing Modal -->
      @if (showQrModal()) {
        <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/80 backdrop-blur-md">
          <div class="w-full max-w-sm rounded-3xl bg-stone-900 border border-stone-800 p-6 shadow-2xl space-y-4">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <mat-icon class="text-emerald-400">qr_code_scanner</mat-icon>
                <h4 class="font-bold text-stone-100 text-base">Motor WhatsApp Local</h4>
              </div>
              <button (click)="showQrModal.set(false)" class="text-stone-400 hover:text-white cursor-pointer">
                <mat-icon>close</mat-icon>
              </button>
            </div>

            <p class="text-xs text-stone-300">
              O motor opera através de ligação web direta (Baileys Engine), garantindo que nenhum dado passe por servidores de terceiros ou taxas pagas da Meta.
            </p>

            <!-- Simulated Authentic QR Code Graphic -->
            <div class="flex flex-col items-center justify-center p-5 bg-white rounded-2xl shadow-inner">
              <svg class="w-48 h-48 text-stone-950" viewBox="0 0 120 120">
                <!-- QR Code Markers -->
                <rect x="10" y="10" width="30" height="30" fill="currentColor" rx="4" />
                <rect x="16" y="16" width="18" height="18" fill="white" rx="2" />
                <rect x="20" y="20" width="10" height="10" fill="currentColor" rx="1" />

                <rect x="80" y="10" width="30" height="30" fill="currentColor" rx="4" />
                <rect x="86" y="16" width="18" height="18" fill="white" rx="2" />
                <rect x="90" y="20" width="10" height="10" fill="currentColor" rx="1" />

                <rect x="10" y="80" width="30" height="30" fill="currentColor" rx="4" />
                <rect x="16" y="86" width="18" height="18" fill="white" rx="2" />
                <rect x="20" y="90" width="10" height="10" fill="currentColor" rx="1" />

                <!-- QR Data Matrix Dots -->
                <circle cx="50" cy="20" r="3" fill="currentColor" />
                <circle cx="65" cy="25" r="3" fill="currentColor" />
                <circle cx="55" cy="35" r="3" fill="currentColor" />
                <circle cx="20" cy="55" r="3" fill="currentColor" />
                <circle cx="35" cy="65" r="3" fill="currentColor" />
                <circle cx="50" cy="60" r="3" fill="currentColor" />
                <circle cx="65" cy="55" r="3" fill="currentColor" />
                <circle cx="80" cy="60" r="3" fill="currentColor" />
                <circle cx="95" cy="65" r="3" fill="currentColor" />
                <circle cx="60" cy="80" r="3" fill="currentColor" />
                <circle cx="75" cy="90" r="3" fill="currentColor" />
                <circle cx="90" cy="85" r="3" fill="currentColor" />
                <circle cx="105" cy="95" r="3" fill="currentColor" />
                <circle cx="55" cy="100" r="3" fill="currentColor" />
                <circle cx="70" cy="105" r="3" fill="currentColor" />
              </svg>
              <span class="text-[10px] text-stone-500 font-mono mt-2 font-medium">LUZEMDIA-AUTH-SESSION-LOCAL</span>
            </div>

            <div class="pt-2">
              <button
                (click)="toggleConnection()"
                class="w-full py-2.5 rounded-xl font-bold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
                [class.bg-red-600]="isConnected()"
                [class.hover:bg-red-500]="isConnected()"
                [class.text-white]="true"
                [class.bg-emerald-600]="!isConnected()"
                [class.hover:bg-emerald-500]="!isConnected()"
              >
                <mat-icon class="text-sm">{{ isConnected() ? 'power_settings_new' : 'link' }}</mat-icon>
                <span>{{ isConnected() ? 'Desconectar Sessão Local' : 'Simular Emparelhamento do Telefone' }}</span>
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
})
export class WhatsAppSentinel {
  private readonly state = inject(EnergyState);

  @ViewChild('chatContainer') private chatContainer?: ElementRef;

  readonly isConnected = this.state.isWhatsAppConnected;
  readonly messages = this.state.whatsAppMessages;

  readonly messageControl = new FormControl('', { nonNullable: true });
  readonly showQrModal = signal<boolean>(false);

  sendMessage() {
    const val = this.messageControl.value;
    if (val && val.trim()) {
      this.state.sendWhatsAppUserMessage(val);
      this.messageControl.setValue('');
      setTimeout(() => this.scrollToBottom(), 100);
    }
  }

  sendQuick(prompt: string) {
    this.state.sendWhatsAppUserMessage(prompt);
    setTimeout(() => this.scrollToBottom(), 100);
  }

  onAction(msg: WhatsAppMessage) {
    this.state.handleWhatsAppAction(msg);
  }

  toggleConnection() {
    this.state.toggleWhatsAppConnection();
    this.showQrModal.set(false);
  }

  formatWhatsAppText(text: string): string {
    if (!text) return '';
    // Format *bold* to <strong>
    const formatted = text.replace(/\*(.*?)\*/g, '<strong class="text-white font-semibold">$1</strong>');
    return formatted;
  }

  private scrollToBottom() {
    if (this.chatContainer) {
      try {
        this.chatContainer.nativeElement.scrollTop = this.chatContainer.nativeElement.scrollHeight;
      } catch (err: unknown) {
        console.debug('Scroll error:', err);
      }
    }
  }
}
