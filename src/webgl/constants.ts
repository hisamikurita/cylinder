import gsap from "gsap";
import { CustomEase } from "gsap/CustomEase";

gsap.registerPlugin(CustomEase);

// Animation
export const DURATION = {
	BASE: 1.0,
} as const;

export const EASING = {
	TRANSFORM: CustomEase.create("transform", "M0,0 C0.44,0.05 0.17,1 1,1"),
	MATERIAL: CustomEase.create("material", "M0,0 C0.26,0.16 0.1,1 1,1"),
} as const;

// Parallax
export const PARALLAX = {
	SCALE: 1.35,
} as const;

// Gallery Rotation
export const ROTATION = {
	AUTO_SPEED: -0.002,
	DAMPING: 0.95,
	DRAG_SENSITIVITY: 0.005,
	DRAG_THRESHOLD: 5,
} as const;

// Gallery Layout
export const GALLERY = {
	RADIUS: 4,
	IMAGE_COUNT: 6,
	TILT_MIN: 0.1,
	TILT_MAX: 0.2,
	SWAY_X: 0.3, // 左右の揺れ幅
	OFFSET_Y: 0.3, // 上方向のオフセット
} as const;

export const PLANE = {
	WIDTH: 3.8,
	HEIGHT: 2.0,
	DEPTH: 0.035,
	SEGMENTS: 32,
	SIDE_COLOR: 0x333333,
} as const;

// Camera
export const CAMERA = {
	FOV: 75,
	NEAR: 0.1,
	FAR: 100,
	INITIAL_Y: 0,
	INITIAL_Z: 7.5,
} as const;
