import { ChangeDetectionStrategy, Component, ViewChild, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { EnergyState } from './services/energy-state';
import { CycleDial } from './components/cycle-dial/cycle-dial';
import { WhatsAppSentinel } from './components/whatsapp-sentinel/whatsapp-sentinel';
import { AntiFiscalVault } from './components/anti-fiscal-vault/anti-fiscal-vault';
import { OcrScanner } from './components/ocr-scanner/ocr-scanner';
import { AiForecast } from './components/ai-forecast/ai-forecast';
import { EmisModal } from './components/emis-modal/emis-modal';
import { SettingsModal } from './components/settings-modal/settings-modal';

export type ActiveTab = 'overview' | 'whatsapp' | 'vault' | 'ocr' | 'forecast';

@Component({
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    MatIconModule,
    CycleDial,
    WhatsAppSentinel,
    AntiFiscalVault,
    OcrScanner,
    AiForecast,
    EmisModal,
    SettingsModal,
  ],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  readonly state = inject(EnergyState);

  @ViewChild('settingsModal') settingsModal?: SettingsModal;

  readonly activeTab = signal<ActiveTab>('overview');

  readonly cycle = this.state.cycleState;
  readonly settings = this.state.settings;
  readonly isWaConnected = this.state.isWhatsAppConnected;

  setActiveTab(tab: ActiveTab) {
    this.activeTab.set(tab);
  }

  openSettings() {
    this.settingsModal?.open();
  }

  triggerFastPayment() {
    this.state.openEmisPayment();
  }
}
