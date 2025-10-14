import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule, HttpErrorResponse, HttpHeaders, HttpResponse } from '@angular/common/http';
import { Subscription, firstValueFrom } from 'rxjs';
import { EventHistoryService } from '../../services/event-history.service';
import { CreditService } from '../../services/credit.service';
import { buildApiUrl } from '../../utils/api-url';

@Component({
  selector: 'app-demo',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './demo.component.html',
  styleUrl: './demo.component.css',
})
export class DemoComponent implements OnInit, OnDestroy {
  @Input() horizon = 96;
  @Output() horizonChange = new EventEmitter<number>();

  activeTab: 'dayahead' | 'intraday' = 'dayahead';
  model = 'Ensemble';
  frequency = '15-min';
  selectedState = '';
  isStateLocked = false;
  demandFileError = '';
  demandFileError1 = '';

  user: { id?: number; email: string; name?: string; credits?: number; enerCoins?: number } | null = null;
  availableCredits = 0;

  files: Record<string, string> = {};
  demandFile: File | null = null;
  actualFile: File | null = null;

  loading = false;
  message = '';
  csvText = '';
  csvUrl: string | null = null;
  csvPreview: string[][] = [];

  chart: {
    viewBox: string;
    width: number;
    height: number;
    yTicks: { y: number; label: string }[];
    xTicks: { x: number; label: string }[];
    gridY: number[];
    gridX: number[];
    series: { name: string; color: string; path: string }[];
    legend: { name: string; color: string }[];
  } | null = null;

  currentStep: 1 | 2 | 3 = 1;
  stepOneComplete = false;
  stepTwoComplete = false;
  templateLoading = false;
  templateMessage = '';
  templateDownloadUrl: string | null = null;
  uploadLoading = false;
  uploadMessage = '';

  private creditSub?: Subscription;
  private creditsLoadedForUser: number | null = null;

  constructor(private http: HttpClient, private history: EventHistoryService, private credits: CreditService) {}

  ngOnInit() {
    this.refreshUser();
    window.addEventListener('auth-changed', this.refreshUser);
    window.addEventListener('storage', this.refreshUser);

    this.creditSub = this.credits.credits$.subscribe((balance) => {
      if (typeof balance === 'number' && !Number.isNaN(balance)) {
        this.availableCredits = Math.max(0, Math.round(balance));
      } else {
        this.availableCredits = 0;
      }
      if (this.user && typeof balance === 'number' && !Number.isNaN(balance)) {
        this.user = { ...this.user, credits: balance, enerCoins: balance };
      }
    });
  }

  ngOnDestroy() {
    window.removeEventListener('auth-changed', this.refreshUser);
    window.removeEventListener('storage', this.refreshUser);
    this.creditSub?.unsubscribe();
    if (this.csvUrl) URL.revokeObjectURL(this.csvUrl);
    if (this.templateDownloadUrl) URL.revokeObjectURL(this.templateDownloadUrl);
  }

  refreshUser = () => {
    try {
      this.user = JSON.parse(localStorage.getItem('auth_user') || 'null');
    } catch {
      this.user = null;
    }

    const userState = typeof (this.user as any)?.state === 'string' ? (this.user as any).state.trim() : '';

    if (userState) {
      this.selectedState = userState;
      this.isStateLocked = true;
    } else {
      this.isStateLocked = false;
      this.selectedState = '';
    }

    this.stepOneComplete = false;
    this.stepTwoComplete = false;
    this.uploadMessage = '';
    this.demandFile = null;
    this.actualFile = null;
    this.demandFileError = '';
    this.demandFileError1 = '';
    this.files = {};
    this.currentStep = 1;

    const fallback = this.extractBalanceFrom(this.user);
    this.availableCredits = fallback ?? 0;

    const userId = Number((this.user as any)?.id);
    if (Number.isInteger(userId) && userId > 0) {
      this.loadDailyUploadRecord();
      this.ensureCreditsLoaded(userId);
    } else {
      this.creditsLoadedForUser = null;
      this.credits.clear();
    }
  };

