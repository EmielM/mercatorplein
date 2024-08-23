import Device, {type DeviceTree} from './Device';

export default class Light extends Device {
	brightness: number | undefined;
	entityId: string | undefined;
	// color

	async init(): Promise<void> {
		// Find HA entity_id: remove this when moving to zigbee2mqtt
		const result = (await Device.haConnection?.sendMessagePromise({type: 'zha/device', ieee: this.ieee})) as any;
		for (const entity of result.entities as {name: string; entity_id: string}[]) {
			if (entity.entity_id.startsWith('light.')) {
				this.entityId = entity.entity_id;
				break;
			}
		}
		// TODO: get current brightness/color from result?
		if (!this.entityId) {
			console.warn(`light ${this.ieee}: entity not found`, result);
		} else {
			console.log(`light ${this.ieee}: found entity ${this.entityId}`);
		}
	}
	off(): void {
		this.to(0.0);
	}
	on(): void {
		this.to(1.0);
	}
	to(brightness: number): void {
		console.debug(`light ${this.ieee}: to brightness ${brightness}`);
		this.brightness = brightness;
		this.haSend({
			type: 'call_service',
			domain: 'light',
			service: 'turn_on',
			service_data: {
				entity_id: this.entityId,
				brightness_pct: this.brightness * 100,
			},
		});
	}
	isOn(): boolean {
		return this.brightness !== undefined && this.brightness > 0.0;
	}
}

export function lights(tree: DeviceTree): Light {
	// Combined device, keep no refs!
	const lights = findDevices(uuidOrTree, Light);
	return lights[0];
}
