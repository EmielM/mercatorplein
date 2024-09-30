import StatefulDevice from './StatefulDevice';
import {addEventHandler, type EventHandler} from './ZigbeeDevice';
import {getAccessToken} from './main';

// MotionSensor is implemented as StatefulDevice, but event driven ZigbeeDevice
// would have been a lot simpler!
export default class MotionSensor extends StatefulDevice {
	motion: boolean | undefined;

	async init(): Promise<void> {
		await this.initEntity('binary_sensor.');
	}

	#onMoveHandlers: EventHandler[] = [];
	onMove(handler: EventHandler) {
		this.#onMoveHandlers.push(handler);
	}

	#graceT: ReturnType<typeof setTimeout> | undefined;
	onEntityState = (haState: string, haAttributes: any) => {
		this.log('xx ', this.motion, haState);
		if (this.motion === undefined) {
			// Just launched, just accept new state
			this.log('at ', haState);
			this.motion = haState === 'on';
		} else if (this.motion && haState === 'off') {
			// Reporting that we went off, however that might be due to our hack
			// Give a 5 minute grace to see if the device reports a new movement
			this.log('start grace');
			clearTimeout(this.#graceT);
			this.#graceT = setTimeout(() => {
				this.log('motion to false after grace');
				this.motion = false;
			}, 300000);
		} else if (!this.motion && haState === 'on') {
			clearTimeout(this.#graceT);
			this.motion = true;
			this.log('fire!');
			this.#onMoveHandlers.forEach((handler) => handler({}));
		}

		if (haState === 'on') {
			this.resetHack();
		}
	};

	// Bug in SM0202 sensors that do not send reset event
	resetHack = () => {
		const accessToken = getAccessToken();
		fetch(`http://localhost:8123/api/states/${this.entityId}`, {
			method: 'POST',
			headers: {
				'content-type': 'application/json',
				authorization: `Bearer ${accessToken}`,
			},
			body: JSON.stringify({state: 'off'}),
		});
	};
}
