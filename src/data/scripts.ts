import { DialogueScript } from '../types';
import { defaultScript } from './defaultScript';
import { challengeScript } from './challengeScript';

export const scripts: Record<string, DialogueScript> = {
  [defaultScript.id]: defaultScript,
  [challengeScript.id]: challengeScript,
};

export function getScriptById(scriptId: string): DialogueScript | undefined {
  return scripts[scriptId];
}
