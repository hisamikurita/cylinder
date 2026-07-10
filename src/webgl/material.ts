import * as THREE from "three";
import {
	BACKGROUND_LIGHTS,
	EMISSIVE_PARAMS,
	PARALLAX,
	PLANE,
	VIGNETTE_PARAMS,
} from "./constants";
import fragmentShader from "./shaders/plane.frag?raw";
import vertexShader from "./shaders/plane.vert?raw";

export const createCoverMaterial = (
	texture: THREE.Texture,
	planeWidth: number,
	planeHeight: number,
): THREE.ShaderMaterial => {
	const material = new THREE.ShaderMaterial({
		uniforms: {
			uTexture: { value: texture },
			uTextureLoaded: { value: 0 },
			uPlaneSize: { value: new THREE.Vector2(planeWidth, planeHeight) },
			uImageSize: { value: new THREE.Vector2(1, 1) },
			uParallaxOffset: { value: 0 },
			uParallaxIntensity: { value: PARALLAX.INTENSITY },
			uTargetAspect: { value: 0 },
			uBorderWidth: { value: PLANE.DEPTH },
			uBorderColor: { value: new THREE.Color(PLANE.SIDE_COLOR) },
			uBrightness: { value: 1.0 },
			uTime: { value: 0 },
			uWaveStrength: { value: 0 },
			uWaveFrequency: { value: 0 },
			uWaveSpeed: { value: 0 },
			uWaveSeed: { value: 0 },
			// ホバー黒円: uHoverCircle = 円のサイズ (0=点, 1=最大)、
			// uHoverAlpha = 円の不透明度 & 頂点変位量 (0=非表示, 1=全表示)。
			// gsap で別々にトゥイーンして "サイズは残しつつ先にフェードアウト" などを作る
			uHoverCircle: { value: 0 },
			uHoverAlpha: { value: 0 },
			// Chromatic aberration + slice glitch の衝撃波半径 (0..1)。
			// hover-in 時に JS 側で 0→1 を 2 回繰り返して中央から放射状に発火させる
			uGlitchRadius: { value: 0 },
			// ホバー中に反射描画の brightness に足し込む加算値 (renderWithReflection 側で使用)
			uReflectionBoost: { value: 0 },
			// ホバー中に emissive に足し込む加算値 (updateParallax 側で加算)
			uEmissiveBoost: { value: 0 },
			uEmissive: { value: EMISSIVE_PARAMS.center },
			uVignetteStrength: { value: VIGNETTE_PARAMS.strength },
			uVignettePower: { value: VIGNETTE_PARAMS.power },
			uVignetteColor: { value: new THREE.Color(VIGNETTE_PARAMS.color) },
			// Spotlight（最初のライトを使用）
			uLightPos: {
				value: new THREE.Vector3(
					BACKGROUND_LIGHTS[0].pos3D.x,
					BACKGROUND_LIGHTS[0].pos3D.y,
					BACKGROUND_LIGHTS[0].pos3D.z,
				),
			},
			uLightDir: { value: new THREE.Vector3(0, 0, -1) }, // スポットライト方向
			uLightConeAngle: { value: BACKGROUND_LIGHTS[0].spotConeAngle },
			uLightColor: { value: new THREE.Color(BACKGROUND_LIGHTS[0].colorL) },
			uLightIntensity: { value: BACKGROUND_LIGHTS[0].intensity },
			uCameraPos: { value: new THREE.Vector3() },
			...THREE.UniformsLib.fog,
		},
		vertexShader,
		fragmentShader,
		side: THREE.DoubleSide,
		fog: true,
	});

	texture.colorSpace = THREE.SRGBColorSpace;
	// texture.image が既に存在し、寸法が確定している場合のみロード済み扱い。
	// VideoTexture では texture.image = video 要素で常に truthy だが、
	// metadata 前は width/height が 0 なのでここでは弾く (=下地 #000 のまま)
	if (
		texture.image &&
		(texture.image as HTMLImageElement).width > 0 &&
		(texture.image as HTMLImageElement).height > 0
	) {
		const img = texture.image as HTMLImageElement;
		material.uniforms.uImageSize.value.set(img.width, img.height);
		material.uniforms.uTextureLoaded.value = 1;
	}

	return material;
};

// テクスチャの実寸が判明したタイミングで呼ぶ。同時に uTextureLoaded を 1 にして
// シェーダ側の "未ロード時の下地 #000" 表示を解除する
export const updateCoverMaterialImageSize = (
	material: THREE.ShaderMaterial,
	width: number,
	height: number,
): void => {
	material.uniforms.uImageSize.value.set(width, height);
	material.uniforms.uTextureLoaded.value = 1;
};
