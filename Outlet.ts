import StatefulDevice from './StatefulDevice';
import {haSend} from './main';

export default class Outlet extends StatefulDevice {
	powered: boolean | undefined;

	async init(): Promise<void> {
		await this.initEntity('switch.');
	}

	on(): void {
		console.debug(`outlet ${this.ieee}: on`);
		this.powered = true;
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
		this.powered = true;
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
		this.powered = haState === 'on';
		this.log('at state', this.powered ? 'on' : 'off');
	};
}
