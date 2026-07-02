import * as THREE from "three";

export function createCurvedPlaneGeometry(
	width: number,
	height: number,
	radius: number,
	segments: number,
): THREE.PlaneGeometry {
	const geometry = new THREE.PlaneGeometry(width, height, segments, 1);
	const position = geometry.attributes.position;

	// 各頂点を円弧状に変形
	const arcAngle = width / radius;

	for (let i = 0; i < position.count; i++) {
		const x = position.getX(i);
		const y = position.getY(i);

		// x座標を角度に変換して円弧上に配置
		const angle = (x / width) * arcAngle;
		const newX = Math.sin(angle) * radius;
		const newZ = Math.cos(angle) * radius - radius;

		position.setXYZ(i, newX, y, newZ);
	}

	geometry.computeVertexNormals();
	return geometry;
}
