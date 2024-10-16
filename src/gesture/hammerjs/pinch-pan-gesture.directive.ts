import {
  Directive,
  ElementRef,
  EventEmitter,
  Inject,
  InjectionToken,
  OnInit,
  Output,
} from '@angular/core';
import { HammerGestureConfig } from '@angular/platform-browser';
import { HammerConfigService } from './hammer-config.service';

export const HAMMER_CONFIG_TOKEN = new InjectionToken<HammerGestureConfig>(
  'HAMMER_CONFIG_TOKEN'
);

@Directive({
  selector: '[appPinchPanGesture]',
})
export class PinchPanGestureDirective implements OnInit {
  private targetedElement: HTMLElement;
  private hammerManager: HammerManager;

  private isPinching = false;
  @Output() eventOutput = new EventEmitter<string>();

  private adjustDeltaX = 0;
  private adjustDeltaY = 0;
  private adjustScale = 1;
  private currentDeltaX = 0;
  private currentDeltaY = 0;
  private currentScale = 1;

  private readonly MIN_SCALE = 0.5;
  private readonly MAX_SCALE = 3.0;

  constructor(
    elementRef: ElementRef,
    @Inject(HAMMER_CONFIG_TOKEN)
    private hammerConfigService: HammerConfigService
  ) {
    if (elementRef.nativeElement as HTMLElement) {
      this.targetedElement = elementRef.nativeElement;

      this.hammerManager = new Hammer.Manager(
        this.targetedElement,
        this.hammerConfigService.overrides
      );
    } else {
      throw new Error('No HTML element found');
    }
  }

  public ngOnInit() {
    this.configureHammerManager();
    this.handleManualGestures();
    this.initializeAdjustValues();
    this.listenHammerCallbacks();
  }

  private handleManualGestures(): void {
    let startX = 0;
    let startY = 0;
    let initialLeft = 0;
    let initialTop = 0;

    this.targetedElement.addEventListener('touchstart', (event: TouchEvent) => {
      if (event.touches.length === 1) {
        const touch = event.touches[0];
        startX = touch.clientX;
        startY = touch.clientY;
        initialLeft = this.targetedElement.offsetLeft;
        initialTop = this.targetedElement.offsetTop;
      }
    });

    this.targetedElement.addEventListener('touchmove', (event: TouchEvent) => {
      if (event.touches.length === 1) {
        const touch = event.touches[0];
        const deltaX = touch.clientX - startX;
        const deltaY = touch.clientY - startY;
        this.currentDeltaX = this.adjustDeltaX + deltaX / this.currentScale;
        this.currentDeltaY = this.adjustDeltaY + deltaY / this.currentScale;
        this.applyTransform();
      }
    });

    this.targetedElement.addEventListener('touchend', (event) => {
      this.adjustDeltaX = this.currentDeltaX;
      this.adjustDeltaY = this.currentDeltaY;
    });
  }

  private configureHammerManager() {
    const pinch = new Hammer.Pinch(this.hammerConfigService.override.pinch);
    const pan = new Hammer.Pan(this.hammerConfigService.override.pan);
    pan.requireFailure(pinch);
    this.hammerManager.add([pinch, pan]);
  }

  private listenHammerCallbacks() {
    this.hammerManager.on('pinchmove', (event) => this.handlePinch(event));
    this.hammerManager.on('pinchend pinchcancel panend pancancel', () => {
      this.isPinching = false;
      this.adjustScale = this.currentScale;
      this.adjustDeltaX = this.currentDeltaX;
      this.adjustDeltaY = this.currentDeltaY;
    });
    this.hammerManager.on('panmove', (event) => {
      if (!this.isPinching) {
        this.handlePan(event);
      }
    });
  }

  private initializeAdjustValues() {
    const transformMatrix = this.getTransformMatrix();
    this.adjustScale = this.currentScale = transformMatrix.scale;
    this.adjustDeltaX = this.currentDeltaX = transformMatrix.translateX;
    this.adjustDeltaY = this.currentDeltaY = transformMatrix.translateY;
  }

  private getTransformMatrix(): {
    scale: number;
    translateX: number;
    translateY: number;
  } {
    const style = window.getComputedStyle(this.targetedElement);
    const transform = style.getPropertyValue('transform');

    if (transform && transform !== 'none') {
      const matrix = transform.match(/^matrix\((.+)\)$/);
      if (matrix) {
        const matrixValues = matrix[1].split(',').map(parseFloat);
        const scaleX = matrixValues[0];
        const scaleY = matrixValues[3];
        const translateX = matrixValues[4];
        const translateY = matrixValues[5];
        return {
          scale: Math.sqrt(scaleX * scaleX + scaleY * scaleY),
          translateX,
          translateY,
        };
      }
    }
    return { scale: 1, translateX: 0, translateY: 0 };
  }

  private handlePinch(event: HammerInput) {
    this.isPinching = true;
    const newScale = this.adjustScale * event.scale;
    this.currentScale = Math.max(
      this.MIN_SCALE,
      Math.min(this.MAX_SCALE, newScale)
    );
    this.currentDeltaX = this.adjustDeltaX + event.deltaX / this.currentScale;
    this.currentDeltaY = this.adjustDeltaY + event.deltaY / this.currentScale;
    this.applyTransform();
  }

  private handlePan(event: HammerInput) {
    this.currentDeltaX = this.adjustDeltaX + event.deltaX / this.currentScale;
    this.currentDeltaY = this.adjustDeltaY + event.deltaY / this.currentScale;
    this.applyTransform();
  }

  private applyTransform() {
    const transform = `scale(${this.currentScale}) translate(${this.currentDeltaX}px, ${this.currentDeltaY}px)`;
    this.targetedElement.style.transition = 'transform 0.0s ease-out';
    this.targetedElement.style.transform = transform;
  }
}
