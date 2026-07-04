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
	brightness: 0.40,
	blurRadius: 2.0,
	waveStrength: 0.070,
	waveFrequency: 4.0,
	waveSpeed: 0.6,
};

// Background side glows (screen-space)
// radiusX を狭く radiusY を大きくすると縦ストライプ、angle で傾けられる
export const BACKGROUND_LIGHT_PARAMS = {
	posL: { x: 0.19, y: 0.84 },
	colorL: 0x969bc0,
	intensity: 0.55,
	radiusX: 0.42,
	radiusY: 1.4,
	falloff: 2.2,
	angleL: 46, // 角度（度、時計回り正）
	// 左右方向の濃淡バイアス（回転後ローカル空間）: +1 = 右側が濃く左側が薄い、-1 = 逆、0 = 対称
	biasL: 0.8,
	// 縦方向の広がり: +1 = 右にいくほど広がる、-1 = 左にいくほど広がる、0 = 均一
	spreadL: 0.7,
	// ライト全体にかけるブラー（ピクセル単位、0=なし）
	blurRadius: 6.0,
};

// Spot Light (Blinn-Phong on plane material)
export const LIGHT_PARAMS = {
	pos1: { x: -8, y: 4, z: 11.1 },
	pos2: { x: 8, y: 4, z: 2 },
	color: 0xfcfcfc,
	specularStrength: 3.0,
	shininess: 8,
	ambient: 0.32, // 非照射面の下地明度
	attenuation: 0.04, // 距離減衰の強さ（大きいほどライトが早く暗くなる）
};

// Camera
export const CAMERA = {
	FOV: 75,
	NEAR: 0.1,
	FAR: 100,
	INITIAL_Y: 0,
	INITIAL_Z: 7.5,
} as const;
