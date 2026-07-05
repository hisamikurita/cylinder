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
	TILT_MIN: 0,
	TILT_MAX: 0.2,
	SWAY_X: 0.3, // 左右の揺れ幅
	OFFSET_Y: 0.4, // 上方向のオフセット
	OFFSET_Z: 0, // 奥行きオフセット（負の値でカメラから遠ざかる）
} as const;

export const PLANE = {
	WIDTH: 3.8,
	HEIGHT: 2.0,
	DEPTH: 0.035,
	SEGMENTS: 32,
	SIDE_COLOR: 0x0d0d0d,
} as const;

// Emissive (画像の発光)
export const EMISSIVE_PARAMS = {
	intensity: 0,
};

// Scene
export const SCENE = {
	BACKGROUND_COLOR: 0x000000,
} as const;

// Fog
export const FOG = {
	COLOR: 0x000000,
	NEAR: 3.5,
	FAR: 11.5,
} as const;

// Reflection
export const REFLECTION_PARAMS = {
	brightness: 0.22,
	blurRadius: 2,
	waveStrength: 0.07,
	waveFrequency: 4,
	waveSpeed: 0.6,
};

// Background side glows
// radiusX を狭く radiusY を大きくすると縦ストライプ、angle で傾けられる
export const BACKGROUND_LIGHT_PARAMS = {
	// 共通設定
	blurRadius: 8.3,
	// 3D位置モード共通設定
	use3D: true,
	clampToViewport: true,
	viewportPadding: 0.09,
	scaleByX: true,
	scaleMin: 0.1,
	scaleMax: 2.0,
};

// 3つのライト設定
export const BACKGROUND_LIGHTS = [
	{
		enabled: true,
		pos3D: { x: -5.4, y: 2.9, z: 7.5 },
		spotAngleX: -20,
		spotAngleY: -90,
		spotConeAngle: 44,
		posL: { x: 0.15, y: 0.7 },
		colorL: 0xfffafa,
		intensity: 0.85,
		radiusX: 0.8,
		radiusY: 0.25,
		falloff: 3.8,
		angleL: -50,
		biasL: 0.34,
		biasRangeL: 0.5,
		spreadL: 0.06,
	},
	{
		enabled: true,
		pos3D: { x: -7.0, y: 3.5, z: 6.5 },
		spotAngleX: -25,
		spotAngleY: -100,
		spotConeAngle: 40,
		posL: { x: 0.08, y: 0.75 },
		colorL: 0xfafaff,
		intensity: 0.6,
		radiusX: 0.6,
		radiusY: 0.2,
		falloff: 4.0,
		angleL: -55,
		biasL: 0.3,
		biasRangeL: 0.5,
		spreadL: 0.04,
	},
	{
		enabled: true,
		pos3D: { x: -8.5, y: 4.0, z: 5.5 },
		spotAngleX: -30,
		spotAngleY: -110,
		spotConeAngle: 35,
		posL: { x: 0.03, y: 0.8 },
		colorL: 0xf5f5ff,
		intensity: 0.4,
		radiusX: 0.4,
		radiusY: 0.15,
		falloff: 4.2,
		angleL: -60,
		biasL: 0.25,
		biasRangeL: 0.5,
		spreadL: 0.02,
	},
];

// Camera
export const CAMERA = {
	FOV: 75,
	NEAR: 0.1,
	FAR: 100,
	INITIAL_Y: 0,
	INITIAL_Z: 7.5,
} as const;
