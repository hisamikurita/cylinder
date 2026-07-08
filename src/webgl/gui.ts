import GUI from "lil-gui";
import * as THREE from "three";
import {
	BACKGROUND_LIGHTS,
	EMISSIVE_PARAMS,
	FLOOR_PARAMS,
	FOG,
	PLANE,
	REFLECTION_PARAMS,
	SCENE,
	VIGNETTE_PARAMS,
	VOLUME_LIGHT_PARAMS,
} from "./constants";
import { scene } from "./core";
import { updateGallerySideColor } from "./Gallery";

// パラメータオブジェクトを constants.ts に貼り付けやすい TS 形式に整形
const COLOR_KEYS = new Set([
	"color",
	"colorL",
	"colorR",
	"backgroundColor",
	"frameColor",
	"noiseColor",
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

const formatObject = (obj: Record<string, unknown>, indent: number): string => {
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
	const items = arr.map(
		(item) =>
			`${pad}${formatObject(item as Record<string, unknown>, indent + 1)},`,
	);
	return `[\n${items.join("\n")}\n${closingPad}]`;
};

const dumpParams = (): string => {
	const blocks = [
		`export const EMISSIVE_PARAMS = ${formatObject(EMISSIVE_PARAMS, 1)};`,
		`export const VIGNETTE_PARAMS = ${formatObject(VIGNETTE_PARAMS, 1)};`,
		`export const REFLECTION_PARAMS = ${formatObject(REFLECTION_PARAMS, 1)};`,
		`export const FLOOR_PARAMS = ${formatObject(FLOOR_PARAMS, 1)};`,
		`export const VOLUME_LIGHT_PARAMS = ${formatObject(VOLUME_LIGHT_PARAMS, 1)};`,
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

	sceneFolder
		.addColor(sceneParams, "backgroundColor")
		.name("Background")
		.onChange((value: number) => {
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

	planeFolder
		.addColor(planeParams, "frameColor")
		.name("Frame Color")
		.onChange((value: number) => {
			updateGallerySideColor(value);
		});

	// パララックスに応じて emissive を center → edge へ線形補間
	// (毎フレーム updateParallax 側で反映されるので onChange は不要)
	planeFolder
		.add(EMISSIVE_PARAMS, "center", -1, 2, 0.01)
		.name("Emissive Center");
	planeFolder.add(EMISSIVE_PARAMS, "edge", -1, 2, 0.01).name("Emissive Edge");

	// Vignette (毎フレーム updateParallax 側で反映されるので onChange は不要)
	const vignetteFolder = planeFolder.addFolder("Vignette");
	vignetteFolder.add(VIGNETTE_PARAMS, "strength", 0, 1, 0.01).name("Strength");
	vignetteFolder.add(VIGNETTE_PARAMS, "power", 0.5, 6, 0.05).name("Power");
	vignetteFolder.addColor(VIGNETTE_PARAMS, "color").name("Color");
	vignetteFolder.close();

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

	// Floor Surface folder (curve deformation + noise + fog)
	const floorFolder = gui.addFolder("Floor Surface");
	floorFolder.add(FLOOR_PARAMS, "curvePower", 1, 12, 0.1).name("Curve Power");
	floorFolder.add(FLOOR_PARAMS, "curveHeight", 0, 10, 0.1).name("Curve Height");
	floorFolder.add(FLOOR_PARAMS, "noiseScale", 0, 10, 0.1).name("Noise Scale");
	floorFolder.add(FLOOR_PARAMS, "noiseSpeed", 0, 2, 0.01).name("Noise Speed");
	floorFolder
		.add(FLOOR_PARAMS, "noiseStrength", 0, 0.5, 0.005)
		.name("Noise Strength");
	floorFolder.addColor(FLOOR_PARAMS, "noiseColor").name("Noise Color");
	floorFolder.add(FLOOR_PARAMS, "fogNear", 0, 30, 0.1).name("Fog Near");
	floorFolder.add(FLOOR_PARAMS, "fogFar", 0, 60, 0.1).name("Fog Far");
	floorFolder.add(FLOOR_PARAMS, "fogStrength", 0, 1, 0.01).name("Fog Strength");
	floorFolder.close();

	// Volume Light (円錐メッシュで光柱を可視化)
	const volumeFolder = gui.addFolder("Volume Light");
	volumeFolder.add(VOLUME_LIGHT_PARAMS, "enabled").name("Enabled");
	volumeFolder.add(VOLUME_LIGHT_PARAMS, "showHelper").name("Show Debug Helper");
	volumeFolder
		.add(VOLUME_LIGHT_PARAMS, "distance", 1, 50, 0.5)
		.name("Distance");
	volumeFolder
		.add(VOLUME_LIGHT_PARAMS, "attenuation", 1, 50, 0.5)
		.name("Attenuation");
	volumeFolder
		.add(VOLUME_LIGHT_PARAMS, "anglePower", 0.5, 15, 0.1)
		.name("Angle Power");
	volumeFolder.add(VOLUME_LIGHT_PARAMS, "alpha", 0, 2, 0.01).name("Alpha");
	volumeFolder.add(VOLUME_LIGHT_PARAMS, "wave", 0, 10, 0.1).name("Wave");
	volumeFolder.add(VOLUME_LIGHT_PARAMS, "speed", 0, 1, 0.01).name("Speed");
	volumeFolder.close();

	// 各ライトのフォルダを作成
	const createLightFolder = (index: number, name: string) => {
		const light = BACKGROUND_LIGHTS[index];
		const folder = gui.addFolder(name);

		folder.add(light, "enabled").name("Enabled");
		folder.addColor(light, "colorL").name("Color");
		folder.add(light, "intensity", 0, 3, 0.05).name("Intensity");

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

		return folder;
	};

	const light1Folder = createLightFolder(0, "Light 1 (Left → Right)");
	light1Folder.open();

	const light2Folder = createLightFolder(1, "Light 2 (Right → Left)");
	light2Folder.close();

	return gui;
};
