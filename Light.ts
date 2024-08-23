import {haSend} from './index';
import {getDevices, type DeviceTree} from './Device';
import StatefulDevice from './StatefulDevice';

export default class Light extends StatefulDevice {
	brightness: number | undefined;
	// color

	async init(): Promise<void> {
		await this.initEntity('light.');
	}

	off(): void {
		this.to(0.0);
	}

	on(): void {
		this.to(1.0);
	}

	to(brightness: number): void {
		this.log(`to brightness ${brightness}`);
		this.brightness = brightness;
		haSend({
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

	onEntityState = (haState: string, haAttributes: any) => {
		this.brightness = (haAttributes.brightness ?? 0) / 256;
		this.log('brightness got', this.brightness);
	};
}

export function lights(tree: DeviceTree): Light {
	// Combined device, keep no refs!
	const lights = getDevices(tree).filter((device) => device instanceof Light) as Light[];
	return lights[0];
}
