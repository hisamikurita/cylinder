import GUI from "lil-gui";
import { scene } from "./core";
import * as THREE from "three";
import {
	BACKGROUND_LIGHT_PARAMS,
	BACKGROUND_LIGHTS,
	EMISSIVE_PARAMS,
	FOG,
	PLANE,
	REFLECTION_PARAMS,
	SCENE,
} from "./constants";
import { updateGalleryEmissive, updateGallerySideColor } from "./Gallery";

// パラメータオブジェクトを constants.ts に貼り付けやすい TS 形式に整形
const COLOR_KEYS = new Set([
	"color",
	"colorL",
	"colorR",
	"backgroundColor",
	"frameColor",
	"BACKGROUND_COLOR",
	"SIDE_COLOR",
	"COLOR",
]);

const formatValue = (key: string, v: unknown, indent: number): string => {
	if (v === null) return "null";
	if (typeof v === "number") {
		if (COLOR_KEYS.has(key)) {
			const hex = Math.max(0, Math.min(0xffffff, Math.floor(v)))
				.toString(16)
				.padStart(6, "0");
			return `0x${hex}`;
		}
		return Number.isInteger(v) ? String(v) : String(Number(v.toFixed(4)));
	}
	if (typeof v === "string") return JSON.stringify(v);
	if (typeof v === "boolean") return String(v);
	if (typeof v === "object") {
		return formatObject(v as Record<string, unknown>, indent + 1);
	}
	return String(v);
};

const formatObject = (
	obj: Record<string, unknown>,
	indent: number,
): string => {
	const pad = "\t".repeat(indent);
	const closingPad = "\t".repeat(indent - 1);
	const lines = Object.entries(obj).map(
		([k, v]) => `${pad}${k}: ${formatValue(k, v, indent)},`,
	);
	return `{\n${lines.join("\n")}\n${closingPad}}`;
};

const formatArray = (arr: unknown[], indent: number): string => {
	const pad = "\t".repeat(indent);
	const closingPad = "\t".repeat(indent - 1);
	const items = arr.map((item) => `${pad}${formatObject(item as Record<string, unknown>, indent + 1)},`);
	return `[\n${items.join("\n")}\n${closingPad}]`;
};

const dumpParams = (): string => {
	const blocks = [
		`export const EMISSIVE_PARAMS = ${formatObject(EMISSIVE_PARAMS, 1)};`,
		`export const REFLECTION_PARAMS = ${formatObject(REFLECTION_PARAMS, 1)};`,
		`export const BACKGROUND_LIGHT_PARAMS = ${formatObject(BACKGROUND_LIGHT_PARAMS, 1)};`,
		`export const BACKGROUND_LIGHTS = ${formatArray(BACKGROUND_LIGHTS, 1)};`,
	];
	return blocks.join("\n\n");
};

