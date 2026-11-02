import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { EnergyState } from '../../services/energy-state';
import { KzPipe } from '../../pipes/kz.pipe';

@Component({
  selector: 'app-cycle-dial',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, MatIconModule, KzPipe],
  template: `
    <div class="relative overflow-hidden rounded-3xl bg-stone-900/90 border border-stone-800 p-6 md:p-8 backdrop-blur-xl shadow-2xl">
      <!-- Ambient background glow based on cycle status -->
      <div
        class="absolute -top-24 -right-24 w-72 h-72 rounded-full blur-3xl pointer-events-none transition-colors duration-700 opacity-20"
        [class.bg-emerald-500]="cycle().statusColor === 'green'"
        [class.bg-amber-500]="cycle().statusColor === 'yellow'"
        [class.bg-orange-500]="cycle().statusColor === 'orange'"
        [class.bg-red-500]="cycle().statusColor === 'red'"
      ></div>

      <!-- Top Header & Status Badge -->
      <div class="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <div class="flex items-center gap-2">
            <span class="inline-flex items-center justify-center p-1.5 rounded-lg bg-stone-800 text-stone-400">
              <mat-icon class="text-sm">access_time</mat-icon>
            </span>
            <span class="text-xs uppercase tracking-wider font-semibold text-stone-400">Motor do Ciclo de 30 Dias</span>
          </div>
          <h2 class="text-xl md:text-2xl font-bold text-stone-100 mt-1">Sentinela de Faturação ENDE</h2>
        </div>

        <!-- Dynamic Phase Badge -->
        <div
          class="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold tracking-wide border shadow-sm transition-all duration-300"
          [ngClass]="badgeClass()"
        >
          <span class="relative flex h-2 w-2">
            <span
              class="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
              [class.bg-emerald-400]="cycle().statusColor === 'green'"
              [class.bg-amber-400]="cycle().statusColor === 'yellow'"
              [class.bg-orange-400]="cycle().statusColor === 'orange'"
              [class.bg-red-400]="cycle().statusColor === 'red'"
            ></span>
            <span
              class="relative inline-flex rounded-full h-2 w-2"
              [class.bg-emerald-500]="cycle().statusColor === 'green'"
              [class.bg-amber-500]="cycle().statusColor === 'yellow'"
              [class.bg-orange-500]="cycle().statusColor === 'orange'"
              [class.bg-red-500]="cycle().statusColor === 'red'"
            ></span>
          </span>
          <span>{{ cycle().phaseLabel }}</span>
        </div>
      </div>

      <!-- Central Visual Dial & Key Information -->
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center py-4">
        <!-- Circular Radial Gauge -->
        <div class="lg:col-span-5 flex flex-col items-center justify-center">
          <div class="relative w-64 h-64 md:w-72 md:h-72 flex items-center justify-center">
            <svg class="w-full h-full transform -rotate-90" viewBox="0 0 240 240">
              <!-- Background Track Ring -->
              <circle
                cx="120"
                cy="120"
                r="96"
                stroke="currentColor"
                stroke-width="14"
                fill="transparent"
                class="text-stone-800/80"
              />
              <!-- Progress Ring -->
              <circle
                cx="120"
                cy="120"
                r="96"
                stroke="currentColor"
                stroke-width="14"
                stroke-linecap="round"
                fill="transparent"
                [style.strokeDasharray]="circumference"
                [style.strokeDashoffset]="strokeOffset()"
                class="transition-all duration-700 ease-out"
                [ngClass]="ringClass()"
              />
            </svg>

            <!-- Inner Dial Content -->
            <div class="absolute inset-0 flex flex-col items-center justify-center text-center p-6">
              @if (cycle().isPaid) {
                <div class="w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-1 animate-pulse">
                  <mat-icon class="text-3xl">verified</mat-icon>
                </div>
                <span class="text-xs uppercase tracking-wider font-bold text-emerald-400">Ciclo Quitado</span>
                <span class="text-2xl font-black text-white mt-0.5">Sem Risco</span>
                <span class="text-xs text-stone-400 mt-1">Luz Protegida</span>
              } @else {
                <span class="text-xs uppercase tracking-wider font-semibold text-stone-400">Dias Restantes</span>
                <div class="flex items-baseline justify-center gap-1 my-0.5">
                  <span
                    class="text-5xl md:text-6xl font-black tracking-tight"
                    [class.text-emerald-400]="cycle().statusColor === 'green'"
                    [class.text-amber-400]="cycle().statusColor === 'yellow'"
                    [class.text-orange-400]="cycle().statusColor === 'orange'"
                    [class.text-red-400]="cycle().statusColor === 'red'"
                  >
                    {{ cycle().daysRemaining }}
                  </span>
                  <span class="text-lg font-bold text-stone-400">dias</span>
                </div>
                <span class="text-xs font-medium text-stone-400">Até ao Risco de Corte</span>
                <div class="mt-2 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-stone-800 text-stone-300 text-[11px] font-mono">
                  <span>Dia {{ cycle().currentDay }} de 30</span>
                </div>
              }
            </div>
          </div>

          <!-- Color Semaphore Legend Bar -->
          <div class="w-full max-w-xs mt-4 grid grid-cols-4 gap-1.5 p-1 rounded-xl bg-stone-950/60 border border-stone-800 text-[10px] text-center font-medium">
            <div
              class="py-1 px-1 rounded-lg transition-all"
              [class.bg-emerald-500]="cycle().statusColor === 'green' && !cycle().isPaid"
              [class.text-white]="cycle().statusColor === 'green' && !cycle().isPaid"
              [class.text-stone-400]="cycle().statusColor !== 'green' || cycle().isPaid"
            >
              1-20 Seguro
            </div>
            <div
              class="py-1 px-1 rounded-lg transition-all"
              [class.bg-amber-500]="cycle().statusColor === 'yellow' && !cycle().isPaid"
              [class.text-stone-950]="cycle().statusColor === 'yellow' && !cycle().isPaid"
              [class.text-stone-400]="cycle().statusColor !== 'yellow' || cycle().isPaid"
            >
              21-27 Aviso
            </div>
            <div
              class="py-1 px-1 rounded-lg transition-all"
              [class.bg-orange-500]="cycle().statusColor === 'orange' && !cycle().isPaid"
              [class.text-white]="cycle().statusColor === 'orange' && !cycle().isPaid"
              [class.text-stone-400]="cycle().statusColor !== 'orange' || cycle().isPaid"
            >
              28-29 Alerta
            </div>
            <div
              class="py-1 px-1 rounded-lg transition-all"
              [class.bg-red-500]="cycle().statusColor === 'red' && !cycle().isPaid"
              [class.text-white]="cycle().statusColor === 'red' && !cycle().isPaid"
              [class.text-stone-400]="cycle().statusColor !== 'red' || cycle().isPaid"
            >
              30+ Corte
            </div>
          </div>
        </div>

        <!-- Key Sentinel Cards & Instant Resolution -->
        <div class="lg:col-span-7 space-y-4">
          <!-- Main Financial Summary Card -->
          <div class="p-5 rounded-2xl bg-stone-950/80 border border-stone-800/80 space-y-4">
            <div class="flex items-center justify-between">
              <div>
                <span class="text-xs text-stone-400 uppercase tracking-wider font-medium">Fatura Atual ENDE</span>
                <div class="text-3xl md:text-4xl font-extrabold text-stone-100 mt-0.5">
                  {{ invoice().amountKz | kz }} <span class="text-emerald-400 text-xl font-bold">Kz</span>
                </div>
              </div>
              <div class="text-right">
                <span class="text-xs text-stone-400 uppercase tracking-wider font-medium">Consumo Faturado</span>
                <div class="text-xl md:text-2xl font-bold text-stone-200 mt-0.5">
                  {{ invoice().consumptionKWh }} <span class="text-stone-400 text-sm font-normal">kWh</span>
                </div>
              </div>
            </div>

            <!-- Mini stats row -->
            <div class="grid grid-cols-3 gap-3 pt-3 border-t border-stone-800/60 text-xs">
              <div class="p-2.5 rounded-xl bg-stone-900/60 border border-stone-800">
                <span class="text-stone-400 block mb-0.5">Nº de Cliente</span>
                <span class="font-mono font-semibold text-stone-200">{{ invoice().clientNumber }}</span>
              </div>
              <div class="p-2.5 rounded-xl bg-stone-900/60 border border-stone-800">
                <span class="text-stone-400 block mb-0.5">Nº Contador</span>
                <span class="font-mono font-semibold text-stone-200">{{ invoice().meterNumber }}</span>
              </div>
              <div class="p-2.5 rounded-xl bg-stone-900/60 border border-stone-800">
                <span class="text-stone-400 block mb-0.5">Média Diária</span>
                <span class="font-mono font-semibold text-emerald-400">{{ stats().dailyAverageKz | kz }} Kz</span>
              </div>
            </div>

            <!-- Primary Action Call to Action -->
            <div class="pt-2">
              @if (invoice().status === 'PAID') {
                <div class="flex items-center justify-between p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
                  <div class="flex items-center gap-3">
                    <span class="p-2 rounded-lg bg-emerald-500/20 text-emerald-400">
                      <mat-icon>check_circle</mat-icon>
                    </span>
                    <div>
                      <h4 class="text-sm font-bold text-emerald-300">Fatura Paga e Arquivada</h4>
                      <p class="text-xs text-stone-400">Autenticação EMIS: {{ invoice().emisAuthCode || 'EMIS-AUT-VALIDADA' }}</p>
                    </div>
                  </div>
                  <button
                    (click)="inspectInvoice()"
                    class="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-all flex items-center gap-1.5 shadow-lg shadow-emerald-900/30 cursor-pointer"
                  >
                    <mat-icon class="text-sm">security</mat-icon>
                    Ver no Cofre
                  </button>
                </div>
              } @else {
                <div class="space-y-2">
                  <button
                    (click)="triggerPayment()"
                    class="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-base shadow-xl shadow-emerald-950/50 hover:shadow-emerald-900/40 transition-all flex items-center justify-center gap-3 cursor-pointer group"
                  >
                    <mat-icon class="group-hover:scale-110 transition-transform">bolt</mat-icon>
                    <span>Liquidar com 1 Toque (Multicaixa Express)</span>
                  </button>
                  <p class="text-center text-[11px] text-stone-400">
                    🔒 Comunicação direta com o simulador oficial EMIS GPO de Luanda. Sem filas, sem atrasos.
                  </p>
                </div>
              }
            </div>
          </div>

          <!-- Time Travel Simulator Controls (For testing all cycle states) -->
          <div class="p-4 rounded-2xl bg-stone-900/60 border border-stone-800/80">
            <div class="flex items-center justify-between mb-2.5">
              <span class="text-xs font-semibold text-stone-300 flex items-center gap-1.5">
                <mat-icon class="text-sm text-amber-400">fast_forward</mat-icon>
                Simulador do Ciclo no Tempo (Testar Fases)
              </span>
              <span class="text-[11px] text-stone-400 font-mono">Dia {{ cycle().currentDay }}</span>
            </div>

            <!-- Quick Day Jumping Buttons -->
            <div class="grid grid-cols-4 gap-2 mb-3">
              <button
                (click)="setDay(1)"
                class="py-1.5 px-2 rounded-lg text-xs font-medium border transition-colors cursor-pointer"
                [class.bg-emerald-500/20]="cycle().currentDay === 1"
                [class.border-emerald-500/40]="cycle().currentDay === 1"
                [class.text-emerald-300]="cycle().currentDay === 1"
                [class.bg-stone-800]="cycle().currentDay !== 1"
                [class.border-stone-700]="cycle().currentDay !== 1"
                [class.text-stone-300]="cycle().currentDay !== 1"
              >
                Dia 1 (Início)
              </button>
              <button
                (click)="setDay(25)"
                class="py-1.5 px-2 rounded-lg text-xs font-medium border transition-colors cursor-pointer"
                [class.bg-amber-500/20]="cycle().currentDay === 25"
                [class.border-amber-500/40]="cycle().currentDay === 25"
                [class.text-amber-300]="cycle().currentDay === 25"
                [class.bg-stone-800]="cycle().currentDay !== 25"
                [class.border-stone-700]="cycle().currentDay !== 25"
                [class.text-stone-300]="cycle().currentDay !== 25"
              >
                Dia 25 (Aviso)
              </button>
              <button
                (click)="setDay(29)"
                class="py-1.5 px-2 rounded-lg text-xs font-medium border transition-colors cursor-pointer"
                [class.bg-orange-500/20]="cycle().currentDay === 29"
                [class.border-orange-500/40]="cycle().currentDay === 29"
                [class.text-orange-300]="cycle().currentDay === 29"
                [class.bg-stone-800]="cycle().currentDay !== 29"
                [class.border-stone-700]="cycle().currentDay !== 29"
                [class.text-stone-300]="cycle().currentDay !== 29"
              >
                Dia 29 (Alerta)
              </button>
              <button
                (click)="setDay(31)"
                class="py-1.5 px-2 rounded-lg text-xs font-medium border transition-colors cursor-pointer"
                [class.bg-red-500/20]="cycle().currentDay >= 30"
                [class.border-red-500/40]="cycle().currentDay >= 30"
                [class.text-red-300]="cycle().currentDay >= 30"
                [class.bg-stone-800]="cycle().currentDay < 30"
                [class.border-stone-700]="cycle().currentDay < 30"
                [class.text-stone-300]="cycle().currentDay < 30"
              >
                Dia 30+ (Corte)
              </button>
            </div>

            <!-- Step by step navigation -->
            <div class="flex items-center justify-between text-xs pt-1">
              <button
                (click)="stepBack()"
                class="px-2.5 py-1 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 flex items-center gap-1 transition-colors cursor-pointer"
              >
                <mat-icon class="text-xs">chevron_left</mat-icon>
                <span>Dia Anterior</span>
              </button>
              <button
                (click)="resetDay()"
                class="px-2.5 py-1 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-400 hover:text-stone-200 flex items-center gap-1 transition-colors cursor-pointer"
              >
                <mat-icon class="text-xs">restart_alt</mat-icon>
                <span>Resetar (Dia 1)</span>
              </button>
              <button
                (click)="stepForward()"
                class="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1 transition-colors cursor-pointer font-medium"
              >
                <span>Avançar 1 Dia</span>
                <mat-icon class="text-xs">chevron_right</mat-icon>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class CycleDial {
  private readonly state = inject(EnergyState);

  readonly cycle = this.state.cycleState;
  readonly invoice = this.state.currentInvoice;
  readonly stats = this.state.stats;

  readonly circumference = 2 * Math.PI * 96; // ~603.18

  readonly strokeOffset = computed(() => {
    const cycle = this.cycle();
    const progress = Math.min(1, cycle.currentDay / cycle.totalDays);
    return this.circumference * (1 - progress);
  });

  readonly ringClass = computed(() => {
    const status = this.cycle().statusColor;
    if (this.cycle().isPaid) return 'text-emerald-500';
    switch (status) {
      case 'red':
        return 'text-red-500 animate-pulse';
      case 'orange':
        return 'text-orange-500';
      case 'yellow':
        return 'text-amber-500';
      default:
        return 'text-emerald-500';
    }
  });

  readonly badgeClass = computed(() => {
    const status = this.cycle().statusColor;
    if (this.cycle().isPaid) {
      return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
    }
    switch (status) {
      case 'red':
        return 'bg-red-500/20 text-red-400 border-red-500/40 animate-pulse';
      case 'orange':
        return 'bg-orange-500/20 text-orange-400 border-orange-500/40';
      case 'yellow':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      default:
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
    }
  });

  triggerPayment() {
    this.state.openEmisPayment();
  }

  inspectInvoice() {
    this.state.inspectInvoice(this.invoice());
  }

  setDay(day: number) {
    this.state.setCycleDay(day);
  }

  stepForward() {
    this.state.advanceOneDay();
  }

  stepBack() {
    this.state.rewindOneDay();
  }

  resetDay() {
    this.state.resetToDayOne();
  }
}
