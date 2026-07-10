import gsap from "gsap";
import * as THREE from "three";
import "./style.css";
import { hideZoomUI, setupZoomUI, showZoomUI } from "./ui";
import type { MediaItem } from "./webgl";
import {
	CAMERA,
	camera,
	closeZoom,
	createGallery,
	DURATION,
	EASING,
	floorAlphaFade,
	FOG,
	GALLERY,
	galleryPlanes,
	gallerySideMaterial,
	handleResize,
	initRenderer,
	PLANE,
	reflectionBrightnessFade,
	renderWithReflection,
	resizeReflection,
	ROTATION,
	scene,
	setAutoRotationSpeed,
	setOnZoomChange,
	setupBackgroundLightHelpers,
	setupGalleryRotation,
	setupGUI,
	setupInteractions,
	setupReflection,
	startAnimationLoop,
	updateBackgroundLightHelpers,
	updateFloorLightUniforms,
	updateGalleryLightUniforms,
	updateGalleryRotation,
	updateGallerySideColor,
	updateParallax,
	volumeLightAlphaFade,
	zoomToAdjacent,
} from "./webgl";

// レンダラーを初期化
initRenderer();

// === モバイル判定 & サイズ調整 ===
// スマホ幅ではプレーンとギャラリー半径を少し縮小して、狭いビューポートに収まるようにする
const IS_MOBILE = window.matchMedia("(max-width: 768px)").matches;
const MOBILE_SCALE = 0.75;
if (IS_MOBILE) {
	// PLANE / GALLERY は `as const` で readonly だが、runtime では書き換えできるので
	// 型アサーションで縮小値を注入する
	// (interactions.ts / reflection.ts など runtime で参照する箇所も追従する)
	const p = PLANE as unknown as { WIDTH: number; HEIGHT: number };
	p.WIDTH = PLANE.WIDTH * MOBILE_SCALE;
	p.HEIGHT = PLANE.HEIGHT * MOBILE_SCALE;
	const g = GALLERY as unknown as { RADIUS: number };
	g.RADIUS = GALLERY.RADIUS * MOBILE_SCALE;
	// モバイルは自動回転速度を 1.2 倍に (小さい画面でも動きを感じられるよう)
	setAutoRotationSpeed(ROTATION.AUTO_SPEED * 1.2);
}

// === LOADING 初期状態 ===
// 真上から円筒を見下ろすアングルにして、フレーム色を白、ライト・反射を off にする。
// FOV も一時的に狭く (望遠寄り) して、より平面的なトップダウンビューに。
// テクスチャ/動画が全てロードされたら finishLoading() で通常状態へトランジション
const LOADING_CAMERA_Y = 36;
const LOADING_FOV = 40;
// fog.far がデフォルト値 (11.5) だと真上ビューではカメラから遠すぎて白フレームまで
// フォグに沈む。ロード中は far を大きく取って fog をほぼ効かないようにする
// (カメラ Y=36 から見た距離 ≈35 に対して factor が 0.15 以下に収まる値)
const LOADING_FOG_FAR = 200;
camera.position.set(0, LOADING_CAMERA_Y, 0);
camera.rotation.set(-Math.PI / 2, 0, 0);
camera.fov = LOADING_FOV;
camera.updateProjectionMatrix();
if (scene.fog instanceof THREE.Fog) {
	scene.fog.far = LOADING_FOG_FAR;
}
volumeLightAlphaFade.value = 0;
reflectionBrightnessFade.value = 0;
// 床全体の alpha も 0 (完全に見えない) から reveal で 1 へフェード
floorAlphaFade.value = 0;

