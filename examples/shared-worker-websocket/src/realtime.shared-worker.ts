import { connectPort } from './connection-manager';

const scope = self as unknown as SharedWorkerGlobalScope;
scope.onconnect = (event: MessageEvent) => connectPort(event.ports[0]);
