import type {LightTarget} from './Light';
import type Light from './Light';

interface SceneControllerParams<LightKey extends number, SceneKey extends string> {
	name: string;
	lights: Record<LightKey, Light>;
	targets: Record<SceneKey, Record<LightKey, LightTarget>>;
}

export default class SceneController<LightKey extends number, SceneKey extends string> {
	name: string;
	lights: Record<LightKey, Light>;
	scenes: Record<
		SceneKey,
		{
			targets: Record<LightKey, LightTarget>;
			nextScene: SceneKey;
		}
	>;

	constructor(params: SceneControllerParams<LightKey, SceneKey>) {
		this.name = params.name;
		this.lights = params.lights;
		this.scenes = {} as any;
		const sceneKeys = Object.keys(params.targets) as SceneKey[];
		const nextSceneKeys = [...sceneKeys.slice(1), sceneKeys[0]];
		for (const sceneKey of sceneKeys) {
			const targets = params.targets[sceneKey];
			const nextScene = nextSceneKeys.shift();
			this.scenes[sceneKey] = {targets, nextScene: nextScene!};
		}
	}

	getCurrentScene(): SceneKey {
		// TODO: improve heuristic
		let best: undefined | [number, SceneKey];
		for (const sceneKey in this.scenes) {
			const scene = this.scenes[sceneKey];
			let delta = 0;
			for (const lightKey in scene.targets) {
				const target = scene.targets[lightKey];
				const light = this.lights[lightKey];
				const targetBrightness = typeof target === 'number' ? target : target.brightness;
				delta += Math.abs(targetBrightness - (light.brightness ?? 0));
			}
			if (best === undefined || delta < best[0]) {
				best = [delta, sceneKey];
			}
		}
		if (!best) {
			console.warn('no best scene');
			return 'off' as SceneKey;
		}
		return best[1];
	}

	isOn = () => {
		return this.getCurrentScene() !== 'off';
	};

	on = () => {
		// Set to first non-off scene
		const nextScene = this.scenes['off' as SceneKey].nextScene;
		console.log(this.name, '.on: ', nextScene);
		this.toScene(nextScene);
	};

	dim = (step: number) => {
		for (const key in this.lights) {
			this.lights[key].dim(step);
		}
		console.log('todo dim ', this.name, ' ', step);
	};

	nextScene = () => {
		const currentScene = this.getCurrentScene();
		const nextScene = this.scenes[currentScene].nextScene;
		this.toScene(nextScene);
	};

	toScene(sceneKey: SceneKey) {
		const scene = this.scenes[sceneKey];
		console.log(this.name, 'to scene', sceneKey);

		for (const lightIndex in this.lights) {
			this.lights[lightIndex].to(scene.targets[lightIndex]);
		}
	}
}
