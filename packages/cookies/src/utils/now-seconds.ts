import { MS_PER_SECOND } from "../constants.js";

export const nowSeconds = (): number => Math.floor(Date.now() / MS_PER_SECOND);
