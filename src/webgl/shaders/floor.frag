precision highp float;

uniform vec3 uBaseColor;
uniform vec3 uLightPos;
uniform vec3 uLightDir;
uniform float uLightConeAngle;
uniform vec3 uLightColor;
uniform float uLightIntensity;
uniform vec3 uCameraPos;

varying vec2 vUv;
varying vec3 vWorldPos;
varying vec3 vWorldNormal;

void main() {
	vec3 N = normalize(vWorldNormal);
	vec3 toSurface = vWorldPos - uLightPos;
	vec3 L = normalize(-toSurface);
	vec3 V = normalize(uCameraPos - vWorldPos);
	vec3 H = normalize(L + V);

	// Spotlight cone falloff
	float cosAngle = dot(normalize(toSurface), normalize(uLightDir));
	float cosCone = cos(radians(uLightConeAngle));
	float cosOuter = cos(radians(uLightConeAngle * 1.3));
	float spotFactor = smoothstep(cosOuter, cosCone, cosAngle);

	// Diffuse
	float NdotL = max(dot(N, L), 0.0);
	vec3 diffuse = uLightColor * NdotL;

	// Specular (Blinn-Phong) - 床面は控えめに
	float NdotH = max(dot(N, H), 0.0);
	float spec = pow(NdotH, 16.0);
	vec3 specular = uLightColor * spec * 0.2;

	// Distance attenuation
	float dist = length(toSurface);
	float attenuation = 1.0 / (1.0 + 0.02 * dist * dist);

	vec3 lighting = (diffuse + specular) * uLightIntensity * attenuation * spotFactor;
	vec3 color = uBaseColor + lighting;

	gl_FragColor = vec4(color, 1.0);
}
