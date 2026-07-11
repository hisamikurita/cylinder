import { GALLERY, PLANE, ROTATION, setAutoRotationSpeed } from "../webgl";

// スマホ幅ではプレーンとギャラリー半径を縮小して狭いビューポートに収める
const MOBILE_BREAKPOINT = "(max-width: 768px)";
const MOBILE_SCALE = 0.75;
// 小さい画面でも動きを感じられるよう自動回転速度を上げる
const MOBILE_ROTATION_SPEED_MULTIPLIER = 1.3;
// プレーン縮小で円筒下端と床の隙間が広がるため、OFFSET_Y を下げて近づける
const MOBILE_OFFSET_Y = 0.15;

export const IS_MOBILE = window.matchMedia(MOBILE_BREAKPOINT).matches;

export const applyMobileAdjustments = (): void => {
	if (!IS_MOBILE) return;

	// PLANE / GALLERY は `as const` で readonly だが、runtime では書き換え可能。
	// interactions.ts / reflection.ts など runtime で参照する箇所も追従する
	const p = PLANE as unknown as { WIDTH: number; HEIGHT: number };
	p.WIDTH = PLANE.WIDTH * MOBILE_SCALE;
	p.HEIGHT = PLANE.HEIGHT * MOBILE_SCALE;
	const g = GALLERY as unknown as { RADIUS: number; OFFSET_Y: number };
	g.RADIUS = GALLERY.RADIUS * MOBILE_SCALE;
	g.OFFSET_Y = MOBILE_OFFSET_Y;

	setAutoRotationSpeed(ROTATION.AUTO_SPEED * MOBILE_ROTATION_SPEED_MULTIPLIER);
};
