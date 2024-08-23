import Device, {addEventHandler, type EventHandler} from './Device';

export default class Button extends Device {
	endpointId: number | undefined;

	constructor(ieee: string, endpointId: number | undefined = undefined) {
		super(ieee);
		this.endpointId = endpointId;
	}

	get leftButton(): Button {
		return new Button(this.ieee, 1);
	}
	get rightButton(): Button {
		return new Button(this.ieee, 2);
	}

	onPress(handler: EventHandler) {
		this.#addHandler('remote_button_short_press', handler);
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
			handler(event);
		});
	}
}
