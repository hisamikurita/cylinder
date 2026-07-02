uniform sampler2D uTexture;
uniform vec2 uPlaneSize;
uniform vec2 uImageSize;

varying vec2 vUv;

void main() {
	// 裏面は白色
	if (!gl_FrontFacing) {
		gl_FragColor = vec4(1.0, 1.0, 1.0, 1.0);
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

	vec2 uv = (vUv - 0.5) * scale + 0.5;
	gl_FragColor = texture2D(uTexture, uv);
}