// ギャラリーを作成 (V-I-V-I-V-I の交互配置)
const UNSPLASH_PARAMS = "w=2000&h=800&fit=crop&crop=entropy&q=80&auto=format";
const mediaItems: MediaItem[] = [
	{
		type: "video",
		url: "https://videos.pexels.com/video-files/34189669/14492116_1920_1080_30fps.mp4",
		title: "Abstract Wavy Digital Grid with Floating Particles",
		source: {
			label: "Pexels — Nicola Narracci",
			url: "https://www.pexels.com/video/abstract-wavy-digital-grid-with-floating-particles-34189669/",
		},
	},
	{
		type: "image",
		url: `https://images.unsplash.com/photo-1465101162946-4377e57745c3?${UNSPLASH_PARAMS}`,
		title: "The stars and galaxy as seen from Rocky Mountain National Park",
		source: {
			label: "Unsplash — Jeremy Thomas",
			url: "https://unsplash.com/photos/4dpAqfTbvKA",
		},
	},
	{
		type: "video",
		url: "https://videos.pexels.com/video-files/37099937/15717077_1920_1080_30fps.mp4",
		title: "Dynamic Abstract Light Art on Dark Background",
		source: {
			label: "Pexels — Nicola Narracci",
			url: "https://www.pexels.com/video/dynamic-abstract-light-art-on-dark-background-37099937/",
		},
	},
	{
		type: "image",
		url: `https://images.unsplash.com/photo-1779878603870-dad73869e4dc?${UNSPLASH_PARAMS}`,
		title: "Abstract flowing metallic ribbons in vibrant blue and pink",
		source: {
			label: "Unsplash — Johnn Berley",
			url: "https://unsplash.com/photos/tKpJZD9WhIA",
		},
	},
	{
		type: "video",
		url: "https://videos.pexels.com/video-files/27873881/12251488_1920_1080_30fps.mp4",
		title: "A blue and purple spiral in the dark",
		source: {
			label: "Pexels — Nicola Narracci",
			url: "https://www.pexels.com/video/a-blue-and-purple-spiral-in-the-dark-27873881/",
		},
	},
	{
		type: "image",
		url: `https://images.unsplash.com/photo-1496588152823-86ff7695e68f?${UNSPLASH_PARAMS}`,
		title: "Milky way and mountains reflected in a serene lake",
		source: {
			label: "Unsplash — Pascal Debrunner",
			url: "https://unsplash.com/photos/HUYPJupBvwE",
		},
	},
];
// メディア load 完了カウント。全部揃ったら finishLoading を発火
// (createGallery の default options は Gallery.ts の import 時点でキャプチャされて
// いるので、モバイル縮小後の PLANE/GALLERY を確実に反映させるため明示的に渡す)
let loadedMediaCount = 0;
const planes = createGallery(
	mediaItems,
	{
		planeWidth: PLANE.WIDTH,
		planeHeight: PLANE.HEIGHT,
		radius: GALLERY.RADIUS,
	},
	() => {
		loadedMediaCount++;
		if (loadedMediaCount >= mediaItems.length) {
			finishLoading();
		}
	},
);

// フレーム (プレーン側面 + ボーダー) を白でスタート
updateGallerySideColor(0xffffff);

// zoom UI (タイトル/出典/前後スライド/戻る) をセットアップして zoom 状態と連動させる。
// setupInteractions / setupGalleryRotation はマウス系のイベントリスナーを張るので、
// ロード完了 (= reveal 完了) を待って finishLoading の末尾で呼び出す
setupZoomUI({
	onPrev: () => zoomToAdjacent(-1),
	onNext: () => zoomToAdjacent(1),
	onClose: () => closeZoom(),
});
setOnZoomChange(({ active, index }) => {
	if (active && index !== null) {
		showZoomUI(mediaItems[index]);
	} else {
		hideZoomUI();
	}
});

// 鏡面反射をセットアップ
setupReflection();

// 背景ライトの方向を可視化するヘルパー
setupBackgroundLightHelpers();

// GUIをセットアップ
setupGUI();

// リサイズ対応
handleResize(() => {
	resizeReflection();
});

// アニメーション開始
startAnimationLoop(
	() => {
		updateGalleryRotation();
		updateParallax(planes);
		updateGalleryLightUniforms();
		updateFloorLightUniforms();
		updateBackgroundLightHelpers();
	},
	() => renderWithReflection(),
);

