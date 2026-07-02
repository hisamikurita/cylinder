import * as THREE from "three";
import { createCurvedPlaneGeometry } from "./CurvedPlane";
import { scene } from "./core";

export interface GalleryOptions {
	radius: number;
	imageCount: number;
	planeWidth: number;
	planeHeight: number;
	segments: number;
}

const defaultOptions: GalleryOptions = {
	radius: 4,
	imageCount: 6,
	planeWidth: 3.2,
	planeHeight: 1.8, // 16:9
	segments: 32,
};

export function createGallery(
	imagePaths: string[],
	options: Partial<GalleryOptions> = {},
): THREE.Mesh[] {
	const opts = { ...defaultOptions, ...options };
	const textureLoader = new THREE.TextureLoader();
	const planes: THREE.Mesh[] = [];

	for (let i = 0; i < opts.imageCount; i++) {
		const geometry = createCurvedPlaneGeometry(
			opts.planeWidth,
			opts.planeHeight,
			opts.radius,
			opts.segments,
		);

		const texture = textureLoader.load(imagePaths[i]);
		const material = new THREE.MeshStandardMaterial({
			map: texture,
			side: THREE.DoubleSide,
		});

		const plane = new THREE.Mesh(geometry, material);

		// 円形に配置
		const angle = (i / opts.imageCount) * Math.PI * 2;
		plane.position.x = Math.cos(angle) * opts.radius;
		plane.position.z = Math.sin(angle) * opts.radius;
		plane.position.y = 0;

		// 中心を向くように回転
		plane.rotation.y = -angle + Math.PI / 2;

		scene.add(plane);
		planes.push(plane);
	}

	return planes;
}
