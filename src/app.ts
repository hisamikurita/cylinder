import "./style.css";
import type { MediaItem } from "./webgl";
import {
	createGallery,
	handleResize,
	initRenderer,
	renderWithReflection,
	resizeReflection,
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
} from "./webgl";

// レンダラーを初期化
initRenderer();

// ライトとヘルパーをセットアップ
// setupLights();
// setupHelpers();

// ギャラリーを作成 (V-I-V-I-V-I の交互配置)
const UNSPLASH_PARAMS = "w=2000&h=800&fit=crop&crop=entropy&q=80&auto=format";
const mediaItems: MediaItem[] = [
	// Pexels — Nicola Narracci: neon digital flow
	{
		type: "video",
		url: "https://videos.pexels.com/video-files/34189669/14492116_1920_1080_30fps.mp4",
	},
	// Unsplash — Luca Bravo: panoramic Brooklyn Bridge
	{
		type: "image",
		url: `https://images.unsplash.com/photo-1781099999671-08a6de4f36df?${UNSPLASH_PARAMS}`,
	},
	// Pexels — dynamic abstract light art on dark background
	{
		type: "video",
		url: "https://videos.pexels.com/video-files/37099937/15717077_1920_1080_30fps.mp4",
	},
	// Unsplash — abstract flowing metal ribbon in vivid blue & pink (tKpJZD9WhIA)
	{
		type: "image",
		url: `https://images.unsplash.com/photo-1779878603870-dad73869e4dc?${UNSPLASH_PARAMS}`,
	},
	// Pexels — blue/purple spiral in the dark
	{
		type: "video",
		url: "https://videos.pexels.com/video-files/27873881/12251488_1920_1080_30fps.mp4",
	},
	// Unsplash — Milky Way and mountains reflected in a still lake (HUYPJupBvwE)
	{
		type: "image",
		url: `https://images.unsplash.com/photo-1496588152823-86ff7695e68f?${UNSPLASH_PARAMS}`,
	},
];
const planes = createGallery(mediaItems);

// インタラクションをセットアップ
setupInteractions(planes);

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
