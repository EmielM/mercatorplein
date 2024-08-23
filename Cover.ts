import Device from './Device';

export default class Cover extends Device {
	opened: number | undefined;
	close(): void {
		this.to(0.0);
	}
	open(): void {
		this.to(1.0);
	}
	to(opened: number): void {
		this.opened = opened;
		// TODO
	}
	isOpen(): boolean {
		return this.opened !== undefined && this.opened > 0.0;
	}
}
