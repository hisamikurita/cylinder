import * as THREE from "three";
import { LIGHT_PARAMS, PARALLAX, PLANE } from "./constants";
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
			uLightPos1: {
				value: new THREE.Vector3(
					LIGHT_PARAMS.pos1.x,
					LIGHT_PARAMS.pos1.y,
					LIGHT_PARAMS.pos1.z,
				),
			},
			uLightPos2: {
				value: new THREE.Vector3(
					LIGHT_PARAMS.pos2.x,
					LIGHT_PARAMS.pos2.y,
					LIGHT_PARAMS.pos2.z,
				),
			},
			uLightColor: { value: new THREE.Color(LIGHT_PARAMS.color) },
			uSpecularStrength: { value: LIGHT_PARAMS.specularStrength },
			uShininess: { value: LIGHT_PARAMS.shininess },
			uAmbient: { value: LIGHT_PARAMS.ambient },
			uAttenuation: { value: LIGHT_PARAMS.attenuation },
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
