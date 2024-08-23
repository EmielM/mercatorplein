import {
	createConnection,
	createLongLivedTokenAuth,
	subscribeEntities,
	type MessageBase,
} from 'home-assistant-js-websocket';
import {getDevices, handleEvent} from './Device';
import {handleState} from './StatefulDevice';

const haToken = await Bun.file('./ha.token').text();
const auth = createLongLivedTokenAuth('http://localhost:8123', haToken.trim());

const haConnection = await createConnection({auth});

console.log('connected to HA');

export async function haSend(message: MessageBase): Promise<any> {
	return await haConnection.sendMessagePromise(message);
}

haConnection.subscribeEvents((event: any) => {
	if (event.event_type !== 'zha_event') {
		return;
	}

	const uuid = event.data?.device_ieee;
	if (!uuid) {
		console.log('missing device_ieee', event);
		return;
	}

	handleEvent(uuid, event);
}, 'zha_event');

haConnection.subscribeEvents((event: any) => {
	console.log('state event', event);
}, 'state');

const deviceTree = (await import('./mercatorplein68')).default;

const allDevices = getDevices(deviceTree);
await Promise.all(allDevices.map((device) => device.init()));

console.log(`initialized ${allDevices.length} devices`);

const initialStates = await haSend({type: 'get_states'});
for (const initialState of initialStates) {
	handleState(initialState.entity_id, initialState.state, initialState.attributes);
}

console.log('synced initial state');
