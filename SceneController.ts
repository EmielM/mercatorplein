import type {LightTarget} from './Light';
import type Light from './Light';

type Scene = LightTarget[];
interface SceneControllerParams {
	lights: Light[];
	scenes: Scene[];
}

export default class SceneController {
	// Future: initialize to undefined, and auto-determine start state on initial
	// nextScene() call with heuristic to see what scene lights are currently closest
	// to.
	currentSceneIndex: number = 0;

	lights: Light[];
	scenes: Scene[];

	constructor(params: SceneControllerParams) {
		this.lights = params.lights;
		this.scenes = params.scenes;
		// TODO: validate scenes
	}

	nextScene = () => {
		this.toScene((this.currentSceneIndex + 1) % this.scenes.length);
	};

	// Cycles between "on" scenes, assumes scene 0 is off
	nextOnScene = () => {
		let sceneIndex = (this.currentSceneIndex + 1) % this.scenes.length;
		if (sceneIndex === 0) {
			sceneIndex++;
		}
		this.toScene(sceneIndex);
	};

	off = () => {
		this.toScene(0);
	};

	toScene(sceneIndex: number) {
		const scene = this.scenes[sceneIndex];
		if (!scene) {
			console.warn('no such sceneIndex', sceneIndex);
			return;
		}

		console.log('to scene', sceneIndex);

		this.currentSceneIndex = sceneIndex;
		scene.forEach((target, index) => {
			this.lights[index].to(target);
		});
	}
}
