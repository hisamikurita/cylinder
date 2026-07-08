import gsap from "gsap";
import * as THREE from "three";
import { DURATION, EASING, GALLERY, PARALLAX, PLANE } from "./constants";
import { camera, orbitControls, renderer } from "./core";
import { galleryGroup, galleryLightFade } from "./Gallery";
import {
	getIsDragging,
	getWasDragged,
	resetTiltAndSway,
	restoreTiltAndSway,
	setAutoRotating,
	setDragEnabled,
	setMouseMoveEnabled,
	setRotationPaused,
} from "./galleryRotation";
import type { CurvedPlaneData } from "./geometry";

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

let targetPlanes: THREE.Mesh[] = [];
let isZoomed = false;
let activePlane: THREE.Mesh | null = null;
// zoomOut で復元するために保存する galleryGroup の元の姿勢
let originalGalleryRotationY = 0;
let originalGalleryPositionZ = 0;

export const setupInteractions = (planes: THREE.Mesh[]): void => {
	targetPlanes = planes;
	renderer.domElement.addEventListener("click", onClick);
	renderer.domElement.addEventListener("mousemove", onHoverMove);
	window.addEventListener("resize", onResize);
};

// プレーン hover 時のカーソル切り替え。ドラッグ中は galleryRotation 側で
// "grabbing" が設定されているので触らない
const onHoverMove = (event: MouseEvent): void => {
	if (getIsDragging()) return;

	mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
	mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

	raycaster.setFromCamera(mouse, camera);
	const intersects = raycaster.intersectObjects(targetPlanes);
	renderer.domElement.style.cursor = intersects.length > 0 ? "pointer" : "";
};

const onResize = (): void => {
	if (!isZoomed || !activePlane) return;

	// camera.aspectを先に更新
	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();

	// 新しいビューポートサイズで必要な距離を再計算し、ギャラリーを z 方向に移動
	const geometry = activePlane.geometry as THREE.BoxGeometry;
	const params = geometry.parameters;
	const distance = calculateCameraDistance(params.width, params.height);
	galleryGroup.position.z = camera.position.z - distance - GALLERY.RADIUS;
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
	activePlane = plane;
	// zoomOut で復元するために保存
	originalGalleryRotationY = galleryGroup.rotation.y;
	originalGalleryPositionZ = galleryGroup.position.z;

	// 先にtilt/swayをリセット（座標計算前に必要）
	setMouseMoveEnabled(false);
	resetTiltAndSway();

	// プレーンの円筒内角度 α (ローカル座標から)
	// カメラ正面 (world x=0, world z=+R) に持ってくる回転は β = α - π/2
	const planeAngle = Math.atan2(plane.position.z, plane.position.x);
	const rawTargetY = planeAngle - Math.PI / 2;
	// 最短角度差で回す
	const currentY = galleryGroup.rotation.y;
	const twoPi = Math.PI * 2;
	let diff = (((rawTargetY - currentY) % twoPi) + twoPi) % twoPi;
	if (diff > Math.PI) diff -= twoPi;
	const targetRotationY = currentY + diff;

	// プレーンをビューポートに収めるための距離を計算し、
	// galleryGroup を z 方向に前後させて距離を合わせる (カメラは動かさない)
	const geometry = plane.geometry as THREE.BoxGeometry;
	const params = geometry.parameters;
	const distance = calculateCameraDistance(params.width, params.height);
	const targetPositionZ = camera.position.z - distance - GALLERY.RADIUS;

	orbitControls.enabled = false;

	gsap.to(galleryGroup.rotation, {
		y: targetRotationY,
		duration: DURATION.BASE,
		ease: EASING.TRANSFORM,
	});

	gsap.to(galleryGroup.position, {
		z: targetPositionZ,
		duration: DURATION.BASE,
		ease: EASING.TRANSFORM,
	});

	morphToFlat(plane);

	// パララックスを止め、ボーダーを消す
	const materials = plane.material as THREE.Material[];
	const coverMaterial = materials[4] as THREE.ShaderMaterial;
	gsap.to(coverMaterial.uniforms.uParallaxIntensity, {
		value: 0,
		duration: DURATION.BASE,
		ease: EASING.TRANSFORM,
	});
	gsap.to(coverMaterial.uniforms.uBorderWidth, {
		value: 0,
		duration: DURATION.BASE,
		ease: EASING.TRANSFORM,
	});
	gsap.to(galleryLightFade, {
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
	// galleryGroup を元の姿勢に戻す (カメラは動かさない)
	// unpause は onComplete で行う。tween 中に unpause すると updateGalleryRotation の
	// 内挿 (rotation.y += (targetRotation - rotation.y) * 0.1) が gsap tween と競合して
	// "ぐいっと" 引っ張られる。(onMouseMoveTilt 側は overwrite:"auto" にしたので、
	// rotation.y / position.z の tween は同時に走っていても kill されない)
	gsap.to(galleryGroup.rotation, {
		y: originalGalleryRotationY,
		duration: DURATION.BASE,
		ease: EASING.TRANSFORM,
		onComplete: () => {
			setAutoRotating(true);
			setDragEnabled(true);
			setRotationPaused(false);
		},
	});

	if (activePlane) {
		// パララックスとボーダーを元に戻す
		const materials = activePlane.material as THREE.Material[];
		const coverMaterial = materials[4] as THREE.ShaderMaterial;
		gsap.to(coverMaterial.uniforms.uParallaxIntensity, {
			value: PARALLAX.INTENSITY,
			duration: DURATION.BASE,
			ease: EASING.TRANSFORM,
		});
		gsap.to(coverMaterial.uniforms.uBorderWidth, {
			value: PLANE.DEPTH,
			duration: DURATION.BASE,
			ease: EASING.TRANSFORM,
		});
		gsap.to(galleryLightFade, {
			value: 1,
			duration: DURATION.BASE,
			ease: EASING.TRANSFORM,
		});

		morphToCurved(activePlane);
		activePlane = null;
	}

	setMouseMoveEnabled(true);
	// restoreTiltAndSway は galleryGroup.position を overwrite:true で書き換えるので、
	// 先に呼んでから z を戻す (順序を逆にすると z tween が kill される)
	restoreTiltAndSway();
	gsap.to(galleryGroup.position, {
		z: originalGalleryPositionZ,
		duration: DURATION.BASE,
		ease: EASING.TRANSFORM,
	});
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
