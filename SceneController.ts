import type Light from './Light';

type Scene = number[];
interface LightControllerParams {
	lights: Light[];
	scenes: Scene[];
}
export default class SceneController {
	currentSceneIndex: number = 0;

	lights: Light[];
	scenes: Scene[];

	constructor(params: LightControllerParams) {
		this.lights = params.lights;
		this.scenes = params.scenes;
	}

	nextScene = () => {
		this.currentSceneIndex = (this.currentSceneIndex + 1) % this.scenes.length;

		const scene = this.scenes[this.currentSceneIndex];
		console.log('to scene', this.currentSceneIndex);

		scene.forEach((brightnessPercent, index) => {
			this.lights[index].to(brightnessPercent * 0.01);
		});
	};
}
