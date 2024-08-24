import {haSend} from './main';
import Device from './Device';
import {addStateHandler} from './StatefulDevice';

export default class Cover extends Device {
	entityId: string;
	position: number | undefined; // 0 - 1.00

	constructor(entityId: string) {
		super();
		this.entityId = entityId;
		this.name = entityId;
	}

	async init(): Promise<void> {
		addStateHandler(this.entityId, this.onEntityState);
	}

	onEntityState = (haState: string, haAttributes: any) => {
		this.position = haAttributes.current_position * 0.01;
		this.log('at position', this.position);
	};

	close(): void {
		this.to(0.0);
	}

	open(): void {
		this.to(1.0);
	}

	to(position: number): void {
		this.position = position;
		this.log('to position', position);
		haSend({
			type: 'call_service',
			domain: 'cover',
			service: 'set_cover_position',
			service_data: {
				entity_id: this.entityId,
				position: position * 100,
			},
		});
	}

	isOpen(): boolean {
		return this.position !== undefined && this.position > 0.0;
	}
}
