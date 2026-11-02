import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { EnergyState } from '../../services/energy-state';
import { KzPipe } from '../../pipes/kz.pipe';

@Component({
  selector: 'app-ocr-scanner',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, MatIconModule, KzPipe],
  template: `
    <div class="rounded-3xl bg-stone-900/90 border border-stone-800 p-6 md:p-8 backdrop-blur-xl shadow-2xl space-y-6">
      <!-- Header -->
      <div class="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div class="flex items-center gap-2">
            <span class="p-1.5 rounded-lg bg-teal-500/10 text-teal-400">
              <mat-icon class="text-sm">document_scanner</mat-icon>
            </span>
            <span class="text-xs uppercase tracking-wider font-semibold text-teal-400">Motor de Visão Computacional Gemini AI</span>
          </div>
          <h2 class="text-xl md:text-2xl font-bold text-stone-100 mt-1">OCR Inteligente de Faturas ENDE</h2>
        </div>

        <!-- Sample bill buttons -->
        <div class="flex flex-wrap items-center gap-2">
          <span class="text-xs text-stone-400 font-medium">Carregar Amostra:</span>
          <button
            (click)="loadSample('talatona')"
            class="px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer border border-stone-700"
          >
            <mat-icon class="text-xs text-amber-400">location_on</mat-icon>
            <span>Fatura Talatona</span>
          </button>
          <button
            (click)="loadSample('maianga')"
            class="px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer border border-stone-700"
          >
            <mat-icon class="text-xs text-teal-400">location_on</mat-icon>
            <span>Fatura Maianga</span>
          </button>
        </div>
      </div>

      <p class="text-xs text-stone-300 max-w-2xl leading-relaxed">
        Carregue uma fotografia nítida da sua fatura física de papel da ENDE ou documento digital. A IA extrai instantaneamente o Nº de Cliente, Leituras do Contador, kWh e Montante em Kwanzas, sincronizando com o cronómetro do ciclo.
      </p>

      <!-- Upload Zone / Drop Area -->
      <div
        class="border-2 border-dashed rounded-3xl p-8 text-center transition-all cursor-pointer relative overflow-hidden"
        [class.border-teal-500/60]="isDragging()"
        [class.bg-teal-500/5]="isDragging()"
        [class.border-stone-700]="!isDragging()"
        [class.bg-stone-950/40]="!isDragging()"
        (dragover)="onDragOver($event)"
        (dragleave)="onDragLeave($event)"
        (drop)="onDrop($event)"
      >
        <input
          #fileInput
          type="file"
          accept="image/*,application/pdf"
          class="hidden"
          (change)="onFileSelected($event)"
        />

        @if (isProcessing()) {
          <!-- Processing State -->
          <div class="py-8 flex flex-col items-center justify-center space-y-4">
            <div class="relative w-16 h-16 flex items-center justify-center">
              <mat-icon class="text-4xl text-teal-400 animate-spin">autorenew</mat-icon>
              <div class="absolute inset-0 rounded-full border-2 border-teal-500/20 border-t-teal-400 animate-spin"></div>
            </div>
            <div class="space-y-1">
              <h4 class="text-sm font-bold text-teal-300">A processar fatura com Visão IA...</h4>
              <p class="text-xs text-stone-400">Identificando cliente, kWh, tarifas e referência Multicaixa</p>
            </div>
          </div>
        } @else {
          <!-- Normal Drop State -->
          <div
            class="py-6 flex flex-col items-center justify-center space-y-3 cursor-pointer"
            (click)="fileInput.click()"
            (keydown.enter)="fileInput.click()"
            tabindex="0"
            role="button"
          >
            <div class="w-16 h-16 rounded-2xl bg-stone-800 text-teal-400 flex items-center justify-center shadow-inner">
              <mat-icon class="text-3xl">cloud_upload</mat-icon>
            </div>
            <div>
              <p class="text-sm font-bold text-stone-200">Arraste a foto da fatura ou clique para escolher</p>
              <p class="text-xs text-stone-400 mt-1">Formatos suportados: JPG, PNG, PDF da fatura ENDE (até 15MB)</p>
            </div>
            <button
              type="button"
              class="mt-2 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold transition-all shadow-md shadow-teal-950 flex items-center gap-1.5 cursor-pointer"
            >
              <mat-icon class="text-sm">photo_camera</mat-icon>
              <span>Digitalizar Fatura</span>
            </button>
          </div>
        }
      </div>

      <!-- Live Active Invoice Card resulting from OCR -->
      <div class="p-5 rounded-2xl bg-stone-950/80 border border-stone-800 space-y-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <mat-icon class="text-teal-400 text-sm">check_circle</mat-icon>
            <span class="text-xs font-bold text-stone-200">Dados Atuais Vinculados ao Ciclo</span>
          </div>
          <span class="text-[11px] font-mono text-teal-400 bg-teal-950/40 px-2.5 py-0.5 rounded-full border border-teal-800/40">
            {{ activeInvoice().notes || 'Sincronizado' }}
          </span>
        </div>

        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div class="p-3 rounded-xl bg-stone-900 border border-stone-800">
            <span class="text-stone-400 block text-[11px]">Nº de Cliente ENDE</span>
            <strong class="text-stone-100 font-mono text-sm block mt-0.5">{{ activeInvoice().clientNumber }}</strong>
          </div>
          <div class="p-3 rounded-xl bg-stone-900 border border-stone-800">
            <span class="text-stone-400 block text-[11px]">Nº do Contador</span>
            <strong class="text-stone-100 font-mono text-sm block mt-0.5">{{ activeInvoice().meterNumber }}</strong>
          </div>
          <div class="p-3 rounded-xl bg-stone-900 border border-stone-800">
            <span class="text-stone-400 block text-[11px]">Consumo Total</span>
            <strong class="text-stone-100 font-bold text-sm block mt-0.5">{{ activeInvoice().consumptionKWh }} kWh</strong>
          </div>
          <div class="p-3 rounded-xl bg-stone-900 border border-stone-800">
            <span class="text-stone-400 block text-[11px]">Montante em Kwanzas</span>
            <strong class="text-emerald-400 font-bold text-sm block mt-0.5">{{ activeInvoice().amountKz | kz }} Kz</strong>
          </div>
        </div>

        <div class="flex flex-wrap items-center justify-between gap-3 pt-2 text-xs border-t border-stone-800/80">
          <div class="flex items-center gap-2 text-stone-400">
            <mat-icon class="text-sm text-stone-500">pin</mat-icon>
            <span>RUPE: <strong class="text-stone-200 font-mono">{{ activeInvoice().rupe }}</strong></span>
            <span>• Ref: <strong class="text-stone-200 font-mono">{{ activeInvoice().reference }}</strong></span>
          </div>

          <button
            (click)="triggerPayment()"
            class="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-all flex items-center gap-1.5 shadow-md shadow-emerald-950 cursor-pointer"
          >
            <mat-icon class="text-sm">bolt</mat-icon>
            <span>Liquidar Esta Fatura via MCX</span>
          </button>
        </div>
      </div>
    </div>
  `,
})
export class OcrScanner {
  private readonly state = inject(EnergyState);

  readonly activeInvoice = this.state.currentInvoice;
  readonly isDragging = signal<boolean>(false);
  readonly isProcessing = signal<boolean>(false);

  onDragOver(event: DragEvent) {
    event.preventDefault();
    this.isDragging.set(true);
  }

  onDragLeave(event: DragEvent) {
    event.preventDefault();
    this.isDragging.set(false);
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    this.isDragging.set(false);
    if (event.dataTransfer && event.dataTransfer.files.length > 0) {
      this.handleFile(event.dataTransfer.files[0]);
    }
  }

  onFileSelected(event: Event) {
    const target = event.target as HTMLInputElement;
    if (target.files && target.files.length > 0) {
      this.handleFile(target.files[0]);
    }
  }

  private handleFile(file: File) {
    this.isProcessing.set(true);
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      this.state.processInvoiceOcr(base64, file.type, () => {
        this.isProcessing.set(false);
      });
    };
    reader.readAsDataURL(file);
  }

  loadSample(type: 'talatona' | 'maianga') {
    this.isProcessing.set(true);
    setTimeout(() => {
      this.state.loadSampleInvoice(type);
      this.isProcessing.set(false);
    }, 500);
  }

  triggerPayment() {
    this.state.openEmisPayment();
  }
}
