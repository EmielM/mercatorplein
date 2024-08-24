// Dumps light states

import {createConnection, createLongLivedTokenAuth, type MessageBase} from 'home-assistant-js-websocket';

const haToken = await Bun.file('./ha.token').text();
const auth = createLongLivedTokenAuth('http://localhost:8123', haToken.trim());

const haConnection = await createConnection({auth});

const states = (await haConnection.sendMessagePromise({type: 'get_states'})) as {
	entity_id: string;
	state: string;
	attributes: any;
}[];
for (const state of states) {
	if (state.entity_id.startsWith('light.')) {
		console.log(state.entity_id, state.state, state.attributes);
	}
}
process.exit(0);
