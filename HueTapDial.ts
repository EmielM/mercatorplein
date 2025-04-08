import ZigbeeDevice, {addEventHandler, type EventHandler, type ZigbeeEvent} from './ZigbeeDevice';

type SceneButton = 1 | 2 | 3 | 4;
type SceneHandler = (sceneButton: SceneButton, isCurrent: boolean, event: ZigbeeEvent) => void;

type RotateHandler = (step: number, event: ZigbeeEvent) => void;

export default class HueTapDial extends ZigbeeDevice {
	endpointId: number | undefined;

	// Bit of local state that is lost when restarting
	currentScene: number | undefined;

	constructor(ieee: string, endpointId: number | undefined = undefined) {
		super(ieee);
		this.endpointId = endpointId;
	}

	onSceneSelect(handler: SceneHandler) {
		this.#addHandler('recall', (event) => {
			// Weird mapping of the buttons to passed scene_ids
			const scene = [-1, 1, 0, 5, 4].indexOf(event.data?.params?.scene_id);
			if (scene > 0) {
				const isCurrent = this.currentScene === scene;
				this.currentScene = scene;
				handler(scene as SceneButton, isCurrent, event);
			}
		});
	}

	onRotate(handler: RotateHandler) {
		this.#addHandler('step_with_on_off', (event) => {
			const stepMode = event.data?.params?.step_mode;
			const stepSize = event.data?.params?.step_size;
			if (typeof stepSize !== 'number' || isNaN(stepSize)) {
				this.log('weird stepSize=', stepSize, event.data);
				return;
			}
			handler(stepMode === 0 ? stepSize : 0 - stepSize, event);
		});
	}

	#addHandler(command: string, handler: EventHandler) {
		addEventHandler(this.ieee, (event) => {
			// console.log('hue event', event);
			if (event.data?.command !== command) {
				return;
			}
			this.log(command, event?.data?.params);
			handler(event);
		});
	}
}
