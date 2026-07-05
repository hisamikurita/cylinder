precision highp float;

uniform sampler2D tDiffuse;
uniform vec3 uLightPos;
uniform vec3 uLightDir;
uniform float uLightConeAngle;
uniform vec3 uLightColor;
uniform float uLightIntensity;
uniform float uFloorY;
uniform mat4 uInverseViewProjection;
uniform vec3 uCameraPos;

varying vec2 vUv;

// スクリーンUVから床面上のワールド座標を再構築
vec3 getFloorWorldPos(vec2 uv) {
	// NDC座標
	vec4 ndc = vec4(uv * 2.0 - 1.0, 0.0, 1.0);
	// ワールド座標（近平面）
	vec4 worldNear = uInverseViewProjection * ndc;
	worldNear /= worldNear.w;
	// カメラから床面へのレイ
	vec3 rayDir = normalize(worldNear.xyz - uCameraPos);
	// 床面との交点を計算（Y = uFloorY）
	float t = (uFloorY - uCameraPos.y) / rayDir.y;
	return uCameraPos + rayDir * t;
}

void main() {
	vec4 reflection = texture2D(tDiffuse, vUv);

	// 床面上のワールド座標を取得
	vec3 floorPos = getFloorWorldPos(vUv);

	// スポットライト計算
	vec3 toSurface = floorPos - uLightPos;
	float cosAngle = dot(normalize(toSurface), normalize(uLightDir));
	float cosCone = cos(radians(uLightConeAngle));
	float cosOuter = cos(radians(uLightConeAngle * 1.5));
	float spotFactor = smoothstep(cosOuter, cosCone, cosAngle);

	// 距離減衰
	float dist = length(toSurface);
	float attenuation = 1.0 / (1.0 + 0.01 * dist * dist);

	// ライトが当たっている部分だけ反射を表示
	float lightFactor = spotFactor * attenuation * uLightIntensity;
	lightFactor = clamp(lightFactor, 0.0, 1.0);

	gl_FragColor = vec4(reflection.rgb * lightFactor, reflection.a * lightFactor);
}