// === LOADING 完了時のトランジション ===
// 全メディアがロード完了した時に発火して、カメラ・フレーム色・ライトを通常状態へ
function finishLoading(): void {
	const REVEAL_DURATION = 2.5;

	// カメラ Y (降下) はすぐ開始
	gsap.to(camera.position, {
		y: CAMERA.INITIAL_Y,
		duration: REVEAL_DURATION,
		ease: EASING.TRANSFORM,
	});
	// 「正面を向く」アニメ (Z 前進 + rotation.x 起こし) は少し遅らせる。
	// 先に降下してから立ち上がる流れになる
	const FACE_FORWARD_DELAY = 0.40;
	gsap.to(camera.position, {
		z: CAMERA.INITIAL_Z,
		delay: FACE_FORWARD_DELAY,
		duration: REVEAL_DURATION,
		ease: EASING.TRANSFORM,
	});
	gsap.to(camera.rotation, {
		x: 0,
		delay: FACE_FORWARD_DELAY,
		duration: REVEAL_DURATION,
		ease: EASING.TRANSFORM,
	});
	// FOV を望遠寄り (LOADING_FOV) → 通常の CAMERA.FOV に戻す。
	// PerspectiveCamera は fov を書き換えても updateProjectionMatrix()
	// を呼ぶまで反映されないので onUpdate で毎フレーム更新する
	gsap.to(camera, {
		fov: CAMERA.FOV,
		duration: REVEAL_DURATION,
		ease: EASING.TRANSFORM,
		onUpdate: () => camera.updateProjectionMatrix(),
	});

	// フォグの far を通常値へ戻す (ロード中は白フレームまで見せるために遠ざけていた)
	// 正面を向くアニメと同時にしたいので同じ delay を掛ける
	if (scene.fog instanceof THREE.Fog) {
		gsap.to(scene.fog, {
			far: FOG.FAR,
			delay: FACE_FORWARD_DELAY,
			duration: REVEAL_DURATION,
			ease: EASING.TRANSFORM,
		});
	}

	// フレーム色を白 → 030303 (RGB proxy を tween して onUpdate で反映)
	const colorProxy = new THREE.Color(0xffffff);
	const targetColor = new THREE.Color(PLANE.SIDE_COLOR);
	gsap.to(colorProxy, {
		r: targetColor.r,
		g: targetColor.g,
		b: targetColor.b,
		duration: 2.1,
		ease: EASING.TRANSFORM,
		onUpdate: () => {
			gallerySideMaterial.color.copy(colorProxy);
			for (const plane of galleryPlanes) {
				const cover = (plane.material as THREE.Material[])[4] as THREE.ShaderMaterial;
				cover.uniforms.uBorderColor.value.copy(colorProxy);
			}
		},
	});

	// ライトを点灯 (volume light の柱と反射のブライトネスを 0 → 1)
	// 「正面を向く」アニメと同時に始めたいので同じ delay を掛ける
	gsap.to(volumeLightAlphaFade, {
		value: 1,
		delay: FACE_FORWARD_DELAY + 1.2,
		duration: DURATION.LONG,
		ease: EASING.TRANSFORM,
	});
	gsap.to(reflectionBrightnessFade, {
		value: 1,
		delay: FACE_FORWARD_DELAY + 1.2,
		duration: DURATION.LONG,
		ease: EASING.TRANSFORM,
	});
	// 床全体の alpha を 0 → 1 へ (reflection と同じタイミング)
	gsap.to(floorAlphaFade, {
		value: 1,
		delay: FACE_FORWARD_DELAY,
		duration: DURATION.EXTRA_LONG,
		ease: EASING.TRANSFORM,
	});

	// 「正面を向く」アニメが始まるタイミングでマウス系インタラクションを解禁
	// (mouse tilt / sway, ドラッグ回転, クリックでズーム, ホバー円/リップル)
	gsap.delayedCall(FACE_FORWARD_DELAY, () => {
		setupInteractions(planes);
		setupGalleryRotation();
	});
}
