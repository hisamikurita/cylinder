import * as THREE from "three";
import fragmentShader from "./shaders/cover.frag?raw";
import vertexShader from "./shaders/cover.vert?raw";

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
		},
		vertexShader,
		fragmentShader,
		side: THREE.DoubleSide,
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
