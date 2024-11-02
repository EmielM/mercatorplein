import Entity from './Entity';
import Observable from './Observable';
import ZigbeeDevice, {findZigbeeEntityId} from './ZigbeeDevice';
import {haSend} from './main';

export default class Outlet extends ZigbeeDevice {
	entity?: Entity<boolean>;

	async init(): Promise<void> {
		const entityId = await findZigbeeEntityId('switch.', this.ieee);
		if (entityId) {
			this.entity = new Entity(entityId, (haState: string) => haState === 'on');
		}
	}

	get powered() {
		return this.entity?.value;
	}

	on(): void {
		if (!this.entity) {
			this.warn('missing entity');
			return;
		}

		console.debug(`outlet ${this.ieee}: on`);
		haSend({
			type: 'call_service',
			domain: 'switch',
			service: 'turn_on',
			service_data: {
				entity_id: this.entity.entityId,
			},
		});
	}

	off(): void {
		if (!this.entity) {
			this.warn('missing entity');
			return;
		}

		console.debug(`outlet ${this.ieee}: off`);
		haSend({
			type: 'call_service',
			domain: 'switch',
			service: 'turn_off',
			service_data: {
				entity_id: this.entity.entityId,
			},
		});
	}
}
