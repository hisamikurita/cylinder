import gsap from "gsap";
import * as THREE from "three";
import { DURATION, EASING, GALLERY, PARALLAX, PLANE } from "./constants";
import { camera, renderer } from "./core";
import { galleryGroup } from "./gallery";
import type { CurvedPlaneData } from "./geometry";
import { volumeLightAlphaFade } from "./lights";
import {
	FLOOR_Y,
	FLOOR_Y_ZOOMED,
	floorMesh,
	reflectionBrightnessFade,
} from "./reflection";
import {
	getIsDragging,
	getWasDragged,
	resetTiltAndSway,
	restoreTiltAndSway,
	setAutoRotating,
	setDragEnabled,
	setMouseMoveEnabled,
	setRotationPaused,
	setTargetRotation,
} from "./rotation";

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

let targetPlanes: THREE.Mesh[] = [];
let isZoomed = false;
let activePlane: THREE.Mesh | null = null;
// zoomOut で position.z を戻すために保存する元の値
// (rotation.y は zoomOut で戻さず、current の位置を保持する)
let originalGalleryPositionZ = 0;

// ホバー波紋: 直前にホバーしていたプレーン (同じプレーン上での連続 mousemove では
// 波紋を再発火させないため、変わり目でのみトリガーする)
let lastHoveredPlane: THREE.Mesh | null = null;

// 隣スライド遷移で zoomOut → zoomIn を繋ぐ待ち時間 (zoomOut の主要 tween 完了後に発火)
const ADJACENT_TRANSITION_DELAY = DURATION.BASE + 0.1;

// zoomOut 後にドラッグを解禁するまでの待ち時間 (0 = 即座, DURATION.BASE = 従来通り)
const DRAG_UNLOCK_DELAY = 0.4;

// zoomIn 後に UI (title/credit/nav) を出すまでの待ち時間
// (プレーンの拡大が進んでから UI を見せることでリズムを整える)
const UI_SHOW_DELAY = 0.8;

export type ZoomState = { active: boolean; index: number | null };
let onZoomChangeCallback: ((state: ZoomState) => void) | null = null;

export const setOnZoomChange = (cb: (state: ZoomState) => void): void => {
	onZoomChangeCallback = cb;
};

const notifyZoomChange = (): void => {
	if (!onZoomChangeCallback) return;
	const index = activePlane ? targetPlanes.indexOf(activePlane) : null;
	onZoomChangeCallback({ active: isZoomed, index });
};

export const closeZoom = (): void => {
	if (!isZoomed) return;
	zoomOut();
};

// zoomIn の rotation を通常より何秒早めるか (0 で従来通り = zoomIn 開始と同時)
const ROTATION_LEAD_TIME = 0.5;

export const zoomToAdjacent = (direction: 1 | -1): void => {
	if (!isZoomed || !activePlane) return;
	const currentIndex = targetPlanes.indexOf(activePlane);
	if (currentIndex === -1) return;
	const nextIndex =
		(currentIndex + direction + targetPlanes.length) % targetPlanes.length;
	const nextPlane = targetPlanes[nextIndex];

	// 次プレーンへの回転先を先に算出 (最短角度差で回す)
	const planeAngle = Math.atan2(nextPlane.position.z, nextPlane.position.x);
	const rawTargetY = planeAngle - Math.PI / 2;
	const currentY = galleryGroup.rotation.y;
	const twoPi = Math.PI * 2;
	let diff = (((rawTargetY - currentY) % twoPi) + twoPi) % twoPi;
	if (diff > Math.PI) diff -= twoPi;
	const targetRotationY = currentY + diff;

	// マスタータイムラインで zoomOut → 早めの rotation → zoomIn を順に発火
	const tl = gsap.timeline();
	tl.call(() => zoomOut(), undefined, 0);
	tl.to(
		galleryGroup.rotation,
		{
			y: targetRotationY,
			duration: DURATION.BASE,
			ease: EASING.TRANSFORM,
			overwrite: "auto",
			// zoomOut 内の DRAG_UNLOCK_DELAY で isRotationPaused=false になった後、
			// updateGalleryRotation の内挿 (rotation.y += (targetRotation - rotation.y)*0.1)
			// が旧 targetRotation に向かって引き戻し、tween 中の rotation.y と競合して
			// カクツキが出るため、毎フレーム targetRotation を同期して打ち消す
			onUpdate: () => setTargetRotation(galleryGroup.rotation.y),
		},
		ADJACENT_TRANSITION_DELAY - ROTATION_LEAD_TIME,
	);
	tl.call(
		() => zoomIn(nextPlane, { skipRotation: true }),
		undefined,
		ADJACENT_TRANSITION_DELAY,
	);
};

