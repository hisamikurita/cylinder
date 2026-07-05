import * as THREE from "three";
import { BACKGROUND_LIGHTS, EMISSIVE_PARAMS, PARALLAX, PLANE } from "./constants";
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
			uPlaneSize: { value: new THREE.Vector2(planeWidth, planeHeight) },
			uImageSize: { value: new THREE.Vector2(1, 1) },
			uParallaxOffset: { value: 0 },
			uParallaxScale: { value: PARALLAX.SCALE },
			uBorderWidth: { value: PLANE.DEPTH },
			uBorderColor: { value: new THREE.Color(PLANE.SIDE_COLOR) },
			uBrightness: { value: 1.0 },
			uTime: { value: 0 },
			uWaveStrength: { value: 0 },
			uWaveFrequency: { value: 0 },
			uWaveSpeed: { value: 0 },
			uWaveSeed: { value: 0 },
			uEmissive: { value: EMISSIVE_PARAMS.intensity },
			// Spotlight（最初のライトを使用）
			uLightPos: { value: new THREE.Vector3(
				BACKGROUND_LIGHTS[0].pos3D.x,
				BACKGROUND_LIGHTS[0].pos3D.y,
				BACKGROUND_LIGHTS[0].pos3D.z,
			) },
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
	if (texture.image) {
		const img = texture.image as HTMLImageElement;
		material.uniforms.uImageSize.value.set(img.width, img.height);
	}

	return material;
};

export const updateCoverMaterialImageSize = (
	material: THREE.ShaderMaterial,
	width: number,
	height: number,
): void => {
	material.uniforms.uImageSize.value.set(width, height);
};
