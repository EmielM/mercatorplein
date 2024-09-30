import ZigbeeDevice, {addEventHandler, type EventHandler} from './ZigbeeDevice';

export default class MarmitekButton extends ZigbeeDevice {
	endpointId: number | undefined;

	constructor(ieee: string, endpointId: number | undefined = undefined) {
		super(ieee);
		this.endpointId = endpointId;
	}

	get leftButton(): MarmitekButton {
		return new MarmitekButton(this.ieee, 1);
	}
	get rightButton(): MarmitekButton {
		return new MarmitekButton(this.ieee, 2);
	}

	onPress(handler: EventHandler) {
		this.#addHandler('remote_button_short_press', handler);
	}

	onDoublePress(handler: EventHandler) {
		this.#addHandler('remote_button_double_press', handler);
	}

	onLongPress(handler: EventHandler) {
		this.#addHandler('remote_button_long_press', handler);
	}

	#addHandler(command: string, handler: EventHandler) {
		addEventHandler(this.ieee, (event) => {
			if (event.data?.command !== command) {
				return;
			}
			if (this.endpointId !== undefined && event.data?.endpoint_id !== this.endpointId) {
				return;
			}
			this.log(command);
			handler(event);
		});
	}
}
