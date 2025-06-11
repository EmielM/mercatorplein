import Entity from './Entity';
import ZigbeeDevice, {findZigbeeEntityId} from './ZigbeeDevice';
import {haSend} from './main';

export class IkeaCover extends ZigbeeDevice {
	entity: Entity<{state: 'closing' | 'opening' | 'open' | 'close'; position: number}> | undefined;

	async init(): Promise<void> {
		const entityId = await findZigbeeEntityId('cover.', this.ieee);
		if (entityId) {
			this.entity = new Entity(entityId, (haState: string, haAttributes: any) => {
				return {
					state: haState as 'closing' | 'opening' | 'open' | 'close',
					position: haAttributes.current_position * 0.01,
				};
			});
		}
	}

	get position() {
		return this.entity?.value?.position;
	}

	get state() {
		return this.entity?.value?.state;
	}

	close(): void {
		if (this.entity?.value?.state === 'closing' || this.entity?.value?.state === 'opening') {
			this.stop();
			return;
		}
		this.to(0.0);
	}

	open(): void {
		if (this.entity?.value?.state === 'closing' || this.entity?.value?.state === 'opening') {
			this.stop();
			return;
		}
		this.to(1.0);
	}

	to(position: number): void {
		if (!this.entity) {
			console.warn('IkeaBlinds: no entity found');
			return;
		}
		haSend({
			type: 'call_service',
			domain: 'cover',
			service: 'set_cover_position',
			service_data: {
				entity_id: this.entity.entityId,
				position: position * 100,
			},
		});
		this.log('to position', position);
	}

	stop(): void {
		if (!this.entity) {
			console.warn('IkeaBlinds: no entity found');
			return;
		}
		haSend({
			type: 'call_service',
			domain: 'cover',
			service: 'stop_cover',
			service_data: {
				entity_id: this.entity.entityId,
			},
		});
	}

	isOpen(): undefined | boolean {
		if (this.entity?.value === undefined) {
			return undefined;
		}
		return this.entity.value.position > 0.0;
	}
}
