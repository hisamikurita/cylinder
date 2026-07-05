import gsap from "gsap";
import * as THREE from "three";
import { BACKGROUND_LIGHT_PARAMS, BACKGROUND_LIGHTS, SCENE } from "./constants";
import { camera, renderer } from "./core";
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

// 3Dワールド座標をスクリーンUV座標に変換
const worldToScreenUV = (worldPos: THREE.Vector3): THREE.Vector2 | null => {
	const projected = worldPos.clone().project(camera);
	// カメラの後ろにある場合は null を返す
	if (projected.z > 1) return null;
	return new THREE.Vector2(
		(projected.x + 1) * 0.5,
		(projected.y + 1) * 0.5,
	);
};

const rtSize = (): [number, number] => [
	Math.max(1, Math.floor(window.innerWidth * RT_SCALE)),
	Math.max(1, Math.floor(window.innerHeight * RT_SCALE)),
];

const createLightUniforms = (index: number) => {
	const light = BACKGROUND_LIGHTS[index];
	return {
		[`uLightColor${index}`]: { value: new THREE.Color(light.colorL) },
		[`uLightPos${index}`]: { value: new THREE.Vector2(light.posL.x, light.posL.y) },
		[`uLightRadius${index}`]: { value: new THREE.Vector2(light.radiusX, light.radiusY) },
		[`uLightAngle${index}`]: { value: light.angleL },
		[`uLightBias${index}`]: { value: light.biasL },
		[`uLightBiasRange${index}`]: { value: light.biasRangeL },
		[`uLightSpread${index}`]: { value: light.spreadL },
		[`uLightIntensity${index}`]: { value: light.enabled ? light.intensity : 0 },
		[`uLightFalloff${index}`]: { value: light.falloff },
	};
};

export const setupAtmosphere = (): void => {
	atmosphereMaterial = new THREE.ShaderMaterial({
		uniforms: {
			uBackgroundColor: {
				value: new THREE.Color(SCENE.BACKGROUND_COLOR),
			},
			...createLightUniforms(0),
			...createLightUniforms(1),
			...createLightUniforms(2),
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

const updateLightUniforms = (index: number): void => {
	const light = BACKGROUND_LIGHTS[index];
	const uniforms = atmosphereMaterial.uniforms;

	// intensity を 0 にすることで無効化
	uniforms[`uLightIntensity${index}`].value = light.enabled ? light.intensity : 0;
	uniforms[`uLightColor${index}`].value.setHex(light.colorL);
	uniforms[`uLightAngle${index}`].value = light.angleL;
	uniforms[`uLightBias${index}`].value = light.biasL;
	uniforms[`uLightBiasRange${index}`].value = light.biasRangeL;
	uniforms[`uLightSpread${index}`].value = light.spreadL;
	uniforms[`uLightFalloff${index}`].value = light.falloff;

	// 3Dモードの場合、ワールド座標をスクリーンUVに変換
	if (BACKGROUND_LIGHT_PARAMS.use3D) {
		const pos3D = light.pos3D;
		const worldPos = new THREE.Vector3(pos3D.x, pos3D.y, pos3D.z);
		const screenUV = worldToScreenUV(worldPos);
		if (screenUV) {
			let x = screenUV.x;
			let y = screenUV.y;

			// ビューポート内にクランプ
			if (BACKGROUND_LIGHT_PARAMS.clampToViewport) {
				const pad = BACKGROUND_LIGHT_PARAMS.viewportPadding;
				x = Math.max(pad, Math.min(1 - pad, x));
				y = Math.max(pad, Math.min(1 - pad, y));
			}

			uniforms[`uLightPos${index}`].value.set(x, y);

			// X位置に応じてスケール（左に行くほど小さく、右に行くほど大きく）
			if (BACKGROUND_LIGHT_PARAMS.scaleByX) {
				const scaleMin = BACKGROUND_LIGHT_PARAMS.scaleMin;
				const scaleMax = BACKGROUND_LIGHT_PARAMS.scaleMax;
				const scale = scaleMin + (scaleMax - scaleMin) * x;
				uniforms[`uLightRadius${index}`].value.set(
					light.radiusX * scale,
					light.radiusY * scale,
				);
			} else {
				uniforms[`uLightRadius${index}`].value.set(light.radiusX, light.radiusY);
			}
		}
	} else {
		uniforms[`uLightPos${index}`].value.set(light.posL.x, light.posL.y);
		uniforms[`uLightRadius${index}`].value.set(light.radiusX, light.radiusY);
	}
};

export const renderAtmosphere = (): void => {
	if (!atmosphereMaterial) return;

	// 全ライトのuniformを更新
	for (let i = 0; i < BACKGROUND_LIGHTS.length; i++) {
		updateLightUniforms(i);
	}

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
	const uniform = atmosphereMaterial.uniforms.uLightIntensity0;
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
