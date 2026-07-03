import "./style.css";
import {
	createGallery,
	handleResize,
	initRenderer,
	setupGalleryRotation,
	setupHelpers,
	setupInteractions,
	setupLights,
	startAnimationLoop,
	updateGalleryRotation,
	updateParallax,
} from "./webgl";

// レンダラーを初期化
initRenderer();

// ライトとヘルパーをセットアップ
setupLights();
setupHelpers();

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

// リサイズ対応
handleResize();

// アニメーション開始
startAnimationLoop(() => {
	updateGalleryRotation();
	updateParallax(planes);
});
