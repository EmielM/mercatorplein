import Entity from './Entity';
import Observable from './Observable';
import ZigbeeDevice, {findZigbeeEntityId} from './ZigbeeDevice';

// MotionSensor is implemented as StatefulDevice, but event driven ZigbeeDevice
// would have been a lot simpler!
export default class MotionSensor extends ZigbeeDevice {
	entity?: Entity<boolean>;
	graceDuration?: number;

	constructor(ieee: string, graceDuration?: number) {
		super(ieee);
		this.graceDuration = graceDuration;
	}
	async init(): Promise<void> {
		const entityId = await findZigbeeEntityId('binary_sensor.', this.ieee);
		if (entityId) {
			this.entity = new Entity(entityId, (haState, haAttributes) => haState === 'on');
			this.entity.observe(this.onRawMotion);
		}
	}

	#motion = new Observable<boolean>(false);
	onMotion = this.#motion.observe;
	get motion() {
		return this.#motion.value;
	}

	// rawMotion -> motion takes graceDuration into account
	#graceTimer?: Timer;
	onRawMotion = (rawMotion: boolean | undefined) => {
		if (rawMotion) {
			clearTimeout(this.#graceTimer);
			this.#motion.set(true);
		} else {
			clearTimeout(this.#graceTimer);
			if (this.graceDuration) {
				this.#graceTimer = setTimeout(() => {
					this.#motion.set(false);
				}, this.graceDuration * 1000);
			} else {
				this.#motion.set(false);
			}
		}
	};
}
