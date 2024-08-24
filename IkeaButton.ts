import ZigbeeDevice, {addEventHandler, type EventHandler} from './ZigbeeDevice';

export class IkeaButton extends ZigbeeDevice {
	onPressOn(handler: EventHandler) {
		addEventHandler(this.ieee, (event) => {
			if (event?.data.command !== 'on') {
				return;
			}
			handler(event);
		});
	}

	onPressOff(handler: EventHandler) {
		addEventHandler(this.ieee, (event) => {
			if (event?.data.command !== 'off') {
				return;
			}
			handler(event);
		});
	}
}
