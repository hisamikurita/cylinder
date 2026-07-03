uniform sampler2D uTexture;
uniform vec2 uPlaneSize;
uniform vec2 uImageSize;
uniform float uParallaxOffset; // -1.0 ~ 1.0
uniform float uParallaxScale; // 1.0 ~ 1.25+
uniform float uBorderWidth;
uniform vec3 uBorderColor;

varying vec2 vUv;

// リニアからsRGBへの変換
vec3 linearToSRGB(vec3 color) {
	return pow(color, vec3(1.0 / 2.2));
}

void main() {
	// 裏面は白色
	if (!gl_FrontFacing) {
		gl_FragColor = vec4(1.0, 1.0, 1.0, 1.0);
		return;
	}

	// ボーダー判定（UV空間での幅）
	vec2 borderUV = vec2(uBorderWidth / uPlaneSize.x, uBorderWidth / uPlaneSize.y);
	if (vUv.x < borderUV.x || vUv.x > 1.0 - borderUV.x ||
		vUv.y < borderUV.y || vUv.y > 1.0 - borderUV.y) {
		gl_FragColor = vec4(linearToSRGB(uBorderColor), 1.0);
		return;
	}

	vec2 planeAspect = vec2(uPlaneSize.x / uPlaneSize.y, 1.0);
	vec2 imageAspect = vec2(uImageSize.x / uImageSize.y, 1.0);

	vec2 scale;
	if (planeAspect.x > imageAspect.x) {
		// プレーンが横長 → 幅に合わせる
		scale = vec2(1.0, imageAspect.x / planeAspect.x);
	} else {
		// プレーンが縦長 → 高さに合わせる
		scale = vec2(planeAspect.x / imageAspect.x, 1.0);
	}

	// パララックススケールで拡大（scaleを小さくする）
	scale /= uParallaxScale;

	// パララックスオフセット（余白の範囲内で移動）
	float maxOffset = (uParallaxScale - 1.0) / uParallaxScale * 0.5;
	float offsetX = uParallaxOffset * maxOffset * 2.0;

	vec2 uv = (vUv - 0.5) * scale + 0.5 + vec2(offsetX, 0.0);
	gl_FragColor = texture2D(uTexture, uv);
}
