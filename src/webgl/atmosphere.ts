import gsap from "gsap";
import * as THREE from "three";
import { BACKGROUND_LIGHT_PARAMS, SCENE } from "./constants";
import { renderer } from "./core";
import atmosphereFragmentShader from "./shaders/atmosphere.frag?raw";
import blurFragmentShader from "./shaders/blur.frag?raw";
import fullscreenVertexShader from "./shaders/fullscreen.vert?raw";

let atmosphereMaterial: THREE.ShaderMaterial;
let blurMaterial: THREE.ShaderMaterial;
let atmosphereScene: THREE.Scene;
let atmosphereCamera: THREE.OrthographicCamera;
let atmosphereMesh: THREE.Mesh;

let atmosphereRT: THREE.WebGLRenderTarget;
let blurRT: THREE.WebGLRenderTarget;

let intensityTween: gsap.core.Tween | undefined;

// ブラーは半解像度で回すと高速で自然にぼやける
const RT_SCALE = 0.5;

const rtSize = (): [number, number] => [
	Math.max(1, Math.floor(window.innerWidth * RT_SCALE)),
	Math.max(1, Math.floor(window.innerHeight * RT_SCALE)),
];

export const setupAtmosphere = (): void => {
	atmosphereMaterial = new THREE.ShaderMaterial({
		uniforms: {
			uBackgroundColor: {
				value: new THREE.Color(SCENE.BACKGROUND_COLOR),
			},
			uLightColorL: {
				value: new THREE.Color(BACKGROUND_LIGHT_PARAMS.colorL),
			},
			uLightPosL: {
				value: new THREE.Vector2(
					BACKGROUND_LIGHT_PARAMS.posL.x,
					BACKGROUND_LIGHT_PARAMS.posL.y,
				),
			},
			uLightRadius: {
				value: new THREE.Vector2(
					BACKGROUND_LIGHT_PARAMS.radiusX,
					BACKGROUND_LIGHT_PARAMS.radiusY,
				),
			},
			uLightAngleL: { value: BACKGROUND_LIGHT_PARAMS.angleL },
			uLightBiasL: { value: BACKGROUND_LIGHT_PARAMS.biasL },
			uLightSpreadL: { value: BACKGROUND_LIGHT_PARAMS.spreadL },
			uLightIntensity: { value: BACKGROUND_LIGHT_PARAMS.intensity },
			uLightFalloff: { value: BACKGROUND_LIGHT_PARAMS.falloff },
		},
		vertexShader: fullscreenVertexShader,
		fragmentShader: atmosphereFragmentShader,
		depthTest: false,
		depthWrite: false,
	});

	const [w, h] = rtSize();
	blurMaterial = new THREE.ShaderMaterial({
		uniforms: {
			tDiffuse: { value: null },
			uResolution: { value: new THREE.Vector2(w, h) },
			uDirection: { value: new THREE.Vector2(1, 0) },
			uRadius: { value: BACKGROUND_LIGHT_PARAMS.blurRadius },
		},
		vertexShader: fullscreenVertexShader,
		fragmentShader: blurFragmentShader,
		depthTest: false,
		depthWrite: false,
	});

	atmosphereRT = new THREE.WebGLRenderTarget(w, h, { depthBuffer: false });
	blurRT = new THREE.WebGLRenderTarget(w, h, { depthBuffer: false });

	atmosphereScene = new THREE.Scene();
	atmosphereCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
	atmosphereMesh = new THREE.Mesh(
		new THREE.PlaneGeometry(2, 2),
		atmosphereMaterial,
	);
	atmosphereScene.add(atmosphereMesh);
};

export const renderAtmosphere = (): void => {
	if (!atmosphereMaterial) return;

	const savedTarget = renderer.getRenderTarget();

	// 1) アトモスフィアシェーダを FBO に描画
	atmosphereMesh.material = atmosphereMaterial;
	renderer.setRenderTarget(atmosphereRT);
	renderer.clear(true, false, false);
	renderer.render(atmosphereScene, atmosphereCamera);

	// 2) 水平ブラー → blurRT
	atmosphereMesh.material = blurMaterial;
	blurMaterial.uniforms.uRadius.value = BACKGROUND_LIGHT_PARAMS.blurRadius;
	blurMaterial.uniforms.tDiffuse.value = atmosphereRT.texture;
	blurMaterial.uniforms.uDirection.value.set(1, 0);
	renderer.setRenderTarget(blurRT);
	renderer.clear(true, false, false);
	renderer.render(atmosphereScene, atmosphereCamera);

	// 3) 垂直ブラー → 元のターゲット（＝反射パイプラインの最終ターゲット）
	blurMaterial.uniforms.tDiffuse.value = blurRT.texture;
	blurMaterial.uniforms.uDirection.value.set(0, 1);
	renderer.setRenderTarget(savedTarget);
	renderer.render(atmosphereScene, atmosphereCamera);
};

export const resizeAtmosphere = (): void => {
	if (!atmosphereRT) return;
	const [w, h] = rtSize();
	atmosphereRT.setSize(w, h);
	blurRT.setSize(w, h);
	blurMaterial.uniforms.uResolution.value.set(w, h);
};

export const updateAtmosphereUniform = (
	key: string,
	updater: (uniform: THREE.IUniform) => void,
): void => {
	if (!atmosphereMaterial) return;
	const uniform = atmosphereMaterial.uniforms[key];
	if (uniform) updater(uniform);
};

export const startAtmosphereIntensityAnimation = (
	low = 0.2,
	high = 0.55,
	minDuration = 1.5,
	maxDuration = 3.8,
): void => {
	if (!atmosphereMaterial) return;
	intensityTween?.kill();
	const uniform = atmosphereMaterial.uniforms.uLightIntensity;
	uniform.value = low;

	let goingUp = true;
	const step = () => {
		if (!atmosphereMaterial) return;
		const duration =
			minDuration + Math.random() * (maxDuration - minDuration);
		const target = goingUp ? high : low;
		goingUp = !goingUp;
		intensityTween = gsap.to(uniform, {
			value: target,
			duration,
			ease: "sine.inOut",
			onComplete: step,
		});
	};
	step();
};

export const stopAtmosphereIntensityAnimation = (): void => {
	intensityTween?.kill();
	intensityTween = undefined;
};