  get requiredEnerCoins(): number {
    return this.activeTab === 'dayahead' ? 10 : 2;
  }

  get hasRequiredCredits(): boolean {
    return this.availableCredits >= this.requiredEnerCoins;
  }

  get dateDisplay(): string {
    const base = this.activeTab === 'dayahead' ? this.addDays(new Date(), 1) : new Date();
    return this.formatDate(base);
  }

  get isStepTwoLocked(): boolean {
    return !this.stepOneComplete;
  }

  get isStepThreeLocked(): boolean {
    return !this.stepTwoComplete;
  }

  goToStep(step: 1 | 2 | 3) {
    if (step === 2 && this.isStepTwoLocked) {
      return;
    }
    if (step === 3 && (this.isStepTwoLocked || this.isStepThreeLocked)) {
      return;
    }
    this.currentStep = step;
  }

  setActiveTab(mode: 'dayahead' | 'intraday') {
    if (this.activeTab === mode) {
      return;
    }
    this.activeTab = mode;
    this.message = '';
  }

  private addDays(d: Date, days: number): Date {
    const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    x.setDate(x.getDate() + days);
    return x;
  }

  private formatDate(d: Date): string {
    const y = d.getFullYear();
    const m = (d.getMonth() + 1).toString().padStart(2, '0');
    const day = d.getDate().toString().padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  onFileChange(ev: Event, key: string) {
    const input = ev.target as HTMLInputElement;
    const file = input.files?.[0] || null;
    const validExtensions = ['csv', 'xls', 'xlsx'];
    const fileName = file?.name.toLowerCase();
    const ext = fileName?.split('.').pop();
    if (key === 'demand') {
      if (!ext || !validExtensions.includes(ext)) {
        this.demandFileError = 'Invalid file format. Please upload CSV or Excel (.xls, .xlsx) file.';
        return;
      }
      this.demandFileError = '';
    }
    if (key === 'actual') {
      if (!ext || !validExtensions.includes(ext)) {
        this.demandFileError1 = 'Invalid file format. Please upload CSV or Excel (.xls, .xlsx) file.';
        return;
      }
      this.demandFileError1 = '';
    }
    if (fileName) {
      this.files[key] = fileName;
    } else {
      delete this.files[key];
    }
    if (key === 'demand') this.demandFile = file;
    if (key === 'actual') this.actualFile = file;
    if (key === 'demand') {
      this.stepTwoComplete = false;
      this.uploadMessage = '';
    } else if (key === 'actual') {
      this.message = '';
    }
  }

  async createTemplate() {
    if (!this.user) {
      this.templateMessage = 'Please login to create a template.';
      return;
    }
    if (!this.selectedState) {
      this.templateMessage = 'State information missing. Please update your profile.';
      return;
    }
    this.templateMessage = '';
    this.resetUploadState();
    if (this.templateDownloadUrl) {
      URL.revokeObjectURL(this.templateDownloadUrl);
      this.templateDownloadUrl = null;
    }
    this.templateLoading = true;

    const headers = this.buildAuthHeaders();
    if (!headers) {
      this.templateLoading = false;
      this.templateMessage = 'Session expired. Please log in again to create a template.';
      return;
    }

    try {
      const blob = await firstValueFrom(
        this.http.post(buildApiUrl('ml/create-template'),
          { state_name: this.selectedState },
          { headers, responseType: 'blob' as 'json' }
        )
      ) as Blob;
      this.templateDownloadUrl = URL.createObjectURL(blob);
      this.templateMessage = 'Template ready. Download and update it or if you already have then proceed to Step 2.';
      this.stepOneComplete = true;
      this.goToStep(2);
    } catch (err) {
      this.templateMessage = this.extractError(err) || 'Failed to create template.';
    } finally {
      this.templateLoading = false;
    }
  }

  downloadTemplate() {
    if (!this.templateDownloadUrl) return;
    const a = document.createElement('a');
    a.href = this.templateDownloadUrl;
    const stateSlug = (this.selectedState || 'template').toLowerCase().replace(/[^a-z0-9]+/g, '-');
    a.download = `enerbuff-${stateSlug}-template.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  downloadIntradaySample() {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const rows = ['timestamp,load'];
    for (let i = 0; i < 96; i++) {
      const slot = new Date(start.getTime() + i * 15 * 60 * 1000);
      rows.push(`${this.formatIntradaySampleTimestamp(slot)},`);
    }
    const sample = rows.join('\n');
    const blob = new Blob([sample], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'enerbuff-intraday-sample.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  private formatIntradaySampleTimestamp(date: Date): string {
    const dd = date.getDate().toString().padStart(2, '0');
    const mm = (date.getMonth() + 1).toString().padStart(2, '0');
    const yyyy = date.getFullYear();
    const hh = date.getHours().toString().padStart(2, '0');
    const min = date.getMinutes().toString().padStart(2, '0');
    return `${dd}-${mm}-${yyyy} ${hh}:${min}`;
  }

  useExistingTemplate() {
    this.stepOneComplete = true;
    this.templateMessage = 'Step 2 unlocked. Continue with your existing template.';
    this.resetUploadState();
    this.goToStep(2);
  }

  async uploadDailyData() {
    if (!this.user) {
      this.uploadMessage = 'Please login to upload data.';
      return;
    }
    if (this.isStepTwoLocked) {
      this.uploadMessage = 'Please complete Step 1 before uploading data.';
      this.goToStep(1);
      return;
    }
    if (!this.selectedState) {
      this.uploadMessage = 'State information missing. Please update your profile.';
      return;
    }
    if (!this.demandFile) {
      this.uploadMessage = 'Please select the demand history file.';
      return;
    }
    const userId = Number((this.user as any)?.id);
    if (!Number.isInteger(userId) || userId <= 0) {
      this.uploadMessage = 'Unable to verify user information. Please re-login.';
      return;
    }

    this.uploadMessage = '';
    this.uploadLoading = true;
    this.stepTwoComplete = false;

    const headers = this.buildAuthHeaders();
    if (!headers) {
      this.uploadLoading = false;
      this.uploadMessage = 'Session expired. Please log in again before uploading.';
      return;
    }

    try {
      const form = new FormData();
      form.append('userId', String(userId));
      form.append('file', this.demandFile, this.demandFile.name);
      await firstValueFrom(this.http.post(buildApiUrl('uploadcsv'), form, { headers }));
      this.persistDailyUploadRecord({ demandFileName: this.demandFile?.name });
      this.uploadMessage = 'Upload successful. Proceed to Step 3 to run your forecast.';
      this.stepTwoComplete = true;
      this.currentStep = 3;
      this.message = '';
    } catch (err) {
      this.uploadMessage = this.extractError(err) || 'Failed to upload file.';
      this.stepTwoComplete = false;
    } finally {
      this.uploadLoading = false;
    }
  }

  async runSynthetic() {
    if (!this.user) return;
    if (this.isStepTwoLocked) {
      this.message = 'Please complete Step 1 before running the forecast.';
      return;
    }
    if (this.isStepThreeLocked) {
      this.message = 'Please complete Step 2 before running the forecast.';
      this.goToStep(2);
      return;
    }
    if (!this.selectedState) {
      this.message = 'State information missing. Please update your profile.';
      return;
    }
    this.message = '';
    this.csvText = '';
    this.csvPreview = [];
    if (this.csvUrl) {
      URL.revokeObjectURL(this.csvUrl);
      this.csvUrl = null;
    }

    if (!this.demandFile) {
      this.message = 'Please select the Demand history CSV.';
      return;
    }
    if (this.activeTab === 'intraday' && !this.actualFile) {
      this.message = "Please upload today's actual partials data.";
      return;
    }

    const requiredCredits = this.requiredEnerCoins;
    const userId = Number((this.user as any)?.id);
    if (!Number.isInteger(userId) || userId <= 0) {
      this.message = 'Unable to verify your EnerCoin balance. Please re-login.';
      return;
    }

    if (this.availableCredits < requiredCredits) {
      this.message = `Insufficient EnerCoin. You need ${requiredCredits} EnerCoin for this run.`;
      return;
    }

    const form = new FormData();
    if (this.demandFile) form.append('DATA_LOAD_CSV', this.demandFile, this.demandFile.name);
    if (this.activeTab === 'intraday' && this.actualFile) {
      form.append('actual_partial_data', this.actualFile, this.actualFile.name);
    }
    if (this.selectedState) {
      form.append('state_name', this.selectedState);
    }
    form.append('user_date', this.dateDisplay);

    const headers = this.buildAuthHeaders();
    if (!headers) {
      this.message = 'Session expired. Please log in again to run the forecast.';
      return;
    }

    this.loading = true;
    try {
      const endpoint = buildApiUrl(
        this.activeTab === 'intraday' ? 'ml/upload/intraday' : 'ml/upload'
      );

      const response = (await firstValueFrom(
        this.http.post(endpoint, form, {
          responseType: 'blob',
          observe: 'response',
          headers,
        })
      )) as HttpResponse<Blob>;

      const blob = response.body ?? new Blob();
      const text = await blob.text();
      let csv = '';
      try {
        const data = JSON.parse(text);
        csv = this.jsonToCsv(data);
      } catch {
        csv = text;
      }
      this.csvText = csv;
      this.csvUrl = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
      this.csvPreview = this.buildPreview(csv);
      this.chart = this.buildChart(csv);
      const deduction = requiredCredits;
      let enerCoinsUsed = 0;
      if (response.status === 200) {
        const deducted = await this.applyCreditDeduction(deduction);
        if (deducted) {
          enerCoinsUsed = deduction;
        }
      }
      void this.history.logEvent(
        'Synthetic Forecast Generated',
        this.activeTab === 'dayahead' ? 'Day-Ahead' : 'Intra-day',
        this.user || undefined,
        enerCoinsUsed,
      );
    } catch (err) {
      this.message = this.extractError(err) || 'Failed to run synthetic forecast.';
    } finally {
      this.loading = false;
    }
  }

  downloadCsv() {
    if (!this.csvUrl) return;
    const a = document.createElement('a');
    a.href = this.csvUrl;
    const base = this.activeTab === 'dayahead' ? 'dayahead' : 'intraday';
    a.download = `synthetic-${base}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  private async applyCreditDeduction(amount: number): Promise<boolean> {
    if (!this.user || amount <= 0) return false;
    const userId = Number((this.user as any).id);
    if (!Number.isInteger(userId) || userId <= 0) return false;

    try {
      const latest = await this.credits.adjust(userId, -amount);
      this.user = { ...this.user, credits: latest, enerCoins: latest };
      this.availableCredits = latest;
      const stored = localStorage.getItem('auth_user');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          parsed.credits = latest;
          parsed.enerCoins = latest;
          localStorage.setItem('auth_user', JSON.stringify(parsed));
        } catch {}
      }
      return true;
    } catch (err) {
      console.error('Failed to update credits after synthetic run', err);
      this.message = this.extractError(err) || 'Failed to update EnerCoin balance. Please refresh and try again.';
      return false;
    }
  }

