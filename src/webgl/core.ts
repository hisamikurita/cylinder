import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

export const scene = new THREE.Scene();

export const camera = new THREE.PerspectiveCamera(
	75,
	window.innerWidth / window.innerHeight,
	0.1,
	1000,
);

camera.position.y = 1.25;
camera.position.z = 7.5;

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
