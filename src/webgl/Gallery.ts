import * as THREE from "three";
import {
	BACKGROUND_LIGHTS,
	EMISSIVE_PARAMS,
	GALLERY,
	PARALLAX,
	PLANE,
	VIGNETTE_PARAMS,
} from "./constants";
import { camera, scene } from "./core";
import { createCurvedPlaneGeometry } from "./geometry";
import { createCoverMaterial, updateCoverMaterialImageSize } from "./material";

export type MediaItem = (
	| { type: "image"; url: string }
	| { type: "video"; url: string; targetAspect?: number }
) & {
	title: string;
	source: {
		label: string; // 例: "Unsplash — Luca Bravo"
		url: string; // 出典先ページの URL
	};
};

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
export let gallerySideMaterial: THREE.MeshBasicMaterial;
export let galleryPlanes: THREE.Mesh[] = [];

const createVideoTexture = (
	url: string,
	onReady: (width: number, height: number) => void,
): THREE.VideoTexture => {
	const video = document.createElement("video");
	video.src = url;
	video.crossOrigin = "anonymous";
	video.loop = true;
	video.muted = true;
	video.playsInline = true;
	video.autoplay = true;
	// loadedmetadata では寸法は取れるが最初のフレームがまだ無いことがあり、
	// uTextureLoaded=1 にすると一瞬ゴミフレームが見える。loadeddata (最初の
	// フレームが利用可能) を待って初めて下地 #000 を解除する
	video.addEventListener("loadeddata", () => {
		onReady(video.videoWidth, video.videoHeight);
	});
	// ユーザー操作前でも autoplay できるよう明示的に play を呼ぶ (muted なので許可される)
	void video.play().catch(() => {
		/* autoplay ブロック時はサイレントに握りつぶす */
	});

	const texture = new THREE.VideoTexture(video);
	texture.colorSpace = THREE.SRGBColorSpace;
	return texture;
};

export const createGallery = (
	items: MediaItem[],
	options: Partial<GalleryOptions> = {},
	onEachLoaded?: () => void,
): THREE.Mesh[] => {
	const opts = { ...defaultOptions, ...options };
	const textureLoader = new THREE.TextureLoader();
	const planes: THREE.Mesh[] = [];

	galleryGroup = new THREE.Group();
	galleryGroup.position.y = GALLERY.OFFSET_Y;
	galleryGroup.position.z = GALLERY.OFFSET_Z;

	gallerySideMaterial = new THREE.MeshBasicMaterial({
		color: PLANE.SIDE_COLOR,
	});
	const sideMaterial = gallerySideMaterial;

	for (let i = 0; i < opts.imageCount; i++) {
		const geometry = createCurvedPlaneGeometry(
			opts.planeWidth,
			opts.planeHeight,
			opts.planeDepth,
			opts.radius,
			opts.segments,
		);

		const item = items[i];
		const texture =
			item.type === "video"
				? createVideoTexture(item.url, (w, h) => {
						updateCoverMaterialImageSize(coverMaterial, w, h);
						onEachLoaded?.();
					})
				: textureLoader.load(item.url, (loadedTexture) => {
						updateCoverMaterialImageSize(
							coverMaterial,
							loadedTexture.image.width,
							loadedTexture.image.height,
						);
						onEachLoaded?.();
					});

		const coverMaterial = createCoverMaterial(
			texture,
			opts.planeWidth,
			opts.planeHeight,
		);
		if (item.type === "video") {
			coverMaterial.uniforms.uTargetAspect.value =
				item.targetAspect ?? PARALLAX.VIDEO_TARGET_ASPECT;
		}
		// プレーンごとに固有の seed を割り当てて波の位相をずらす
		coverMaterial.uniforms.uWaveSeed.value = i * 0.3731 + Math.random() * 0.1;

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

	galleryPlanes = planes;
	return planes;
};

export const updateGallerySideColor = (color: number): void => {
	if (gallerySideMaterial) {
		gallerySideMaterial.color.setHex(color);
	}
	for (const plane of galleryPlanes) {
		const materials = plane.material as THREE.Material[];
		const coverMaterial = materials[4] as THREE.ShaderMaterial;
		if (coverMaterial.uniforms.uBorderColor) {
			coverMaterial.uniforms.uBorderColor.value.setHex(color);
		}
	}
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

		// 手前中央 (worldX ≈ 0) を center、手前の左右 (|worldX| ≈ RADIUS) を edge
		// で線形補間して emissive を決める
		const normalizedX = THREE.MathUtils.clamp(
			Math.abs(worldPosition.x) / GALLERY.RADIUS,
			0,
			1,
		);
		const t = 1 - normalizedX; // 1 = 真ん中, 0 = 左右端
		const emissive =
			EMISSIVE_PARAMS.edge +
			(EMISSIVE_PARAMS.center - EMISSIVE_PARAMS.edge) * t;

		const materials = plane.material as THREE.Material[];
		const coverMaterial = materials[4] as THREE.ShaderMaterial;
		coverMaterial.uniforms.uParallaxOffset.value = offset;
		// ホバー加算 (uEmissiveBoost) を上乗せ (gsap でトゥイーンされる)
		const emissiveBoost = coverMaterial.uniforms.uEmissiveBoost.value as number;
		coverMaterial.uniforms.uEmissive.value = emissive + emissiveBoost;
		coverMaterial.uniforms.uVignetteStrength.value = VIGNETTE_PARAMS.strength;
		coverMaterial.uniforms.uVignettePower.value = VIGNETTE_PARAMS.power;
		coverMaterial.uniforms.uVignetteColor.value.setHex(VIGNETTE_PARAMS.color);
	}
};

export const updateGalleryLightUniforms = (): void => {
	// 最初のライト（メインライト）を使用
	const light = BACKGROUND_LIGHTS[0];
	const pos3D = light.pos3D;
	const lightPos = new THREE.Vector3(pos3D.x, pos3D.y, pos3D.z);
	const lightColor = new THREE.Color(light.colorL);

	// アングルからスポットライト方向を計算
	const angleX = THREE.MathUtils.degToRad(light.spotAngleX);
	const angleY = THREE.MathUtils.degToRad(light.spotAngleY);
	const lightDir = new THREE.Vector3(0, 0, -1); // 基本方向: 前方
	lightDir.applyAxisAngle(new THREE.Vector3(1, 0, 0), angleX); // X軸回転（上下）
	lightDir.applyAxisAngle(new THREE.Vector3(0, 1, 0), angleY); // Y軸回転（左右）
	lightDir.normalize();

	for (const plane of galleryPlanes) {
		const materials = plane.material as THREE.Material[];
		const cover = materials[4] as THREE.ShaderMaterial;
		if (cover.uniforms.uLightPos) {
			cover.uniforms.uLightPos.value.copy(lightPos);
		}
		if (cover.uniforms.uLightDir) {
			cover.uniforms.uLightDir.value.copy(lightDir);
		}
		if (cover.uniforms.uLightConeAngle) {
			cover.uniforms.uLightConeAngle.value = light.spotConeAngle;
		}
		if (cover.uniforms.uLightColor) {
			cover.uniforms.uLightColor.value.copy(lightColor);
		}
		if (cover.uniforms.uLightIntensity) {
			cover.uniforms.uLightIntensity.value = light.enabled
				? light.intensity
				: 0;
		}
		if (cover.uniforms.uCameraPos) {
			cover.uniforms.uCameraPos.value.copy(camera.position);
		}
	}
};