// ホバー円のフェード設定
// - uHoverCircle (サイズ): 全期間をゆっくり 0↔1 で動く
// - uHoverAlpha (不透明度): 短めに動いて、抜けはサイズが縮小しきる前に消える
const HOVER_ALPHA_DURATION = 1.0;
// ホバー中に反射のブライトネスへ加算する値 (per-plane)
const HOVER_REFLECTION_BOOST = 2.4;
// ホバー中に emissive へ加算する値
const HOVER_EMISSIVE_BOOST = 1.5;

const fadeHoverCircle = (plane: THREE.Mesh, target: number): void => {
	const materials = plane.material as THREE.Material[];
	const cover = materials[4] as THREE.ShaderMaterial;
	gsap.to(cover.uniforms.uHoverCircle, {
		value: target,
		duration: DURATION.EXTRA_LONG,
		ease: EASING.TRANSFORM,
		overwrite: true,
	});
	gsap.to(cover.uniforms.uHoverAlpha, {
		value: target,
		duration: HOVER_ALPHA_DURATION,
		ease: EASING.MATERIAL,
		overwrite: true,
	});
	gsap.to(cover.uniforms.uReflectionBoost, {
		value: target * HOVER_REFLECTION_BOOST,
		duration: DURATION.BASE,
		ease: EASING.TRANSFORM,
		overwrite: true,
	});
	gsap.to(cover.uniforms.uEmissiveBoost, {
		value: target * HOVER_EMISSIVE_BOOST,
		duration: DURATION.LONG,
		ease: EASING.TRANSFORM,
		overwrite: true,
	});
};

export const setupInteractions = (planes: THREE.Mesh[]): void => {
	targetPlanes = planes;
	renderer.domElement.addEventListener("click", onClick);
	renderer.domElement.addEventListener("mousemove", onHoverMove);
	window.addEventListener("resize", onResize);
};

// 円筒の背面側 (カメラから遠いプレーン) はインタラクション対象外にするための判定
// (背面のプレーンは front 側の隙間から raycaster に拾われることがあるため)
const hitWorldPos = new THREE.Vector3();
const isFrontHalfPlane = (plane: THREE.Object3D): boolean => {
	plane.getWorldPosition(hitWorldPos);
	return hitWorldPos.z > galleryGroup.position.z;
};

