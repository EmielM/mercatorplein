import Device, {addEventHandler, type EventHandler} from './Device';

export default class MotionSensor extends Device {
	onMove(handler: EventHandler) {
		addEventHandler(this.ieee, (event) => {
			if (event.data?.command !== 'movement') {
				return;
			}
			handler(event);
		});
	}
}
