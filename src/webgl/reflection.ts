import * as THREE from "three";
import { renderAtmosphere } from "./atmosphere";
import { BACKGROUND_LIGHTS, REFLECTION_PARAMS, SCENE } from "./constants";
import { camera, renderer, scene } from "./core";
import { galleryGroup, galleryPlanes, gallerySideMaterial } from "./Gallery";
import blurFragmentShader from "./shaders/blur.frag?raw";
import compositeFragmentShader from "./shaders/composite.frag?raw";
import floorFragmentShader from "./shaders/floor.frag?raw";
import floorVertexShader from "./shaders/floor.vert?raw";
import fullscreenVertexShader from "./shaders/fullscreen.vert?raw";

// 床面（ミラー）
let floorMesh: THREE.Mesh;
let floorMaterial: THREE.ShaderMaterial;
const FLOOR_Y = -0.7; // 床のY座標
const FLOOR_SIZE = 20;

let reflectionRT: THREE.WebGLRenderTarget;
let blurRTA: THREE.WebGLRenderTarget;
let blurRTB: THREE.WebGLRenderTarget;
let blurMaterial: THREE.ShaderMaterial;
let compositeMaterial: THREE.ShaderMaterial;
let fullscreenScene: THREE.Scene;
let fullscreenCamera: THREE.OrthographicCamera;
let fullscreenMesh: THREE.Mesh;

const setupPostprocessing = (): void => {
	const w = window.innerWidth;
	const h = window.innerHeight;

	reflectionRT = new THREE.WebGLRenderTarget(w, h, {
		depthBuffer: true,
	});
	blurRTA = new THREE.WebGLRenderTarget(w, h, { depthBuffer: false });
	blurRTB = new THREE.WebGLRenderTarget(w, h, { depthBuffer: false });

	blurMaterial = new THREE.ShaderMaterial({
		uniforms: {
			tDiffuse: { value: null },
			uResolution: { value: new THREE.Vector2(w, h) },
			uDirection: { value: new THREE.Vector2(1, 0) },
			uRadius: { value: REFLECTION_PARAMS.blurRadius },
		},
		vertexShader: fullscreenVertexShader,
		fragmentShader: blurFragmentShader,
		depthTest: false,
		depthWrite: false,
	});

	const light = BACKGROUND_LIGHTS[0];
	compositeMaterial = new THREE.ShaderMaterial({
		uniforms: {
			tDiffuse: { value: null },
			uLightPos: { value: new THREE.Vector3(light.pos3D.x, light.pos3D.y, light.pos3D.z) },
			uLightDir: { value: new THREE.Vector3(0, 0, -1) },
			uLightConeAngle: { value: light.spotConeAngle },
			uLightColor: { value: new THREE.Color(light.colorL) },
			uLightIntensity: { value: light.intensity },
			uFloorY: { value: FLOOR_Y },
			uInverseViewProjection: { value: new THREE.Matrix4() },
			uCameraPos: { value: new THREE.Vector3() },
		},
		vertexShader: fullscreenVertexShader,
		fragmentShader: compositeFragmentShader,
		depthTest: false,
		depthWrite: false,
		transparent: true,
		blending: THREE.AdditiveBlending,
	});

	fullscreenScene = new THREE.Scene();
	fullscreenCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
	fullscreenMesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), blurMaterial);
	fullscreenScene.add(fullscreenMesh);
};

export const setupReflection = (): void => {
	// 床面のジオメトリとマテリアル（ライティング対応）
	const floorGeometry = new THREE.PlaneGeometry(FLOOR_SIZE, FLOOR_SIZE);
	const light = BACKGROUND_LIGHTS[0];

	floorMaterial = new THREE.ShaderMaterial({
		uniforms: {
			uBaseColor: { value: new THREE.Color(SCENE.BACKGROUND_COLOR) },
			uLightPos: { value: new THREE.Vector3(light.pos3D.x, light.pos3D.y, light.pos3D.z) },
			uLightDir: { value: new THREE.Vector3(0, 0, -1) },
			uLightConeAngle: { value: light.spotConeAngle },
			uLightColor: { value: new THREE.Color(light.colorL) },
			uLightIntensity: { value: light.intensity },
			uCameraPos: { value: new THREE.Vector3() },
		},
		vertexShader: floorVertexShader,
		fragmentShader: floorFragmentShader,
	});

	floorMesh = new THREE.Mesh(floorGeometry, floorMaterial);
	floorMesh.rotation.x = -Math.PI / 2;
	floorMesh.position.y = FLOOR_Y;
	scene.add(floorMesh);

	setupPostprocessing();
};