  private extractBalanceFrom(value: any): number | null {
    if (!value) return null;
    const candidates = [value.enerCoins, value.credits];
    for (const candidate of candidates) {
      if (typeof candidate === 'number' && Number.isFinite(candidate) && candidate >= 0) {
        return Math.round(candidate);
      }
    }
    return null;
  }

  private extractError(err: any): string {
    if (!err) return '';
    if (err instanceof HttpErrorResponse) {
      const body: any = err.error;
      try {
        if (body instanceof Blob) {
          return '';
        }
      } catch {
        return err.message || '';
      }
      return (
        (typeof body === 'string' && body) ||
        body?.message ||
        body?.error ||
        err.message ||
        ''
      );
    }
    try {
      return err?.message || '';
    } catch {
      return '';
    }
  }

  private jsonToCsv(input: any): string {
    const rows: any[] = Array.isArray(input)
      ? input
      : Array.isArray(input?.data)
        ? input.data
        : [];
    if (!rows.length) return '';
    const headers = Array.from(
      rows.reduce((set, row) => {
        Object.keys(row || {}).forEach((key) => set.add(key));
        return set;
      }, new Set<string>())
    );
    const escape = (value: any) => {
      if (value === null || value === undefined) return '';
      const str = String(value);
      if (/[",]/.test(str)) return '"' + str.replace(/"/g, '""') + '"';
      return str;
    };
    const lines = [headers.join(',')].concat(
      rows.map((row) => headers.map((header) => escape(row?.['header'])).join(','))
    );
    return lines.join('');
  }

  private ensureCreditsLoaded(userId: number) {
    if (this.creditsLoadedForUser === userId) {
      return;
    }
    this.creditsLoadedForUser = userId;
    this.credits.refresh(userId).catch(() => {
      this.creditsLoadedForUser = null;
    });
  }

  private getCurrentUserId(): number | null {
    const id = Number((this.user as any)?.id);
    return Number.isInteger(id) && id > 0 ? id : null;
  }

  private getUploadStorageKeyFor(userId: number): string {
    return `demo_upload_${userId}_${this.formatDate(new Date())}`;
  }

  private persistDailyUploadRecord(record: { demandFileName?: string; actualFileName?: string }) {
    const userId = this.getCurrentUserId();
    if (userId === null) {
      return;
    }
    const key = this.getUploadStorageKeyFor(userId);
    localStorage.setItem(key, JSON.stringify({ ...record, savedAt: new Date().toISOString() }));
  }

  private loadDailyUploadRecord() {
    const userId = this.getCurrentUserId();
    if (userId === null) {
      this.stepTwoComplete = false;
      return;
    }
    const key = this.getUploadStorageKeyFor(userId);
    const raw = localStorage.getItem(key);
    if (!raw) {
      this.stepTwoComplete = false;
      return;
    }
    try {
      const parsed = JSON.parse(raw);
      this.stepTwoComplete = true;
      if (!this.stepOneComplete) {
        this.stepOneComplete = true;
      }
      if (typeof parsed?.demandFileName === 'string') {
        this.files['demand'] = parsed.demandFileName;
      }
      if (typeof parsed?.actualFileName === 'string') {
        this.files['actual'] = parsed.actualFileName;
      }
      if (this.currentStep < 3) {
        this.currentStep = 3;
      }
    } catch {
      localStorage.removeItem(key);
      this.stepTwoComplete = false;
    }
  }

  private clearDailyUploadRecord() {
    const userId = this.getCurrentUserId();
    if (userId === null) {
      return;
    }
    const key = this.getUploadStorageKeyFor(userId);
    localStorage.removeItem(key);
  }

  private resetUploadState(clearFiles = true) {
    this.stepTwoComplete = false;
    this.uploadMessage = '';
    if (clearFiles) {
      this.demandFile = null;
      this.actualFile = null;
      this.files = {};
      this.clearDailyUploadRecord();
    }
    this.demandFileError = '';
    this.demandFileError1 = '';
  }

  private buildPreview(csv: string, maxRows = 10): string[][] {
    if (!csv) return [];
    const lines = csv.split(/\r?\n/).filter((line) => line.trim().length > 0);
    return lines.slice(0, maxRows).map((line) => this.parseCsvLine(line));
  }

  private parseCsvLine(line: string): string[] {
    const out: string[] = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQuotes) {
        if (ch === '"' && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else if (ch === '"') {
          inQuotes = false;
        } else {
          cur += ch;
        }
      } else {
        if (ch === '"') {
          inQuotes = true;
        } else if (ch === ',') {
          out.push(cur);
          cur = '';
        } else {
          cur += ch;
        }
      }
    }
    out.push(cur);
    return out;
  }

  private buildChart(csv: string) {
    const lines = csv.split(/\r?\n/).filter((line) => line.trim().length > 0);
    if (!lines.length) return null;
    const headers = this.parseCsvLine(lines[0]);
    const rows = lines.slice(1).map((line) => this.parseCsvLine(line));
    if (!rows.length) return null;

    const parseTime = (value: string) => {
      const t = Date.parse(value);
      return isNaN(t) ? NaN : t;
    };
    const firstXTry = parseTime(rows[0][0] || '');
    const xIsTime = !isNaN(firstXTry);
    const xs: number[] = rows.map((row, index) => (xIsTime ? parseTime(row[0] || '') : index));

    const knownPairs = [['actual', 'prediction'], ['y', 'yhat'], ['actual', 'forecast']];
    const lower = headers.map((h) => (h || '').toLowerCase());
    let yIndices: number[] = [];
    for (const [a, b] of knownPairs) {
      const ia = lower.indexOf(a);
      const ib = lower.indexOf(b);
      if (ia >= 0 && ib >= 0) {
        yIndices = [ia, ib];
        break;
      }
    }
    if (!yIndices.length) {
      for (let i = 1; i < headers.length && yIndices.length < 2; i++) {
        const v = parseFloat(rows[0][i]);
        if (!isNaN(v)) yIndices.push(i);
      }
      if (!yIndices.length && headers.length > 1) yIndices = [1];
    }

    const seriesVals = yIndices.map((idx, si) => ({
      name: headers[idx] || `Series ${si + 1}`,
      values: rows.map((row) => parseFloat(row[idx])),
      color: si === 0 ? '#ffffff' : '#00e5ff',
    }));
    const filtered = seriesVals.filter((series) => series.values.some((v) => !isNaN(v)));
    if (!filtered.length) return null;

    const xValid = xs.filter((v) => !isNaN(v));
    const xMin = Math.min(...xValid);
    const xMax = Math.max(...xValid);
    const yVals = filtered.flatMap((series) => series.values.filter((v) => !isNaN(v)));
    const yMin = Math.min(...yVals);
    const yMax = Math.max(...yVals);
    if (!isFinite(xMin) || !isFinite(xMax) || !isFinite(yMin) || !isFinite(yMax)) return null;

    const width = 900;
    const height = 360;
    const m = { l: 60, r: 20, t: 20, b: 50 } as const;
    const plotW = width - m.l - m.r;
    const plotH = height - m.t - m.b;
    const sx = (x: number) => m.l + (plotW * (x - xMin)) / (xMax - xMin || 1);
    const sy = (y: number) => m.t + plotH - (plotH * (y - yMin)) / (yMax - yMin || 1);

    const series = filtered.map((s) => {
      let d = '';
      rows.forEach((row, i) => {
        const xv = xs[i];
        const yv = s.values[i];
        if (isNaN(xv) || isNaN(yv)) return;
        d += (d ? 'L' : 'M') + sx(xv) + ',' + sy(yv);
      });
      return { name: s.name, color: s.color, path: d };
    });

    const yTicks: { y: number; label: string }[] = [];
    const yTickCount = 5;
    for (let i = 0; i <= yTickCount; i++) {
      const v = yMin + ((yMax - yMin) * i) / yTickCount;
      yTicks.push({ y: sy(v), label: v.toFixed(0) });
    }
    const xTicks: { x: number; label: string }[] = [];
    const xTickCount = 6;
    for (let i = 0; i <= xTickCount; i++) {
      const v = xMin + ((xMax - xMin) * i) / xTickCount;
      const label = xIsTime ? new Date(v).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : String(Math.round(v));
      xTicks.push({ x: sx(v), label });
    }

    const gridY = yTicks.map((tick) => tick.y);
    const gridX = xTicks.map((tick) => tick.x);
    const legend = series.map((s) => ({ name: s.name, color: s.color }));

    return { viewBox: `0 0 ${width} ${height}`, width, height, yTicks, xTicks, gridY, gridX, series, legend };
  }

  private buildAuthHeaders(): HttpHeaders | null {
    try {
      const token = localStorage.getItem('auth_token');
      if (token && token.trim().length > 0) {
        return new HttpHeaders({
          Authorization: `Bearer ${token.trim()}`,
        });
      }
    } catch {
      // Ignore storage errors and fall through
    }
    return null;
  }
}
