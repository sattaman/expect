import { MS_PER_SECOND } from "./constants";

export const getEpochSeconds = (): number => Math.floor(Date.now() / MS_PER_SECOND);
