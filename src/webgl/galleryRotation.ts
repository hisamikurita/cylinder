import gsap from "gsap";
import { DURATION, EASING, GALLERY, ROTATION } from "./constants";
import { renderer } from "./core";
import { galleryGroup } from "./Gallery";
import { resetFloorTilt, tiltFloor } from "./reflection";

let isDragging = false;
let wasDragged = false; // ドラッグ操作が行われたかどうか
let isDragEnabled = true; // ドラッグ操作の有効/無効
let isRotationPaused = false; // 回転更新の一時停止
let previousMouseX = 0;
let startMouseX = 0; // ドラッグ開始位置
let autoRotationSpeed: number = ROTATION.AUTO_SPEED;
let targetRotation = 0;
let currentVelocity = 0;
let isAutoRotating = true;
let isMouseMoveEnabled = true;

const damping = ROTATION.DAMPING;
const dragSensitivity = ROTATION.DRAG_SENSITIVITY;
const dragThreshold = ROTATION.DRAG_THRESHOLD;

export const setupGalleryRotation = (): void => {
	const canvas = renderer.domElement;

	canvas.addEventListener("mousedown", onMouseDown);
	canvas.addEventListener("mousemove", onMouseMove);
	canvas.addEventListener("mouseup", onMouseUp);
	canvas.addEventListener("mouseleave", onMouseUp);

	// タッチ対応
	canvas.addEventListener("touchstart", onTouchStart);
	canvas.addEventListener("touchmove", onTouchMove);
	canvas.addEventListener("touchend", onTouchEnd);

	// Tilt用のmousemove（常時）
	window.addEventListener("mousemove", onMouseMoveTilt);
};

const onMouseMoveTilt = (event: MouseEvent): void => {
	if (!galleryGroup || !isMouseMoveEnabled) return;

	// 最下部で TILT_MIN、最上部で TILT_MAX
	const normalizedY = 1 - event.clientY / window.innerHeight;
	const targetTiltX =
		GALLERY.TILT_MIN + normalizedY * (GALLERY.TILT_MAX - GALLERY.TILT_MIN);

	// 左端で -SWAY_X、右端で +SWAY_X
	const normalizedX = (event.clientX / window.innerWidth) * 2 - 1;
	const targetPosX = normalizedX * GALLERY.SWAY_X;

	// overwrite:"auto" にすることで、同じプロパティ (rotation.x / position.x) の
	// 過去 tween だけを kill する。他プロパティ (rotation.y や position.z) の tween
	// (zoomOut などで動作中) は生かしたまま tilt/sway を上書きできる
	gsap.to(galleryGroup.rotation, {
		x: targetTiltX,
		duration: DURATION.BASE,
		ease: "power1.out",
		overwrite: "auto",
	});

	gsap.to(galleryGroup.position, {
		x: targetPosX,
		duration: DURATION.BASE,
		ease: "power1.out",
		overwrite: "auto",
	});

	// 円筒と一緒に床も傾ける (床は初期 rotation.x = -PI/2)
	tiltFloor(targetTiltX);
};

const onMouseDown = (event: MouseEvent): void => {
	if (!isDragEnabled) return;
	isDragging = true;
	wasDragged = false; // 新しいドラッグ操作開始時にリセット
	isAutoRotating = false;
	startMouseX = event.clientX;
	previousMouseX = event.clientX;
	currentVelocity = 0;
	renderer.domElement.style.cursor = "grabbing";
};

const onMouseMove = (event: MouseEvent): void => {
	if (!isDragging) return;

	// 閾値を超えたらドラッグとみなす
	if (Math.abs(event.clientX - startMouseX) > dragThreshold) {
		wasDragged = true;
	}

	const deltaX = event.clientX - previousMouseX;
	currentVelocity = deltaX * dragSensitivity;
	targetRotation += currentVelocity;
	previousMouseX = event.clientX;
};

const onMouseUp = (): void => {
	isDragging = false;
	renderer.domElement.style.cursor = "";
	if (!isDragEnabled) return;
	isAutoRotating = true;
};

const onTouchStart = (event: TouchEvent): void => {
	if (!isDragEnabled) return;
	if (event.touches.length === 1) {
		isDragging = true;
		wasDragged = false; // 新しいタッチ操作開始時にリセット
		isAutoRotating = false;
		startMouseX = event.touches[0].clientX;
		previousMouseX = event.touches[0].clientX;
		currentVelocity = 0;
	}
};

const onTouchMove = (event: TouchEvent): void => {
	if (!isDragging || event.touches.length !== 1) return;

	// 閾値を超えたらドラッグとみなす
	if (Math.abs(event.touches[0].clientX - startMouseX) > dragThreshold) {
		wasDragged = true;
	}

	const deltaX = event.touches[0].clientX - previousMouseX;
	currentVelocity = deltaX * dragSensitivity;
	targetRotation += currentVelocity;
	previousMouseX = event.touches[0].clientX;
};

const onTouchEnd = (): void => {
	isDragging = false;
	if (!isDragEnabled) return;
	isAutoRotating = true;
};

export const updateGalleryRotation = (): void => {
	if (!galleryGroup || isRotationPaused) return;

	if (isAutoRotating) {
		// 自動回転
		targetRotation += autoRotationSpeed;
	} else if (!isDragging) {
		// 慣性
		currentVelocity *= damping;
		targetRotation += currentVelocity;
	}

	// スムーズに目標回転に近づける
	galleryGroup.rotation.y += (targetRotation - galleryGroup.rotation.y) * 0.1;
};

export const setAutoRotationSpeed = (speed: number): void => {
	autoRotationSpeed = speed;
};

export const getIsDragging = (): boolean => isDragging;

export const getWasDragged = (): boolean => wasDragged;

export const setAutoRotating = (value: boolean): void => {
	isAutoRotating = value;
};

export const setDragEnabled = (value: boolean): void => {
	isDragEnabled = value;
};

export const setRotationPaused = (value: boolean): void => {
	isRotationPaused = value;
};

export const setMouseMoveEnabled = (value: boolean): void => {
	isMouseMoveEnabled = value;
};

export const resetTiltAndSway = (): void => {
	if (!galleryGroup) return;

	gsap.to(galleryGroup.rotation, {
		x: 0,
		duration: DURATION.BASE,
		ease: EASING.TRANSFORM,
		overwrite: true,
	});

	gsap.to(galleryGroup.position, {
		x: 0,
		y: 0,
		duration: DURATION.BASE,
		ease: EASING.TRANSFORM,
		overwrite: true,
	});

	// 床の tilt も一緒に初期状態に戻す
	resetFloorTilt();
};

export const restoreTiltAndSway = (): void => {
	if (!galleryGroup) return;

	gsap.to(galleryGroup.position, {
		y: GALLERY.OFFSET_Y,
		duration: DURATION.BASE,
		ease: EASING.TRANSFORM,
		overwrite: true,
	});
};
