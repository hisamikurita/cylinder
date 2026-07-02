import { renderer } from "./core";
import { galleryGroup } from "./Gallery";

let isDragging = false;
let wasDragged = false; // ドラッグ操作が行われたかどうか
let isDragEnabled = true; // ドラッグ操作の有効/無効
let isRotationPaused = false; // 回転更新の一時停止
let previousMouseX = 0;
let startMouseX = 0; // ドラッグ開始位置
let autoRotationSpeed = -0.002;
let targetRotation = 0;
let currentVelocity = 0;
let isAutoRotating = true;

const damping = 0.95;
const dragSensitivity = 0.005;
const dragThreshold = 5; // ドラッグ判定の閾値（px）

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
