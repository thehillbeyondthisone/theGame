import './enterprise-preview.css';
import type { Look } from '../view/stage';

/** An opt-in flat-screen backdrop, deliberately separate from the XR scene. */
export class EnterprisePreview {
  private readonly backdrop = document.createElement('div');
  private readonly toolbar = document.createElement('aside');
  private enabled = true;
  private calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
  private look: Look = 'desktop';
  private panel: HTMLElement;
  private toggle: HTMLButtonElement;
  private original: HTMLButtonElement;
  private lounge: HTMLButtonElement;
  private blur: HTMLInputElement;
  private blurValue: HTMLOutputElement;
  private calmInput: HTMLInputElement;
  private blurPips: Element[];
  private readonly reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  onSettings?: (enabled: boolean, calm: boolean) => void;

  constructor() {
    document.documentElement.dataset.preview = 'enterprise';
    this.backdrop.id = 'enterprise-backdrop';
    this.backdrop.setAttribute('aria-hidden', 'true');
    const asset = `${import.meta.env.BASE_URL}previews/enterprise/lounge.webp`;
    const portrait = `${import.meta.env.BASE_URL}previews/enterprise/lounge-portrait.webp`;
    const plate = (name: string, priority = '') => `<picture>
      <source media="(max-aspect-ratio: 3/4)" srcset="${portrait}" />
      <img class="${name}" src="${asset}" alt="" ${priority} />
    </picture>`;
    this.backdrop.innerHTML = `<div class="lounge-drift">
      ${plate('lounge-room', 'fetchpriority="high"')}
      ${plate('lounge-windows')}
      ${plate('lounge-near')}
    </div><div class="lounge-shade"></div>`;
    this.toolbar.id = 'enterprise-toolbar';
    this.toolbar.setAttribute('aria-label', 'Enterprise lounge preview');
    this.toolbar.innerHTML = `<div class="lounge-caption"><span class="lounge-dot" aria-hidden="true"></span>
      <span>Enterprise lounge <small>Visual preview</small></span></div>
      <button class="lounge-scene-button" type="button" aria-expanded="false" aria-controls="lounge-settings">Scene</button>
      <section id="lounge-settings" aria-label="Scene settings" hidden>
        <p class="lounge-settings-title">Your seat in Ten Forward</p>
        <p class="lounge-settings-copy">A quiet view. The game stays in focus.</p>
        <div class="lounge-comparison" role="group" aria-label="Compare visuals">
          <button id="lounge-original" type="button" aria-pressed="false">Original</button>
          <button id="lounge-on" type="button" aria-pressed="true">Lounge</button>
        </div>
        <label class="lounge-blur-label" for="lounge-blur">Background blur <output id="lounge-blur-value" for="lounge-blur">6</output></label>
        <div class="lounge-blur-control">
          <span class="pips" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i><i></i></span>
          <input id="lounge-blur" type="range" min="0" max="12" step="1" value="6" />
        </div>
        <div class="lounge-range-ends" aria-hidden="true"><span>Clear</span><span>Dreamy</span></div>
        <label class="lounge-calm"><input id="lounge-calm" type="checkbox" /> Calm visuals <span>Still background · fewer effects</span></label>
      </section>`;
    document.body.prepend(this.backdrop);
    document.body.append(this.toolbar);
    this.panel = this.element<HTMLElement>('#lounge-settings');
    this.toggle = this.element<HTMLButtonElement>('.lounge-scene-button');
    this.original = this.element<HTMLButtonElement>('#lounge-original');
    this.lounge = this.element<HTMLButtonElement>('#lounge-on');
    this.blur = this.element<HTMLInputElement>('#lounge-blur');
    this.blurValue = this.element<HTMLOutputElement>('#lounge-blur-value');
    this.calmInput = this.element<HTMLInputElement>('#lounge-calm');
    this.blurPips = [...this.element('.lounge-blur-control .pips').children];
    this.calmInput.checked = this.calm;
    this.toggle.addEventListener('click', () => this.showPanel(this.panel.hidden === true));
    this.original.addEventListener('click', () => this.select(false));
    this.lounge.addEventListener('click', () => this.select(true));
    this.blur.addEventListener('input', () => {
      this.blurValue.value = this.blur.value;
      this.backdrop.style.setProperty('--lounge-blur', `${this.blur.value}px`);
      this.syncBlurPips();
    });
    this.syncBlurPips();
    this.calmInput.addEventListener('change', () => {
      this.calm = this.calmInput.checked;
      this.sync();
    });
    // A system accessibility change always takes precedence over ambient motion.
    this.reducedMotion.addEventListener('change', () => {
      if (this.reducedMotion.matches) this.calm = this.calmInput.checked = true;
      this.sync();
    });
    document.addEventListener('pointerdown', (e) => {
      if (!this.panel.hidden && !this.toolbar.contains(e.target as Node)) this.showPanel(false);
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !this.panel.hidden) {
        this.showPanel(false);
        this.toggle.focus();
      }
    });
    this.sync();
  }

  setLook(look: Look): void {
    this.look = look;
    this.toolbar.hidden = look !== 'desktop';
    this.backdrop.hidden = look !== 'desktop' || !this.enabled;
    document.documentElement.dataset.lounge = String(this.enabled && look === 'desktop');
    if (look !== 'desktop') this.showPanel(false);
  }

  private select(enabled: boolean): void {
    this.enabled = enabled;
    this.sync();
  }

  private sync(): void {
    this.original.setAttribute('aria-pressed', String(!this.enabled));
    this.lounge.setAttribute('aria-pressed', String(this.enabled));
    this.backdrop.classList.toggle('lounge-calm-mode', this.calm);
    this.blur.disabled = !this.enabled;
    this.setLook(this.look);
    this.onSettings?.(this.enabled, this.calm || this.reducedMotion.matches);
  }

  /** Seven floor circles stand in for the 0–12 range; the nearest one carries the ring. */
  private syncBlurPips(): void {
    const at = Math.round(Number(this.blur.value) / 2);
    this.blurPips.forEach((pip, i) => {
      pip.classList.toggle('lit', i <= at);
      pip.classList.toggle('sel', i === at);
    });
  }

  private showPanel(show: boolean): void {
    this.panel.hidden = !show;
    this.toggle.setAttribute('aria-expanded', String(show));
  }

  private element<T extends HTMLElement>(selector: string): T {
    return this.toolbar.querySelector<T>(selector)!;
  }
}
