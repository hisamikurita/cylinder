import * as THREE from "three";
import { CAMERA, FOG, SCENE } from "./constants";

export const scene = new THREE.Scene();
scene.background = new THREE.Color(SCENE.BACKGROUND_COLOR);
scene.fog = new THREE.Fog(FOG.COLOR, FOG.NEAR, FOG.FAR);

export const camera = new THREE.PerspectiveCamera(
	CAMERA.FOV,
	window.innerWidth / window.innerHeight,
	CAMERA.NEAR,
	CAMERA.FAR,
);

camera.position.y = CAMERA.INITIAL_Y;
camera.position.z = CAMERA.INITIAL_Z;

export const renderer = new THREE.WebGLRenderer({
	antialias: true,
	stencil: true,
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);

export const initRenderer = (container: HTMLElement = document.body): void => {
	container.appendChild(renderer.domElement);
};

export const handleResize = (onResize?: () => void): void => {
	window.addEventListener("resize", () => {
		camera.aspect = window.innerWidth / window.innerHeight;
		camera.updateProjectionMatrix();
		renderer.setSize(window.innerWidth, window.innerHeight);
		onResize?.();
	});
};

export const startAnimationLoop = (
	update: () => void,
	render: () => void,
): void => {
	renderer.setAnimationLoop(() => {
		update();
		render();
	});
};
