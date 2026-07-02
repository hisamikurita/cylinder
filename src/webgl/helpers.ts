import * as THREE from "three";
import { scene } from "./core";

export function setupHelpers(): void {
	scene.add(new THREE.GridHelper(5000, 100));
	scene.add(new THREE.AxesHelper(500));
}
