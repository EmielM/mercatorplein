import type HueTapDial from './HueTapDial';

type Target = {
	isOn(): boolean;
	on(): void;
	off?(): void;
	dim(step: number): void;
	nextScene?(): void;
};

type TapHandler = (isCurrent: boolean) => void;

type Targets = {[Button in 1 | 2 | 3 | 4]?: Target | TapHandler};

export default class TapDialController {
	targets: Targets;

	currentTarget:
		| {
				isOn(): boolean;
				on(): void;
				dim(step: number): void;
				nextScene?(): void;
		  }
		| undefined;

	constructor(targets: Targets) {
		this.targets = targets;
	}

	attach(device: HueTapDial) {
		device.onRotate(this.#onRotate);
		device.onSceneSelect(this.#onSceneSelect);
	}

	#onRotate = (step: number) => {
		if (this.currentTarget) {
			this.currentTarget.dim(step * 0.01);
		}
	};

	#lastPressAt = 0;

	#onSceneSelect = (sceneIndex: 1 | 2 | 3 | 4, isCurrent: boolean) => {
		const target = this.targets[sceneIndex];
		if (!target) {
			return;
		}
		if (typeof target === 'function') {
			target(isCurrent);
			return;
		}
		if (isCurrent && this.#lastPressAt > Date.now() - 5000) {
			// Pressing same button within 5 seconds -> cycle scene
			console.log('nextScene!');
			if (target.nextScene) {
				target.nextScene();
			} else if (target.off) {
				// If we can't cycle scenes, but can set to off: cycle between on and off
				if (target.isOn()) {
					target.off();
				} else {
					target.on();
				}
			}
		} else if (!target.isOn()) {
			console.log('ON!');
			target.on();
		}
		this.currentTarget = target;
		this.#lastPressAt = Date.now();
	};
}
