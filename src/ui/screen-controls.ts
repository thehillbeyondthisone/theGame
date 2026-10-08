import type { ScreenState } from '../app';
import type { PlayMode } from '../sim/run';

interface ScreenActions {
  reset: () => void;
  pause: () => void;
  depth: (direction: number) => void;
  replay: (mode: PlayMode) => void;
}

/** DOM controls stay outside the scene so they're readable on small screens. */
export class ScreenControls {
  private readonly root = this.element('screen-controls');
  private readonly progress = this.element('screen-progress');
  private readonly hint = this.element('screen-hint');
  private readonly pause = this.element<HTMLButtonElement>('screen-pause');
  private readonly reset = this.element<HTMLButtonElement>('screen-reset');
  private readonly mode = this.element<HTMLButtonElement>('screen-mode');
  private readonly score = this.element('screen-score');
  private readonly clock = this.element('screen-clock');
  private readonly clockLabel = this.element('screen-clock-label');
  private readonly best = this.element('screen-best');
  private readonly goal = this.element('screen-goal');
  private readonly streakPips = [...this.element('screen-streak').children];
  private readonly rewardText = this.element('screen-reward');
  private readonly results = this.element('screen-results');
  private readonly replay = this.element<HTMLButtonElement>('screen-replay');
  private readonly free = this.element<HTMLButtonElement>('screen-free');
  private rewardTimer: ReturnType<typeof setTimeout> | undefined;
  private playMode: PlayMode = 'sprint';
  private readonly depthButtons = [this.element<HTMLButtonElement>('screen-pull'), this.element<HTMLButtonElement>('screen-push')];
  private readonly held = new Map<number | string, number>();
  private direction = 0;
  private readonly touch = matchMedia('(any-pointer: coarse)').matches;

  constructor(private readonly actions: ScreenActions) {
    this.reset.addEventListener('click', () => {
      this.clearDepth();
      actions.reset();
    });
    this.pause.addEventListener('click', () => {
      this.clearDepth();
      actions.pause();
    });
    this.replay.addEventListener('click', () => this.restart('sprint'));
    this.free.addEventListener('click', () => this.restart('free'));
    this.mode.addEventListener('click', () => this.restart(this.playMode === 'sprint' ? 'free' : 'sprint'));
    this.results.addEventListener('keydown', (e) => {
      if (e.key !== 'Tab') return;
      e.preventDefault();
      (document.activeElement === this.replay ? this.free : this.replay).focus();
    });
    this.depthButtons.forEach((button, i) => {
      const direction = i === 0 ? -1 : 1;
      button.addEventListener('pointerdown', (e) => {
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        e.preventDefault();
        button.setPointerCapture(e.pointerId);
        this.held.set(e.pointerId, direction);
        this.syncDepth();
      });
      const release = (e: PointerEvent): void => {
        this.held.delete(e.pointerId);
        this.syncDepth();
      };
      button.addEventListener('pointerup', release);
      button.addEventListener('pointercancel', release);
      button.addEventListener('lostpointercapture', release);
      button.addEventListener('keydown', (e) => {
        if (e.key !== ' ' && e.key !== 'Enter') return;
        e.preventDefault();
        this.held.set(button.id, direction);
        this.syncDepth();
      });
      button.addEventListener('keyup', (e) => {
        if (e.key !== ' ' && e.key !== 'Enter') return;
        e.preventDefault();
        this.held.delete(button.id);
        this.syncDepth();
      });
      button.addEventListener('blur', () => {
        this.held.delete(button.id);
        this.syncDepth();
      });
    });
    // Flick throws have no depth to adjust.
    for (const button of this.depthButtons) button.hidden = this.touch;
    window.addEventListener('blur', this.clearDepth);
    window.addEventListener('resize', this.clearDepth);
    window.visualViewport?.addEventListener('resize', this.clearDepth);
    document.addEventListener('visibilitychange', this.clearDepth);
  }

  show(show: boolean): void {
    this.root.hidden = !show;
    if (!show) this.clearDepth();
  }

