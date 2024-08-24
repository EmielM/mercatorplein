import {createConnection, createLongLivedTokenAuth, type MessageBase} from 'home-assistant-js-websocket';
import {getDevices} from './Device';
import {handleState} from './StatefulDevice';
import {handleEvent} from './ZigbeeDevice';

const haToken = await Bun.file('./ha.token').text();
const auth = createLongLivedTokenAuth('http://localhost:8123', haToken.trim());

const haConnection = await createConnection({auth});

console.log('connected to HA');

export async function haSend(message: MessageBase): Promise<any> {
	return await haConnection.sendMessagePromise(message);
}

haConnection.subscribeEvents((event: any) => {
	// console.log('zha_event', event);
	const uuid = event.data.device_ieee as string;
	handleEvent(uuid, event);
}, 'zha_event');

haConnection.subscribeEvents((event: any) => {
	// console.log('state_changed', event);
	const entityId = event.data.entity_id as string;
	const newState = event.data.new_state as {state: string; attributes: any} | null;
	if (newState) {
		handleState(entityId, newState.state, newState.attributes);
	}
}, 'state_changed');

const mercatorplein68 = (await import('./mercatorplein68')).default;

const allDevices = getDevices(mercatorplein68);
await Promise.all(allDevices.map((device) => device.init()));

console.log(`initialized ${allDevices.length} devices`);

const initialStates = await haSend({type: 'get_states'});
for (const initialState of initialStates) {
	handleState(initialState.entity_id, initialState.state, initialState.attributes);
}

console.log('synced initial state');

// lights(mercatorplein68).on();
