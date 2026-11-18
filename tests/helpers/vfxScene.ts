import type Phaser from 'phaser';
import { vi } from 'vitest';

export function createMockVfxScene() {
  const explodeMock = vi.fn();
  const reserveMock = vi.fn();
  const stopMock = vi.fn();
  const flashMock = vi.fn();
  const shakeMock = vi.fn();

  const createdTexts: Array<{
    x: number;
    y: number;
    text: string;
    alpha: number;
    active: boolean;
    visible: boolean;
    setText: (t: string) => unknown;
    setPosition: (x: number, y: number) => unknown;
    setAlpha: (a: number) => unknown;
    setActive: (a: boolean) => unknown;
    setVisible: (v: boolean) => unknown;
    setOrigin: () => unknown;
    setDepth: () => unknown;
  }> = [];

  const scene = {
    time: { now: 500 },
    add: {
      particles: vi.fn(() => ({
        setDepth: vi.fn().mockReturnThis(),
        reserve: reserveMock,
        explode: explodeMock,
        stop: stopMock,
      })),
      image: vi.fn(() => {
        const image = {width:256,y:0,
          setOrigin(){return image;},setDepth(){return image;},setActive(){return image;},setVisible(){return image;},
          setData(){return image;},setDisplaySize(){return image;},setTexture(){return image;},setPosition(){return image;},setAlpha(){return image;},setScale(){return image;}};
        return image;
      }),
      bitmapText: vi.fn((x: number, y: number, _font: string, initial: string) => {
        const obj = {
          x,
          y,
          text: initial,
          alpha: 1,
          active: true,
          visible: true,
          setText(t: string) {
            obj.text = t;
            return obj;
          },
          setPosition(nx: number, ny: number) {
            obj.x = nx;
            obj.y = ny;
            return obj;
          },
          setAlpha(a: number) {
            obj.alpha = a;
            return obj;
          },
          setActive(a: boolean) {
            obj.active = a;
            return obj;
          },
          setVisible(v: boolean) {
            obj.visible = v;
            return obj;
          },
          setData() { return obj; },
          setTint() { return obj; },
          setScale() { return obj; },
          setFontSize() { return obj; },
          setOrigin() {
            return obj;
          },
          setDepth() {
            return obj;
          },
        };
        createdTexts.push(obj);
        return obj;
      }),
    },
    cameras: {
      main: {
        flash: flashMock,
        shake: shakeMock,
      },
    },
  } as unknown as Phaser.Scene;

  return { scene, explodeMock, reserveMock, stopMock, flashMock, shakeMock, createdTexts };
}

