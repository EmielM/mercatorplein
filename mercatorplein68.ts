import Button from './Button';
import Cover from './Cover';
import Light, {lights} from './Light';
import MotionSensor from './MotionSensor';
import Outlet from './Outlet';
import SceneController from './SceneController';

const livingRoom = {
	curvedWallButton: new Button('5c:02:72:ff:fe:05:0c:27'),
	boekenkastLights: new Light('58:8e:81:ff:fe:ad:f3:14'),
	tvSpot: new Light('68:0a:e2:ff:fe:c3:f5:45'),
	artSpot: new Light('58:8e:81:ff:fe:41:12:2a'),
};
const kitchen = {
	counterButton: new Button('...'),
	counterStrip: new Light('00:17:88:01:0b:4a:33:42'),
	// tableLights: new Light('14:2d:41:ff:fe:fd:28:1c'),
};
const hall = {
	entrySensor: new MotionSensor('8c:f6:81:ff:fe:f6:a1:45'),
};
const bedRoom = {
	curtain: new Cover(''),
	musquito: new Outlet('34:10:f4:ff:fe:8b:23:05'),
	buttonEmiel: new Button('5c:02:72:ff:fe:0a:5f:e5'),
	buttonGhis: new Button('...'),
};

const livingRoomScenes = new SceneController({
	lights: [livingRoom.boekenkastLights, livingRoom.tvSpot, livingRoom.artSpot],
	scenes: [
		[0, 0, 0], // off
		[80, 80, 80], // on
		[40, 40, 40], // movie
	],
});
livingRoom.curvedWallButton.leftButton.onPress(livingRoomScenes.nextScene);

const kitchenScenes = new SceneController({
	lights: [kitchen.counterStrip, kitchen.tableLights],
	scenes: [
		[0, 0], // off
		[80, 80], // cooking
		[0, 50], // eating
	],
});
livingRoom.curvedWallButton.rightButton.onPress(kitchenScenes.nextScene);
kitchen.counterButton.onPress(kitchenScenes.nextScene);

function isNight() {
	return true;
}

hall.entrySensor.onMove(function () {
	if (isNight() && !lights(livingRoom).isOn()) {
		// Assume no one was at home
		kitchen.counterStrip.toAtLeast(0.3);
	}
});

function toggleBed() {
	if (bedRoom.curtain.isOpen()) {
		bedRoom.curtain.close();
		bedRoom.musquito.on();
	} else {
		bedRoom.curtain.open();
		bedRoom.musquito.off();
	}
}

function everythingOff() {
	lights({kitchen, livingRoom, bedRoom}).off();
	bedRoom.curtain.close();
	bedRoom.musquito.on();
}

bedRoom.buttonEmiel.onPress(toggleBed);
bedRoom.buttonGhis.onPress(toggleBed);
bedRoom.buttonEmiel.onLongPress(everythingOff);
bedRoom.buttonGhis.onLongPress(everythingOff);

export default {livingRoom, kitchen, hall, bedRoom};
