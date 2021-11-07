import {
  Accessor,
  Component,
  createSignal,
  For,
  onCleanup,
  Show,
} from 'solid-js';
import range from 'lodash-es/range';
import { random } from 'lodash-es';
import hotkeys from 'hotkeys-js';

const createGameLoop = (
  onTick: (time: number) => void,
  dt: number,
  running: Accessor<boolean> = () => true,
) => {
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

const App: Component = () => {
  const [grid, setGrid] = createSignal<number[]>(
    range(0, 10 * 16).map(() => random(false)),
  );
  const [block, setBlock] = createSignal<{ speed: number }>({ speed: 1000 });
  const [running, setRunning] = createSignal(true);

  const [time] = createGameLoop(
    (time: number) => {
      setGrid(range(0, 10 * 16).map(() => random(1)));
    },
    1 / 4,
    running,
  );

  hotkeys('left, right', function (event, handler) {
    setGrid(range(0, 10 * 16).map(() => random(1)));
  });
  hotkeys('esc, p', function (event, handler) {
    setRunning(!running());
  });
  onCleanup(() => hotkeys.unbind());

  return (
    <div
      class="flex flex-col justify-center items-center w-screen"
      style={{ height: '95vh' }}
    >
      <div class="select-none">
        <div class="text-white text-2xl leading-4">
          TIME: {time().toFixed(2)}
        </div>
        <div class="border-2 p-px relative">
          <Show when={!running()}>
            <div class="absolute inset-0 flex items-center justify-center text-white bg-black bg-opacity-80 text-4xl pt-1">
              PAUSED
            </div>
          </Show>
          <div class="grid grid-cols-10">
            <For each={grid()}>
              {(cell, i) => (
                <div
                  class="w-full h-full m-0.5 border-2 border-transparent"
                  classList={{
                    'bg-blue-400 border-current text-blue-600': !!cell,
                  }}
                  style={{
                    '--tw-bg-opacity': cell,
                    width: 'calc(75vh / 24)',
                    height: 'calc((75vh / 24)',
                  }}
                ></div>
              )}
            </For>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
