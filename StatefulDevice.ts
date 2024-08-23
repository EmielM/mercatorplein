import Device from './Device';
import {haSend} from './index';

type StateHandler = (haState: string, haAttributes: any) => void;

const entityIndex: Record<string, StateHandler[]> = {};

export function handleState(entityId: string, haState: string, haAttributes: any) {
	const handlers = entityIndex[entityId] ?? [];
	for (const handler of handlers) {
		// console.log('state update', entityId, haState, haAttributes);
		handler(haState, haAttributes);
	}
}

export default class StatefulDevice extends Device {
	entityId: string | undefined;

	// Finds relevant entity in HA for this device, and subscribes to updates
	// - remove this when moving to zigbee2mqtt
	async initEntity(entityPrefix: string) {
		const result = (await haSend({type: 'zha/device', ieee: this.ieee})) as any;
		for (const entity of result.entities as {name: string; entity_id: string}[]) {
			if (entity.entity_id.startsWith(entityPrefix)) {
				this.entityId = entity.entity_id;
				break;
			}
		}
		if (!this.entityId) {
			this.warn(`entity not found`, result);
			return;
		}
		this.log(`found entity ${this.entityId}`);
		entityIndex[this.entityId] ??= [];
		entityIndex[this.entityId].push(this.onEntityState);
	}

	onEntityState = (haState: string, haAttributes: any) => {
		// To be implemented by subclasses
	};
}