export const setupGUI = (): GUI => {
	const gui = new GUI();

	// 現在の GUI 値を constants.ts 形式でコンソール出力＆クリップボードコピー
	const exportActions = {
		export: () => {
			const text = dumpParams();
			console.log(text);
			navigator.clipboard
				?.writeText(text)
				.then(() => console.info("[GUI] Params copied to clipboard"))
				.catch(() => console.warn("[GUI] Clipboard copy failed"));
		},
	};
	gui.add(exportActions, "export").name("Export → console/clipboard");

	// Scene folder
	const sceneFolder = gui.addFolder("Scene");

	const sceneParams = {
		backgroundColor: SCENE.BACKGROUND_COLOR,
	};

	sceneFolder.addColor(sceneParams, "backgroundColor").name("Background").onChange((value: number) => {
		if (scene.background instanceof THREE.Color) {
			scene.background.set(value);
		}
	});

	sceneFolder.open();

	// Fog folder
	const fogFolder = gui.addFolder("Fog");

	const fogParams = {
		color: FOG.COLOR,
		near: FOG.NEAR,
		far: FOG.FAR,
	};

	fogFolder.addColor(fogParams, "color").onChange((value: number) => {
		if (scene.fog instanceof THREE.Fog) {
			scene.fog.color.setHex(value);
		}
	});

	fogFolder.add(fogParams, "near", 0, 20, 0.1).onChange((value: number) => {
		if (scene.fog instanceof THREE.Fog) {
			scene.fog.near = value;
		}
	});

	fogFolder.add(fogParams, "far", 0, 30, 0.1).onChange((value: number) => {
		if (scene.fog instanceof THREE.Fog) {
			scene.fog.far = value;
		}
	});

	fogFolder.open();

	// Plane folder
	const planeFolder = gui.addFolder("Plane");

	const planeParams = {
		frameColor: PLANE.SIDE_COLOR,
	};

	planeFolder.addColor(planeParams, "frameColor").name("Frame Color").onChange((value: number) => {
		updateGallerySideColor(value);
	});

	planeFolder
		.add(EMISSIVE_PARAMS, "intensity", 0, 2, 0.01)
		.name("Emissive")
		.onChange((value: number) => {
			updateGalleryEmissive(value);
		});

	planeFolder.open();

	// Reflection folder
	const reflectionFolder = gui.addFolder("Reflection");

	reflectionFolder
		.add(REFLECTION_PARAMS, "brightness", 0, 1, 0.01)
		.name("Brightness");

	reflectionFolder
		.add(REFLECTION_PARAMS, "blurRadius", 0, 10, 0.1)
		.name("Blur");

	reflectionFolder
		.add(REFLECTION_PARAMS, "waveStrength", 0, 0.3, 0.005)
		.name("Wave Strength");

	reflectionFolder
		.add(REFLECTION_PARAMS, "waveFrequency", 0, 20, 0.1)
		.name("Wave Frequency");

	reflectionFolder
		.add(REFLECTION_PARAMS, "waveSpeed", 0, 2, 0.02)
		.name("Wave Speed");

	reflectionFolder.open();

	// Background Light Common Settings
	const bgCommonFolder = gui.addFolder("BG Light Common");

	bgCommonFolder
		.add(BACKGROUND_LIGHT_PARAMS, "blurRadius", 0, 30, 0.1)
		.name("Blur");

	bgCommonFolder
		.add(BACKGROUND_LIGHT_PARAMS, "use3D")
		.name("Use 3D Mode");

	bgCommonFolder
		.add(BACKGROUND_LIGHT_PARAMS, "clampToViewport")
		.name("Clamp to Viewport");

	bgCommonFolder
		.add(BACKGROUND_LIGHT_PARAMS, "viewportPadding", 0, 0.5, 0.01)
		.name("Viewport Padding");

	bgCommonFolder
		.add(BACKGROUND_LIGHT_PARAMS, "scaleByX")
		.name("Scale by X");

	bgCommonFolder
		.add(BACKGROUND_LIGHT_PARAMS, "scaleMin", 0, 1, 0.01)
		.name("Scale Min (左端)");

	bgCommonFolder
		.add(BACKGROUND_LIGHT_PARAMS, "scaleMax", 1, 5, 0.1)
		.name("Scale Max (右端)");

	bgCommonFolder.open();

	// 各ライトのフォルダを作成
	const createLightFolder = (index: number, name: string) => {
		const light = BACKGROUND_LIGHTS[index];
		const folder = gui.addFolder(name);

		folder.add(light, "enabled").name("Enabled");
		folder.addColor(light, "colorL").name("Color");
		folder.add(light, "intensity", 0, 3, 0.05).name("Intensity");
		folder.add(light, "radiusX", 0, 2, 0.01).name("Radius X");
		folder.add(light, "radiusY", 0, 2, 0.01).name("Radius Y");
		folder.add(light, "angleL", -180, 180, 1).name("Angle");
		folder.add(light, "biasL", -1, 1, 0.01).name("Bias");
		folder.add(light, "biasRangeL", 0.1, 1, 0.01).name("Bias Range");
		folder.add(light, "spreadL", -1, 1, 0.01).name("Spread");
		folder.add(light, "falloff", 0.5, 6, 0.1).name("Falloff");

		// 3D Position
		const posFolder = folder.addFolder("Position 3D");
		posFolder.add(light.pos3D, "x", -15, 15, 0.1).name("X");
		posFolder.add(light.pos3D, "y", -10, 10, 0.1).name("Y");
		posFolder.add(light.pos3D, "z", -10, 15, 0.1).name("Z");
		posFolder.open();

		// Spotlight Direction
		const spotFolder = folder.addFolder("Spot Direction");
		spotFolder.add(light, "spotAngleX", -180, 180, 1).name("Angle X");
		spotFolder.add(light, "spotAngleY", -180, 180, 1).name("Angle Y");
		spotFolder.add(light, "spotConeAngle", 10, 120, 1).name("Cone Angle");
		spotFolder.open();

		// 2D Position
		const pos2DFolder = folder.addFolder("Position 2D");
		pos2DFolder.add(light.posL, "x", 0, 1, 0.01).name("X");
		pos2DFolder.add(light.posL, "y", 0, 1, 0.01).name("Y");
		pos2DFolder.close();

		return folder;
	};

	const light1Folder = createLightFolder(0, "Light 1 (Main)");
	light1Folder.open();

	const light2Folder = createLightFolder(1, "Light 2");
	light2Folder.close();

	const light3Folder = createLightFolder(2, "Light 3");
	light3Folder.close();

	return gui;
};
