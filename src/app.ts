import "./style.css";
import {
	createGallery,
	handleResize,
	initRenderer,
	renderWithReflection,
	resizeAtmosphere,
	resizeReflection,
	setupAtmosphere,
	setupGalleryRotation,
	setupGUI,
	setupInteractions,
	setupReflection,
	startAnimationLoop,
	updateFloorLightUniforms,
	updateGalleryLightUniforms,
	updateGalleryRotation,
	updateParallax,
} from "./webgl";

// レンダラーを初期化
initRenderer();

// ライトとヘルパーをセットアップ
// setupLights();
// setupHelpers();

// ギャラリーを作成
const imagePaths = Array.from(
	{ length: 6 },
	(_, i) => `/sample-img-0${i + 1}.jpg`,
);
const planes = createGallery(imagePaths);

// インタラクションをセットアップ
setupInteractions(planes);

// ギャラリー回転をセットアップ
setupGalleryRotation();

// 鏡面反射をセットアップ
setupReflection();

// 背景の色付きライトをセットアップ
setupAtmosphere();

// intensity を 0.2〜0.55 でループアニメーション（各サイクル 1.5〜3.8 秒のランダム）
// startAtmosphereIntensityAnimation(0.2, 0.55, 1.5, 3.8);

// GUIをセットアップ
setupGUI();

// リサイズ対応
handleResize(() => {
	resizeReflection();
	resizeAtmosphere();
});

// アニメーション開始
startAnimationLoop(
	() => {
		updateGalleryRotation();
		updateParallax(planes);
		updateGalleryLightUniforms();
		updateFloorLightUniforms();
	},
	() => renderWithReflection(),
);
