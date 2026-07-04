precision highp float;

uniform vec3 uBackgroundColor;
uniform vec3 uLightColorL;
uniform vec2 uLightPosL; // スクリーン UV (0..1)
uniform vec2 uLightRadius; // (rx, ry) — rx << ry で縦ストライプ
uniform float uLightAngleL; // degrees
uniform float uLightBiasL; // -1..1 (左右濃淡・ピーク位置)
uniform float uLightSpreadL; // -1..1 (縦方向の広がり)
uniform float uLightIntensity;
uniform float uLightFalloff;

varying vec2 vUv;

// 楕円→左右グラデーションのブレンド + 左右で縦幅を可変にする「ファン」形状。
float glow(
	vec2 uv,
	vec2 center,
	vec2 radius,
	float angleDeg,
	float bias,
	float spread,
	float falloff
) {
	vec2 diff = uv - center;
	float a = radians(angleDeg);
	float c = cos(a);
	float s = sin(a);
	diff = mat2(c, -s, s, c) * diff;

	// 対称的な水平フォールオフ（0..1、中心が最大）
	float horizSym = clamp(1.0 - abs(diff.x) / radius.x, 0.0, 1.0);
	// 左→右へ立ち上がるグラデーション（0..1、右端が最大）
	float horizAsymRight = clamp(0.5 + 0.5 * diff.x / radius.x, 0.0, 1.0);
	float horizAsym = mix(1.0 - horizAsymRight, horizAsymRight, step(0.0, bias));
	float horiz = mix(horizSym, horizAsym, abs(bias));

	// 縦方向の広がり係数
	float xnClamped = clamp(diff.x / radius.x, -1.0, 1.0);
	float widen = max(1.0 + spread * xnClamped, 0.05);
	float effectiveRy = radius.y * widen;

	// 垂直フォールオフ
	float vert = clamp(1.0 - abs(diff.y) / effectiveRy, 0.0, 1.0);

	return pow(horiz * vert, falloff);
}

void main() {
	float gL = glow(
		vUv, uLightPosL, uLightRadius, uLightAngleL,
		uLightBiasL, uLightSpreadL, uLightFalloff
	);

	vec3 col = uBackgroundColor + uLightColorL * gL * uLightIntensity;

	gl_FragColor = vec4(col, 1.0);
}
