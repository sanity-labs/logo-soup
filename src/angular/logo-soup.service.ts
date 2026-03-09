import {
  Injectable,
  signal,
  inject,
  DestroyRef,
} from "@angular/core";
import { createLogoSoup as createEngine } from "../core/create-logo-soup";
import type { ProcessOptions, LogoSoupState } from "../core/types";

const IDLE_STATE: LogoSoupState = {
  status: "idle",
  normalizedLogos: [],
  error: null,
};

@Injectable()
export class LogoSoupService {
  private engine = createEngine();
  private destroyRef = inject(DestroyRef);

  private readonly _state = signal<LogoSoupState>(IDLE_STATE);
  readonly state = this._state.asReadonly();

  constructor() {
    const unsubscribe = this.engine.subscribe(() => {
      this._state.set(this.engine.getSnapshot());
    });

    this.destroyRef.onDestroy(() => {
      unsubscribe();
      this.engine.destroy();
    });
  }

  process(options: ProcessOptions): void {
    this.engine.process(options);
  }
}
