precision highp float;

uniform vec3 uBackgroundColor;

// 3つのライト
uniform vec3 uLightColor0;
uniform vec2 uLightPos0;
uniform vec2 uLightRadius0;
uniform float uLightAngle0;
uniform float uLightBias0;
uniform float uLightBiasRange0;
uniform float uLightSpread0;
uniform float uLightIntensity0;
uniform float uLightFalloff0;

uniform vec3 uLightColor1;
uniform vec2 uLightPos1;
uniform vec2 uLightRadius1;
uniform float uLightAngle1;
uniform float uLightBias1;
uniform float uLightBiasRange1;
uniform float uLightSpread1;
uniform float uLightIntensity1;
uniform float uLightFalloff1;

uniform vec3 uLightColor2;
uniform vec2 uLightPos2;
uniform vec2 uLightRadius2;
uniform float uLightAngle2;
uniform float uLightBias2;
uniform float uLightBiasRange2;
uniform float uLightSpread2;
uniform float uLightIntensity2;
uniform float uLightFalloff2;

varying vec2 vUv;

// 楕円→左右グラデーションのブレンド + 左右で縦幅を可変にする「ファン」形状。
float glow(
	vec2 uv,
	vec2 center,
	vec2 radius,
	float angleDeg,
	float bias,
	float biasRange,
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
	// 左→右へ立ち上がるグラデーション（biasRange で終点を制御）
	// biasRange = 0.5 なら中央で1.0に達する
	float normalizedX = diff.x / radius.x; // -1 to 1
	float rangeScale = 1.0 / max(biasRange * 2.0, 0.01);
	float horizAsymRight = clamp(0.5 + 0.5 * normalizedX * rangeScale, 0.0, 1.0);
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
	float g0 = glow(
		vUv, uLightPos0, uLightRadius0, uLightAngle0,
		uLightBias0, uLightBiasRange0, uLightSpread0, uLightFalloff0
	);
	float g1 = glow(
		vUv, uLightPos1, uLightRadius1, uLightAngle1,
		uLightBias1, uLightBiasRange1, uLightSpread1, uLightFalloff1
	);
	float g2 = glow(
		vUv, uLightPos2, uLightRadius2, uLightAngle2,
		uLightBias2, uLightBiasRange2, uLightSpread2, uLightFalloff2
	);

	vec3 col = uBackgroundColor
		+ uLightColor0 * g0 * uLightIntensity0
		+ uLightColor1 * g1 * uLightIntensity1
		+ uLightColor2 * g2 * uLightIntensity2;

	gl_FragColor = vec4(col, 1.0);
}
