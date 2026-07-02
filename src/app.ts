import "./style.css";
import {
	createGallery,
	handleResize,
	initRenderer,
	setupHelpers,
	setupLights,
	startAnimationLoop,
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
createGallery(imagePaths);

// リサイズ対応
handleResize();

// アニメーション開始
startAnimationLoop();
