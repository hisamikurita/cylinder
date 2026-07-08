import * as THREE from "three";
import { BACKGROUND_LIGHTS, VOLUME_LIGHT_PARAMS } from "./constants";
import { scene } from "./core";
import volumeLightFragmentShader from "./shaders/volumeLight.frag?raw";
import volumeLightVertexShader from "./shaders/volumeLight.vert?raw";

export const setupLights = (): void => {
	const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
	scene.add(ambientLight);

	const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
	directionalLight.position.set(5, 5, 5);
	scene.add(directionalLight);
};

type BackgroundLightEntry = {
	light: THREE.SpotLight;
	helper: THREE.SpotLightHelper;
	marker: THREE.Mesh;
	volume: THREE.Mesh;
	volumeMaterial: THREE.ShaderMaterial;
	index: number;
};

const backgroundLightEntries: BackgroundLightEntry[] = [];

// spotAngleX / spotAngleY (degrees) から進行方向ベクトルを算出
const computeSpotDirection = (
	spotAngleX: number,
	spotAngleY: number,
): THREE.Vector3 => {
	const rx = THREE.MathUtils.degToRad(spotAngleX);
	const ry = THREE.MathUtils.degToRad(spotAngleY);
	const dir = new THREE.Vector3(0, 0, -1);
	const euler = new THREE.Euler(rx, ry, 0, "YXZ");
	dir.applyEuler(euler);
	return dir;
};

// production パターン: THREE.SpotLight と円錐 (CylinderGeometry) メッシュを
// ペアで生成し、同じ位置・向き・cone角に揃える。
// SpotLight は Standard 系マテリアルに対する実照明用（このプロジェクトでは
// カスタムシェーダが多いので intensity=0 でも可視化用の cone だけ描画される）。
// Cylinder メッシュ + volumeLight シェーダで「光柱」を描く。
const buildVolumeMesh = (cfg: (typeof BACKGROUND_LIGHTS)[number]) => {
	const halfConeRad = THREE.MathUtils.degToRad(cfg.spotConeAngle * 0.5);
	const height = VOLUME_LIGHT_PARAMS.distance;
	const radiusBottom = Math.tan(halfConeRad) * height;

	const geometry = new THREE.CylinderGeometry(
		0, // top (光源側は点)
		radiusBottom, // bottom (光が広がる側)
		height,
		64,
		20,
		true, // openEnded
	);
	// 頂点を上端 (光源) に平行移動 → local +Z が「進行方向」になるよう回転
	geometry.translate(0, -height / 2, 0);
	geometry.rotateX(-Math.PI / 2);

	const material = new THREE.ShaderMaterial({
		vertexShader: volumeLightVertexShader,
		fragmentShader: volumeLightFragmentShader,
		uniforms: {
			uLightColor: { value: new THREE.Color(cfg.colorL) },
			uSpotPosition: {
				value: new THREE.Vector3(cfg.pos3D.x, cfg.pos3D.y, cfg.pos3D.z),
			},
			uAttenuation: { value: VOLUME_LIGHT_PARAMS.attenuation },
			uAnglePower: { value: VOLUME_LIGHT_PARAMS.anglePower },
			uAlpha: { value: VOLUME_LIGHT_PARAMS.alpha },
			uWave: { value: VOLUME_LIGHT_PARAMS.wave },
			uTime: { value: 0 },
		},
		transparent: true,
		depthWrite: false,
		side: THREE.DoubleSide,
		blending: THREE.AdditiveBlending,
	});

	const mesh = new THREE.Mesh(geometry, material);
	mesh.renderOrder = 3;
	return { mesh, material };
};