  update(state: ScreenState): void {
    const run = state.scoreRun;
    this.playMode = run.mode;
    this.text(this.score, state.scoreRun.score.toLocaleString());
    this.text(this.best, state.best.toLocaleString());
    this.text(this.clockLabel, run.mode === 'sprint' ? 'Time' : 'Flow');
    this.text(this.clock, run.mode === 'sprint' ? `${Math.ceil(run.remaining)}s` : `×${run.multiplier}`);
    this.clock.classList.toggle('time-low', run.mode === 'sprint' && run.remaining <= 10);
    this.text(this.progress, `Level ${state.level} / 10 · ${state.streak} clean`);
    this.text(this.goal, run.multiplier < 4
      ? `${run.multiplier * 3 - state.streak} clean ${run.multiplier * 3 - state.streak === 1 ? 'sink' : 'sinks'} → ×${run.multiplier + 1}`
      : '×4 · keep your flow');
    const lit = run.multiplier === 4 ? 3 : state.streak % 3;
    this.streakPips.forEach((pip, i) => pip.classList.toggle('lit', i < lit));
    this.text(this.pause, state.paused ? 'Resume' : 'Pause');
    const modeText = run.mode === 'sprint' ? 'Free play' : '60s run';
    this.text(this.mode, modeText);
    this.mode.setAttribute('aria-label', `Switch to ${modeText}`);
    const hint = state.paused ? 'Paused · tap Resume when you’re ready'
      : run.phase === 'ready' ? this.touch ? 'Flick the disc up into the cone · timer starts on touch' : 'Drag to start · wheel or Push / Pull for depth'
      : this.touch ? 'Flick the disc up to throw · flick harder to throw farther' : 'Drag to steer · wheel or Push / Pull for depth';
    this.text(this.hint, hint);
    if (state.paused || run.phase === 'finished') this.clearDepth();
    this.pause.disabled = run.phase !== 'playing';
    this.reset.disabled = run.phase !== 'playing';
    this.mode.disabled = run.phase === 'finished';
    for (const button of this.depthButtons) button.disabled = state.paused || run.phase !== 'playing';
    if (run.phase === 'finished' && this.results.hidden) {
      this.text(this.element('result-eyebrow'), state.newBest ? 'New personal best' : 'Run complete');
      this.element('result-eyebrow').classList.toggle('warm', state.newBest);
      this.text(this.element('result-title'), run.sinks === 0 ? 'Find your flow' : run.score >= 2500 ? 'In the zone' : run.score >= 1000 ? 'Flow found' : 'One more round?');
      this.text(this.element('result-score'), run.score.toLocaleString());
      this.text(this.element('result-detail'), `${run.sinks} sinks · ${run.perfects} perfect · best streak ${run.bestStreak}`);
      this.text(this.element('result-target'), run.sinks === 0 ? this.touch ? 'Flick the disc up toward the cone. A harder flick throws it farther.' : 'Drag the disc over the cone’s mouth, then push it in.'
        : state.newBest ? `Your new best: ${state.best.toLocaleString()}. Can you keep a longer streak?`
        : `Personal best ${state.best.toLocaleString()} · ${Math.max(100, state.best - run.score + 100).toLocaleString()} more points to beat it`);
      this.results.hidden = false;
      this.replay.focus({ preventScroll: true });
    } else if (run.phase !== 'finished') this.results.hidden = true;
  }

  reward(text: string, perfect: boolean): void {
    clearTimeout(this.rewardTimer);
    this.rewardText.textContent = text;
    this.rewardText.classList.toggle('perfect', perfect);
    this.rewardText.classList.remove('visible');
    // Restart a soft rise on each sink, including consecutive identical rewards.
    void this.rewardText.offsetWidth;
    this.rewardText.classList.add('visible');
    this.rewardTimer = setTimeout(() => this.rewardText.classList.remove('visible'), 1100);
  }

  private restart(mode: PlayMode): void {
    this.clearDepth();
    clearTimeout(this.rewardTimer);
    this.rewardText.classList.remove('visible');
    this.results.hidden = true;
    this.actions.replay(mode);
    (document.activeElement as HTMLElement | null)?.blur();
  }

  private text(element: HTMLElement, text: string): void {
    if (element.textContent !== text) element.textContent = text;
  }

  private readonly clearDepth = (): void => {
    const ids = [...this.held.keys()];
    this.held.clear();
    for (const button of this.depthButtons) {
      for (const id of ids) if (typeof id === 'number' && button.hasPointerCapture(id)) button.releasePointerCapture(id);
    }
    this.syncDepth();
  };

  private syncDepth(): void {
    const direction = Math.sign([...this.held.values()].reduce((sum, value) => sum + value, 0));
    if (direction === this.direction) return;
    this.direction = direction;
    this.actions.depth(direction);
    for (const button of this.depthButtons) {
      const active = (button.id === 'screen-pull' ? -1 : 1) === direction;
      button.classList.toggle('active', active);
    }
  }

  private element<T extends HTMLElement = HTMLElement>(id: string): T {
    const element = document.getElementById(id);
    if (!element) throw new Error(`Missing #${id}`);
    return element as T;
  }
}
