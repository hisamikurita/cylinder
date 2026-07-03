import * as THREE from "three";

export interface CurvedPlaneData {
	flatPositions: Float32Array;
	curvedPositions: Float32Array;
}

export const createCurvedPlaneGeometry = (
	width: number,
	height: number,
	depth: number,
	radius: number,
	segments: number,
): THREE.BoxGeometry => {
	const geometry = new THREE.BoxGeometry(width, height, depth, segments, 1, 1);
	const position = geometry.attributes.position;

	// 平面の頂点位置を保存
	const flatPositions = new Float32Array(position.array);

	// 各頂点を円弧状に変形
	const arcAngle = width / radius;

	for (let i = 0; i < position.count; i++) {
		const x = position.getX(i);
		const y = position.getY(i);
		const z = position.getZ(i);

		const angle = (x / width) * arcAngle;
		// zオフセットを考慮して曲げる
		const curveRadius = radius + z;
		const newX = Math.sin(angle) * curveRadius;
		const newZ = Math.cos(angle) * curveRadius - radius;

		position.setXYZ(i, newX, y, newZ);
	}

	// 曲面の頂点位置を保存
	const curvedPositions = new Float32Array(position.array);

	// userDataに両方の頂点位置を保存
	geometry.userData = {
		flatPositions,
		curvedPositions,
	} as CurvedPlaneData;

	geometry.computeVertexNormals();
	return geometry;
};
