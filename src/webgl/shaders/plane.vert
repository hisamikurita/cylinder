uniform float uTime;
uniform float uWaveStrength;
uniform float uWaveFrequency;
uniform float uWaveSpeed;
uniform float uWaveSeed;
uniform float uHoverCircle;
uniform float uHoverAlpha;
uniform vec2 uPlaneSize;

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

void main() {
	vUv = uv;
	vec3 pos = position;
	vec3 nrm = normal;

	// uWaveStrength > 0 のときのみ変位（反射描画時に有効化）
	if (uWaveStrength > 0.0) {
		float t = uTime * uWaveSpeed + uWaveSeed * 100.0;
		float nx = snoise(vec3(uv * uWaveFrequency, t));
		float ny = snoise(vec3(uv * uWaveFrequency + vec2(31.7, 47.3), t + 47.0));
		pos.x += nx * uWaveStrength;
		pos.y += ny * uWaveStrength;
	}

	// Hover ripple: 前面のみ、法線方向に波打たせて実際に凹凸を作る
	// (色でなく頂点位置と法線を動かし、既存のスポットライトが立体的に反応する)
	// 振幅は uHoverAlpha 側に連動させ、"見えていない時" は凹凸も作らない
	if (uHoverAlpha > 0.0 && uHoverCircle > 0.0) {
		float frontMask = smoothstep(0.3, 0.7, nrm.z);
		if (frontMask > 0.0) {
			float aspect = uPlaneSize.x / uPlaneSize.y;
			vec2 centered = (uv - 0.5) * vec2(aspect, 1.0);
			float r = length(centered);
			// プレーンの端に近づくと振幅を 0 にして側面との段差を防ぐ
			float edgeMask = 1.0 - smoothstep(0.6, 1.05, r);
			float freq = 8.0;
			float speed = 2.3;
			float phase = r * freq - uTime * speed;
			float amp = 0.01 * uHoverAlpha * edgeMask * frontMask;

			// 頂点変位 (法線方向に押し出し)
			pos += nrm * sin(phase) * amp;

			// analytical bump normal: 波の傾き分だけ法線を tangent 面上で傾ける
			if (r > 1e-4) {
				float slopeMag = amp * freq * cos(phase) / uPlaneSize.y;
				vec3 tX = normalize(cross(vec3(0.0, 1.0, 0.0), nrm));
				vec3 tY = cross(nrm, tX);
				vec2 radial = centered / r;
				vec3 delta = -(radial.x * tX + radial.y * tY) * slopeMag;
				nrm = normalize(nrm + delta);
			}
		}
	}

	vec4 worldPosition = modelMatrix * vec4(pos, 1.0);
	vWorldPos = worldPosition.xyz;
	vWorldNormal = normalize(mat3(modelMatrix) * nrm);

	vec4 mvPosition = viewMatrix * worldPosition;
	vFogDepth = -mvPosition.z;
	gl_Position = projectionMatrix * mvPosition;
}