export const updateFloorLightUniforms = (): void => {
	if (!floorMaterial) return;

	const light = BACKGROUND_LIGHTS[0];
	const pos3D = light.pos3D;
	const lightPos = new THREE.Vector3(pos3D.x, pos3D.y, pos3D.z);
	const lightColor = new THREE.Color(light.colorL);

	// アングルからスポットライト方向を計算
	const angleX = THREE.MathUtils.degToRad(light.spotAngleX);
	const angleY = THREE.MathUtils.degToRad(light.spotAngleY);
	const lightDir = new THREE.Vector3(0, 0, -1);
	lightDir.applyAxisAngle(new THREE.Vector3(1, 0, 0), angleX);
	lightDir.applyAxisAngle(new THREE.Vector3(0, 1, 0), angleY);
	lightDir.normalize();

	floorMaterial.uniforms.uLightPos.value.copy(lightPos);
	floorMaterial.uniforms.uLightDir.value.copy(lightDir);
	floorMaterial.uniforms.uLightConeAngle.value = light.spotConeAngle;
	floorMaterial.uniforms.uLightColor.value.copy(lightColor);
	floorMaterial.uniforms.uLightIntensity.value = light.enabled ? light.intensity : 0;
	floorMaterial.uniforms.uCameraPos.value.copy(camera.position);
};

export const resizeReflection = (): void => {
	if (!reflectionRT) return;
	const w = window.innerWidth;
	const h = window.innerHeight;
	reflectionRT.setSize(w, h);
	blurRTA.setSize(w, h);
	blurRTB.setSize(w, h);
	blurMaterial.uniforms.uResolution.value.set(w, h);
};

