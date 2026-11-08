import { loadAllUseCases, toIndexEntry } from '../content/load';

export const getIndexForTest = async () => loadAllUseCases().map(toIndexEntry);
