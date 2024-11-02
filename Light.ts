import {haSend} from './main';
import {getDevices, type DeviceTree} from './Device';
import ZigbeeDevice, {findZigbeeEntityId} from './ZigbeeDevice';
import Entity from './Entity';

type RgbColor = [number, number, number]; // 0-255 per color

export type LightTarget =
	| number // 0 - 1.00
	| {brightness: number; rgb: RgbColor}
	| {brightness: number; temp: number};

export default class Light extends ZigbeeDevice {
	entity: Entity<{brightness: number; rgb: RgbColor | null; temp: number | null}> | undefined;

	async init(): Promise<void> {
		const entityId = await findZigbeeEntityId('light.', this.ieee);
		if (entityId) {
			this.entity = new Entity(entityId, (haState: string, haAttributes: any) => ({
				brightness: Math.round(((haAttributes.brightness ?? 0) / 0xff) * 100) * 0.01,
				rgb: (haAttributes.rgb_color ?? null) as RgbColor | null,
				temp: (haAttributes.color_temp_kelvin ?? null) as number | null,
			}));
		}
	}

	get brightness() {
		return this.entity?.value?.brightness;
	}
	get rgb() {
		return this.entity?.value?.rgb;
	}
	get temp() {
		return this.entity?.value?.temp;
	}

	off(): void {
		this.to(0);
	}

	on(): void {
		this.to(1.0);
	}

	to(target: LightTarget): void {
		if (!this.entity) {
			this.warn('to: no entity yet');
			return;
		}
		this.log('to', target);

		const serviceData = {} as any;
		if (typeof target === 'object') {
			// this.brightness = target.brightness;
			serviceData.brightness_pct = target.brightness * 100;
			if ('rgb' in target) {
				// this.rgb = target.rgb;
				serviceData.rgb_color = target.rgb;
			} else if ('temp' in target) {
				// this.temp = target.temp;
				serviceData.color_temp_kelvin = target.temp;
			}
		} else {
			serviceData.brightness_pct = target * 100;
		}
		haSend({
			type: 'call_service',
			domain: 'light',
			service: 'turn_on',
			service_data: {
				entity_id: this.entity.entityId,
				...serviceData,
			},
		});
	}

	isOn(): boolean {
		return this.brightness !== undefined && this.brightness > 0.0;
	}
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