// プレーン hover 時のカーソル切り替え。ドラッグ中は galleryRotation 側で
// "grabbing" が設定されているので触らない
const onHoverMove = (event: MouseEvent): void => {
	if (getIsDragging()) return;

	mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
	mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

	raycaster.setFromCamera(mouse, camera);
	const intersects = raycaster.intersectObjects(targetPlanes);
	const front = intersects.find((i) => isFrontHalfPlane(i.object));
	renderer.domElement.style.cursor = front && !isZoomed ? "pointer" : "";

	// プレーンの変わり目でのみ処理: 新しく乗ったプレーンは 1 へフェードイン、
	// 抜けた/切り替わった前のプレーンは 0 へフェードアウト
	const hoveredPlane = (front?.object as THREE.Mesh | undefined) ?? null;
	if (hoveredPlane !== lastHoveredPlane) {
		if (lastHoveredPlane) fadeHoverCircle(lastHoveredPlane, 0);
		if (hoveredPlane && !isZoomed) fadeHoverCircle(hoveredPlane, 1);
		lastHoveredPlane = hoveredPlane;
	}
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
	// 背面側のプレーンは無視する
	const front = intersects.find((i) => isFrontHalfPlane(i.object));
	if (front) {
		zoomIn(front.object as THREE.Mesh);
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

const zoomIn = (
	plane: THREE.Mesh,
	options?: { skipRotation?: boolean },
): void => {
	activePlane = plane;
	// zoomOut で復元するために position.z を保存
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

	const materials = plane.material as THREE.Material[];
	const coverMaterial = materials[4] as THREE.ShaderMaterial;

	// フェーズ 1 (t=0): ライトを落として円筒を正面に回す
	// フェーズ 2 (t=EXPANSION_DELAY): 少し遅らせて拡大 (z 移動 + morph + border/parallax 解除)
	const EXPANSION_DELAY = 0.2;
	const tl = gsap.timeline();
	tl.to(
		volumeLightAlphaFade,
		{ value: 0, duration: DURATION.LONG, ease: EASING.TRANSFORM },
		0,
	);
	tl.to(
		reflectionBrightnessFade,
		{ value: 0, duration: DURATION.LONG, ease: EASING.TRANSFORM },
		0,
	);
	tl.to(
		floorMesh.position,
		{ y: FLOOR_Y_ZOOMED, duration: DURATION.LONG, ease: EASING.TRANSFORM },
		0,
	);
	if (!options?.skipRotation) {
		tl.to(
			galleryGroup.rotation,
			{ y: targetRotationY, duration: DURATION.BASE, ease: EASING.TRANSFORM },
			0,
		);
	}
	tl.to(
		galleryGroup.position,
		{ z: targetPositionZ, duration: DURATION.BASE, ease: EASING.TRANSFORM },
		EXPANSION_DELAY,
	);
	tl.to(
		coverMaterial.uniforms.uParallaxIntensity,
		{ value: 0, duration: DURATION.BASE, ease: EASING.TRANSFORM },
		EXPANSION_DELAY,
	);
	tl.to(
		coverMaterial.uniforms.uBorderWidth,
		{ value: 0, duration: DURATION.BASE, ease: EASING.TRANSFORM },
		EXPANSION_DELAY,
	);
	morphPlane(plane, "flat", EXPANSION_DELAY);

	setAutoRotating(false);
	setDragEnabled(false);
	setRotationPaused(true);
	isZoomed = true;
	// UI 表示は少し遅らせる (拡大アニメが進んでから content を出す)
	gsap.delayedCall(UI_SHOW_DELAY, notifyZoomChange);
};

const zoomOut = (): void => {
	// rotation.y は元に戻さず、current の位置 (クリックしたプレーンが正面) を保持する
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
		gsap.to(volumeLightAlphaFade, {
			value: 1,
			duration: DURATION.EXTRA_LONG,
			ease: EASING.TRANSFORM,
		});
		gsap.to(reflectionBrightnessFade, {
			value: 1,
			duration: DURATION.EXTRA_LONG,
			ease: EASING.TRANSFORM,
		});
		gsap.to(floorMesh.position, {
			y: FLOOR_Y,
			duration: DURATION.LONG,
			ease: EASING.TRANSFORM,
		});

		morphPlane(activePlane, "curved");
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

	// ドラッグは早めに解禁する。targetRotation を先に現在の rotation.y に同期しないと
	// unpause した瞬間、内挿が過去の targetRotation に向かって引っ張ってしまう
	gsap.delayedCall(DRAG_UNLOCK_DELAY, () => {
		setTargetRotation(galleryGroup.rotation.y);
		setDragEnabled(true);
		setRotationPaused(false);
	});

	// オート回転再開は主要 tween が完了してから (途中で回転が始まると z tween 中に
	// 動きが加算されて挙動が読みにくくなる)
	gsap.delayedCall(DURATION.BASE, () => {
		setAutoRotating(true);
	});

	isZoomed = false;
	notifyZoomChange();
};

const morphPlane = (
	plane: THREE.Mesh,
	target: "flat" | "curved",
	delay = 0,
): void => {
	const geometry = plane.geometry as THREE.BoxGeometry;
	const { flatPositions, curvedPositions } =
		geometry.userData as CurvedPlaneData;
	const position = geometry.attributes.position;

	const from = target === "flat" ? curvedPositions : flatPositions;
	const to = target === "flat" ? flatPositions : curvedPositions;

	const progress = { value: 0 };
	gsap.to(progress, {
		value: 1,
		delay,
		duration: DURATION.BASE,
		ease: EASING.TRANSFORM,
		onUpdate: () => {
			const t = progress.value;
			for (let i = 0; i < position.count; i++) {
				const idx = i * 3;
				position.setXYZ(
					i,
					from[idx] + (to[idx] - from[idx]) * t,
					from[idx + 1] + (to[idx + 1] - from[idx + 1]) * t,
					from[idx + 2] + (to[idx + 2] - from[idx + 2]) * t,
				);
			}
			position.needsUpdate = true;
			geometry.computeVertexNormals();
		},
	});
};
