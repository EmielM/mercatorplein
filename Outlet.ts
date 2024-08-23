import Device from './Device';

export default class Outlet extends Device {
	isOn: boolean | undefined;
	entityId: string | undefined;

	async init(): Promise<void> {
		// Find HA entity_id: remove this when moving to zigbee2mqtt
		const result = (await Device.haConnection?.sendMessagePromise({type: 'zha/device', ieee: this.ieee})) as any;
		for (const entity of result.entities as {name: string; entity_id: string}[]) {
			if (entity.entity_id.startsWith('switch.')) {
				this.entityId = entity.entity_id;
				break;
			}
		}
		// TODO: get current brightness/color from result?
		if (!this.entityId) {
			console.warn(`outlet ${this.ieee}: entity not found`, result);
		} else {
			console.log(`outlet ${this.ieee}: found entity ${this.entityId}`);
		}
	}

	on(): void {
		console.debug(`outlet ${this.ieee}: on`);
		this.isOn = true;
		this.haSend({
			type: 'call_service',
			domain: 'switch',
			service: 'turn_on',
			service_data: {
				entity_id: this.entityId,
			},
		});
	}

	off(): void {
		console.debug(`outlet ${this.ieee}: off`);
		this.isOn = true;
		this.haSend({
			type: 'call_service',
			domain: 'switch',
			service: 'turn_off',
			service_data: {
				entity_id: this.entityId,
			},
		});
	}
}
