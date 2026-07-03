import gsap from "gsap";
import * as THREE from "three";
import { DURATION, EASING, PARALLAX, PLANE } from "./constants";
import type { CurvedPlaneData } from "./geometry";
import { camera, orbitControls, renderer } from "./core";
import {
	getWasDragged,
	resetTiltAndSway,
	restoreTiltAndSway,
	setAutoRotating,
	setDragEnabled,
	setMouseMoveEnabled,
	setRotationPaused,
} from "./galleryRotation";

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

let targetPlanes: THREE.Mesh[] = [];
let isZoomed = false;
let activePlane: THREE.Mesh | null = null;
const originalCameraPosition = new THREE.Vector3();
const originalControlsTarget = new THREE.Vector3();

export const setupInteractions = (planes: THREE.Mesh[]): void => {
	targetPlanes = planes;
	renderer.domElement.addEventListener("click", onClick);
	window.addEventListener("resize", onResize);
};

const onResize = (): void => {
	if (!isZoomed || !activePlane) return;

	// camera.aspectを先に更新
	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();

	// ワールド座標を取得
	const planePosition = new THREE.Vector3();
	activePlane.getWorldPosition(planePosition);

	const worldQuaternion = new THREE.Quaternion();
	activePlane.getWorldQuaternion(worldQuaternion);
	const planeNormal = new THREE.Vector3(0, 0, 1).applyQuaternion(
		worldQuaternion,
	);

	// 新しいビューポートサイズでカメラ距離を再計算
	const geometry = activePlane.geometry as THREE.BoxGeometry;
	const params = geometry.parameters;
	const distance = calculateCameraDistance(params.width, params.height);

	const targetPosition = planePosition
		.clone()
		.add(planeNormal.multiplyScalar(distance));

	// 即座に更新
	camera.position.copy(targetPosition);
	orbitControls.target.copy(planePosition);
};

const onClick = (event: MouseEvent): void => {
	// ドラッグ操作後はzoomInを無効にする
	if (getWasDragged()) return;

	mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
	mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

	raycaster.setFromCamera(mouse, camera);

	if (isZoomed) {
		zoomOut();
		return;
	}

	const intersects = raycaster.intersectObjects(targetPlanes);
	if (intersects.length > 0) {
		zoomIn(intersects[0].object as THREE.Mesh);
	}
};

// プレーンがビューポートにぴったり収まるカメラ距離を計算
const calculateCameraDistance = (
	planeWidth: number,
	planeHeight: number,
): number => {
	const fov = camera.fov * (Math.PI / 180);
	const aspect = camera.aspect; // camera.aspectを直接使用
	const planeAspect = planeWidth / planeHeight;

	let distance: number;
	if (aspect > planeAspect) {
		// ウィンドウが横長 → 幅基準（プレーンの幅をビューポートに合わせる）
		distance = planeWidth / 2 / Math.tan(fov / 2) / aspect;
	} else {
		// ウィンドウが縦長 → 高さ基準（プレーンの高さをビューポートに合わせる）
		distance = planeHeight / 2 / Math.tan(fov / 2);
	}

	return distance;
};

const zoomIn = (plane: THREE.Mesh): void => {
	originalCameraPosition.copy(camera.position);
	originalControlsTarget.copy(orbitControls.target);
	activePlane = plane;

	// 先にtilt/swayをリセット（座標計算前に必要）
	setMouseMoveEnabled(false);
	resetTiltAndSway();

	// リセット後のワールド座標を計算
	// galleryGroupのposition=(0,0,0), rotation.x=0 として計算
	const galleryRotationY = plane.parent?.rotation.y ?? 0;
	const groupQuaternion = new THREE.Quaternion().setFromEuler(
		new THREE.Euler(0, galleryRotationY, 0),
	);

	// ローカル座標をワールド座標に変換
	const planePosition = plane.position.clone().applyQuaternion(groupQuaternion);

	// プレーンの向きを計算
	const localQuaternion = new THREE.Quaternion().setFromEuler(plane.rotation);
	const worldQuaternion = groupQuaternion.clone().multiply(localQuaternion);
	const planeNormal = new THREE.Vector3(0, 0, 1).applyQuaternion(
		worldQuaternion,
	);

	// プレーンサイズからカメラ距離を計算
	const geometry = plane.geometry as THREE.BoxGeometry;
	const params = geometry.parameters;
	const distance = calculateCameraDistance(params.width, params.height);

	const targetPosition = planePosition
		.clone()
		.add(planeNormal.multiplyScalar(distance));

	orbitControls.enabled = false;

	gsap.to(camera.position, {
		x: targetPosition.x,
		y: targetPosition.y,
		z: targetPosition.z,
		duration: DURATION.BASE,
		ease: EASING.TRANSFORM,
	});

	gsap.to(orbitControls.target, {
		x: planePosition.x,
		y: planePosition.y,
		z: planePosition.z,
		duration: DURATION.BASE,
		ease: EASING.TRANSFORM,
	});

	morphToFlat(plane);

	// パララックススケールを1に戻し、ボーダーを消す
	const materials = plane.material as THREE.Material[];
	const coverMaterial = materials[4] as THREE.ShaderMaterial;
	gsap.to(coverMaterial.uniforms.uParallaxScale, {
		value: 1,
		duration: DURATION.BASE,
		ease: EASING.TRANSFORM,
	});
	gsap.to(coverMaterial.uniforms.uBorderWidth, {
		value: 0,
		duration: DURATION.BASE,
		ease: EASING.TRANSFORM,
	});

	setAutoRotating(false);
	setDragEnabled(false);
	setRotationPaused(true);
	isZoomed = true;
};

