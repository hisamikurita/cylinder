import "./style.css";
import { hideZoomUI, setupZoomUI, showZoomUI } from "./ui";
import type { MediaItem } from "./webgl";
import {
	closeZoom,
	createGallery,
	handleResize,
	initRenderer,
	renderWithReflection,
	resizeReflection,
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
	updateParallax,
	zoomToAdjacent,
} from "./webgl";

// レンダラーを初期化
initRenderer();

// ライトとヘルパーをセットアップ
// setupLights();
// setupHelpers();

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
const planes = createGallery(mediaItems);

// インタラクションをセットアップ
setupInteractions(planes);

// zoom UI (タイトル/出典/前後スライド/戻る) をセットアップして zoom 状態と連動させる
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

// ギャラリー回転をセットアップ
setupGalleryRotation();

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
