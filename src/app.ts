import "./style.css";
import { applyLoadingState, finishLoading } from "./app/loading";
import { mediaItems } from "./app/mediaItems";
import { applyMobileAdjustments } from "./app/mobile";
import { hideZoomUI, setupZoomUI, showZoomUI } from "./app/ui";
import {
	closeZoom,
	createGallery,
	GALLERY,
	handleResize,
	initRenderer,
	PLANE,
	renderWithReflection,
	resizeReflection,
	setOnZoomChange,
	setupBackgroundLightHelpers,
	setupGUI,
	setupReflection,
	startAnimationLoop,
	updateBackgroundLightHelpers,
	updateFloorLightUniforms,
	updateGalleryLightUniforms,
	updateGalleryRotation,
	updateGallerySideColor,
	updateParallax,
	zoomToAdjacent,
} from "./webgl";

initRenderer();
applyMobileAdjustments();
applyLoadingState();

// createGallery の default options は Gallery.ts の import 時点でキャプチャされて
// いるので、モバイル縮小後の PLANE/GALLERY を確実に反映させるため明示的に渡す
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
			finishLoading(planes);
		}
	},
);

// フレーム (プレーン側面 + ボーダー) を白でスタート
updateGallerySideColor(0xffffff);

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

setupReflection();
setupBackgroundLightHelpers();
// setupGUI();

handleResize(() => resizeReflection());

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
