import {haSend} from './main';
import Device from './Device';
import Entity from './Entity';

export default class Cover extends Device {
	entity: Entity<number>;

	constructor(entityId: string) {
		super();
		this.name = entityId;
		this.entity = new Entity(
			entityId,
			(haState: string, haAttributes: any) => haAttributes.current_position * 0.01
		);
	}

	get position() {
		return this.entity.value;
	}

	close(): void {
		this.to(0.0);
	}

	open(): void {
		this.to(1.0);
	}

	to(position: number): void {
		this.entity.set(position);
		this.log('to position', position);
		haSend({
			type: 'call_service',
			domain: 'cover',
			service: 'set_cover_position',
			service_data: {
				entity_id: this.entity.entityId,
				position: position * 100,
			},
		});
	}

	isOpen(): undefined | boolean {
		if (this.entity.value === undefined) {
			return undefined;
		}
		return this.entity.value > 0.0;
	}
}
