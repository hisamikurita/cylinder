import * as THREE from "three";
import { GALLERY, PLANE } from "./constants";
import { createCurvedPlaneGeometry } from "./geometry";
import { camera, scene } from "./core";
import {
	createCoverMaterial,
	updateCoverMaterialImageSize,
} from "./material";

export interface GalleryOptions {
	radius: number;
	imageCount: number;
	planeWidth: number;
	planeHeight: number;
	planeDepth: number;
	segments: number;
}

const defaultOptions: GalleryOptions = {
	radius: GALLERY.RADIUS,
	imageCount: GALLERY.IMAGE_COUNT,
	planeWidth: PLANE.WIDTH,
	planeHeight: PLANE.HEIGHT,
	planeDepth: PLANE.DEPTH,
	segments: PLANE.SEGMENTS,
};

export let galleryGroup: THREE.Group;

export const createGallery = (
	imagePaths: string[],
	options: Partial<GalleryOptions> = {},
): THREE.Mesh[] => {
	const opts = { ...defaultOptions, ...options };
	const textureLoader = new THREE.TextureLoader();
	const planes: THREE.Mesh[] = [];

	galleryGroup = new THREE.Group();
	galleryGroup.position.y = GALLERY.OFFSET_Y;

	const sideMaterial = new THREE.MeshBasicMaterial({ color: PLANE.SIDE_COLOR });

	for (let i = 0; i < opts.imageCount; i++) {
		const geometry = createCurvedPlaneGeometry(
			opts.planeWidth,
			opts.planeHeight,
			opts.planeDepth,
			opts.radius,
			opts.segments,
		);

		const texture = textureLoader.load(imagePaths[i], (loadedTexture) => {
			updateCoverMaterialImageSize(
				coverMaterial,
				loadedTexture.image.width,
				loadedTexture.image.height,
			);
		});

		const coverMaterial = createCoverMaterial(
			texture,
			opts.planeWidth,
			opts.planeHeight,
		);

		// BoxGeometry face order: +x, -x, +y, -y, +z (front), -z (back)
		const materials = [
			sideMaterial, // right
			sideMaterial, // left
			sideMaterial, // top
			sideMaterial, // bottom
			coverMaterial, // front (image)
			sideMaterial, // back
		];

		const plane = new THREE.Mesh(geometry, materials);

		// 円形に配置
		const angle = (i / opts.imageCount) * Math.PI * 2;
		plane.position.x = Math.cos(angle) * opts.radius;
		plane.position.z = Math.sin(angle) * opts.radius;
		plane.position.y = 0;

		// 中心を向くように回転
		plane.rotation.y = -angle + Math.PI / 2;

		galleryGroup.add(plane);
		planes.push(plane);
	}

	scene.add(galleryGroup);

	return planes;
};

const worldPosition = new THREE.Vector3();

export const updateParallax = (planes: THREE.Mesh[]): void => {
	if (!galleryGroup) return;

	for (const plane of planes) {
		plane.getWorldPosition(worldPosition);

		// カメラからプレーンへのベクトルのx成分で左右を判定
		const dx = worldPosition.x - camera.position.x;
		const dz = worldPosition.z - camera.position.z;

		// カメラの前方向との角度を計算
		const angle = Math.atan2(dx, dz);

		// -1 ~ 1 にクランプ（角度を正規化）
		const offset = Math.sin(angle);

		const materials = plane.material as THREE.Material[];
		const coverMaterial = materials[4] as THREE.ShaderMaterial;
		coverMaterial.uniforms.uParallaxOffset.value = offset;
	}
};
