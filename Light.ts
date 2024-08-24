import {haSend} from './main';
import {getDevices, type DeviceTree} from './Device';
import StatefulDevice from './StatefulDevice';

type RgbColor = [number, number, number]; // 0-255 per color

export type LightTarget =
	| number // 0 - 1.00
	| {brightness: number; rgb: RgbColor}
	| {brightness: number; temp: number};

export default class Light extends StatefulDevice {
	brightness: number | undefined; // 0 - 1.00
	rgb: RgbColor | null | undefined;
	temp: number | null | undefined; // kelvin

	async init(): Promise<void> {
		await this.initEntity('light.');
	}

	off(): void {
		this.to(0);
	}

	on(): void {
		this.to(1.0);
	}

	to(target: LightTarget): void {
		this.log('to', target);

		const serviceData = {} as any;
		if (typeof target === 'object') {
			this.brightness = target.brightness;
			serviceData.brightness_pct = target.brightness * 100;
			if ('rgb' in target) {
				this.rgb = target.rgb;
				serviceData.rgb_color = target.rgb;
			} else if ('temp' in target) {
				this.temp = target.temp;
				serviceData.color_temp_kelvin = target.temp;
			}
		} else {
			serviceData.brightness_pct = target * 100;
		}
		console.log('serviceData', serviceData);
		haSend({
			type: 'call_service',
			domain: 'light',
			service: 'turn_on',
			service_data: {
				entity_id: this.entityId,
				...serviceData,
			},
		});
	}

	isOn(): boolean {
		return this.brightness !== undefined && this.brightness > 0.0;
	}

	onEntityState = (haState: string, haAttributes: any) => {
		this.brightness = Math.round(((haAttributes.brightness ?? 0) / 0xff) * 100) * 0.01;
		this.rgb = haAttributes.rgb_color ?? null;
		this.temp = haAttributes.color_temp_kelvin ?? null;

		this.log('state', {
			brightness: this.brightness,
			...(this.temp !== null ? {temp: this.temp} : this.rgb !== null ? {rgb: this.rgb} : {}),
		});
	};
}

class MultiLights {
	lights: Light[];
	constructor(lights: Light[]) {
		this.lights = lights;
	}

	off = () => this.lights.forEach((light) => light.off());
	on = () => this.lights.forEach((light) => light.on());
	to = (target: LightTarget) => this.lights.forEach((light) => light.to(target));

	isOn = () => this.lights.some((light) => light.isOn());
}

export function lights(tree: DeviceTree): MultiLights {
	const lights = getDevices(tree).filter((device) => device instanceof Light) as Light[];
	return new MultiLights(lights);
}
