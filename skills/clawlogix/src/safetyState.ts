let newWorkPaused = false;

export function isNewWorkPaused() {
  return newWorkPaused;
}

export function pauseNewWork() {
  newWorkPaused = true;
}

export function resumeNewWork() {
  newWorkPaused = false;
}
