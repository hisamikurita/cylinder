uniform sampler2D uTexture;
uniform vec2 uPlaneSize;
uniform vec2 uImageSize;
uniform float uParallaxOffset; // -1.0 ~ 1.0
uniform float uParallaxScale; // 1.0 ~ 1.25+
uniform float uBorderWidth;
uniform vec3 uBorderColor;
uniform float uBrightness;
uniform float uTime;
uniform float uWaveStrength;
uniform float uWaveFrequency;
uniform float uWaveSpeed;
uniform float uWaveSeed;

// Light uniforms (Blinn-Phong)
uniform vec3 uLightPos1;
uniform vec3 uLightPos2;
uniform vec3 uLightColor;
uniform float uSpecularStrength;
uniform float uShininess;
uniform float uAmbient;
uniform float uAttenuation;

// Fog uniforms
uniform vec3 fogColor;
uniform float fogNear;
uniform float fogFar;

varying vec2 vUv;
varying float vFogDepth;
varying vec3 vWorldPos;
varying vec3 vWorldNormal;

// 3D Simplex Noise by Ian McEwan, Ashima Arts (MIT License)
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

float snoise(vec3 v) {
	const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
	const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);

	vec3 i  = floor(v + dot(v, C.yyy));
	vec3 x0 = v - i + dot(i, C.xxx);

	vec3 g = step(x0.yzx, x0.xyz);
	vec3 l = 1.0 - g;
	vec3 i1 = min(g.xyz, l.zxy);
	vec3 i2 = max(g.xyz, l.zxy);

	vec3 x1 = x0 - i1 + C.xxx;
	vec3 x2 = x0 - i2 + C.yyy;
	vec3 x3 = x0 - D.yyy;

	i = mod289(i);
	vec4 p = permute(permute(permute(
		    i.z + vec4(0.0, i1.z, i2.z, 1.0))
		  + i.y + vec4(0.0, i1.y, i2.y, 1.0))
		  + i.x + vec4(0.0, i1.x, i2.x, 1.0));

	float n_ = 0.142857142857;
	vec3 ns = n_ * D.wyz - D.xzx;

	vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
	vec4 x_ = floor(j * ns.z);
	vec4 y_ = floor(j - 7.0 * x_);

	vec4 x = x_ * ns.x + ns.yyyy;
	vec4 y = y_ * ns.x + ns.yyyy;
	vec4 h = 1.0 - abs(x) - abs(y);

	vec4 b0 = vec4(x.xy, y.xy);
	vec4 b1 = vec4(x.zw, y.zw);

	vec4 s0 = floor(b0) * 2.0 + 1.0;
	vec4 s1 = floor(b1) * 2.0 + 1.0;
	vec4 sh = -step(h, vec4(0.0));

	vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
	vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;

	vec3 p0 = vec3(a0.xy, h.x);
	vec3 p1 = vec3(a0.zw, h.y);
	vec3 p2 = vec3(a1.xy, h.z);
	vec3 p3 = vec3(a1.zw, h.w);

	vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
	p0 *= norm.x;
	p1 *= norm.y;
	p2 *= norm.z;
	p3 *= norm.w;

	vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
	m = m * m;
	return 42.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
}

// リニアからsRGBへの変換
vec3 linearToSRGB(vec3 color) {
	return pow(color, vec3(1.0 / 2.2));
}

void main() {
	vec4 color;

	// 裏面は白色
	if (!gl_FrontFacing) {
		color = vec4(1.0, 1.0, 1.0, 1.0);
	} else {
		// ボーダー判定（UV空間での幅）
		vec2 borderUV = vec2(uBorderWidth / uPlaneSize.x, uBorderWidth / uPlaneSize.y);
		if (vUv.x < borderUV.x || vUv.x > 1.0 - borderUV.x ||
			vUv.y < borderUV.y || vUv.y > 1.0 - borderUV.y) {
			color = vec4(linearToSRGB(uBorderColor), 1.0);
		} else {
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

			// テクスチャサンプル位置にノイズによる波紋を加算（反射時のみ）
			if (uWaveStrength > 0.0) {
				float rt = uTime * uWaveSpeed * 1.4 + uWaveSeed * 100.0;
				float rx = snoise(vec3(vUv * uWaveFrequency * 6.0, rt));
				float ry = snoise(vec3(vUv * uWaveFrequency * 6.0 + vec2(17.3, 91.1), rt + 23.0));
				uv += vec2(rx, ry) * uWaveStrength * 0.15;
			}

			color = texture2D(uTexture, uv);
		}
	}

	// Blinn-Phong ライティング（拡散 + 距離減衰 + 鏡面）
	vec3 N = normalize(vWorldNormal);
	vec3 V = normalize(cameraPosition - vWorldPos);

	vec3 L1v = uLightPos1 - vWorldPos;
	vec3 L2v = uLightPos2 - vWorldPos;
	float d1 = length(L1v);
	float d2 = length(L2v);
	vec3 L1 = L1v / max(d1, 0.0001);
	vec3 L2 = L2v / max(d2, 0.0001);

	// 距離による強度減衰
	float atten1 = 1.0 / (1.0 + uAttenuation * d1 * d1);
	float atten2 = 1.0 / (1.0 + uAttenuation * d2 * d2);

	// 拡散光（Lambert）
	float diff1 = max(dot(N, L1), 0.0) * atten1;
	float diff2 = max(dot(N, L2), 0.0) * atten2;

	// 鏡面（ハーフベクトル方式）
	float s1 = pow(max(dot(N, normalize(L1 + V)), 0.0), uShininess) * atten1;
	float s2 = pow(max(dot(N, normalize(L2 + V)), 0.0), uShininess) * atten2;
	vec3 spec = (s1 + s2) * uLightColor * uSpecularStrength;

	// 照度：環境光 + 拡散光。ライトが届いていないところは uAmbient のみ
	vec3 lit = vec3(uAmbient) + (diff1 + diff2) * uLightColor;

	// Apply fog (brightnessはフォグミックス前に掛ける：フォグに沈んだ部分は背景色と一致させる)
	float fogFactor = smoothstep(fogNear, fogFar, vFogDepth);
	vec3 rgb = mix((color.rgb * lit + spec) * uBrightness, fogColor, fogFactor);
	gl_FragColor = vec4(rgb, color.a);
}
