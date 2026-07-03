import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { CAMERA } from "./constants";

export const scene = new THREE.Scene();

export const camera = new THREE.PerspectiveCamera(
	CAMERA.FOV,
	window.innerWidth / window.innerHeight,
	CAMERA.NEAR,
	CAMERA.FAR,
);

camera.position.y = CAMERA.INITIAL_Y;
camera.position.z = CAMERA.INITIAL_Z;

export const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);

export const orbitControls = new OrbitControls(camera, renderer.domElement);
orbitControls.enabled = false;

export const initRenderer = (container: HTMLElement = document.body): void => {
	container.appendChild(renderer.domElement);
};

export const handleResize = (): void => {
	window.addEventListener("resize", () => {
		camera.aspect = window.innerWidth / window.innerHeight;
		camera.updateProjectionMatrix();
		renderer.setSize(window.innerWidth, window.innerHeight);
	});
};

export const startAnimationLoop = (callback?: () => void): void => {
	renderer.setAnimationLoop(() => {
		callback?.();
		orbitControls.update();
		renderer.render(scene, camera);
	});
};
