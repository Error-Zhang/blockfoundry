'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
	Engine,
	Scene,
	ArcRotateCamera,
	HemisphericLight,
	MeshBuilder,
	StandardMaterial,
	Texture,
	Vector3,
	Color3,
} from '@babylonjs/core';
import { BlockDefinition } from '../lib/types';

interface RenderEnvironment {
	lightIntensity: number;
	lightColor: string;
	ambientIntensity: number;
	backgroundColor: string;
	cameraDistance: number;
	rotationSpeed: number;
}

interface BlockPreviewProps {
	block: BlockDefinition;
	environment?: Partial<RenderEnvironment>;
	width?: number;
	height?: number;
}

const defaultEnvironment: RenderEnvironment = {
	lightIntensity: 1,
	lightColor: '#ffffff',
	ambientIntensity: 0.5,
	backgroundColor: '#2c3e50',
	cameraDistance: 3,
	rotationSpeed: 0.01,
};

export default function BlockPreview({ block, environment = {}, width = 400, height = 400 }: BlockPreviewProps) {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const [engine, setEngine] = useState<Engine | null>(null);
	const [scene, setScene] = useState<Scene | null>(null);

	const env = { ...defaultEnvironment, ...environment };

	useEffect(() => {
		if (!canvasRef.current) return;

		const canvas = canvasRef.current;
		const newEngine = new Engine(canvas, true);
		const newScene = new Scene(newEngine);

		newScene.clearColor = Color3.FromHexString(env.backgroundColor).toColor4();

		const camera = new ArcRotateCamera('camera', Math.PI / 4, Math.PI / 3, env.cameraDistance, Vector3.Zero(), newScene);
		camera.attachControl(canvas, true);
		camera.lowerRadiusLimit = 2;
		camera.upperRadiusLimit = 10;

		const light = new HemisphericLight('light', new Vector3(1, 1, 0), newScene);
		light.intensity = env.lightIntensity;
		light.diffuse = Color3.FromHexString(env.lightColor);
		light.groundColor = Color3.FromHexString(env.lightColor).scale(env.ambientIntensity);

		setEngine(newEngine);
		setScene(newScene);

		newEngine.runRenderLoop(() => {
			newScene.render();
		});

		return () => {
			newEngine.dispose();
		};
	}, [env]);

	useEffect(() => {
		if (!scene) return;

		scene.meshes.forEach((mesh) => {
			if (mesh.name === 'block') {
				mesh.dispose();
			}
		});

		const box = MeshBuilder.CreateBox('block', { size: 1 }, scene);
		const material = new StandardMaterial('blockMaterial', scene);

		// 使用 albedo 作为基础纹理
		if (block.textures?.albedo) {
			const texture = new Texture(`/api/texture-resources/${block.textures.albedo}/file`, scene);
			material.diffuseTexture = texture;
		}

		box.material = material;

		if (env.rotationSpeed > 0) {
			scene.registerBeforeRender(() => {
				box.rotation.y += env.rotationSpeed;
			});
		}
	}, [scene, block, env]);

	return <canvas ref={canvasRef} width={width} height={height} style={{ width: '100%', height: '100%' }} />;
}