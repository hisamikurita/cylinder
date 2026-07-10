import gsap from "gsap";
import * as THREE from "three";
import {
	CAMERA,
	camera,
	DURATION,
	EASING,
	FOG,
	floorAlphaFade,
	galleryPlanes,
	gallerySideMaterial,
	PLANE,
	reflectionBrightnessFade,
	scene,
	setupGalleryRotation,
	setupInteractions,
	volumeLightAlphaFade,
} from "../webgl";

// 真上から円筒を見下ろすアングルにして、フレーム色を白、ライト・反射を off にする。
// FOV も一時的に狭く (望遠寄り) して、より平面的なトップダウンビューに
const LOADING_CAMERA_Y = 36;
const LOADING_FOV = 40;
// fog.far がデフォルト値 (11.5) だと真上ビューではカメラから遠すぎて白フレームまで
// フォグに沈む。ロード中は far を大きく取って fog をほぼ効かないようにする
// (カメラ Y=36 から見た距離 ≈35 に対して factor が 0.15 以下に収まる値)
const LOADING_FOG_FAR = 200;

// reveal 全体の基本時間
const REVEAL_DURATION = 2.5;
// フレーム色 (白 → 030303) のトゥイーン時間
const FRAME_COLOR_DURATION = 2.1;
// 「正面を向く」アニメ (Z 前進 + rotation.x 起こし) を遅らせる時間。
// 先に降下してから立ち上がる流れを作る
const FACE_FORWARD_DELAY = 0.48;
// ライト点灯を face-forward からさらに遅らせるオフセット
const LIGHT_ON_DELAY = 1.2;

export const applyLoadingState = (): void => {
	camera.position.set(0, LOADING_CAMERA_Y, 0);
	camera.rotation.set(-Math.PI / 2, 0, 0);
	camera.fov = LOADING_FOV;
	camera.updateProjectionMatrix();

	if (scene.fog instanceof THREE.Fog) {
		scene.fog.far = LOADING_FOG_FAR;
	}

	volumeLightAlphaFade.value = 0;
	reflectionBrightnessFade.value = 0;
	floorAlphaFade.value = 0;
};

// 全メディアがロード完了した時に発火して、カメラ・フレーム色・ライトを通常状態へ
export const finishLoading = (planes: THREE.Mesh[]): void => {
	// カメラ Y (降下) はすぐ開始
	gsap.to(camera.position, {
		y: CAMERA.INITIAL_Y,
		duration: REVEAL_DURATION,
		ease: EASING.TRANSFORM,
	});
	gsap.to(camera.position, {
		z: CAMERA.INITIAL_Z,
		delay: FACE_FORWARD_DELAY,
		duration: REVEAL_DURATION,
		ease: EASING.TRANSFORM,
	});
	gsap.to(camera.rotation, {
		x: 0,
		delay: FACE_FORWARD_DELAY,
		duration: REVEAL_DURATION,
		ease: EASING.TRANSFORM,
	});
	// PerspectiveCamera は fov を書き換えても updateProjectionMatrix() を呼ぶまで
	// 反映されないので onUpdate で毎フレーム更新する
	gsap.to(camera, {
		fov: CAMERA.FOV,
		duration: REVEAL_DURATION,
		ease: EASING.TRANSFORM,
		onUpdate: () => camera.updateProjectionMatrix(),
	});

	// フォグの far を通常値へ戻す (ロード中は白フレームまで見せるために遠ざけていた)
	if (scene.fog instanceof THREE.Fog) {
		gsap.to(scene.fog, {
			far: FOG.FAR,
			delay: FACE_FORWARD_DELAY,
			duration: REVEAL_DURATION,
			ease: EASING.TRANSFORM,
		});
	}

	// フレーム色を白 → 030303 (RGB proxy を tween して onUpdate で反映)
	const colorProxy = new THREE.Color(0xffffff);
	const targetColor = new THREE.Color(PLANE.SIDE_COLOR);
	gsap.to(colorProxy, {
		r: targetColor.r,
		g: targetColor.g,
		b: targetColor.b,
		duration: FRAME_COLOR_DURATION,
		ease: EASING.TRANSFORM,
		onUpdate: () => {
			gallerySideMaterial.color.copy(colorProxy);
			for (const plane of galleryPlanes) {
				const cover = (
					plane.material as THREE.Material[]
				)[4] as THREE.ShaderMaterial;
				cover.uniforms.uBorderColor.value.copy(colorProxy);
			}
		},
	});

	// ライト点灯 (volume light の柱と反射のブライトネスを 0 → 1)
	gsap.to(volumeLightAlphaFade, {
		value: 1,
		delay: FACE_FORWARD_DELAY + LIGHT_ON_DELAY,
		duration: DURATION.LONG,
		ease: EASING.TRANSFORM,
	});
	gsap.to(reflectionBrightnessFade, {
		value: 1,
		delay: FACE_FORWARD_DELAY + LIGHT_ON_DELAY,
		duration: DURATION.LONG,
		ease: EASING.TRANSFORM,
	});
	gsap.to(floorAlphaFade, {
		value: 1,
		delay: FACE_FORWARD_DELAY,
		duration: DURATION.EXTRA_LONG,
		ease: EASING.TRANSFORM,
	});

	// 「正面を向く」アニメが始まるタイミングでマウス系インタラクションを解禁
	// (mouse tilt / sway, ドラッグ回転, クリックでズーム, ホバー円/リップル)
	gsap.delayedCall(FACE_FORWARD_DELAY, () => {
		setupInteractions(planes);
		setupGalleryRotation();
	});
};
