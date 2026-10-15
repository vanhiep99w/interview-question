import { connectPort } from './connection-manager';

// One dedicated worker per tab -> one connection manager/socket per tab.
const scope = self as unknown as DedicatedWorkerGlobalScope;
const channel = new MessageChannel();
connectPort(channel.port1);
channel.port2.onmessage = (event) => scope.postMessage(event.data);
scope.onmessage = (event) => channel.port2.postMessage(event.data);