export const setupBackgroundLightHelpers = (): void => {
	BACKGROUND_LIGHTS.forEach((cfg, index) => {
		// THREE.SpotLight (実照明ペア。カスタムシェーダには効かないが、
		// production パターンの整合性のために配置しておく)
		const spot = new THREE.SpotLight(cfg.colorL, 0);
		spot.position.set(cfg.pos3D.x, cfg.pos3D.y, cfg.pos3D.z);
		spot.angle = THREE.MathUtils.degToRad(cfg.spotConeAngle * 0.5);
		spot.penumbra = 0.2;
		spot.distance = VOLUME_LIGHT_PARAMS.distance;

		const dir = computeSpotDirection(cfg.spotAngleX, cfg.spotAngleY);
		spot.target.position.copy(spot.position).add(dir);

		scene.add(spot);
		scene.add(spot.target);

		// SpotLightHelper (debug)
		const helper = new THREE.SpotLightHelper(spot, cfg.colorL);
		helper.visible = VOLUME_LIGHT_PARAMS.showHelper;
		scene.add(helper);

		// 位置マーカー (debug)
		const marker = new THREE.Mesh(
			new THREE.SphereGeometry(0.1, 12, 12),
			new THREE.MeshBasicMaterial({ color: cfg.colorL }),
		);
		marker.position.copy(spot.position);
		marker.visible = VOLUME_LIGHT_PARAMS.showHelper;
		scene.add(marker);

		// VolumeLight (可視の光柱)
		const { mesh: volume, material: volumeMaterial } = buildVolumeMesh(cfg);
		volume.position.copy(spot.position);
		// 円錐は local +Z が進行方向 (rotateX(-PI/2) 済) → lookAt でその方向を合わせる
		const targetPos = spot.position.clone().add(dir);
		volume.lookAt(targetPos);
		scene.add(volume);

		backgroundLightEntries.push({
			light: spot,
			helper,
			marker,
			volume,
			volumeMaterial,
			index,
		});
	});
};

export const updateBackgroundLightHelpers = (): void => {
	const now = performance.now() / 1000;

	for (const entry of backgroundLightEntries) {
		const { light, helper, marker, volume, volumeMaterial, index } = entry;
		const cfg = BACKGROUND_LIGHTS[index];
		const visible = cfg.enabled && VOLUME_LIGHT_PARAMS.enabled;

		light.visible = visible;
		volume.visible = visible;
		helper.visible = visible && VOLUME_LIGHT_PARAMS.showHelper;
		marker.visible = visible && VOLUME_LIGHT_PARAMS.showHelper;

		if (!visible) continue;

		light.position.set(cfg.pos3D.x, cfg.pos3D.y, cfg.pos3D.z);
		light.color.setHex(cfg.colorL);
		light.angle = THREE.MathUtils.degToRad(cfg.spotConeAngle * 0.5);
		light.distance = VOLUME_LIGHT_PARAMS.distance;

		const dir = computeSpotDirection(cfg.spotAngleX, cfg.spotAngleY);
		light.target.position.copy(light.position).add(dir);
		light.target.updateMatrixWorld();

		marker.position.copy(light.position);
		(marker.material as THREE.MeshBasicMaterial).color.setHex(cfg.colorL);

		// VolumeLight 更新
		// cone 角度が変わった場合はジオメトリを作り直す必要があるが、
		// GUI 経由の頻繁な変更を避けるため半径だけスケールで擬似的に合わせる
		const halfConeRad = THREE.MathUtils.degToRad(cfg.spotConeAngle * 0.5);
		const currentRadiusBottom =
			Math.tan(halfConeRad) * VOLUME_LIGHT_PARAMS.distance;
		const originalHeight = (volume.geometry as THREE.CylinderGeometry)
			.parameters.height;
		const originalRadiusBottom = (volume.geometry as THREE.CylinderGeometry)
			.parameters.radiusBottom;
		volume.scale.set(
			currentRadiusBottom / originalRadiusBottom,
			currentRadiusBottom / originalRadiusBottom,
			VOLUME_LIGHT_PARAMS.distance / originalHeight,
		);
		volume.position.copy(light.position);
		volume.lookAt(light.target.position);

		volumeMaterial.uniforms.uLightColor.value.setHex(cfg.colorL);
		volumeMaterial.uniforms.uSpotPosition.value.copy(light.position);
		volumeMaterial.uniforms.uAttenuation.value =
			VOLUME_LIGHT_PARAMS.attenuation;
		volumeMaterial.uniforms.uAnglePower.value = VOLUME_LIGHT_PARAMS.anglePower;
		volumeMaterial.uniforms.uAlpha.value = VOLUME_LIGHT_PARAMS.alpha;
		volumeMaterial.uniforms.uWave.value = VOLUME_LIGHT_PARAMS.wave;
		volumeMaterial.uniforms.uTime.value = now * VOLUME_LIGHT_PARAMS.speed;

		helper.update();
	}
};
