import StatefulDevice from './StatefulDevice';
import {haSend} from './index';

export default class Outlet extends StatefulDevice {
	isOn: boolean | undefined;

	async init(): Promise<void> {
		await this.initEntity('switch.');
	}

	on(): void {
		console.debug(`outlet ${this.ieee}: on`);
		this.isOn = true;
		haSend({
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
		haSend({
			type: 'call_service',
			domain: 'switch',
			service: 'turn_off',
			service_data: {
				entity_id: this.entityId,
			},
		});
	}

	onEntityState = (haState: string, haAttributes: any) => {
		this.isOn = haState === 'on';
		this.log('switch state', this.isOn);
	};
}
