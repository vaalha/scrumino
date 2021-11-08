import { Accessor, createSignal, onCleanup } from 'solid-js';

const createGameLoop = (
  onTick: (time: number) => void,
  dt: number,
  running: Accessor<boolean> = () => true,
): [Accessor<number>] => {
  const [time, setTime] = createSignal(0);
  const [done, setDone] = createSignal(false);

  let currentTime = 0;
  let newTime;
  let frameTime;
  let acc = 0;

  const onFrame = (timestamp: number) => {
    newTime = timestamp / 1000;
    frameTime = Math.min(newTime - currentTime, 0.25);
    currentTime = newTime;

    if (running()) acc += frameTime;

    while (acc >= dt) {
      onTick(time());
      setTime((t) => t + dt);
      acc -= dt;
    }

    if (!done()) requestAnimationFrame(onFrame);
  };
  requestAnimationFrame(onFrame);
  onCleanup(() => setDone(true));

  return [time];
};

export default createGameLoop;
