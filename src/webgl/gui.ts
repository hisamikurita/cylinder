import GUI from "lil-gui";
import { scene } from "./core";
import * as THREE from "three";
import {
	BACKGROUND_LIGHT_PARAMS,
	FOG,
	LIGHT_PARAMS,
	PLANE,
	REFLECTION_PARAMS,
	SCENE,
} from "./constants";
import { updateAtmosphereUniform } from "./atmosphere";
import { updateGalleryLightUniform, updateGallerySideColor } from "./Gallery";

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

const dumpParams = (): string => {
	const blocks = [
		`export const REFLECTION_PARAMS = ${formatObject(REFLECTION_PARAMS, 1)};`,
		`export const LIGHT_PARAMS = ${formatObject(LIGHT_PARAMS, 1)};`,
		`export const BACKGROUND_LIGHT_PARAMS = ${formatObject(BACKGROUND_LIGHT_PARAMS, 1)};`,
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

	// Light folder
	const lightFolder = gui.addFolder("Light");

	lightFolder
		.addColor(LIGHT_PARAMS, "color")
		.name("Color")
		.onChange((value: number) => {
			updateGalleryLightUniform("uLightColor", (u) => {
				(u.value as THREE.Color).setHex(value);
			});
		});

	lightFolder
		.add(LIGHT_PARAMS, "specularStrength", 0, 3, 0.05)
		.name("Specular")
		.onChange((value: number) => {
			updateGalleryLightUniform("uSpecularStrength", (u) => {
				u.value = value;
			});
		});

	lightFolder
		.add(LIGHT_PARAMS, "shininess", 1, 128, 1)
		.name("Shininess")
		.onChange((value: number) => {
			updateGalleryLightUniform("uShininess", (u) => {
				u.value = value;
			});
		});

	lightFolder
		.add(LIGHT_PARAMS, "ambient", 0, 1, 0.01)
		.name("Ambient")
		.onChange((value: number) => {
			updateGalleryLightUniform("uAmbient", (u) => {
				u.value = value;
			});
		});

	lightFolder
		.add(LIGHT_PARAMS, "attenuation", 0, 0.5, 0.005)
		.name("Attenuation")
		.onChange((value: number) => {
			updateGalleryLightUniform("uAttenuation", (u) => {
				u.value = value;
			});
		});

	const posFolder = lightFolder.addFolder("Position");

	const bindPos = (
		key: "uLightPos1" | "uLightPos2",
		axis: "x" | "y" | "z",
		params: (typeof LIGHT_PARAMS)["pos1"],
		name: string,
	) => {
		posFolder
			.add(params, axis, -20, 20, 0.1)
			.name(name)
			.onChange((value: number) => {
				updateGalleryLightUniform(key, (u) => {
					(u.value as THREE.Vector3)[axis] = value;
				});
			});
	};

	bindPos("uLightPos1", "x", LIGHT_PARAMS.pos1, "L X");
	bindPos("uLightPos1", "y", LIGHT_PARAMS.pos1, "L Y");
	bindPos("uLightPos1", "z", LIGHT_PARAMS.pos1, "L Z");
	bindPos("uLightPos2", "x", LIGHT_PARAMS.pos2, "R X");
	bindPos("uLightPos2", "y", LIGHT_PARAMS.pos2, "R Y");
	bindPos("uLightPos2", "z", LIGHT_PARAMS.pos2, "R Z");

	lightFolder.open();

	// Background Light folder
	const bgLightFolder = gui.addFolder("Background Light");

	bgLightFolder
		.addColor(BACKGROUND_LIGHT_PARAMS, "colorL")
		.name("Color")
		.onChange((value: number) => {
			updateAtmosphereUniform("uLightColorL", (u) => {
				(u.value as THREE.Color).setHex(value);
			});
		});

	bgLightFolder
		.add(BACKGROUND_LIGHT_PARAMS, "intensity", 0, 3, 0.05)
		.name("Intensity")
		.onChange((value: number) => {
			updateAtmosphereUniform("uLightIntensity", (u) => {
				u.value = value;
			});
		});

	bgLightFolder
		.add(BACKGROUND_LIGHT_PARAMS, "radiusX", 0, 2, 0.01)
		.name("Radius X")
		.onChange((value: number) => {
			updateAtmosphereUniform("uLightRadius", (u) => {
				(u.value as THREE.Vector2).x = value;
			});
		});

	bgLightFolder
		.add(BACKGROUND_LIGHT_PARAMS, "radiusY", 0, 3, 0.01)
		.name("Radius Y")
		.onChange((value: number) => {
			updateAtmosphereUniform("uLightRadius", (u) => {
				(u.value as THREE.Vector2).y = value;
			});
		});

	bgLightFolder
		.add(BACKGROUND_LIGHT_PARAMS, "angleL", -90, 90, 1)
		.name("Angle (deg)")
		.onChange((value: number) => {
			updateAtmosphereUniform("uLightAngleL", (u) => {
				u.value = value;
			});
		});

	bgLightFolder
		.add(BACKGROUND_LIGHT_PARAMS, "biasL", -1, 1, 0.01)
		.name("Bias")
		.onChange((value: number) => {
			updateAtmosphereUniform("uLightBiasL", (u) => {
				u.value = value;
			});
		});

	bgLightFolder
		.add(BACKGROUND_LIGHT_PARAMS, "spreadL", -1, 1, 0.01)
		.name("Spread")
		.onChange((value: number) => {
			updateAtmosphereUniform("uLightSpreadL", (u) => {
				u.value = value;
			});
		});

	bgLightFolder
		.add(BACKGROUND_LIGHT_PARAMS, "blurRadius", 0, 20, 0.1)
		.name("Blur");

	bgLightFolder
		.add(BACKGROUND_LIGHT_PARAMS, "falloff", 0.5, 6, 0.1)
		.name("Falloff")
		.onChange((value: number) => {
			updateAtmosphereUniform("uLightFalloff", (u) => {
				u.value = value;
			});
		});

	const bgPosFolder = bgLightFolder.addFolder("Position (UV)");

	bgPosFolder
		.add(BACKGROUND_LIGHT_PARAMS.posL, "x", 0, 1, 0.01)
		.name("X")
		.onChange((value: number) => {
			updateAtmosphereUniform("uLightPosL", (u) => {
				(u.value as THREE.Vector2).x = value;
			});
		});
	bgPosFolder
		.add(BACKGROUND_LIGHT_PARAMS.posL, "y", 0, 1, 0.01)
		.name("Y")
		.onChange((value: number) => {
			updateAtmosphereUniform("uLightPosL", (u) => {
				(u.value as THREE.Vector2).y = value;
			});
		});

	bgLightFolder.open();

	return gui;
};