export const renderWithReflection = (
	renderTarget?: THREE.WebGLRenderTarget | null,
): void => {
	const gl = renderer.getContext();
	renderer.autoClear = false;

	const previousRenderTarget = renderer.getRenderTarget();
	const finalTarget = renderTarget !== undefined ? renderTarget : null;

	const originalY = galleryGroup.position.y;
	const originalScaleY = galleryGroup.scale.y;
	const originalBackground = scene.background;

	// === 1. 最終ターゲットをクリアし、背景を敷いてから床でステンシルを立てる ===
	renderer.setRenderTarget(finalTarget);
	renderer.clear(true, true, true);

	// 背景（両サイドの色付きグロウ）を全画面に描画
	renderAtmosphere();

	// 床面はステンシルのみ書き込む（色は描画しない）
	gl.enable(gl.STENCIL_TEST);
	gl.stencilFunc(gl.ALWAYS, 1, 0xff);
	gl.stencilOp(gl.KEEP, gl.KEEP, gl.REPLACE);
	gl.colorMask(false, false, false, false);
	gl.depthMask(false);

	floorMesh.visible = true;
	galleryGroup.visible = false;
	renderer.render(scene, camera);

	// === 2. 反射シーンをオフスクリーンにレンダリング（明度を落とす）===
	gl.colorMask(true, true, true, true);
	gl.depthMask(true);
	gl.disable(gl.STENCIL_TEST);

	galleryGroup.position.y = FLOOR_Y * 2 - originalY;
	galleryGroup.scale.y = -1;
	floorMesh.visible = false;
	galleryGroup.visible = true;
	scene.background = null;

	const originalSideColor = gallerySideMaterial.color.clone();
	gallerySideMaterial.color.multiplyScalar(REFLECTION_PARAMS.brightness);
	const t = performance.now() / 1000;
	for (const plane of galleryPlanes) {
		const materials = plane.material as THREE.Material[];
		const cover = materials[4] as THREE.ShaderMaterial;
		cover.uniforms.uBrightness.value = REFLECTION_PARAMS.brightness;
		cover.uniforms.uTime.value = t;
		cover.uniforms.uWaveStrength.value = REFLECTION_PARAMS.waveStrength;
		cover.uniforms.uWaveFrequency.value = REFLECTION_PARAMS.waveFrequency;
		cover.uniforms.uWaveSpeed.value = REFLECTION_PARAMS.waveSpeed;
	}

	renderer.setRenderTarget(reflectionRT);
	renderer.setClearColor(0x000000, 0);
	renderer.clear(true, true, false);
	renderer.render(scene, camera);

	gallerySideMaterial.color.copy(originalSideColor);
	for (const plane of galleryPlanes) {
		const materials = plane.material as THREE.Material[];
		const cover = materials[4] as THREE.ShaderMaterial;
		cover.uniforms.uBrightness.value = 1.0;
		cover.uniforms.uWaveStrength.value = 0;
	}

	// === 3. ガウシアンブラー（水平 → 垂直）===
	fullscreenMesh.material = blurMaterial;
	blurMaterial.uniforms.uRadius.value = REFLECTION_PARAMS.blurRadius;

	blurMaterial.uniforms.tDiffuse.value = reflectionRT.texture;
	blurMaterial.uniforms.uDirection.value.set(1, 0);
	renderer.setRenderTarget(blurRTA);
	renderer.clear(true, false, false);
	renderer.render(fullscreenScene, fullscreenCamera);

	blurMaterial.uniforms.tDiffuse.value = blurRTA.texture;
	blurMaterial.uniforms.uDirection.value.set(0, 1);
	renderer.setRenderTarget(blurRTB);
	renderer.clear(true, false, false);
	renderer.render(fullscreenScene, fullscreenCamera);

	// === 4. 最終ターゲットのステンシル領域にブラー結果を合成 ===
	renderer.setRenderTarget(finalTarget);
	gl.enable(gl.STENCIL_TEST);
	gl.stencilFunc(gl.EQUAL, 1, 0xff);
	gl.stencilOp(gl.KEEP, gl.KEEP, gl.KEEP);

	// ライト情報を更新
	const light = BACKGROUND_LIGHTS[0];
	const angleX = THREE.MathUtils.degToRad(light.spotAngleX);
	const angleY = THREE.MathUtils.degToRad(light.spotAngleY);
	const lightDir = new THREE.Vector3(0, 0, -1);
	lightDir.applyAxisAngle(new THREE.Vector3(1, 0, 0), angleX);
	lightDir.applyAxisAngle(new THREE.Vector3(0, 1, 0), angleY);
	lightDir.normalize();

	// inverseViewProjection行列を計算
	const viewProjection = new THREE.Matrix4();
	viewProjection.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
	const inverseViewProjection = viewProjection.invert();

	compositeMaterial.uniforms.uLightPos.value.set(light.pos3D.x, light.pos3D.y, light.pos3D.z);
	compositeMaterial.uniforms.uLightDir.value.copy(lightDir);
	compositeMaterial.uniforms.uLightConeAngle.value = light.spotConeAngle;
	compositeMaterial.uniforms.uLightIntensity.value = light.enabled ? light.intensity : 0;
	compositeMaterial.uniforms.uInverseViewProjection.value.copy(inverseViewProjection);
	compositeMaterial.uniforms.uCameraPos.value.copy(camera.position);

	fullscreenMesh.material = compositeMaterial;
	compositeMaterial.uniforms.tDiffuse.value = blurRTB.texture;
	renderer.render(fullscreenScene, fullscreenCamera);

	// === 5. ステンシル無効化して通常シーンを描画 ===
	gl.disable(gl.STENCIL_TEST);
	galleryGroup.position.y = originalY;
	galleryGroup.scale.y = originalScaleY;
	floorMesh.visible = false; // 床面はstep1で描画済み
	renderer.clearDepth();
	renderer.render(scene, camera);

	// 元に戻す
	scene.background = originalBackground;
	renderer.autoClear = true;

	if (renderTarget !== undefined) {
		renderer.setRenderTarget(previousRenderTarget);
	}
};
