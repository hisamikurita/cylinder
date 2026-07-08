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
	DEPTH: 0.038,
	SEGMENTS: 32,
	SIDE_COLOR: 0x0d0d0d,
} as const;

// Emissive (画像の発光)
// カメラに近い (真ん中) プレーンは center、後ろのプレーンは edge の emissive で線形補間
export const EMISSIVE_PARAMS = {
	center: 0.44, // カメラ側 (worldPos.z = +RADIUS)
	edge: -0.6, // 反対側 (worldPos.z = -RADIUS)
};

// Plane vignette (画像四隅を暗く落とす)
export const VIGNETTE_PARAMS = {
	strength: 0.28, // 端で色をどれだけ暗くするか (0=なし, 1=真っ黒)
	power: 1, // 減衰カーブの鋭さ (小さい=なめらか, 大きい=中心が広く端で急落)
	color: 0x000000,
};

// Scene
export const SCENE = {
	BACKGROUND_COLOR: 0x000000,
} as const;

// Fog
export const FOG = {
	COLOR: 0x0000,
	NEAR: 3.5,
	FAR: 11.5,
} as const;

// Reflection
export const REFLECTION_PARAMS = {
	brightness: 0.9,
	blurRadius: 2,
	waveStrength: 0.07,
	waveFrequency: 4,
	waveSpeed: 0.8,
};

// Floor surface (curve deformation + noise + fog)
export const FLOOR_PARAMS = {
	// 端の湾曲: uv 中心からの距離を power 乗して height 分下げる
	curvePower: 12,
	curveHeight: 8.9,
	// Perlin ノイズによる表面のムラ
	noiseScale: 6.3,
	noiseSpeed: 1.23,
	noiseStrength: 0.12,
	noiseColor: 0xffffff,
	// 距離減衰の霧（背景色に溶ける）
	fogNear: 18.5,
	fogFar: 15.7,
	fogStrength: 0.16,
};

// Volumetric spot light (円錐メッシュで光柱を可視化)
export const VOLUME_LIGHT_PARAMS = {
	enabled: true,
	showHelper: false, // SpotLightHelper (デバッグ用ワイヤーフレーム)
	distance: 20, // 円錐の長さ
	attenuation: 15, // 距離減衰の係数（大きいほど遠くまで届く）
	anglePower: 5, // 円錐側面の強調（大きいほど側面が薄く、中心が濃く）
	alpha: 0.4,
	wave: 6.0,
	speed: 0.4,
};

// ライト設定 (左と右の 2 灯)
export const BACKGROUND_LIGHTS = [
	{
		// 左から右に向けるメインライト
		enabled: true,
		pos3D: { x: -7, y: 4, z: 8.1 },
		spotAngleX: -37,
		spotAngleY: -90,
		spotConeAngle: 44,
		colorL: 0xadbae1,
		intensity: 0.45,
	},
	{
		// 右から左に向けるサブライト
		enabled: true,
		pos3D: { x: 9.7, y: 4.2, z: 7.5 },
		spotAngleX: -27,
		spotAngleY: 57,
		spotConeAngle: 41,
		colorL: 0xadbae1,
		intensity: 0.45,
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