const zoomOut = (): void => {
	gsap.to(camera.position, {
		x: originalCameraPosition.x,
		y: originalCameraPosition.y,
		z: originalCameraPosition.z,
		duration: DURATION.BASE,
		ease: EASING.TRANSFORM,
	});

	gsap.to(orbitControls.target, {
		x: originalControlsTarget.x,
		y: originalControlsTarget.y,
		z: originalControlsTarget.z,
		duration: DURATION.BASE,
		ease: EASING.TRANSFORM,
	});

	if (activePlane) {
		// パララックススケールとボーダーを元に戻す
		const materials = activePlane.material as THREE.Material[];
		const coverMaterial = materials[4] as THREE.ShaderMaterial;
		gsap.to(coverMaterial.uniforms.uParallaxScale, {
			value: PARALLAX.SCALE,
			duration: DURATION.BASE,
			ease: EASING.TRANSFORM,
		});
		gsap.to(coverMaterial.uniforms.uBorderWidth, {
			value: PLANE.DEPTH,
			duration: DURATION.BASE,
			ease: EASING.TRANSFORM,
		});

		morphToCurved(activePlane);
		activePlane = null;
	}

	setAutoRotating(true);
	setDragEnabled(true);
	setRotationPaused(false);
	setMouseMoveEnabled(true);
	restoreTiltAndSway();
	isZoomed = false;
};

const morphToFlat = (plane: THREE.Mesh): void => {
	const geometry = plane.geometry as THREE.BoxGeometry;
	const data = geometry.userData as CurvedPlaneData;
	const position = geometry.attributes.position;

	const currentPositions = { value: 0 };

	gsap.to(currentPositions, {
		value: 1,
		duration: DURATION.BASE,
		ease: EASING.TRANSFORM,
		onUpdate: () => {
			const t = currentPositions.value;
			for (let i = 0; i < position.count; i++) {
				const curvedX = data.curvedPositions[i * 3];
				const curvedY = data.curvedPositions[i * 3 + 1];
				const curvedZ = data.curvedPositions[i * 3 + 2];

				const flatX = data.flatPositions[i * 3];
				const flatY = data.flatPositions[i * 3 + 1];
				const flatZ = data.flatPositions[i * 3 + 2];

				position.setXYZ(
					i,
					curvedX + (flatX - curvedX) * t,
					curvedY + (flatY - curvedY) * t,
					curvedZ + (flatZ - curvedZ) * t,
				);
			}
			position.needsUpdate = true;
			geometry.computeVertexNormals();
		},
	});
};

const morphToCurved = (plane: THREE.Mesh): void => {
	const geometry = plane.geometry as THREE.BoxGeometry;
	const data = geometry.userData as CurvedPlaneData;
	const position = geometry.attributes.position;

	const currentPositions = { value: 0 };

	gsap.to(currentPositions, {
		value: 1,
		duration: DURATION.BASE,
		ease: EASING.TRANSFORM,
		onUpdate: () => {
			const t = currentPositions.value;
			for (let i = 0; i < position.count; i++) {
				const flatX = data.flatPositions[i * 3];
				const flatY = data.flatPositions[i * 3 + 1];
				const flatZ = data.flatPositions[i * 3 + 2];

				const curvedX = data.curvedPositions[i * 3];
				const curvedY = data.curvedPositions[i * 3 + 1];
				const curvedZ = data.curvedPositions[i * 3 + 2];

				position.setXYZ(
					i,
					flatX + (curvedX - flatX) * t,
					flatY + (curvedY - flatY) * t,
					flatZ + (curvedZ - flatZ) * t,
				);
			}
			position.needsUpdate = true;
			geometry.computeVertexNormals();
		},
	});
};
