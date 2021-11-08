import { Component, createSignal, For, onCleanup, Show } from 'solid-js';
import { createStore, produce } from 'solid-js/store';
import { flatten, random, range } from 'lodash-es';
import hotkeys from 'hotkeys-js';
import { match, __, not, select, when } from 'ts-pattern';

import createGameLoop from './createGameLoop';

type Grid = number[][];

type Block = {
  x: number;
  y: number;
  grid: Grid;
};

type State = {
  grid: Grid;
};

type Direction = 'up' | 'down' | 'left' | 'right';

const COLS = 10;
const ROWS = 16;

const defaultState = (): State => ({
  grid: range(0, ROWS).map(() => range(0, COLS).map(() => 0)),
});

const defaultBlock = (): Block => ({
  x: 4,
  y: 0,
  grid: [
    [1, 1, 1, 1],
    [1, 0, 0, 0],
    [1, 0, 0, 0],
    [1, 0, 0, 0],
  ],
});

const App: Component = () => {
  const [state, setState] = createStore(defaultState());
  const [block, setBlock] = createSignal(defaultBlock());

  const moveBlock = (
    block: Block,
    direction: Direction,
    source: 'player' | 'timer',
  ) => {
    const nextBlock = {
      ...block,
      ...match<Direction>(direction)
        .with('up', () => ({
          y: block.y - 1,
        }))
        .with('down', () => ({
          y: block.y + 1,
        }))
        .with('left', () => ({
          x: block.x - 1,
        }))
        .with('right', () => ({
          x: block.x + 1,
        }))
        .exhaustive(),
    };

    let collision = false;

    for (let x = 0; x < 4; x++) {
      for (let y = 0; y < 4; y++) {
        if (block.grid[y][x] === 0) {
          continue;
        }

        const nextX = x + nextBlock.x;
        const nextY = y + nextBlock.y;

        if (nextX < 0 || nextY < 0 || nextX >= COLS || nextY >= ROWS) {
          collision = true;
          break;
        }

        if (state.grid[nextY][nextX] !== 0) {
          collision = true;
          break;
        }
      }
    }

    if (!collision) {
      setBlock(nextBlock);
    } else if (source === 'timer') {
      for (let x = 0; x < 4; x++) {
        for (let y = 0; y < 4; y++) {
          const nextX = x + nextBlock.x;
          const nextY = y + nextBlock.y;

          setState(
            produce<{ grid: Grid }>((draft) => {
              const nextX = x + block.x;
              const nextY = y + block.y;
              if (block.grid[y][x] > 0) {
                draft.grid[y + block.y][x + block.x] = 1;
              }
            }),
          );
        }
      }

      setBlock(defaultBlock);
    }
  };

  const [running, setRunning] = createSignal(true);

  hotkeys('up, down, left, right', function (event, handler) {
    if (running()) {
      moveBlock(block(), handler.key as Direction, 'player');
    }
  });

  hotkeys('r', function (event, handler) {
    setState(defaultState());
    setBlock(defaultBlock());
  });

  hotkeys('esc, p', function (event, handler) {
    setRunning(!running());
  });
  onCleanup(() => hotkeys.unbind());

  const [time] = createGameLoop(
    (time: number) => {
      moveBlock(block(), 'down', 'timer');
    },
    1 / 2,
    running,
  );

  return (
    <div
      class="flex flex-col justify-center items-center w-screen"
      style={{ height: '95vh' }}
    >
      <div class="select-none">
        <div class="text-white text-2xl leading-4">
          TIME: {time().toFixed(2)}
        </div>
        <div class="border-2 p-px">
          <div class="relative">
            <div
              class="grid grid-cols-10"
              style={{ 'min-width': 'calc((75vh / 24 + 4px) * 10' }}
            >
              <For each={flatten(state.grid)}>
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
            <div
              class="grid grid-cols-4 absolute"
              style={{
                'min-width': 'calc((75vh / 24 + 4px) * 4',
                left: `calc((75vh / 24 + 4px) * ${block().x})`,
                top: `calc((75vh / 24 + 4px) * ${block().y})`,
              }}
            >
              <Show when={block()}>
                {(block) => (
                  <For each={flatten(block.grid)}>
                    {(cell, i) => (
                      <div
                        class="w-full h-full m-0.5 border-2 border-transparent"
                        classList={{
                          'bg-red-400 border-current text-red-600': !!cell,
                        }}
                        style={{
                          '--tw-bg-opacity': cell,
                          width: 'calc(75vh / 24)',
                          height: 'calc((75vh / 24)',
                        }}
                      ></div>
                    )}
                  </For>
                )}
              </Show>
            </div>
            <Show when={!running()}>
              <div class="absolute inset-0 flex items-center justify-center text-white bg-black bg-opacity-80 text-4xl pt-1">
                PAUSED
              </div>
            </Show>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
