import ZigbeeDevice, {addEventHandler, type EventHandler} from './ZigbeeDevice';

export default class MotionSensor extends ZigbeeDevice {
	onMove(handler: EventHandler) {
		addEventHandler(this.ieee, (event) => {
			if (event.data?.command !== 'movement') {
				return;
			}
			handler(event);
		});
	}
}
