import {ObsConnector} from "./ObsConnector";
import {LaunchpadConnector} from "./LaunchpadConnector";

const connector = new ObsConnector();

window.connector = connector;
window.launchpadConnector = new LaunchpadConnector(connector);

// connector.start();
