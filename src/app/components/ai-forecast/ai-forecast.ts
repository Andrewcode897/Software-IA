import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { EnergyState } from '../../services/energy-state';
import { KzPipe } from '../../pipes/kz.pipe';

@Component({
  selector: 'app-ai-forecast',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, MatIconModule, KzPipe],
  template: `
    <div class="rounded-3xl bg-stone-900/90 border border-stone-800 p-6 md:p-8 backdrop-blur-xl shadow-2xl space-y-6">
      <!-- Header -->
      <div class="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div class="flex items-center gap-2">
            <span class="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400">
              <mat-icon class="text-sm">auto_graph</mat-icon>
            </span>
            <span class="text-xs uppercase tracking-wider font-semibold text-indigo-400">Inteligência Preditiva Sazonal</span>
          </div>
          <h2 class="text-xl md:text-2xl font-bold text-stone-100 mt-1">Cérebro Preditivo de Energia (Angola)</h2>
        </div>

        <button
          (click)="recalculate()"
          class="px-3.5 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer border border-stone-700"
        >
          <mat-icon class="text-xs text-indigo-400">refresh</mat-icon>
          <span>Recalcular Previsão</span>
        </button>
      </div>

      <p class="text-xs text-stone-300 max-w-2xl leading-relaxed">
        Cruzamento de dados históricos com os ciclos climáticos de Angola (pico de calor e chuvas no Litoral vs época seca de Cacimbo) para antecipar a sua fatura antes mesmo de a ENDE fazer a leitura física.
      </p>

      <!-- Prediction Cards Grid -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <!-- Predicted Amount -->
        <div class="p-5 rounded-2xl bg-stone-950/80 border border-stone-800 space-y-2">
          <div class="flex items-center justify-between">
            <span class="text-xs text-stone-400 font-medium">Estimativa Próximo Mês</span>
            <span class="p-1 rounded-lg bg-indigo-500/20 text-indigo-300">
              <mat-icon class="text-sm">payments</mat-icon>
            </span>
          </div>
          <div class="text-3xl font-extrabold text-stone-100">
            {{ prediction().predictedAmountKz | kz }} <span class="text-emerald-400 text-base font-bold">Kz</span>
          </div>
          <p class="text-[11px] text-stone-400">
            Baseado na tarifa residencial ENDE e consumo de <strong class="text-stone-200">{{ prediction().predictedKWh }} kWh</strong>.
          </p>
        </div>

        <!-- Sazonal Factor -->
        <div class="p-5 rounded-2xl bg-stone-950/80 border border-stone-800 space-y-2">
          <div class="flex items-center justify-between">
            <span class="text-xs text-stone-400 font-medium">Fator Climático Sazonal</span>
            <span class="p-1 rounded-lg bg-amber-500/20 text-amber-300">
              <mat-icon class="text-sm">thermostat</mat-icon>
            </span>
          </div>
          <div class="text-3xl font-extrabold text-amber-400">
            +{{ (prediction().seasonalFactor - 1) * 100 | number:'1.0-0' }}%
          </div>
          <p class="text-[11px] text-stone-400 leading-snug">
            {{ prediction().seasonalReason }}
          </p>
        </div>

        <!-- Budget Shield -->
        <div class="p-5 rounded-2xl bg-stone-950/80 border border-stone-800 space-y-2">
          <div class="flex items-center justify-between">
            <span class="text-xs text-stone-400 font-medium">Teto Máximo Recomendado</span>
            <span class="p-1 rounded-lg bg-emerald-500/20 text-emerald-300">
              <mat-icon class="text-sm">shield</mat-icon>
            </span>
          </div>
          <div class="text-3xl font-extrabold text-stone-100">
            {{ prediction().recommendedBudgetLimitKz | kz }} <span class="text-xs font-bold text-stone-400">Kz</span>
          </div>
          <p class="text-[11px] text-stone-400">
            Margem prudente de segurança com 10% de folga orçamental.
          </p>
        </div>
      </div>

      <!-- Seasonal Trends in Angola Visual Chart -->
      <div class="p-5 rounded-2xl bg-stone-950/90 border border-stone-800 space-y-4">
        <h4 class="text-xs font-bold text-stone-300 uppercase tracking-wider flex items-center gap-2">
          <mat-icon class="text-sm text-amber-400">calendar_month</mat-icon>
          Padrão Anual de Faturação ENDE em Luanda
        </h4>

        <!-- Bar distribution of months -->
        <div class="grid grid-cols-6 sm:grid-cols-12 gap-2 pt-2">
          @for (m of monthsData; track m.name) {
            <div class="flex flex-col items-center gap-1.5">
              <span class="text-[10px] text-stone-400 font-mono">{{ m.val }}k</span>
              <div class="w-full bg-stone-800/80 rounded-lg h-24 flex items-end p-1 overflow-hidden">
                <div
                  class="w-full rounded-md transition-all duration-500"
                  [style.height.%]="(m.val / 22) * 100"
                  [class.bg-gradient-to-t]="true"
                  [class.from-amber-600]="m.season === 'hot'"
                  [class.to-red-500]="m.season === 'hot'"
                  [class.from-teal-600]="m.season === 'cacimbo'"
                  [class.to-emerald-400]="m.season === 'cacimbo'"
                  [class.from-stone-600]="m.season === 'normal'"
                  [class.to-stone-400]="m.season === 'normal'"
                ></div>
              </div>
              <span class="text-[11px] font-bold" [class.text-amber-400]="m.season === 'hot'" [class.text-teal-300]="m.season === 'cacimbo'" [class.text-stone-400]="m.season === 'normal'">
                {{ m.name }}
              </span>
            </div>
          }
        </div>

        <div class="flex flex-wrap items-center justify-center gap-4 pt-2 text-[11px] text-stone-400 border-t border-stone-800/80">
          <div class="flex items-center gap-1.5">
            <span class="w-2.5 h-2.5 rounded-full bg-red-500"></span>
            <span>Nov - Fev: Calor Intenso / Ar Condicionado (Pico)</span>
          </div>
          <div class="flex items-center gap-1.5">
            <span class="w-2.5 h-2.5 rounded-full bg-teal-400"></span>
            <span>Jun - Ago: Cacimbo Fresco (Poupança)</span>
          </div>
          <div class="flex items-center gap-1.5">
            <span class="w-2.5 h-2.5 rounded-full bg-stone-500"></span>
            <span>Meses Moderados</span>
          </div>
        </div>
      </div>

      <!-- AI Energy Advisory Recommendation -->
      <div class="p-4 rounded-2xl bg-indigo-950/20 border border-indigo-500/30 flex items-start gap-3">
        <span class="p-2 rounded-xl bg-indigo-500/20 text-indigo-400 shrink-0">
          <mat-icon>lightbulb</mat-icon>
        </span>
        <div class="space-y-1">
          <h5 class="text-xs font-bold text-indigo-300 uppercase tracking-wider">Recomendação Estratégica da IA</h5>
          <p class="text-xs text-stone-300 leading-relaxed">{{ prediction().aiAdvice }}</p>
        </div>
      </div>
    </div>
  `,
})
export class AiForecast {
  private readonly state = inject(EnergyState);

  readonly prediction = this.state.aiPrediction;

  readonly monthsData = [
    { name: 'Jan', val: 19, season: 'hot' },
    { name: 'Fev', val: 18, season: 'hot' },
    { name: 'Mar', val: 16, season: 'normal' },
    { name: 'Abr', val: 15, season: 'normal' },
    { name: 'Mai', val: 14, season: 'normal' },
    { name: 'Jun', val: 12, season: 'cacimbo' },
    { name: 'Jul', val: 11, season: 'cacimbo' },
    { name: 'Ago', val: 12, season: 'cacimbo' },
    { name: 'Set', val: 14, season: 'normal' },
    { name: 'Out', val: 16, season: 'normal' },
    { name: 'Nov', val: 18, season: 'hot' },
    { name: 'Dez', val: 20, season: 'hot' },
  ];

  recalculate() {
    this.state.refreshAIPrediction();
  }
}
